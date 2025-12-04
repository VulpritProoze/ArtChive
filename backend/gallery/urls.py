from django.urls import path

from .award_views import (
    GalleryAwardCreateView,
    GalleryAwardDeleteView,
    GalleryAwardListView,
    GalleryAwardsBulkView,
)
from .views import (
    GalleryCommentCreateView,
    GalleryCommentDeleteView,
    GalleryCommentDetailView,
    GalleryCommentListView,
    GalleryCommentReplyCreateView,
    GalleryCommentUpdateView,
    GalleryCommentsReplyDetailView,
    GalleryCommentsView,
    GalleryCountsAPIView,
    GalleryGrowthAPIView,
    GalleryActiveView,
    GalleryHasActiveView,
    GalleryDetailView,
    GalleryPublicDetailView,
    GalleryListCreateView,
    GalleryListView,
    GalleryStatusUpdateView,
    GalleryUserListView,
    GlobalTopGalleriesView,
    MediaUploadView,
)

urlpatterns = [
    # Gallery CRUD
    path('', GalleryListCreateView.as_view(), name='gallery-list-create'),
    path('list/', GalleryListView.as_view(), name='gallery-list'),
    path('top/', GlobalTopGalleriesView.as_view(), name='global-top-galleries'),
    path('<uuid:gallery_id>/', GalleryDetailView.as_view(), name='gallery-detail'),
    path('<uuid:gallery_id>/public/', GalleryPublicDetailView.as_view(), name='gallery-public-detail'),
    path('<uuid:gallery_id>/status/', GalleryStatusUpdateView.as_view(), name='gallery-status-update'),
    path('user/<int:user_id>/active/', GalleryActiveView.as_view(), name='gallery-active-by-user'),
    path('user/<int:user_id>/has-active/', GalleryHasActiveView.as_view(), name='gallery-has-active-by-user'),
    path('user/', GalleryUserListView.as_view(), name='gallery-list-by-user'),

    # Media upload
    path('media/upload/', MediaUploadView.as_view(), name='media-upload'),
    
    # Gallery Comments
    path('<uuid:gallery_id>/comments/', GalleryCommentsView.as_view(), name='gallery-comments'),
    path('comment/create/', GalleryCommentCreateView.as_view(), name='gallery-comment-create'),
    path('comment/<uuid:comment_id>/', GalleryCommentDetailView.as_view(), name='gallery-comment-detail'),
    path('comment/<uuid:comment_id>/update/', GalleryCommentUpdateView.as_view(), name='gallery-comment-update'),
    path('comment/<uuid:comment_id>/delete/', GalleryCommentDeleteView.as_view(), name='gallery-comment-delete'),
    path('comment/reply/create/', GalleryCommentReplyCreateView.as_view(), name='gallery-comment-reply-create'),
    path('comment/<uuid:comment_id>/replies/', GalleryCommentsReplyDetailView.as_view(), name='gallery-comment-replies'),
    path('comments/', GalleryCommentListView.as_view(), name='gallery-comment-list'),
    
    # Gallery Awards
    path('award/create/', GalleryAwardCreateView.as_view(), name='gallery-award-create'),
    path('award/<int:award_id>/delete/', GalleryAwardDeleteView.as_view(), name='gallery-award-delete'),
    path('<uuid:gallery_id>/awards/', GalleryAwardListView.as_view(), name='gallery-award-list'),
    path('awards/bulk/', GalleryAwardsBulkView.as_view(), name='gallery-awards-bulk'),
    
    # Dashboard API endpoints
    path(
        "dashboard/gallery/galleries/counts/",
        GalleryCountsAPIView.as_view(),
        name="dashboard-gallery-galleries-counts",
    ),
    path(
        "dashboard/gallery/galleries/growth/",
        GalleryGrowthAPIView.as_view(),
        name="dashboard-gallery-galleries-growth",
    ),
]
