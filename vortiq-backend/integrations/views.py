import urllib.parse
import requests
import base64
import secrets
import logging
import os
os.environ['OAUTHLIB_RELAX_TOKEN_SCOPE'] = '1'
from django.shortcuts import redirect
from django.conf import settings
from django.core import signing
from google_auth_oauthlib.flow import Flow
from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model
from .models import UserIntegration
from .serializers import UserIntegrationSerializer
User = get_user_model()
logger = logging.getLogger(__name__)


class UserIntegrationListView(generics.ListAPIView):
    """
    List view to fetch all integrations connected by the authenticated user.
    """
    serializer_class = UserIntegrationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserIntegration.objects.filter(user=self.request.user)


class SlackConnectView(APIView):
    """
    Redirects the user to Slack's OAuth authorization URL.
    Uses the token query parameter for authentication.
    """
    permission_classes = []  # Allowed unauthenticated because token is passed in query params

    def get(self, request):
        token_str = request.GET.get('token')
        if not token_str:
            return Response({"error": "Authentication token is required"}, status=400)

        try:
            # Decode simplejwt access token to get user ID
            access_token = AccessToken(token_str)
            user_id = access_token['user_id']
            user = User.objects.get(id=user_id)
        except Exception as e:
            return Response({"error": f"Invalid or expired token: {str(e)}"}, status=401)

        # Securely sign the user ID into the state parameter
        state = signing.dumps({"user_id": str(user.id)})

        # Prepare Slack OAuth authorization params
        params = {
            "client_id": settings.SLACK_CLIENT_ID,
            "scope": "chat:write,channels:read",
            "redirect_uri": settings.SLACK_REDIRECT_URI,
            "state": state
        }
        authorize_url = "https://slack.com/oauth/v2/authorize?" + urllib.parse.urlencode(params)
        return redirect(authorize_url)


class SlackCallbackView(APIView):
    """
    OAuth callback endpoint for Slack.
    Exchanges the authorization code for an access token.
    """
    permission_classes = []

    def get(self, request):
        code = request.GET.get('code')
        state = request.GET.get('state')
        error = request.GET.get('error')

        if error or not code or not state:
            return redirect(f"{settings.FRONTEND_URL}/integrations?error=oauth_failed")

        # Verify state to obtain user_id
        try:
            state_data = signing.loads(state, max_age=3600)  # Expiry: 1 hour
            user_id = state_data.get('user_id')
            user = User.objects.get(id=user_id)
        except Exception as e:
            return redirect(f"{settings.FRONTEND_URL}/integrations?error=invalid_state")

        # Exchange code for access token
        token_url = "https://slack.com/api/oauth.v2.access"
        payload = {
            "client_id": settings.SLACK_CLIENT_ID,
            "client_secret": settings.SLACK_CLIENT_SECRET,
            "code": code,
            "redirect_uri": settings.SLACK_REDIRECT_URI,
        }

        try:
            response = requests.post(token_url, data=payload)
            resp_data = response.json()
        except Exception as e:
            return redirect(f"{settings.FRONTEND_URL}/integrations?error=token_exchange_failed")

        if not resp_data.get('ok'):
            error_msg = resp_data.get('error', 'unknown_error')
            return redirect(f"{settings.FRONTEND_URL}/integrations?error={error_msg}")

        # Extract access token and team name
        access_token = resp_data.get('access_token')
        team = resp_data.get('team', {})
        team_name = team.get('name', 'Slack Workspace')

        extra_data = {
            "team_id": team.get('id'),
            "bot_user_id": resp_data.get('bot_user_id'),
            "app_id": resp_data.get('app_id'),
            "scope": resp_data.get('scope'),
        }

        incoming_webhook = resp_data.get('incoming_webhook', {})
        channel_id = incoming_webhook.get('channel_id')
        if channel_id:
            extra_data["channel_id"] = channel_id

        # Update or create the UserIntegration
        UserIntegration.objects.update_or_create(
            user=user,
            integration_type='slack',
            defaults={
                "access_token": access_token,
                "workspace_or_channel": team_name,  # Saves the team name
                "extra_data": extra_data,
                "is_active": True,
            }
        )

        return redirect(f"{settings.FRONTEND_URL}/integrations?connected=slack")


