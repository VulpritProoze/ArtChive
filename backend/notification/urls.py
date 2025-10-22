from django.urls import path

from .views import (
    NotificationDeleteView,
    NotificationDetailView,
    NotificationListView,
    NotificationMarkAllAsReadView,
    NotificationMarkAsReadView,
    NotificationUnreadCountView,
)

urlpatterns = [
    # List all notifications
    path('', NotificationListView.as_view(), name='notification-list'),

    # Get unread count
    path('unread-count/', NotificationUnreadCountView.as_view(), name='notification-unread-count'),

    # Mark as read
    path('mark-as-read/', NotificationMarkAsReadView.as_view(), name='notification-mark-as-read'),
    path('mark-all-as-read/', NotificationMarkAllAsReadView.as_view(), name='notification-mark-all-as-read'),

    # Detail, delete
    path('<uuid:notification_id>/', NotificationDetailView.as_view(), name='notification-detail'),
    path('<uuid:notification_id>/delete/', NotificationDeleteView.as_view(), name='notification-delete'),
]
