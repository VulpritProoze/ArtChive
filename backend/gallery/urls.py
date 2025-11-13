from django.urls import path
from .views import GalleryListCreateView, GalleryDetailView, MediaUploadView

urlpatterns = [
    # Gallery CRUD
    path('', GalleryListCreateView.as_view(), name='gallery-list-create'),
    path('<uuid:gallery_id>/', GalleryDetailView.as_view(), name='gallery-detail'),

    # Media upload
    path('media/upload/', MediaUploadView.as_view(), name='media-upload'),
]
