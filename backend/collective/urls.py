from django.urls import path
from .views import (
    CollectiveDetailsView, CollectiveCreateView, ChannelListView, 
    ChannelCreateView, InsideCollectiveView, InsideCollectivePostsView, 
    InsideCollectivePostsCreateView, JoinCollectiveView
)

urlpatterns = [
    path('join/', JoinCollectiveView.as_view(), name='collective-join'),
    path('details/', CollectiveDetailsView.as_view(), name='collective-list'),
    path('<uuid:collective_id>/', InsideCollectiveView.as_view(), name='collective-main'),
    path('create/', CollectiveCreateView.as_view(), name='collective-create'),
    path('channel/', ChannelListView.as_view(), name='channel-list'),   # This is probably an obsolete route
    path('channel/create/', ChannelCreateView.as_view(), name='channel-create'),
    path('channel/<uuid:channel_id>/posts/', InsideCollectivePostsView.as_view(), name='collective-posts'),
    path('channel/<uuid:channel_id>/posts/create/', InsideCollectivePostsCreateView.as_view(), name='collective-posts-create'),
]