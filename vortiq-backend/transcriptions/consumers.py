import json
import os
import tempfile
import logging
import asyncio
from datetime import datetime, timezone
from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)

# Whisper model cached at module level
_whisper_model = None

def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        import whisper
        logger.info("Loading Whisper 'small' model for live transcription...")
        # fp16=False: required for CPU inference (avoids half-precision errors)
        _whisper_model = whisper.load_model("small")
    return _whisper_model


class LiveTranscriptionConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # 1. Parse token from the query string
        query_string = self.scope.get("query_string", b"").decode("utf-8")
        query_params = parse_qs(query_string)
        token_list = query_params.get("token", [])
        
        if not token_list:
            logger.warning("WebSocket connect rejected: token is missing.")
            await self.close(code=4001)
            return

        token = token_list[0]

        # 2. Authenticate using JWT AccessToken
        try:
            from rest_framework_simplejwt.tokens import AccessToken
            # Validates signature, expiration, etc.
            access_token = AccessToken(token)
            self.user_id = access_token.get("user_id")
            if not self.user_id:
                raise ValueError("Token is valid but contains no user_id.")
        except Exception as e:
            logger.warning(f"WebSocket connect rejected: invalid or expired token. Error: {e}")
            await self.close(code=4001)
            return

        # 3. Join the channel group
        self.meeting_id = self.scope["url_route"]["kwargs"]["meeting_id"]
        self.room_group_name = f"transcription_{self.meeting_id}"

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()
        logger.info(f"WebSocket connected and authenticated for user {self.user_id}, meeting {self.meeting_id}")

    async def disconnect(self, close_code):
        # Leave room group
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
            logger.info(f"WebSocket disconnected cleanly for meeting {self.meeting_id}")

    async def receive(self, text_data=None, bytes_data=None):
        if bytes_data:
            # Save the chunk temporarily
            temp_file_path = None
            try:
                # Use delete=False so we can close the file and pass the path to Whisper,
                # then delete it manually afterwards.
                with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_file:
                    temp_file.write(bytes_data)
                    temp_file_path = temp_file.name

                # Run Whisper on it using asyncio.to_thread so it doesn't block Django Channels async loop
                transcript = await asyncio.to_thread(self.run_whisper, temp_file_path)

                # Clean up the file
                if temp_file_path and os.path.exists(temp_file_path):
                    os.remove(temp_file_path)
                    temp_file_path = None

                # Broadcast resulting transcript text back to the channel group
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "transcript.chunk",
                        "text": transcript,
                    }
                )
            except Exception as e:
                logger.exception(f"Error processing audio chunk: {e}")
                if temp_file_path and os.path.exists(temp_file_path):
                    try:
                        os.remove(temp_file_path)
                    except Exception:
                        pass
        else:
            logger.debug(f"Received unexpected text data: {text_data}")

    def run_whisper(self, file_path):
        import subprocess
        model = get_whisper_model()
        logger.info(f"Running Whisper live inference on: {file_path}")

        wav_file_path = None
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_wav:
                wav_file_path = temp_wav.name

            # Convert .webm to .wav via ffmpeg
            cmd = ["ffmpeg", "-y", "-i", file_path, "-ar", "16000", "-ac", "1", "-f", "wav", wav_file_path]
            logger.info(f"Converting webm to wav: {' '.join(cmd)}")
            subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

            result = model.transcribe(
                wav_file_path,
                fp16=False,
                beam_size=5,
                best_of=5,
                temperature=0.0,
                initial_prompt=(
                    "This is a business meeting transcript. "
                    "Participants may use technical terms, acronyms, and proper nouns."
                ),
            )
            return result.get("text", "").strip()
        finally:
            # Delete both temp files
            for path in (file_path, wav_file_path):
                if path and os.path.exists(path):
                    try:
                        os.remove(path)
                        logger.info(f"Successfully deleted temp file: {path}")
                    except Exception as e:
                        logger.warning(f"Failed to delete temp file {path}: {e}")

    # Receive message from room group (event type "transcript.chunk")
    async def transcript_chunk(self, event):
        text = event["text"]
        timestamp = datetime.now(timezone.utc).isoformat()

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            "type": "transcript_chunk",
            "text": text,
            "timestamp": timestamp,
            "meeting_id": str(self.meeting_id),
        }))


@database_sync_to_async
def update_notes_and_log(user_id, meeting_id, field, value):
    from django.contrib.auth import get_user_model
    from meetings.models import Meeting
    from transcriptions.models import StructuredNotes, NoteEdit
    from django.utils import timezone
    import json

    User = get_user_model()
    try:
        user = User.objects.get(id=user_id)
        meeting = Meeting.objects.get(id=meeting_id)
    except (User.DoesNotExist, Meeting.DoesNotExist):
        return None, "Meeting or User does not exist."

    # Validate the user owns the meeting
    if meeting.user_id != user.id:
        return None, "Permission denied."

    # Fetch or create the StructuredNotes record
    notes, created = StructuredNotes.objects.get_or_create(meeting=meeting)

    if not hasattr(notes, field):
        return None, f"Invalid field: {field}"

    previous_value = getattr(notes, field)

    # Convert list/dict value types to JSON strings for text auditing
    if isinstance(previous_value, (list, dict)):
        prev_str = json.dumps(previous_value)
    else:
        prev_str = str(previous_value)

    if isinstance(value, (list, dict)):
        new_str = json.dumps(value)
    else:
        new_str = str(value)

    # Save edit
    setattr(notes, field, value)
    notes.last_edited_by = user
    notes.last_edited_at = timezone.now()
    notes.save()

    # Log to audit history
    NoteEdit.objects.create(
        meeting=meeting,
        user=user,
        field_edited=field,
        previous_value=prev_str,
        new_value=new_str,
    )

    return {
        "user_full_name": user.full_name,
        "edited_at": notes.last_edited_at.isoformat(),
    }, None


