"""
URL patterns for search endpoints.
"""
from django.urls import path

from .views import (
    GlobalSearchView,
    RecentSearchHistoryView,
    SearchCollectivesView,
    SearchGalleriesView,
    SearchHistoryView,
    SearchPostsView,
    SearchUsersView,
)

urlpatterns = [
    path('', GlobalSearchView.as_view(), name='global-search'),
    path('users/', SearchUsersView.as_view(), name='search-users'),
    path('posts/', SearchPostsView.as_view(), name='search-posts'),
    path('collectives/', SearchCollectivesView.as_view(), name='search-collectives'),
    path('galleries/', SearchGalleriesView.as_view(), name='search-galleries'),
    path('history/', SearchHistoryView.as_view(), name='search-history'),
    path('history/recent/', RecentSearchHistoryView.as_view(), name='recent-search-history'),
]

