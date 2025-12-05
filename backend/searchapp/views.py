"""
Global search views for searching across users, posts, collectives, and galleries.
"""
from django.db.models import Q
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from collective.models import Collective
from core.models import User
from gallery.models import Gallery
from post.models import Post

from .models import UserSearchHistory
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
@api_view(['GET'])
@permission_classes([AllowAny])
def global_search_view(request):
    """
    Unified search endpoint that searches across all content types.
    Returns results grouped by type.
    """
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
        users = User.objects.filter(
            Q(username__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query) |
            Q(email__icontains=query)
        ).exclude(is_deleted=True)[:limit]
        user_serializer = UserSearchSerializer(users, many=True)
        results['users'] = {
            'count': len(user_serializer.data),
            'items': user_serializer.data
        }
        result_counts['users'] = len(user_serializer.data)
    else:
        results['users'] = {'count': 0, 'items': []}
        result_counts['users'] = 0

    # Search Posts
    if search_type in ('all', 'posts'):
        posts = Post.objects.filter(
            Q(description__icontains=query)
        ).exclude(is_deleted=True).select_related('author')[:limit]
        post_serializer = PostSearchSerializer(posts, many=True)
        results['posts'] = {
            'count': len(post_serializer.data),
            'items': post_serializer.data
        }
        result_counts['posts'] = len(post_serializer.data)
    else:
        results['posts'] = {'count': 0, 'items': []}
        result_counts['posts'] = 0

    # Search Collectives
    if search_type in ('all', 'collectives'):
        collectives = Collective.objects.filter(
            Q(title__icontains=query) |
            Q(description__icontains=query)
        ).prefetch_related('collective_member')[:limit]
        collective_serializer = CollectiveSearchSerializer(collectives, many=True)
        results['collectives'] = {
            'count': len(collective_serializer.data),
            'items': collective_serializer.data
        }
        result_counts['collectives'] = len(collective_serializer.data)
    else:
        results['collectives'] = {'count': 0, 'items': []}
        result_counts['collectives'] = 0

    # Search Galleries
    if search_type in ('all', 'galleries'):
        galleries = Gallery.objects.get_active_objects().filter(
            Q(title__icontains=query) |
            Q(description__icontains=query)
        ).select_related('creator')[:limit]
        gallery_serializer = GallerySearchSerializer(galleries, many=True)
        results['galleries'] = {
            'count': len(gallery_serializer.data),
            'items': gallery_serializer.data
        }
        result_counts['galleries'] = len(gallery_serializer.data)
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
            name="limit",
            description="Number of results (default: 10)",
            type=int,
            required=False,
        ),
    ],
)
@api_view(['GET'])
@permission_classes([AllowAny])
def search_users_view(request):
    """Search users only"""
    query = request.query_params.get('q', '').strip()
    limit = int(request.query_params.get('limit', 10))

    if not query or len(query) < 2:
        return Response({
            'results': [],
            'count': 0
        }, status=status.HTTP_200_OK)

    users = User.objects.filter(
        Q(username__icontains=query) |
        Q(first_name__icontains=query) |
        Q(last_name__icontains=query) |
        Q(email__icontains=query)
    ).exclude(is_deleted=True)[:limit]

    serializer = UserSearchSerializer(users, many=True)
    result_count = len(serializer.data)

    # Save search history
    save_search_history(
        request.user,
        query,
        'users',
        {'users': result_count},
        result_count > 0
    )

    return Response({
        'results': serializer.data,
        'count': result_count
    }, status=status.HTTP_200_OK)


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
            name="limit",
            description="Number of results (default: 10)",
            type=int,
            required=False,
        ),
    ],
)
@api_view(['GET'])
@permission_classes([AllowAny])
def search_posts_view(request):
    """Search posts only"""
    query = request.query_params.get('q', '').strip()
    limit = int(request.query_params.get('limit', 10))

    if not query or len(query) < 2:
        return Response({
            'results': [],
            'count': 0
        }, status=status.HTTP_200_OK)

    posts = Post.objects.filter(
        Q(description__icontains=query)
    ).exclude(is_deleted=True).select_related('author')[:limit]

    serializer = PostSearchSerializer(posts, many=True)
    result_count = len(serializer.data)

    # Save search history
    save_search_history(
        request.user,
        query,
        'posts',
        {'posts': result_count},
        result_count > 0
    )

    return Response({
        'results': serializer.data,
        'count': result_count
    }, status=status.HTTP_200_OK)


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
            name="limit",
            description="Number of results (default: 10)",
            type=int,
            required=False,
        ),
    ],
)
@api_view(['GET'])
@permission_classes([AllowAny])
def search_collectives_view(request):
    """Search collectives only"""
    query = request.query_params.get('q', '').strip()
    limit = int(request.query_params.get('limit', 10))

    if not query or len(query) < 2:
        return Response({
            'results': [],
            'count': 0
        }, status=status.HTTP_200_OK)

    collectives = Collective.objects.filter(
        Q(title__icontains=query) |
        Q(description__icontains=query)
    ).prefetch_related('collective_member')[:limit]

    serializer = CollectiveSearchSerializer(collectives, many=True)
    result_count = len(serializer.data)

    # Save search history
    save_search_history(
        request.user,
        query,
        'collectives',
        {'collectives': result_count},
        result_count > 0
    )

    return Response({
        'results': serializer.data,
        'count': result_count
    }, status=status.HTTP_200_OK)


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
            name="limit",
            description="Number of results (default: 10)",
            type=int,
            required=False,
        ),
    ],
)
@api_view(['GET'])
@permission_classes([AllowAny])
def search_galleries_view(request):
    """Search galleries only"""
    query = request.query_params.get('q', '').strip()
    limit = int(request.query_params.get('limit', 10))

    if not query or len(query) < 2:
        return Response({
            'results': [],
            'count': 0
        }, status=status.HTTP_200_OK)

    galleries = Gallery.objects.get_active_objects().filter(
        Q(title__icontains=query) |
        Q(description__icontains=query)
    ).select_related('creator')[:limit]

    serializer = GallerySearchSerializer(galleries, many=True)
    result_count = len(serializer.data)

    # Save search history
    save_search_history(
        request.user,
        query,
        'galleries',
        {'galleries': result_count},
        result_count > 0
    )

    return Response({
        'results': serializer.data,
        'count': result_count
    }, status=status.HTTP_200_OK)


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
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_history_view(request):
    """Get user's search history"""
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
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recent_search_history_view(request):
    """Get user's recent search history using model's get_recent_searches method (no duplicates)"""
    history = UserSearchHistory.get_recent_searches(request.user, limit=5)
    serializer = UserSearchHistorySerializer(history, many=True)

    return Response({
        'results': serializer.data,
        'count': len(serializer.data)
    }, status=status.HTTP_200_OK)