class CollaborativeNotesConsumer(AsyncWebsocketConsumer):
    # Class-level dictionary keyed by meeting_id (string) storing a set of connected user names
    active_users = {}

    async def connect(self):
        # 1. Parse token from the query string
        query_string = self.scope.get("query_string", b"").decode("utf-8")
        query_params = parse_qs(query_string)
        token_list = query_params.get("token", [])

        if not token_list:
            logger.warning("WebSocket notes connect rejected: token is missing.")
            await self.close(code=4001)
            return

        token = token_list[0]

        # 2. Authenticate using JWT AccessToken
        try:
            from rest_framework_simplejwt.tokens import AccessToken
            access_token = AccessToken(token)
            self.user_id = access_token.get("user_id")
            if not self.user_id:
                raise ValueError("Token contains no user_id.")
            
            # Fetch user full_name from database
            from django.contrib.auth import get_user_model
            User = get_user_model()
            user = await database_sync_to_async(User.objects.get)(id=self.user_id)
            self.full_name = user.full_name
        except Exception as e:
            logger.warning(f"WebSocket notes connect rejected: invalid/expired token. Error: {e}")
            await self.close(code=4001)
            return

        # 3. Join the channel group
        self.meeting_id = self.scope["url_route"]["kwargs"]["meeting_id"]
        self.room_group_name = f"notes_{self.meeting_id}"

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        # 4. Add to active_users class registry
        meeting_id_str = str(self.meeting_id)
        if meeting_id_str not in self.active_users:
            self.active_users[meeting_id_str] = set()
        self.active_users[meeting_id_str].add(self.full_name)

        # 5. Pick from fixed list of 8 colors based on user_id mod 8
        colors = [
            "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
            "#8B5CF6", "#EC4899", "#06B6D4", "#14B8A6"
        ]
        import uuid
        try:
            user_uuid = self.user_id if isinstance(self.user_id, uuid.UUID) else uuid.UUID(str(self.user_id))
            color_idx = int(user_uuid.hex, 16) % 8
        except Exception:
            color_idx = hash(str(self.user_id)) % 8
        color = colors[color_idx]

        # 6. Broadcast user_joined to notes group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "user.joined",
                "full_name": self.full_name,
                "color": color
            }
        )

        logger.info(f"WebSocket notes connected for user {self.user_id} ({self.full_name}), meeting {self.meeting_id}")

    async def disconnect(self, close_code):
        # 1. Remove from active_users class registry
        if hasattr(self, "meeting_id") and hasattr(self, "full_name"):
            meeting_id_str = str(self.meeting_id)
            if meeting_id_str in self.active_users:
                self.active_users[meeting_id_str].discard(self.full_name)
                if not self.active_users[meeting_id_str]:
                    self.active_users.pop(meeting_id_str, None)

            # 2. Broadcast user_left to group
            if hasattr(self, "room_group_name"):
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "user.left",
                        "full_name": self.full_name
                    }
                )

        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
            logger.info(f"WebSocket notes disconnected cleanly for meeting {self.meeting_id}")

    async def receive(self, text_data=None, bytes_data=None):
        if text_data:
            try:
                data = json.loads(text_data)
                msg_type = data.get("type")

                # Handle get_presence request by returning current active_users set
                if msg_type == "get_presence":
                    active_list = list(self.active_users.get(str(self.meeting_id), set()))
                    await self.send(text_data=json.dumps({
                        "type": "presence_list",
                        "users": active_list
                    }))
                    return

                field = data.get("field")
                value = data.get("value")

                if not field:
                    await self.send(text_data=json.dumps({
                        "type": "error",
                        "message": "Field name is required."
                    }))
                    return

                # Validate, log and update inside database transaction block
                result, error_msg = await update_notes_and_log(
                    user_id=self.user_id,
                    meeting_id=self.meeting_id,
                    field=field,
                    value=value,
                )

                if error_msg:
                    await self.send(text_data=json.dumps({
                        "type": "error",
                        "message": error_msg
                    }))
                    return

                # Broadcast note_update event to the notes_{meeting_id} channel group
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "note.update",
                        "field": field,
                        "value": value,
                        "edited_by": result["user_full_name"],
                        "edited_at": result["edited_at"],
                    }
                )
            except Exception as e:
                logger.exception(f"Error processing websocket notes update: {e}")
                await self.send(text_data=json.dumps({
                    "type": "error",
                    "message": "Internal server error occurred."
                }))

    # Handle group message (type "note.update")
    async def note_update(self, event):
        await self.send(text_data=json.dumps({
            "type": "note_update",
            "field": event["field"],
            "value": event["value"],
            "edited_by": event["edited_by"],
            "edited_at": event["edited_at"],
        }))

    # Handle group message (type "user.joined")
    async def user_joined(self, event):
        await self.send(text_data=json.dumps({
            "type": "user_joined",
            "full_name": event["full_name"],
            "color": event["color"]
        }))

    # Handle group message (type "user.left")
    async def user_left(self, event):
        await self.send(text_data=json.dumps({
            "type": "user_left",
            "full_name": event["full_name"]
        }))
