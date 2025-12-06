from django.contrib import admin, messages
from django.db.models import Count, Q
from django.urls import reverse
from django.utils.html import format_html
from unfold.admin import ModelAdmin, TabularInline

from common.utils import choices
from gallery.models import (
    ActiveGallery,
    Gallery,
    GalleryAward,
    GalleryComment,
    GalleryCritique,
    InactiveGallery,
    InactiveGalleryComment,
    InactiveGalleryCritique,
)


class GalleryAwardInline(TabularInline):
    """Inline for GalleryAward - shown when viewing a gallery"""
    model = GalleryAward
    extra = 0
    fields = ('author', 'gallery_award_type', 'awarded_at', 'is_deleted')
    readonly_fields = ('author', 'gallery_award_type', 'awarded_at', 'is_deleted')
    can_delete = False

    def has_add_permission(self, request, obj=None):
        """Prevent adding gallery awards via admin"""
        return False

    def has_change_permission(self, request, obj=None):
        """Prevent editing gallery awards via admin"""
        return False

    def get_queryset(self, request):
        """Only show non-deleted awards"""
        qs = super().get_queryset(request)
        return qs.filter(is_deleted=False)


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
    inlines = [GalleryAwardInline]

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


# ============================================================================
# GALLERY COMMENT ADMIN
# ============================================================================

@admin.register(GalleryComment)
class GalleryCommentAdmin(ModelAdmin):
    """Admin for gallery comments only"""
    list_display = (
        'short_comment_id',
        'text_preview',
        'author_link',
        'gallery_link',
        'parent_comment_link',
        'reply_count_display',
        'is_critique_reply',
        'created_at'
    )
    list_filter = ('is_critique_reply', 'created_at')
    search_fields = (
        'text',
        'author__username',
        'gallery__title',
        'comment_id'
    )
    date_hierarchy = 'created_at'
    readonly_fields = ('comment_id', 'created_at', 'updated_at', 'text', 'author', 'gallery', 'replies_to', 'critique_id', 'is_critique_reply')
    list_select_related = ('author', 'gallery', 'replies_to', 'critique_id')
    list_per_page = 50

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return True

    def get_queryset(self, request):
        """Only show active comments that belong to galleries"""
        from post.models import Comment
        qs = Comment.objects.get_active_objects().filter(gallery__isnull=False).annotate(
            _reply_count=Count('comment_reply', filter=Q(comment_reply__is_deleted=False))
        )
        return qs

    def short_comment_id(self, obj):
        """Display shortened UUID"""
        return str(obj.comment_id)[:8] + '...'
    short_comment_id.short_description = 'Comment ID'
    short_comment_id.admin_order_field = 'comment_id'

    def text_preview(self, obj):
        """Show truncated text"""
        return obj.text[:80] + '...' if len(obj.text) > 80 else obj.text
    text_preview.short_description = 'Text'

    def author_link(self, obj):
        """Clickable link to author"""
        if obj.author:
            url = reverse('admin:core_user_change', args=[obj.author.id])
            return format_html('<a href="{}">{}</a>', url, obj.author.username)
        return '-'
    author_link.short_description = 'Author'

    def gallery_link(self, obj):
        """Clickable link to related gallery"""
        if obj.gallery:
            url = reverse('admin:gallery_activegallery_change', args=[obj.gallery.gallery_id])
            title = obj.gallery.title[:40] + '...' if len(obj.gallery.title) > 40 else obj.gallery.title
            return format_html('<a href="{}" title="{}">{}</a>', url, obj.gallery.title, title)
        return '-'
    gallery_link.short_description = 'Gallery'

    def parent_comment_link(self, obj):
        """Clickable link to parent comment if this is a reply"""
        if obj.replies_to:
            url = reverse('admin:gallery_gallerycomment_change', args=[obj.replies_to.comment_id])
            text = obj.replies_to.text[:30] + '...' if len(obj.replies_to.text) > 30 else obj.replies_to.text
            return format_html('<a href="{}" title="{}">{}</a>', url, obj.replies_to.text, text)
        return '-'
    parent_comment_link.short_description = 'Replying To'

    def reply_count_display(self, obj):
        """Display reply count with Unfold-style badge (theme-aware)"""
        count = obj._reply_count
        if count > 0:
            return format_html(
                '<span class="unfold-badge unfold-badge-indigo">{}</span>',
                count
            )
        return format_html(
            '<span class="unfold-badge unfold-badge-muted">0</span>'
        )
    reply_count_display.short_description = 'Replies'
    reply_count_display.admin_order_field = '_reply_count'

    class Media:
        css = {
            'all': ('admin/css/unfold_badges.css',)
        }


# ============================================================================
# GALLERY CRITIQUE ADMIN
# ============================================================================

