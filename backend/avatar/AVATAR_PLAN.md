# Avatar System - Implementation Plan

## Overview

The Avatar system allows users to create custom avatars using a canvas-based editor similar to the Gallery Editor. Users can draw, compose, and customize their avatars using various shapes, images, and text elements.

## Design Philosophy

- **Fixed Canvas Size**: All avatars use a fixed 512x512 pixel canvas for consistency
- **Multiple Avatars**: Users can create and save multiple avatars
- **Primary Avatar**: One avatar can be designated as the user's active/primary avatar
- **Canvas-Based Editing**: Reuses the Gallery Editor architecture for consistency
- **Default Avatars**: System provides default avatars via fixtures that users can duplicate

---

## Database Models

### Avatar Model

**File**: `backend/avatar/models.py`

```python
import uuid
from django.db import models
from core.models import User
from common.utils import choices
from avatar.manager import AvatarManager


class Avatar(models.Model):
    """
    User avatar model with canvas-based editing support.
    Fixed canvas size: 512x512 pixels
    """
    
    # Constants
    CANVAS_WIDTH = 512
    CANVAS_HEIGHT = 512
    
    # Primary Key
    avatar_id = models.UUIDField(
        primary_key=True, 
        default=uuid.uuid4, 
        editable=False
    )
    
    # User Relationship (one user can have multiple avatars)
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE,
        related_name='avatars',
        help_text='Owner of this avatar'
    )
    
    # Avatar Metadata
    name = models.CharField(
        max_length=255,
        default='My Avatar',
        help_text='User-friendly name for the avatar'
    )
    
    description = models.TextField(
        max_length=1000,
        blank=True,
        null=True,
        help_text='Optional description of the avatar'
    )
    
    # Status Management
    status = models.CharField(
        max_length=20,
        default=choices.AVATAR_STATUS.draft,
        choices=choices.AVATAR_STATUS_CHOICES,
        help_text='Current status: draft/active/archived'
    )
    
    is_primary = models.BooleanField(
        default=False,
        help_text='Whether this is the user\'s primary/active avatar'
    )
    
    # Canvas Data (similar to Gallery model)
    canvas_json = models.JSONField(
        null=True,
        blank=True,
        help_text='Stores the avatar canvas state with all objects (512x512)'
    )
    
    # Rendered Outputs
    rendered_image = models.ImageField(
        upload_to='avatar/images/rendered/',
        blank=True,
        null=True,
        help_text='Full size 512x512 rendered avatar image (PNG/WebP)'
    )
    
    thumbnail = models.ImageField(
        upload_to='avatar/images/thumbnails/',
        blank=True,
        null=True,
        help_text='128x128 thumbnail for avatar selection UI'
    )
    
    # Soft Deletion
    is_deleted = models.BooleanField(
        default=False,
        help_text='Soft delete flag'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Custom Manager
    objects = AvatarManager()
    
    class Meta:
        ordering = ['-is_primary', '-updated_at']
        indexes = [
            models.Index(fields=['user', 'is_deleted']),
            models.Index(fields=['user', 'is_primary']),
        ]
        verbose_name = 'Avatar'
        verbose_name_plural = 'Avatars'
    
    def __str__(self):
        primary_indicator = " (Primary)" if self.is_primary else ""
        return f"{self.name} - {self.user.username}{primary_indicator}"
    
    def delete(self, *args, **kwargs):
        """Soft delete implementation"""
        self.is_deleted = True
        self.save()
    
    def save(self, *args, **kwargs):
        """
        Ensure only one primary avatar per user.
        When setting an avatar as primary, unset all others.
        """
        if self.is_primary and self.user:
            # Set all other avatars for this user to non-primary
            Avatar.objects.filter(
                user=self.user, 
                is_primary=True
            ).exclude(
                avatar_id=self.avatar_id
            ).update(is_primary=False)
        super().save(*args, **kwargs)
    
    def get_canvas_dimensions(self):
        """Returns the fixed canvas dimensions"""
        return {
            'width': self.CANVAS_WIDTH,
            'height': self.CANVAS_HEIGHT
        }
```

