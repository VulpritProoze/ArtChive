import logging

from decouple import config
from django.core.cache import cache
from django.core.files.storage import default_storage
from django.db import transaction
from django.db.models import Count, Q, Sum
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from drf_spectacular.utils import (
    OpenApiExample,
    OpenApiParameter,
    OpenApiResponse,
    extend_schema,
)
from rest_framework import generics, status
from rest_framework.generics import RetrieveAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import ExpiredTokenError, TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from common.utils.profiling import silk_profile

from .cache_utils import get_user_info_cache_key
from .models import Artist, BrushDripTransaction, BrushDripWallet, User, UserFellow
from .pagination import BrushDripsTransactionPagination
from .serializers import (
    BrushDripTransactionCreateSerializer,
    BrushDripTransactionDetailSerializer,
    BrushDripTransactionListSerializer,
    BrushDripTransactionStatsSerializer,
    BrushDripWalletSerializer,
    CreateFriendRequestSerializer,
    FriendRequestCountSerializer,
    LoginSerializer,
    ProfileViewUpdateSerializer,
    RegistrationSerializer,
    UserFellowSerializer,
    UserProfilePublicSerializer,
    UserSerializer,
    UserSummarySerializer,
)


@extend_schema(
    tags=["Authentication"],
    description="Authenticate user and set JWT cookies",
    examples=[
        OpenApiExample(
            "Example Request",
            value={"email": "user@example.com", "password": "string"},
            request_only=True,
        ),
        OpenApiExample(
            "Example Response",
            value={"user": {"id": 1, "email": "user@example.com"}},
            response_only=True,
        ),
    ],
    responses={
        200: OpenApiResponse(description="Login successful", response=UserSerializer),
        400: OpenApiResponse(description="Invalid credentials"),
        429: OpenApiResponse(description="Too many requests"),
    },
)
@method_decorator(
    csrf_exempt, name="dispatch"
)  # Exempt login - user doesn't have CSRF token yet
class LoginView(APIView):
    throttle_scope = "login"
    throttle_classes = [ScopedRateThrottle]
    serializer_class = LoginSerializer
    permission_classes = [AllowAny]
    authentication_classes = []  # Don't require JWT for login

    @silk_profile(name="Login API")
    def post(self, request):
        with silk_profile(name="Validate LoginSerializer"):
            serializer = LoginSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        with silk_profile(name="Get user and tokens"):
            user = serializer.validated_data
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)

        with silk_profile(name="Set response"):
            response = Response(
                {"user": UserSerializer(user).data}, status=status.HTTP_200_OK
            )

        with silk_profile(name="Set cookies"):
            cookie_kwargs = {
                "httponly": True,
                "secure": config("AUTH_COOKIE_SECURE", default=False),
                "samesite": "None",
                "path": "/",
            }
            response.set_cookie(key="access_token", value=access_token, **cookie_kwargs)
            response.set_cookie(
                key="refresh_token", value=str(refresh), **cookie_kwargs
            )

        # Ensure CSRF token is set for future authenticated requests
        with silk_profile(name="Set CSRF token"):
            from django.middleware.csrf import get_token

            get_token(request)  # This ensures the csrftoken cookie is set

        with silk_profile(name="Return response"):
            return response


