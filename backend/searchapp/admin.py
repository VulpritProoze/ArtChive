"""
Admin configuration for search app.
"""
from django.contrib import admin
from django.contrib.admin import ModelAdmin

from .models import UserSearchHistory

# ============================================================================
# CUSTOM FILTERS
# ============================================================================

class UserSearchFilter(admin.SimpleListFilter):
    """Custom filter for searching users by username, email, or ID with modal interface"""
    title = 'filter by user'
    parameter_name = 'user_id'

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
        """Filter search history by selected user ID"""
        value = self.value()
        if value and value != '__custom__':
            try:
                user_id = int(value)
                return queryset.filter(user__id=user_id)
            except (ValueError, TypeError):
                return queryset
        return queryset


# Admin for UserSearchHistory
@admin.register(UserSearchHistory)
class UserSearchHistoryAdmin(ModelAdmin):
    """Admin for viewing user search history"""
    list_display = ('user', 'query', 'search_type', 'result_count', 'is_successful', 'created_at')
    list_filter = (UserSearchFilter, 'search_type', 'is_successful', 'created_at')
    search_fields = ('user__username', 'query')
    readonly_fields = ('user', 'query', 'search_type', 'result_count', 'is_successful', 'created_at')
    date_hierarchy = 'created_at'
    list_per_page = 50

    class Media:
        js = ('admin/js/custom_search_filter.js',)
        css = {
            'all': ('admin/css/custom_search_filter.css',)
        }

    def has_add_permission(self, request):
        """Cannot create search history manually"""
        return False

    def has_change_permission(self, request, obj=None):
        """Cannot edit search history"""
        return False