### Proxy Models for Admin

**File**: `backend/avatar/models.py`

```python
class ActiveAvatar(Avatar):
    """Proxy model for viewing only active (non-deleted) avatars in admin"""
    class Meta:
        proxy = True
        verbose_name = 'Active Avatar'
        verbose_name_plural = 'Active Avatars'


class InactiveAvatar(Avatar):
    """Proxy model for viewing only deleted avatars in admin"""
    class Meta:
        proxy = True
        verbose_name = 'Inactive Avatar'
        verbose_name_plural = 'Inactive Avatars'
```

---

## Custom Manager

**File**: `backend/avatar/manager.py`

```python
from django.db import models


class AvatarManager(models.Manager):
    """Custom manager for Avatar model with common queries"""
    
    def active(self):
        """Get non-deleted avatars"""
        return self.filter(is_deleted=False)
    
    def inactive(self):
        """Get deleted avatars"""
        return self.filter(is_deleted=True)
    
    def for_user(self, user):
        """Get all active avatars for a specific user"""
        return self.active().filter(user=user)
    
    def primary_for_user(self, user):
        """Get the primary avatar for a user"""
        return self.active().filter(user=user, is_primary=True).first()
    
    def by_status(self, status):
        """Get avatars by status (draft/active/archived)"""
        return self.active().filter(status=status)
```

---

## Choices Configuration

**File**: `backend/common/utils/choices.py`

Add the following avatar-related choices:

```python
# Avatar Status Choices
AVATAR_STATUS_CHOICES = (
    ('draft', 'Draft'),
    ('active', 'Active'),
    ('archived', 'Archived'),
)

AVATAR_STATUS = SimpleNamespace(
    draft='draft',
    active='active',
    archived='archived'
)
```

---

## Canvas JSON Structure

### Format

All avatars use a fixed 512x512 canvas with the following JSON structure:

```json
{
  "width": 512,
  "height": 512,
  "background": "#ffffff",
  "objects": [
    {
      "id": "obj-1",
      "type": "circle",
      "x": 256,
      "y": 256,
      "radius": 200,
      "fill": "#ffcc99",
      "name": "Face"
    },
    {
      "id": "obj-2",
      "type": "circle",
      "x": 220,
      "y": 230,
      "radius": 15,
      "fill": "#000000",
      "name": "Left Eye"
    },
    {
      "id": "obj-3",
      "type": "circle",
      "x": 292,
      "y": 230,
      "radius": 15,
      "fill": "#000000",
      "name": "Right Eye"
    },
    {
      "id": "obj-4",
      "type": "line",
      "points": [220, 280, 256, 290, 292, 280],
      "stroke": "#000000",
      "strokeWidth": 3,
      "name": "Smile"
    }
  ]
}
```

### Supported Object Types

Following the Gallery Editor pattern, avatars support:

- **Rectangle** (`rect`): Shapes, backgrounds
- **Circle** (`circle`): Faces, eyes, decorations
- **Text** (`text`): Labels, names
- **Image** (`image`): Photos, uploaded graphics
- **Line** (`line`): Mouths, eyebrows, decorative lines
- **Group** (`group`): Grouped objects (e.g., complete face feature)

**Note**: All avatar components are created in the client-side editor, just like the Gallery Editor. There is no separate asset/component model.

---

## API Endpoints

**Note**: Full implementation with prefetch_related queries and business logic is in the **Views** section below.

**File**: `backend/avatar/views.py`

### Avatar CRUD