@extend_schema(
    tags=["Authentication"],
    description="Get CSRF token for authenticated requests",
    responses={
        200: OpenApiResponse(
            description="CSRF token returned",
            response={
                "type": "object",
                "properties": {"csrfToken": {"type": "string"}},
            },
        )
    },
)
class GetCSRFTokenView(APIView):
    """
    GET: Returns a CSRF token for use in subsequent authenticated requests.
    This endpoint sets the csrftoken cookie and returns the token value.
    Frontend should call this on app initialization before making authenticated requests.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        from django.middleware.csrf import get_token

        csrf_token = get_token(request)
        return Response({"csrfToken": csrf_token}, status=status.HTTP_200_OK)


@extend_schema(
    tags=["Authentication"],
    description="Logout user by clearing cookies",
    responses={
        200: OpenApiResponse(description="Logout successful"),
        400: OpenApiResponse(description="Invalid token"),
    },
)
class LogoutView(APIView):
    serializer_class = None
    permission_classes = [AllowAny]
    authentication_classes = []  # Disable any auth classes to make sure anybody can log out. Will have to tweak sometime to put this check to login

    @silk_profile(name="Logout API")
    def post(self, request):
        with silk_profile(name="Get token"):
            refresh_token = request.COOKIES.get("refresh_token")

        with silk_profile(name="Validate refresh_token"):
            if refresh_token:
                try:
                    with silk_profile(name="Blacklist token"):
                        refresh = RefreshToken(refresh_token)
                        refresh.blacklist()
                except Exception as e:
                    return Response(
                        {"error": f"Error invalidating refresh token {str(e)}"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            response = Response(
                {"message": "Successfully logged out"}, status=status.HTTP_200_OK
            )
        with silk_profile(name="Delete cookies"):
            # Must match the exact same parameters used when setting cookies
            # Note: delete_cookie() only accepts path, domain, and samesite (not secure/httponly)
            cookie_kwargs = {
                "path": "/",
                "samesite": "None",
            }
            response.delete_cookie("access_token", **cookie_kwargs)
            response.delete_cookie("refresh_token", **cookie_kwargs)

        with silk_profile(name="Return response"):
            return response


@extend_schema(
    tags=["Authentication"],
    description="Refresh access token using refresh token cookie",
    responses={
        200: OpenApiResponse(description="Token refreshed"),
        401: OpenApiResponse(description="Invalid or expired refresh token"),
    },
)
class CookieTokenRefreshView(TokenRefreshView):
    def post(self, request):
        refresh_token = request.COOKIES.get("refresh_token")

        if not refresh_token:
            return Response(
                {"error": "Refresh token not provided"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            # Use the serializer which handles rotation correctly
            # The serializer automatically handles token rotation and returns new tokens
            serializer = self.get_serializer(data={"refresh": refresh_token})
            serializer.is_valid(raise_exception=True)

            # Get tokens from validated_data (handles rotation automatically)
            # If rotation is enabled, 'refresh' will contain the new refresh token
            # If rotation is disabled, 'refresh' will be None or the same token
            validated_data = serializer.validated_data
            new_access_token = validated_data["access"]
            new_refresh_token = validated_data.get("refresh", refresh_token)

            response = Response(
                {"message": "Access token refreshed successfully"},
                status=status.HTTP_200_OK,
            )

            # Cookie settings
            cookie_kwargs = {
                "httponly": True,
                "secure": config("AUTH_COOKIE_SECURE", default=False),
                "samesite": "None",
                "path": "/",
            }

            # Set access token cookie
            response.set_cookie(
                key="access_token", value=new_access_token, **cookie_kwargs
            )

            # Set refresh token cookie (will be new token if rotation enabled, same if disabled)
            response.set_cookie(
                key="refresh_token", value=new_refresh_token, **cookie_kwargs
            )

            return response
        except ExpiredTokenError:
            # Handle expired refresh token - CLEAR COOKIES
            response = Response(
                {"error": "Refresh token has expired. Please login again."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

            # Clear both cookies with matching parameters
            # Note: delete_cookie() only accepts path, domain, and samesite (not secure/httponly)
            cookie_kwargs = {
                "path": "/",
                "samesite": "None",
            }
            response.delete_cookie("access_token", **cookie_kwargs)
            response.delete_cookie("refresh_token", **cookie_kwargs)
            return response

        except TokenError:
            # Handle other token errors
            response = Response(
                {"error": "Invalid refresh token"}, status=status.HTTP_401_UNAUTHORIZED
            )
            # Clear both cookies with matching parameters
            # Note: delete_cookie() only accepts path, domain, and samesite (not secure/httponly)
            cookie_kwargs = {
                "path": "/",
                "samesite": "None",
            }
            response.delete_cookie("access_token", **cookie_kwargs)
            response.delete_cookie("refresh_token", **cookie_kwargs)
            return response


@extend_schema(
    tags=["Users"],
    description="Get current authenticated user information with caching",
    responses={200: UserSerializer, 401: OpenApiResponse(description="Unauthorized")},
)
class UserInfoView(RetrieveAPIView):
    """
    Get authenticated user information.

    Cache is automatically invalidated when user, artist, or wallet data changes.
    Cache TTL: 10 minutes (600 seconds)
    """

    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    @silk_profile(name="User/Me Retrieve (with cache)")
    def retrieve(self, request, *args, **kwargs):
        """Override retrieve to add caching support."""
        user_id = request.user.id
        cache_key = get_user_info_cache_key(user_id)

        # Try to get from cache
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)

        # If not in cache, get from database
        instance = self.get_object()
        serializer = self.get_serializer(instance)

        # Cache the response data for 10 minutes (600 seconds)
        cache.set(cache_key, serializer.data, 600)

        return Response(serializer.data)

    @silk_profile(name="User/Me Get Queryset")
    def get_queryset(self):
        return User.objects.select_related(
            "artist",
            "user_wallet",
        ).prefetch_related(
            "collective_member"  # Prefetch memberships to avoid N+1 query
        ).only(
            # User fields
            "id",
            "email",
            "username",
            "first_name",
            "last_name",
            "profile_picture",
            "is_superuser",
            # artist relation fields (to avoid full fetch)
            "artist__artist_types",
            # user_wallet relation fields
            "user_wallet__balance",
        )

    @silk_profile(name="User/Me Get Object")
    def get_object(self):
        return self.get_queryset().get(pk=self.request.user.pk)


@extend_schema(
    tags=["Users"],
    description="Get user profile by username (public endpoint)",
    responses={
        200: UserProfilePublicSerializer,
        404: OpenApiResponse(description="User not found"),
    },
)
class UserProfileByUsernameView(RetrieveAPIView):
    """
    Get user profile by username.
    Public endpoint - anyone can view any user's profile.
    Returns public profile information including user ID for fetching posts.
    """
    serializer_class = UserProfilePublicSerializer
    lookup_field = "username"
    lookup_url_kwarg = "username"
    permission_classes = [AllowAny]  # Public endpoint

    def get_queryset(self):
        return User.objects.select_related(
            "artist",
        ).prefetch_related(
            "collective_member"
        ).only(
            "id",
            "username",
            "first_name",
            "last_name",
            "profile_picture",
            "artist__artist_types",
        )


@extend_schema(
    tags=["Users"],
    description="Get lightweight user summary by user ID (for hover modals)",
    responses={
        200: UserSummarySerializer,
        404: OpenApiResponse(description="User not found"),
    },
)
class UserSummaryView(RetrieveAPIView):
    """
    Get lightweight user summary by user ID.
    Public endpoint - used for hover modals in post cards.
    Returns basic user info and brush drips count.
    Placeholder for future statistics.
    """
    serializer_class = UserSummarySerializer
    lookup_field = "id"
    lookup_url_kwarg = "user_id"
    permission_classes = [AllowAny]  # Public endpoint

    def get_queryset(self):
        return User.objects.select_related(
            "artist",
            "user_wallet",
        ).only(
            "id",
            "username",
            "first_name",
            "last_name",
            "profile_picture",
            "artist__artist_types",
            "user_wallet__balance",
        )


@extend_schema(
    tags=["Authentication"],
    description="Register a new user account",
    examples=[
        OpenApiExample(
            "Example Request",
            value={
                "username": "azurialequinox",
                "email": "admin@gmail.com",
                "password": "asdasdasd",
                "confirmPassword": "asdasdasd",
                "firstName": "",
                "middleName": "",
                "lastName": "",
                "city": "",
                "country": "",
                "birthday": "",
                "artistTypes": [
                    "visual arts",
                    "digital & new media arts",
                    "environmental art",
                    "music art",
                    "film art",
                ],
            },
            request_only=True,
        ),
        OpenApiExample(
            "Example Response",
            value={
                "message": "User registered successfully",
                "user": {
                    "id": 1,
                    "username": "azurialequinox",
                    "email": "admin@gmail.com",
                    "first_name": "",
                    "middle_name": "",
                    "last_name": "",
                    "city": "",
                    "country": "",
                    "birthday": None,
                },
                "artist": {
                    "artist_types": [
                        "visual arts",
                        "digital & new media arts",
                        "environmental art",
                        "music art",
                        "film art",
                    ]
                },
            },
            response_only=True,
        ),
    ],
    responses={
        201: OpenApiResponse(description="User registered successfully"),
        400: OpenApiResponse(description="Invalid input data"),
        500: OpenApiResponse(description="Internal server error"),
    },
)
@method_decorator(csrf_exempt, name="dispatch")
class RegistrationView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    logger = logging.getLogger(__name__)

    def post(self, request):
        serializer = RegistrationSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        validated_data = serializer.validated_data
        artist_types = validated_data.pop("artistTypes", [])

        try:
            with transaction.atomic():
                # Create user
                try:
                    user = User.objects.create_user(
                        username=validated_data["username"],
                        email=validated_data["email"],
                        password=validated_data["password"],
                        first_name=validated_data.get("firstName", ""),
                        middle_name=validated_data.get("middleName", ""),
                        last_name=validated_data.get("lastName", ""),
                        city=validated_data.get("city", ""),
                        country=validated_data.get("country", ""),
                        birthday=validated_data.get("birthday", None),
                    )
                    self.logger.info(
                        f"User created successfully: {user.email} (ID: {user.id})"
                    )
                except Exception as e:
                    self.logger.error(
                        f"Failed to create user: {str(e)}",
                        exc_info=True,
                        extra={
                            "username": validated_data.get("username"),
                            "email": validated_data.get("email"),
                        },
                    )
                    return Response(
                        {"error": "Failed to create user account", "detail": str(e)},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )

                # Create artist profile
                try:
                    artist, created = Artist.objects.get_or_create(
                        user_id=user, defaults={"artist_types": artist_types}
                    )
                    if not created:
                        # Artist already exists - update it (shouldn't happen in normal flow)
                        self.logger.warning(
                            f"Artist profile already existed for user: {user.email} (ID: {user.id}), updating it",
                            extra={
                                "user_id": user.id,
                                "user_email": user.email,
                                "artist_types": artist_types,
                            },
                        )
                        artist.artist_types = artist_types
                        artist.save()
                    else:
                        self.logger.info(
                            f"Artist profile created successfully for user: {user.email} (ID: {user.id})"
                        )
                except Exception as e:
                    self.logger.error(
                        f"Failed to create artist profile: {str(e)}",
                        exc_info=True,
                        extra={
                            "user_id": user.id,
                            "user_email": user.email,
                            "artist_types": artist_types,
                        },
                    )
                    # User was created but artist failed - transaction will rollback
                    return Response(
                        {"error": "Failed to create artist profile", "detail": str(e)},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )

            # Set CSRF token for future authenticated requests
            from django.middleware.csrf import get_token

            get_token(request)  # Ensures csrftoken cookie is set

            return Response(
                {"message": "User registered successfully"},
                status=status.HTTP_201_CREATED,
            )

        except Exception as e:
            self.logger.error(
                f"Unexpected error during registration: {str(e)}",
                exc_info=True,
                extra={
                    "username": validated_data.get("username"),
                    "email": validated_data.get("email"),
                },
            )
            return Response(
                {
                    "error": "An unexpected error occurred during registration",
                    "detail": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ProfileRetrieveUpdateView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ProfileViewUpdateSerializer

    logger = logging.getLogger(__name__)

    def get_object(self, user_id):
        """Get user object by id, ensuring user can only access their own profile unless superuser."""
        try:
            user = User.objects.get(id=user_id)
            # Users can only access their own profile unless they're a superuser
            if self.request.user.id != user.id and not self.request.user.is_superuser:
                return None
            return user
        except User.DoesNotExist:
            return None

    def get(self, request, id):
        """Retrieve user profile."""
        user = self.get_object(id)
        if not user:
            return Response(
                {"error": "User not found or permission denied"},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ProfileViewUpdateSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def _delete_old_profile_picture(self, instance, new_profile_picture):
        """Helper method to delete old profile picture before updating."""
        if new_profile_picture and instance.profile_picture:
            try:
                # Don't delete default profile picture
                if instance.profile_picture.name == "profile/images/default-pic-min.jpg":
                    return

                # Delete old profile picture using storage backend (works with Cloudinary)
                # Use .name property instead of .path (Cloudinary doesn't support absolute paths)
                if instance.profile_picture.name and default_storage.exists(instance.profile_picture.name):
                    default_storage.delete(instance.profile_picture.name)
            except Exception as e:
                # Log error and raise to return error response
                self.logger.error(
                    f"Failed to delete old profile picture for user {instance.id}: {e}",
                    exc_info=True,
                )
                raise

    def put(self, request, id):
        """Update user profile (full update)."""
        user = self.get_object(id)
        if not user:
            return Response(
                {"error": "User not found or permission denied"},
                status=status.HTTP_404_NOT_FOUND,
            )

        new_profile_picture = request.FILES.get("profilePicture", None)

        # Delete old profile picture before updating
        try:
            self._delete_old_profile_picture(user, new_profile_picture)
        except Exception as e:
            return Response(
                {"error": "Failed to delete old profile picture", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        serializer = ProfileViewUpdateSerializer(
            user, data=request.data, context={'request': request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, id):
        """Update user profile (partial update)."""
        user = self.get_object(id)
        if not user:
            return Response(
                {"error": "User not found or permission denied"},
                status=status.HTTP_404_NOT_FOUND,
            )

        new_profile_picture = request.FILES.get("profilePicture", None)

        # Delete old profile picture before updating
        try:
            self._delete_old_profile_picture(user, new_profile_picture)
        except Exception as e:
            return Response(
                {"error": "Failed to delete old profile picture", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        serializer = ProfileViewUpdateSerializer(
            user, data=request.data, partial=True, context={'request': request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ============================================================================
# BRUSH DRIP TRANSACTION VIEWS
# ============================================================================


@extend_schema(
    tags=["Brush Drips"],
    description="Retrieve authenticated user wallet information",
    responses={
        200: BrushDripWalletSerializer,
        401: OpenApiResponse(description="Unauthorized"),
        404: OpenApiResponse(description="Wallet not found"),
    },
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
                {"error": "Wallet not found for this user"},
                status=status.HTTP_404_NOT_FOUND,
            )


@extend_schema(
    tags=["Brush Drips"],
    description="Retrieve any user wallet information by user ID",
    responses={
        200: BrushDripWalletSerializer,
        401: OpenApiResponse(description="Unauthorized"),
        404: OpenApiResponse(description="Wallet not found"),
    },
)
class BrushDripWalletDetailView(generics.RetrieveAPIView):
    """
    GET: Retrieve wallet information for specific user
    """

    serializer_class = BrushDripWalletSerializer
    permission_classes = [IsAuthenticated]
    queryset = BrushDripWallet.objects.select_related("user").all()
    lookup_field = "user_id"


@extend_schema(
    tags=["Brush Drips"],
    description="List all transactions with filtering and pagination",
    parameters=[
        OpenApiParameter(
            name="user_id", description="Filter by user ID (sent or received)", type=int
        ),
        OpenApiParameter(
            name="transaction_type",
            description="Filter by transaction object type",
            type=str,
        ),
        OpenApiParameter(
            name="sent_only", description="Show only sent transactions", type=bool
        ),
        OpenApiParameter(
            name="received_only",
            description="Show only received transactions",
            type=bool,
        ),
    ],
    responses={
        200: BrushDripTransactionListSerializer(many=True),
        401: OpenApiResponse(description="Unauthorized"),
    },
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
        queryset = (
            BrushDripTransaction.objects.select_related(
                "transacted_by", "transacted_to"
            )
            .all()
            .order_by("-transacted_at")
        )

        # Filter by user_id (sent or received)
        user_id = self.request.query_params.get("user_id", None)
        if user_id:
            queryset = queryset.filter(
                Q(transacted_by_id=user_id) | Q(transacted_to_id=user_id)
            )

        # Filter by transaction type
        transaction_type = self.request.query_params.get("transaction_type", None)
        if transaction_type:
            queryset = queryset.filter(transaction_object_type=transaction_type)

        # Filter sent only
        sent_only = self.request.query_params.get("sent_only", None)
        if sent_only and sent_only.lower() == "true":
            queryset = queryset.filter(transacted_by=self.request.user)

        # Filter received only
        received_only = self.request.query_params.get("received_only", None)
        if received_only and received_only.lower() == "true":
            queryset = queryset.filter(transacted_to=self.request.user)

        return queryset


@extend_schema(
    tags=["Brush Drips"],
    description="Get current user transaction history",
    parameters=[
        OpenApiParameter(
            name="transaction_type",
            description="Filter by transaction object type",
            type=str,
        ),
        OpenApiParameter(
            name="sent_only", description="Show only sent transactions", type=bool
        ),
        OpenApiParameter(
            name="received_only",
            description="Show only received transactions",
            type=bool,
        ),
    ],
    responses={
        200: BrushDripTransactionListSerializer(many=True),
        401: OpenApiResponse(description="Unauthorized"),
    },
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
    pagination_class = BrushDripsTransactionPagination

    def get_queryset(self):
        user = self.request.user

        # Check for sent_only and received_only filters
        sent_only = self.request.query_params.get("sent_only", None)
        received_only = self.request.query_params.get("received_only", None)

        # Build base queryset with appropriate filter
        if sent_only and sent_only.lower() == "true":
            # Only sent transactions
            queryset = (
                BrushDripTransaction.objects.select_related(
                    "transacted_by", "transacted_to"
                )
                .filter(transacted_by=user)
                .order_by("-transacted_at")
            )
        elif received_only and received_only.lower() == "true":
            # Only received transactions
            queryset = (
                BrushDripTransaction.objects.select_related(
                    "transacted_by", "transacted_to"
                )
                .filter(transacted_to=user)
                .order_by("-transacted_at")
            )
        else:
            # All transactions (sent or received)
            queryset = (
                BrushDripTransaction.objects.select_related(
                    "transacted_by", "transacted_to"
                )
                .filter(Q(transacted_by=user) | Q(transacted_to=user))
                .order_by("-transacted_at")
            )

        # Optional filter by transaction type
        transaction_type = self.request.query_params.get("transaction_type", None)
        if transaction_type:
            queryset = queryset.filter(transaction_object_type=transaction_type)

        return queryset


@extend_schema(
    tags=["Brush Drips"],
    description="Retrieve detailed transaction information by ID",
    responses={
        200: BrushDripTransactionDetailSerializer,
        401: OpenApiResponse(description="Unauthorized"),
        404: OpenApiResponse(description="Transaction not found"),
    },
)
class BrushDripTransactionDetailView(generics.RetrieveAPIView):
    """
    GET: Retrieve detailed transaction information
    """

    serializer_class = BrushDripTransactionDetailSerializer
    permission_classes = [IsAuthenticated]
    queryset = BrushDripTransaction.objects.select_related(
        "transacted_by", "transacted_to"
    ).all()
    lookup_field = "drip_id"


@extend_schema(
    tags=["Brush Drips"],
    description="Create a new brush drip transaction",
    request=BrushDripTransactionCreateSerializer,
    responses={
        201: BrushDripTransactionDetailSerializer,
        400: OpenApiResponse(description="Invalid data or insufficient balance"),
        401: OpenApiResponse(description="Unauthorized"),
    },
    examples=[
        OpenApiExample(
            "Example Request",
            value={
                "amount": 100,
                "transaction_object_type": "praise",
                "transaction_object_id": "12345",
                "transacted_by": 1,
                "transacted_to": 2,
            },
            request_only=True,
        )
    ],
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
            return Response(detail_serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {"error": f"Transaction failed: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )


@extend_schema(
    tags=["Brush Drips"],
    description="Get transaction statistics for authenticated user",
    responses={
        200: BrushDripTransactionStatsSerializer,
        401: OpenApiResponse(description="Unauthorized"),
    },
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
        sent_stats = BrushDripTransaction.objects.filter(transacted_by=user).aggregate(
            total_sent=Sum("amount"), count_sent=Count("drip_id")
        )

        # Aggregate received transactions
        received_stats = BrushDripTransaction.objects.filter(
            transacted_to=user
        ).aggregate(total_received=Sum("amount"), count_received=Count("drip_id"))

        # Calculate stats
        total_sent = sent_stats["total_sent"] or 0
        total_received = received_stats["total_received"] or 0
        count_sent = sent_stats["count_sent"] or 0
        count_received = received_stats["count_received"] or 0

        stats = {
            "total_sent": total_sent,
            "total_received": total_received,
            "net_balance": total_received - total_sent,
            "transaction_count_sent": count_sent,
            "transaction_count_received": count_received,
            "total_transaction_count": count_sent + count_received,
        }

        serializer = BrushDripTransactionStatsSerializer(stats)
        return Response(serializer.data, status=status.HTTP_200_OK)


# ============================================================================
# User Fellows (Friends) Views
# ============================================================================

@extend_schema(
    tags=["Fellows"],
    description="Get pending friend request counts (received and sent)",
    responses={
        200: FriendRequestCountSerializer,
        401: OpenApiResponse(description="Unauthorized"),
    },
)
class FriendRequestCountView(APIView):
    """
    Get count of pending friend requests.
    Returns received_count, sent_count, and total_count.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Count received requests (where user is the recipient)
        received_count = UserFellow.objects.filter(
            fellow_user=user,
            status='pending'
        ).count()

        # Count sent requests (where user is the requester)
        sent_count = UserFellow.objects.filter(
            user=user,
            status='pending'
        ).count()

        data = {
            'received_count': received_count,
            'sent_count': sent_count,
            'total_count': received_count + sent_count,
        }

        serializer = FriendRequestCountSerializer(data)
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema(
    tags=["Fellows"],
    description="List all pending friend requests (received and sent)",
    responses={
        200: UserFellowSerializer(many=True),
        401: OpenApiResponse(description="Unauthorized"),
    },
)
class PendingFriendRequestsListView(generics.ListAPIView):
    """
    List all pending friend requests for the current user.
    Includes both received and sent requests.
    """
    serializer_class = UserFellowSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return UserFellow.objects.filter(
            Q(fellow_user=user, status='pending') | Q(user=user, status='pending')
        ).select_related(
            'user',
            'user__artist',
            'user__user_wallet',
            'fellow_user',
            'fellow_user__artist',
            'fellow_user__user_wallet',
        ).order_by('-fellowed_at')


