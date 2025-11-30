from django.contrib import admin
from django.contrib.admin.models import LogEntry
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import Group, Permission
from django.urls import reverse
from django.utils.html import format_html
from unfold.admin import ModelAdmin, TabularInline

from core.models import (
    Artist,
    BrushDripTransaction,
    BrushDripWallet,
    InactiveUser,
    User,
    UserFellow,
)


# Inline for UserFellow - shows all accepted fellow relationships (excludes pending)
class UserFellowInline(TabularInline):
    """Inline to show all UserFellow relationships for a user (both sent and received, excluding pending)"""
    model = UserFellow
    fk_name = 'user'  # Primary FK, but we'll override queryset to include both directions
    extra = 0
    fields = ('other_user', 'other_user_link', 'status')
    readonly_fields = ('other_user', 'other_user_link', 'status')
    can_delete = False
    verbose_name = 'Fellow'
    verbose_name_plural = 'Fellows'

    def get_formset(self, request, obj=None, **kwargs):
        """Override to provide custom queryset that includes both directions, excluding pending"""
        if obj and obj.pk:
            # Get relationships where user is the requester OR the requested user, excluding pending
            from django.db.models import Q
            queryset = UserFellow.objects.filter(
                (Q(user=obj) | Q(fellow_user=obj)) & ~Q(status='pending')
            ).order_by('-fellowed_at')
        else:
            queryset = UserFellow.objects.none()

        # Store parent object for use in other_user method
        self._parent_obj = obj

        # Get the formset class
        formset = super().get_formset(request, obj, **kwargs)

        # Override the queryset in the formset
        class CustomFormset(formset):
            def __init__(self, *args, **kwargs):
                kwargs['queryset'] = queryset
                super().__init__(*args, **kwargs)

        return CustomFormset

    def other_user(self, obj):
        """Display the other user in the relationship"""
        parent_obj = getattr(self, '_parent_obj', None)
        if not parent_obj:
            return '-'
        if obj.user == parent_obj:
            # Current user is the requester, show the requested user
            return str(obj.fellow_user)
        else:
            # Current user is the requested user, show the requester
            return str(obj.user)
    other_user.short_description = 'Fellow User'

    def other_user_link(self, obj):
        """Display clickable link to the other user with username and name"""
        parent_obj = getattr(self, '_parent_obj', None)
        if not parent_obj:
            return '-'
        if obj.user == parent_obj:
            # Current user is the requester, show the requested user
            other_user = obj.fellow_user
        else:
            # Current user is the requested user, show the requester
            other_user = obj.user
        if other_user:
            url = reverse('admin:core_user_change', args=[other_user.id])
            # Display username and name if available
            name_parts = []
            if other_user.first_name:
                name_parts.append(other_user.first_name)
            if other_user.last_name:
                name_parts.append(other_user.last_name)
            name_display = ' '.join(name_parts) if name_parts else 'No name'
            display_text = f"{other_user.username} ({name_display})"
            return format_html('<a href="{}">{}</a>', url, display_text)
        return '-'
    other_user_link.short_description = 'Username (Name)'

    def has_add_permission(self, request, obj=None):
        """Prevent adding fellow relationships via admin"""
        return False

    def has_change_permission(self, request, obj=None):
        """Prevent editing fellow relationships via admin"""
        return False