```python
# List user's avatars
GET /api/avatar/
Response: [
    {
        "avatar_id": "uuid",
        "name": "My Avatar",
        "description": "...",
        "status": "active",
        "is_primary": true,
        "rendered_image": "url",
        "thumbnail": "url",
        "created_at": "timestamp",
        "updated_at": "timestamp"
    }
]

# Create new avatar
POST /api/avatar/
Body: {
    "name": "New Avatar",
    "description": "Optional",
    "canvas_json": {...}  # Optional, can start empty
}
Response: Avatar object

# Get single avatar with full canvas data
GET /api/avatar/{avatar_id}/
Response: {
    "avatar_id": "uuid",
    "name": "My Avatar",
    "canvas_json": {...},  # Full canvas state
    "rendered_image": "url",
    ...
}

# Update avatar (including canvas data)
PATCH /api/avatar/{avatar_id}/
Body: {
    "name": "Updated Name",  # Optional
    "canvas_json": {...},     # Optional
    "status": "active"        # Optional
}
Response: Updated avatar object

# Soft delete avatar
DELETE /api/avatar/{avatar_id}/
Response: 204 No Content
```

### Avatar Actions

```python
# Set avatar as primary
POST /api/avatar/{avatar_id}/set-primary/
Response: {
    "message": "Avatar set as primary",
    "avatar_id": "uuid"
}

# Render avatar (generate rendered_image and thumbnail from canvas_json)
POST /api/avatar/{avatar_id}/render/
Response: {
    "rendered_image": "url",
    "thumbnail": "url"
}

# Duplicate avatar
POST /api/avatar/{avatar_id}/duplicate/
Body: {
    "name": "Copy of My Avatar"  # Optional
}
Response: New avatar object (copy)
```

---

## Views

**File**: `backend/avatar/views.py`

**Important Principles**:
1. **Use GenericAPIView for standard CRUD operations**
2. **Use APIView for complex operations**
3. **Use prefetch_related/select_related** for query optimization
4. **All business logic in views** (saving, deletion, validation)
5. **Serializers only for serialization** (no save/delete logic in serializers)

