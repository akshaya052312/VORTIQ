"""
Meeting views — JWT-protected upload, list, detail, and delete endpoints.
Users can only access and manage their own meetings.
"""

import logging
import os

from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)

from .models import Meeting
from .serializers import (
    MeetingUploadSerializer,
    MeetingResponseSerializer,
    MeetingListSerializer,
    MeetingDetailSerializer,
)


class MeetingUploadView(APIView):
    """
    POST /api/meetings/upload/

    Accepts a multipart form with:
      - audio_file (required): .mp3, .wav, or .m4a file
      - title (optional): meeting title string

    Creates a Meeting record with status=pending, then triggers
    the transcribe_meeting Celery task asynchronously.
    """

    permission_classes = (IsAuthenticated,)
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        serializer = MeetingUploadSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        meeting = serializer.save()

        # Trigger async transcription via Celery if audio_file is provided
        if meeting.audio_file:
            from transcriptions.tasks import transcribe_meeting
            transcribe_meeting.delay(str(meeting.id))

        response_serializer = MeetingResponseSerializer(meeting)
        return Response(
            {
                "message": "Audio uploaded successfully. Transcription started.",
                "meeting": response_serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


class MeetingListView(APIView):
    """
    GET /api/meetings/

    Returns all meetings belonging to the authenticated user.
    """

    permission_classes = (IsAuthenticated,)

    def get(self, request):
        meetings = Meeting.objects.filter(user=request.user)
        serializer = MeetingListSerializer(meetings, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class MeetingDetailView(APIView):
    """
    GET  /api/meetings/<uuid:meeting_id>/
        Returns full detail for a single meeting, including the
        nested transcription and structured_notes objects if status
        is completed. Only the owner can access their own meeting.

    DELETE /api/meetings/<uuid:meeting_id>/
        Permanently deletes the meeting record and its associated
        audio file from the media folder.
        - 204 No Content on success.
        - 403 Forbidden if the meeting belongs to another user.
        - 404 Not Found if the meeting does not exist at all.
    """

    permission_classes = (IsAuthenticated,)

    def get(self, request, meeting_id):
        try:
            meeting = Meeting.objects.get(id=meeting_id, user=request.user)
        except Meeting.DoesNotExist:
            return Response(
                {"error": "Meeting not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = MeetingDetailSerializer(meeting)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, meeting_id):
        # ── 1. Check the meeting exists at all ──
        try:
            meeting = Meeting.objects.get(id=meeting_id)
        except Meeting.DoesNotExist:
            return Response(
                {"error": "Meeting not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # ── 2. Enforce ownership — 403 if the meeting belongs to someone else ──
        if meeting.user != request.user:
            logger.warning(
                "User %s attempted to delete meeting %s owned by %s.",
                request.user.id,
                meeting_id,
                meeting.user.id,
            )
            return Response(
                {"error": "You do not have permission to delete this meeting."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # ── 3. Remove the audio file from disk if it exists ──
        try:
            audio_path = meeting.audio_file.path
            if os.path.exists(audio_path):
                os.remove(audio_path)
                logger.info("Deleted audio file: %s", audio_path)
            else:
                logger.warning("Audio file not found on disk (already deleted?): %s", audio_path)
        except Exception as exc:
            # Log but do not abort — the DB record should still be removed.
            logger.error("Failed to delete audio file for meeting %s: %s", meeting_id, exc)

        # ── 4. Delete the database record (cascades to Transcription & StructuredNotes) ──
        meeting.delete()
        logger.info("Meeting %s deleted by user %s.", meeting_id, request.user.id)

        return Response(status=status.HTTP_204_NO_CONTENT)