@extend_schema(
    tags=["Fellows"],
    description="List all accepted fellows (friends)",
    responses={
        200: UserFellowSerializer(many=True),
        401: OpenApiResponse(description="Unauthorized"),
    },
)
class FellowsListView(generics.ListAPIView):
    """
    List all accepted fellows (friends) for the current user.
    Includes relationships where user is either the requester or recipient.
    """
    serializer_class = UserFellowSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return UserFellow.objects.filter(
            Q(user=user, status='accepted') | Q(fellow_user=user, status='accepted')
        ).select_related(
            'user',
            'user__artist',
            'user__user_wallet',
            'fellow_user',
            'fellow_user__artist',
            'fellow_user__user_wallet',
        ).order_by('-fellowed_at')


@extend_schema(
    tags=["Fellows"],
    description="List all accepted fellows (friends) for a specific user by user ID (public endpoint)",
    responses={
        200: UserFellowSerializer(many=True),
        404: OpenApiResponse(description="User not found"),
    },
)
class UserFellowsListView(generics.ListAPIView):
    """
    List all accepted fellows (friends) for a specific user by user ID.
    Public endpoint - anyone can view any user's fellows list.
    """
    serializer_class = UserFellowSerializer
    permission_classes = [AllowAny]  # Public endpoint

    def get_queryset(self):
        user_id = self.kwargs.get('user_id')
        user = get_object_or_404(User, id=user_id)
        return UserFellow.objects.filter(
            Q(user=user, status='accepted') | Q(fellow_user=user, status='accepted')
        ).select_related(
            'user',
            'user__artist',
            'user__user_wallet',
            'fellow_user',
            'fellow_user__artist',
            'fellow_user__user_wallet',
        ).order_by('-fellowed_at')


