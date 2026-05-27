from rest_framework import serializers
from .models import UserIntegration, IntegrationLog

class UserIntegrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserIntegration
        fields = [
            'id',
            'integration_type',
            'workspace_or_channel',
            'connected_at',
            'is_active',
            'access_token',
            'refresh_token',
        ]
        read_only_fields = [
            'id',
            'connected_at',
        ]
        extra_kwargs = {
            'access_token': {'write_only': True, 'required': True},
            'refresh_token': {'write_only': True, 'required': False},
        }


class IntegrationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = IntegrationLog
        fields = [
            'integration_type',
            'status',
            'ran_at',
        ]