```python
from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from avatar.models import Avatar
from avatar.serializers import AvatarListSerializer, AvatarDetailSerializer


# ============================================================================
# User Avatar Views
# ============================================================================

class AvatarListCreateView(generics.ListCreateAPIView):
    """
    GET /api/avatar/
    List all active avatars for the current user.
    
    POST /api/avatar/
    Create new avatar.
    """
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Optimized queryset with select_related for user.
        Only returns active (non-deleted) avatars for the current user.
        """
        return Avatar.objects.filter(
            user=self.request.user,
            is_deleted=False
        ).select_related('user').order_by('-is_primary', '-updated_at')
    
    def get_serializer_class(self):
        """Use list serializer for GET, detail for POST"""
        if self.request.method == 'GET':
            return AvatarListSerializer
        return AvatarDetailSerializer
    
    def post(self, request, *args, **kwargs):
        """
        Create new avatar.
        Business logic: Set user, validate canvas_json, handle defaults.
        """
        # Extract and validate data
        name = request.data.get('name', 'My Avatar')
        description = request.data.get('description', '')
        canvas_json = request.data.get('canvas_json', None)
        
        # Validate canvas_json if provided
        if canvas_json:
            if not isinstance(canvas_json, dict):
                return Response(
                    {'error': 'canvas_json must be a valid JSON object'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            # Ensure canvas dimensions are correct
            if canvas_json.get('width') != 512 or canvas_json.get('height') != 512:
                return Response(
                    {'error': 'Canvas dimensions must be 512x512'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Create avatar (business logic in view)
        avatar = Avatar.objects.create(
            user=request.user,
            name=name,
            description=description,
            canvas_json=canvas_json,
            status='draft'
        )
        
        # Serialize and return
        serializer = AvatarDetailSerializer(avatar)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AvatarDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET /api/avatar/{avatar_id}/
    Get single avatar with full canvas data.
    
    PATCH /api/avatar/{avatar_id}/
    Update avatar.
    
    DELETE /api/avatar/{avatar_id}/
    Soft delete avatar.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = AvatarDetailSerializer
    lookup_field = 'avatar_id'
    
    def get_queryset(self):
        """Optimized queryset with select_related"""
        return Avatar.objects.filter(
            user=self.request.user,
            is_deleted=False
        ).select_related('user')
    
    def patch(self, request, *args, **kwargs):
        """
        Update avatar.
        Business logic: Validate ownership, update fields, handle canvas_json.
        """
        avatar = get_object_or_404(
            self.get_queryset(),
            avatar_id=kwargs['avatar_id']
        )
        
        # Update fields (business logic in view)
        if 'name' in request.data:
            avatar.name = request.data['name']
        
        if 'description' in request.data:
            avatar.description = request.data['description']
        
        if 'status' in request.data:
            avatar.status = request.data['status']
        
        if 'canvas_json' in request.data:
            canvas_json = request.data['canvas_json']
            # Validate canvas_json
            if not isinstance(canvas_json, dict):
                return Response(
                    {'error': 'canvas_json must be a valid JSON object'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            avatar.canvas_json = canvas_json
        
        # Save (business logic in view, not serializer)
        avatar.save()
        
        # Serialize and return
        serializer = self.get_serializer(avatar)
        return Response(serializer.data)
    
    def delete(self, request, *args, **kwargs):
        """
        Soft delete avatar.
        Business logic: Soft delete, unset primary if needed.
        """
        avatar = get_object_or_404(
            self.get_queryset(),
            avatar_id=kwargs['avatar_id']
        )
        
        # Business logic: Soft delete
        avatar.is_deleted = True
        avatar.is_primary = False  # Can't be primary if deleted
        avatar.save()
        
        return Response(status=status.HTTP_204_NO_CONTENT)


class AvatarSetPrimaryView(APIView):
    """
    POST /api/avatar/{avatar_id}/set-primary/
    Set avatar as primary.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, avatar_id):
        """
        Business logic: Unset other primary avatars, set this one.
        """
        avatar = get_object_or_404(
            Avatar.objects.select_related('user'),
            avatar_id=avatar_id,
            user=request.user,
            is_deleted=False
        )
        
        # Business logic: Set as primary (model save() handles unsetting others)
        avatar.is_primary = True
        avatar.save()
        
        return Response({
            'message': 'Avatar set as primary',
            'avatar_id': str(avatar.avatar_id)
        })


class AvatarDuplicateView(APIView):
    """
    POST /api/avatar/{avatar_id}/duplicate/
    Duplicate an avatar (works for user avatars or default avatars with user=null).
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, avatar_id):
        """
        Business logic: Create copy with new ID, set user, handle name.
        """
        # Get source avatar (can be user's avatar or default avatar with user=null)
        source_avatar = get_object_or_404(
            Avatar.objects.select_related('user'),
            avatar_id=avatar_id,
            is_deleted=False
        )
        
        # Verify permission: user can duplicate their own avatars or default avatars
        if source_avatar.user is not None and source_avatar.user != request.user:
            return Response(
                {'error': 'You can only duplicate your own avatars or default avatars'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Business logic: Create duplicate
        new_name = request.data.get('name', f"Copy of {source_avatar.name}")
        
        new_avatar = Avatar.objects.create(
            user=request.user,  # Always assign to current user
            name=new_name,
            description=source_avatar.description,
            canvas_json=source_avatar.canvas_json,
            status='draft',
            is_primary=False
        )
        
        # Serialize and return
        serializer = AvatarDetailSerializer(new_avatar)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AvatarRenderView(APIView):
    """
    POST /api/avatar/{avatar_id}/render/
    Generate rendered_image and thumbnail from canvas_json.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, avatar_id):
        """
        Business logic: Render canvas to image, save files.
        
        Note: This is a placeholder. Actual implementation would use
        a canvas rendering library (e.g., Pillow, cairo, or headless browser).
        """
        avatar = get_object_or_404(
            Avatar.objects.select_related('user'),
            avatar_id=avatar_id,
            user=request.user,
            is_deleted=False
        )
        
        if not avatar.canvas_json:
            return Response(
                {'error': 'Cannot render avatar without canvas data'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # TODO: Implement actual canvas rendering logic
        # This would involve:
        # 1. Parse canvas_json
        # 2. Render to 512x512 image using rendering library
        # 3. Save as rendered_image
        # 4. Create 128x128 thumbnail
        # 5. Save as thumbnail
        
        # Placeholder response
        return Response({
            'message': 'Render functionality not yet implemented',
            'rendered_image': avatar.rendered_image.url if avatar.rendered_image else None,
            'thumbnail': avatar.thumbnail.url if avatar.thumbnail else None
        })


# ============================================================================
# Default Avatar Views (user=null)
# ============================================================================

class DefaultAvatarListView(generics.ListAPIView):
    """
    GET /api/avatar/defaults/
    List all default avatars available for duplication.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = AvatarListSerializer
    
    def get_queryset(self):
        """
        Get all default avatars (user=null, not deleted).
        Optimized query.
        """
        return Avatar.objects.filter(
            user__isnull=True,
            is_deleted=False
        ).order_by('name')


class DefaultAvatarDetailView(generics.RetrieveAPIView):
    """
    GET /api/avatar/defaults/{avatar_id}/
    Get single default avatar with full canvas data.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = AvatarDetailSerializer
    lookup_field = 'avatar_id'
    
    def get_queryset(self):
        """Get default avatars only"""
        return Avatar.objects.filter(
            user__isnull=True,
            is_deleted=False
        )
```

