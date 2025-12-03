from django.urls import path

from .views import (
    CommentCountsAPIView,
    CommentGrowthAPIView,
    CommentTypesAPIView,
    CritiqueCountsAPIView,
    CritiqueGrowthAPIView,
    CritiqueImpressionsAPIView,
    EngagementCountsAPIView,
    NovelCountsAPIView,
    PostChannelsAPIView,
    PostCountsAPIView,
    PostGrowthAPIView,
    PostTypesAPIView,
    BulkPostPraiseCountView,
    BulkPostTrophyCountView,
    CommentCreateView,
    CommentDeleteView,
    CommentDetailView,
    CommentDetailWithContextView,
    CommentListView,
    CommentReplyCreateView,
    CommentReplyUpdateView,
    CommentUpdateView,
    CritiqueCreateView,
    CritiqueDeleteView,
    CritiqueDetailView,
    CritiqueDetailWithContextView,
    CritiqueListView,
    CritiqueReplyCreateView,
    CritiqueReplyDetailView,
    CritiqueReplyListView,
    CritiqueReplyUpdateView,
    CritiqueSearchView,
    CritiqueUpdateView,
    GenerateTopPostsView,
    GlobalTopPostsView,
    OwnPostsListView,
    PostBulkMetaView,
    PostCommentsReplyDetailView,
    PostCommentsReplyView,
    PostCommentsView,
    PostCreateView,
    PostDeleteView,
    PostDetailView,
    PostHeartCountView,
    PostHeartCreateView,
    PostHeartDestroyView,
    PostHeartsListView,
    PostListView,
    PostPraiseCheckView,
    PostPraiseCountView,
    PostPraiseCreateView,
    PostPraiseListView,
    PostSearchView,
    PostTrophyCheckView,
    PostTrophyCountView,
    PostTrophyCreateView,
    PostTrophyListView,
    PostUpdateView,
    UserAwardedTrophiesListView,
    UserCritiquesListView,
    UserHeartedPostsListView,
    UserPostsByUsernameListView,
    UserPraisedPostsListView,
)

