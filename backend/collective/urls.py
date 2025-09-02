from django.urls import path
from .views import CollectiveDetailsView, CollectiveCreateView, ChannelListView, ChannelCreateView

urlpatterns = [
    path('details/', CollectiveDetailsView.as_view(), name='collective-list'),
    path('create/', CollectiveCreateView.as_view(), name='collective-create'),
    path('channel/', ChannelListView.as_view(), name='channel-list'),
    path('channel/create/', ChannelCreateView.as_view(), name='channel-create'),
]