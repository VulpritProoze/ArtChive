from uuid import UUID

from django.contrib import admin
from django.db.models import Count, Q, Sum
from django.urls import reverse
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from unfold.admin import ModelAdmin, StackedInline, TabularInline
from unfold.decorators import display

from collective.models import (
    Channel,
    Collective,
    CollectiveMember,
    CollectivePost,
    CollectivePostComment,
    CollectivePostCritique,
    InactiveCollectivePost,
    InactiveCollectivePostComment,
    InactiveCollectivePostCritique
)
from post.admin import PraiseCountFilter, HeartsCountFilter, AwardsValueFilter

PUBLIC_COLLECTIVE_ID = UUID("00000000-0000-0000-0000-000000000001")


# ============================================================================
# CUSTOM FILTERS
# ============================================================================

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
        """Filter collective posts by selected collective ID"""
        value = self.value()
        if value and value != '__custom__':
            try:
                collective_id = UUID(value)
                return queryset.filter(channel__collective__collective_id=collective_id)
            except (ValueError, TypeError):
                return queryset
        return queryset


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
    exclude = ('rules', 'artist_types')  # Exclude raw fields, use display methods instead
    inlines = (CollectiveMemberInline, ChannelInline)

    @display(description='Rules')
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
        # Mark the joined HTML as safe
        return mark_safe(f'<div style="line-height: 2;">{badges_html}</div>')

    @display(description='Artist Types')
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
        # Mark the joined HTML as safe
        return mark_safe(f'<div style="line-height: 2;">{badges_html}</div>')

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


# ============================================================================
# COLLECTIVE POST ADMIN
# ============================================================================

class CollectivePostNovelPostInline(StackedInline):
    """Inline for NovelPost - shown when collective post has associated NovelPost"""
    from post.models import NovelPost
    model = NovelPost
    extra = 0
    fields = ('chapter', 'content')
    readonly_fields = ('chapter', 'content')
    can_delete = False
    classes = ('collapse',)  # Collapsible by default

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


class CollectivePostTrophyInline(TabularInline):
    """Inline for PostTrophy - shown when viewing a collective post"""
    from post.models import PostTrophy
    model = PostTrophy
    extra = 0
    fields = ('author', 'post_trophy_type', 'awarded_at')
    readonly_fields = ('author', 'post_trophy_type', 'awarded_at')
    can_delete = False

    def has_add_permission(self, request, obj=None):
        """Prevent adding post trophies via admin"""
        return False

    def has_change_permission(self, request, obj=None):
        """Prevent editing post trophies via admin"""
        return False

    def get_queryset(self, request):
        """Show all trophies for the post"""
        qs = super().get_queryset(request)
        return qs


