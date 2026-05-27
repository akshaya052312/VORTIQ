"""
Transcription serializers — used for nesting inside Meeting detail.
"""

from rest_framework import serializers

from .models import Transcription, StructuredNotes


class TranscriptionSerializer(serializers.ModelSerializer):
    """Read-only serializer for raw Whisper transcription data."""

    class Meta:
        model = Transcription
        fields = ("id", "raw_text", "language", "created_at")
        read_only_fields = fields


class StructuredNotesSerializer(serializers.ModelSerializer):
    last_edited_by_name = serializers.ReadOnlyField(source="last_edited_by.full_name", default=None)

    class Meta:
        model = StructuredNotes
        fields = (
            "id",
            "summary",
            "action_items",
            "speaker_segments",
            "decisions",
            "open_questions",
            "created_at",
            "updated_at",
            "last_edited_by_name",
            "last_edited_at",
        )
        read_only_fields = fields