@extend_schema(
    tags=["Fellows"],
    description="Search within user's fellows (accepted relationships)",
    parameters=[
        OpenApiParameter(
            name="q",
            description="Search query",
            type=str,
        ),
        OpenApiParameter(
            name="filter_by",
            description="Filter by: username, name, or artist_type",
            type=str,
        ),
    ],
    responses={
        200: UserFellowSerializer(many=True),
        401: OpenApiResponse(description="Unauthorized"),
    },
)
class SearchFellowsView(generics.ListAPIView):
    """
    Search within user's existing fellows (accepted relationships only).
    Can filter by username, fullname, or artist_type.
    """
    serializer_class = UserFellowSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        query = self.request.query_params.get('q', '').strip()
        filter_by = self.request.query_params.get('filter_by', 'username').strip()

        # Base queryset: all accepted fellows
        queryset = UserFellow.objects.filter(
            Q(user=user, status='accepted') | Q(fellow_user=user, status='accepted')
        ).select_related(
            'user',
            'user__artist',
            'user__user_wallet',
            'fellow_user',
            'fellow_user__artist',
            'fellow_user__user_wallet',
        )

        if not query:
            return queryset.order_by('-fellowed_at')

        # Build filter conditions for the other user in the relationship
        if filter_by == 'username':
            # Filter by username of the other user
            queryset = queryset.filter(
                Q(user__username__icontains=query, fellow_user=user) |
                Q(fellow_user__username__icontains=query, user=user)
            )
        elif filter_by == 'name':
            # Filter by fullname (first_name + last_name) of the other user
            queryset = queryset.filter(
                Q(user__first_name__icontains=query, fellow_user=user) |
                Q(user__last_name__icontains=query, fellow_user=user) |
                Q(fellow_user__first_name__icontains=query, user=user) |
                Q(fellow_user__last_name__icontains=query, user=user)
            )
        elif filter_by == 'artist_type':
            # Filter by artist_types array contains query
            queryset = queryset.filter(
                Q(user__artist__artist_types__icontains=query, fellow_user=user) |
                Q(fellow_user__artist__artist_types__icontains=query, user=user)
            )

        return queryset.order_by('-fellowed_at')


