# Performance Optimization Plan for ArtChive

## 🔴 Critical Issues Found

### 1. **Context Providers Loading Everything on Mount**
- **Problem**: All contexts (Auth, Notification, Post) fetch data immediately when app loads
- **Impact**: Multiple API calls blocking initial render
- **Solution**: Defer non-critical data fetching

### 2. **Heavy Components Not Lazy Loaded**
- **Problem**: GalleryEditor, CollectiveAdmin, and other heavy components load immediately
- **Impact**: Large bundle size, slow initial load
- **Solution**: Implement route-based code splitting

### 3. **WebSocket Connection on Mount**
- **Problem**: NotificationProvider connects WebSocket immediately
- **Impact**: Unnecessary connection overhead
- **Solution**: Lazy connect WebSocket only when needed

### 4. **No Memoization**
- **Problem**: Components re-render unnecessarily
- **Impact**: Poor performance on re-renders
- **Solution**: Add React.memo and useMemo where needed

## ✅ Solutions to Implement

### Priority 1: Lazy Load Heavy Components

```typescript
// App.tsx - Lazy load heavy components
const GalleryEditor = lazy(() => import("@components/gallery/editor.component"));
const CollectiveAdmin = lazy(() => import("@components/collective/collective-admin.component"));
const GalleryIndex = lazy(() => import("@components/gallery/index.component"));
const MyGalleries = lazy(() => import("@components/gallery/galleries.component"));
```

### Priority 2: Defer Non-Critical Context Initialization

```typescript
// auth-context.tsx - Only fetch user when needed
useEffect(() => {
  // Only fetch if we have a token
  const hasToken = document.cookie.includes('access_token');
  if (hasToken) {
    initializeAuth();
  } else {
    setInitialized(true); // Mark as initialized even without user
  }
}, []);
```

### Priority 3: Lazy Connect WebSocket

```typescript
// notification-context.tsx - Connect WebSocket only when user opens notifications
const connectWebSocket = useCallback(() => {
  if (!isAuthenticated || !shouldConnect) return; // Add shouldConnect flag
  // ... existing connection logic
}, [isAuthenticated, shouldConnect]);
```

### Priority 4: Add React.memo to Expensive Components

```typescript
// PostCard, Comment components, etc.
export default React.memo(PostCard);
```

### Priority 5: Optimize Bundle Size

```typescript
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        'ui-vendor': ['konva', 'react-konva', 'framer-motion'],
        'form-vendor': ['react-hook-form', 'zod'],
      }
    }
  }
}
```

### Priority 6: Database Query Optimization

- Already using select_related and prefetch_related ✅
- Consider adding database indexes for frequently queried fields
- Use pagination consistently (already doing this ✅)

### Priority 7: Image Optimization

- Lazy load images
- Use WebP format
- Implement image placeholders

## 📊 Expected Improvements

- **Initial Load Time**: 40-60% reduction
- **Time to Interactive**: 50-70% improvement
- **Bundle Size**: 30-40% reduction with code splitting
- **Memory Usage**: 20-30% reduction with memoization

## 🚀 Implementation Order

1. Lazy load heavy components (Quick win, 30 min)
2. Defer context initialization (Medium effort, 1 hour)
3. Add React.memo to expensive components (Medium effort, 2 hours)
4. Optimize bundle splitting (Quick win, 30 min)
5. Lazy connect WebSocket (Quick win, 30 min)