"""
Some notes:
1. To delete comment reply & critique reply, use comment-delete route.
2. PostPraise and PostTrophy cannot be updated or deleted - they're permanent once created.
"""
urlpatterns = [
    path("", PostListView.as_view(), name="post-list"),
    path("top/", GlobalTopPostsView.as_view(), name="global-top-posts"),
    path("top/generate/", GenerateTopPostsView.as_view(), name="generate-top-posts"),
    path("search/", PostSearchView.as_view(), name="post-search"),
    path("bulk-meta/", PostBulkMetaView.as_view(), name="post-bulk-meta"),
    path("me/<int:id>/", OwnPostsListView.as_view(), name="post-list-me"),
    path("by-username/<str:username>/", UserPostsByUsernameListView.as_view(), name="posts-by-username"),
    path("<uuid:post_id>/", PostDetailView.as_view(), name="post-detail"),
    path("comment/", CommentListView.as_view(), name="comment-list"),
    path(
        "posts/<uuid:post_id>/comments/",
        PostCommentsView.as_view(),
        name="post-comments",
    ),
    path(
        "comment/<uuid:comment_id>/replies/",
        PostCommentsReplyDetailView.as_view(),
        name="comment-replies",
    ),
    path(
        "comment/replies/", PostCommentsReplyView.as_view(), name="comment-replies-list"
    ),
    path(
        "comment/reply/create/",
        CommentReplyCreateView.as_view(),
        name="comment-reply-create",
    ),
    path(
        "comment/reply/update/<uuid:comment_id>/",
        CommentReplyUpdateView.as_view(),
        name="comment-reply-update",
    ),
    path("<uuid:post_id>/critiques/", CritiqueListView.as_view(), name="critique-list"),
    path("critiques/search/", CritiqueSearchView.as_view(), name="critique-search"),
    path("critique/create/", CritiqueCreateView.as_view(), name="critique-create"),
    path(
        "critique/<uuid:critique_id>/",
        CritiqueDetailView.as_view(),
        name="critique-detail",
    ),
    path(
        "critique/<uuid:critique_id>/with-context/",
        CritiqueDetailWithContextView.as_view(),
        name="critique-detail-context",
    ),
    path(
        "critique/<uuid:critique_id>/update/",
        CritiqueUpdateView.as_view(),
        name="critique-update",
    ),
    path(
        "critique/<uuid:critique_id>/delete/",
        CritiqueDeleteView.as_view(),
        name="critique-delete",
    ),
    path(
        "critiques/me/", UserCritiquesListView.as_view(), name="user-critiques"
    ),  # unused yet
    path(
        "critique/<uuid:critique_id>/replies/",
        CritiqueReplyListView.as_view(),
        name="critique-reply-list",
    ),
    path(
        "critique/reply/create/",
        CritiqueReplyCreateView.as_view(),
        name="critique-reply-create",
    ),
    path(
        "critique/reply/<uuid:comment_id>/",
        CritiqueReplyDetailView.as_view(),
        name="critique-reply-detail",
    ),
    path(
        "critique/reply/<uuid:comment_id>/update/",
        CritiqueReplyUpdateView.as_view(),
        name="critique-reply-update",
    ),
    path("create/", PostCreateView.as_view(), name="post-create"),
    path("update/<uuid:post_id>/", PostUpdateView.as_view(), name="post-update"),
    path("delete/<uuid:post_id>/", PostDeleteView.as_view(), name="post-delete"),
    path(
        "comment/<uuid:comment_id>/", CommentDetailView.as_view(), name="comment-detail"
    ),
    path(
        "comment/<uuid:comment_id>/with-context/",
        CommentDetailWithContextView.as_view(),
        name="comment-detail-context",
    ),
    path("comment/create/", CommentCreateView.as_view(), name="comment-create"),
    path(
        "comment/update/<uuid:comment_id>/",
        CommentUpdateView.as_view(),
        name="comment-update",
    ),
    path(
        "comment/delete/<uuid:comment_id>/",
        CommentDeleteView.as_view(),
        name="comment-delete",
    ),
    path("heart/react/", PostHeartCreateView.as_view(), name="post-heart-react"),
    path(
        "heart/list/me/", UserHeartedPostsListView.as_view(), name="user-hearted-posts"
    ),
    path(
        "<uuid:post_id>/hearts/", PostHeartsListView.as_view(), name="post-hearts-list"
    ),
    path(
        "<uuid:post_id>/hearts/count/",
        PostHeartCountView.as_view(),
        name="post-heart-count",
    ),
    path(
        "<uuid:post_id>/unheart/",
        PostHeartDestroyView.as_view(),
        name="post-unheart-react",
    ),
    # PostPraise endpoints (costs 1 Brush Drip, cannot be deleted or updated)
    path("praise/create/", PostPraiseCreateView.as_view(), name="post-praise-create"),
    path(
        "praise/list/me/", UserPraisedPostsListView.as_view(), name="user-praised-posts"
    ),
    path(
        "bulk/praises/count/",
        BulkPostPraiseCountView.as_view(),
        name="bulk-post-praise-count",
    ),
    path(
        "<uuid:post_id>/praises/",
        PostPraiseListView.as_view(),
        name="post-praises-list",
    ),
    path(
        "<uuid:post_id>/praises/count/",
        PostPraiseCountView.as_view(),
        name="post-praise-count",
    ),
    path(
        "<uuid:post_id>/praise/check/",
        PostPraiseCheckView.as_view(),
        name="post-praise-check",
    ),
    # PostTrophy endpoints (costs 5/10/20 Brush Drips, cannot be deleted or updated)
    path("trophy/create/", PostTrophyCreateView.as_view(), name="post-trophy-create"),
    path(
        "trophy/list/me/",
        UserAwardedTrophiesListView.as_view(),
        name="user-awarded-trophies",
    ),
    path(
        "bulk/trophies/count/",
        BulkPostTrophyCountView.as_view(),
        name="bulk-post-trophy-count",
    ),
    path(
        "<uuid:post_id>/trophies/",
        PostTrophyListView.as_view(),
        name="post-trophies-list",
    ),
    path(
        "<uuid:post_id>/trophies/count/",
        PostTrophyCountView.as_view(),
        name="post-trophy-count",
    ),
    path(
        "<uuid:post_id>/trophy/check/",
        PostTrophyCheckView.as_view(),
        name="post-trophy-check",
    ),
    # Dashboard API endpoints
    path(
        "dashboard/post/posts/counts/",
        PostCountsAPIView.as_view(),
        name="dashboard-post-posts-counts",
    ),
    path(
        "dashboard/post/posts/growth/",
        PostGrowthAPIView.as_view(),
        name="dashboard-post-posts-growth",
    ),
    path(
        "dashboard/post/posts/types/",
        PostTypesAPIView.as_view(),
        name="dashboard-post-posts-types",
    ),
    path(
        "dashboard/post/posts/channels/",
        PostChannelsAPIView.as_view(),
        name="dashboard-post-posts-channels",
    ),
    path(
        "dashboard/post/engagement/counts/",
        EngagementCountsAPIView.as_view(),
        name="dashboard-post-engagement-counts",
    ),
    path(
        "dashboard/post/comments/counts/",
        CommentCountsAPIView.as_view(),
        name="dashboard-post-comments-counts",
    ),
    path(
        "dashboard/post/comments/growth/",
        CommentGrowthAPIView.as_view(),
        name="dashboard-post-comments-growth",
    ),
    path(
        "dashboard/post/comments/types/",
        CommentTypesAPIView.as_view(),
        name="dashboard-post-comments-types",
    ),
    path(
        "dashboard/post/critiques/counts/",
        CritiqueCountsAPIView.as_view(),
        name="dashboard-post-critiques-counts",
    ),
    path(
        "dashboard/post/critiques/growth/",
        CritiqueGrowthAPIView.as_view(),
        name="dashboard-post-critiques-growth",
    ),
    path(
        "dashboard/post/critiques/impressions/",
        CritiqueImpressionsAPIView.as_view(),
        name="dashboard-post-critiques-impressions",
    ),
    path(
        "dashboard/post/novels/counts/",
        NovelCountsAPIView.as_view(),
        name="dashboard-post-novels-counts",
    ),
]
