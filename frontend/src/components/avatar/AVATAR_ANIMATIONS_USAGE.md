# Avatar Animations Usage Guide

## Quick Start

To make an avatar wave or dance, simply add the `animation` prop:

```tsx
import { AvatarDisplay, AvatarPreview } from '@components/avatar';

// Wave animation (continuous)
<AvatarDisplay 
  userId={user.id}
  animation="wave"
/>

// Dance animation (continuous)
<AvatarDisplay 
  userId={user.id}
  animation="dance"
/>

// Wave on hover only
<AvatarDisplay 
  userId={user.id}
  animation="wave"
  animateOnHover={true}
/>
```

## Available Animations

- `wave` - Side-to-side rotation (like waving)
- `dance` - Bounce with rotation
- `bounce` - Vertical bounce
- `pulse` - Scale in and out
- `spin` - Continuous rotation
- `wiggle` - Small random movements
- `celebration` - Jump and spin combo (runs once)
- `none` - No animation (default)

## Examples

### Example 1: Primary Avatar Waves on Hover
```tsx
<AvatarPreview
  avatar={avatar}
  animation={avatar.is_primary ? "wave" : "none"}
  animateOnHover={true}
/>
```

### Example 2: Always Dancing Avatar
```tsx
<AvatarDisplay 
  userId={user.id}
  animation="dance"
/>
```

### Example 3: Pulse for New Avatars
```tsx
<AvatarPreview
  avatar={avatar}
  animation={isNewAvatar ? "pulse" : "none"}
/>
```

### Example 4: Celebration Animation (One-time)
```tsx
// Use state to trigger celebration once
const [celebrate, setCelebrate] = useState(false);

useEffect(() => {
  if (someCondition) {
    setCelebrate(true);
    setTimeout(() => setCelebrate(false), 1200); // Animation duration
  }
}, [someCondition]);

<AvatarDisplay 
  userId={user.id}
  animation={celebrate ? "celebration" : "none"}
/>
```

## Components That Support Animations

1. **AvatarDisplay** - For displaying user's primary avatar
2. **AvatarPreview** - For preview cards in lists
3. **AvatarRenderer** - For SVG-rendered avatars

All support the same props:
- `animation?: AvatarAnimation` - The animation type
- `animateOnHover?: boolean` - If true, animation only plays on hover

## Where to Add Animations

### In Avatar Tab (Profile Page)
Already added! Primary avatars wave on hover in `avatar-tab-content.component.tsx`

### In Navigation Header
Replace the profile picture with AvatarDisplay:
```tsx
<AvatarDisplay 
  userId={user.id}
  size="sm"
  animation="wave"
  animateOnHover={true}
/>
```

### In Post Headers
```tsx
<AvatarDisplay 
  userId={post.author}
  size="sm"
  animation="none" // or "wave" for fun
/>
```

### In Comments
```tsx
<AvatarDisplay 
  userId={comment.author}
  size="xs"
  animation="wiggle"
  animateOnHover={true}
/>
```

## Tips

1. **Use hover animations** for less distraction: `animateOnHover={true}`
2. **Primary avatars** can have continuous animations to stand out
3. **Celebration** animation is great for achievements or milestones
4. **Respect user preferences** - animations automatically respect `prefers-reduced-motion`

