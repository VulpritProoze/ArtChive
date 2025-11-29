# Profile Section Refactor Plan

## Overview
Convert the profile timeline component into a dynamic profile page that can display any user's profile based on a username URL parameter, with conditional UI elements based on whether the viewer is the profile owner.

---

## 1. Frontend Changes

### 1.1 Convert Timeline Component to Username-Based Profile Page

**File:** `frontend/src/components/profile/timeline.component.tsx`

**Changes:**
- Add `useParams` from `react-router-dom` to get `username` from URL
- Change route from `/profile/timeline` to `/profile/timeline/:username`
- Replace `useAuth().user` with fetched user data from new endpoint
- Conditionally show "Edit Profile" and "Create Post" buttons only if `currentUser?.username === username`
- Update all user data references to use fetched profile data instead of auth context

**Key Implementation Points:**
```typescript
// Get username from URL
const { username } = useParams<{ username: string }>();
const { user: currentUser } = useAuth(); // For comparison only

// Fetch profile data
const { data: profileUser, isLoading: profileLoading } = useUserProfile(username);

// Conditional rendering
const isOwnProfile = currentUser?.username === username;
```

---

### 1.2 Create User Profile Hook

**New File:** `frontend/src/hooks/queries/use-user-profile.ts`

**Purpose:** Fetch user profile data by username

**Implementation:**
```typescript
export const useUserProfile = (username: string | undefined) => {
  return useQuery({
    queryKey: ['user-profile', username],
    queryFn: async () => {
      const response = await core.get(`profile/by-username/${username}/`);
      return response.data;
    },
    enabled: Boolean(username),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
```

---

### 1.3 Update Posts Hook to Support Username

**File:** `frontend/src/hooks/queries/use-posts.ts`

**Changes:**
- Add optional `username` parameter alongside existing `userId` parameter
- Update query key to include username
- Update API call to use username endpoint when provided

**Implementation:**
```typescript
interface UsePostsOptions {
  userId?: number;
  username?: string; // NEW
  channelId?: string;
  enabled?: boolean;
}

// In hook implementation:
const endpoint = username 
  ? `posts/by-username/${username}/`
  : userId 
    ? `posts/by-user/${userId}/`
    : 'posts/';
```

---

### 1.4 Update Routing

**File:** `frontend/src/App.tsx` or routing configuration file

**Changes:**
- Update route from `/profile/timeline` to `/profile/:username`
- Handle special case: `/profile/me` redirects to `/profile/{currentUser.username}`
- Add route guard to handle invalid usernames (404)

**Example:**
```typescript
<Route path="/profile/:username" element={<Timeline />} />
<Route path="/profile/me" element={<NavigateToOwnProfile />} />
```

---

## 2. Backend Changes

### 2.1 Create User Profile by Username Endpoint

**File:** `backend/core/views.py`

**New View:** `UserProfileByUsernameView`

**Purpose:** Fetch any user's public profile information by username (no authentication required for viewing, but authenticated users get additional data)

**Implementation:**
```python
class UserProfileByUsernameView(RetrieveAPIView):
    """
    Get user profile by username.
    Public endpoint - anyone can view any user's profile.
    Returns public profile information.
    """
    serializer_class = UserProfilePublicSerializer  # New serializer
    lookup_field = "username"
    lookup_url_kwarg = "username"
    permission_classes = [AllowAny]  # Public endpoint
    
    def get_queryset(self):
        return User.objects.select_related(
            "artist",
        ).prefetch_related(
            "collective_member"
        ).only(
            "id",
            "username",
            "first_name",
            "last_name",
            "profile_picture",
            "artist__artist_types",
        )
    
    def get_serializer_class(self):
        # Return more detailed serializer if user is viewing own profile
        if self.request.user.is_authenticated:
            if self.get_object().id == self.request.user.id:
                return UserSerializer  # Full details for own profile
        return UserProfilePublicSerializer  # Public info for others
```

**New Serializer:** `UserProfilePublicSerializer`

**File:** `backend/core/serializers.py`

**Purpose:** Serialize public user profile data (no sensitive info like email)

**Fields:**
- `id`
- `username`
- `fullname` (computed from first_name + last_name)
- `profile_picture`
- `artist_types`
- `post_count` (number of posts - computed)
- `follower_count` (future feature)
- `following_count` (future feature)

