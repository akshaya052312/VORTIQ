"""
Groq AI client for Vortiq.

Exposes:
    ask_ai(prompt: str) -> str        — primary function used by ai_tasks.py
    ask_gemini                        — alias for ask_ai (backwards-compat import)
    GeminiAPIError                    — alias for AIError  (backwards-compat import)

Nothing else in the codebase needs to change: all existing callers that
import `ask_gemini` or `GeminiAPIError` from this module continue to work.
"""

from groq import Groq
from django.conf import settings


# ── Exceptions ──────────────────────────────────────────────────────────────

class AIError(Exception):
    """Raised when the AI API call fails for any reason."""


# Backwards-compatible alias — callers importing GeminiAPIError still work.
GeminiAPIError = AIError


# ── Core function ────────────────────────────────────────────────────────────

def ask_ai(prompt: str) -> str:
    """
    Send *prompt* to the Groq LLaMA-3 model and return the response text.

    Args:
        prompt: The plain-text prompt to send to the model.

    Returns:
        The model's response as a plain string (whitespace-stripped).

    Raises:
        AIError / GeminiAPIError: If the API key is missing, the request
                                  fails, or the response contains no text.
    """
    api_key = settings.GROQ_API_KEY
    if not api_key:
        raise AIError(
            "GROQ_API_KEY is not set. Add it to your .env file."
        )

    try:
        client = Groq(api_key=api_key)
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "user", "content": prompt},
            ],
        )
        return response.choices[0].message.content.strip()
    except Exception as exc:
        raise AIError(f"Groq API request failed: {exc}") from exc


# Backwards-compatible alias — callers importing ask_gemini still work.
ask_gemini = ask_ai
