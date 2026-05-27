"""
Meeting URL routes — upload, list, and detail endpoints.
"""

from django.urls import path

from .views import MeetingUploadView, MeetingListView, MeetingDetailView

urlpatterns = [
    path("upload/", MeetingUploadView.as_view(), name="meeting-upload"),
    path("", MeetingListView.as_view(), name="meeting-list"),
    path("<uuid:meeting_id>/", MeetingDetailView.as_view(), name="meeting-detail"),
]
