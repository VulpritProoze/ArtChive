"""
Admin configuration for search app.
"""
from django.contrib import admin
from django.contrib.admin import ModelAdmin

from .models import UserSearchHistory


# Admin for UserSearchHistory
@admin.register(UserSearchHistory)
class UserSearchHistoryAdmin(ModelAdmin):
    """Admin for viewing user search history"""
    list_display = ('user', 'query', 'search_type', 'result_count', 'is_successful', 'created_at')
    list_filter = ('search_type', 'is_successful', 'created_at')
    search_fields = ('user__username', 'query')
    readonly_fields = ('user', 'query', 'search_type', 'result_count', 'is_successful', 'created_at')
    date_hierarchy = 'created_at'
    list_per_page = 50

    def has_add_permission(self, request):
        """Cannot create search history manually"""
        return False

    def has_change_permission(self, request, obj=None):
        """Cannot edit search history"""
        return False
