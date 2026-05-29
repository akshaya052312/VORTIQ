"""
Meeting model — stores uploaded audio files and tracks transcription status.
"""

import uuid

from django.conf import settings
from django.db import models


class Meeting(models.Model):
    """
    Represents a single audio recording uploaded by a user.
    Tracks status through the transcription pipeline.
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="meetings",
    )
    title = models.CharField(max_length=255, blank=True, default="Untitled Meeting")
    audio_file = models.URLField(max_length=500, null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "meeting"
        verbose_name_plural = "meetings"

    def __str__(self):
        return f"{self.title} ({self.status})"
