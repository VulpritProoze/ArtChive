from django.urls import path
from avatar import views

urlpatterns = [
    # Avatar CRUD
    path('', views.AvatarListCreateView.as_view(), name='avatar-list-create'),
    path('<uuid:avatar_id>/', views.AvatarDetailView.as_view(), name='avatar-detail'),
    
    # Avatar Actions
    path('<uuid:avatar_id>/set-primary/', views.AvatarSetPrimaryView.as_view(), name='avatar-set-primary'),
    path('<uuid:avatar_id>/duplicate/', views.AvatarDuplicateView.as_view(), name='avatar-duplicate'),
    path('<uuid:avatar_id>/render/', views.AvatarRenderView.as_view(), name='avatar-render'),
]
