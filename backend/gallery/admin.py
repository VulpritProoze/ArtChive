from django.contrib import admin, messages

<<<<<<< HEAD
# Register your models here.
from django.contrib import admin
from .models import (
    Gallery, GalleryItem, GalleryItemCategory, GalleryLayout,
    GalleryAward, AwardType, ItemHeart, ItemFeedback, GalleryComment
)


@admin.register(GalleryItemCategory)
class GalleryItemCategoryAdmin(admin.ModelAdmin):
    list_display = ['category_id', 'name', 'icon', 'description']
    search_fields = ['name']


@admin.register(GalleryItem)
class GalleryItemAdmin(admin.ModelAdmin):
    list_display = ['item_id', 'title', 'owner', 'category', 'visibility', 
                   'is_achievement', 'is_featured', 'created_at']
    list_filter = ['category', 'visibility', 'is_achievement', 'is_featured', 'created_at']
    search_fields = ['title', 'owner__username', 'description']
    readonly_fields = ['item_id', 'created_at', 'achievement_date']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('item_id', 'owner', 'category', 'title', 'description', 'image_url')
        }),
        ('Visibility & Status', {
            'fields': ('visibility', 'is_featured', 'created_at')
        }),
        ('Achievement Information', {
            'fields': ('is_achievement', 'achievement_type', 'achievement_date', 
                      'achievement_metadata', 'related_post', 'related_trophy'),
            'classes': ('collapse',)
        }),
    )


class GalleryLayoutInline(admin.TabularInline):
    model = GalleryLayout
    extra = 0
    readonly_fields = ['layout_id', 'created_at', 'updated_at']
    fields = ['item', 'slot_number', 'position_x', 'position_y', 
             'width', 'height', 'z_index']


@admin.register(Gallery)
class GalleryAdmin(admin.ModelAdmin):
    list_display = ['gallery_id', 'title', 'creator', 'status', 'max_slots', 
                   'is_deleted', 'created_at']
    list_filter = ['status', 'is_deleted', 'allow_free_positioning', 'created_at']
    search_fields = ['title', 'creator__username', 'description']
    readonly_fields = ['gallery_id', 'created_at', 'updated_at']
    inlines = [GalleryLayoutInline]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('gallery_id', 'title', 'description', 'picture', 'creator')
        }),
        ('Configuration', {
            'fields': ('status', 'max_slots', 'allow_free_positioning')
        }),
        ('Status & Dates', {
            'fields': ('is_deleted', 'created_at', 'updated_at')
        }),
    )


@admin.register(GalleryLayout)
class GalleryLayoutAdmin(admin.ModelAdmin):
    list_display = ['layout_id', 'gallery', 'item', 'slot_number', 
                   'position_x', 'position_y', 'z_index']
    list_filter = ['gallery', 'created_at']
    search_fields = ['gallery__title', 'item__title']
    readonly_fields = ['layout_id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('References', {
            'fields': ('layout_id', 'gallery', 'item')
        }),
        ('Position', {
            'fields': ('slot_number', 'position_x', 'position_y', 'width', 'height', 'z_index')
        }),
        ('Visual Properties', {
            'fields': ('rotation', 'scale', 'opacity', 'border_color', 'border_width')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


# Register existing models
@admin.register(AwardType)
class AwardTypeAdmin(admin.ModelAdmin):
    list_display = ['id', 'award', 'brush_drip_value']
    search_fields = ['award']


@admin.register(GalleryAward)
class GalleryAwardAdmin(admin.ModelAdmin):
    list_display = ['id', 'gallery_id', 'author', 'gallery_award_type', 'awarded_at']
    list_filter = ['awarded_at', 'gallery_award_type']
    search_fields = ['author__username', 'gallery_id__title']


@admin.register(ItemHeart)
class ItemHeartAdmin(admin.ModelAdmin):
    list_display = ['id', 'author', 'item']
    search_fields = ['author__username']


@admin.register(ItemFeedback)
class ItemFeedbackAdmin(admin.ModelAdmin):
    list_display = ['id', 'author', 'item', 'feedback']
    search_fields = ['author__username', 'feedback']


@admin.register(GalleryComment)
class GalleryCommentAdmin(admin.ModelAdmin):
    list_display = ['id', 'author', 'is_reply_to_item']
    list_filter = ['is_reply_to_item']
    search_fields = ['author__username']
=======
from common.utils import choices
from gallery.models import ActiveGallery, Gallery, InactiveGallery


class BaseGalleryAdmin(admin.ModelAdmin):
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
>>>>>>> 9b57c94341f0e091accd798e04e37453060f4891
