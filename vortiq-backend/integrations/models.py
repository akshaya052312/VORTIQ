import uuid
import base64
import hashlib
from django.db import models
from django.conf import settings
from cryptography.fernet import Fernet

class EncryptedTextField(models.TextField):
    """
    A custom field that transparently encrypts text data before storing it 
    in the database and decrypts it when retrieved.
    """
    def _get_fernet(self):
        # Derive a 32-byte key from Django's SECRET_KEY
        key = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
        key_b64 = base64.urlsafe_b64encode(key)
        return Fernet(key_b64)

    def get_prep_value(self, value):
        value = super().get_prep_value(value)
        if value is None:
            return value
        fernet = self._get_fernet()
        return fernet.encrypt(value.encode()).decode()

    def from_db_value(self, value, expression, connection):
        if value is None:
            return value
        fernet = self._get_fernet()
        try:
            return fernet.decrypt(value.encode()).decode()
        except Exception:
            return value

    def to_python(self, value):
        if value is None:
            return value
        return value


class UserIntegration(models.Model):
    INTEGRATION_CHOICES = [
        ('slack', 'Slack'),
        ('notion', 'Notion'),
        ('google_calendar', 'Google Calendar'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='integrations'
    )
    integration_type = models.CharField(
        max_length=50,
        choices=INTEGRATION_CHOICES
    )
    access_token = EncryptedTextField(help_text="Encrypted OAuth access token")
    refresh_token = EncryptedTextField(
        null=True,
        blank=True,
        help_text="Encrypted OAuth refresh token (optional)"
    )
    workspace_or_channel = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="Stores Slack channel ID or Notion workspace ID"
    )
    extra_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Any additional data per integration"
    )
    connected_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('user', 'integration_type')

    def __str__(self):
        return f"{self.user.email} - {self.get_integration_type_display()}"


class IntegrationLog(models.Model):
    STATUS_CHOICES = [
        ('success', 'success'),
        ('failed', 'failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    meeting = models.ForeignKey(
        'meetings.Meeting',
        on_delete=models.CASCADE,
        related_name='integration_logs'
    )
    integration_type = models.CharField(max_length=50)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    error_message = models.TextField(null=True, blank=True)
    ran_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.integration_type} - {self.status} - {self.meeting.id}"
