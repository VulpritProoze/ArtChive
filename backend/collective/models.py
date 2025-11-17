import uuid

from django.contrib.postgres.fields import ArrayField
from django.db import models

from common.utils.choices import (
    CHANNEL_TYPE_CHOICES,
    COLLECTIVE_ROLES_CHOICES,
    FACEBOOK_RULES,
)
from core.models import User


class Collective(models.Model):
    """
    All collectives are private.
    """

    def default_rules():
        return FACEBOOK_RULES.copy()

    collective_id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    title = models.CharField(max_length=100, unique=True)
    description = models.CharField(max_length=4096)
    rules = ArrayField(
        models.CharField(max_length=100), blank=True, default=default_rules
    )
    artist_types = ArrayField(
        models.CharField(max_length=50),
        default=list,
        blank=True,
        help_text="Select artist types (e.g. visual arts, literary arts, etc.)",
    )
    picture = models.ImageField(
        default="static/images/default_600x400.png", upload_to="collective/"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class CollectiveMember(models.Model):
    collective_id = models.ForeignKey(
        Collective, on_delete=models.CASCADE, related_name="collective_member"
    )
    collective_role = models.CharField(
        choices=COLLECTIVE_ROLES_CHOICES, max_length=50, default="member"
    )
    member = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="collective_member"
    )
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        member_instance = getattr(self, "member", None)
        if member_instance and hasattr(member_instance, "username"):
            return f"{member_instance.username}"
        return (
            str(member_instance) if member_instance is not None else super().__str__()
        )


class Channel(models.Model):
    channel_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=512)
    channel_type = models.CharField(
        max_length=50, choices=CHANNEL_TYPE_CHOICES, default="post_channel"
    )
    description = models.CharField(max_length=4096)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    collective = models.ForeignKey(
        Collective, on_delete=models.CASCADE, related_name="collective_channel"
    )


class AdminRequest(models.Model):
    """
    Model to track admin role requests in collectives.
    """

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]

    request_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    collective = models.ForeignKey(
        Collective, on_delete=models.CASCADE, related_name="admin_requests"
    )
    requester = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="admin_requests"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    message = models.TextField(
        max_length=500, blank=True, help_text="Optional message from requester"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_admin_requests",
    )

    class Meta:
        unique_together = ("collective", "requester", "status")
        ordering = ["-created_at"]

    def __str__(self):
        requester_username = getattr(self.requester, "username", str(self.requester))
        collective_title = getattr(self.collective, "title", str(self.collective))
        return f"{requester_username} -> {collective_title} ({self.status})"
