"""
Transcription model — stores Whisper output linked to a Meeting.
StructuredNotes model — stores Gemini AI analysis of a Meeting transcript.
"""

import uuid

from django.conf import settings
from django.db import models

from meetings.models import Meeting


class Transcription(models.Model):
    """
    Stores the raw transcription text produced by Whisper
    for a single Meeting audio file.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    meeting = models.OneToOneField(
        Meeting,
        on_delete=models.CASCADE,
        related_name="transcription",
    )
    raw_text = models.TextField(blank=True, default="")
    language = models.CharField(max_length=50, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "transcription"
        verbose_name_plural = "transcriptions"

    def __str__(self):
        return f"Transcription for {self.meeting.title}"


class StructuredNotes(models.Model):
    """
    Stores Gemini AI-generated analysis for a single Meeting.

    Fields are intentionally distinct from Transcription (which holds raw
    Whisper output). This model holds structured, post-processed data only.

    JSON field schemas:
        action_items    — list of {assignee: str, task: str, deadline: str|null}
        decisions       — list of str
        open_questions  — list of str
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    meeting = models.OneToOneField(
        Meeting,
        on_delete=models.CASCADE,
        related_name="structured_notes",
    )
    summary = models.TextField(blank=True, default="")
    action_items = models.JSONField(default=list, blank=True)
    speaker_segments = models.JSONField(default=list, blank=True)
    decisions = models.JSONField(default=list, blank=True)
    open_questions = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_edited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="edited_notes",
    )
    last_edited_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "structured notes"
        verbose_name_plural = "structured notes"

    def __str__(self):
        return f"StructuredNotes for {self.meeting.title}"


class NoteEdit(models.Model):
    """
    Audit and history log for structured notes edits.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    meeting = models.ForeignKey(
        Meeting,
        on_delete=models.CASCADE,
        related_name="note_edits",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="note_edits",
    )
    field_edited = models.CharField(max_length=100)
    previous_value = models.TextField(blank=True, default="")
    new_value = models.TextField(blank=True, default="")
    edited_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-edited_at"]
        verbose_name = "note edit"
        verbose_name_plural = "note edits"

    def __str__(self):
        return f"Edit by {self.user} on {self.meeting.title} ({self.field_edited})"
