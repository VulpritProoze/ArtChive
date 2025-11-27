<<<<<<< HEAD
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    GalleryViewSet,
    GalleryItemViewSet,
    GalleryItemCategoryViewSet,
    GalleryLayoutViewSet
)

router = DefaultRouter()
router.register(r'galleries', GalleryViewSet, basename='gallery')
router.register(r'items', GalleryItemViewSet, basename='gallery-item')
router.register(r'categories', GalleryItemCategoryViewSet, basename='gallery-category')
router.register(r'layout', GalleryLayoutViewSet, basename='gallery-layout')

urlpatterns = [
    path('', include(router.urls)),
=======
from django.urls import path

from .views import (
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
>>>>>>> 9b57c94341f0e091accd798e04e37453060f4891
]

# API Endpoints (accessed via /api/gallery/ prefix from main urls.py):
# 
# Galleries:
#   GET    /api/gallery/galleries/                    - List galleries
#   POST   /api/gallery/galleries/                    - Create gallery
#   GET    /api/gallery/galleries/{id}/               - Get gallery detail
#   PUT    /api/gallery/galleries/{id}/               - Update gallery
#   DELETE /api/gallery/galleries/{id}/               - Delete gallery
#   GET    /api/gallery/galleries/{id}/public_view/   - Public view
#
# Items:
#   GET    /api/gallery/items/                        - List user's items
#   POST   /api/gallery/items/                        - Upload new item
#   GET    /api/gallery/items/{id}/                   - Get item detail
#   PUT    /api/gallery/items/{id}/                   - Update item
#   DELETE /api/gallery/items/{id}/                   - Delete item
#   GET    /api/gallery/items/achievements/           - Get achievements only
#   GET    /api/gallery/items/artworks/               - Get artworks only
#
# Categories:
#   GET    /api/gallery/categories/                   - List all categories
#
# Layout:
#   GET    /api/gallery/layout/?gallery={id}          - List layout items
#   POST   /api/gallery/layout/                       - Add item to gallery
#   PUT    /api/gallery/layout/{id}/                  - Update position
#   DELETE /api/gallery/layout/{id}/                  - Remove from gallery
#   POST   /api/gallery/layout/bulk_update/           - Bulk update positions
#   POST   /api/gallery/layout/reorder_slots/         - Reorder slot items