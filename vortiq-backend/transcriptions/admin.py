"""
Admin registration for the Transcription model.
"""

from django.contrib import admin

from .models import Transcription


@admin.register(Transcription)
class TranscriptionAdmin(admin.ModelAdmin):
    list_display = ("id", "meeting", "language", "created_at")
    list_filter = ("language", "created_at")
    search_fields = ("meeting__title", "raw_text")
    readonly_fields = ("id", "created_at")
    ordering = ("-created_at",)
