"""
URL configuration for Vortiq project.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include

from users.views import GoogleAuthTokenView, HealthCheckView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("users.urls")),
    path("api/auth/social/", include("social_django.urls", namespace="social")),
    path("api/auth/google/token/", GoogleAuthTokenView.as_view(), name="google-auth-token"),
    path("api/auth/health/", HealthCheckView.as_view(), name="health-check"),
    path("api/meetings/", include("meetings.urls")),
    path("api/transcriptions/", include("transcriptions.urls")),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
