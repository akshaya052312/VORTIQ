"""
AI-powered post-processing tasks for Vortiq transcriptions.

Each function in this module takes raw transcript data and returns
AI-generated content by calling ask_gemini() from ai_client.py.
"""

import json
import logging

from .ai_client import ask_ai, ask_gemini

logger = logging.getLogger(__name__)


def generate_summary(transcript_text: str) -> str:
    """
    Generate a concise meeting summary from a raw transcript.

    Calls the Gemini 1.5 Flash model with a professional meeting-assistant
    prompt and returns the response as a plain paragraph string.

    Args:
        transcript_text: The full raw text of the meeting transcript.

    Returns:
        A 3–5 sentence plain-English summary of the meeting — what it was
        about, what was discussed, and what was decided. No bullet points,
        no headers, no markdown.

    Raises:
        GeminiAPIError: Propagated from ask_gemini() if the API call fails.
    """
    prompt = (
        "You are a professional meeting assistant. "
        "Read the following meeting transcript and write a clear summary "
        "in 3 to 5 sentences covering what the meeting was about, "
        "what was discussed, and what was decided. "
        "Write in plain English only — no bullet points, no headers, "
        "no markdown formatting. Output a single clean paragraph.\n\n"
        "Transcript:\n"
        f"{transcript_text}"
    )

    return ask_gemini(prompt)


def extract_action_items(transcript_text: str) -> list:
    """
    Extract action items from a meeting transcript as a structured list.

    Sends the transcript to Gemini with a strict instruction to respond with
    raw JSON only — no explanation, no markdown fences, no extra text.

    Args:
        transcript_text: The full raw text of the meeting transcript.

    Returns:
        A list of dicts, each with the keys:
            - assignee (str): Person responsible, or "Unassigned".
            - task     (str): One-sentence description of what needs doing.
            - deadline (str | None): Deadline if mentioned, otherwise null.
        Returns an empty list if Gemini's response cannot be parsed as JSON.

    Raises:
        GeminiAPIError: Propagated from ask_gemini() if the API call fails.
    """
    prompt = (
        "You are a professional meeting assistant. "
        "Read the following meeting transcript and extract all action items. "
        "Return the result as a JSON array only — no explanation, no markdown "
        "code fences, no extra text before or after. "
        "Each element in the array must be a JSON object with exactly "
        "three fields:\n"
        '  "assignee": the name of the person responsible for the task, '
        'or "Unassigned" if no specific person is mentioned,\n'
        '  "task": a single sentence describing what needs to be done,\n'
        '  "deadline": the deadline as a string if one was mentioned, '
        "or null if no deadline was given.\n"
        "If there are no action items, return an empty JSON array: []\n\n"
        "Transcript:\n"
        f"{transcript_text}"
    )

    raw = ask_gemini(prompt)

    try:
        action_items = json.loads(raw)
        if not isinstance(action_items, list):
            raise ValueError(f"Expected a JSON array, got: {type(action_items)}")
        return action_items
    except (json.JSONDecodeError, ValueError) as exc:
        logger.error(
            "extract_action_items: failed to parse Gemini response as JSON. "
            "Error: %s | Raw response: %.500s",
            exc,
            raw,
        )
        return []


def identify_speakers(transcript_text: str) -> list:
    """
    Diarize a meeting transcript into an ordered list of speaker turns.

    Sends the transcript to Gemini with a strict instruction to respond with
    raw JSON only — no explanation, no markdown fences, no extra text.

    Args:
        transcript_text: The full raw text of the meeting transcript.

    Returns:
        A list of dicts, each with the keys:
            - speaker (str): The speaker's name or a sequential identifier.
            - text    (str): The line or sentence they said.
        Returns an empty list if Gemini's response cannot be parsed as JSON.

    Raises:
        GeminiAPIError: Propagated from ask_gemini() if the API call fails.
    """
    prompt = (
        "You are a professional meeting assistant. "
        "Read the following meeting transcript and identify the speakers "
        "and their spoken lines. Return a JSON array only — no explanation, "
        "no markdown code fences, no extra text. "
        "Each item in the array must be an object with exactly two fields:\n"
        '  "speaker": the name of the speaker if identifiable from the '
        "transcript, otherwise a sequential label like 'Speaker 1', 'Speaker 2', etc.,\n"
        '  "text": the sentence or line they said.\n'
        "Preserve the chronological order of the conversation in the array.\n\n"
        "Transcript:\n"
        f"{transcript_text}"
    )

    raw = ask_gemini(prompt)

    try:
        speaker_segments = json.loads(raw)
        if not isinstance(speaker_segments, list):
            raise ValueError(f"Expected a JSON array, got: {type(speaker_segments)}")
        return speaker_segments
    except (json.JSONDecodeError, ValueError) as exc:
        logger.error(
            "identify_speakers: failed to parse Gemini response as JSON. "
            "Error: %s | Raw response: %.500s",
            exc,
            raw,
        )
        return []


