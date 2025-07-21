from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import LoginView, LogoutView, CurrentUserView

urlpatterns = [
    path('auth/login/', LoginView.as_view(), name='core-login'),
    path('auth/logout/', LogoutView.as_view(), name='core-logout'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', CurrentUserView.as_view(), name='current-user'),
]