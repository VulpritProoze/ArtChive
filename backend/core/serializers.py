from rest_framework.serializers import ModelSerializer, Serializer
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import User, Artist

class UserSerializer(ModelSerializer):
    class Meta:
        model = User 
        fields = ['id', 'email', 'username']
        read_only_fields = ['id', 'email', 'username']

class LoginSerializer(Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(**data)

        if user and user.is_active:
            return user

        raise serializers.ValidationError('Incorrect credentials')

class RegistrationSerializer(ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    confirmPassword = serializers.CharField(write_only=True, required=True)
    firstName = serializers.CharField(source='first_name', required=False, allow_blank=True)
    middleName = serializers.CharField(source='middle_name', required=False, allow_blank=True)
    lastName = serializers.CharField(source='last_name', required=False, allow_blank=True)
    artistTypes = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        allow_empty=True
    )

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'confirmPassword',
            'firstName', 'middleName', 'lastName', 'city', 'country', 'birthday',
            'artistTypes'
        ]
        extra_kwargs = {
            'password': {'write_only': True},
        }

    def validate(self, data):
        if data['password'] != data.pop('confirmPassword'):
            raise serializers.ValidationError({'confirmPassword': 'Password fields didn\'t match'})
        
        artist_types = data.get('artistTypes', [])
        if len(artist_types) > 5:
            raise serializers.ValidationError({'artistTypes': 'You can select up to 5 artist types only'})

        if len(set(artist_types)) != len(artist_types):
            raise serializers.ValidationError({'artistTypes': 'No duplicate artist types allowed'})

        return data

    def create(self, validated_data):
        artist_types = validated_data.pop('artistTypes', [])

        try:
            # Create user
            user = User.objects.create_user(
                username=validated_data['username'],
                email=validated_data['email'],
                password=validated_data['password'],
                first_name=validated_data.get('first_name', ''),
                middle_name=validated_data.get('middle_name', ''),
                last_name=validated_data.get('last_name', ''),
                city=validated_data.get('city', ''),
                country=validated_data.get('country', ''),
                birthday=validated_data.get('birthday', None)
            )

            Artist.objects.create(user_id=user, artist_types=artist_types)
            return user
        except Exception as e:
            raise serializers.ValidationError({'general': 'Failed to create account. Either the user object failed to create, or the artist object failed to create'})

