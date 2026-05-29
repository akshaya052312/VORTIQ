import logging
import requests
from django.utils import timezone
from datetime import timedelta
from meetings.models import Meeting

logger = logging.getLogger(__name__)

def keep_alive():
    """
    Makes a simple GET request to the local health check endpoint to keep server alive.
    Logs and prints server keep-alive status.
    """
    url = "http://localhost:8000/api/auth/health/"
    now_str = timezone.now().strftime("%Y-%m-%d %H:%M:%S")
    try:
        response = requests.get(url, timeout=10)
        msg = f"[{now_str}] Server kept alive. Status: {response.status_code}"
        logger.info(msg)
        print(msg)
    except Exception as e:
        msg = f"[{now_str}] keep_alive failed: {e}"
        logger.error(msg)
        print(msg)

def cleanup_failed_meetings():
    """
    Deletes all failed meetings created more than 7 days ago.
    Logs and prints the number of deleted records.
    """
    threshold_date = timezone.now() - timedelta(days=7)
    failed_meetings = Meeting.objects.filter(
        status=Meeting.Status.FAILED,
        created_at__lt=threshold_date
    )
    count, _ = failed_meetings.delete()
    
    now_str = timezone.now().strftime("%Y-%m-%d %H:%M:%S")
    msg = f"[{now_str}] Deleted {count} failed meetings created before {threshold_date.strftime('%Y-%m-%d %H:%M:%S')}"
    logger.info(msg)
    print(msg)
