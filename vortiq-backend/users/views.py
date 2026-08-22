"""
Auth views — Register, Login, Google OAuth, Health check, and Password Reset.
"""
import os

from django.contrib.auth import get_user_model
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.core.mail import send_mail

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    token_generator,
)

User = get_user_model()


class RegisterView(APIView):
    """
    POST /api/auth/register/
    Creates a new user and returns a JWT token pair.
    """
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """
    POST /api/auth/login/
    Validates credentials and returns JWT access + refresh tokens.
    """
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = LoginSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "full_name": user.full_name,
                },
                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                },
            },
            status=status.HTTP_200_OK,
        )


class GoogleAuthRedirectView(APIView):
    """
    GET /api/auth/google/
    Redirects to the Google OAuth login initiation endpoint.
    """
    permission_classes = (AllowAny,)

    def get(self, request):
        from django.shortcuts import redirect
        from django.urls import reverse
        return redirect(reverse("social:begin", args=["google-oauth2"]))


class GoogleAuthTokenView(APIView):
    """
    GET /api/auth/google/token/
    Reads JWT tokens from session, clears them, and redirects to frontend.
    """
    permission_classes = (AllowAny,)

    def get(self, request):
        from django.shortcuts import redirect
        access_token = request.session.pop('jwt_access', None)
        refresh_token = request.session.pop('jwt_refresh', None)

        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip('/')
        if access_token and refresh_token:
            return redirect(f"{frontend_url}/dashboard?access={access_token}&refresh={refresh_token}")
        else:
            return redirect(f"{frontend_url}/login?error=auth_failed")


class HealthCheckView(APIView):
    """
    GET /api/auth/health/
    Simple health check endpoint returning status ok.
    """
    permission_classes = (AllowAny,)

    def get(self, request):
        return Response({"status": "ok"}, status=status.HTTP_200_OK)


class PasswordResetRequestView(APIView):
    """
    POST /api/auth/password-reset/request/
    Sends a reset link to the given email if an account exists.
    Always returns 200 regardless of whether the email exists,
    to avoid leaking which emails are registered.
    """
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        user = User.objects.filter(email__iexact=email).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = token_generator.make_token(user)
            frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip('/')
            reset_link = f"{frontend_url}/reset-password?uid={uid}&token={token}"

            send_mail(
                subject="Reset your Vortiq password",
                message=f"Click the link to reset your password: {reset_link}\n\nIf you didn't request this, ignore this email.",
                from_email=None,  # uses DEFAULT_FROM_EMAIL
                recipient_list=[user.email],
                fail_silently=False,
            )

        return Response(
            {"message": "If an account with that email exists, a reset link has been sent."},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    """
    POST /api/auth/password-reset/confirm/
    Sets a new password given a valid uid + token.
    """
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]
        user.set_password(serializer.validated_data["new_password"])
        user.save()

        return Response({"message": "Password has been reset successfully."}, status=status.HTTP_200_OK)