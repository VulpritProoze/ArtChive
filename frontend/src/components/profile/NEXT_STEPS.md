# Profile Refactor - Next Steps

## ✅ Completed Implementation

All core functionality has been implemented:
- ✅ Backend endpoints created
- ✅ Frontend hooks created
- ✅ Component refactored
- ✅ Routing updated

---

## 🔍 Next Steps: Testing & Updates

### 1. **Manual Testing** (Priority: High)

#### Backend API Testing
- [ ] Test `GET /api/core/profile/by-username/<username>/`
  - Test with valid username
  - Test with invalid username (should return 404)
  - Test with special characters in username
  - Verify response includes `id` field for posts fetching

- [ ] Test `GET /api/post/posts/by-username/<username>/`
  - Test with valid username
  - Test with invalid username (should return 404)
  - Test pagination (`?page=2`, `?page_size=20`)
  - Verify queryset optimization (check query count in Django debug toolbar)

- [ ] Test optimized `GET /api/post/posts/me/<id>/`
  - Verify queryset matches PostDetailView pattern
  - Check query count is optimized

#### Frontend Testing
- [ ] Navigate to `/profile/<your-username>` - should show your profile
- [ ] Navigate to `/profile/<other-username>` - should show other user's profile
- [ ] Navigate to `/profile` - should redirect to `/profile/<your-username>`
- [ ] Navigate to `/profile/invalid-user` - should show "User not found" error
- [ ] Verify "Edit Profile" button only shows on own profile
- [ ] Verify "Create Post" button only shows on own profile
- [ ] Test infinite scrolling for posts
- [ ] Test posts meta data loading (hearts, praises, trophies)
- [ ] Test loading states (skeleton loaders)
- [ ] Test error states

---

### 2. **Update Post Author Links** (Priority: Medium)

**Files to check/update:**
- `frontend/src/components/common/posts-feature/post-header.tsx`
- Any other components that display post author information

**Action:**
Make post author names/avatars clickable to navigate to their profile:
```typescript
<Link to={`/profile/${postItem.author_username}`}>
  {/* Author avatar and name */}
</Link>
```

**Check these components:**
- [ ] `post-header.tsx` - Add link to author profile
- [ ] Comment components - Add links to comment author profiles
- [ ] Critique components - Add links to critique author profiles
- [ ] Any other places showing user avatars/names

---

### 3. **Update Navigation Links** (Priority: Low)

**Current Status:**
- ✅ `MainLayout.tsx` - Links to `/profile` (will redirect via NavigateToOwnProfile)
- ✅ `timeline.component.tsx` - "Edit Profile" links to `/profile/me`

**Optional Improvements:**
- [ ] Consider adding direct links to user profiles in notifications
- [ ] Consider adding profile links in collective member lists
- [ ] Consider adding profile links in search results (when search is implemented)

---

### 4. **Type Safety & Error Handling** (Priority: Medium)

**Check:**
- [ ] Verify TypeScript types for `UserProfilePublicSerializer` response
- [ ] Add proper error boundaries if needed
- [ ] Verify all error states are handled gracefully
- [ ] Check for any console errors/warnings

**Files to review:**
- `frontend/src/types/user.types.ts` - May need to add profile types
- `frontend/src/hooks/queries/use-user-profile.ts` - Verify error handling

---

### 5. **Performance Optimization** (Priority: Low)

**Check:**
- [ ] Verify React Query caching is working correctly
- [ ] Check if profile data cache invalidation is needed on profile updates
- [ ] Verify backend queryset optimization (use Django Debug Toolbar)
- [ ] Check for N+1 query issues

**Cache Invalidation:**
If user updates their profile, we may want to invalidate the profile cache:
```typescript
// In profile update mutation
queryClient.invalidateQueries({ queryKey: ['user-profile', username] });
```

---

### 6. **Edge Cases** (Priority: Medium)

**Test these scenarios:**
- [ ] User not logged in viewing a profile (should work, no Edit/Create buttons)
- [ ] User views their own profile while logged in (should show Edit/Create buttons)
- [ ] User views another user's profile (should not show Edit/Create buttons)
- [ ] Username with special characters (URL encoding)
- [ ] Very long usernames
- [ ] User with no posts (empty state)
- [ ] User with many posts (pagination)
- [ ] Profile loading while posts are loading
- [ ] Profile error while posts succeed (or vice versa)

---

### 7. **Documentation Updates** (Priority: Low)

**Update if needed:**
- [ ] API documentation (if using OpenAPI/Swagger)
- [ ] README files mentioning profile routes
- [ ] Any developer documentation

---

### 8. **Code Cleanup** (Priority: Low)

**Optional:**
- [ ] Remove any unused imports
- [ ] Remove commented-out code
- [ ] Verify all TODO comments are addressed
- [ ] Check for console.log statements to remove

---

## 🐛 Known Issues to Watch For

1. **Profile Picture Null Handling**
   - Verify `profileUser?.profile_picture || '/static_img/default-pic-min.jpg'` works correctly
   - Check if backend returns `null` or `undefined` for missing pictures

2. **Username Case Sensitivity**
   - Verify username matching is case-sensitive or case-insensitive as intended
   - Backend lookup should handle this correctly

3. **Route Conflicts**
   - Ensure `/profile/me` (edit profile) doesn't conflict with `/profile/:username`
   - Current setup should work: `/profile/me` is checked before `/profile/:username`

---

## 🚀 Quick Test Checklist

Run through this quick checklist:

```
□ Start backend server
□ Start frontend dev server
□ Login as user "testuser"
□ Navigate to /profile/testuser
  □ Profile loads correctly
  □ Posts load correctly
  □ Edit Profile button visible
  □ Create Post button visible
□ Navigate to /profile/otheruser (if exists)
  □ Profile loads correctly
  □ Posts load correctly
  □ Edit Profile button NOT visible
  □ Create Post button NOT visible
□ Navigate to /profile/invaliduser
  □ Shows "User not found" error
□ Navigate to /profile
  □ Redirects to /profile/testuser
□ Click on a post author name (if links are added)
  □ Navigates to that user's profile
```

---

## 📝 Notes

- The `/profile/me` route is still used for the edit profile page (Profile component)
- The `/profile/:username` route is for viewing profile timelines
- The `/profile` route redirects to the user's own profile timeline
- All existing post hooks and mutations remain unchanged
- Backend endpoints are public (no authentication required) for viewing profiles

---

## 🎯 Priority Order

1. **High Priority:** Manual testing of all functionality
2. **Medium Priority:** Add post author profile links, handle edge cases
3. **Low Priority:** Code cleanup, documentation, performance optimization

---

## 🔗 Related Files

- Backend: `backend/core/views.py`, `backend/core/serializers.py`, `backend/post/views.py`
- Frontend: `frontend/src/components/profile/timeline.component.tsx`, `frontend/src/hooks/queries/use-user-profile.ts`
- Routing: `frontend/src/App.tsx`

