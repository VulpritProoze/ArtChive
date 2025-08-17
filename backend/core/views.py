from django.shortcuts import render
from django.contrib.auth import authenticate
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework.throttling import ScopedRateThrottle
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiExample
from .serializers import UserSerializer, LoginSerializer
from decouple import config

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
                secure=config('AUTH_COOKIE_SECURE'),
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
                value=str(refresh.access_token),
                httponly=True,
                secure=config('AUTH_COOKIE_SECURE'),
                samesite='None'
            )
            return response
        except InvalidToken:
            return Response({'error': 'Invalid token'}, status=status.HTTP_401_UNAUTHORIZED)

@extend_schema(
    tags=['Users'],
    description='Get current authenticated user information',
    responses={
        200: UserSerializer,
        401: OpenApiResponse(description='Unauthorized')
    }
)
class UserInfoView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer
    
    def get_object(self):
        return self.request.user