# Inline for pending UserFellow requests where user is the requested user
class UserFellowPendingInline(TabularInline):
    """Inline to show pending friend requests where user is the requested user"""
    model = UserFellow
    fk_name = 'fellow_user'  # Show relationships where this user is the requested user
    extra = 0
    fields = ('other_user', 'other_user_link', 'status')
    readonly_fields = ('other_user', 'other_user_link', 'status')
    can_delete = False
    verbose_name = 'Pending Friend Request'
    verbose_name_plural = 'Pending Friend Requests'

    def get_formset(self, request, obj=None, **kwargs):
        """Override to show only pending requests where user is the requested user"""
        if obj and obj.pk:
            # Get only pending relationships where user is the requested user
            queryset = UserFellow.objects.filter(
                fellow_user=obj,
                status='pending'
            ).order_by('-fellowed_at')
        else:
            queryset = UserFellow.objects.none()

        # Store parent object for use in other_user methods
        self._parent_obj = obj

        # Get the formset class
        formset = super().get_formset(request, obj, **kwargs)

        # Override the queryset in the formset
        class CustomFormset(formset):
            def __init__(self, *args, **kwargs):
                kwargs['queryset'] = queryset
                super().__init__(*args, **kwargs)

        return CustomFormset

    def other_user(self, obj):
        """Display the other user in the relationship"""
        parent_obj = getattr(self, '_parent_obj', None)
        if not parent_obj:
            return '-'
        # In pending inline, current user is always the requested user (fellow_user)
        # So we always show the requester (user)
        return str(obj.user)
    other_user.short_description = 'Fellow User'

    def other_user_link(self, obj):
        """Display clickable link to the other user with username and name"""
        parent_obj = getattr(self, '_parent_obj', None)
        if not parent_obj:
            return '-'
        # In pending inline, current user is always the requested user (fellow_user)
        # So we always show the requester (user)
        other_user = obj.user
        if other_user:
            url = reverse('admin:core_user_change', args=[other_user.id])
            # Display username and name if available
            name_parts = []
            if other_user.first_name:
                name_parts.append(other_user.first_name)
            if other_user.last_name:
                name_parts.append(other_user.last_name)
            name_display = ' '.join(name_parts) if name_parts else 'No name'
            display_text = f"{other_user.username} ({name_display})"
            return format_html('<a href="{}">{}</a>', url, display_text)
        return '-'
    other_user_link.short_description = 'Username (Name)'

    def has_add_permission(self, request, obj=None):
        """Prevent adding fellow relationships via admin"""
        return False

    def has_change_permission(self, request, obj=None):
        """Prevent editing fellow relationships via admin"""
        return False


