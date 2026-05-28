"""
Auth URL routes — register and login endpoints.
"""

from django.urls import path
from .views import RegisterView, LoginView, GoogleAuthRedirectView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("google/", GoogleAuthRedirectView.as_view(), name="auth-google"),
]
