from celery import shared_task
from django.utils import timezone
from .models import Story
import logging

logger = logging.getLogger(__name__)

@shared_task
def delete_expired_stories():
    now = timezone.now()
    expired_stories = Story.objects.filter(expires_at__lt=now)
    count = expired_stories.count()
    if count > 0:
        # Depending on media handling, we might want to also delete media from storage
        # if it's not referenced by other messages.
        # For this scope, deleting the model cascades properly if configured or just deletes the DB entry.
        expired_stories.delete()
        logger.info(f"Deleted {count} expired stories.")
    return count