@admin.register(CollectivePost)
class CollectivePostAdmin(ModelAdmin):
    """Admin for collective posts only"""
    list_display = (
        'short_post_id',
        'description_preview',
        'author_link',
        'post_type',
        'collective_link',
        'channel_link',
        'comment_count',
        'critique_count',
        'created_at'
    )
    list_filter = (CollectiveSearchFilter, PraiseCountFilter, HeartsCountFilter, AwardsValueFilter, 'post_type', 'created_at')
    search_fields = ('description', 'author__username', 'author__email', 'post_id', 'channel__collective__title')
    date_hierarchy = 'created_at'
    readonly_fields = ('post_id', 'created_at', 'updated_at', 'description', 'post_type', 'image_url', 'video_url', 'author', 'channel', 'novel_post_display')
    list_select_related = ('author', 'channel', 'channel__collective')
    list_per_page = 50
    inlines = [CollectivePostNovelPostInline, CollectivePostTrophyInline]

    class Media:
        js = ('admin/js/custom_post_filter.js',)
        css = {
            'all': ('admin/css/custom_post_filter.css', 'admin/css/unfold_badges.css',)
        }

    def novel_post_display(self, obj):
        """Display NovelPost information if it exists (Unfold-style)"""
        try:
            novel_post = obj.novel_post.first()  # Get first NovelPost (there should only be one)
            if novel_post:
                content_preview = novel_post.content[:200] + '...' if len(novel_post.content) > 200 else novel_post.content
                return format_html(
                    '<div class="unfold-novel-display">'
                    '<div class="unfold-novel-header">'
                    '<span class="unfold-novel-label">Novel Chapter:</span>'
                    '<span class="unfold-novel-chapter">{}</span>'
                    '</div>'
                    '<div class="unfold-novel-content">'
                    '<span class="unfold-novel-label">Content Preview:</span>'
                    '<p class="unfold-novel-text">{}</p>'
                    '</div>'
                    '<div class="unfold-novel-footer">More information below</div>'
                    '</div>',
                    novel_post.chapter,
                    content_preview
                )
        except Exception:  # noqa: BLE001
            pass
        return format_html('<span class="unfold-novel-empty">No novel post associated with this post.</span>')
    novel_post_display.short_description = 'Novel Post'

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def get_queryset(self, request):
        """Only show active posts that belong to collectives (not the public collective)"""
        from post.models import Post
        qs = Post.objects.get_active_objects().exclude(
            channel__collective__collective_id=PUBLIC_COLLECTIVE_ID
        ).filter(
            channel__collective__isnull=False
        ).annotate(
            _comment_count=Count('post_comment', filter=Q(post_comment__is_deleted=False)),
            _critique_count=Count('post_critique', filter=Q(post_critique__is_deleted=False)),
            _praise_count=Count('post_praise'),
            _hearts_count=Count('post_heart'),
            _awards_value=Sum('post_trophy__post_trophy_type__brush_drip_value')
        )
        return qs

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

    def collective_link(self, obj):
        """Clickable link to collective"""
        if obj.channel and obj.channel.collective:
            url = reverse('admin:collective_collective_change', args=[obj.channel.collective.collective_id])
            return format_html('<a href="{}">{}</a>', url, obj.channel.collective.title)
        return '-'
    collective_link.short_description = 'Collective'
    collective_link.admin_order_field = 'channel__collective__title'

    def channel_link(self, obj):
        """Clickable link to channel"""
        if obj.channel:
            return format_html('{}', obj.channel.title)
        return '-'
    channel_link.short_description = 'Channel'
    channel_link.admin_order_field = 'channel__title'

    def comment_count(self, obj):
        """Display comment count with Unfold-style badge (theme-aware)"""
        count = obj._comment_count
        if count > 0:
            return format_html(
                '<span class="unfold-badge unfold-badge-blue">{}</span>',
                count
            )
        return format_html(
            '<span class="unfold-badge unfold-badge-muted">0</span>'
        )
    comment_count.short_description = 'Comments'
    comment_count.admin_order_field = '_comment_count'

    def critique_count(self, obj):
        """Display critique count with Unfold-style badge (theme-aware)"""
        count = obj._critique_count
        if count > 0:
            return format_html(
                '<span class="unfold-badge unfold-badge-purple">{}</span>',
                count
            )
        return format_html(
            '<span class="unfold-badge unfold-badge-muted">0</span>'
        )
    critique_count.short_description = 'Critiques'
    critique_count.admin_order_field = '_critique_count'

    def novel_post_display(self, obj):
        """Display NovelPost information if it exists (Unfold-style)"""
        try:
            novel_post = obj.novel_post.first()  # Get first NovelPost (there should only be one)
            if novel_post:
                content_preview = novel_post.content[:200] + '...' if len(novel_post.content) > 200 else novel_post.content
                return format_html(
                    '<div class="unfold-novel-display">'
                    '<div class="unfold-novel-header">'
                    '<span class="unfold-novel-label">Novel Chapter:</span>'
                    '<span class="unfold-novel-chapter">{}</span>'
                    '</div>'
                    '<div class="unfold-novel-content">'
                    '<span class="unfold-novel-label">Content Preview:</span>'
                    '<p class="unfold-novel-text">{}</p>'
                    '</div>'
                    '<div class="unfold-novel-footer">More information below</div>'
                    '</div>',
                    novel_post.chapter,
                    content_preview
                )
        except Exception:  # noqa: BLE001
            pass
        return format_html('<span class="unfold-novel-empty">No novel post associated with this post.</span>')
    novel_post_display.short_description = 'Novel Post'