@admin.register(GalleryCritique)
class GalleryCritiqueAdmin(ModelAdmin):
    """Admin for gallery critiques only"""
    list_display = (
        'short_critique_id',
        'text_preview',
        'impression_badge',
        'author_link',
        'gallery_link',
        'reply_count_display',
        'created_at'
    )
    list_filter = ('impression', 'created_at')
    search_fields = (
        'text',
        'author__username',
        'gallery_id__title',
        'critique_id'
    )
    date_hierarchy = 'created_at'
    readonly_fields = ('critique_id', 'created_at', 'updated_at', 'text', 'impression', 'author', 'gallery_id')
    list_select_related = ('author', 'gallery_id')
    list_per_page = 50

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return True

    def get_queryset(self, request):
        """Only show active critiques that belong to galleries"""
        from post.models import Critique
        qs = Critique.objects.get_active_objects().filter(gallery_id__isnull=False).annotate(
            _reply_count=Count('critique_reply', filter=Q(critique_reply__is_deleted=False))
        )
        return qs

    def short_critique_id(self, obj):
        """Display shortened UUID"""
        return str(obj.critique_id)[:8] + '...'
    short_critique_id.short_description = 'Critique ID'
    short_critique_id.admin_order_field = 'critique_id'

    def text_preview(self, obj):
        """Show truncated text"""
        return obj.text[:80] + '...' if len(obj.text) > 80 else obj.text
    text_preview.short_description = 'Text'

    def impression_badge(self, obj):
        """Display impression with color-coded badge"""
        colors = {
            'positive': '#28a745',
            'neutral': '#ffc107',
            'negative': '#dc3545',
            'constructive': '#17a2b8',
            'inspiring': '#e83e8c',
        }
        color = colors.get(obj.impression.lower(), '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px; font-weight: bold;">{}</span>',
            color, obj.impression
        )
    impression_badge.short_description = 'Impression'
    impression_badge.admin_order_field = 'impression'

    def author_link(self, obj):
        """Clickable link to author"""
        if obj.author:
            url = reverse('admin:core_user_change', args=[obj.author.id])
            return format_html('<a href="{}">{}</a>', url, obj.author.username)
        return '-'
    author_link.short_description = 'Author'

    def gallery_link(self, obj):
        """Clickable link to related gallery"""
        if obj.gallery_id:
            url = reverse('admin:gallery_activegallery_change', args=[obj.gallery_id.gallery_id])
            title = obj.gallery_id.title[:40] + '...' if len(obj.gallery_id.title) > 40 else obj.gallery_id.title
            return format_html('<a href="{}" title="{}">{}</a>', url, obj.gallery_id.title, title)
        return '-'
    gallery_link.short_description = 'Gallery'

    def reply_count_display(self, obj):
        """Display reply count with Unfold-style badge (theme-aware)"""
        count = obj._reply_count
        if count > 0:
            return format_html(
                '<span class="unfold-badge unfold-badge-indigo">{}</span>',
                count
            )
        return format_html(
            '<span class="unfold-badge unfold-badge-muted">0</span>'
        )
    reply_count_display.short_description = 'Replies'
    reply_count_display.admin_order_field = '_reply_count'

    class Media:
        css = {
            'all': ('admin/css/unfold_badges.css',)
        }


# ============================================================================
# INACTIVE GALLERY COMMENT ADMIN
# ============================================================================

@admin.register(InactiveGalleryComment)
class InactiveGalleryCommentAdmin(GalleryCommentAdmin):
    """Admin for inactive (soft-deleted) gallery comments"""

    def get_queryset(self, request):
        """Only show inactive comments that belong to galleries"""
        from post.models import Comment
        qs = Comment.objects.get_inactive_objects().filter(gallery__isnull=False).annotate(
            _reply_count=Count('comment_reply', filter=Q(comment_reply__is_deleted=False))
        )
        return qs

    def has_add_permission(self, request):
        """Cannot create inactive comments directly"""
        return False


# ============================================================================
# INACTIVE GALLERY CRITIQUE ADMIN
# ============================================================================

@admin.register(InactiveGalleryCritique)
class InactiveGalleryCritiqueAdmin(GalleryCritiqueAdmin):
    """Admin for inactive (soft-deleted) gallery critiques"""

    def get_queryset(self, request):
        """Only show inactive critiques that belong to galleries"""
        from post.models import Critique
        qs = Critique.objects.get_inactive_objects().filter(gallery_id__isnull=False).annotate(
            _reply_count=Count('critique_reply', filter=Q(critique_reply__is_deleted=False))
        )
        return qs

    def has_add_permission(self, request):
        """Cannot create inactive critiques directly"""
        return False
