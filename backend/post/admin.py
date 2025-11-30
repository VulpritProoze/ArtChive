import uuid

from django.contrib import admin
from django.db.models import Count, Q
from django.urls import reverse
from django.utils.html import format_html
from unfold.admin import ModelAdmin, StackedInline, TabularInline

from .models import (
    Comment,
    Critique,
    InactiveComment,
    InactiveCritique,
    InactivePost,
    NovelPost,
    Post,
)

# ============================================================================
# CUSTOM FILTERS
# ============================================================================

class HasRepliesFilter(admin.SimpleListFilter):
    """Filter comments by whether they have replies"""
    title = 'has replies'
    parameter_name = 'has_replies'

    def lookups(self, request, model_admin):
        return (
            ('yes', 'With replies'),
            ('no', 'No replies'),
        )

    def queryset(self, request, queryset):
        if self.value() == 'yes':
            return queryset.annotate(
                reply_count=Count('comment_reply')
            ).filter(reply_count__gt=0)
        if self.value() == 'no':
            return queryset.annotate(
                reply_count=Count('comment_reply')
            ).filter(reply_count=0)
        return queryset


class CommentTypeFilter(admin.SimpleListFilter):
    """Filter comments by type (top-level, reply, critique reply)"""
    title = 'comment type'
    parameter_name = 'comment_type'

    def lookups(self, request, model_admin):
        return (
            ('top_level', 'Top-level comments'),
            ('reply', 'Comment replies'),
            ('critique_reply', 'Critique replies'),
        )

    def queryset(self, request, queryset):
        if self.value() == 'top_level':
            return queryset.filter(
                replies_to__isnull=True,
                is_critique_reply=False
            )
        if self.value() == 'reply':
            return queryset.filter(
                replies_to__isnull=False,
                is_critique_reply=False
            )
        if self.value() == 'critique_reply':
            return queryset.filter(is_critique_reply=True)
        return queryset


class UserSearchFilter(admin.SimpleListFilter):
    """Custom filter for searching users by username, email, or ID with modal interface"""
    title = 'post author'
    parameter_name = 'author_id'

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
        """Filter posts by selected user ID"""
        value = self.value()
        if value and value != '__custom__':
            try:
                user_id = int(value)
                return queryset.filter(author__id=user_id)
            except (ValueError, TypeError):
                return queryset
        return queryset


class CollectiveSearchFilter(admin.SimpleListFilter):
    """Custom filter for searching collectives by title or ID with modal interface"""
    title = 'collective'
    parameter_name = 'collective_id'

    def lookups(self, request, model_admin):
        """Return at least one lookup so the filter appears (we use custom UI via template)"""
        # Return a dummy lookup - the actual UI is handled by our custom template
        return (('__custom__', 'Search Collective'),)

    def choices(self, changelist):
        """Override choices to provide custom template context"""
        # Get the current value
        value = self.value() or ''
        # Return a single choice that will be used by our custom template
        # This ensures the filter appears even with empty lookups
        yield {
            'selected': bool(value),
            'query_string': changelist.get_query_string({self.parameter_name: value}),
            'display': 'Search Collective',
            'value': value,
        }

    def queryset(self, request, queryset):
        """Filter posts by selected collective ID (via channel)"""
        value = self.value()
        if value and value != '__custom__':
            try:
                collective_id = uuid.UUID(value)
                return queryset.filter(channel__collective__collective_id=collective_id)
            except (ValueError, TypeError):
                return queryset
        return queryset


class PostSearchFilter(admin.SimpleListFilter):
    """Custom filter for searching posts by description or author with modal interface"""
    title = 'post'
    parameter_name = 'post_id'

    def lookups(self, request, model_admin):
        """Return at least one lookup so the filter appears (we use custom UI via template)"""
        return (('__custom__', 'Search Post'),)

    def choices(self, changelist):
        """Override choices to provide custom template context"""
        value = self.value() or ''
        yield {
            'selected': bool(value),
            'query_string': changelist.get_query_string({self.parameter_name: value}),
            'display': 'Search Post',
            'value': value,
        }

    def queryset(self, request, queryset):
        """Filter comments/critiques by selected post ID"""
        value = self.value()
        if value and value != '__custom__':
            try:
                post_id = uuid.UUID(value)
                return queryset.filter(post_id__post_id=post_id)
            except (ValueError, TypeError):
                return queryset
        return queryset


