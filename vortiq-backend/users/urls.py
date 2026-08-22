"""
Auth URL routes — register and login endpoints.
"""

from django.urls import path
from .views import RegisterView, LoginView, GoogleAuthRedirectView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("google/", GoogleAuthRedirectView.as_view(), name="auth-google"),
    path("password-reset/request/", PasswordResetRequestView.as_view(), name="password_reset_request"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password_reset_confirm"),
]