---

### 2.2 Create Posts by Username Endpoint

**File:** `backend/post/views.py`

**New View:** `UserPostsByUsernameListView`

**Purpose:** Fetch posts for a specific user by username, optimized like `PostDetailView`

**Implementation:**
```python
class UserPostsByUsernameListView(generics.ListAPIView):
    """
    Fetch user's posts by username.
    Optimized queryset matching PostDetailView pattern.
    Lightweight - no count annotations (use PostBulkMetaView for counts).
    """
    serializer_class = PostListViewSerializer
    pagination_class = PostPagination
    permission_classes = [AllowAny]  # Public endpoint
    lookup_field = "username"
    lookup_url_kwarg = "username"
    
    def get_queryset(self):
        username = self.kwargs["username"]
        user = get_object_or_404(User, username=username)
        
        # Optimized queryset matching PostDetailView pattern
        return (
            Post.objects.get_active_objects()
            .filter(author=user)
            .prefetch_related(
                "novel_post",  # Keep - needed for novel posts
                "channel",
                "channel__collective",  # For consistency with PostListView
            )
            .select_related(
                "author",
                "author__artist",  # Fetch artist info for post author
            )
            .order_by("-created_at")
        )
```

**Key Optimizations:**
- Use `prefetch_related` for `novel_post`, `channel`, `channel__collective`
- Use `select_related` for `author` and `author__artist`
- Match the queryset pattern from `PostDetailView` (lines 528-555)
- No count annotations (counts fetched separately via `PostBulkMetaView`)

---

### 2.3 Optimize Existing OwnPostsListView

**File:** `backend/post/views.py` (lines 374-403)

**Changes:**
- Update `OwnPostsListView` to match the optimized queryset pattern from `PostDetailView`
- Add same `prefetch_related` and `select_related` optimizations
- Consider deprecating this endpoint in favor of username-based endpoint

**Updated Implementation:**
```python
class OwnPostsListView(generics.ListAPIView):
    """
    Fetch user's list of posts by user ID.
    DEPRECATED: Consider using UserPostsByUsernameListView instead.
    """
    serializer_class = PostListViewSerializer
    pagination_class = PostPagination
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user_id = self.kwargs["id"]
        user = get_object_or_404(User, id=user_id)
        
        # Optimized queryset matching PostDetailView pattern
        return (
            Post.objects.get_active_objects()
            .filter(author=user)
            .prefetch_related(
                "novel_post",
                "channel",
                "channel__collective",
            )
            .select_related(
                "author",
                "author__artist",
            )
            .order_by("-created_at")
        )
```

---

### 2.4 Update URL Patterns

**File:** `backend/core/urls.py`

**Add:**
```python
path(
    "profile/by-username/<str:username>/",
    UserProfileByUsernameView.as_view(),
    name="profile-by-username",
),
```

**File:** `backend/post/urls.py`

**Add:**
```python
path(
    "by-username/<str:username>/",
    UserPostsByUsernameListView.as_view(),
    name="posts-by-username",
),
```

---

## 3. Implementation Order

### Phase 1: Backend Endpoints
1. ✅ Create `UserProfilePublicSerializer` in `backend/core/serializers.py`
2. ✅ Create `UserProfileByUsernameView` in `backend/core/views.py`
3. ✅ Add URL pattern for user profile by username
4. ✅ Create `UserPostsByUsernameListView` in `backend/post/views.py`
5. ✅ Optimize `OwnPostsListView` queryset
6. ✅ Add URL pattern for posts by username
7. ✅ Test endpoints with API client (Postman/Thunder Client)

### Phase 2: Frontend Hooks
1. ✅ Create `use-user-profile.ts` hook
2. ✅ Update `use-posts.ts` hook to support username parameter
3. ✅ Test hooks in isolation

### Phase 3: Component Refactor
1. ✅ Update `timeline.component.tsx` to use `useParams` for username
2. ✅ Replace `useAuth().user` with `useUserProfile(username)`
3. ✅ Add conditional rendering for Edit/Create Post buttons
4. ✅ Update posts fetching to use username
5. ✅ Handle loading and error states
6. ✅ Add 404 handling for invalid usernames

### Phase 4: Routing
1. ✅ Update route configuration
2. ✅ Add redirect from `/profile/me` to `/profile/{username}`
3. ✅ Test navigation between profiles

