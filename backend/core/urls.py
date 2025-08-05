from django.urls import path
from .views import LoginView, LogoutView, UserInfoView, CookieTokenRefreshView

urlpatterns = [
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('auth/token/refresh/', CookieTokenRefreshView.as_view(), name='auth-token_refresh'),
    path('auth/me/', UserInfoView.as_view(), name='auth-current_user'),
]