from django.urls import path

from .views import (
    AcceptFriendRequestView,
    BlockUserView,
    BrushDripMyTransactionsView,
    BrushDripTransactionCreateView,
    BrushDripTransactionDetailView,
    BrushDripTransactionListView,
    BrushDripTransactionStatsView,
    BrushDripWalletDetailView,
    BrushDripWalletRetrieveView,
    CookieTokenRefreshView,
    CreateFriendRequestView,
    FellowsListView,
    FriendRequestCountView,
    GetCSRFTokenView,
    LoginView,
    LogoutView,
    PendingFriendRequestsListView,
    ProfileRetrieveUpdateView,
    RejectFriendRequestView,
    RegistrationView,
    SearchFellowsView,
    UnfriendView,
    UserFellowsListView,
    UserInfoView,
    UserProfileByUsernameView,
    UserSummaryView,
)

urlpatterns = [
    # Authentication endpoints
    path("auth/csrf/", GetCSRFTokenView.as_view(), name="get-csrf-token"),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path(
        "auth/token/refresh/",
        CookieTokenRefreshView.as_view(),
        name="auth-token_refresh",
    ),
    path("auth/me/", UserInfoView.as_view(), name="auth-current_user"),
    path("auth/register/", RegistrationView.as_view(), name="auth-register"),
    # Profile endpoints
    path(
        "profile/get/<int:id>/",
        ProfileRetrieveUpdateView.as_view(),
        name="profile-retrieve",
    ),
    path(
        "profile/update/<int:id>/",
        ProfileRetrieveUpdateView.as_view(),
        name="profile-update",
    ),
    path(
        "profile/by-username/<str:username>/",
        UserProfileByUsernameView.as_view(),
        name="profile-by-username",
    ),
    path(
        "user/<int:user_id>/summary/",
        UserSummaryView.as_view(),
        name="user-summary",
    ),
    # Brush Drip Wallet endpoints
    path(
        "brushdrips/wallet/",
        BrushDripWalletRetrieveView.as_view(),
        name="brushdrip-wallet",
    ),
    path(
        "brushdrips/wallet/<int:user_id>/",
        BrushDripWalletDetailView.as_view(),
        name="brushdrip-wallet-detail",
    ),
    # Brush Drip Transaction endpoints
    path(
        "brushdrips/transactions/",
        BrushDripTransactionListView.as_view(),
        name="brushdrip-transaction-list",
    ),
    path(
        "brushdrips/transactions/my/",
        BrushDripMyTransactionsView.as_view(),
        name="brushdrip-my-transactions",
    ),
    path(
        "brushdrips/transactions/create/",
        BrushDripTransactionCreateView.as_view(),
        name="brushdrip-transaction-create",
    ),
    path(
        "brushdrips/transactions/<uuid:drip_id>/",
        BrushDripTransactionDetailView.as_view(),
        name="brushdrip-transaction-detail",
    ),
    path(
        "brushdrips/transactions/stats/",
        BrushDripTransactionStatsView.as_view(),
        name="brushdrip-transaction-stats",
    ),
    # Fellows (Friends) endpoints
    path(
        "fellows/requests/count/",
        FriendRequestCountView.as_view(),
        name="fellow-request-count",
    ),
    path(
        "fellows/requests/",
        PendingFriendRequestsListView.as_view(),
        name="pending-friend-requests-list",
    ),
    path(
        "fellows/requests/<int:id>/accept/",
        AcceptFriendRequestView.as_view(),
        name="accept-friend-request",
    ),
    path(
        "fellows/requests/<int:id>/reject/",
        RejectFriendRequestView.as_view(),
        name="reject-friend-request",
    ),
    path(
        "fellows/",
        FellowsListView.as_view(),
        name="fellows-list",
    ),
    path(
        "user/<int:user_id>/fellows/",
        UserFellowsListView.as_view(),
        name="user-fellows-list",
    ),
    path(
        "fellows/search/",
        SearchFellowsView.as_view(),
        name="search-fellows",
    ),
    path(
        "fellows/request/",
        CreateFriendRequestView.as_view(),
        name="create-friend-request",
    ),
    path(
        "fellows/<int:id>/",
        UnfriendView.as_view(),
        name="unfriend",
    ),
    path(
        "fellows/<int:id>/block/",
        BlockUserView.as_view(),
        name="block-user",
    ),
]
