from django.contrib import admin
from avatar.models import Avatar, ActiveAvatar, InactiveAvatar

@admin.register(ActiveAvatar)
class ActiveAvatarAdmin(admin.ModelAdmin):
    list_display = ['avatar_id', 'name', 'user', 'status', 'is_primary', 'updated_at']
    list_filter = ['status', 'is_primary']
    search_fields = ['name', 'user__username', 'user__email']
    
    def get_queryset(self, request):
        return ActiveAvatar.objects.active()

@admin.register(InactiveAvatar)
class InactiveAvatarAdmin(admin.ModelAdmin):
    list_display = ['avatar_id', 'name', 'user', 'status', 'is_deleted', 'updated_at']
    list_filter = ['status', 'is_deleted']
    search_fields = ['name', 'user__username', 'user__email']
    
    def get_queryset(self, request):
        return InactiveAvatar.objects.inactive()

@admin.register(Avatar)
class AvatarAdmin(admin.ModelAdmin):
    list_display = ['avatar_id', 'name', 'user', 'status', 'is_primary', 'is_deleted']
    list_filter = ['status', 'is_primary', 'is_deleted']
    search_fields = ['name', 'user__username']
