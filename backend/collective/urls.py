from django.urls import path
from .views import CollectiveDetailsView, CollectiveCreateView, ChannelListView, ChannelCreateView, InsideCollectiveView, InsideCollectivePostsView

urlpatterns = [
    path('details/', CollectiveDetailsView.as_view(), name='collective-list'),
    path('<uuid:collective_id>/', InsideCollectiveView.as_view(), name='collective-main'),
    path('create/', CollectiveCreateView.as_view(), name='collective-create'),
    path('channel/', ChannelListView.as_view(), name='channel-list'),
    path('channel/create/', ChannelCreateView.as_view(), name='channel-create'),
    path('<uuid:collective_id>/channel/<uuid:channel_id>/', InsideCollectivePostsView.as_view(), name='collective-posts'),
]