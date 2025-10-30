import uuid

from django.core.validators import FileExtensionValidator
from PIL import Image
from rest_framework import serializers
from rest_framework.serializers import ModelSerializer, Serializer

from common.utils.choices import FACEBOOK_RULES
from common.utils.constants import (
    ALLOWED_EXTENSIONS_FOR_IMAGES,
    MAX_FILE_SIZE_FOR_IMAGES,
)
from post.models import Post
from post.serializers import PostViewSerializer

from .models import Channel, Collective, CollectiveMember, AdminRequest


class CollectiveSerializer(ModelSerializer):
    class Meta:
        model = Collective
        fields = '__all__'

class ChannelSerializer(ModelSerializer):
    class Meta:
        model = Channel
        fields = '__all__'

class CollectiveChannelSerializer(ModelSerializer):
    class Meta:
        model = Channel
        fields = ['channel_id', 'description', 'title']

class CollectiveMemberSerializer(ModelSerializer):
    class Meta:
        model = CollectiveMember
        fields = '__all__'

class CollectiveDetailsSerializer(ModelSerializer):
    # nested serializer
    channels = CollectiveChannelSerializer(source='collective_channel', many=True, read_only=True)
    user_membership = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Collective
        fields = '__all__'

    def get_user_membership(self, obj):
        """Get the current user's membership info for this collective."""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                membership = CollectiveMember.objects.get(
                    collective_id=obj,
                    member=request.user
                )
                return {
                    'is_member': True,
                    'role': membership.collective_role,
                    'joined_at': membership.created_at
                }
            except CollectiveMember.DoesNotExist:
                return {
                    'is_member': False,
                    'role': None,
                    'joined_at': None
                }
        return None

    def get_member_count(self, obj):
        """Get total member count for this collective."""
        return CollectiveMember.objects.filter(collective_id=obj).count()

class CollectiveCreateSerializer(serializers.ModelSerializer):
    title = serializers.CharField(max_length=100, trim_whitespace=True)
    description = serializers.CharField(
        max_length=4096,
        allow_blank=False,
        trim_whitespace=True
    )
    rules = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
        allow_empty=True
    )
    artist_types = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        allow_empty=True
    )
    picture = serializers.ImageField(
        required=False,
        validators=[FileExtensionValidator(allowed_extensions=ALLOWED_EXTENSIONS_FOR_IMAGES)]
    )

    class Meta:
        model = Collective
        fields = [
            'title',
            'description',
            'rules',
            'picture',
            'artist_types'
        ]

    def validate_title(self, value):
        """Ensure title is not empty or duplicate."""
        if not value or not value.strip():
            raise serializers.ValidationError("Title must be a non-empty string.")
        # Check uniqueness (excluding case sensitivity)
        if Collective.objects.filter(title__iexact=value.strip()).exists():
            raise serializers.ValidationError("A collective with this title already exists.")
        return value.strip()

    def validate_description(self, value):
        """Ensure description is not just whitespace."""
        if not value or not value.strip():
            raise serializers.ValidationError("Description cannot be empty.")
        return value.strip()

    def validate_artist_types(self, value):
        """Optional: Validate known types or just sanitize."""
        return [item.strip() for item in value if item and item.strip()] if value else []

    def validate_picture(self, value):
        if not value:
            return value

        # 1. File size validation (FileExtensionValidator doesn't handle size)
        if value.size > MAX_FILE_SIZE_FOR_IMAGES:
            raise serializers.ValidationError(
                f"Image file too large. Maximum size is {MAX_FILE_SIZE_FOR_IMAGES // (1024 * 1024)} MB."
            )

        # 2. Content validation with PIL (security: prevent fake images)
        try:
            img = Image.open(value)
            img.verify()  # Verify it's a real image
            value.seek(0)  # Reset file pointer for Django to save it
        except Exception:
            raise serializers.ValidationError("Invalid or corrupted image file.")

        return value

    def create(self, validated_data):
        """Create the Collective instance."""
        if 'rules' not in validated_data:
            validated_data['rules'] = FACEBOOK_RULES.copy()
        if 'artist_types' not in validated_data:
            validated_data['artist_types'] = []

        return super().create(validated_data)

    def to_representation(self, instance):
        """Customize output to include collective_id and readable format."""
        data = super().to_representation(instance)
        data['collective_id'] = instance.collective_id  # Include UUID
        return data