class NotionConnectView(APIView):
    """
    Redirects the user to Notion's OAuth authorization URL.
    Uses the token query parameter for authentication.
    """
    permission_classes = []

    def get(self, request):
        token_str = request.GET.get('token')
        if not token_str:
            return Response({"error": "Authentication token is required"}, status=400)

        try:
            access_token = AccessToken(token_str)
            user_id = access_token['user_id']
            user = User.objects.get(id=user_id)
        except Exception as e:
            return Response({"error": f"Invalid or expired token: {str(e)}"}, status=401)

        # Securely sign the user ID into the state parameter
        state = signing.dumps({"user_id": str(user.id)})

        params = {
            "client_id": settings.NOTION_CLIENT_ID,
            "redirect_uri": settings.NOTION_REDIRECT_URI,
            "response_type": "code",
            "state": state
        }
        authorize_url = "https://api.notion.com/v1/oauth/authorize?" + urllib.parse.urlencode(params)
        return redirect(authorize_url)


class NotionCallbackView(APIView):
    """
    OAuth callback endpoint for Notion.
    Exchanges the authorization code for an access token.
    """
    permission_classes = []

    def get(self, request):
        code = request.GET.get('code')
        state = request.GET.get('state')
        error = request.GET.get('error')

        if error or not code or not state:
            return redirect(f"{settings.FRONTEND_URL}/integrations?error=oauth_failed")

        try:
            state_data = signing.loads(state, max_age=3600)
            user_id = state_data.get('user_id')
            user = User.objects.get(id=user_id)
        except Exception as e:
            return redirect(f"{settings.FRONTEND_URL}/integrations?error=invalid_state")

        # Exchange code for Notion access token
        token_url = "https://api.notion.com/v1/oauth/token"
        auth_str = f"{settings.NOTION_CLIENT_ID}:{settings.NOTION_CLIENT_SECRET}"
        auth_b64 = base64.b64encode(auth_str.encode()).decode()

        headers = {
            "Authorization": f"Basic {auth_b64}",
            "Content-Type": "application/json"
        }
        payload = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": settings.NOTION_REDIRECT_URI
        }

        try:
            response = requests.post(token_url, json=payload, headers=headers)
            resp_data = response.json()
        except Exception as e:
            return redirect(f"{settings.FRONTEND_URL}/integrations?error=token_exchange_failed")

        if "error" in resp_data:
            error_msg = resp_data.get('error')
            return redirect(f"{settings.FRONTEND_URL}/integrations?error={error_msg}")

        access_token = resp_data.get('access_token')
        workspace_id = resp_data.get('workspace_id')

        # Update or create the UserIntegration
        UserIntegration.objects.update_or_create(
            user=user,
            integration_type='notion',
            defaults={
                "access_token": access_token,
                "workspace_or_channel": workspace_id,  # Saves the workspace_id
                "extra_data": resp_data,
                "is_active": True,
            }
        )

        return redirect(f"{settings.FRONTEND_URL}/integrations?connected=notion")


