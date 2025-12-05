"""
Global search views for searching across users, posts, collectives, and galleries.
"""
from django.db.models import Q
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from collective.models import Collective
from core.models import User
from gallery.models import Gallery
from post.models import Post

from .models import UserSearchHistory
from .pagination import SearchPagination
from .serializers import (
    CollectiveSearchSerializer,
    GallerySearchSerializer,
    PostSearchSerializer,
    UserSearchHistorySerializer,
    UserSearchSerializer,
)


def save_search_history(user, query, search_type, result_counts, is_successful):
    """Save search to user's search history"""
    if user and user.is_authenticated and len(query) >= 2:
        total_count = sum(result_counts.values())
        UserSearchHistory.objects.create(
            user=user,
            query=query,
            search_type=search_type,
            result_count=total_count,
            is_successful=is_successful
        )


@extend_schema(
    tags=["Search"],
    description="Unified search across all types (users, posts, collectives, galleries)",
    parameters=[
        OpenApiParameter(
            name="q",
            description="Search query string",
            type=str,
            required=True,
        ),
        OpenApiParameter(
            name="type",
            description="Filter by type (users, posts, collectives, galleries, all)",
            type=str,
            required=False,
        ),
        OpenApiParameter(
            name="limit",
            description="Results per type (default: 10)",
            type=int,
            required=False,
        ),
    ],
    responses={
        200: "Search results",
        400: "Bad Request",
    },
)
class GlobalSearchView(APIView):
    """
    Unified search endpoint that searches across all content types.
    Returns results grouped by type.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        search_type = request.query_params.get('type', 'all').lower()
        limit = int(request.query_params.get('limit', 10))

        if not query or len(query) < 2:
            return Response({
                'query': query,
                'results': {
                    'users': {'count': 0, 'items': []},
                    'posts': {'count': 0, 'items': []},
                    'collectives': {'count': 0, 'items': []},
                    'galleries': {'count': 0, 'items': []},
                },
                'total_count': 0
            }, status=status.HTTP_200_OK)

        results = {}
        result_counts = {}

        # Search Users
        if search_type in ('all', 'users'):
            users_queryset = User.objects.filter(
                Q(username__icontains=query) |
                Q(first_name__icontains=query) |
                Q(last_name__icontains=query) |
                Q(email__icontains=query)
            ).exclude(is_deleted=True)
            total_users_count = users_queryset.count()
            users = users_queryset[:limit]
            user_serializer = UserSearchSerializer(users, many=True)
            results['users'] = {
                'count': total_users_count,
                'items': user_serializer.data
            }
            result_counts['users'] = total_users_count
        else:
            results['users'] = {'count': 0, 'items': []}
            result_counts['users'] = 0

        # Search Posts
        if search_type in ('all', 'posts'):
            posts_queryset = Post.objects.filter(
                Q(description__icontains=query)
            ).exclude(is_deleted=True)
            total_posts_count = posts_queryset.count()
            posts = posts_queryset.select_related('author')[:limit]
            post_serializer = PostSearchSerializer(posts, many=True)
            results['posts'] = {
                'count': total_posts_count,
                'items': post_serializer.data
            }
            result_counts['posts'] = total_posts_count
        else:
            results['posts'] = {'count': 0, 'items': []}
            result_counts['posts'] = 0

        # Search Collectives
        if search_type in ('all', 'collectives'):
            collectives_queryset = Collective.objects.filter(
                Q(title__icontains=query) |
                Q(description__icontains=query)
            )
            total_collectives_count = collectives_queryset.count()
            collectives = collectives_queryset.prefetch_related('collective_member')[:limit]
            collective_serializer = CollectiveSearchSerializer(collectives, many=True)
            results['collectives'] = {
                'count': total_collectives_count,
                'items': collective_serializer.data
            }
            result_counts['collectives'] = total_collectives_count
        else:
            results['collectives'] = {'count': 0, 'items': []}
            result_counts['collectives'] = 0

        # Search Galleries
        if search_type in ('all', 'galleries'):
            galleries_queryset = Gallery.objects.get_active_objects().filter(
                Q(title__icontains=query) |
                Q(description__icontains=query)
            )
            total_galleries_count = galleries_queryset.count()
            galleries = galleries_queryset.select_related('creator')[:limit]
            gallery_serializer = GallerySearchSerializer(galleries, many=True)
            results['galleries'] = {
                'count': total_galleries_count,
                'items': gallery_serializer.data
            }
            result_counts['galleries'] = total_galleries_count
        else:
            results['galleries'] = {'count': 0, 'items': []}
            result_counts['galleries'] = 0

        total_count = sum(result_counts.values())
        is_successful = total_count > 0

        # Save search history if user is authenticated
        save_search_history(request.user, query, search_type, result_counts, is_successful)

        return Response({
            'query': query,
            'results': results,
            'total_count': total_count
        }, status=status.HTTP_200_OK)


@extend_schema(
    tags=["Search"],
    description="Search users only",
    parameters=[
        OpenApiParameter(
            name="q",
            description="Search query string",
            type=str,
            required=True,
        ),
        OpenApiParameter(
            name="page",
            description="Page number (default: 1)",
            type=int,
            required=False,
        ),
        OpenApiParameter(
            name="page_size",
            description="Number of results per page (default: 10, max: 50)",
            type=int,
            required=False,
        ),
    ],
)
class SearchUsersView(APIView):
    """Search users only"""
    permission_classes = [AllowAny]
    pagination_class = SearchPagination

    def get(self, request):
        query = request.query_params.get('q', '').strip()

        if not query or len(query) < 2:
            paginator = self.pagination_class()
            return paginator.get_paginated_response([])

        users_queryset = User.objects.filter(
            Q(username__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query) |
            Q(email__icontains=query)
        ).exclude(is_deleted=True).order_by('-id')

        paginator = self.pagination_class()
        paginated_users = paginator.paginate_queryset(users_queryset, request)
        serializer = UserSearchSerializer(paginated_users, many=True)

        # Save search history
        paginated_response = paginator.get_paginated_response(serializer.data)
        result_count = paginated_response.data.get('count', 0)

        save_search_history(
            request.user,
            query,
            'users',
            {'users': result_count},
            result_count > 0
        )

        return paginated_response


@extend_schema(
    tags=["Search"],
    description="Search posts only",
    parameters=[
        OpenApiParameter(
            name="q",
            description="Search query string",
            type=str,
            required=True,
        ),
        OpenApiParameter(
            name="page",
            description="Page number (default: 1)",
            type=int,
            required=False,
        ),
        OpenApiParameter(
            name="page_size",
            description="Number of results per page (default: 10, max: 50)",
            type=int,
            required=False,
        ),
    ],
)
class SearchPostsView(APIView):
    """Search posts only"""
    permission_classes = [AllowAny]
    pagination_class = SearchPagination

    def get(self, request):
        query = request.query_params.get('q', '').strip()

        if not query or len(query) < 2:
            paginator = self.pagination_class()
            return paginator.get_paginated_response([])

        posts_queryset = Post.objects.filter(
            Q(description__icontains=query)
        ).exclude(is_deleted=True).select_related('author').order_by('-created_at')

        paginator = self.pagination_class()
        paginated_posts = paginator.paginate_queryset(posts_queryset, request)
        serializer = PostSearchSerializer(paginated_posts, many=True)

        # Save search history
        paginated_response = paginator.get_paginated_response(serializer.data)
        result_count = paginated_response.data.get('count', 0)

        save_search_history(
            request.user,
            query,
            'posts',
            {'posts': result_count},
            result_count > 0
        )

        return paginated_response


@extend_schema(
    tags=["Search"],
    description="Search collectives only",
    parameters=[
        OpenApiParameter(
            name="q",
            description="Search query string",
            type=str,
            required=True,
        ),
        OpenApiParameter(
            name="page",
            description="Page number (default: 1)",
            type=int,
            required=False,
        ),
        OpenApiParameter(
            name="page_size",
            description="Number of results per page (default: 10, max: 50)",
            type=int,
            required=False,
        ),
    ],
)
class SearchCollectivesView(APIView):
    """Search collectives only"""
    permission_classes = [AllowAny]
    pagination_class = SearchPagination

    def get(self, request):
        query = request.query_params.get('q', '').strip()

        if not query or len(query) < 2:
            paginator = self.pagination_class()
            return paginator.get_paginated_response([])

        collectives_queryset = Collective.objects.filter(
            Q(title__icontains=query) |
            Q(description__icontains=query)
        ).prefetch_related('collective_member').order_by('-created_at')

        paginator = self.pagination_class()
        paginated_collectives = paginator.paginate_queryset(collectives_queryset, request)
        serializer = CollectiveSearchSerializer(paginated_collectives, many=True)

        # Save search history
        paginated_response = paginator.get_paginated_response(serializer.data)
        result_count = paginated_response.data.get('count', 0)

        save_search_history(
            request.user,
            query,
            'collectives',
            {'collectives': result_count},
            result_count > 0
        )

        return paginated_response


@extend_schema(
    tags=["Search"],
    description="Search galleries only",
    parameters=[
        OpenApiParameter(
            name="q",
            description="Search query string",
            type=str,
            required=True,
        ),
        OpenApiParameter(
            name="page",
            description="Page number (default: 1)",
            type=int,
            required=False,
        ),
        OpenApiParameter(
            name="page_size",
            description="Number of results per page (default: 10, max: 50)",
            type=int,
            required=False,
        ),
    ],
)
class SearchGalleriesView(APIView):
    """Search galleries only"""
    permission_classes = [AllowAny]
    pagination_class = SearchPagination

    def get(self, request):
        query = request.query_params.get('q', '').strip()

        if not query or len(query) < 2:
            paginator = self.pagination_class()
            return paginator.get_paginated_response([])

        galleries_queryset = Gallery.objects.get_active_objects().filter(
            Q(title__icontains=query) |
            Q(description__icontains=query)
        ).select_related('creator').order_by('-created_at')

        paginator = self.pagination_class()
        paginated_galleries = paginator.paginate_queryset(galleries_queryset, request)
        serializer = GallerySearchSerializer(paginated_galleries, many=True)

        # Save search history
        paginated_response = paginator.get_paginated_response(serializer.data)
        result_count = paginated_response.data.get('count', 0)

        save_search_history(
            request.user,
            query,
            'galleries',
            {'galleries': result_count},
            result_count > 0
        )

        return paginated_response


@extend_schema(
    tags=["Search"],
    description="Get user's search history",
    parameters=[
        OpenApiParameter(
            name="limit",
            description="Number of recent searches (default: 10, max: 50)",
            type=int,
            required=False,
        ),
        OpenApiParameter(
            name="search_type",
            description="Filter by search type",
            type=str,
            required=False,
        ),
    ],
)
class SearchHistoryView(APIView):
    """Get user's search history"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        limit = int(request.query_params.get('limit', 10))
        search_type = request.query_params.get('search_type', None)

        # Cap limit at 50
        limit = min(limit, 50)

        queryset = UserSearchHistory.objects.filter(user=request.user)

        if search_type:
            queryset = queryset.filter(search_type=search_type)

        history = queryset.order_by('-created_at')[:limit]
        serializer = UserSearchHistorySerializer(history, many=True)

        return Response({
            'results': serializer.data,
            'count': len(serializer.data)
        }, status=status.HTTP_200_OK)


@extend_schema(
    tags=["Search"],
    description="Get user's recent search history (5 most recent, no duplicates)",
    responses={
        200: UserSearchHistorySerializer(many=True),
        401: OpenApiResponse(description="Unauthorized"),
    },
)
class RecentSearchHistoryView(APIView):
    """Get user's recent search history using model's get_recent_searches method (no duplicates)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        history = UserSearchHistory.get_recent_searches(request.user, limit=5)
        serializer = UserSearchHistorySerializer(history, many=True)

        return Response({
            'results': serializer.data,
            'count': len(serializer.data)
        }, status=status.HTTP_200_OK)