@extend_schema(
    tags=["Fellows"],
    description="Send a friend request",
    request=CreateFriendRequestSerializer,
    responses={
        201: UserFellowSerializer,
        400: OpenApiResponse(description="Invalid data or relationship already exists"),
        401: OpenApiResponse(description="Unauthorized"),
    },
)
class CreateFriendRequestView(generics.CreateAPIView):
    """
    Create a new friend request.
    Validates that relationship doesn't already exist (both directions).
    """
    serializer_class = CreateFriendRequestSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        fellow_user_id = serializer.validated_data['fellow_user_id']
        fellow_user = get_object_or_404(User, id=fellow_user_id)

        # Check if relationship already exists (both directions)
        existing = UserFellow.objects.filter(
            Q(user=user, fellow_user=fellow_user) |
            Q(user=fellow_user, fellow_user=user)
        ).first()

        if existing:
            if existing.status == 'pending':
                return Response(
                    {'error': 'Friend request already exists'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            elif existing.status == 'accepted':
                return Response(
                    {'error': 'You are already friends'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            elif existing.status == 'blocked':
                return Response(
                    {'error': 'This user is blocked'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Create new friend request
        fellow_relationship = UserFellow.objects.create(
            user=user,
            fellow_user=fellow_user,
            status='pending'
        )

        # Serialize with related user info
        response_serializer = UserFellowSerializer(fellow_relationship)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


@extend_schema(
    tags=["Fellows"],
    description="Accept a friend request",
    responses={
        200: UserFellowSerializer,
        400: OpenApiResponse(description="Request cannot be accepted"),
        401: OpenApiResponse(description="Unauthorized"),
        404: OpenApiResponse(description="Request not found"),
    },
)
class AcceptFriendRequestView(APIView):
    """
    Accept a friend request.
    Only the recipient (fellow_user) can accept.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, id):
        user = request.user

        # Get the request where user is the recipient
        fellow_request = get_object_or_404(
            UserFellow,
            id=id,
            fellow_user=user,
            status='pending'
        )

        # Update status to accepted
        fellow_request.status = 'accepted'
        fellow_request.save()

        serializer = UserFellowSerializer(fellow_request)
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema(
    tags=["Fellows"],
    description="Reject a friend request",
    responses={
        204: OpenApiResponse(description="Request rejected successfully"),
        401: OpenApiResponse(description="Unauthorized"),
        404: OpenApiResponse(description="Request not found"),
    },
)
class RejectFriendRequestView(APIView):
    """
    Reject a friend request.
    Only the recipient (fellow_user) can reject.
    Deletes the UserFellow record.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, id):
        user = request.user

        # Get the request where user is the recipient
        fellow_request = get_object_or_404(
            UserFellow,
            id=id,
            fellow_user=user,
            status='pending'
        )

        # Delete the request
        fellow_request.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(
    tags=["Fellows"],
    description="Unfriend a user (remove friend relationship)",
    responses={
        204: OpenApiResponse(description="Unfriended successfully"),
        401: OpenApiResponse(description="Unauthorized"),
        404: OpenApiResponse(description="Relationship not found"),
    },
)
class UnfriendView(APIView):
    """
    Unfriend a user by deleting the UserFellow relationship.
    Checks both directions to find the relationship.
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, id):
        user = request.user

        # Find relationship in either direction
        fellow_relationship = UserFellow.objects.filter(
            Q(id=id, user=user, status='accepted') |
            Q(id=id, fellow_user=user, status='accepted')
        ).first()

        if not fellow_relationship:
            return Response(
                {'error': 'Friend relationship not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Delete the relationship
        fellow_relationship.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(
    tags=["Fellows"],
    description="Block a user (placeholder - disabled)",
    responses={
        501: OpenApiResponse(description="Not implemented"),
    },
)
class BlockUserView(APIView):
    """
    Block a user (placeholder - not implemented yet).
    This endpoint is disabled and returns 501 Not Implemented.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, id):
        # Placeholder - not implemented
        return Response(
            {'error': 'Block feature is not yet implemented'},
            status=status.HTTP_501_NOT_IMPLEMENTED
        )
