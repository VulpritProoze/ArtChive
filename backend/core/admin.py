from decouple import config
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from core.models import (
    Artist,
    BrushDripTransaction,
    BrushDripWallet,
    InactiveUser,
    User,
)

# Set the "View site" URL to the React app URL
admin.site.site_url = config('REACT_CLIENT_URL', default='/')


# Admin for ACTIVE users (default User admin)
class ActiveUserAdmin(BaseUserAdmin):
    def get_queryset(self, request):
        return User.objects.get_active_users()

    # Optional: visually indicate these are active
    def get_list_display(self, request):
        list_display = list(super().get_list_display(request))
        if "is_deleted" not in list_display:
            list_display.append("is_deleted")
        return list_display


# Admin for INACTIVE users
class InactiveUserAdmin(BaseUserAdmin):
    def get_queryset(self, request):
        return User.objects.get_inactive_users()

    def get_list_display(self, request):
        list_display = list(super().get_list_display(request))
        if "is_deleted" not in list_display:
            list_display.append("is_deleted")
        return list_display

    # Optional: disable add/delete for inactive users
    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


# Admin for Artist - read-only, no adding
class ArtistAdmin(admin.ModelAdmin):
    list_display = ('user_id', 'get_artist_types')
    search_fields = ('user_id__username', 'user_id__email')
    readonly_fields = ('user_id', 'artist_types')
    list_per_page = 50

    def has_add_permission(self, request):  # noqa: ARG002
        return False

    def has_change_permission(self, request, obj=None):  # noqa: ARG002
        return False

    def has_delete_permission(self, request, obj=None):  # noqa: ARG002
        return False

    def get_artist_types(self, obj):
        """Display artist types as a comma-separated string"""
        return ", ".join(obj.artist_types or [])

    get_artist_types.short_description = "Artist Types"


# Admin for BrushDripWallet - read-only, no adding
class BrushDripWalletAdmin(admin.ModelAdmin):
    list_display = ('user', 'balance', 'updated_at')
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('user', 'balance', 'updated_at')
    list_per_page = 50

    def has_add_permission(self, request):  # noqa: ARG002
        return False

    def has_change_permission(self, request, obj=None):  # noqa: ARG002
        return False

    def has_delete_permission(self, request, obj=None):  # noqa: ARG002
        return False


# Admin for BrushDripTransaction - read-only, can add
class BrushDripTransactionAdmin(admin.ModelAdmin):
    list_display = ('drip_id', 'amount', 'transacted_by', 'transacted_to', 'transaction_object_type', 'transacted_at')
    list_filter = ('transaction_object_type', 'transacted_at')
    search_fields = ('transacted_by__username', 'transacted_to__username', 'transaction_object_id')
    readonly_fields = ('drip_id', 'transaction_object_type', 'transaction_object_id', 'transacted_at', 'transacted_by')
    list_per_page = 50
    date_hierarchy = 'transacted_at'

    fieldsets = (
        ('Transaction Information', {
            'fields': ('drip_id', 'amount', 'transacted_to')
        }),
        ('Metadata', {
            'fields': ('transaction_object_type', 'transaction_object_id', 'transacted_by', 'transacted_at'),
            'description': 'Transacted by is automatically set to the logged-in admin. Transaction object type and ID are automatically set to admin_override and 0000 respectively.'
        }),
    )

    def save_model(self, request, obj, form, change):
        """Automatically set transacted_by, transaction_object_type, and transaction_object_id, and update wallet"""
        if not change:  # Only on creation
            obj.transacted_by = request.user
            obj.transaction_object_type = 'admin_override'
            obj.transaction_object_id = '0000'

            # Update the wallet balance of transacted_to user
            if obj.transacted_to and obj.amount:
                try:
                    wallet = obj.transacted_to.user_wallet
                    wallet.balance += obj.amount
                    wallet.save()

                    self.message_user(
                        request,
                        f"Successfully added {obj.amount} brush drips to {obj.transacted_to.username}'s wallet. New balance: {wallet.balance}",
                        level='SUCCESS'
                    )
                except BrushDripWallet.DoesNotExist:
                    self.message_user(
                        request,
                        f"Warning: Wallet not found for user {obj.transacted_to.username}. Transaction created but wallet not updated.",
                        level='WARNING'
                    )

        super().save_model(request, obj, form, change)

    def has_change_permission(self, request, obj=None):  # noqa: ARG002
        return False

    def has_delete_permission(self, request, obj=None):  # noqa: ARG002
        return False


admin.site.register(Artist, ArtistAdmin)
admin.site.register(BrushDripWallet, BrushDripWalletAdmin)
admin.site.register(BrushDripTransaction, BrushDripTransactionAdmin)
admin.site.register(User, ActiveUserAdmin)
admin.site.register(InactiveUser, InactiveUserAdmin)
