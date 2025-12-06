from django.urls import path

from .views import (
    ChannelCountsAPIView,
    ChannelGrowthAPIView,
    ChannelsPerCollectiveAPIView,
    CollectiveCountsAPIView,
    CollectiveGrowthAPIView,
    CollectiveTypesAPIView,
    AcceptAdminRequestView,
    AcceptJoinRequestView,
    AdminRequestCreateView,
    AdminRequestListView,
    BecomeCollectiveAdminView,
    BulkActiveMembersCountView,
    BulkCollectiveDetailsView,
    BulkPendingJoinRequestsView,
    CancelJoinRequestView,
    JoinRequestCreateView,
    JoinRequestListView,
    MyJoinRequestsView,
    ChangeMemberRoleView,
    ChannelCreateView,
    ChannelDeleteView,
    ChannelListView,
    ChannelUpdateView,
    CollectiveCreateView,
    CollectiveDetailsView,
    CollectiveMembershipsView,
    CollectiveMembersListView,
    CollectiveRequestCountsView,
    CollectiveSearchView,
    CollectiveSearchPostsView,
    CollectiveSearchMembersView,
    CollectiveUpdateView,
    UserCollectivesView,
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
    path('bulk/', BulkCollectiveDetailsView.as_view(), name='bulk-collective-details'),
    path('<uuid:collective_id>/', InsideCollectiveView.as_view(), name='collective-main'),
    path('<uuid:collective_id>/search/', CollectiveSearchPostsView.as_view(), name='collective-search-posts'),
    path('<uuid:collective_id>/members/search/', CollectiveSearchMembersView.as_view(), name='collective-search-members'),
    path('<uuid:collective_id>/leave/', LeaveCollectiveView.as_view(), name='collective-leave'),
    path('<uuid:collective_id>/update/', CollectiveUpdateView.as_view(), name='collective-update'),
    path('<uuid:collective_id>/requests/counts/', CollectiveRequestCountsView.as_view(), name='collective-request-counts'),
    path('create/', CollectiveCreateView.as_view(), name='collective-create'),
    path('collective-memberships/', CollectiveMembershipsView.as_view(), name='fetch-collective-memberships'),
    path('user/<int:user_id>/collectives/', UserCollectivesView.as_view(), name='user-collectives'),

    # Channel management
    path('channel/', ChannelListView.as_view(), name='channel-list'),   # This is probably an obsolete route
    path('<uuid:collective_id>/channel/create/', ChannelCreateView.as_view(), name='channel-create'),
    path('<uuid:collective_id>/channel/update/', ChannelUpdateView.as_view(), name='channel-update'),
    path('<uuid:collective_id>/channel/delete/', ChannelDeleteView.as_view(), name='channel-delete'),
    path('channel/<uuid:channel_id>/posts/', InsideCollectivePostsView.as_view(), name='collective-posts'),

    # Member management
    path('<uuid:collective_id>/members/', CollectiveMembersListView.as_view(), name='collective-members-list'),
    path('members/active-counts/', BulkActiveMembersCountView.as_view(), name='bulk-active-members-count'),
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
    
    # Join request system
    path('<uuid:collective_id>/join/request/', JoinRequestCreateView.as_view(), name='join-request-create'),
    path('<uuid:collective_id>/join/requests/', JoinRequestListView.as_view(), name='join-requests-list'),
    path('join/requests/<uuid:request_id>/process/', AcceptJoinRequestView.as_view(), name='join-request-process'),
    path('join/requests/<uuid:request_id>/cancel/', CancelJoinRequestView.as_view(), name='join-request-cancel'),
    path('join/requests/me/', MyJoinRequestsView.as_view(), name='my-join-requests'),
    path('join/requests/bulk/', BulkPendingJoinRequestsView.as_view(), name='bulk-pending-join-requests'),
    
    # Dashboard API endpoints
    path(
        "dashboard/collective/collectives/counts/",
        CollectiveCountsAPIView.as_view(),
        name="dashboard-collective-collectives-counts",
    ),
    path(
        "dashboard/collective/collectives/growth/",
        CollectiveGrowthAPIView.as_view(),
        name="dashboard-collective-collectives-growth",
    ),
    path(
        "dashboard/collective/collectives/types/",
        CollectiveTypesAPIView.as_view(),
        name="dashboard-collective-collectives-types",
    ),
    path(
        "dashboard/collective/channels/counts/",
        ChannelCountsAPIView.as_view(),
        name="dashboard-collective-channels-counts",
    ),
    path(
        "dashboard/collective/channels/growth/",
        ChannelGrowthAPIView.as_view(),
        name="dashboard-collective-channels-growth",
    ),
    path(
        "dashboard/collective/channels/per-collective/",
        ChannelsPerCollectiveAPIView.as_view(),
        name="dashboard-collective-channels-per-collective",
    ),
]
