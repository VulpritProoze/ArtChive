from django.shortcuts import get_object_or_404
from rest_framework.permissions import BasePermission

from collective.models import Channel, Collective, CollectiveMember
from common.utils.choices import COLLECTIVE_ROLES


class IsAuthorOrSuperUser(BasePermission):
    """
    Permission that:
    - Grants full access to superusers
    - Restricts regular users (model field must be 'author') to their own objects
    - Denies all other requests

    Note:
    - Do not use if user field is not called 'author'
    """
    def has_permission(self, request, view):
        # Allow all authenticated users to interact (create/list)
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Superadmins bypass all checks
        if request.user.is_superuser:
            return True
        # Regular users can only access their own objects
        return obj.author == request.user        # Check if the object's owner matches the requesting user

class IsSuperAdmin(BasePermission):
    """
    Allows access only to superadmin users (is_superuser=True).
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_superuser)

    def has_object_permission(self, request, view, obj):
        return bool(request.user and request.user.is_superuser)

class IsCollectiveMember(BasePermission):
    """
    Allows access only to users member of CollectiveMember related to a Collective.
    The view url must have either channel_id or collective_id kwargs
    """
    message = 'Only members of this collective are allowed to perform permitted actions.'

    def has_permission(self, request, view):
        # Can handle permissions on routes that use either collective_id or channel_id
        channel_id = view.kwargs.get('channel_id')
        collective_id = view.kwargs.get('collective_id')
        channel = None
        collective = None

        if channel_id:
            channel = get_object_or_404(Channel, channel_id=channel_id)
            collective = channel.collective
        elif collective_id:
            collective = get_object_or_404(Collective, collective_id=collective_id)
        else:
            return False

        if not collective:
            return False

        return CollectiveMember.objects.filter(
            member=request.user,
            collective_id=collective
        ).exists()

class IsCollectiveAdmin(BasePermission):
    """
    Allows access only to admin/s of CollectiveMember related to a Collective.
    The view url must have either channel_id or collective_id kwargs
    """
    message = 'Only admin/s of this collective are allowed to perform permitted actions.'

    def has_permission(self, request, view):
        channel_id = view.kwargs.get('channel_id')
        collective_id = view.kwargs.get('collective_id')
        channel = None
        collective = None

        if channel_id:
            channel = get_object_or_404(Channel, channel_id=channel_id)
            collective = channel.collective
        elif collective_id:
            collective = get_object_or_404(Collective, collective_id=collective_id)
        else:
            return False

        if not collective:
            return False

        return CollectiveMember.objects.filter(
            member=request.user,
            collective_role=COLLECTIVE_ROLES.admin,
            collective_id=collective,
        ).exists()