### URL Configuration

**File**: `backend/avatar/urls.py`

```python
from django.urls import path
from avatar import views

urlpatterns = [
    # User avatars
    path('', views.AvatarListCreateView.as_view(), name='avatar-list-create'),
    path('<uuid:avatar_id>/', views.AvatarDetailView.as_view(), name='avatar-detail'),
    path('<uuid:avatar_id>/set-primary/', views.AvatarSetPrimaryView.as_view(), name='avatar-set-primary'),
    path('<uuid:avatar_id>/duplicate/', views.AvatarDuplicateView.as_view(), name='avatar-duplicate'),
    path('<uuid:avatar_id>/render/', views.AvatarRenderView.as_view(), name='avatar-render'),
    
    # Default avatars
    path('defaults/', views.DefaultAvatarListView.as_view(), name='default-avatar-list'),
    path('defaults/<uuid:avatar_id>/', views.DefaultAvatarDetailView.as_view(), name='default-avatar-detail'),
]
```

**Main URLs**: Add to `backend/artchive/urls.py`:
```python
path('api/avatar/', include('avatar.urls')),
```

---

## Serializers

**File**: `backend/avatar/serializers.py`

**Important**: Serializers are **strictly for serialization only**. No business logic, no save/delete methods.

```python
from rest_framework import serializers
from avatar.models import Avatar


class AvatarListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for avatar lists (no canvas_json).
    Used for list views where full canvas data is not needed.
    READ-ONLY: No create/update logic here.
    """
    class Meta:
        model = Avatar
        fields = [
            'avatar_id', 'name', 'description', 'status', 
            'is_primary', 'rendered_image', 'thumbnail',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'avatar_id', 'name', 'description', 'status',
            'is_primary', 'rendered_image', 'thumbnail',
            'created_at', 'updated_at'
        ]


class AvatarDetailSerializer(serializers.ModelSerializer):
    """
    Full serializer with canvas_json for editing.
    Used for detail views and when full canvas data is needed.
    READ-ONLY: No create/update logic here.
    """
    canvas_dimensions = serializers.SerializerMethodField()
    
    class Meta:
        model = Avatar
        fields = [
            'avatar_id', 'name', 'description', 'status',
            'is_primary', 'canvas_json', 'canvas_dimensions',
            'rendered_image', 'thumbnail',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'avatar_id', 'created_at', 'updated_at', 'canvas_dimensions'
        ]
    
    def get_canvas_dimensions(self, obj):
        """Return fixed canvas dimensions (512x512)"""
        return obj.get_canvas_dimensions()
```

**Key Points**:
- ✅ Serializers only transform data to/from JSON
- ✅ All fields marked as read_only where appropriate
- ✅ No `create()` or `update()` methods in serializers
- ✅ No validation logic beyond field-level validation
- ✅ Business logic stays in views

---

## Frontend Integration

