from django.urls import path
from .views import (
    UserIntegrationListView,
    SlackConnectView,
    SlackCallbackView,
    NotionConnectView,
    NotionCallbackView,
    GoogleConnectView,
    GoogleCallbackView,
    IntegrationDisconnectView,
)

urlpatterns = [
    path("", UserIntegrationListView.as_view(), name="list_integrations"),
    path("slack/connect/", SlackConnectView.as_view(), name="slack_connect"),
    path("slack/callback/", SlackCallbackView.as_view(), name="slack_callback"),
    path("notion/connect/", NotionConnectView.as_view(), name="notion_connect"),
    path("notion/callback/", NotionCallbackView.as_view(), name="notion_callback"),
    path("google/connect/", GoogleConnectView.as_view(), name="google_connect"),
    path("google/callback/", GoogleCallbackView.as_view(), name="google_callback"),
    path("<str:integration_type>/disconnect/", IntegrationDisconnectView.as_view(), name="disconnect_integration"),
]
