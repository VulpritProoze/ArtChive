from django.contrib import admin, messages
from unfold.admin import ModelAdmin

from common.utils import choices
from gallery.models import ActiveGallery, Gallery, InactiveGallery


class BaseGalleryAdmin(ModelAdmin):
    list_display = ('title', 'status', 'creator', 'created_at', 'updated_at')
    list_filter = ('status', 'created_at', 'updated_at')
    search_fields = ('title', 'creator__username', 'creator__email')
    readonly_fields = (
        'gallery_id',
        'title',
        'description',
        'status',
        'picture',
        'canvas_width',
        'canvas_height',
        'is_deleted',
        'created_at',
        'updated_at',
        'creator',
    )
    exclude = ('canvas_json',)

    def has_add_permission(self, request):
        """Prevent creating galleries via the admin."""
        return False

    def has_change_permission(self, request, obj=None):
        """Prevent editing galleries via the admin."""
        return False


@admin.register(ActiveGallery)
class ActiveGalleryAdmin(BaseGalleryAdmin):
    actions = ['stop_showcase']

    def get_queryset(self, request):
        return Gallery.objects.get_active_objects().select_related('creator')

    @admin.action(description="Stop showcase of selected galleries (set to archived)")
    def stop_showcase(self, request, queryset):
        """Set status to archived for active galleries."""
        active_galleries = queryset.filter(status=choices.GALLERY_STATUS.active)
        updated = active_galleries.update(status=choices.GALLERY_STATUS.archived)
        if updated:
            self.message_user(
                request,
                f"Stopped showcase for {updated} gallery(ies).",
                level=messages.SUCCESS,
            )
        else:
            self.message_user(
                request,
                "No active galleries were selected.",
                level=messages.WARNING,
            )


@admin.register(InactiveGallery)
class InactiveGalleryAdmin(BaseGalleryAdmin):
    actions = []

    def get_queryset(self, request):
        return Gallery.objects.get_inactive_objects().select_related('creator')

    def has_delete_permission(self, request, obj=None):
        """Disable deleting inactive galleries via admin"""
        return False