### Avatar Editor Component

The avatar editor will reuse most Gallery Editor components with modifications:

**Key Differences from Gallery Editor**:

1. **Fixed Canvas Size**: 512x512 (not resizable)
2. **Circular Preview**: Show circular crop preview
3. **Simplified Toolbar**: Avatar-focused tools
4. **Export Button**: Generate final rendered image

### Component Structure

```
avatar-editor/
├── AvatarEditor.tsx              # Main orchestrator (similar to GalleryEditor)
├── AvatarCanvas.tsx              # Canvas with fixed 512x512 size
├── AvatarToolbar.tsx             # Simplified toolbar for avatars
├── CircularPreview.tsx           # Show circular crop preview
└── (Reuse from gallery-editor)
    ├── CanvasStage.tsx           # Canvas rendering
    ├── CanvasTransformer.tsx     # Object transformation
    ├── PropertiesPanel.tsx       # Property editing
    └── LayerPanel.tsx            # Layer management
```

### Avatar Editor Configuration

```typescript
// Fixed canvas dimensions
const AVATAR_CANVAS_WIDTH = 512;
const AVATAR_CANVAS_HEIGHT = 512;

// Initialize avatar editor
const AvatarEditor = ({ avatarId }: { avatarId: string }) => {
  const editorState = useCanvasState({
    avatarId: avatarId,
    initialState: {
      width: AVATAR_CANVAS_WIDTH,   // Fixed
      height: AVATAR_CANVAS_HEIGHT, // Fixed
      objects: [],
    },
    autoSaveInterval: 60000,
  });
  
  // Disable canvas resize
  // Users cannot change canvas dimensions
  
  return (
    <div className="avatar-editor">
      <AvatarToolbar />
      <AvatarCanvas 
        width={AVATAR_CANVAS_WIDTH}
        height={AVATAR_CANVAS_HEIGHT}
        editorState={editorState}
      />
      <CircularPreview canvas={editorState} />
    </div>
  );
};
```

---

## Migration Strategy

### Step 1: Add Avatar Choices to choices.py

Add to `backend/common/utils/choices.py`:

```python
from types import SimpleNamespace

# Avatar Status Choices
AVATAR_STATUS_CHOICES = (
    ('draft', 'Draft'),
    ('active', 'Active'),
    ('archived', 'Archived'),
)

AVATAR_STATUS = SimpleNamespace(
    draft='draft',
    active='active',
    archived='archived'
)
```

### Step 2: Create Migration

```bash
python manage.py makemigrations avatar
```

### Step 3: Apply Migration

```bash
python manage.py migrate avatar
```

### Step 4: Create Default Avatar Fixtures

Create fixture file for default avatars that users can duplicate.

**File**: `backend/avatar/fixtures/default_avatars.json`

```json
[
    {
        "model": "avatar.avatar",
        "pk": "00000000-0000-0000-0000-000000000001",
        "fields": {
            "user": null,
            "name": "Simple Face",
            "description": "A friendly simple face avatar",
            "status": "active",
            "is_primary": false,
            "canvas_json": {
                "width": 512,
                "height": 512,
                "background": "#ffffff",
                "objects": [
                    {
                        "id": "face",
                        "type": "circle",
                        "x": 256,
                        "y": 256,
                        "radius": 180,
                        "fill": "#ffcc99",
                        "name": "Face"
                    },
                    {
                        "id": "left-eye",
                        "type": "circle",
                        "x": 220,
                        "y": 230,
                        "radius": 15,
                        "fill": "#000000",
                        "name": "Left Eye"
                    },
                    {
                        "id": "right-eye",
                        "type": "circle",
                        "x": 292,
                        "y": 230,
                        "radius": 15,
                        "fill": "#000000",
                        "name": "Right Eye"
                    },
                    {
                        "id": "smile",
                        "type": "line",
                        "points": [220, 280, 256, 290, 292, 280],
                        "stroke": "#000000",
                        "strokeWidth": 3,
                        "name": "Smile"
                    }
                ]
            },
            "rendered_image": "",
            "thumbnail": "",
            "is_deleted": false,
            "created_at": "2025-01-01T00:00:00Z",
            "updated_at": "2025-01-01T00:00:00Z"
        }
    }
]
```

