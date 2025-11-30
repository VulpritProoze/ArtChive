from uuid import UUID

from django.contrib import admin
from django.utils.html import format_html
from unfold.admin import ModelAdmin, TabularInline

from collective.models import Channel, Collective, CollectiveMember

PUBLIC_COLLECTIVE_ID = UUID("00000000-0000-0000-0000-000000000001")


class CollectiveMemberInline(TabularInline):
    model = CollectiveMember
    extra = 0
    autocomplete_fields = ['member']
    fields = ('member', 'collective_role', 'created_at', 'updated_at')
    readonly_fields = ('member', 'collective_role', 'created_at', 'updated_at')
    can_delete = False

    def has_add_permission(self, request, obj=None):
        """Prevent adding collective members via admin."""
        return False

    def has_change_permission(self, request, obj=None):
        """Prevent editing collective members via admin."""
        return False

    def has_delete_permission(self, request, obj=None):
        """Prevent deleting collective members via admin."""
        return False


class ChannelInline(TabularInline):
    model = Channel
    extra = 0
    fields = ('channel_id', 'title', 'channel_type', 'description', 'created_at', 'updated_at')
    readonly_fields = ('channel_id', 'title', 'channel_type', 'description', 'created_at', 'updated_at')
    can_delete = False

    def has_add_permission(self, request, obj=None):
        """Prevent adding channels via admin."""
        return False

    def has_change_permission(self, request, obj=None):
        """Prevent editing channels via admin."""
        return False

    def has_delete_permission(self, request, obj=None):
        """Prevent deleting channels via admin."""
        return False


@admin.register(Collective)
class CollectiveAdmin(ModelAdmin):
    list_display = ('title', 'created_at', 'updated_at')
    search_fields = ('title',)
    readonly_fields = (
        'collective_id',
        'title',
        'description',
        'display_rules',
        'display_artist_types',
        'picture',
        'created_at',
        'updated_at',
    )
    inlines = (CollectiveMemberInline, ChannelInline)

    def display_rules(self, obj):
        """Display rules as styled badges."""
        if not obj.rules:
            return format_html('<span style="color: #6c757d;">No rules specified</span>')

        badges_html = ''.join([
            format_html(
                '<span style="display: inline-block; background-color: #e3f2fd; color: #1976d2; '
                'padding: 4px 12px; margin: 2px; border-radius: 12px; font-size: 12px; '
                'font-weight: 500;">{}</span>',
                rule
            )
            for rule in obj.rules
        ])
        return format_html('<div style="line-height: 2;">{}</div>', badges_html)
    display_rules.short_description = 'Rules'

    def display_artist_types(self, obj):
        """Display artist types as styled badges."""
        if not obj.artist_types:
            return format_html('<span style="color: #6c757d;">No artist types specified</span>')

        badges_html = ''.join([
            format_html(
                '<span style="display: inline-block; background-color: #f3e5f5; color: #7b1fa2; '
                'padding: 4px 12px; margin: 2px; border-radius: 12px; font-size: 12px; '
                'font-weight: 500;">{}</span>',
                artist_type
            )
            for artist_type in obj.artist_types
        ])
        return format_html('<div style="line-height: 2;">{}</div>', badges_html)
    display_artist_types.short_description = 'Artist Types'

    def has_add_permission(self, request):
        """Prevent creating collectives via admin."""
        return False

    def has_change_permission(self, request, obj=None):
        """Prevent editing collectives via admin."""
        return False

    def has_delete_permission(self, request, obj=None):
        """Prevent deleting collectives via admin."""
        return False

    def get_inline_instances(self, request, obj=None):
        """Hide inlines for the public collective indicator."""
        if obj and obj.collective_id == PUBLIC_COLLECTIVE_ID:
            return []
        return super().get_inline_instances(request, obj)
