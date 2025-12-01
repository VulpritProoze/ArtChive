from avatar.views import AvatarListCreateView
from django.urls import reverse
from django.conf import settings

print("=" * 50)
print("AVATAR APP DIAGNOSTIC")
print("=" * 50)

# Check if avatar is in INSTALLED_APPS
print(f"\n1. Avatar in INSTALLED_APPS: {'avatar' in settings.INSTALLED_APPS}")

# Check URL reverse
try:
    url = reverse('avatar-list-create')
    print(f"2. Avatar URL resolves to: {url}")
except Exception as e:
    print(f"2. URL resolution failed: {e}")

# Check view
print(f"3. AvatarListCreateView imported: {AvatarListCreateView is not None}")

# Check models
try:
    from avatar.models import Avatar
    print(f"4. Avatar model imported: True")
    print(f"5. Avatar count in database: {Avatar.objects.count()}")
except Exception as e:
    print(f"4. Avatar model import failed: {e}")

# Check serializers
try:
    from avatar.serializers import AvatarListSerializer
    print(f"6. AvatarListSerializer imported: True")
except Exception as e:
    print(f"6. Serializer import failed: {e}")

print("\n" + "=" * 50)
print("DIAGNOSTIC COMPLETE")
print("=" * 50)