# ============================================================================
# COLLECTIVE POST COMMENT ADMIN
# ============================================================================

@admin.register(CollectivePostComment)
class CollectivePostCommentAdmin(ModelAdmin):
    """Admin for collective post comments only"""
    list_display = (
        'short_comment_id',
        'text_preview',
        'author_link',
        'post_link',
        'collective_link',
        'parent_comment_link',
        'reply_count_display',
        'is_critique_reply',
        'created_at'
    )
    list_filter = ('is_critique_reply', 'created_at')
    search_fields = (
        'text',
        'author__username',
        'post_id__description',
        'post_id__channel__collective__title',
        'comment_id'
    )
    date_hierarchy = 'created_at'
    readonly_fields = ('comment_id', 'created_at', 'updated_at', 'text', 'author', 'post_id', 'replies_to', 'critique_id', 'is_critique_reply')
    list_select_related = ('author', 'post_id', 'post_id__channel', 'post_id__channel__collective', 'replies_to', 'critique_id')
    list_per_page = 50

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return True

    def get_queryset(self, request):
        """Only show active comments on collective posts"""
        from post.models import Comment
        qs = Comment.objects.get_active_objects().filter(
            post_id__isnull=False,
            gallery__isnull=True,
            post_id__channel__collective__isnull=False
        ).exclude(
            post_id__channel__collective__collective_id=PUBLIC_COLLECTIVE_ID
        ).annotate(
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

    def post_link(self, obj):
        """Clickable link to related post"""
        if obj.post_id:
            url = reverse('admin:collective_collectivepost_change', args=[obj.post_id.post_id])
            desc = obj.post_id.description[:40] + '...' if len(obj.post_id.description) > 40 else obj.post_id.description
            return format_html('<a href="{}" title="{}">{}</a>', url, obj.post_id.description, desc)
        return '-'
    post_link.short_description = 'Post'

    def collective_link(self, obj):
        """Clickable link to collective"""
        if obj.post_id and obj.post_id.channel and obj.post_id.channel.collective:
            url = reverse('admin:collective_collective_change', args=[obj.post_id.channel.collective.collective_id])
            return format_html('<a href="{}">{}</a>', url, obj.post_id.channel.collective.title)
        return '-'
    collective_link.short_description = 'Collective'

    def parent_comment_link(self, obj):
        """Clickable link to parent comment if this is a reply"""
        if obj.replies_to:
            url = reverse('admin:collective_collectivepostcomment_change', args=[obj.replies_to.comment_id])
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


# ============================================================================
# COLLECTIVE POST CRITIQUE ADMIN
# ============================================================================

@admin.register(CollectivePostCritique)
class CollectivePostCritiqueAdmin(ModelAdmin):
    """Admin for collective post critiques only"""
    list_display = (
        'short_critique_id',
        'text_preview',
        'impression_badge',
        'author_link',
        'post_link',
        'collective_link',
        'reply_count_display',
        'created_at'
    )
    list_filter = ('impression', 'created_at')
    search_fields = (
        'text',
        'author__username',
        'post_id__description',
        'post_id__channel__collective__title',
        'critique_id'
    )
    date_hierarchy = 'created_at'
    readonly_fields = ('critique_id', 'created_at', 'updated_at', 'text', 'impression', 'author', 'post_id')
    list_select_related = ('author', 'post_id', 'post_id__channel', 'post_id__channel__collective')
    list_per_page = 50

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return True

    def get_queryset(self, request):
        """Only show active critiques that belong to collective posts"""
        from post.models import Critique
        qs = Critique.objects.get_active_objects().filter(
            post_id__isnull=False,
            gallery_id__isnull=True,
            post_id__channel__collective__isnull=False
        ).exclude(
            post_id__channel__collective__collective_id=PUBLIC_COLLECTIVE_ID
        ).annotate(
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

    def post_link(self, obj):
        """Clickable link to related post"""
        if obj.post_id:
            url = reverse('admin:collective_collectivepost_change', args=[obj.post_id.post_id])
            desc = obj.post_id.description[:40] + '...' if len(obj.post_id.description) > 40 else obj.post_id.description
            return format_html('<a href="{}" title="{}">{}</a>', url, obj.post_id.description, desc)
        return '-'
    post_link.short_description = 'Post'

    def collective_link(self, obj):
        """Clickable link to collective"""
        if obj.post_id and obj.post_id.channel and obj.post_id.channel.collective:
            url = reverse('admin:collective_collective_change', args=[obj.post_id.channel.collective.collective_id])
            return format_html('<a href="{}">{}</a>', url, obj.post_id.channel.collective.title)
        return '-'
    collective_link.short_description = 'Collective'

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
# INACTIVE COLLECTIVE POST ADMIN
# ============================================================================

@admin.register(InactiveCollectivePost)
class InactiveCollectivePostAdmin(CollectivePostAdmin):
    """Admin for inactive (soft-deleted) collective posts"""

    def get_queryset(self, request):
        """Only show inactive posts that belong to collectives (not the public collective)"""
        from post.models import Post
        qs = Post.objects.get_inactive_objects().exclude(
            channel__collective__collective_id=PUBLIC_COLLECTIVE_ID
        ).filter(
            channel__collective__isnull=False
        ).annotate(
            _comment_count=Count('post_comment', filter=Q(post_comment__is_deleted=False)),
            _critique_count=Count('post_critique', filter=Q(post_critique__is_deleted=False)),
            _praise_count=Count('post_praise'),
            _hearts_count=Count('post_heart'),
            _awards_value=Sum('post_trophy__post_trophy_type__brush_drip_value')
        )
        return qs

    def has_add_permission(self, request):
        """Cannot create inactive posts directly"""
        return False


# ============================================================================
# INACTIVE COLLECTIVE POST COMMENT ADMIN
# ============================================================================

@admin.register(InactiveCollectivePostComment)
class InactiveCollectivePostCommentAdmin(CollectivePostCommentAdmin):
    """Admin for inactive (soft-deleted) collective post comments"""

    def get_queryset(self, request):
        """Only show inactive comments on collective posts"""
        from post.models import Comment
        qs = Comment.objects.get_inactive_objects().filter(
            post_id__isnull=False,
            gallery__isnull=True,
            post_id__channel__collective__isnull=False
        ).exclude(
            post_id__channel__collective__collective_id=PUBLIC_COLLECTIVE_ID
        ).annotate(
            _reply_count=Count('comment_reply', filter=Q(comment_reply__is_deleted=False))
        )
        return qs

    def has_add_permission(self, request):
        """Cannot create inactive comments directly"""
        return False


# ============================================================================
# INACTIVE COLLECTIVE POST CRITIQUE ADMIN
# ============================================================================

@admin.register(InactiveCollectivePostCritique)
class InactiveCollectivePostCritiqueAdmin(CollectivePostCritiqueAdmin):
    """Admin for inactive (soft-deleted) collective post critiques"""

    def get_queryset(self, request):
        """Only show inactive critiques that belong to collective posts"""
        from post.models import Critique
        qs = Critique.objects.get_inactive_objects().filter(
            post_id__isnull=False,
            gallery_id__isnull=True,
            post_id__channel__collective__isnull=False
        ).exclude(
            post_id__channel__collective__collective_id=PUBLIC_COLLECTIVE_ID
        ).annotate(
            _reply_count=Count('critique_reply', filter=Q(critique_reply__is_deleted=False))
        )
        return qs

    def has_add_permission(self, request):
        """Cannot create inactive critiques directly"""
        return False
