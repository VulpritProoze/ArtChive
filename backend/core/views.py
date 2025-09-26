from django.shortcuts import render
from django.conf import settings
from django.contrib.auth import authenticate
from django.core.files.storage import default_storage
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.generics import RetrieveAPIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.exceptions import TokenError, ExpiredTokenError
from rest_framework.throttling import ScopedRateThrottle
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiExample
from .serializers import UserSerializer, LoginSerializer, RegistrationSerializer, ProfileViewUpdateSerializer
from .models import User
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
    authentication_classes = []

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