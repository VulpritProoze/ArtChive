# Performance Fixes for Post Mutations

## Issues Fixed

### 1. Toast Notifications for Praise and Trophy
**Problem**: No success/error toasts when praising or awarding trophies.

**Solution**: Added toast notifications to `usePraisePost` and `useAwardTrophy` mutations:
- ✅ Success toast on successful praise
- ✅ Success toast on successful trophy award
- ✅ Error toast on failure for both

### 2. Post List Refetch Performance
**Problem**: Praising or awarding a trophy invalidated the entire post list, causing slow updates on the post detail page.

**Solution**: Implemented optimistic cache updates instead of invalidating the entire post list:
- ✅ Use `setQueriesData` to update post in cache directly
- ✅ No refetch needed - UI updates immediately
- ✅ Only invalidate specific queries (praise/trophy lists)
- ✅ Much faster - no network request for post list

## Implementation Details

### Optimistic Updates
The `updatePostInCache` function updates the post in all post list caches without refetching:
- Updates praise count and `is_praised_by_user` flag
- Updates trophy counts and `user_awarded_trophies` array
- Updates `total_trophy_count`

### Cache Invalidation Strategy
- ❌ **REMOVED**: `invalidatePosts()` for praise/trophy mutations
- ✅ **KEPT**: Optimistic updates via `setQueriesData`
- ✅ **KEPT**: Invalidation of specific queries (praise/trophy lists)

## Future Optimization

The post detail page (`post-detail.component.tsx`) still uses manual fetch with `useState`. To fully optimize:
- Convert to React Query hook (`usePostDetail`)
- Can then use optimistic updates for detail page too
- Or add manual refetch trigger when mutations succeed

## Files Modified

- `frontend/src/hooks/mutations/use-post-mutations.ts`
  - Added toast imports
  - Added `updatePostInCache` helper function
  - Updated `usePraisePost` with optimistic updates and toasts
  - Updated `useAwardTrophy` with optimistic updates and toasts

