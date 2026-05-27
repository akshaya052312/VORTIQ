from django.test import TestCase
from django.contrib.auth import get_user_model
from meetings.models import Meeting
from transcriptions.models import Transcription, StructuredNotes
from transcriptions.serializers import StructuredNotesSerializer
from unittest.mock import patch

User = get_user_model()


class StructuredNotesTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="testuser@example.com",
            password="testpassword123",
            full_name="Test User"
        )
        self.meeting = Meeting.objects.create(
            user=self.user,
            title="Design Sync",
            audio_file="test_audio.mp3",
            status=Meeting.Status.COMPLETED
        )
        self.transcription = Transcription.objects.create(
            meeting=self.meeting,
            raw_text="Let's align on Q3 roadmap. Alice will write the spec by Friday. We decided to launch in October. Do we need a new database?",
            language="en"
        )

    def test_structured_notes_creation(self):
        notes = StructuredNotes.objects.create(
            meeting=self.meeting,
            summary="This is a summary.",
            action_items=[{"assignee": "Alice", "task": "Write the spec", "deadline": "Friday"}],
            speaker_segments=[],
            decisions=["Launch in October."],
            open_questions=["Do we need a new database?"]
        )
        self.assertEqual(notes.meeting, self.meeting)
        self.assertEqual(notes.summary, "This is a summary.")
        self.assertEqual(len(notes.action_items), 1)
        self.assertEqual(notes.action_items[0]["assignee"], "Alice")
        self.assertEqual(notes.decisions[0], "Launch in October.")
        self.assertEqual(notes.open_questions[0], "Do we need a new database?")

    def test_structured_notes_serializer(self):
        notes = StructuredNotes.objects.create(
            meeting=self.meeting,
            summary="A short summary.",
            action_items=[{"assignee": "Alice", "task": "Write spec", "deadline": "Friday"}],
            speaker_segments=[],
            decisions=["Launch in October."],
            open_questions=["Do we need a new database?"]
        )
        serializer = StructuredNotesSerializer(notes)
        data = serializer.data
        self.assertEqual(data["summary"], "A short summary.")
        self.assertEqual(data["action_items"], [{"assignee": "Alice", "task": "Write spec", "deadline": "Friday"}])
        self.assertEqual(data["speaker_segments"], [])
        self.assertEqual(data["decisions"], ["Launch in October."])
        self.assertEqual(data["open_questions"], ["Do we need a new database?"])

    @patch("transcriptions.ai_tasks.ask_gemini")
    def test_ai_tasks_extract_action_items(self, mock_ask_gemini):
        from transcriptions.ai_tasks import extract_action_items

        # Test successful JSON parse
        mock_ask_gemini.return_value = '[{"assignee": "Alice", "task": "Write spec", "deadline": "Friday"}]'
        items = extract_action_items("dummy text")
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["assignee"], "Alice")

        # Test failed JSON parse falls back to empty list
        mock_ask_gemini.return_value = 'invalid json response'
        items = extract_action_items("dummy text")
        self.assertEqual(items, [])

    @patch("transcriptions.ai_tasks.ask_gemini")
    def test_ai_tasks_extract_decisions_and_questions(self, mock_ask_gemini):
        from transcriptions.ai_tasks import extract_decisions_and_questions

        # Test successful JSON parse
        mock_ask_gemini.return_value = '{"decisions": ["D1"], "open_questions": ["Q1"]}'
        result = extract_decisions_and_questions("dummy text")
        self.assertEqual(result["decisions"], ["D1"])
        self.assertEqual(result["open_questions"], ["Q1"])

        # Test failed JSON parse falls back to empty lists
        mock_ask_gemini.return_value = 'invalid json'
        result = extract_decisions_and_questions("dummy text")
        self.assertEqual(result["decisions"], [])
        self.assertEqual(result["open_questions"], [])

    @patch("transcriptions.ai_tasks.identify_speakers")
    @patch("transcriptions.ai_tasks.extract_decisions_and_questions")
    @patch("transcriptions.ai_tasks.extract_action_items")
    @patch("transcriptions.ai_tasks.generate_summary")
    def test_generate_structured_notes_task(
        self,
        mock_summary,
        mock_action_items,
        mock_decisions_questions,
        mock_speakers,
    ):
        from transcriptions.tasks import generate_structured_notes

        mock_summary.return_value = "Mocked Summary"
        mock_action_items.return_value = [{"assignee": "Bob", "task": "Do it", "deadline": None}]
        mock_decisions_questions.return_value = {"decisions": ["Dec1"], "open_questions": []}
        mock_speakers.return_value = [{"speaker": "Bob", "text": "Hello"}]

        # Setup meeting as processing
        self.meeting.status = Meeting.Status.PROCESSING
        self.meeting.save()

        # Run task
        generate_structured_notes(str(self.meeting.id))

        # Check model creation
        notes = StructuredNotes.objects.get(meeting=self.meeting)
        self.assertEqual(notes.summary, "Mocked Summary")
        self.assertEqual(notes.action_items[0]["assignee"], "Bob")
        self.assertEqual(notes.speaker_segments[0]["speaker"], "Bob")
        self.assertEqual(notes.decisions[0], "Dec1")

        # Check meeting status updated to completed
        self.meeting.refresh_from_db()
        self.assertEqual(self.meeting.status, Meeting.Status.COMPLETED)

    @patch("transcriptions.ai_tasks.generate_summary")
    def test_generate_structured_notes_failure(self, mock_summary):
        from transcriptions.tasks import generate_structured_notes
        mock_summary.side_effect = Exception("Gemini fails")

        # Setup meeting as processing
        self.meeting.status = Meeting.Status.PROCESSING
        self.meeting.save()

        # Run task and expect exception to raise
        with self.assertRaises(Exception):
            generate_structured_notes(str(self.meeting.id))

        # Check database: no StructuredNotes created
        self.assertFalse(StructuredNotes.objects.filter(meeting=self.meeting).exists())

        # Check meeting status set to failed
        self.meeting.refresh_from_db()
        self.assertEqual(self.meeting.status, Meeting.Status.FAILED)
