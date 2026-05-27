"""
ASGI config for Vortiq project.

Routes:
  - HTTP  → Django's standard ASGI application (REST API, admin, etc.)
  - WS    → Django Channels URLRouter (WebSocket consumers)

The WebSocket URL patterns live in vortiq/routing.py.
"""

import os

import django
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "vortiq.settings")

# Must call django.setup() before importing any application code that
# touches models or settings (e.g. Channels consumers).
django.setup()

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator

from vortiq.routing import websocket_urlpatterns

application = ProtocolTypeRouter(
    {
        # ── HTTP — all REST API and Django admin traffic ──────────────────
        "http": get_asgi_application(),

        # ── WebSocket — Channels consumers ────────────────────────────────
        # AllowedHostsOriginValidator rejects WS connections from origins
        # not listed in settings.ALLOWED_HOSTS (CSRF-equivalent for WS).
        # AuthMiddlewareStack populates scope["user"] from the session /
        # token so consumers can authenticate if needed.
        "websocket": AllowedHostsOriginValidator(
            AuthMiddlewareStack(
                URLRouter(websocket_urlpatterns)
            )
        ),
    }
)
