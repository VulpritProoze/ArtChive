from django.urls import path
from .views import (
    OwnPostsListView, PostListView, PostDetailView, PostCreateView, PostUpdateView, PostDeleteView,
    CommentListView, CommentDetailView, CommentCreateView, CommentUpdateView, CommentDeleteView,
    PostCommentsView, PostHeartCreateView, UserHeartedPostsListView, PostHeartsListView,
    PostHeartDestroyView, PostCommentsReplyView, PostCommentsReplyDetailView,
    CommentReplyCreateView, CommentReplyUpdateView
)

urlpatterns = [
    path('', PostListView.as_view(), name='post-list'),
    path('me/<int:id>/', OwnPostsListView.as_view(), name='post-list-me'),
    path('<uuid:post_id>/', PostDetailView.as_view(), name='post-detail'),
    path('comment/', CommentListView.as_view(), name='comment-list'),
    path('comment/<uuid:post_id>/', PostCommentsView.as_view(), name='post-comments'),
    path('comment/<uuid:comment_id>/replies/', PostCommentsReplyDetailView.as_view(), name='comment-replies'),
    path('comment/replies/', PostCommentsReplyView.as_view(), name='comment-replies-list'),
    path('comment/reply/create/', CommentReplyCreateView.as_view(), name='comment-reply-create'),
    path('comment/reply/update/<uuid:comment_id>/', CommentReplyUpdateView.as_view(), name='comment-reply-update'),
    path('create/', PostCreateView.as_view(), name='post-create'),
    path('update/<uuid:post_id>/', PostUpdateView.as_view(), name='post-update'),
    path('delete/<uuid:post_id>/', PostDeleteView.as_view(), name='post-delete'),
    path('comment/<uuid:comment_id>/', CommentDetailView.as_view(), name='comment-detail'),
    path('comment/create/', CommentCreateView.as_view(), name='comment-create'),
    path('comment/update/<uuid:comment_id>/', CommentUpdateView.as_view(), name='comment-update'),
    path('comment/delete/<uuid:comment_id>/', CommentDeleteView.as_view(), name='comment-delete'),
    path('heart/react/', PostHeartCreateView.as_view(), name='post-heart-react'),
    path('heart/list/me/', UserHeartedPostsListView.as_view(), name='user-hearted-posts'),
    path('<uuid:post_id>/hearts/', PostHeartsListView.as_view(), name='post-hearts-list'),
    path('<uuid:post_id>/unheart/', PostHeartDestroyView.as_view(), name='post-unheart-react'),
]