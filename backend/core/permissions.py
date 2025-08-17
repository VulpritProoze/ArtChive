from rest_framework import permissions

class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow creator of an object to edit it.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to the creator of the movie
        return obj.creator == request.user

class IsOwnerOrSuperAdmin(permissions.BasePermission):
    """
    Permission that:
    - Grants full access to superusers
    - Restricts regular users to their own objects
    - Denies all other requests
    """
    def has_permission(self, request, view):
        # Allow all authenticated users to interact (create/list)
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Superadmins bypass all checks
        if request.user.is_superuser:
            return True
        # Regular users can only access their own objects
        return obj.author == request.user        # Check if the object's owner matches the requesting user

class IsSuperAdmin(permissions.BasePermission):
    """
    Allows access only to superadmin users (is_superuser=True).
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_superuser)

    def has_object_permission(self, request, view, obj):
        return bool(request.user and request.user.is_superuser)