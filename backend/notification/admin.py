from django.contrib import admin
from django.contrib.admin import display
from django.db.models import Q
from django.urls import reverse
from django.utils.html import format_html
from unfold.admin import ModelAdmin

from common.utils.choices import NOTIFICATION_TYPES

from .models import NotificationNotifier


class UserNotificationFilter(admin.SimpleListFilter):
    """Custom filter for searching users by username, email, or ID with modal interface"""
    title = 'notification user'
    parameter_name = 'notified_to_id'

    def lookups(self, request, model_admin):
        """Return at least one lookup so the filter appears (we use custom UI via template)"""
        # Return a dummy lookup - the actual UI is handled by our custom template
        return (('__custom__', 'Search User'),)

    def choices(self, changelist):
        """Override choices to provide custom template context"""
        # Get the current value
        value = self.value() or ''
        # Return a single choice that will be used by our custom template
        # This ensures the filter appears even with empty lookups
        yield {
            'selected': bool(value),
            'query_string': changelist.get_query_string({self.parameter_name: value}),
            'display': 'Search User',
            'value': value,
        }

    def queryset(self, request, queryset):
        """Filter notifications by selected user ID (notified_to)"""
        value = self.value()
        if value and value != '__custom__':
            try:
                user_id = int(value)
                return queryset.filter(notification_id__notified_to__id=user_id)
            except (ValueError, TypeError):
                return queryset
        return queryset


class NotificationObjectTypeFilter(admin.SimpleListFilter):
    title = 'object type'
    parameter_name = 'notification_object_type'

    def lookups(self, request, model_admin):
        return [
            (NOTIFICATION_TYPES.post_comment, NOTIFICATION_TYPES.post_comment),
            (NOTIFICATION_TYPES.post_critique, NOTIFICATION_TYPES.post_critique),
            (NOTIFICATION_TYPES.post_praise, NOTIFICATION_TYPES.post_praise),
            (NOTIFICATION_TYPES.post_trophy, NOTIFICATION_TYPES.post_trophy),
            (NOTIFICATION_TYPES.gallery_comment, NOTIFICATION_TYPES.gallery_comment),
        ]

    def queryset(self, request, queryset):
        if self.value():
            # Map the selected display value to all possible stored variations
            # The value from lookups is the display value (e.g., 'Post Comment')
            display_value = self.value()

            # Normalize to get the base key
            base_key = display_value.lower().replace(' ', '_')

            # Possible stored variations
            variations = [
                base_key,  # 'post_comment'
                display_value,  # 'Post Comment'
                display_value.upper(),  # 'POST COMMENT'
                display_value.lower(),  # 'post comment'
                base_key.replace('_', ' ').title(),  # 'Post Comment' (alternative)
            ]

            # Build Q object to match any variation on the related notification
            query = Q()
            for variation in variations:
                query |= Q(notification_id__notification_object_type__iexact=variation)

            return queryset.filter(query)
        return queryset


class NotificationNotifierAdmin(ModelAdmin):
    list_display = (
        'get_notification_id',
        'get_message',
        'get_notification_object_type_display',
        'get_notification_object_id',
        'get_is_read',
        'get_notified_at',
        'get_notified_to',
        'get_notified_by',
    )
    search_fields = (
        'notification_id__message',
        'notification_id__notification_object_type',
        'notification_id__notification_object_id',
        'notification_id__notified_to__username',
        'notified_by__username',
    )
    list_filter = (UserNotificationFilter, NotificationObjectTypeFilter, 'notification_id__is_read', 'notification_id__notified_at')

    class Media:
        js = ('admin/js/custom_notification_filter.js',)
        css = {
            'all': ('admin/css/custom_notification_filter.css',)
        }

    def get_notification_id(self, obj):
        """Display the notification ID."""
        return obj.notification_id.notification_id
    get_notification_id.short_description = 'Notification ID'

    def get_message(self, obj):
        """Display the notification message."""
        return obj.notification_id.message
    get_message.short_description = 'Message'

    def get_notification_object_type_display(self, obj):
        """Display the human-readable notification object type from NOTIFICATION_TYPES."""
        stored_value = obj.notification_id.notification_object_type.lower().replace(' ', '_')

        # Map stored values to NOTIFICATION_TYPES display values
        type_mapping = {
            'post_comment': NOTIFICATION_TYPES.post_comment,
            'post_critique': NOTIFICATION_TYPES.post_critique,
            'post_praise': NOTIFICATION_TYPES.post_praise,
            'post_trophy': NOTIFICATION_TYPES.post_trophy,
            'gallery_comment': NOTIFICATION_TYPES.gallery_comment,
        }

        return type_mapping.get(stored_value, obj.notification_id.notification_object_type)
    get_notification_object_type_display.short_description = 'Object Type'

    @display(description='Object ID')
    def get_notification_object_id(self, obj):
        """Display clickable link to the related object based on object type."""
        notification = obj.notification_id
        object_type = notification.notification_object_type.lower().replace(' ', '_')
        object_id = notification.notification_object_id

        try:
            if object_type == 'post_comment':
                # Format: "postId:commentId"
                if ':' in object_id:
                    _, comment_id = object_id.split(':', 1)
                    url = reverse('admin:post_comment_change', args=[comment_id])
                    return format_html('<a href="{}">{}</a>', url, object_id)
            elif object_type == 'post_critique':
                # Format: "postId:critiqueId"
                if ':' in object_id:
                    _, critique_id = object_id.split(':', 1)
                    url = reverse('admin:post_critique_change', args=[critique_id])
                    return format_html('<a href="{}">{}</a>', url, object_id)
            elif object_type == 'post_praise':
                # Format: "postId"
                url = reverse('admin:post_post_change', args=[object_id])
                return format_html('<a href="{}">{}</a>', url, object_id)
            elif object_type == 'post_trophy':
                # Format: "postId"
                url = reverse('admin:post_post_change', args=[object_id])
                return format_html('<a href="{}">{}</a>', url, object_id)
            elif object_type == 'gallery_comment':
                # Format: "galleryId:commentId"
                if ':' in object_id:
                    gallery_id, comment_id = object_id.split(':', 1)
                    url = reverse('admin:post_comment_change', args=[comment_id])
                    return format_html('<a href="{}">{}</a>', url, object_id)
        except Exception:
            # If reverse fails or object doesn't exist, just return the ID
            pass

        return object_id

    def get_is_read(self, obj):
        """Display the read status."""
        return obj.notification_id.is_read
    get_is_read.short_description = 'Is Read'
    get_is_read.boolean = True

    def get_notified_at(self, obj):
        """Display when the notification was created."""
        return obj.notification_id.notified_at
    get_notified_at.short_description = 'Notified At'

    @display(description='Notified To')
    def get_notified_to(self, obj):
        """Display clickable link to the user who received the notification."""
        user = obj.notification_id.notified_to
        if user:
            url = reverse('admin:core_user_change', args=[user.id])
            return format_html('<a href="{}">{}</a>', url, user.username)
        return '-'
    get_notified_to.admin_order_field = 'notification_id__notified_to__username'

    @display(description='Notified By')
    def get_notified_by(self, obj):
        """Display clickable link to the user who triggered the notification."""
        user = obj.notified_by
        if user:
            url = reverse('admin:core_user_change', args=[user.id])
            return format_html('<a href="{}">{}</a>', url, user.username)
        return '-'
    get_notified_by.admin_order_field = 'notified_by__username'

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

admin.site.register(NotificationNotifier, NotificationNotifierAdmin)
