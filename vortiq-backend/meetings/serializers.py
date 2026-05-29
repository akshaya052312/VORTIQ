"""
Serializers for the meetings app — upload, list, and detail.
"""

import os

from rest_framework import serializers

from .models import Meeting
from transcriptions.serializers import TranscriptionSerializer, StructuredNotesSerializer

ALLOWED_AUDIO_EXTENSIONS = (".mp3", ".wav", ".m4a")


class MeetingUploadSerializer(serializers.ModelSerializer):
    """
    Handles multipart audio upload.
    Validates file extension and creates the Meeting record.
    """

    audio_file = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = Meeting
        fields = ("title", "audio_file")

    def validate_audio_file(self, value):
        """Only allow .mp3, .wav, and .m4a files."""
        if value is None:
            return value
        ext = os.path.splitext(value.name)[1].lower()
        if ext not in ALLOWED_AUDIO_EXTENSIONS:
            raise serializers.ValidationError(
                f"Unsupported file type '{ext}'. "
                f"Allowed types: {', '.join(ALLOWED_AUDIO_EXTENSIONS)}"
            )
        return value

    def create(self, validated_data):
        audio_file = validated_data.pop("audio_file", None)
        if audio_file:
            import cloudinary.uploader
            upload_result = cloudinary.uploader.upload(
                audio_file,
                resource_type="video"
            )
            validated_data["audio_file"] = upload_result.get("secure_url")

        validated_data["user"] = self.context["request"].user
        validated_data["status"] = Meeting.Status.PENDING
        return super().create(validated_data)


class MeetingResponseSerializer(serializers.ModelSerializer):
    """Read-only serializer for the API response after upload."""

    class Meta:
        model = Meeting
        fields = ("id", "title", "status", "created_at")
        read_only_fields = fields


class MeetingListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for the meetings list endpoint.
    Returns id, title, status, created_at.
    """

    class Meta:
        model = Meeting
        fields = ("id", "title", "status", "created_at")
        read_only_fields = fields


class MeetingDetailSerializer(serializers.ModelSerializer):
    """
    Full detail serializer for a single meeting.
    Includes the nested transcription and structured_notes objects when status is completed.
    """

    transcription = serializers.SerializerMethodField()
    structured_notes = serializers.SerializerMethodField()

    class Meta:
        model = Meeting
        fields = (
            "id",
            "title",
            "status",
            "created_at",
            "updated_at",
            "transcription",
            "structured_notes",
        )
        read_only_fields = fields

    def get_transcription(self, obj):
        """Only include transcription data if the meeting is completed."""
        if obj.status != Meeting.Status.COMPLETED:
            return None

        try:
            return TranscriptionSerializer(obj.transcription).data
        except Meeting.transcription.RelatedObjectDoesNotExist:
            return None

    def get_structured_notes(self, obj):
        """Only include structured notes if the meeting is completed."""
        if obj.status != Meeting.Status.COMPLETED:
            return None

        try:
            return StructuredNotesSerializer(obj.structured_notes).data
        except Meeting.structured_notes.RelatedObjectDoesNotExist:
            return None