class CritiqueSearchFilter(admin.SimpleListFilter):
    """Custom filter for searching critiques by text, impression, or author with modal interface"""
    title = 'critique'
    parameter_name = 'critique_id'

    def lookups(self, request, model_admin):
        """Return at least one lookup so the filter appears (we use custom UI via template)"""
        return (('__custom__', 'Search Critique'),)

    def choices(self, changelist):
        """Override choices to provide custom template context"""
        value = self.value() or ''
        yield {
            'selected': bool(value),
            'query_string': changelist.get_query_string({self.parameter_name: value}),
            'display': 'Search Critique',
            'value': value,
        }

    def queryset(self, request, queryset):
        """Filter comments by selected critique ID"""
        value = self.value()
        if value and value != '__custom__':
            try:
                critique_id = uuid.UUID(value)
                return queryset.filter(critique_id__critique_id=critique_id)
            except (ValueError, TypeError):
                return queryset
        return queryset


class CritiqueHasRepliesFilter(admin.SimpleListFilter):
    """Filter critiques by whether they have replies"""
    title = 'has replies'
    parameter_name = 'has_replies'

    def lookups(self, request, model_admin):
        return (
            ('yes', 'With replies'),
            ('no', 'No replies'),
        )

    def queryset(self, request, queryset):
        if self.value() == 'yes':
            return queryset.annotate(
                reply_count=Count('critique_reply')
            ).filter(reply_count__gt=0)
        if self.value() == 'no':
            return queryset.annotate(
                reply_count=Count('critique_reply')
            ).filter(reply_count=0)
        return queryset


# ============================================================================
# INLINE ADMINS
# ============================================================================

class NovelPostInline(StackedInline):
    """Inline for NovelPost - shown when post has associated NovelPost"""
    model = NovelPost
    extra = 0
    fields = ('chapter', 'content')
    readonly_fields = ('chapter', 'content')
    can_delete = False

    def has_add_permission(self, request, obj=None):
        """Prevent adding novel posts via admin"""
        return False

    def has_change_permission(self, request, obj=None):
        """Prevent editing novel posts via admin"""
        return False

    def get_queryset(self, request):
        """Only show NovelPost if it exists for the post"""
        qs = super().get_queryset(request)
        return qs


class CommentReplyInline(TabularInline):
    """Inline to show direct replies to a comment"""
    model = Comment
    fk_name = 'replies_to'
    extra = 0
    max_num = 10
    fields = ('text_preview', 'author', 'created_at', 'is_deleted')
    readonly_fields = ('text_preview', 'author', 'created_at', 'is_deleted')
    can_delete = False
    show_change_link = True

    def text_preview(self, obj):
        """Show truncated text"""
        return obj.text[:80] + '...' if len(obj.text) > 80 else obj.text
    text_preview.short_description = 'Reply Text'

    def has_add_permission(self, request, obj=None):
        return False


class CritiqueReplyInline(TabularInline):
    """Inline to show replies to a critique"""
    model = Comment
    fk_name = 'critique_id'
    extra = 0
    max_num = 10
    fields = ('text_preview', 'author', 'created_at', 'is_deleted')
    readonly_fields = ('text_preview', 'author', 'created_at', 'is_deleted')
    can_delete = False
    show_change_link = True

    def text_preview(self, obj):
        """Show truncated text"""
        return obj.text[:80] + '...' if len(obj.text) > 80 else obj.text
    text_preview.short_description = 'Reply Text'

    def has_add_permission(self, request, obj=None):
        return False


# ============================================================================
# POST ADMINS
# ============================================================================

