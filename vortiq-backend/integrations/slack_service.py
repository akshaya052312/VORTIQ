import requests
import logging
from .models import UserIntegration

logger = logging.getLogger(__name__)

def post_to_slack(user, meeting, structured_notes):
    """
    Fetches the user's active Slack token, formats a message with meeting
    details (title, short summary, action items), and posts it to Slack.
    """
    # 1. Fetch user's active Slack integration
    integration = UserIntegration.objects.filter(
        user=user,
        integration_type='slack',
        is_active=True
    ).first()

    if not integration:
        logger.warning(f"No active Slack integration found for user {user.email}")
        return False

    # 2. Resolve target channel
    channel = None
    val = integration.workspace_or_channel
    
    # Check if the workspace_or_channel field holds a channel name/ID
    if val and (val.startswith('C') or val.startswith('G') or val.startswith('D') or val.startswith('#')):
        channel = val
    
    # Otherwise check if a default channel_id is stored in extra_data
    if not channel and isinstance(integration.extra_data, dict):
        channel = integration.extra_data.get('channel_id')

    # Fallback to general channel if still unresolved
    if not channel:
        channel = "#general"

    # 3. Format message contents
    summary_text = getattr(structured_notes, 'summary', '') or ''
    short_summary = summary_text[:300]
    if len(summary_text) > 300:
        short_summary += "..."

    action_items = getattr(structured_notes, 'action_items', []) or []
    items_list = []
    
    for i, item in enumerate(action_items, 1):
        assignee = item.get('assignee', 'Unassigned')
        task = item.get('task', '')
        deadline = item.get('deadline', '')
        
        item_str = f"{i}. *{assignee}*: {task}"
        if deadline:
            item_str += f" (Due: {deadline})"
        items_list.append(item_str)
        
    action_items_text = "\n".join(items_list) if items_list else "No action items detected."

    # Construct the formatted text payload matching Slack markup
    text_content = (
        f"📢 *Meeting Summary: {meeting.title}*\n\n"
        f"*Summary:*\n{short_summary}\n\n"
        f"*Action Items:*\n{action_items_text}"
    )

    # 4. Make HTTP post request
    url = "https://slack.com/api/chat.postMessage"
    headers = {
        "Authorization": f"Bearer {integration.access_token}",
        "Content-Type": "application/json; charset=utf-8"
    }
    payload = {
        "channel": channel,
        "text": text_content
    }

    try:
        response = requests.post(url, json=payload, headers=headers)
        resp_data = response.json()
        if not resp_data.get('ok'):
            logger.error(f"Slack API error: {resp_data.get('error')}")
            return False
        return True
    except Exception as e:
        logger.error(f"HTTP request to Slack failed: {str(e)}")
        return False
