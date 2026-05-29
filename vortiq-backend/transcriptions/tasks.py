"""
Celery tasks for the transcriptions app.

transcribe_meeting is triggered by the meetings upload endpoint.
It runs OpenAI Whisper on the uploaded audio and saves the result.
"""

import logging
import os
import tempfile
import groq
from pydub import AudioSegment

from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)


@shared_task(bind=True, name="transcriptions.transcribe_meeting")
def transcribe_meeting(self, meeting_id):
    """
    Transcribe the audio file for a given meeting using OpenAI Whisper.

    Pipeline:
      1. Fetch Meeting record
      2. Set status → processing
      3. Load audio file path
      4. Run Whisper (base model)
      5. Save Transcription record (raw_text + language)
      6. Set Meeting status → completed

    On failure: set Meeting status → failed and log the error.

    Args:
        meeting_id: UUID string of the Meeting record.
    """
    from meetings.models import Meeting
    from transcriptions.models import Transcription, StructuredNotes
    from transcriptions.ai_tasks import clean_transcript

    meeting = None

    try:
        # ── 1. Fetch the Meeting ──
        try:
            meeting = Meeting.objects.get(id=meeting_id)
        except Meeting.DoesNotExist:
            logger.error(f"Meeting {meeting_id} not found. Aborting task.")
            return

        # ── 2. Set status to processing ──
        meeting.status = Meeting.Status.PROCESSING
        meeting.save(update_fields=["status", "updated_at"])
        logger.info(f"Meeting '{meeting.title}' ({meeting_id}) → processing")

        # ── 3. Get the audio file path ──
        audio_path = meeting.audio_file.path
        logger.info(f"Audio file path: {audio_path}")

        # ── 4. Run Groq Whisper API transcription ──
        logger.info(f"Transcribing via Groq: {audio_path}")
        
        # Initialize Groq client
        client = groq.Groq(api_key=settings.GROQ_API_KEY)
        
        file_size = os.path.getsize(audio_path)
        limit_25mb = 25 * 1024 * 1024
        
        if file_size > limit_25mb:
            logger.info(f"File size ({file_size} bytes) exceeds 25MB. Splitting into 10-minute chunks using pydub...")
            audio = AudioSegment.from_file(audio_path)
            ten_minutes = 10 * 60 * 1000  # 10 minutes in milliseconds
            chunks = [audio[i:i + ten_minutes] for i in range(0, len(audio), ten_minutes)]
            logger.info(f"Split audio into {len(chunks)} chunks.")
            
            transcripts = []
            for idx, chunk in enumerate(chunks):
                logger.info(f"Processing chunk {idx + 1}/{len(chunks)}")
                with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_chunk_file:
                    tmp_chunk_path = tmp_chunk_file.name
                
                try:
                    chunk.export(tmp_chunk_path, format="wav")
                    with open(tmp_chunk_path, "rb") as f:
                        file_bytes = f.read()
                    
                    chunk_filename = f"chunk_{idx}.wav"
                    chunk_text = client.audio.transcriptions.create(
                        model="whisper-large-v3",
                        file=(chunk_filename, file_bytes, "audio/wav"),
                        response_format="text"
                    )
                    transcripts.append(chunk_text.strip())
                finally:
                    if os.path.exists(tmp_chunk_path):
                        os.remove(tmp_chunk_path)
            
            raw_text = " ".join(transcripts).strip()
            language = "en"
        else:
            logger.info("Transcribing file directly...")
            filename = os.path.basename(audio_path)
            with open(audio_path, "rb") as f:
                file_bytes = f.read()
            
            raw_text = client.audio.transcriptions.create(
                model="whisper-large-v3",
                file=(filename, file_bytes, "audio/wav"),
                response_format="text"
            ).strip()
            language = "en"

        logger.info(
            f"Transcription complete — language={language}, "
            f"length={len(raw_text)} chars"
        )

        # ── 5. Save the Transcription record ──
        Transcription.objects.update_or_create(
            meeting=meeting,
            defaults={
                "raw_text": raw_text,
                "language": language,
            },
        )
        logger.info(f"Transcription saved for meeting {meeting_id}")

        # ── 6. Clean the transcript with AI before further processing ──
        logger.info(f"Cleaning transcript for meeting {meeting_id} via AI...")
        cleaned_text = clean_transcript(raw_text)

        if not cleaned_text:
            # Transcript is meaningless/placeholder — skip AI analysis
            logger.warning(
                f"clean_transcript returned empty for meeting {meeting_id}. "
                "Creating fallback StructuredNotes and marking completed."
            )
            StructuredNotes.objects.update_or_create(
                meeting=meeting,
                defaults={
                    "summary": (
                        "Audio was unclear or too distant to transcribe accurately. "
                        "Please re-record in a quieter environment closer to the microphone."
                    ),
                    "action_items": [],
                    "speaker_segments": [],
                    "decisions": [],
                    "open_questions": [],
                },
            )
            meeting.status = Meeting.Status.COMPLETED
            meeting.save(update_fields=["status", "updated_at"])
            logger.info(f"Meeting {meeting_id} marked completed (audio unclear).")
            return

        # ── 7. Automatically chain and trigger generate_structured_notes ──
        logger.info(f"Chaining generate_structured_notes task for meeting {meeting_id}")
        generate_structured_notes.delay(meeting_id)

    except Exception as exc:
        # ── Failure handler ──
        logger.exception(
            f"Transcription failed for meeting {meeting_id}: {exc}"
        )
        if meeting is not None:
            meeting.status = Meeting.Status.FAILED
            meeting.save(update_fields=["status", "updated_at"])

        # Re-raise so Celery marks the task as FAILURE
        raise


