from django.urls import path

# Import views from other apps
from collective.views import CollectiveDashboardView
from gallery.views import GalleryDashboardView
from post.views import PostDashboardView

from .views import CoreDashboardView, DashboardIndexView

app_name = 'dashboard'

urlpatterns = [
    path('', DashboardIndexView.as_view(), name='dashboard-index'),
    path('core/', CoreDashboardView.as_view(), name='core-dashboard'),
    path('post/', PostDashboardView.as_view(), name='post-dashboard'),
    path('collective/', CollectiveDashboardView.as_view(), name='collective-dashboard'),
    path('gallery/', GalleryDashboardView.as_view(), name='gallery-dashboard'),
]