class BasePostAdmin(ModelAdmin):
    """Base admin for Post with common configurations"""
    list_display = (
        'short_post_id',
        'description_preview',
        'author_link',
        'post_type',
        'channel',
        'comment_count',
        'critique_count',
        'created_at',
        'is_deleted'
    )
    list_filter = (UserSearchFilter, CollectiveSearchFilter, 'created_at')  # Custom filters and date filter
    search_fields = ('description', 'author__username', 'author__email', 'post_id')
    date_hierarchy = 'created_at'
    readonly_fields = ('post_id', 'created_at', 'updated_at', 'heart_count', 'praise_count', 'trophy_count', 'novel_post_display')
    list_select_related = ('author', 'channel')
    list_per_page = 50
    inlines = [NovelPostInline]

    class Media:
        js = ('admin/js/custom_post_filter.js',)
        css = {
            'all': ('admin/css/custom_post_filter.css',)
        }

    # Make read-only: disable add, edit, delete
    def has_add_permission(self, request):  # noqa: ARG002
        return False

    def has_change_permission(self, request, obj=None):  # noqa: ARG002
        return False

    def has_delete_permission(self, request, obj=None):  # noqa: ARG002
        return False

    fieldsets = (
        ('Post Information', {
            'fields': ('post_id', 'description', 'post_type')
        }),
        ('Media', {
            'fields': ('image_url', 'video_url', 'novel_post_display')
        }),
        ('Relationships', {
            'fields': ('author', 'channel')
        }),
        ('Engagement Stats', {
            'fields': ('heart_count', 'praise_count', 'trophy_count'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at', 'is_deleted'),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.annotate(
            _comment_count=Count('post_comment', filter=Q(post_comment__is_deleted=False)),
            _critique_count=Count('post_critique', filter=Q(post_critique__is_deleted=False))
        )

    def short_post_id(self, obj):
        """Display shortened UUID"""
        return str(obj.post_id)[:8] + '...'
    short_post_id.short_description = 'Post ID'
    short_post_id.admin_order_field = 'post_id'

    def description_preview(self, obj):
        """Show truncated description"""
        desc = obj.description or ''
        return desc[:60] + '...' if len(desc) > 60 else desc
    description_preview.short_description = 'Description'
    description_preview.admin_order_field = 'description'

    def author_link(self, obj):
        """Clickable link to author"""
        if obj.author:
            url = reverse('admin:core_user_change', args=[obj.author.id])
            return format_html('<a href="{}">{}</a>', url, obj.author.username)
        return '-'
    author_link.short_description = 'Author'
    author_link.admin_order_field = 'author__username'

    def comment_count(self, obj):
        """Display comment count with badge"""
        count = obj._comment_count
        color = '#28a745' if count > 0 else '#6c757d'
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px;">{}</span>',
            color, count
        )
    comment_count.short_description = 'Comments'
    comment_count.admin_order_field = '_comment_count'

    def critique_count(self, obj):
        """Display critique count with badge"""
        count = obj._critique_count
        color = '#17a2b8' if count > 0 else '#6c757d'
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px;">{}</span>',
            color, count
        )
    critique_count.short_description = 'Critiques'
    critique_count.admin_order_field = '_critique_count'

    def heart_count(self, obj):
        """Count of hearts on this post"""
        return obj.post_heart.count()
    heart_count.short_description = 'Hearts'

    def praise_count(self, obj):
        """Count of praises on this post"""
        return obj.post_praise.count()
    praise_count.short_description = 'Praises'

    def trophy_count(self, obj):
        """Count of trophies on this post"""
        return obj.post_trophy.count()
    trophy_count.short_description = 'Trophies'

    def novel_post_display(self, obj):
        """Display NovelPost information if it exists"""
        try:
            novel_post = obj.novel_post.first()  # Get first NovelPost (there should only be one)
            if novel_post:
                return format_html(
                    '<div style="margin-top: 10px; padding: 10px; background-color: #f8f9fa; border-left: 4px solid #007bff; border-radius: 4px;">'
                    '<strong>Novel Chapter:</strong> {}<br>'
                    '<strong>Content Preview:</strong> {}<br>'
                    '<em style="color: #6c757d; font-size: 0.9em;">More information below</em>'
                    '</div>',
                    novel_post.chapter,
                    novel_post.content[:200] + '...' if len(novel_post.content) > 200 else novel_post.content
                )
        except Exception:  # noqa: BLE001
            pass
        return format_html('<span style="color: #6c757d;">No novel post associated with this post.</span>')
    novel_post_display.short_description = 'Novel Post'


@admin.register(Post)
class ActivePostAdmin(BasePostAdmin):
    """Admin for active posts only"""

    def get_queryset(self, request):
        qs = Post.objects.get_active_objects()
        return qs.annotate(
            _comment_count=Count('post_comment', filter=Q(post_comment__is_deleted=False)),
            _critique_count=Count('post_critique', filter=Q(post_critique__is_deleted=False))
        )


@admin.register(InactivePost)
class InactivePostAdmin(BasePostAdmin):
    """Admin for inactive (soft-deleted) posts"""

    def get_queryset(self, request):
        qs = Post.objects.get_inactive_objects()
        return qs.annotate(
            _comment_count=Count('post_comment', filter=Q(post_comment__is_deleted=False)),
            _critique_count=Count('post_critique', filter=Q(post_critique__is_deleted=False))
        )

    def has_add_permission(self, request):
        """Cannot create inactive posts directly"""
        return False


# ============================================================================
# COMMENT ADMINS
# ============================================================================

class BaseCommentAdmin(ModelAdmin):
    """Base admin for Comment with common configurations"""
    list_display = (
        'short_comment_id',
        'text_preview',
        'author_link',
        'post_link',
        'critique_link',
        'parent_comment_link',
        'reply_count_display',
        'is_critique_reply',
        'created_at'
    )
    list_filter = (
        PostSearchFilter,
        CritiqueSearchFilter,
        CommentTypeFilter,
        HasRepliesFilter,
        # 'is_critique_reply',
        'created_at',
    )
    search_fields = (
        'text',
        'author__username',
        'post_id__description',
        'post_id__author__username',
        'comment_id'
    )
    date_hierarchy = 'created_at'
    readonly_fields = ('comment_id', 'created_at', 'updated_at')
    list_select_related = ('author', 'post_id', 'critique_id', 'replies_to')
    list_per_page = 50
    inlines = [CommentReplyInline]
    actions = ['delete_selected_with_replies']

    class Media:
        js = ('admin/js/custom_comment_filter.js',)
        css = {
            'all': ('admin/css/custom_comment_filter.css',)
        }

    # Make read-only: disable add, edit, delete (but allow admin actions)
    def has_add_permission(self, request):  # noqa: ARG002
        return False

    def has_change_permission(self, request, obj=None):  # noqa: ARG002
        return False

    def has_delete_permission(self, request, obj=None):  # noqa: ARG002
        # Allow delete permission for both bulk actions and individual objects
        return True

    def delete_selected_with_replies(self, request, queryset):
        """
        Custom admin action to delete comments and all their replies (soft delete).
        """
        from collections import deque

        deleted_count = 0

        for comment in queryset:
            # Use the same logic as the view's soft_delete_with_replies
            comments_to_delete = []
            queue = deque([comment])

            while queue:
                current = queue.popleft()
                if not current.is_deleted:
                    comments_to_delete.append(current)
                    # Get direct replies that are not deleted
                    replies = Comment.objects.get_active_objects().filter(
                        replies_to=current
                    )
                    queue.extend(replies)

            # Soft delete all comments in the chain
            for c in comments_to_delete:
                c.delete()
                deleted_count += 1

        self.message_user(
            request,
            f"Successfully soft-deleted {deleted_count} comment(s) and their replies."
        )

    delete_selected_with_replies.short_description = "Delete selected comments and all their replies"

    fieldsets = (
        ('Comment Information', {
            'fields': ('comment_id', 'text', 'author')
        }),
        ('Relationships', {
            'fields': ('post_id', 'critique_id', 'replies_to', 'is_critique_reply')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at', 'is_deleted'),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.annotate(
            _reply_count=Count('comment_reply', filter=Q(comment_reply__is_deleted=False))
        )

    def short_comment_id(self, obj):
        """Display shortened UUID"""
        return str(obj.comment_id)[:8] + '...'
    short_comment_id.short_description = 'Comment ID'
    short_comment_id.admin_order_field = 'comment_id'

    def text_preview(self, obj):
        """Show truncated text"""
        return obj.text[:80] + '...' if len(obj.text) > 80 else obj.text
    text_preview.short_description = 'Text'
    text_preview.admin_order_field = 'text'

    def author_link(self, obj):
        """Clickable link to author"""
        if obj.author:
            url = reverse('admin:core_user_change', args=[obj.author.id])
            return format_html('<a href="{}">{}</a>', url, obj.author.username)
        return '-'
    author_link.short_description = 'Author'
    author_link.admin_order_field = 'author__username'

    def post_link(self, obj):
        """Clickable link to related post"""
        if obj.post_id:
            url = reverse('admin:post_post_change', args=[obj.post_id.post_id])
            desc = obj.post_id.description[:40] + '...' if len(obj.post_id.description) > 40 else obj.post_id.description
            return format_html('<a href="{}" title="{}">{}</a>', url, obj.post_id.description, desc)
        return '-'
    post_link.short_description = 'Post'

    def critique_link(self, obj):
        """Clickable link to related critique"""
        if obj.critique_id:
            url = reverse('admin:post_critique_change', args=[obj.critique_id.critique_id])
            return format_html('<a href="{}">Critique #{}</a>', url, str(obj.critique_id.critique_id)[:8])
        return '-'
    critique_link.short_description = 'Critique'

    def parent_comment_link(self, obj):
        """Clickable link to parent comment if this is a reply"""
        if obj.replies_to:
            url = reverse('admin:post_comment_change', args=[obj.replies_to.comment_id])
            text = obj.replies_to.text[:30] + '...' if len(obj.replies_to.text) > 30 else obj.replies_to.text
            return format_html('<a href="{}" title="{}">{}</a>', url, obj.replies_to.text, text)
        return '-'
    parent_comment_link.short_description = 'Replying To'

    def reply_count_display(self, obj):
        """Display reply count with badge"""
        count = obj._reply_count
        if count > 0:
            return format_html(
                '<span style="background-color: #007bff; color: white; padding: 3px 8px; border-radius: 3px;">{}</span>',
                count
            )
        return format_html('<span style="color: #6c757d;">0</span>')
    reply_count_display.short_description = 'Replies'
    reply_count_display.admin_order_field = '_reply_count'


@admin.register(Comment)
class ActiveCommentAdmin(BaseCommentAdmin):
    """Admin for active comments only"""

    def get_queryset(self, request):
        qs = Comment.objects.get_active_objects()
        return qs.annotate(
            _reply_count=Count('comment_reply', filter=Q(comment_reply__is_deleted=False))
        )


@admin.register(InactiveComment)
class InactiveCommentAdmin(BaseCommentAdmin):
    """Admin for inactive (soft-deleted) comments"""

    def get_queryset(self, request):
        qs = Comment.objects.get_inactive_objects()
        return qs.annotate(
            _reply_count=Count('comment_reply', filter=Q(comment_reply__is_deleted=False))
        )

    def has_add_permission(self, request):
        """Cannot create inactive comments directly"""
        return False


# ============================================================================
# CRITIQUE ADMINS
# ============================================================================

class BaseCritiqueAdmin(ModelAdmin):
    """Base admin for Critique with common configurations"""
    list_display = (
        'short_critique_id',
        'text_preview',
        'impression_badge',
        'author_link',
        'post_link',
        'reply_count_display',
        'created_at'
    )
    list_filter = (PostSearchFilter, 'impression', CritiqueHasRepliesFilter, 'created_at')
    search_fields = (
        'text',
        'author__username',
        'post_id__description',
        'post_id__author__username',
        'critique_id'
    )
    date_hierarchy = 'created_at'
    readonly_fields = ('critique_id', 'created_at', 'updated_at')
    list_select_related = ('author', 'post_id')
    list_per_page = 50
    inlines = [CritiqueReplyInline]
    actions = ['delete_selected_with_replies']

    class Media:
        js = ('admin/js/custom_critique_filter.js',)
        css = {
            'all': ('admin/css/custom_critique_filter.css',)
        }

    # Make read-only: disable add, edit
    def has_add_permission(self, request):  # noqa: ARG002
        return False

    def has_change_permission(self, request, obj=None):  # noqa: ARG002
        return False

    def has_delete_permission(self, request, obj=None):  # noqa: ARG002
        # Allow delete permission for bulk actions, but not for individual objects
        if obj is not None:
            # Viewing a specific critique - disable delete button
            return False
        # In the list view (obj is None) - allow actions
        return True

    def delete_selected_with_replies(self, request, queryset):
        """
        Custom admin action to delete critiques and all their replies (soft delete).
        """
        deleted_critiques = 0
        deleted_replies = 0

        for critique in queryset:
            if not critique.is_deleted:
                # Soft delete the critique
                critique.delete()
                deleted_critiques += 1

                # Soft delete all replies to this critique
                replies = Comment.objects.get_active_objects().filter(
                    critique_id=critique,
                    is_critique_reply=True
                )
                for reply in replies:
                    reply.delete()
                    deleted_replies += 1

        self.message_user(
            request,
            f"Successfully soft-deleted {deleted_critiques} critique(s) and {deleted_replies} reply/replies."
        )

    delete_selected_with_replies.short_description = "Delete selected critiques and all their replies"

    fieldsets = (
        ('Critique Information', {
            'fields': ('critique_id', 'text', 'impression', 'author')
        }),
        ('Relationships', {
            'fields': ('post_id',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at', 'is_deleted'),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.annotate(
            _reply_count=Count('critique_reply', filter=Q(critique_reply__is_deleted=False))
        )

    def short_critique_id(self, obj):
        """Display shortened UUID"""
        return str(obj.critique_id)[:8] + '...'
    short_critique_id.short_description = 'Critique ID'
    short_critique_id.admin_order_field = 'critique_id'

    def text_preview(self, obj):
        """Show truncated text"""
        return obj.text[:80] + '...' if len(obj.text) > 80 else obj.text
    text_preview.short_description = 'Text'
    text_preview.admin_order_field = 'text'

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
    author_link.admin_order_field = 'author__username'

    def post_link(self, obj):
        """Clickable link to related post"""
        if obj.post_id:
            url = reverse('admin:post_post_change', args=[obj.post_id.post_id])
            desc = obj.post_id.description[:40] + '...' if len(obj.post_id.description) > 40 else obj.post_id.description
            return format_html('<a href="{}" title="{}">{}</a>', url, obj.post_id.description, desc)
        return '-'
    post_link.short_description = 'Post'

    def reply_count_display(self, obj):
        """Display reply count with badge"""
        count = obj._reply_count
        if count > 0:
            return format_html(
                '<span style="background-color: #007bff; color: white; padding: 3px 8px; border-radius: 3px;">{}</span>',
                count
            )
        return format_html('<span style="color: #6c757d;">0</span>')
    reply_count_display.short_description = 'Replies'
    reply_count_display.admin_order_field = '_reply_count'


@admin.register(Critique)
class ActiveCritiqueAdmin(BaseCritiqueAdmin):
    """Admin for active critiques only"""

    def get_queryset(self, request):
        qs = Critique.objects.get_active_objects()
        return qs.annotate(
            _reply_count=Count('critique_reply', filter=Q(critique_reply__is_deleted=False))
        )


@admin.register(InactiveCritique)
class InactiveCritiqueAdmin(BaseCritiqueAdmin):
    """Admin for inactive (soft-deleted) critiques"""

    def get_queryset(self, request):
        qs = Critique.objects.get_inactive_objects()
        return qs.annotate(
            _reply_count=Count('critique_reply', filter=Q(critique_reply__is_deleted=False))
        )

    def has_add_permission(self, request):
        """Cannot create inactive critiques directly"""
        return False
