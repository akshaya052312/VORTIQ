"""
WebSocket URL routing for Vortiq (Django Channels).

Add WebSocket URL patterns here as consumers are implemented.
This list is imported by vortiq/asgi.py and passed to the URLRouter.

Example:
    from django.urls import re_path
    from myapp.consumers import MyConsumer

    websocket_urlpatterns = [
        re_path(r"^ws/myapp/$", MyConsumer.as_asgi()),
    ]
"""

from django.urls import path
from transcriptions.consumers import LiveTranscriptionConsumer, CollaborativeNotesConsumer

websocket_urlpatterns = [
    path("ws/meetings/<uuid:meeting_id>/live/", LiveTranscriptionConsumer.as_asgi()),
    path("ws/meetings/<uuid:meeting_id>/notes/", CollaborativeNotesConsumer.as_asgi()),
]
