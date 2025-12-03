"""
Reputation System Views
"""
from django.core.cache import cache
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.generics import RetrieveAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User
from .reputation import LEADERBOARD_CACHE_KEY, LEADERBOARD_CACHE_TTL, get_user_reputation_history
from .serializers import (
    ReputationHistorySerializer,
    ReputationLeaderboardEntrySerializer,
    ReputationSerializer,
)


class UserReputationView(RetrieveAPIView):
    """
    Get reputation for a specific user.
    GET /api/core/users/{id}/reputation/
    """
    queryset = User.objects.filter(is_deleted=False)
    serializer_class = ReputationSerializer
    permission_classes = [AllowAny]

    def retrieve(self, request, *args, **kwargs):
        user = self.get_object()
        serializer = self.get_serializer({
            'user_id': user.id,
            'username': user.username,
            'reputation': user.reputation,
        })
        return Response(serializer.data)


class UserReputationHistoryView(generics.ListAPIView):
    """
    Get reputation history for a specific user.
    GET /api/core/users/{id}/reputation/history/?limit=50&offset=0
    """
    serializer_class = ReputationHistorySerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        user_id = self.kwargs.get('user_id')
        user = get_object_or_404(User, pk=user_id, is_deleted=False)
        
        limit = int(self.request.query_params.get('limit', 50))
        offset = int(self.request.query_params.get('offset', 0))
        
        # Limit max to 100
        limit = min(limit, 100)
        
        return get_user_reputation_history(user, limit=limit, offset=offset)


class ReputationLeaderboardView(generics.ListAPIView):
    """
    Get reputation leaderboard.
    GET /api/core/reputation/leaderboard/?limit=25&offset=0
    """
    serializer_class = ReputationLeaderboardEntrySerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        limit = int(self.request.query_params.get('limit', 25))
        offset = int(self.request.query_params.get('offset', 0))
        
        # Limit max to 100
        limit = min(limit, 100)
        
        # Try cache first
        cache_key = f'{LEADERBOARD_CACHE_KEY}:limit_{limit}:offset_{offset}'
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return cached_data
        
        # Query users ordered by reputation
        queryset = User.objects.filter(
            is_deleted=False
        ).select_related('artist').order_by('-reputation', 'id')[offset:offset + limit]
        
        # Add rank to each user
        for index, user in enumerate(queryset):
            user._rank = offset + index + 1
        
        # Cache the queryset
        cache.set(cache_key, queryset, LEADERBOARD_CACHE_TTL)
        
        return queryset


class MyLeaderboardPositionView(APIView):
    """
    Get current user's leaderboard position and surrounding users.
    GET /api/core/reputation/leaderboard/me/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # Get user's rank
        rank = User.objects.filter(
            is_deleted=False,
            reputation__gt=user.reputation
        ).count() + 1
        
        # Get users with same reputation (for tie-breaking)
        same_reputation_count = User.objects.filter(
            is_deleted=False,
            reputation=user.reputation,
            id__lt=user.id
        ).count()
        
        # Adjust rank for tie-breaking
        rank += same_reputation_count
        
        # Get surrounding users (±5 positions)
        # Calculate offset
        offset = max(0, rank - 6)
        limit = 11  # 5 before + user + 5 after
        
        surrounding_users = User.objects.filter(
            is_deleted=False
        ).select_related('artist').order_by('-reputation', 'id')[offset:offset + limit]
        
        # Add rank to each user
        for index, user_obj in enumerate(surrounding_users):
            user_obj._rank = offset + index + 1
        
        serializer = ReputationLeaderboardEntrySerializer(surrounding_users, many=True)
        
        return Response({
            'rank': rank,
            'reputation': user.reputation,
            'surrounding_users': serializer.data,
        })

