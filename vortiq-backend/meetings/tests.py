from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from unittest.mock import patch, MagicMock
from django.contrib.auth import get_user_model
from meetings.models import Meeting
from vortiq.cron import keep_alive, cleanup_failed_meetings

User = get_user_model()

class CronTasksTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="testuser@example.com",
            password="testpassword123",
            full_name="Test User"
        )

    @patch("vortiq.cron.requests.get")
    def test_keep_alive_calls_endpoint(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_get.return_value = mock_response

        keep_alive()

        mock_get.assert_called_once_with(
            "http://localhost:8000/api/auth/health/",
            timeout=10
        )

    def test_cleanup_failed_meetings(self):
        # Create a meeting that failed 8 days ago
        failed_old = Meeting.objects.create(
            user=self.user,
            title="Old Failed Meeting",
            status=Meeting.Status.FAILED
        )
        # Update created_at in database directly since auto_now_add is set
        eight_days_ago = timezone.now() - timedelta(days=8)
        Meeting.objects.filter(id=failed_old.id).update(created_at=eight_days_ago)

        # Create a meeting that failed 2 days ago
        failed_new = Meeting.objects.create(
            user=self.user,
            title="New Failed Meeting",
            status=Meeting.Status.FAILED
        )
        two_days_ago = timezone.now() - timedelta(days=2)
        Meeting.objects.filter(id=failed_new.id).update(created_at=two_days_ago)

        # Create a completed meeting from 8 days ago
        completed_old = Meeting.objects.create(
            user=self.user,
            title="Old Completed Meeting",
            status=Meeting.Status.COMPLETED
        )
        Meeting.objects.filter(id=completed_old.id).update(created_at=eight_days_ago)

        # Run cleanup
        cleanup_failed_meetings()

        # Check database states
        self.assertFalse(Meeting.objects.filter(id=failed_old.id).exists())
        self.assertTrue(Meeting.objects.filter(id=failed_new.id).exists())
        self.assertTrue(Meeting.objects.filter(id=completed_old.id).exists())
