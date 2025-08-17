from django.urls import path
from .views import (
    PostListView, PostDetailView, PostCreateView, PostUpdateView, PostDeleteView,
    CommentListView, CommentDetailView, CommentCreateView, CommentUpdateView, CommentDeleteView,
)

urlpatterns = [
    path('', PostListView.as_view(), name='post-list'),
    path('<uuid:post_id>/', PostDetailView.as_view(), name='post-detail'),
    path('create/', PostCreateView.as_view(), name='post-create'),
    path('update/', PostUpdateView.as_view(), name='post-update'),
    path('delete/', PostDeleteView.as_view(), name='post-delete'),
    path('comment/', CommentListView.as_view(), name='comment-list'),
    path('comment/<uuid:comment_id>/', CommentDetailView.as_view(), name='comment-detail'),
    path('comment/create/', CommentCreateView.as_view(), name='comment-create'),
    path('comment/update/', CommentUpdateView.as_view(), name='comment-update'),
    path('comment/delete/', CommentDeleteView.as_view(), name='comment-delete'),
]