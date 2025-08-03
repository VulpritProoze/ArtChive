from rest_framework.serializers import ModelSerializer, Serializer
from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User

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