@shared_task(bind=True, name="transcriptions.generate_structured_notes")
def generate_structured_notes(self, meeting_id):
    """
    Generate AI structured notes (summary, action items, speaker turns, decisions)
    for a transcribed meeting using Gemini.

    Pipeline:
      1. Fetch Meeting by ID
      2. Fetch related Transcription and get its raw_text
      3. Call all four AI functions (generate_summary, extract_action_items,
         identify_speakers, extract_decisions_and_questions) passing raw_text
      4. Create or update a StructuredNotes record with all the returned data
      5. Set Meeting status to completed

    On failure:
      - Log the specific error
      - Set Meeting status to failed
      - Do not partially save
    """
    from django.db import transaction
    from meetings.models import Meeting
    from transcriptions.models import Transcription, StructuredNotes
    from transcriptions.ai_tasks import (
        generate_summary,
        extract_action_items,
        identify_speakers,
        extract_decisions_and_questions,
    )

    meeting = None
    try:
        # ── 1. Fetch Meeting by ID ──
        try:
            meeting = Meeting.objects.get(id=meeting_id)
        except Meeting.DoesNotExist:
            logger.error(f"generate_structured_notes: Meeting {meeting_id} not found.")
            return

        # ── 2. Fetch related Transcription ──
        try:
            transcription = Transcription.objects.get(meeting=meeting)
        except Transcription.DoesNotExist as e:
            raise ValueError(f"Transcription not found for meeting {meeting_id}") from e

        raw_text = transcription.raw_text
        if not raw_text or len(raw_text.strip()) < 50:
            logger.info(f"Meeting {meeting_id} transcription too short ({len(raw_text) if raw_text else 0} chars). Skipping AI analysis.")
            with transaction.atomic():
                StructuredNotes.objects.update_or_create(
                    meeting=meeting,
                    defaults={
                        "summary": "Recording was too short or contained no speech to analyze.",
                        "action_items": [],
                        "speaker_segments": [],
                        "decisions": [],
                        "open_questions": [],
                    },
                )
                meeting.status = Meeting.Status.COMPLETED
                meeting.save(update_fields=["status", "updated_at"])

            return

        # ── 3. Call all four functions from ai_tasks.py ──
        logger.info(f"generate_summary for meeting {meeting_id}...")
        summary = generate_summary(raw_text)

        logger.info(f"extract_action_items for meeting {meeting_id}...")
        action_items = extract_action_items(raw_text)

        logger.info(f"identify_speakers for meeting {meeting_id}...")
        speaker_segments = identify_speakers(raw_text)

        logger.info(f"extract_decisions_and_questions for meeting {meeting_id}...")
        dq_result = extract_decisions_and_questions(raw_text)
        decisions = dq_result.get("decisions", [])
        open_questions = dq_result.get("open_questions", [])

        # ── 4 & 5. Atomic database write and complete meeting ──
        with transaction.atomic():
            StructuredNotes.objects.update_or_create(
                meeting=meeting,
                defaults={
                    "summary": summary,
                    "action_items": action_items,
                    "speaker_segments": speaker_segments,
                    "decisions": decisions,
                    "open_questions": open_questions,
                },
            )
            meeting.status = Meeting.Status.COMPLETED
            meeting.save(update_fields=["status", "updated_at"])


        logger.info(f"generate_structured_notes completed successfully for meeting {meeting_id}")

    except Exception as exc:
        logger.error(
            f"Error in generate_structured_notes for meeting {meeting_id}: {exc}",
            exc_info=True,
        )
        if meeting is not None:
            meeting.status = Meeting.Status.FAILED
            meeting.save(update_fields=["status", "updated_at"])
        raise
