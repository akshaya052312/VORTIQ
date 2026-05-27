import logging
from meetings.models import Meeting
from transcriptions.models import StructuredNotes
from .models import UserIntegration, IntegrationLog
from .slack_service import post_to_slack
from .notion_service import create_notion_page
from .google_service import update_calendar_event

logger = logging.getLogger(__name__)

def trigger_integrations(meeting_id):
    """
    Fetches the Meeting and its owner, then triggers active integrations
    (Slack, Notion, Google Calendar) to distribute the meeting notes.
    Each integration runs independently in a separate try/except block.
    """
    try:
        meeting = Meeting.objects.get(id=meeting_id)
        user = meeting.user
    except Meeting.DoesNotExist:
        logger.error(f"trigger_integrations: Meeting {meeting_id} not found. Aborting.")
        return
    except Exception as e:
        logger.error(f"trigger_integrations: Error loading meeting or user: {str(e)}")
        return

    try:
        structured_notes = StructuredNotes.objects.get(meeting=meeting)
    except StructuredNotes.DoesNotExist:
        logger.warning(f"trigger_integrations: StructuredNotes not found for meeting {meeting_id}. Aborting.")
        return

    # Fetch active user integrations
    active_integrations = UserIntegration.objects.filter(user=user, is_active=True)
    if not active_integrations.exists():
        logger.info(f"trigger_integrations: No active integrations found for user {user.email}")
        return

    results = []

    for integration in active_integrations:
        itype = integration.integration_type
        logger.info(f"trigger_integrations: Running {itype} integration for meeting '{meeting.title}'")
        
        try:
            success = False
            if itype == 'slack':
                success = post_to_slack(user, meeting, structured_notes)
            elif itype == 'notion':
                success = create_notion_page(user, meeting, structured_notes)
            elif itype == 'google_calendar':
                success = update_calendar_event(user, meeting, structured_notes)
            else:
                logger.warning(f"trigger_integrations: Unknown integration type '{itype}' skipped.")
                continue
            
            if success:
                results.append((itype, "SUCCESS"))
                IntegrationLog.objects.create(
                    meeting=meeting,
                    integration_type=itype,
                    status='success'
                )
            else:
                results.append((itype, "FAILED (Returned False)"))
                IntegrationLog.objects.create(
                    meeting=meeting,
                    integration_type=itype,
                    status='failed',
                    error_message="Returned False"
                )
                
        except Exception as exc:
            logger.error(f"trigger_integrations: {itype} integration failed with exception: {str(exc)}", exc_info=True)
            results.append((itype, f"FAILED ({str(exc)})"))
            IntegrationLog.objects.create(
                meeting=meeting,
                integration_type=itype,
                status='failed',
                error_message=str(exc)
            )

    # Log summary
    summary_str = ", ".join([f"{itype}: {status}" for itype, status in results])
    logger.info(f"trigger_integrations: Execution summary for meeting {meeting_id} -> {summary_str}")
