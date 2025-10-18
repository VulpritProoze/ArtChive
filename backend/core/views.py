from django.shortcuts import render
from django.conf import settings
from django.contrib.auth import authenticate
from django.core.files.storage import default_storage
from django.db.models import Q, Sum, Count
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.generics import RetrieveAPIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.exceptions import TokenError, ExpiredTokenError
from rest_framework.throttling import ScopedRateThrottle
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiExample, OpenApiParameter
from .serializers import (
    UserSerializer, LoginSerializer, RegistrationSerializer, ProfileViewUpdateSerializer,
    BrushDripWalletSerializer, BrushDripTransactionListSerializer,
    BrushDripTransactionDetailSerializer, BrushDripTransactionCreateSerializer,
    BrushDripTransactionStatsSerializer
)
from .models import User, BrushDripWallet, BrushDripTransaction
from decouple import config
import os

@extend_schema(
    tags=['Authentication'],
    description="Authenticate user and set JWT cookies",
    examples=[
        OpenApiExample(
            'Example Request',
            value={'email': 'user@example.com', 'password': 'string'},
            request_only=True
        ),
        OpenApiExample(
            'Example Response',
            value={'user': {'id': 1, 'email': 'user@example.com'}},
            response_only=True
        )
    ],
    responses={
        200: OpenApiResponse(
            description='Login successful',
            response=UserSerializer
        ),
        400: OpenApiResponse(description='Invalid credentials'),
        429: OpenApiResponse(description='Too many requests')
    }
)
class LoginView(APIView):
    throttle_scope = 'login'
    throttle_classes = [ScopedRateThrottle]
    serializer_class = LoginSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)

        if serializer.is_valid():
            user = serializer.validated_data
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            response = Response({'user': UserSerializer(user).data}, status=status.HTTP_200_OK)
            response.set_cookie(
                key='access_token',
                value=str(refresh.access_token),
                httponly=True,
                secure=config('AUTH_COOKIE_SECURE', default=False),
                samesite='None'
            )
            response.set_cookie(
                key='refresh_token',
                value=str(refresh),
                httponly=True,
                secure=config('AUTH_COOKIE_SECURE'),
                samesite='None'
            )
            return response
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@extend_schema(
    tags=['Authentication'],
    description="Logout user by clearing cookies",
    responses={
        200: OpenApiResponse(description='Logout successful'),
        400: OpenApiResponse(description='Invalid token')
    }
)
class LogoutView(APIView):
    serializer_class = None
    permission_classes = [AllowAny]
    authentication_classes = [] # Disable any auth classes to make sure anybody can log out. Will have to tweak sometime to put this check to login

    def post(self, request):
        refresh_token = request.COOKIES.get('refresh_token')
        if refresh_token:
            try:
                refresh = RefreshToken(refresh_token)
                refresh.blacklist()
            except Exception as e:
                return Response({'error': f'Error invalidating refresh token {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
        response = Response({'message': 'Successfully logged out'}, status=status.HTTP_200_OK)
        response.delete_cookie('access_token')
        response.delete_cookie('refresh_token')

        return response

@extend_schema(
    tags=['Authentication'],
    description="Refresh access token using refresh token cookie",
    responses={
        200: OpenApiResponse(description='Token refreshed'),
        401: OpenApiResponse(description='Invalid or expired refresh token')
    },
)
class CookieTokenRefreshView(TokenRefreshView):
    def post(self, request):
        refresh_token = request.COOKIES.get('refresh_token')

        if not refresh_token:
            return Response({'error': 'Refresh token not provided'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            refresh = RefreshToken(refresh_token)
            access_token = str(refresh.access_token)
            response = Response({'message': 'Access token refreshed successfully'}, status=status.HTTP_200_OK)
            response.set_cookie(
                key='access_token',
                value=access_token,
                httponly=True,
                secure=config('AUTH_COOKIE_SECURE'),
                samesite='None'
            )
            return response
        except ExpiredTokenError:
            # Handle expired refresh token - CLEAR COOKIES
            response = Response(
                {'error': 'Refresh token has expired. Please login again.'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
            
            # Clear both cookies
            response.delete_cookie('access_token')
            response.delete_cookie('refresh_token')
            return response
            
        except TokenError as e:
            # Handle other token errors
            response = Response(
                {'error': 'Invalid refresh token'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
            response.delete_cookie('access_token')
            response.delete_cookie('refresh_token')
            return response

@extend_schema(
    tags=['Users'],
    description='Get current authenticated user information',
    responses={
        200: UserSerializer,
        401: OpenApiResponse(description='Unauthorized')
    }
)
class UserInfoView(RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer
    
    def get_object(self):
        return self.request.user

@extend_schema(
    tags=['Authentication'],
    description="Register a new user account",
    examples=[
        OpenApiExample(
            'Example Request',
            value={
                'username': 'azurialequinox',
                'email': 'admin@gmail.com',
                'password': 'asdasdasd',
                'confirmPassword': 'asdasdasd',
                'firstName': '',
                'middleName': '',
                'lastName': '',
                'city': '',
                'country': '',
                'birthday': '',
                'artistTypes': [
                    "visual arts",
                    "digital & new media arts",
                    "environmental art",
                    "music art",
                    "film art"
                ]
            },
            request_only=True
        ),
        OpenApiExample(
            'Example Response',
            value={
                'message': 'User registered successfully',
                'user': {
                    'id': 1,
                    'username': 'azurialequinox',
                    'email': 'admin@gmail.com',
                    'first_name': '',
                    'middle_name': '',
                    'last_name': '',
                    'city': '',
                    'country': '',
                    'birthday': None
                },
                'artist': {
                    'artist_types': [
                        "visual arts",
                        "digital & new media arts",
                        "environmental art",
                        "music art",
                        "film art"
                    ]
                }
            },
            response_only=True
        )
    ],
    responses={
        201: OpenApiResponse(description='User registered successfully'),
        400: OpenApiResponse(description='Invalid input data'),
        500: OpenApiResponse(description='Internal server error')
    }
)
class RegistrationView(APIView):
    def post(self, request):
        serializer = RegistrationSerializer(data=request.data)

        if serializer.is_valid():
            try:
                user = serializer.save()

                # Prepare response data
                response_data = {
                    'message': 'User registered successfully',
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'first_name': user.first_name,
                        'middle_name': user.middle_name,
                        'last_name': user.last_name,
                        'city': user.city,
                        'country': user.country,
                        'birthday': user.birthday
                    },
                    'artist': {
                        'artist_types': user.artist.artist_types
                    }
                }
            
                return Response(response_data, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({ 'error': f'Error creating user: {str(e)}' }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ProfileRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    serializer_class = ProfileViewUpdateSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'

    # Delete old profile picture before updating
    def perform_update(self, serializer):
        instance = self.get_object()
        new_profile_picture = self.request.FILES.get('profilePicture', None)

        if new_profile_picture and instance.profile_picture:
            try:
                # Check if file is in media/profile/images
                profile_images_path = os.path.join(settings.MEDIA_ROOT, 'profile', 'images')
                file_path = instance.profile_picture.path

                if (file_path.startswith(profile_images_path)) and instance.profile_picture.name != 'profile/images/default-pic-min.jpg':
                    if default_storage.exists(instance.profile_picture.name):
                        default_storage.delete(instance.profile_picture.name)

            except Exception as e:
                print(f'Error deleting old profile picture: {e}')

        serializer.save()


# ============================================================================
# BRUSH DRIP TRANSACTION VIEWS
# ============================================================================

@extend_schema(
    tags=['Brush Drips'],
    description='Retrieve authenticated user wallet information',
    responses={
        200: BrushDripWalletSerializer,
        401: OpenApiResponse(description='Unauthorized'),
        404: OpenApiResponse(description='Wallet not found')
    }
)
class BrushDripWalletRetrieveView(generics.RetrieveAPIView):
    """
    GET: Retrieve current user's wallet information
    """
    serializer_class = BrushDripWalletSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        """Get wallet for authenticated user"""
        try:
            return BrushDripWallet.objects.get(user=self.request.user)
        except BrushDripWallet.DoesNotExist:
            return Response(
                {'error': 'Wallet not found for this user'},
                status=status.HTTP_404_NOT_FOUND
            )


@extend_schema(
    tags=['Brush Drips'],
    description='Retrieve any user wallet information by user ID',
    responses={
        200: BrushDripWalletSerializer,
        401: OpenApiResponse(description='Unauthorized'),
        404: OpenApiResponse(description='Wallet not found')
    }
)
class BrushDripWalletDetailView(generics.RetrieveAPIView):
    """
    GET: Retrieve wallet information for specific user
    """
    serializer_class = BrushDripWalletSerializer
    permission_classes = [IsAuthenticated]
    queryset = BrushDripWallet.objects.select_related('user').all()
    lookup_field = 'user_id'


@extend_schema(
    tags=['Brush Drips'],
    description='List all transactions with filtering and pagination',
    parameters=[
        OpenApiParameter(name='user_id', description='Filter by user ID (sent or received)', type=int),
        OpenApiParameter(name='transaction_type', description='Filter by transaction object type', type=str),
        OpenApiParameter(name='sent_only', description='Show only sent transactions', type=bool),
        OpenApiParameter(name='received_only', description='Show only received transactions', type=bool),
    ],
    responses={
        200: BrushDripTransactionListSerializer(many=True),
        401: OpenApiResponse(description='Unauthorized')
    }
)
class BrushDripTransactionListView(generics.ListAPIView):
    """
    GET: List transactions with optional filtering
    Query params:
    - user_id: Filter transactions for specific user (sent or received)
    - transaction_type: Filter by transaction object type
    - sent_only: Only show sent transactions
    - received_only: Only show received transactions
    """
    serializer_class = BrushDripTransactionListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = BrushDripTransaction.objects.select_related(
            'transacted_by', 'transacted_to'
        ).all().order_by('-transacted_at')

        # Filter by user_id (sent or received)
        user_id = self.request.query_params.get('user_id', None)
        if user_id:
            queryset = queryset.filter(
                Q(transacted_by_id=user_id) | Q(transacted_to_id=user_id)
            )

        # Filter by transaction type
        transaction_type = self.request.query_params.get('transaction_type', None)
        if transaction_type:
            queryset = queryset.filter(transaction_object_type=transaction_type)

        # Filter sent only
        sent_only = self.request.query_params.get('sent_only', None)
        if sent_only and sent_only.lower() == 'true':
            queryset = queryset.filter(transacted_by=self.request.user)

        # Filter received only
        received_only = self.request.query_params.get('received_only', None)
        if received_only and received_only.lower() == 'true':
            queryset = queryset.filter(transacted_to=self.request.user)

        return queryset


@extend_schema(
    tags=['Brush Drips'],
    description='Get current user transaction history',
    parameters=[
        OpenApiParameter(name='transaction_type', description='Filter by transaction object type', type=str),
        OpenApiParameter(name='sent_only', description='Show only sent transactions', type=bool),
        OpenApiParameter(name='received_only', description='Show only received transactions', type=bool),
    ],
    responses={
        200: BrushDripTransactionListSerializer(many=True),
        401: OpenApiResponse(description='Unauthorized')
    }
)
class BrushDripMyTransactionsView(generics.ListAPIView):
    """
    GET: List all transactions for authenticated user (sent and received)
    Query params:
    - transaction_type: Filter by transaction object type
    - sent_only: Only show sent transactions (true/false)
    - received_only: Only show received transactions (true/false)
    """
    serializer_class = BrushDripTransactionListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        # Check for sent_only and received_only filters
        sent_only = self.request.query_params.get('sent_only', None)
        received_only = self.request.query_params.get('received_only', None)

        # Build base queryset with appropriate filter
        if sent_only and sent_only.lower() == 'true':
            # Only sent transactions
            queryset = BrushDripTransaction.objects.select_related(
                'transacted_by', 'transacted_to'
            ).filter(transacted_by=user).order_by('-transacted_at')
        elif received_only and received_only.lower() == 'true':
            # Only received transactions
            queryset = BrushDripTransaction.objects.select_related(
                'transacted_by', 'transacted_to'
            ).filter(transacted_to=user).order_by('-transacted_at')
        else:
            # All transactions (sent or received)
            queryset = BrushDripTransaction.objects.select_related(
                'transacted_by', 'transacted_to'
            ).filter(
                Q(transacted_by=user) | Q(transacted_to=user)
            ).order_by('-transacted_at')

        # Optional filter by transaction type
        transaction_type = self.request.query_params.get('transaction_type', None)
        if transaction_type:
            queryset = queryset.filter(transaction_object_type=transaction_type)

        return queryset


@extend_schema(
    tags=['Brush Drips'],
    description='Retrieve detailed transaction information by ID',
    responses={
        200: BrushDripTransactionDetailSerializer,
        401: OpenApiResponse(description='Unauthorized'),
        404: OpenApiResponse(description='Transaction not found')
    }
)
class BrushDripTransactionDetailView(generics.RetrieveAPIView):
    """
    GET: Retrieve detailed transaction information
    """
    serializer_class = BrushDripTransactionDetailSerializer
    permission_classes = [IsAuthenticated]
    queryset = BrushDripTransaction.objects.select_related(
        'transacted_by', 'transacted_to'
    ).all()
    lookup_field = 'drip_id'


@extend_schema(
    tags=['Brush Drips'],
    description='Create a new brush drip transaction',
    request=BrushDripTransactionCreateSerializer,
    responses={
        201: BrushDripTransactionDetailSerializer,
        400: OpenApiResponse(description='Invalid data or insufficient balance'),
        401: OpenApiResponse(description='Unauthorized')
    },
    examples=[
        OpenApiExample(
            'Example Request',
            value={
                'amount': 100,
                'transaction_object_type': 'praise',
                'transaction_object_id': '12345',
                'transacted_by': 1,
                'transacted_to': 2
            },
            request_only=True
        )
    ]
)
class BrushDripTransactionCreateView(APIView):
    """
    POST: Create a new transaction
    Body:
    - amount: Transaction amount (positive integer)
    - transaction_object_type: Type of transaction (praise, brush_gradient, critique)
    - transaction_object_id: ID of related object
    - transacted_to: Receiver user ID
    Note: transacted_by is automatically set to the authenticated user
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = BrushDripTransactionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            # Set transacted_by to current authenticated user
            transaction = serializer.save(transacted_by=request.user)

            # Return detailed transaction info
            detail_serializer = BrushDripTransactionDetailSerializer(transaction)
            return Response(
                detail_serializer.data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {'error': f'Transaction failed: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


@extend_schema(
    tags=['Brush Drips'],
    description='Get transaction statistics for authenticated user',
    responses={
        200: BrushDripTransactionStatsSerializer,
        401: OpenApiResponse(description='Unauthorized')
    }
)
class BrushDripTransactionStatsView(APIView):
    """
    GET: Get transaction statistics for authenticated user
    Returns:
    - total_sent: Total brush drips sent
    - total_received: Total brush drips received
    - net_balance: Difference (received - sent)
    - transaction_count_sent: Number of transactions sent
    - transaction_count_received: Number of transactions received
    - total_transaction_count: Total number of transactions
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Aggregate sent transactions
        sent_stats = BrushDripTransaction.objects.filter(
            transacted_by=user
        ).aggregate(
            total_sent=Sum('amount'),
            count_sent=Count('drip_id')
        )

        # Aggregate received transactions
        received_stats = BrushDripTransaction.objects.filter(
            transacted_to=user
        ).aggregate(
            total_received=Sum('amount'),
            count_received=Count('drip_id')
        )

        # Calculate stats
        total_sent = sent_stats['total_sent'] or 0
        total_received = received_stats['total_received'] or 0
        count_sent = sent_stats['count_sent'] or 0
        count_received = received_stats['count_received'] or 0

        stats = {
            'total_sent': total_sent,
            'total_received': total_received,
            'net_balance': total_received - total_sent,
            'transaction_count_sent': count_sent,
            'transaction_count_received': count_received,
            'total_transaction_count': count_sent + count_received
        }

        serializer = BrushDripTransactionStatsSerializer(stats)
        return Response(serializer.data, status=status.HTTP_200_OK)