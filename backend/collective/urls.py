from django.urls import path

from .views import (
    BecomeCollectiveAdminView,
    ChannelCreateView,
    ChannelDeleteView,
    ChannelListView,
    ChannelUpdateView,
    CollectiveCreateView,
    CollectiveDetailsView,
    CollectiveMembershipsView,
    InsideCollectivePostsView,
    InsideCollectiveView,
    JoinCollectiveView,
    LeaveCollectiveView,
)

urlpatterns = [
    path('join/', JoinCollectiveView.as_view(), name='collective-join'),
    path('details/', CollectiveDetailsView.as_view(), name='collective-list'),
    path('<uuid:collective_id>/', InsideCollectiveView.as_view(), name='collective-main'),
    path('<uuid:collective_id>/leave/', LeaveCollectiveView.as_view(), name='collective-leave'),
    path('create/', CollectiveCreateView.as_view(), name='collective-create'),
    path('channel/', ChannelListView.as_view(), name='channel-list'),   # This is probably an obsolete route
    path('<uuid:collective_id>/channel/create/', ChannelCreateView.as_view(), name='channel-create'),
    path('<uuid:collective_id>/channel/update/', ChannelUpdateView.as_view(), name='channel-update'),
    path('<uuid:collective_id>/channel/delete/', ChannelDeleteView.as_view(), name='channel-delete'),
    path('channel/<uuid:channel_id>/posts/', InsideCollectivePostsView.as_view(), name='collective-posts'),
    # path('<uuid:collective_id>/collective-member/check/', IsCollectiveMemberView.as_view(), name='is-collective-member'),
    path('collective-memberships/', CollectiveMembershipsView.as_view(), name='fetch-collective-memberships'),
    path('<uuid:collective_id>/admin/join/', BecomeCollectiveAdminView.as_view(), name='collective-admin-join'),
]
