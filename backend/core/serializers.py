from datetime import date

from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.validators import FileExtensionValidator
from rest_framework import serializers
from rest_framework.serializers import ModelSerializer, Serializer

from collective.models import CollectiveMember

from .models import Artist, BrushDripTransaction, BrushDripWallet, User


class UserSerializer(ModelSerializer):
    collective_memberships = serializers.SerializerMethodField()
    artist_types = serializers.SerializerMethodField()
    fullname = serializers.SerializerMethodField()
    brushdrips_count = serializers.IntegerField(source='user_wallet.balance')

    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'brushdrips_count', 'fullname', 'profile_picture', 'is_superuser', 'artist_types', 'collective_memberships']
        read_only_fields = ['id', 'email', 'username', 'brushdrips_count', 'fullname', 'profile_picture', 'is_superuser', 'artist_types', 'collective_memberships']

    def get_collective_memberships(self, obj):
        # Return a list of collective_ids user has joined
        return list(CollectiveMember.objects.filter(member=obj).values_list('collective_id', flat=True))

    def get_artist_types(self, obj):
        '''Fetch author's artist types'''
        try:
            return obj.artist.artist_types
        except Artist.DoesNotExist:
            return []

    def get_fullname(self, obj):
        '''Fetch author's full name. Return username if author has no provided name'''
        parts = [obj.first_name or '', obj.last_name or '']
        full_name = ' '.join(part.strip() for part in parts if part and part.strip())
        return full_name if full_name else ''

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

class BrushDripWalletSerializer(ModelSerializer):
    """Serializer for wallet information with user details"""
    username = serializers.CharField(source='user.username', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    middle_name = serializers.CharField(source='user.middle_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    profile_picture = serializers.ImageField(source='user.profile_picture', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = BrushDripWallet
        fields = ['id', 'user', 'username', 'first_name', 'middle_name', 'last_name', 'profile_picture', 'email', 'balance', 'updated_at']
        read_only_fields = ['id', 'user', 'username', 'email', 'balance', 'updated_at']

class BrushDripTransactionListSerializer(ModelSerializer):
    """Lightweight serializer for transaction lists"""
    transacted_by_username = serializers.CharField(source='transacted_by.username', read_only=True)
    transacted_to_username = serializers.CharField(source='transacted_to.username', read_only=True)
    transacted_by_profile_picture = serializers.ImageField(source='transacted_by.profile_picture', read_only=True)
    transacted_to_profile_picture = serializers.ImageField(source='transacted_to.profile_picture', read_only=True)

    class Meta:
        model = BrushDripTransaction
        fields = [
            'drip_id', 'amount', 'transaction_object_type', 'transaction_object_id',
            'transacted_at', 'transacted_by', 'transacted_by_username', 'transacted_by_profile_picture',
            'transacted_to', 'transacted_to_username', 'transacted_to_profile_picture'
        ]
        read_only_fields = ['drip_id', 'transacted_at']


class BrushDripTransactionDetailSerializer(ModelSerializer):
    """Detailed serializer with full user information"""
    transacted_by_user = UserSerializer(source='transacted_by', read_only=True)
    transacted_to_user = UserSerializer(source='transacted_to', read_only=True)
    transacted_by_profile_picture = serializers.ImageField(source='transacted_by.profile_picture', read_only=True)
    transacted_to_profile_picture = serializers.ImageField(source='transacted_to.profile_picture', read_only=True)

    class Meta:
        model = BrushDripTransaction
        fields = [
            'drip_id', 'amount', 'transaction_object_type', 'transaction_object_id',
            'transacted_at', 'transacted_by', 'transacted_by_user',
            'transacted_to', 'transacted_to_user',
            'transacted_by_profile_picture', 'transacted_to_profile_picture',
        ]
        read_only_fields = ['drip_id', 'transacted_at']


class BrushDripTransactionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new transactions with validation"""

    class Meta:
        model = BrushDripTransaction
        fields = [
            'amount', 'transaction_object_type', 'transaction_object_id',
            'transacted_by', 'transacted_to'
        ]

    def validate_amount(self, value):
        """Validate transaction amount"""
        if value <= 0:
            raise serializers.ValidationError("Transaction amount must be greater than 0.")
        if value > 1000000:
            raise serializers.ValidationError("Transaction amount cannot exceed 1,000,000 brush drips.")
        return value

    def validate(self, data):
        """Validate transaction logic"""
        transacted_by = data.get('transacted_by')
        transacted_to = data.get('transacted_to')
        amount = data.get('amount')

        # Check if users are the same
        if transacted_by == transacted_to:
            raise serializers.ValidationError("Cannot transfer brush drips to yourself.")

        # Check if sender exists
        if not transacted_by:
            raise serializers.ValidationError("Sender is required.")

        # Check if receiver exists
        if not transacted_to:
            raise serializers.ValidationError("Receiver is required.")

        # Check if sender has sufficient balance
        try:
            sender_wallet = BrushDripWallet.objects.get(user=transacted_by)
            if sender_wallet.balance < amount:
                raise serializers.ValidationError(
                    f"Insufficient balance. Available: {sender_wallet.balance}, Required: {amount}"
                )
        except BrushDripWallet.DoesNotExist:
            raise serializers.ValidationError("Sender wallet not found.") from None

        # Check if receiver wallet exists
        if not BrushDripWallet.objects.filter(user=transacted_to).exists():
            raise serializers.ValidationError("Receiver wallet not found.")

        return data

    def create(self, validated_data):
        """Create transaction and update wallet balances atomically"""
        from django.db import transaction as db_transaction

        transacted_by = validated_data['transacted_by']
        transacted_to = validated_data['transacted_to']
        amount = validated_data['amount']

        with db_transaction.atomic():
            # Lock wallets for update to prevent race conditions
            sender_wallet = BrushDripWallet.objects.select_for_update().get(user=transacted_by)
            receiver_wallet = BrushDripWallet.objects.select_for_update().get(user=transacted_to)

            # Double-check balance (for safety)
            if sender_wallet.balance < amount:
                raise serializers.ValidationError("Insufficient balance.")

            # Update balances
            sender_wallet.balance -= amount
            receiver_wallet.balance += amount

            sender_wallet.save()
            receiver_wallet.save()

            # Create transaction record
            transaction_record = BrushDripTransaction.objects.create(**validated_data)

        return transaction_record


class BrushDripTransactionStatsSerializer(serializers.Serializer):
    """Serializer for transaction statistics"""
    total_sent = serializers.IntegerField()
    total_received = serializers.IntegerField()
    net_balance = serializers.IntegerField()
    transaction_count_sent = serializers.IntegerField()
    transaction_count_received = serializers.IntegerField()
    total_transaction_count = serializers.IntegerField()
