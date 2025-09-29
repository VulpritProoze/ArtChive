from rest_framework import serializers
from rest_framework.serializers import ModelSerializer, Serializer
from common.utils.choices import FACEBOOK_RULES
from post.serializers import PostViewSerializer
from post.models import Post, NovelPost
from core.models import User
from .models import Collective, Channel, CollectiveMember
import uuid

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

    class Meta:
        model = Collective
        fields = '__all__'

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

    class Meta:
        model = Collective
        fields = [
            'title',
            'description',
            'rules',
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