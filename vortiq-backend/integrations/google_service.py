import requests
import logging
from datetime import datetime, timedelta
from django.conf import settings
from .models import UserIntegration

logger = logging.getLogger(__name__)

def refresh_google_token(integration):
    """
    Refreshes the Google OAuth access token using the stored refresh token.
    Saves the new token to the integration record.
    """
    if not integration.refresh_token:
        logger.error("No refresh token available to refresh Google integration")
        return False

    refresh_url = "https://oauth2.googleapis.com/token"
    payload = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "refresh_token": integration.refresh_token,
        "grant_type": "refresh_token",
    }

    try:
        response = requests.post(refresh_url, data=payload)
        resp_data = response.json()
        if "access_token" in resp_data:
            integration.access_token = resp_data["access_token"]
            integration.save()
            return True
        logger.error(f"Google token refresh failed: {resp_data.get('error_description', 'Unknown error')}")
        return False
    except Exception as e:
        logger.error(f"Error during Google token refresh: {str(e)}")
        return False


def update_calendar_event(user, meeting, structured_notes):
    """
    Searches for a primary Google calendar event matching the meeting title
    within the past 24 hours, and patches its description with the summary
    and action items. Handles token refresh if the access token has expired.
    """
    # 1. Fetch user's active Google integration
    integration = UserIntegration.objects.filter(
        user=user,
        integration_type='google_calendar',
        is_active=True
    ).first()

    if not integration:
        logger.warning(f"No active Google Calendar integration found for user {user.email}")
        return False

    # 2. Prepare HTTP headers and past 24 hours range
    time_min = (datetime.utcnow() - timedelta(days=1)).isoformat() + "Z"
    
    def make_request_with_retry(method, url, **kwargs):
        headers = kwargs.setdefault("headers", {})
        headers["Authorization"] = f"Bearer {integration.access_token}"
        
        response = requests.request(method, url, **kwargs)
        if response.status_code == 401:
            logger.info("Google access token expired. Attempting token refresh...")
            if refresh_google_token(integration):
                headers["Authorization"] = f"Bearer {integration.access_token}"
                response = requests.request(method, url, **kwargs)
            else:
                logger.error("Google token refresh failed. Unable to authenticate request.")
        return response

    # 3. List events in past 24 hours matching the title
    events_url = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
    params = {
        "timeMin": time_min,
        "q": meeting.title,
        "singleEvents": "true",
    }

    try:
        list_response = make_request_with_retry("GET", events_url, params=params)
        if list_response.status_code != 200:
            logger.error(f"Google Calendar list events failed with status {list_response.status_code}: {list_response.text}")
            return False
            
        events_data = list_response.json()
        events_list = events_data.get("items", [])
    except Exception as e:
        logger.error(f"Error listing calendar events: {str(e)}")
        return False

    # Find the exact title match
    target_event = None
    meeting_title_lower = (meeting.title or "").strip().lower()
    
    for event in events_list:
        summary = (event.get("summary") or "").strip().lower()
        if summary == meeting_title_lower:
            target_event = event
            break

    if not target_event:
        logger.info(f"No matching Google Calendar event found in past 24 hours for title: '{meeting.title}'")
        return False

    event_id = target_event["id"]

    # 4. Format description with summary and action items
    summary_text = getattr(structured_notes, 'summary', '') or ''
    action_items = getattr(structured_notes, 'action_items', []) or []
    
    action_items_lines = []
    for i, item in enumerate(action_items, 1):
        assignee = item.get('assignee', 'Unassigned')
        task = item.get('task', '')
        deadline = item.get('deadline', '')
        
        item_str = f"{i}. {assignee}: {task}"
        if deadline:
            item_str += f" (Due: {deadline})"
        action_items_lines.append(item_str)
        
    action_items_text = "\n".join(action_items_lines) if action_items_lines else "No action items detected."

    new_description = (
        f"Meeting Summary:\n{summary_text}\n\n"
        f"Action Items:\n{action_items_text}"
    )

    # 5. Patch the calendar event description
    patch_url = f"https://www.googleapis.com/calendar/v3/calendars/primary/events/{event_id}"
    patch_payload = {
        "description": new_description
    }
    patch_headers = {
        "Content-Type": "application/json"
    }

    try:
        patch_response = make_request_with_retry(
            "PATCH", 
            patch_url, 
            json=patch_payload, 
            headers=patch_headers
        )
        if patch_response.status_code == 200:
            logger.info(f"Successfully updated Google Calendar event '{meeting.title}' description.")
            return True
        else:
            logger.error(f"Google Calendar event patch failed with status {patch_response.status_code}: {patch_response.text}")
            return False
    except Exception as e:
        logger.error(f"Error patching Google Calendar event: {str(e)}")
        return False
