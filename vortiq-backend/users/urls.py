"""
Auth URL routes.
"""

from django.urls import path
from .views import (
    RegisterView,
    LoginView,
    GoogleAuthRedirectView,
    GoogleAuthTokenView,
    HealthCheckView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("google/", GoogleAuthRedirectView.as_view(), name="auth-google"),
    path("google/token/", GoogleAuthTokenView.as_view(), name="auth-google-token"),
    path("health/", HealthCheckView.as_view(), name="auth-health"),
    path("password-reset/request/", PasswordResetRequestView.as_view(), name="password_reset_request"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password_reset_confirm"),
]