def extract_decisions_and_questions(transcript_text: str) -> dict:
    """
    Extract decisions made and open questions raised in a meeting transcript.

    Sends the transcript to Gemini with a strict instruction to respond with
    a raw JSON object only — no explanation, no markdown fences, no extra text.

    Args:
        transcript_text: The full raw text of the meeting transcript.

    Returns:
        A dict with exactly two keys:
            - decisions       (list[str]): Clear decisions made during the
                                           meeting. Empty list if none.
            - open_questions  (list[str]): Questions that were raised but not
                                           resolved. Empty list if none.
        Returns {"decisions": [], "open_questions": []} if the response
        cannot be parsed as JSON.

    Raises:
        GeminiAPIError: Propagated from ask_gemini() if the API call fails.
    """
    _empty = {"decisions": [], "open_questions": []}

    prompt = (
        "You are a professional meeting assistant. "
        "Read the following meeting transcript carefully. "
        "Return a JSON object only — no explanation, no markdown code fences, "
        "no extra text before or after. "
        "The JSON object must have exactly two keys:\n"
        '  "decisions": a list of strings, where each string is a clear '
        "decision that was made or agreed upon during the meeting. "
        "If no decisions were made, use an empty list.\n"
        '  "open_questions": a list of strings, where each string is a '
        "question that was raised during the meeting but was not resolved "
        "or answered. If there are none, use an empty list.\n\n"
        "Transcript:\n"
        f"{transcript_text}"
    )

    raw = ask_gemini(prompt)

    try:
        result = json.loads(raw)
        if not isinstance(result, dict):
            raise ValueError(f"Expected a JSON object, got: {type(result)}")
        # Ensure both keys are present and are lists
        result.setdefault("decisions", [])
        result.setdefault("open_questions", [])
        return result
    except (json.JSONDecodeError, ValueError) as exc:
        logger.error(
            "extract_decisions_and_questions: failed to parse Gemini response "
            "as JSON. Error: %s | Raw response: %.500s",
            exc,
            raw,
        )
        return _empty


def clean_transcript(raw_text: str) -> str:
    """
    Clean and correct a raw Whisper transcript using Groq AI.

    Fixes transcription errors caused by unclear audio, background noise,
    or distant speakers. Removes filler words, expands clear acronyms,
    and returns only the cleaned text.

    Args:
        raw_text: The raw Whisper transcript string.

    Returns:
        A cleaned plain-text transcript string, or an empty string if the
        transcript appears to be meaningless placeholder text or is too short
        to be a real meeting.

    Raises:
        AIError: Propagated from ask_ai() if the API call fails.
    """
    prompt = (
        "You are a transcript cleanup assistant. "
        "Read the following raw speech transcript which may contain errors "
        "from unclear audio, background noise, or distant speakers. "
        "Fix obvious transcription errors, remove filler words like 'um', 'uh', 'like', "
        "expand likely acronyms if context is clear, and return only the cleaned "
        "transcript text with no explanation or commentary.\n"
        "IMPORTANT: If the transcript appears to be meaningless placeholder text — "
        "for example if it contains phrases like 'technical terms', 'acronyms', "
        "'proper nouns', or 'business meeting' repeated without real content — "
        "or if it is under 20 words, output only the single word: EMPTY\n\n"
        "Raw transcript:\n"
        f"{raw_text}"
    )

    response = ask_ai(prompt).strip()

    if response.upper() == "EMPTY" or not response:
        logger.info("clean_transcript: transcript flagged as empty/placeholder by AI.")
        return ""

    logger.info(
        "clean_transcript: cleaned transcript length %d → %d chars",
        len(raw_text),
        len(response),
    )
    return response
