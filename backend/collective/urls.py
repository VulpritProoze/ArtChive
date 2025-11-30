from django.urls import path

from .views import (
    AcceptAdminRequestView,
    AdminRequestCreateView,
    AdminRequestListView,
    BecomeCollectiveAdminView,
    ChangeMemberRoleView,
    ChannelCreateView,
    ChannelDeleteView,
    ChannelListView,
    ChannelUpdateView,
    CollectiveCreateView,
    CollectiveDetailsView,
    CollectiveMembershipsView,
    CollectiveMembersListView,
    CollectiveSearchView,
    CollectiveUpdateView,
    DemoteAdminView,
    InsideCollectivePostsView,
    InsideCollectiveView,
    JoinCollectiveView,
    KickMemberView,
    LeaveCollectiveView,
    PromoteMemberView,
)

urlpatterns = [
    # Collective management
    path('join/', JoinCollectiveView.as_view(), name='collective-join'),
    path('details/', CollectiveDetailsView.as_view(), name='collective-list'),
    path('search/', CollectiveSearchView.as_view(), name='collective-search'),
    path('<uuid:collective_id>/', InsideCollectiveView.as_view(), name='collective-main'),
    path('<uuid:collective_id>/leave/', LeaveCollectiveView.as_view(), name='collective-leave'),
    path('<uuid:collective_id>/update/', CollectiveUpdateView.as_view(), name='collective-update'),
    path('create/', CollectiveCreateView.as_view(), name='collective-create'),
    path('collective-memberships/', CollectiveMembershipsView.as_view(), name='fetch-collective-memberships'),

    # Channel management
    path('channel/', ChannelListView.as_view(), name='channel-list'),   # This is probably an obsolete route
    path('<uuid:collective_id>/channel/create/', ChannelCreateView.as_view(), name='channel-create'),
    path('<uuid:collective_id>/channel/update/', ChannelUpdateView.as_view(), name='channel-update'),
    path('<uuid:collective_id>/channel/delete/', ChannelDeleteView.as_view(), name='channel-delete'),
    path('channel/<uuid:channel_id>/posts/', InsideCollectivePostsView.as_view(), name='collective-posts'),

    # Member management
    path('<uuid:collective_id>/members/', CollectiveMembersListView.as_view(), name='collective-members-list'),
    path('<uuid:collective_id>/members/kick/', KickMemberView.as_view(), name='collective-member-kick'),
    path('<uuid:collective_id>/members/promote/', PromoteMemberView.as_view(), name='collective-member-promote'),
    path('<uuid:collective_id>/members/demote/', DemoteAdminView.as_view(), name='collective-member-demote'),
    path('<uuid:collective_id>/members/<int:member_id>/role/', ChangeMemberRoleView.as_view(), name='collective-member-role-change'),

    # Admin management (legacy - instant promotion)
    path('<uuid:collective_id>/admin/join/', BecomeCollectiveAdminView.as_view(), name='collective-admin-join'),

    # Admin request system (new - request-based)
    path('<uuid:collective_id>/admin/request/', AdminRequestCreateView.as_view(), name='admin-request-create'),
    path('<uuid:collective_id>/admin/requests/', AdminRequestListView.as_view(), name='admin-requests-list'),
    path('admin/requests/<uuid:request_id>/process/', AcceptAdminRequestView.as_view(), name='admin-request-process'),
]
