from django.urls import path, include
from .views import (
    # Gallery CRUD
    GalleryListView, GalleryCreateView, GalleryDetailView,
    GalleryUpdateView, GalleryDeleteView, PublicGalleriesListView,
    
    # Gallery Items CRUD
    GalleryItemCreateView, GalleryItemListView, GalleryItemDetailView,
    GalleryItemUpdateView, GalleryItemDeleteView,
    
    # Gallery Item Assignments
    AddItemToGalleryView, RemoveItemFromGalleryView,
    ReorderGalleryItemsView, GalleryItemsInGalleryView,
    
    # Social Features
    ItemHeartCreateView, ItemHeartDeleteView,
    ItemFeedbackCreateView, ItemFeedbackListView,
    GalleryCommentCreateView, GalleryCommentListView,
)

urlpatterns = [
    # Gallery CRUD
    path('api/gallery/', include('gallery.urls'), name='gallery'),
    path('list/me/', GalleryListView.as_view(), name='gallery-list-me'),
    path('create/', GalleryCreateView.as_view(), name='gallery-create'),
    path('<uuid:gallery_id>/', GalleryDetailView.as_view(), name='gallery-detail'),
    path('<uuid:gallery_id>/update/', GalleryUpdateView.as_view(), name='gallery-update'),
    path('<uuid:gallery_id>/delete/', GalleryDeleteView.as_view(), name='gallery-delete'),
    path('public/<str:username>/', PublicGalleriesListView.as_view(), name='gallery-public-list'),
    
    # Gallery Items CRUD
    path('items/create/', GalleryItemCreateView.as_view(), name='gallery-item-create'),
    path('items/me/', GalleryItemListView.as_view(), name='gallery-item-list-me'),
    path('items/<uuid:item_id>/', GalleryItemDetailView.as_view(), name='gallery-item-detail'),
    path('items/<uuid:item_id>/update/', GalleryItemUpdateView.as_view(), name='gallery-item-update'),
    path('items/<uuid:item_id>/delete/', GalleryItemDeleteView.as_view(), name='gallery-item-delete'),
    
    # Gallery Item Assignments
    path('<uuid:gallery_id>/items/', GalleryItemsInGalleryView.as_view(), name='gallery-items-in-gallery'),
    path('<uuid:gallery_id>/items/add/', AddItemToGalleryView.as_view(), name='gallery-add-item'),
    path('<uuid:gallery_id>/items/<uuid:item_id>/remove/', RemoveItemFromGalleryView.as_view(), name='gallery-remove-item'),
    path('<uuid:gallery_id>/items/reorder/', ReorderGalleryItemsView.as_view(), name='gallery-reorder-items'),
    
    # Social Features
    path('items/<uuid:item_id>/heart/', ItemHeartCreateView.as_view(), name='gallery-item-heart'),
    path('items/<uuid:item_id>/unheart/', ItemHeartDeleteView.as_view(), name='gallery-item-unheart'),
    path('items/<uuid:item_id>/feedback/', ItemFeedbackCreateView.as_view(), name='gallery-item-feedback-create'),
    path('items/<uuid:item_id>/feedback/list/', ItemFeedbackListView.as_view(), name='gallery-item-feedback-list'),
    path('<uuid:gallery_id>/comments/', GalleryCommentListView.as_view(), name='gallery-comments'),
    path('<uuid:gallery_id>/comments/create/', GalleryCommentCreateView.as_view(), name='gallery-comment-create'),
]