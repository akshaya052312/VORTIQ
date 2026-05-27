"""
Celery tasks for the transcriptions app.

transcribe_meeting is triggered by the meetings upload endpoint.
It runs OpenAI Whisper on the uploaded audio and saves the result.
"""

import logging

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

        # ── 4. Run Whisper transcription ──
        import whisper

        # 'small' model: significantly better accuracy than 'base' (~4x lower WER)
        # while remaining practical on CPU-only machines.
        # fp16=False: required for CPU inference (avoids half-precision errors).
        # beam_size=5 + best_of=5: improve accuracy via wider search.
        # initial_prompt: prime the model with meeting-context vocabulary.
        logger.info("Loading Whisper 'small' model...")
        model = whisper.load_model("small")

        logger.info(f"Transcribing: {audio_path}")
        result = model.transcribe(
            audio_path,
            fp16=False,
            language="en",
            condition_on_previous_text=False,
            no_speech_threshold=0.3,
            logprob_threshold=-1.0,
            compression_ratio_threshold=2.4,
            temperature=0.2,
            best_of=5,
            beam_size=5,
            initial_prompt=(
                "This is a business meeting transcript. "
                "Participants may use technical terms, acronyms, and proper nouns."
            ),
        )

        raw_text = result.get("text", "").strip()
        language = result.get("language", "unknown")
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
