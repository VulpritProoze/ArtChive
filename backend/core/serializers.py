from rest_framework.serializers import ModelSerializer, Serializer
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.validators import FileExtensionValidator
from datetime import date
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

class ProfileViewUpdateSerializer(ModelSerializer):
    firstName = serializers.CharField(source='first_name', required=False, allow_blank=True, max_length=255)
    middleName = serializers.CharField(source='middle_name', required=False, allow_blank=True, max_length=100)
    lastName = serializers.CharField(source='last_name', required=False, allow_blank=True)
    contactNo = serializers.CharField(source='contact_no', required=False, allow_blank=True)
    birthday = serializers.DateField(required=False, allow_null=True)
    artistTypes = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        allow_empty=True,
        source='artist.artist_types'
    )
    profilePicture = serializers.ImageField(source='profile_picture',required=False, validators=[FileExtensionValidator(allowed_extensions=[
        'jpg', 'jpeg', 'png', 'gif'
    ])])

    class Meta:
        model = User
        fields = [
            'username', 'email', 'firstName', 'middleName', 'lastName', 
            'city', 'country', 'contactNo', 'birthday',
            'artistTypes', 'profilePicture'
        ]
        extra_kwargs = {
            'username': {'read_only': True},
            'email': {'read_only': True},
        }

    def validate_birthday(self, value):
        """
        Validate that birthday is not in the future and user is at least 13 years old
        """
        if value:
            today = date.today()
            
            # Check if birthday is in the future
            if value > today:
                raise serializers.ValidationError("Birthday cannot be in the future.")
            
            # Check if user is at least 13 years old
            age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
            if age < 13:
                raise serializers.ValidationError("You must be at least 13 years old to register.")
            
            # Optional: Check if user is too old (e.g., 150 years)
            if age > 150:
                raise serializers.ValidationError("Please enter a valid birthday.")
        
        return value

    def validate_artistTypes(self, value):
        """
        Validate artist types list
        """
        if value:
            # Check maximum number of artist types
            if len(value) > 5:
                raise serializers.ValidationError("You can select up to 5 artist types only.")
            
            # Check for duplicates
            if len(set(value)) != len(value):
                raise serializers.ValidationError("No duplicate artist types allowed.")
            
            # Optional: Validate each artist type (e.g., max length, allowed values)
            for artist_type in value:
                if len(artist_type.strip()) == 0:
                    raise serializers.ValidationError("Artist type cannot be empty.")
                if len(artist_type) > 50:
                    raise serializers.ValidationError(f"Artist type '{artist_type}' exceeds maximum length of 50 characters.")
        
        return value

    def validate_contactNo(self, value):
        """
        Validate contact number format (basic validation)
        """
        if value and value != 'N/A':
            # Remove any non-digit characters
            digits = ''.join(filter(str.isdigit, value))
            
            # Basic length validation (adjust based on your requirements)
            if len(digits) < 10 or len(digits) > 15:
                raise serializers.ValidationError("Please enter a valid contact number.")
        
        return value

    def validate_city(self, value):
        """
        Validate city field
        """
        if value and len(value.strip()) > 100:
            raise serializers.ValidationError("City name cannot exceed 100 characters.")
        return value

    def validate_country(self, value):
        """
        Validate country field
        """
        if value and len(value.strip()) > 100:
            raise serializers.ValidationError("Country name cannot exceed 100 characters.")
        return value

    def update(self, instance, validated_data):
        """
        Handle nested artist data update
        """
        # Extract artist types data if present
        artist_data = validated_data.pop('artist', {})
        artist_types = artist_data.get('artist_types', None)
        
        # Update user fields
        user = super().update(instance, validated_data)
        
        # Update artist types if provided
        if artist_types is not None:
            # Get or create artist profile
            artist, created = Artist.objects.get_or_create(user_id=user)
            artist.artist_types = artist_types
            artist.save()
        
        return user

    def to_representation(self, instance):
        """
        Custom representation to include artist types in the response
        """
        representation = super().to_representation(instance)
        
        # Add artist types to the representation
        try:
            artist = instance.artist
            representation['artistTypes'] = artist.artist_types
        except Artist.DoesNotExist:
            representation['artistTypes'] = []
        
        return representation