### Phase 5: Testing & Polish
1. ✅ Test viewing own profile
2. ✅ Test viewing other users' profiles
3. ✅ Test with non-existent usernames
4. ✅ Verify all conditional UI elements work correctly
5. ✅ Performance testing (check query optimization)

---

## 4. API Endpoint Summary

### New Endpoints

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| GET | `/api/core/profile/by-username/<username>/` | Get user profile by username | No (public) |
| GET | `/api/post/posts/by-username/<username>/` | Get user's posts by username | No (public) |

### Updated Endpoints

| Method | Endpoint | Changes |
|--------|----------|---------|
| GET | `/api/post/posts/me/<id>/` | Optimized queryset (matching PostDetailView) |

---

## 5. Data Flow

### Profile Page Load Flow:
1. User navigates to `/profile/:username`
2. Frontend extracts `username` from URL params
3. Frontend calls `GET /api/core/profile/by-username/<username>/`
4. Frontend calls `GET /api/post/posts/by-username/<username>/`
5. Frontend enriches posts with meta data via `PostBulkMetaView`
6. Frontend compares `currentUser.username === username` to determine if own profile
7. Frontend conditionally renders Edit/Create Post buttons

---

## 6. Edge Cases & Considerations

### 6.1 Username Not Found
- Return 404 response from backend
- Frontend shows "User not found" message
- Optionally redirect to 404 page

### 6.2 Own Profile Detection
- Compare `currentUser?.username === username` (not ID, as username can change)
- Handle case where user is not authenticated (no Edit/Create buttons)

### 6.3 Caching
- User profile data: 5 minute stale time
- Posts data: Use existing React Query caching strategy
- Consider cache invalidation on profile updates

### 6.4 Performance
- Backend queryset optimizations match `PostDetailView` pattern
- Frontend uses `usePostsMeta` for bulk count fetching (already implemented)
- Consider pagination for large post lists

### 6.5 Security
- Public endpoints should not expose sensitive data (email, etc.)
- Profile update endpoints still require authentication
- Consider rate limiting on public profile endpoints

---

## 7. Testing Checklist

### Backend Tests
- [ ] User profile by username returns correct data
- [ ] User profile by username returns 404 for invalid username
- [ ] Posts by username returns correct posts
- [ ] Posts by username returns empty list for user with no posts
- [ ] Optimized queryset performs well (check query count)
- [ ] OwnPostsListView queryset matches PostDetailView pattern

### Frontend Tests
- [ ] Profile page loads with correct username
- [ ] Edit Profile button shows only on own profile
- [ ] Create Post button shows only on own profile
- [ ] Posts load correctly for viewed user
- [ ] 404 page shows for invalid username
- [ ] Navigation from `/profile/me` works correctly
- [ ] Loading states display correctly
- [ ] Error states handle gracefully

---

## 8. Future Enhancements

1. **Follow/Unfollow Feature**
   - Add follow button for other users' profiles
   - Update follower/following counts

2. **Profile Statistics**
   - Total posts count
   - Total hearts received
   - Total praises received
   - Total trophies awarded

3. **Profile Tabs**
   - Timeline (posts) - ✅ Current implementation
   - Works (filtered posts) - 🚧 Coming soon
   - Avatar (profile picture gallery) - 🚧 Coming soon
   - Collectives (user's collectives) - 🚧 Coming soon

4. **Profile Customization**
   - Bio/description field
   - Cover image
   - Social links

---

## 9. Files to Create/Modify

### New Files
- `frontend/src/hooks/queries/use-user-profile.ts`

### Modified Files
- `frontend/src/components/profile/timeline.component.tsx`
- `frontend/src/hooks/queries/use-posts.ts`
- `frontend/src/App.tsx` (or routing config)
- `backend/core/views.py`
- `backend/core/serializers.py`
- `backend/core/urls.py`
- `backend/post/views.py`
- `backend/post/urls.py`

---

## 10. Notes

- The current `ProfileRetrieveUpdateView` uses user ID and requires authentication. The new endpoint uses username and is public.
- Consider keeping both endpoints for backward compatibility.
- The username-based approach is more user-friendly and SEO-friendly.
- All queryset optimizations should match the pattern established in `PostDetailView` for consistency.