# Admin for ACTIVE users (default User admin)
class ActiveUserAdmin(BaseUserAdmin):
    search_fields = ('username', 'email', 'first_name', 'last_name')
    inlines = [UserFellowInline, UserFellowPendingInline]

    def get_queryset(self, request):
        return User.objects.get_active_users()

    def has_add_permission(self, request):
        """Disable adding new users via admin"""
        return False

    def user_change_password(self, request, id, form_url=''):
        """Override to ensure password change is accessible even if change permission is restricted"""
        from django.http import Http404
        user = self.get_object(request, id)
        if user is None:
            raise Http404
        # Allow password change even if regular change permission is restricted
        return super().user_change_password(request, id, form_url)

    def get_urls(self):
        """Ensure password change URLs are included"""
        urls = super().get_urls()
        # BaseUserAdmin already includes password change URLs at /password/
        # This ensures they're accessible
        return urls

    def get_list_display(self, request):
        list_display = list(super().get_list_display(request))
        # Remove is_staff from list display
        if "is_staff" in list_display:
            list_display.remove("is_staff")
        # Add middle_name after first_name if it exists, otherwise add it
        if "middle_name" not in list_display:
            # Try to insert after first_name, or append if first_name not found
            try:
                first_name_idx = list_display.index("first_name")
                list_display.insert(first_name_idx + 1, "middle_name")
            except ValueError:
                list_display.append("middle_name")
        # Add is_superuser to list display if not already present
        if "is_superuser" not in list_display:
            list_display.append("is_superuser")
        if "is_deleted" not in list_display:
            list_display.append("is_deleted")
        return list_display

    def get_list_filter(self, request):
        """Remove is_staff from list filters"""
        list_filter = list(super().get_list_filter(request))
        # Remove is_staff from filters
        if "is_staff" in list_filter:
            list_filter.remove("is_staff")
        return tuple(list_filter)

    def get_fieldsets(self, request, obj=None):
        """Override fieldsets to hide Groups and Staff status, and add all personal info fields"""
        fieldsets = super().get_fieldsets(request, obj)
        new_fieldsets = []
        for name, fieldset in fieldsets:
            # Handle password fieldset (usually has no name or empty name)
            if name is None or name == '':
                fields = list(fieldset.get('fields', []))
                # Add password_change_link to the password fieldset if editing existing user
                if obj and obj.pk and 'password_change_link' not in fields:
                    fields.append('password_change_link')
                new_fieldsets.append((name, {
                    **fieldset,
                    'fields': tuple(fields)
                }))
            elif name == 'Personal info':
                # Add all personal info fields: first_name, middle_name, last_name, city, country, contact_no, birthday, profile_picture
                fields = list(fieldset.get('fields', []))
                # Ensure all personal info fields are included
                personal_info_fields = ['first_name', 'middle_name', 'last_name', 'city', 'country', 'contact_no', 'birthday', 'profile_picture']
                for field in personal_info_fields:
                    if field not in fields:
                        # Insert in order if possible, otherwise append
                        if field == 'middle_name' and 'first_name' in fields:
                            first_name_idx = fields.index('first_name')
                            fields.insert(first_name_idx + 1, field)
                        elif field == 'last_name' and 'middle_name' in fields:
                            middle_name_idx = fields.index('middle_name')
                            fields.insert(middle_name_idx + 1, field)
                        elif field == 'last_name' and 'first_name' in fields:
                            first_name_idx = fields.index('first_name')
                            fields.insert(first_name_idx + 1, field)
                        else:
                            fields.append(field)
                new_fieldsets.append((name, {
                    **fieldset,
                    'fields': tuple(fields)
                }))
            elif name == 'Permissions':
                # Customize the Permissions fieldset to exclude groups and staff status, replace is_active with is_deleted
                fields = list(fieldset.get('fields', []))
                # Remove groups, user_permissions, is_staff
                filtered_fields = [
                    f for f in fields
                    if f not in ('groups', 'user_permissions', 'is_staff', 'is_active')
                ]
                # Replace is_active with is_deleted if is_active was present
                if 'is_active' in fields:
                    if 'is_deleted' not in filtered_fields:
                        # Insert is_deleted where is_active was
                        try:
                            is_active_idx = fields.index('is_active')
                            filtered_fields.insert(is_active_idx, 'is_deleted')
                        except ValueError:
                            filtered_fields.append('is_deleted')
                elif 'is_deleted' not in filtered_fields:
                    filtered_fields.append('is_deleted')
                if filtered_fields:  # Only add if there are fields left
                    new_fieldsets.append((name, {
                        **fieldset,
                        'fields': tuple(filtered_fields)
                    }))
            else:
                new_fieldsets.append((name, fieldset))
        return new_fieldsets

    def get_form(self, request, obj=None, **kwargs):
        """Remove groups and is_staff from the form, and ensure is_deleted is available"""
        form = super().get_form(request, obj, **kwargs)
        # Remove fields from the form
        if 'groups' in form.base_fields:
            del form.base_fields['groups']
        if 'user_permissions' in form.base_fields:
            del form.base_fields['user_permissions']
        if 'is_staff' in form.base_fields:
            del form.base_fields['is_staff']
        # Remove is_active if present (we use is_deleted instead)
        if 'is_active' in form.base_fields:
            del form.base_fields['is_active']

        # Make username readonly for existing users
        if obj and obj.pk and 'username' in form.base_fields:
            form.base_fields['username'].disabled = True
            form.base_fields['username'].help_text = 'Username cannot be changed after creation.'

        # Prevent admin from removing their own superuser status
        if obj and obj.pk == request.user.pk and 'is_superuser' in form.base_fields:
            # Make is_superuser readonly for own account
            form.base_fields['is_superuser'].disabled = True
            form.base_fields['is_superuser'].help_text = 'You cannot remove your own superuser status.'

        return form

    def get_readonly_fields(self, request, obj=None):
        """Add password change link and make is_superuser readonly for own account"""
        readonly_fields = list(super().get_readonly_fields(request, obj))

        # Make username readonly (not editable)
        if 'username' not in readonly_fields:
            readonly_fields.append('username')

        # Add password change link as a readonly field
        if obj and obj.pk:
            readonly_fields.append('password_change_link')

        # Make is_superuser readonly if editing own account
        if obj and obj.pk == request.user.pk:
            if 'is_superuser' not in readonly_fields:
                readonly_fields.append('is_superuser')

        return readonly_fields

    def password_change_link(self, obj):
        """Display a clickable link to change password"""
        if obj and obj.pk:
            # Construct the password change URL directly
            # Django's UserAdmin uses the pattern: {app_label}/{model_name}/{id}/password/
            url = f'/admin/core/user/{obj.pk}/password/'
            return format_html('<a href="{}" class="button">Change Password</a>', url)
        return '-'
    password_change_link.short_description = 'Password'

    def save_model(self, request, obj, form, change):
        """Prevent admin from removing their own superuser status"""
        if change and obj.pk == request.user.pk:
            # Ensure the current admin cannot remove their own superuser status
            if not obj.is_superuser:
                obj.is_superuser = True
                self.message_user(
                    request,
                    'You cannot remove your own superuser status. It has been restored.',
                    level='WARNING'
                )
        super().save_model(request, obj, form, change)


