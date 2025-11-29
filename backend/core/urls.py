from django.urls import path

from .views import (
    BrushDripMyTransactionsView,
    BrushDripTransactionCreateView,
    BrushDripTransactionDetailView,
    BrushDripTransactionListView,
    BrushDripTransactionStatsView,
    BrushDripWalletDetailView,
    BrushDripWalletRetrieveView,
    CookieTokenRefreshView,
    GetCSRFTokenView,
    LoginView,
    LogoutView,
    ProfileRetrieveUpdateView,
    RegistrationView,
    UserInfoView,
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
]
