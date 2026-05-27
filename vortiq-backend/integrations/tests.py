from django.test import TestCase
from django.contrib.auth import get_user_model
from django.db import transaction
from unittest.mock import patch, MagicMock
import logging

from meetings.models import Meeting
from transcriptions.models import Transcription, StructuredNotes
from transcriptions.tasks import generate_structured_notes
from integrations.models import UserIntegration
from integrations.integration_runner import trigger_integrations

User = get_user_model()

class IntegrationRunnerTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="testintegrationuser@example.com",
            password="testpassword123",
            full_name="Integration Test User"
        )
        self.meeting = Meeting.objects.create(
            user=self.user,
            title="Project Alignment Meeting",
            audio_file="test_meeting.mp3",
            status=Meeting.Status.PROCESSING
        )
        self.transcription = Transcription.objects.create(
            meeting=self.meeting,
            raw_text="Let's build a new integrations runner module. Slack, Notion, and Google Calendar should all be supported.",
            language="en"
        )
        self.structured_notes = StructuredNotes.objects.create(
            meeting=self.meeting,
            summary="A short summary of integrations project.",
            action_items=[{"assignee": "User", "task": "Write test suite", "deadline": None}],
            speaker_segments=[],
            decisions=[],
            open_questions=[]
        )

    @patch("integrations.integration_runner.post_to_slack")
    @patch("integrations.integration_runner.create_notion_page")
    @patch("integrations.integration_runner.update_calendar_event")
    def test_trigger_integrations_no_active_connections(self, mock_google, mock_notion, mock_slack):
        # When user has no user integrations, nothing should be triggered
        trigger_integrations(str(self.meeting.id))
        
        mock_slack.assert_not_called()
        mock_notion.assert_not_called()
        mock_google.assert_not_called()

    @patch("integrations.integration_runner.post_to_slack")
    @patch("integrations.integration_runner.create_notion_page")
    @patch("integrations.integration_runner.update_calendar_event")
    def test_trigger_integrations_inactive_connections_skipped(self, mock_google, mock_notion, mock_slack):
        # Create inactive user integrations
        UserIntegration.objects.create(
            user=self.user,
            integration_type="slack",
            access_token="fake_slack_token",
            is_active=False
        )
        UserIntegration.objects.create(
            user=self.user,
            integration_type="notion",
            access_token="fake_notion_token",
            is_active=False
        )
        
        trigger_integrations(str(self.meeting.id))
        
        mock_slack.assert_not_called()
        mock_notion.assert_not_called()
        mock_google.assert_not_called()

    @patch("integrations.integration_runner.post_to_slack")
    @patch("integrations.integration_runner.create_notion_page")
    @patch("integrations.integration_runner.update_calendar_event")
    def test_trigger_integrations_all_active_success(self, mock_google, mock_notion, mock_slack):
        # Setup mocks to return True
        mock_slack.return_value = True
        mock_notion.return_value = True
        mock_google.return_value = True

        # Create active user integrations
        UserIntegration.objects.create(
            user=self.user,
            integration_type="slack",
            access_token="fake_slack_token",
            is_active=True
        )
        UserIntegration.objects.create(
            user=self.user,
            integration_type="notion",
            access_token="fake_notion_token",
            is_active=True
        )
        UserIntegration.objects.create(
            user=self.user,
            integration_type="google_calendar",
            access_token="fake_google_token",
            is_active=True
        )

        with self.assertLogs("integrations.integration_runner", level="INFO") as log_capture:
            trigger_integrations(str(self.meeting.id))

        mock_slack.assert_called_once_with(self.user, self.meeting, self.structured_notes)
        mock_notion.assert_called_once_with(self.user, self.meeting, self.structured_notes)
        mock_google.assert_called_once_with(self.user, self.meeting, self.structured_notes)

        # Check logs for execution summary
        summary_log = [log for log in log_capture.output if "Execution summary" in log]
        self.assertEqual(len(summary_log), 1)
        self.assertIn("slack: SUCCESS", summary_log[0])
        self.assertIn("notion: SUCCESS", summary_log[0])
        self.assertIn("google_calendar: SUCCESS", summary_log[0])

    @patch("integrations.integration_runner.post_to_slack")
    @patch("integrations.integration_runner.create_notion_page")
    @patch("integrations.integration_runner.update_calendar_event")
    def test_trigger_integrations_isolated_failures(self, mock_google, mock_notion, mock_slack):
        # Slack succeeds, Notion raises Exception, Google returns False (failed)
        mock_slack.return_value = True
        mock_notion.side_effect = Exception("Notion API is down!")
        mock_google.return_value = False

        # Create active user integrations
        UserIntegration.objects.create(
            user=self.user,
            integration_type="slack",
            access_token="fake_slack_token",
            is_active=True
        )
        UserIntegration.objects.create(
            user=self.user,
            integration_type="notion",
            access_token="fake_notion_token",
            is_active=True
        )
        UserIntegration.objects.create(
            user=self.user,
            integration_type="google_calendar",
            access_token="fake_google_token",
            is_active=True
        )

        with self.assertLogs("integrations.integration_runner", level="INFO") as log_capture:
            trigger_integrations(str(self.meeting.id))

        # Assert all three were called despite failures
        mock_slack.assert_called_once()
        mock_notion.assert_called_once()
        mock_google.assert_called_once()

        # Check summary logs showing Slack = SUCCESS, Notion = FAILED (Exception), Google = FAILED
        summary_log = [log for log in log_capture.output if "Execution summary" in log]
        self.assertEqual(len(summary_log), 1)
        self.assertIn("slack: SUCCESS", summary_log[0])
        self.assertIn("notion: FAILED (Notion API is down!)", summary_log[0])
        self.assertIn("google_calendar: FAILED (Returned False)", summary_log[0])

    @patch("integrations.integration_runner.trigger_integrations")
    @patch("transcriptions.ai_tasks.identify_speakers")
    @patch("transcriptions.ai_tasks.extract_decisions_and_questions")
    @patch("transcriptions.ai_tasks.extract_action_items")
    @patch("transcriptions.ai_tasks.generate_summary")
    def test_celery_task_triggers_integrations_automatically(
        self,
        mock_summary,
        mock_action_items,
        mock_decisions_questions,
        mock_speakers,
        mock_trigger_integrations
    ):
        mock_summary.return_value = "AI Mock Summary"
        mock_action_items.return_value = []
        mock_decisions_questions.return_value = {"decisions": [], "open_questions": []}
        mock_speakers.return_value = []

        # Run task
        generate_structured_notes(str(self.meeting.id))

        # Check trigger_integrations was called at the end
        mock_trigger_integrations.assert_called_once_with(str(self.meeting.id))

    @patch("integrations.integration_runner.trigger_integrations")
    def test_celery_task_short_audio_fallback_triggers_integrations(self, mock_trigger_integrations):
        # Update raw text to be very short to trigger short transcription fallback path
        self.transcription.raw_text = "short text"
        self.transcription.save()

        # Run task
        generate_structured_notes(str(self.meeting.id))

        # Verify fallback path created notes and triggered integrations
        notes = StructuredNotes.objects.get(meeting=self.meeting)
        self.assertEqual(notes.summary, "Recording was too short or contained no speech to analyze.")
        mock_trigger_integrations.assert_called_once_with(str(self.meeting.id))

    @patch("integrations.integration_runner.post_to_slack")
    @patch("integrations.integration_runner.create_notion_page")
    @patch("integrations.integration_runner.update_calendar_event")
    def test_integration_logs_saved_and_serialized(self, mock_google, mock_notion, mock_slack):
        from integrations.models import IntegrationLog
        from meetings.serializers import MeetingDetailSerializer

        # Slack succeeds, Notion returns False (failed), Google raises exception (failed)
        mock_slack.return_value = True
        mock_notion.return_value = False
        mock_google.side_effect = Exception("Google Calendar server error")

        # Create active user integrations
        UserIntegration.objects.create(
            user=self.user,
            integration_type="slack",
            access_token="fake_slack_token",
            is_active=True
        )
        UserIntegration.objects.create(
            user=self.user,
            integration_type="notion",
            access_token="fake_notion_token",
            is_active=True
        )
        UserIntegration.objects.create(
            user=self.user,
            integration_type="google_calendar",
            access_token="fake_google_token",
            is_active=True
        )

        trigger_integrations(str(self.meeting.id))

        # Check logs are created in DB
        logs = IntegrationLog.objects.filter(meeting=self.meeting)
        self.assertEqual(logs.count(), 3)
        
        slack_log = logs.get(integration_type="slack")
        self.assertEqual(slack_log.status, "success")
        self.assertIsNone(slack_log.error_message)

        notion_log = logs.get(integration_type="notion")
        self.assertEqual(notion_log.status, "failed")
        self.assertEqual(notion_log.error_message, "Returned False")

        google_log = logs.get(integration_type="google_calendar")
        self.assertEqual(google_log.status, "failed")
        self.assertEqual(google_log.error_message, "Google Calendar server error")

        # Verify serializer output
        self.meeting.status = Meeting.Status.COMPLETED
        self.meeting.save()
        
        serializer = MeetingDetailSerializer(self.meeting)
        data = serializer.data
        self.assertIn("integration_logs", data)
        self.assertEqual(len(data["integration_logs"]), 3)
        
        # Verify fields in first log
        first_log = data["integration_logs"][0]
        self.assertIn("integration_type", first_log)
        self.assertIn("status", first_log)
        self.assertIn("ran_at", first_log)
