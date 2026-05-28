"""
Auth views — Register and Login endpoints.
Both return JWT access + refresh tokens.
"""

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import RegisterSerializer, LoginSerializer


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

        if access_token and refresh_token:
            return redirect(f"http://localhost:5173/dashboard?access={access_token}&refresh={refresh_token}")
        else:
            return redirect("http://localhost:5173/login?error=auth_failed")