**Note**: Fixtures with `user: null` represent default/template avatars that can be duplicated by users.

### Step 5: Load Fixtures

```bash
python manage.py loaddata default_avatars
```

---

## Admin Configuration

**File**: `backend/avatar/admin.py`

```python
from django.contrib import admin
from avatar.models import Avatar, ActiveAvatar, InactiveAvatar


@admin.register(ActiveAvatar)
class ActiveAvatarAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'status', 'is_primary', 'created_at', 'updated_at']
    list_filter = ['status', 'is_primary', 'created_at']
    search_fields = ['name', 'user__username', 'user__email']
    readonly_fields = ['avatar_id', 'created_at', 'updated_at']
    
    def get_queryset(self, request):
        return self.model.objects.filter(is_deleted=False)


@admin.register(InactiveAvatar)
class InactiveAvatarAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'status', 'created_at', 'updated_at']
    list_filter = ['status', 'created_at']
    search_fields = ['name', 'user__username', 'user__email']
    readonly_fields = ['avatar_id', 'created_at', 'updated_at']
    
    def get_queryset(self, request):
        return self.model.objects.filter(is_deleted=True)
```

---

## File Upload Paths

All avatar images follow this structure:

```
media/
└── avatar/
    └── images/
        ├── rendered/
        │   ├── {uuid}.png          # Full-size rendered avatars (512x512)
        │   └── {uuid}.webp         # Alternative format
        └── thumbnails/
            ├── {uuid}.png          # Thumbnails (128x128)
            └── {uuid}.webp         # Alternative format
```

**Model Fields**:
- `rendered_image`: `upload_to='avatar/images/rendered/'`
- `thumbnail`: `upload_to='avatar/images/thumbnails/'`

---

## Testing Checklist

### Backend Tests

- [ ] Avatar CRUD operations
- [ ] Primary avatar enforcement (only one per user)
- [ ] Soft deletion
- [ ] Canvas JSON validation
- [ ] Duplicate avatar functionality
- [ ] Render endpoint functionality
- [ ] Load default avatars from fixtures

### Frontend Tests

- [ ] Avatar editor loads with 512x512 canvas
- [ ] Canvas size is fixed (not resizable)
- [ ] Add/edit/delete objects (rect, circle, text, image, line, group)
- [ ] Save avatar (auto-save and manual)
- [ ] Set as primary avatar
- [ ] Duplicate avatar
- [ ] Circular preview displays correctly
- [ ] Export/render functionality

---

## Future Enhancements

### Phase 2 Features

1. **AI-Generated Avatars**: Use AI to generate avatar suggestions
2. **Avatar Animations**: Support animated avatars (GIF/WebP)
3. **3D Avatars**: Integrate 3D avatar creation
4. **Social Features**: Like, comment on avatars
5. **Avatar Collections**: Group avatars into collections
6. **Export Formats**: SVG, PDF export options

### Performance Optimizations

1. **Lazy Loading**: Load avatars on demand
2. **Image Optimization**: Compress rendered images
3. **Caching**: Cache rendered avatars
4. **CDN**: Serve avatar images from CDN

---

## Summary

This plan provides a complete avatar system that:

✅ Uses a fixed 512x512 canvas for consistency  
✅ Allows multiple avatars per user with primary designation  
✅ Reuses Gallery Editor architecture for maintainability  
✅ Uses fixtures for default avatars (no separate template model)  
✅ Defines choices in `choices.py` following project conventions  
✅ Uses proper upload paths (`avatar/images/`, `avatar/images/thumbnails/`)  
✅ All components created in client editor (no asset model needed)  
✅ Implements soft deletion and audit trails  
✅ Provides comprehensive API for frontend integration  
✅ Follows Django best practices  

The system is designed to be scalable, maintainable, and user-friendly while maintaining consistency with the existing Gallery system.