class GoogleConnectView(APIView):
    """
    Redirects the user to Google's OAuth authorization URL.
    Uses the token query parameter for authentication.

    NOTE ON PKCE: google-auth-oauthlib's Flow object generates a PKCE
    code_verifier internally, but that Flow instance only lives for the
    duration of this single request. Since GoogleCallbackView is a
    completely separate request, it can't see that verifier unless we
    carry it across ourselves. We generate our own verifier here, assign
    it to the flow, and smuggle it through the signed `state` parameter
    so GoogleCallbackView can reconstruct the exact same flow later.
    """
    permission_classes = []

    def get(self, request):
        token_str = request.GET.get('token')
        if not token_str:
            return Response({"error": "Authentication token is required"}, status=400)

        try:
            access_token = AccessToken(token_str)
            user_id = access_token['user_id']
            user = User.objects.get(id=user_id)
        except Exception as e:
            return Response({"error": f"Invalid or expired token: {str(e)}"}, status=401)

        client_config = {
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "project_id": "vortiq",
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uris": [settings.GOOGLE_REDIRECT_URI]
            }
        }

        flow = Flow.from_client_config(
            client_config,
            scopes=[
                'https://www.googleapis.com/auth/calendar.events',
                'https://www.googleapis.com/auth/gmail.compose',
                'https://www.googleapis.com/auth/drive.file',
            ]
        )
        flow.redirect_uri = settings.GOOGLE_REDIRECT_URI

        # Generate our own PKCE verifier and carry it through `state`,
        # since the Flow object itself doesn't persist across the
        # separate connect/callback requests.
        code_verifier = secrets.token_urlsafe(64)
        flow.code_verifier = code_verifier

        # Securely sign the user ID AND the code_verifier into state
        state = signing.dumps({
            "user_id": str(user.id),
            "code_verifier": code_verifier,
        })

        # Force consent screen to guarantee refresh token is returned on every login
        authorization_url, _ = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent',
            state=state
        )
        return redirect(authorization_url)


class GoogleCallbackView(APIView):
    """
    OAuth callback endpoint for Google.
    Exchanges the authorization code for access and refresh tokens.
    """
    permission_classes = []

    def get(self, request):
        code = request.GET.get('code')
        state = request.GET.get('state')
        error = request.GET.get('error')

        if error or not code or not state:
            return redirect(f"{settings.FRONTEND_URL}/integrations?error=oauth_failed")

        try:
            state_data = signing.loads(state, max_age=3600)
            user_id = state_data.get('user_id')
            code_verifier = state_data.get('code_verifier')
            user = User.objects.get(id=user_id)
        except Exception as e:
            logger.error(f"Invalid state in Google callback: {e}", exc_info=True)
            return redirect(f"{settings.FRONTEND_URL}/integrations?error=invalid_state")

        client_config = {
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "project_id": "vortiq",
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uris": [settings.GOOGLE_REDIRECT_URI]
            }
        }

        flow = Flow.from_client_config(
            client_config,
            scopes=[
                'https://www.googleapis.com/auth/calendar.events',
                'https://www.googleapis.com/auth/gmail.compose',
                'https://www.googleapis.com/auth/drive.file',
            ],
            state=state
        )
        flow.redirect_uri = settings.GOOGLE_REDIRECT_URI
        flow.code_verifier = code_verifier  # Restore the same verifier used at /connect/

        try:
            flow.fetch_token(code=code)
            credentials = flow.credentials
        except Exception as e:
            logger.error(f"Google token exchange failed: {e}", exc_info=True)
            return redirect(f"{settings.FRONTEND_URL}/integrations?error=token_exchange_failed")

        access_token = credentials.token
        refresh_token = credentials.refresh_token
        expiry = credentials.expiry.isoformat() if credentials.expiry else None

        extra_data = {
            "token_uri": credentials.token_uri,
            "client_id": credentials.client_id,
            "scopes": credentials.scopes,
            "expiry": expiry,
        }

        # Update or create the UserIntegration
        UserIntegration.objects.update_or_create(
            user=user,
            integration_type='google_calendar',
            defaults={
                "access_token": access_token,
                "refresh_token": refresh_token,
                "workspace_or_channel": user.email,  # Primary calendar identifier is usually user's email
                "extra_data": extra_data,
                "is_active": True,
            }
        )

        logger.info(f"Google integration saved successfully for user {user.email}")

        return redirect(f"{settings.FRONTEND_URL}/integrations?connected=google")


class IntegrationDisconnectView(APIView):
    """
    Disconnect endpoint. Sets is_active=False for the given integration_type.
    """
    permission_class = [IsAuthenticated]

    def delete(self, request, integration_type):
        integration = UserIntegration.objects.filter(
            user=request.user,
            integration_type=integration_type
        ).first()

        if not integration:
            return Response({"error": f"Integration '{integration_type}' not found"}, status=404)

        integration.is_active = False
        integration.save()
        return Response({"success": f"{integration_type.capitalize()} integration disconnected successfully"})