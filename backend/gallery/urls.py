from django.urls import path

from .views import (
    GalleryDetailView,
    GalleryListCreateView,
    GalleryStatusUpdateView,
    MediaUploadView,
)

urlpatterns = [
    # Gallery CRUD
    path('', GalleryListCreateView.as_view(), name='gallery-list-create'),
    path('<uuid:gallery_id>/', GalleryDetailView.as_view(), name='gallery-detail'),
    path('<uuid:gallery_id>/status/', GalleryStatusUpdateView.as_view(), name='gallery-status-update'),

    # Media upload
    path('media/upload/', MediaUploadView.as_view(), name='media-upload'),
]
