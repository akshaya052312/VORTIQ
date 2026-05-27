import requests
import logging
from .models import UserIntegration

logger = logging.getLogger(__name__)

def make_rich_text(content):
    """
    Helper to chunk content into 2000-character blocks for Notion rich_text.
    """
    if not content:
        return []
    chunks = [content[i:i+2000] for i in range(0, len(content), 2000)]
    return [{"type": "text", "text": {"content": chunk}} for chunk in chunks]


def create_notion_page(user, meeting, structured_notes):
    """
    Fetches the user's active Notion token, searches for a parent page,
    and creates a new subpage containing structured meeting notes.
    """
    # 1. Fetch user's active Notion integration
    integration = UserIntegration.objects.filter(
        user=user,
        integration_type='notion',
        is_active=True
    ).first()

    if not integration:
        logger.warning(f"No active Notion integration found for user {user.email}")
        return False

    headers = {
        "Authorization": f"Bearer {integration.access_token}",
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
    }

    # 2. Search for the first available parent page
    search_url = "https://api.notion.com/v1/search"
    search_payload = {
        "filter": {
            "value": "page",
            "property": "object"
        },
        "page_size": 1
    }

    try:
        search_response = requests.post(search_url, json=search_payload, headers=headers)
        search_data = search_response.json()
        results = search_data.get("results", [])
        if not results:
            logger.error(f"No parent page found in Notion workspace for user {user.email}")
            return False
        parent_page_id = results[0]["id"]
    except Exception as e:
        logger.error(f"Failed to search parent page in Notion: {str(e)}")
        return False

    # 3. Build Notion page blocks
    children_blocks = []

    # A) Summary Section
    children_blocks.append({
        "object": "block",
        "type": "heading_2",
        "heading_2": {
            "rich_text": [{"type": "text", "text": {"content": "Summary"}}]
        }
    })
    
    summary_text = getattr(structured_notes, 'summary', '') or ''
    children_blocks.append({
        "object": "block",
        "type": "paragraph",
        "paragraph": {
            "rich_text": make_rich_text(summary_text or "No summary available.")
        }
    })

    # B) Action Items Section
    children_blocks.append({
        "object": "block",
        "type": "heading_2",
        "heading_2": {
            "rich_text": [{"type": "text", "text": {"content": "Action Items"}}]
        }
    })
    
    action_items = getattr(structured_notes, 'action_items', []) or []
    if action_items:
        for item in action_items:
            assignee = item.get('assignee', 'Unassigned')
            task = item.get('task', '')
            deadline = item.get('deadline', '')
            
            task_desc = f"{assignee}: {task}"
            if deadline:
                task_desc += f" (Due: {deadline})"
                
            children_blocks.append({
                "object": "block",
                "type": "to_do",
                "to_do": {
                    "rich_text": [{"type": "text", "text": {"content": task_desc}}],
                    "checked": False
                }
            })
    else:
        children_blocks.append({
            "object": "block",
            "type": "paragraph",
            "paragraph": {
                "rich_text": [{"type": "text", "text": {"content": "No action items detected."}}]
            }
        })

    # C) Decisions Section
    children_blocks.append({
        "object": "block",
        "type": "heading_2",
        "heading_2": {
            "rich_text": [{"type": "text", "text": {"content": "Decisions"}}]
        }
    })
    
    decisions = getattr(structured_notes, 'decisions', []) or []
    if decisions:
        for decision in decisions:
            if decision:
                children_blocks.append({
                    "object": "block",
                    "type": "bulleted_list_item",
                    "bulleted_list_item": {
                        "rich_text": make_rich_text(decision)
                    }
                })
    else:
        children_blocks.append({
            "object": "block",
            "type": "paragraph",
            "paragraph": {
                "rich_text": [{"type": "text", "text": {"content": "No decisions recorded."}}]
            }
        })

    # D) Open Questions Section
    children_blocks.append({
        "object": "block",
        "type": "heading_2",
        "heading_2": {
            "rich_text": [{"type": "text", "text": {"content": "Open Questions"}}]
        }
    })
    
    open_questions = getattr(structured_notes, 'open_questions', []) or []
    if open_questions:
        for question in open_questions:
            if question:
                children_blocks.append({
                    "object": "block",
                    "type": "bulleted_list_item",
                    "bulleted_list_item": {
                        "rich_text": make_rich_text(question)
                    }
                })
    else:
        children_blocks.append({
            "object": "block",
            "type": "paragraph",
            "paragraph": {
                "rich_text": [{"type": "text", "text": {"content": "No open questions detected."}}]
            }
        })

    # 4. Post request to create subpage
    create_page_url = "https://api.notion.com/v1/pages"
    page_payload = {
        "parent": {"page_id": parent_page_id},
        "properties": {
            "title": {
                "title": [{"type": "text", "text": {"content": meeting.title or "Untitled Meeting"}}]
            }
        },
        "children": children_blocks
    }

    try:
        create_response = requests.post(create_page_url, json=page_payload, headers=headers)
        create_data = create_response.json()
        if "id" not in create_data:
            logger.error(f"Notion API error: {create_data.get('message', 'Failed to create page')}")
            return False
        return True
    except Exception as e:
        logger.error(f"HTTP request to create page in Notion failed: {str(e)}")
        return False