class ChannelCreateSerializer(ModelSerializer):
    title = serializers.CharField(max_length=512, trim_whitespace=True)
    description = serializers.CharField(max_length=4096, required=False, allow_blank=True)
    collective = serializers.UUIDField(write_only=True)

    class Meta:
        model = Channel
        fields = ['title', 'description', 'collective']

    def validate_title(self, value):
        """
        Check that the title is valid.
        """
        if len(value.strip()) == 0:
            raise serializers.ValidationError("Title cannot be empty or just whitespace.")
        return value.strip()

    def validate_collective(self, value):
        """
        Check that the collective_id exists and is valid.
        Convert UUID to Collective instance.
        """
        try:
            collective_instance = Collective.objects.get(collective_id=value)
        except Collective.DoesNotExist:
            raise serializers.ValidationError("Collective with this ID does not exist.")
        return collective_instance

    def create(self, validated_data):
        return Channel.objects.create(**validated_data)

class ChannelUpdateSerializer(ChannelCreateSerializer):
    class Meta:
        model = Channel
        fields = ['title', 'description', 'channel_id']

class ChannelDeleteSerializer(ModelSerializer):
    class Meta:
        model = Channel
        fields = '__all__'

    def validate():
        pass


class CollectiveMemberSerializer(ModelSerializer):
    class Meta:
        model = CollectiveMember
        fields = '__all__'

class InsideCollectiveViewSerializer(ModelSerializer):
    channels = CollectiveChannelSerializer(source='collective_channel', many=True, read_only=True)
    members = CollectiveMemberSerializer(source='collective_member', many=True, read_only=True)
    class Meta:
        model = Collective
        fields = '__all__'

class InsideCollectivePostsViewSerializer(PostViewSerializer):
    class Meta:
        model = Post
        fields = '__all__'

class JoinCollectiveSerializer(Serializer):
    collective_id = serializers.CharField()

    def validate_collective_id(self, value):
        try:
            return Collective.objects.get(collective_id=value)
        except Collective.DoesNotExist:
            raise serializers.ValidationError('Collective not found')

    def create(self, validated_data):
        collective = validated_data['collective_id']
        user = self.context['request'].user

        CollectiveMember.objects.create(
            member=user,
            collective_id=collective
        )

        return CollectiveMember

class LeaveCollectiveSerializer(Serializer):
    collective_id = serializers.UUIDField()

    def validate_collective_id(self, value):
        if not isinstance(value, uuid.UUID):
            try:
                value = uuid.UUID(value)
            except ValueError:
                raise serializers.ValidationError('Invalid UUID format.')

        if not Collective.objects.filter(collective_id=value).exists():
            raise serializers.ValidationError('Collective not found.')

        return value


class BecomeCollectiveAdminSerializer(Serializer):
    collective_id = serializers.UUIDField()

    def validate_collective_id(self, value):
        if not isinstance(value, uuid.UUID):
            try:
                value = uuid.UUID(value)
            except ValueError:
                raise serializers.ValidationError('Invalid UUID format.')

        if not Collective.objects.filter(collective_id=value).exists():
            raise serializers.ValidationError('Collective not found.')

        return value

    def validate(self, data):
        """Validate that user is a member and not already admin."""
        user = self.context['request'].user
        collective = data.get('collective_id')  # From validate_collective_id

        # Ensure user is a member of this collective
        try:
            self._member_record = CollectiveMember.objects.select_related('collective_id').get(
                member=user,
                collective_id=collective
            )
        except CollectiveMember.DoesNotExist:
            raise serializers.ValidationError('You are not a member of this collective.')

        if self._member_record.collective_role == 'admin':
            raise serializers.ValidationError('You are already an admin of this collective.')

        return data

    def save(self, **kwargs):
        """
        Promote the validated member record to 'admin'.
        Returns the updated CollectiveMember instance.
        """
        if not hasattr(self, '_member_record'):
            raise serializers.ValidationError('Validation must be run before save.')

        member_record = self._member_record
        member_record.collective_role = 'admin'
        member_record.save(update_fields=['collective_role'])  # Optimize DB write

        return member_record

# ============================================================================
# COLLECTIVE MEMBER MANAGEMENT SERIALIZERS
# ============================================================================

class CollectiveMemberDetailSerializer(ModelSerializer):
    """Detailed serializer for collective members with user info."""
    member_id = serializers.IntegerField(source='member.id', read_only=True)
    username = serializers.CharField(source='member.username', read_only=True)
    first_name = serializers.CharField(source='member.first_name', read_only=True)
    middle_name = serializers.CharField(source='member.middle_name', read_only=True)
    last_name = serializers.CharField(source='member.last_name', read_only=True)
    profile_picture = serializers.ImageField(source='member.profile_picture', read_only=True)
    artist_types = serializers.ListField(source='member.artist_types', read_only=True)

    class Meta:
        model = CollectiveMember
        fields = ['id', 'member_id', 'username', 'first_name', 'middle_name', 'last_name',
                  'profile_picture', 'artist_types', 'collective_role', 'collective_id']

