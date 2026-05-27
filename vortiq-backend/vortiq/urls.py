"""
URL configuration for Vortiq project.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("users.urls")),
    path("api/meetings/", include("meetings.urls")),
    path("api/transcriptions/", include("transcriptions.urls")),
    path("api/integrations/", include("integrations.urls")),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
