"""
URL patterns for search endpoints.
"""
from django.urls import path

from .views import (
    global_search_view,
    recent_search_history_view,
    search_collectives_view,
    search_galleries_view,
    search_history_view,
    search_posts_view,
    search_users_view,
)

urlpatterns = [
    path('', global_search_view, name='global-search'),
    path('users/', search_users_view, name='search-users'),
    path('posts/', search_posts_view, name='search-posts'),
    path('collectives/', search_collectives_view, name='search-collectives'),
    path('galleries/', search_galleries_view, name='search-galleries'),
    path('history/', search_history_view, name='search-history'),
    path('history/recent/', recent_search_history_view, name='recent-search-history'),
]

