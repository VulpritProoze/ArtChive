from django.urls import path

from .views import (
    GalleryCountsAPIView,
    GalleryGrowthAPIView,
    GalleryActiveView,
    GalleryDetailView,
    GalleryListCreateView,
    GalleryListView,
    GalleryStatusUpdateView,
    GalleryUserListView,
    MediaUploadView,
)

urlpatterns = [
    # Gallery CRUD
    path('', GalleryListCreateView.as_view(), name='gallery-list-create'),
    path('list/', GalleryListView.as_view(), name='gallery-list'),
    path('<uuid:gallery_id>/', GalleryDetailView.as_view(), name='gallery-detail'),
    path('<uuid:gallery_id>/status/', GalleryStatusUpdateView.as_view(), name='gallery-status-update'),
    path('user/<int:user_id>/active/', GalleryActiveView.as_view(), name='gallery-active-by-user'),
    path('user/', GalleryUserListView.as_view(), name='gallery-list-by-user'),

    # Media upload
    path('media/upload/', MediaUploadView.as_view(), name='media-upload'),
    
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