class KickMemberSerializer(Serializer):
    """Serializer for kicking a member from a collective."""
    member_id = serializers.IntegerField()
    collective_id = serializers.UUIDField()

    def validate_collective_id(self, value):
        """Validate that collective exists."""
        if not Collective.objects.filter(collective_id=value).exists():
            raise serializers.ValidationError('Collective not found.')
        return value

    def validate(self, data):
        """Validate that member exists in collective and isn't kicking themselves."""
        user = self.context['request'].user
        member_id = data['member_id']
        collective_id = data['collective_id']

        # Check if user is trying to kick themselves
        if user.id == member_id:
            raise serializers.ValidationError('You cannot kick yourself from the collective.')

        # Check if target member exists in collective
        try:
            self._member_to_kick = CollectiveMember.objects.get(
                member_id=member_id,
                collective_id=collective_id
            )
        except CollectiveMember.DoesNotExist:
            raise serializers.ValidationError('Member not found in this collective.')

        # Prevent kicking any admin - they must be demoted first
        if self._member_to_kick.collective_role == 'admin':
            raise serializers.ValidationError('Cannot kick an admin. Please demote them to member first.')

        return data

class PromoteMemberSerializer(Serializer):
    """Serializer for promoting a member to admin."""
    member_id = serializers.IntegerField()
    collective_id = serializers.UUIDField()

    def validate_collective_id(self, value):
        """Validate that collective exists."""
        if not Collective.objects.filter(collective_id=value).exists():
            raise serializers.ValidationError('Collective not found.')
        return value

    def validate(self, data):
        """Validate that member exists and is not already an admin."""
        user = self.context['request'].user
        member_id = data['member_id']
        collective_id = data['collective_id']

        # Check if current user is an admin
        try:
            admin_member = CollectiveMember.objects.get(
                member_id=user.id,
                collective_id=collective_id
            )
            if admin_member.collective_role != 'admin':
                raise serializers.ValidationError('Only admins can promote members.')
        except CollectiveMember.DoesNotExist:
            raise serializers.ValidationError('You are not a member of this collective.')

        # Check if target member exists in collective
        try:
            self._member_to_promote = CollectiveMember.objects.get(
                member_id=member_id,
                collective_id=collective_id
            )
        except CollectiveMember.DoesNotExist:
            raise serializers.ValidationError('Member not found in this collective.')

        # Check if already an admin
        if self._member_to_promote.collective_role == 'admin':
            raise serializers.ValidationError('This member is already an admin.')

        return data

    def save(self):
        """Promote the member to admin."""
        self._member_to_promote.collective_role = 'admin'
        self._member_to_promote.save(update_fields=['collective_role'])
        return self._member_to_promote

class DemoteAdminSerializer(Serializer):
    """Serializer for demoting an admin to member."""
    member_id = serializers.IntegerField()
    collective_id = serializers.UUIDField()

    def validate_collective_id(self, value):
        """Validate that collective exists."""
        if not Collective.objects.filter(collective_id=value).exists():
            raise serializers.ValidationError('Collective not found.')
        return value

    def validate(self, data):
        """Validate that member exists, is an admin, and isn't the last admin."""
        user = self.context['request'].user
        member_id = data['member_id']
        collective_id = data['collective_id']

        # Check if current user is an admin
        try:
            admin_member = CollectiveMember.objects.get(
                member_id=user.id,
                collective_id=collective_id
            )
            if admin_member.collective_role != 'admin':
                raise serializers.ValidationError('Only admins can demote other admins.')
        except CollectiveMember.DoesNotExist:
            raise serializers.ValidationError('You are not a member of this collective.')

        # Check if target member exists in collective
        try:
            self._member_to_demote = CollectiveMember.objects.get(
                member_id=member_id,
                collective_id=collective_id
            )
        except CollectiveMember.DoesNotExist:
            raise serializers.ValidationError('Member not found in this collective.')

        # Check if they are actually an admin
        if self._member_to_demote.collective_role != 'admin':
            raise serializers.ValidationError('This member is not an admin.')

        # Count remaining admins
        admin_count = CollectiveMember.objects.filter(
            collective_id=collective_id,
            collective_role='admin'
        ).count()

        if admin_count <= 1:
            raise serializers.ValidationError('Cannot demote the last admin of the collective.')

        return data

    def save(self):
        """Demote the admin to member."""
        self._member_to_demote.collective_role = 'member'
        self._member_to_demote.save(update_fields=['collective_role'])
        return self._member_to_demote

