from django.urls import path
from .views import *

urlpatterns = [
    path('', PostView.as_view(), name='post-list'),
    path('<int:post_id>/', PostDetailView.as_view(), name='post-detail-view'),
    path('create/', PostCreateView.as_view(), name='post-create'),
]