# Admin for INACTIVE users
class InactiveUserAdmin(BaseUserAdmin):
    def get_queryset(self, request):
        return User.objects.get_inactive_users()

    def get_list_display(self, request):
        list_display = list(super().get_list_display(request))
        # Remove is_staff from list display
        if "is_staff" in list_display:
            list_display.remove("is_staff")
        # Add middle_name after first_name if it exists, otherwise add it
        if "middle_name" not in list_display:
            # Try to insert after first_name, or append if first_name not found
            try:
                first_name_idx = list_display.index("first_name")
                list_display.insert(first_name_idx + 1, "middle_name")
            except ValueError:
                list_display.append("middle_name")
        # Add is_superuser to list display if not already present
        if "is_superuser" not in list_display:
            list_display.append("is_superuser")
        if "is_deleted" not in list_display:
            list_display.append("is_deleted")
        return list_display

    def get_list_filter(self, request):
        """Remove is_staff from list filters"""
        list_filter = list(super().get_list_filter(request))
        # Remove is_staff from filters
        if "is_staff" in list_filter:
            list_filter.remove("is_staff")
        return tuple(list_filter)

    # Disable add/change/delete for inactive users (view-only)
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def get_readonly_fields(self, request, obj=None):
        """Make all fields readonly for inactive users"""
        readonly_fields = list(super().get_readonly_fields(request, obj))
        # Get all field names from the form
        if obj:
            form = self.get_form(request, obj)
            all_fields = list(form.base_fields.keys())
            # Add all fields to readonly_fields
            for field in all_fields:
                if field not in readonly_fields:
                    readonly_fields.append(field)
        return readonly_fields

    def get_form(self, request, obj=None, **kwargs):
        """Remove groups and is_staff from the form, and make all fields readonly for inactive users"""
        form = super().get_form(request, obj, **kwargs)
        # Remove fields from the form
        if 'groups' in form.base_fields:
            del form.base_fields['groups']
        if 'user_permissions' in form.base_fields:
            del form.base_fields['user_permissions']
        if 'is_staff' in form.base_fields:
            del form.base_fields['is_staff']
        # Remove is_active if present (we use is_deleted instead)
        if 'is_active' in form.base_fields:
            del form.base_fields['is_active']

        # Make all fields disabled/readonly for inactive users
        for field in form.base_fields.values():
            field.disabled = True
            field.widget.attrs['readonly'] = True

        return form

    def get_fieldsets(self, request, obj=None):
        """Override fieldsets to hide Groups and Staff status, and add all personal info fields"""
        fieldsets = super().get_fieldsets(request, obj)
        new_fieldsets = []
        for name, fieldset in fieldsets:
            if name == 'Personal info':
                # Add all personal info fields: first_name, middle_name, last_name, city, country, contact_no, birthday, profile_picture
                fields = list(fieldset.get('fields', []))
                # Ensure all personal info fields are included
                personal_info_fields = ['first_name', 'middle_name', 'last_name', 'city', 'country', 'contact_no', 'birthday', 'profile_picture']
                for field in personal_info_fields:
                    if field not in fields:
                        # Insert in order if possible, otherwise append
                        if field == 'middle_name' and 'first_name' in fields:
                            first_name_idx = fields.index('first_name')
                            fields.insert(first_name_idx + 1, field)
                        elif field == 'last_name' and 'middle_name' in fields:
                            middle_name_idx = fields.index('middle_name')
                            fields.insert(middle_name_idx + 1, field)
                        elif field == 'last_name' and 'first_name' in fields:
                            first_name_idx = fields.index('first_name')
                            fields.insert(first_name_idx + 1, field)
                        else:
                            fields.append(field)
                new_fieldsets.append((name, {
                    **fieldset,
                    'fields': tuple(fields)
                }))
            elif name == 'Permissions':
                # Customize the Permissions fieldset to exclude groups and staff status, replace is_active with is_deleted
                fields = list(fieldset.get('fields', []))
                # Remove groups, user_permissions, is_staff
                filtered_fields = [
                    f for f in fields
                    if f not in ('groups', 'user_permissions', 'is_staff', 'is_active')
                ]
                # Replace is_active with is_deleted if is_active was present
                if 'is_active' in fields:
                    if 'is_deleted' not in filtered_fields:
                        # Insert is_deleted where is_active was
                        try:
                            is_active_idx = fields.index('is_active')
                            filtered_fields.insert(is_active_idx, 'is_deleted')
                        except ValueError:
                            filtered_fields.append('is_deleted')
                elif 'is_deleted' not in filtered_fields:
                    filtered_fields.append('is_deleted')
                if filtered_fields:  # Only add if there are fields left
                    new_fieldsets.append((name, {
                        **fieldset,
                        'fields': tuple(filtered_fields)
                    }))
            else:
                new_fieldsets.append((name, fieldset))
        return new_fieldsets