# ============================================================================
# ADMIN REQUEST SERIALIZERS
# ============================================================================

class AdminRequestSerializer(ModelSerializer):
    """Serializer for admin requests."""
    requester_username = serializers.CharField(source='requester.username', read_only=True)
    requester_first_name = serializers.CharField(source='requester.first_name', read_only=True)
    requester_middle_name = serializers.CharField(source='requester.middle_name', read_only=True)
    requester_last_name = serializers.CharField(source='requester.last_name', read_only=True)
    requester_profile_picture = serializers.ImageField(source='requester.profile_picture', read_only=True)
    collective_title = serializers.CharField(source='collective.title', read_only=True)

    class Meta:
        model = AdminRequest
        fields = ['request_id', 'collective', 'collective_title', 'requester',
                  'requester_username', 'requester_first_name', 'requester_middle_name',
                  'requester_last_name', 'requester_profile_picture',
                  'status', 'message', 'created_at', 'updated_at', 'reviewed_by']
        read_only_fields = ['request_id', 'requester', 'status', 'created_at', 'updated_at', 'reviewed_by']

class AdminRequestCreateSerializer(Serializer):
    """Serializer for creating admin requests."""
    collective_id = serializers.UUIDField()
    message = serializers.CharField(max_length=500, required=False, allow_blank=True)

    def validate_collective_id(self, value):
        """Validate that collective exists."""
        try:
            return Collective.objects.get(collective_id=value)
        except Collective.DoesNotExist:
            raise serializers.ValidationError('Collective not found.')

    def validate(self, data):
        """Validate that user is a member and hasn't already requested."""
        user = self.context['request'].user
        collective = data['collective_id']

        # Check if user is a member
        try:
            member = CollectiveMember.objects.get(
                member=user,
                collective_id=collective
            )
        except CollectiveMember.DoesNotExist:
            raise serializers.ValidationError('You must be a member of this collective to request admin role.')

        # Check if already an admin
        if member.collective_role == 'admin':
            raise serializers.ValidationError('You are already an admin of this collective.')

        # Check if there's already a pending request
        if AdminRequest.objects.filter(
            collective=collective,
            requester=user,
            status='pending'
        ).exists():
            raise serializers.ValidationError('You already have a pending admin request for this collective.')

        return data

    def create(self, validated_data):
        """Create admin request."""
        collective = validated_data['collective_id']
        message = validated_data.get('message', '')
        user = self.context['request'].user

        return AdminRequest.objects.create(
            collective=collective,
            requester=user,
            message=message,
            status='pending'
        )

class AcceptAdminRequestSerializer(Serializer):
    """Serializer for accepting/rejecting admin requests."""
    request_id = serializers.UUIDField()
    action = serializers.ChoiceField(choices=['approve', 'reject'])

    def validate_request_id(self, value):
        """Validate that request exists and is pending."""
        try:
            request = AdminRequest.objects.select_related('collective', 'requester').get(request_id=value)
        except AdminRequest.DoesNotExist:
            raise serializers.ValidationError('Admin request not found.')

        if request.status != 'pending':
            raise serializers.ValidationError(f'This request has already been {request.status}.')

        self._admin_request = request
        return value

    def validate(self, data):
        """Validate that current user is an admin of the collective."""
        user = self.context['request'].user
        admin_request = self._admin_request

        # Check if user is admin of the collective
        try:
            member = CollectiveMember.objects.get(
                member=user,
                collective_id=admin_request.collective
            )
            if member.collective_role != 'admin':
                raise serializers.ValidationError('Only admins can approve/reject admin requests.')
        except CollectiveMember.DoesNotExist:
            raise serializers.ValidationError('You are not a member of this collective.')

        return data

    def save(self):
        """Process the admin request."""
        action = self.validated_data['action']
        admin_request = self._admin_request
        reviewer = self.context['request'].user

        if action == 'approve':
            # Update request status
            admin_request.status = 'approved'
            admin_request.reviewed_by = reviewer
            admin_request.save()

            # Promote member to admin
            member = CollectiveMember.objects.get(
                member=admin_request.requester,
                collective_id=admin_request.collective
            )
            member.collective_role = 'admin'
            member.save(update_fields=['collective_role'])

        elif action == 'reject':
            admin_request.status = 'rejected'
            admin_request.reviewed_by = reviewer
            admin_request.save()

        return admin_request
