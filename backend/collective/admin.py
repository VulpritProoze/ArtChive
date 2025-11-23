from uuid import UUID

from django.contrib import admin

from collective.models import Channel, Collective, CollectiveMember

PUBLIC_COLLECTIVE_ID = UUID("00000000-0000-0000-0000-000000000001")


class CollectiveMemberInline(admin.TabularInline):
    model = CollectiveMember
    extra = 0
    autocomplete_fields = ['member']
    fields = ('member', 'collective_role', 'created_at', 'updated_at')
    readonly_fields = ('created_at', 'updated_at')
    can_delete = True


class ChannelInline(admin.TabularInline):
    model = Channel
    extra = 0
    fields = ('channel_id', 'title', 'channel_type', 'description', 'created_at', 'updated_at')
    readonly_fields = ('channel_id', 'created_at', 'updated_at')
    can_delete = True


@admin.register(Collective)
class CollectiveAdmin(admin.ModelAdmin):
    list_display = ('title', 'created_at', 'updated_at')
    search_fields = ('title',)
    readonly_fields = (
        'collective_id',
        'title',
        'description',
        'rules',
        'artist_types',
        'picture',
        'created_at',
        'updated_at',
    )
    inlines = (CollectiveMemberInline, ChannelInline)

    def has_delete_permission(self, request, obj=None):
        """Prevent deleting the public collective indicator."""
        if obj and obj.collective_id == PUBLIC_COLLECTIVE_ID:
            return False
        return super().has_delete_permission(request, obj)

    def has_add_permission(self, request):
        """Prevent creating collectives via admin."""
        return False

    def get_inline_instances(self, request, obj=None):
        """Hide inlines for the public collective indicator."""
        if obj and obj.collective_id == PUBLIC_COLLECTIVE_ID:
            return []
        return super().get_inline_instances(request, obj)