# Admin for Artist - read-only, no adding
class ArtistAdmin(ModelAdmin):
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
class BrushDripWalletAdmin(ModelAdmin):
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
class BrushDripTransactionAdmin(ModelAdmin):
    list_display = ('drip_id', 'amount', 'transacted_by_link', 'transacted_to_link', 'transaction_object_type', 'transacted_at')
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

    def transacted_by_link(self, obj):
        """Display transacted_by as a clickable link to the user admin page"""
        if obj.transacted_by:
            url = reverse('admin:core_user_change', args=[obj.transacted_by.pk])
            return format_html('<a href="{}" class="viewlink">{}</a>', url, obj.transacted_by.username)
        return '-'
    transacted_by_link.short_description = 'Transacted By'
    transacted_by_link.admin_order_field = 'transacted_by__username'

    def transacted_to_link(self, obj):
        """Display transacted_to as a clickable link to the user admin page"""
        if obj.transacted_to:
            url = reverse('admin:core_user_change', args=[obj.transacted_to.pk])
            return format_html('<a href="{}" class="viewlink">{}</a>', url, obj.transacted_to.username)
        return '-'
    transacted_to_link.short_description = 'Transacted To'
    transacted_to_link.admin_order_field = 'transacted_to__username'

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


# Hide Groups and Permissions from Django admin
# Unregister Group and Permission models to hide them from admin interface
try:
    admin.site.unregister(Group)
except admin.sites.NotRegistered:
    pass  # Group might not be registered yet

try:
    admin.site.unregister(Permission)
except admin.sites.NotRegistered:
    pass  # Permission might not be registered yet

# Custom Permission Admin to hide specific permissions (commented out - not needed if hiding entirely)
# class CustomPermissionAdmin(ModelAdmin):
#     """Hide specific permissions from the permissions list"""
#     list_display = ('name', 'content_type', 'codename')
#     search_fields = ('name', 'codename', 'content_type__model')
#     list_filter = ('content_type',)
#
#     def get_queryset(self, request):
#         """Filter out specific permissions"""
#         qs = super().get_queryset(request)
#         # Example: Hide LogEntry permissions (uncomment to enable)
#         # from django.contrib.contenttypes.models import ContentType
#         # log_entry_ct = ContentType.objects.get(app_label='admin', model='logentry')
#         # qs = qs.exclude(content_type=log_entry_ct)
#
#         # Example: Hide specific permission codenames (uncomment to enable)
#         # qs = qs.exclude(codename__in=['add_logentry', 'change_logentry', 'delete_logentry', 'view_logentry'])
#
#         return qs
#
# admin.site.register(Permission, CustomPermissionAdmin)

# Admin for LogEntry (Admin Action History)
class LogEntryAdmin(ModelAdmin):
    """Admin for viewing Django admin action history"""
    list_display = ('action_time', 'user', 'content_type', 'object_repr', 'action_flag', 'change_message')
    list_filter = ('action_time', 'action_flag', 'content_type')
    search_fields = ('user__username', 'object_repr', 'change_message')
    readonly_fields = ('action_time', 'user', 'content_type', 'object_id', 'object_repr', 'action_flag', 'change_message')
    date_hierarchy = 'action_time'
    list_per_page = 50

    def has_add_permission(self, request):
        """Cannot create log entries manually"""
        return False

    def has_change_permission(self, request, obj=None):
        """Cannot edit log entries"""
        return False

    def has_delete_permission(self, request, obj=None):
        """Cannot delete log entries"""
        return False


# Register models with Unfold admin
admin.site.register(Artist, ArtistAdmin)
# admin.site.register(BrushDripWallet, BrushDripWalletAdmin)
admin.site.register(BrushDripTransaction, BrushDripTransactionAdmin)
admin.site.register(User, ActiveUserAdmin)
admin.site.register(InactiveUser, InactiveUserAdmin)
admin.site.register(LogEntry, LogEntryAdmin)
# UserFellow is now shown as inline in User admin, not as separate admin
