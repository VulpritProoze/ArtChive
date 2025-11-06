from django.core.cache import cache
from django.db.models import Prefetch
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .cache_utils import get_notification_cache_key
from .models import Notification, NotificationNotifier
from .serializers import NotificationMarkAsReadSerializer, NotificationSerializer


class NotificationListView(generics.ListAPIView):
    """
    List all notifications for the authenticated user.
    GET /api/notifications/

    Query params:
    - unread_only: Set to 'true' to get only unread notifications
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def list(self, request, *args, **kwargs):
        '''Override list method to add cache support'''
        user_id = request.user.id
        cache_key = get_notification_cache_key(user_id)

        # Return cached data
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)

        # If no cached data
        response = super().list(request, *args, **kwargs)
        cache.set(cache_key, response.data, 600)  # Cache for 600 seconds (10 minutes)

        return response

    def get_queryset(self):
        user = self.request.user
        queryset = Notification.objects.filter(
            notified_to=user
        ).prefetch_related(
            Prefetch(
                'notificationnotifier_set',
                queryset=NotificationNotifier.objects.select_related('notified_by')
            )
        ).order_by('-notified_at')

        # Filter by unread if requested
        unread_only = self.request.query_params.get('unread_only', 'false').lower() == 'true'
        if unread_only:
            queryset = queryset.filter(is_read=False)

        return queryset


class NotificationDetailView(generics.RetrieveAPIView):
    """
    Retrieve a specific notification.
    GET /api/notifications/<notification_id>/
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'notification_id'

    def retrieve(self, request, *args, **kwargs):
        user_id = request.user.id
        cache_key = get_notification_cache_key(user_id)

        # Return cached data
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)

        # If no cached data
        response = super().retrieve(request, *args, **kwargs)
        cache.set(cache_key, response.data, 600)  # Cache for 600 seconds (10 minutes)

        return response

    def get_queryset(self):
        return Notification.objects.filter(
            notified_to=self.request.user
        ).prefetch_related(
            Prefetch(
                'notificationnotifier_set',
                queryset=NotificationNotifier.objects.select_related('notified_by')
            )
        )


class NotificationMarkAsReadView(APIView):
    """
    Mark a notification as read.
    POST /api/notifications/mark-as-read/

    Body: { "notification_id": "<uuid>" }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = NotificationMarkAsReadSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        notification = serializer.save()

        return Response(
            NotificationSerializer(notification).data,
            status=status.HTTP_200_OK
        )


class NotificationMarkAllAsReadView(APIView):
    """
    Mark all notifications as read for the authenticated user.
    POST /api/notifications/mark-all-as-read/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        updated_count = Notification.objects.filter(
            notified_to=user,
            is_read=False
        ).update(is_read=True)

        return Response(
            {
                'message': f'{updated_count} notification(s) marked as read',
                'updated_count': updated_count
            },
            status=status.HTTP_200_OK
        )


class NotificationUnreadCountView(APIView):
    """
    Get count of unread notifications for the authenticated user.
    GET /api/notifications/unread-count/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        unread_count = Notification.objects.filter(
            notified_to=user,
            is_read=False
        ).count()

        return Response(
            {'unread_count': unread_count},
            status=status.HTTP_200_OK
        )


class NotificationDeleteView(generics.DestroyAPIView):
    """
    Delete a notification.
    DELETE /api/notifications/<notification_id>/
    """
    permission_classes = [IsAuthenticated]
    lookup_field = 'notification_id'

    def get_queryset(self):
        return Notification.objects.filter(notified_to=self.request.user)
