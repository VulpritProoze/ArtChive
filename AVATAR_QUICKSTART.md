# Avatar Feature - Quick Start Guide

## What is the Avatar Feature?

The Avatar feature allows users to create and manage custom avatars for their profile. Each user can:
- Create multiple avatars
- Designate one as their primary avatar
- Edit, duplicate, and delete avatars
- Store avatar designs as canvas JSON (512x512 pixels)

## Access the Feature

### Via Navigation
1. Click the **"Avatar"** link in the sidebar (with Palette icon 🎨)
2. You'll see your avatar list page

### Via Profile
1. Go to your profile
2. Click the **"Avatar"** tab
3. View and manage your avatars

## Creating Your First Avatar

1. **Navigate to Avatar Page**
   - Click "Avatar" in sidebar or
   - Visit `/avatar`

2. **Click "Create New Avatar"**
   - Opens the avatar editor

3. **Fill in Details**
   - **Name**: Give your avatar a name (required)
   - **Description**: Optional description
   - **Status**: Choose draft, active, or archived

4. **Save**
   - Click "Save Avatar"
   - Your first avatar becomes primary automatically

## Managing Avatars

### Setting Primary Avatar
- In the avatar list, click the "⋮" menu
- Select "Set as Primary"
- This avatar will be used across the platform

### Duplicating an Avatar
- Click "⋮" menu on any avatar
- Select "Duplicate"
- Creates a copy as a draft

### Deleting an Avatar
- Click "⋮" menu
- Select "Delete"
- Confirms before deleting
- If you delete your primary, another becomes primary automatically

### Editing an Avatar
- Click "Edit" button on any avatar card
- Opens the editor with existing data
- Make changes and save

## API Usage (For Developers)

### Endpoints

```
GET    /api/avatar/                    List all user's avatars
POST   /api/avatar/                    Create new avatar
GET    /api/avatar/{id}/               Get single avatar
PATCH  /api/avatar/{id}/               Update avatar
DELETE /api/avatar/{id}/               Delete avatar
POST   /api/avatar/{id}/set-primary/  Set as primary
POST   /api/avatar/{id}/duplicate/    Duplicate avatar
POST   /api/avatar/{id}/render/       Render canvas (placeholder)
```

### Example: Create Avatar

```bash
POST /api/avatar/
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Cool Avatar",
  "description": "My first avatar",
  "status": "active",
  "canvas_json": {
    "width": 512,
    "height": 512,
    "background": "#ffffff",
    "objects": []
  }
}
```

### Example: Set Primary

```bash
POST /api/avatar/{avatar_id}/set-primary/
Authorization: Bearer <token>
```

## Frontend Usage (For Developers)

### Import Service
```typescript
import { avatarService } from '@services/avatar.service';
```

### Use React Query Hooks
```typescript
import { 
  useAvatars,
  useAvatar,
  useCreateAvatar,
  useUpdateAvatar,
  useDeleteAvatar,
  useSetPrimaryAvatar,
  useDuplicateAvatar
} from '@hooks/queries/use-avatar';

// In component
const { data: avatars, isLoading } = useAvatars();
const { mutate: createAvatar } = useCreateAvatar();

// Create avatar
createAvatar({
  name: 'New Avatar',
  status: 'draft'
});
```

## Canvas JSON Structure

All avatars use a fixed 512x512 canvas:

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
      "radius": 100,
      "fill": "#ff0000"
    }
  ]
}
```

### Supported Object Types
- `rect` - Rectangles
- `circle` - Circles
- `text` - Text labels
- `image` - Images
- `line` - Lines/paths
- `group` - Grouped objects

## Future Enhancements

### Phase 2 (Coming Soon)
- Full canvas editor with drawing tools
- Live canvas rendering
- Default avatar templates
- Image upload support

### Phase 3 (Future)
- Export avatars as PNG/SVG
- Share avatars with community
- Avatar animations
- 3D avatar support

## Troubleshooting

### Avatar not showing
- Check if `rendered_image` field is populated
- Canvas rendering feature is placeholder currently

### Can't create avatar
- Ensure name is provided
- Canvas must be 512x512 if provided
- Check authentication

### Primary avatar not updating
- Only one primary per user allowed
- Backend automatically handles conflicts

## Support

For issues or questions:
1. Check the implementation docs: `AVATAR_IMPLEMENTATION.md`
2. Review the detailed plan: `frontend/src/components/gallery/AVATAR_PLAN.md`
3. Check backend logs: `docker-compose logs backend`
4. Check frontend logs: `docker-compose logs frontend`

