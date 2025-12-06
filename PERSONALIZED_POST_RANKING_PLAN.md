# Personalized Post Ranking Algorithm - Implementation Plan

## ✅ Implementation Checklist

### Phase 1: Model Indexes & Foundation
- [x] ✅ Add database indexes to Post model
- [x] ✅ Add database indexes to PostHeart/PostPraise/PostTrophy models
- [x] ✅ Add database indexes to UserFellow model
- [x] ✅ Add database indexes to CollectiveMember model
- [x] ✅ Add database indexes to Comment model
- [x] ✅ Add database indexes to Critique model
- [x] ✅ Add database indexes to Notification model
- [x] ✅ Add database indexes to Gallery model
- [x] ✅ Create `backend/post/ranking.py` with database-level scoring functions
- [x] ✅ Modify `PostListView.get_queryset()` to use personalized ranking
- [x] ✅ **🚨 URGENT: Implement calculation-based cache invalidation** (Facebook-style approach)
  - [x] ✅ Cache calculations separately (already done: fellows, collectives, interaction_stats)
  - [x] ✅ Add calculation version tracking per user (`calc_version:{user_id}`)
  - [x] ✅ Include calculation version in post cache key: `post_list:{user_id}:calc_v{version}:{page}:{page_size}`
  - [x] ✅ Invalidate calculation caches and increment version on user interactions
  - [x] ✅ Add `invalidate_cache` query parameter support (optional, for manual refresh)
- [ ] Add cache invalidation helpers

### Phase 2: Performance Optimization
- [x] ✅ Database-level scoring implemented
- [x] ✅ Multi-level caching implemented
- [x] ✅ Add query profiling with `silk_profile` (already in views.py)
- [ ] Benchmark performance (target: <200ms for 50 posts)
- [ ] Verify cache hit rates (>80%)

### Phase 3: Testing & Validation
- [ ] Add unit tests for ranking functions
- [ ] Add integration tests
- [ ] Test with real user data
- [ ] Performance benchmarking

### Phase 4: Cache Invalidation & Smart Filtering
- [x] ✅ Implement calculation-based cache invalidation (Facebook-style)
  - [x] ✅ Add `calc_version:{user_id}` tracking
  - [x] ✅ Create `invalidate_user_calculations(user_id)` function
  - [x] ✅ Modify `PostListView.list()` to use versioned cache keys
- [x] ✅ Add invalidation calls to interaction views:
  - [x] ✅ `PostHeartCreateView.perform_create()` - call `invalidate_user_calculations()`
  - [x] ✅ `PostHeartDestroyView.perform_destroy()` - call `invalidate_user_calculations()`
  - [x] ✅ `PostPraiseCreateView.post()` - call `invalidate_user_calculations()`
  - [x] ✅ `PostTrophyCreateView.post()` - call `invalidate_user_calculations()`
- [x] ✅ Add invalidation calls to relationship views:
  - [x] ✅ Fellow relationship views (`AcceptFriendRequestView`, `UnfriendView`)
  - [x] ✅ Collective membership views (`JoinCollectiveView`, `LeaveCollectiveView`)
- [x] ✅ Implement smart filtering for deleted posts (filter from cache, don't invalidate)
- [x] ✅ Optional: Add `invalidate_cache` query parameter for manual refresh

### Phase 3: Optional Performance Models (Optional)
- [ ] PostScore model (only if Phase 2 benchmarks show it's needed)
- [ ] UserPostPreference model (only if Phase 2 benchmarks show it's needed)

### Phase 4: User Preferences Model
- [x] ✅ UserPreference model for explicit user preferences
- [ ] API endpoints for preference management

### Phase 5: Optional Enhancements
- [ ] Advanced features (negative signals, time-based boosts)
- [ ] Monitoring & Analytics

---

## Overview
Implement a personalized ranking algorithm for `PostListView` that displays posts unique to each user's preferences, interactions, and social connections. This will replace the current simple chronological ordering (`-created_at`) with a multi-signal scoring system.

---

## Current State

### Existing Implementation
- **Location**: `backend/post/views.py` → `PostListView`
- **Current Ordering**: `order_by("-created_at")` (newest first)
- **Current Filtering**: 
  - Public posts (all users)
  - Posts from user's joined collectives (authenticated users)
- **No Personalization**: All users see the same chronological feed

### Available Data Sources
- **User Interactions**: `PostHeart`, `PostPraise`, `PostTrophy`
- **Social Connections**: `UserFellow` (following/friends system)
- **Collective Memberships**: `CollectiveMember`
- **Post Metadata**: `post_type`, `author`, `channel`, `created_at`
- **Engagement Metrics**: Hearts, praise, trophies, comments (via `PostBulkMetaView`)

---

## Goals

1. **Personalize Feed**: Show posts most relevant to each user
2. **Maintain Performance**: Keep response times under 200ms
3. **Balance Signals**: Combine recency, social connections, engagement, and preferences
4. **Backward Compatible**: Support anonymous users with chronological feed
5. **Configurable**: Allow easy adjustment of scoring weights

---

## Algorithm Design

### Scoring Formula

```
Total Score = 
  (Recency Score × 15%) +
  (Social Connection Score × 25%) +
  (Interaction History Score × 20%) +
  (Engagement Score × 15%) +
  (Collective Membership Score × 15%) +
  (Post Type Preference Score × 10%)
```

### Score Components

#### 1. Recency Score (15% weight)
- **Purpose**: Ensure recent posts appear higher
- **Formula**: `100 × e^(-hours_old / 24)` (exponential decay over 24 hours)
- **Range**: 0-100 points
- **Example**: 
  - 0 hours old: 100 points
  - 12 hours old: ~60 points
  - 24 hours old: ~37 points
  - 48 hours old: ~14 points

#### 2. Social Connection Score (25% weight)
- **Purpose**: Prioritize posts from users you follow
- **Formula**: 
  - If post author is in user's fellows (accepted): +50 points
  - Otherwise: 0 points
- **Data Source**: `UserFellow` model (status='accepted', is_deleted=False)

#### 3. Interaction History Score (20% weight)
- **Purpose**: Boost posts from authors you've previously interacted with
- **Formula**: `min(interaction_count × 5, 40)` points
  - `interaction_count` = total hearts + praise + trophies given to that author's posts
- **Example**:
  - 0 interactions: 0 points
  - 5 interactions: 25 points
  - 10+ interactions: 40 points (capped)

#### 4. Engagement Score (15% weight)
- **Purpose**: Surface popular/high-quality content
- **Formula**: `min(engagement_value, 50)` points
  - `engagement_value` = (hearts × 1) + (praise × 2) + (trophies × 5) + (comments × 0.5)
- **Data Source**: Cached counts from `PostBulkMetaView`
- **Example**:
  - 10 hearts, 5 praise, 2 trophies, 20 comments = 10 + 10 + 10 + 10 = 40 points
  - Capped at 50 points to prevent viral posts from dominating

#### 5. Collective Membership Score (15% weight)
- **Purpose**: Boost posts from collectives user is a member of
- **Formula**:
  - If post is from user's joined collective: +30 points
  - Public posts: 0 points (already accessible)
- **Data Source**: `CollectiveMember` model

#### 6. Post Type Preference Score (10% weight)
- **Purpose**: Prioritize post types user interacts with most
- **Formula**: `preferred_type_count × 10` points
  - Based on user's interaction history (hearts/praise/trophies per post type)
  - Top 3 preferred types get boost
- **Example**:
  - User interacts with 20 image posts, 10 novel posts, 5 video posts
  - Image posts get +20 points, novel posts get +10 points

---

## Implementation Phases

### Phase 1: Model Indexes & Foundation (START HERE)
**Duration**: 1-2 days  
**Priority**: HIGHEST - Must be done first  
**Files to Modify**:
- `backend/post/models.py` - Add indexes to Post, PostHeart, PostPraise, PostTrophy, Comment, Critique
- `backend/core/models.py` - Add indexes to UserFellow
- `backend/collective/models.py` - Add indexes to CollectiveMember
- `backend/notification/models.py` - Add indexes to Notification
- `backend/gallery/models.py` - Add indexes to Gallery
- `backend/post/ranking.py` (NEW) - Scoring functions
- `backend/post/views.py` - Modify `PostListView`

**Tasks**:
1. ✅ **Add Database Indexes to Models** (CRITICAL for performance) - COMPLETED:
   - Post model: `author_id + created_at`, `channel_id + created_at`, `post_type + created_at`, `is_deleted + created_at`
   - PostHeart/PostPraise/PostTrophy: `author + post_id__author_id`, `post_id + author`, `author + *_at`
   - UserFellow: `user + fellow_user + status`, `user + status + is_deleted`
   - CollectiveMember: `member + collective_id`
   - Comment: `post_id + is_deleted + created_at`, `author + created_at`, `gallery + is_deleted + created_at`
   - Critique: `post_id + is_deleted + created_at`, `author + created_at`
   - Notification: `notified_to + is_read + notified_at`
   - Gallery: `creator + status + created_at`, `creator + is_deleted + created_at`

2. [ ] Create `ranking.py` with database-level scoring functions:
   - `build_personalized_queryset(queryset, user)` - Returns annotated queryset
   - `get_user_interaction_stats(user)` - Cached interaction stats
   - `get_cached_fellows(user)` - Cached fellow IDs
   - `get_cached_collectives(user)` - Cached collective IDs
   - Helper functions for score calculations
   
3. [ ] Implement **database-level scoring** using Django annotations:
   - Use `Case/When` for conditional scoring
   - Calculate all scores in SQL
   - No Python loops over posts
   
4. [ ] Add multi-level caching:
   - Cache user interaction stats (10-minute TTL)
   - Cache fellow IDs (5-minute TTL)
   - Cache collective IDs (5-minute TTL, reuse existing)
   - Cache full feed results (5-minute TTL, page 1 only)
   
5. [x] ✅ Modify `PostListView.get_queryset()` to use database-level scoring - COMPLETED
6. [ ] **🚨 URGENT: Implement calculation-based cache invalidation**:
   - Add calculation version tracking: `calc_version:{user_id}` (starts at 1)
   - Modify `PostListView.list()` to include version in cache key: `post_list:{user_id}:calc_v{version}:{page}:{page_size}`
   - Create `invalidate_user_calculations(user_id)` function:
     - Deletes calculation caches (interaction_stats, fellows, collectives)
     - Increments `calc_version:{user_id}` (automatically invalidates post caches)
   - Call invalidation on: user interactions, fellow changes, collective changes
   - Optional: Add `invalidate_cache` query parameter for manual refresh
7. [ ] Implement smart cache filtering:
   - Filter deleted posts when retrieving from cache (don't invalidate)
   - Let TTL handle post creation (no invalidation on create)
7. [ ] Add cache invalidation helpers for user-specific changes only
8. [ ] Add unit tests for scoring functions
9. [ ] Test with sample data

**Deliverables**:
- ✅ Database indexes added to all relevant models
- ✅ Database-level personalized ranking (no Python loops)
- ✅ Multi-level caching system
- ⚠️ **URGENT**: Cache versioning to prevent old cached data from being served
- [ ] Smart cache filtering (filter deleted posts, TTL for new posts)
- [ ] Selective cache invalidation (user-specific changes only)
- [ ] Unit tests
- [ ] Performance benchmarks (<200ms target)

**Note on New Models**: 
Currently, engagement scores and interaction history are calculated on-the-fly using subqueries. For better performance, we can optionally add:
- `PostScore` model - Pre-computed engagement scores (can be added in Phase 2 if needed)
- `UserPostPreference` model - Pre-computed interaction history (can be added in Phase 2 if needed)

These are NOT required for initial implementation - the current caching strategy should be sufficient. Add these models only if performance benchmarks show they're needed.

---

### Phase 2: Performance Optimization (CRITICAL)
**Duration**: 1-2 days  
**Priority**: HIGHEST - Must implement immediately  
**Files to Modify**:
- `backend/post/ranking.py`
- `backend/post/views.py`

**Performance Strategy**:
The scoring calculations are computationally heavy. We MUST use database-level calculations instead of Python loops.

**Tasks**:
1. ✅ **Database-Level Scoring (CRITICAL)**:
   - Use Django `annotate()` for ALL score components
   - Calculate scores in SQL, not Python
   - Use `Case/When` for conditional scoring
   - Expected: 10-100x faster than Python loops
   
2. ✅ **Facebook-Style Multi-Level Caching** (Cache Calculations, Not Final Order):
   - ✅ Level 1: Cache user interaction stats (10 min TTL) - **Building blocks**
   - ✅ Level 2: Cache fellow IDs list (5 min TTL) - **Building blocks**
   - ✅ Level 3: Cache collective IDs (5 min TTL) - **Building blocks**
   - ✅ Level 4: Cache personalized feed results (5 min TTL) - **Optional optimization**
   - 🚨 **URGENT**: Implement calculation-based cache invalidation
     - Cache calculations separately (already done)
     - Track calculation version per user
     - Include version in post cache key
     - When calculations change → increment version → invalidates post cache
   - [ ] **Smart Cache Strategy**: Filter deleted posts from cache (don't invalidate)
   - [ ] **TTL for Post Creation**: Let TTL handle new posts (5 min is acceptable)
   - [ ] **Calculation-Based Invalidation**: Invalidate post cache when calculation caches change
   
3. ✅ **Optimize Database Queries**:
   - Pre-fetch fellow relationships (use cached lists)
   - Batch check collective memberships (use cached lists)
   - Use `select_related` and `prefetch_related` efficiently
   - Add database indexes (see below)
   
4. ✅ **Add Query Profiling** - COMPLETED:
   - ✅ Use `silk_profile` decorators (already in views.py)
   - [ ] Log slow queries (>200ms)
   - [ ] Monitor cache hit rates
   
5. [ ] **Benchmark Performance** - PENDING:
   - Target: <200ms for 50 posts (uncached)
   - Target: <50ms for cached requests
   - Monitor P50, P95, P99 response times

**Database Indexes (Add to migrations)**:
```python
# Add indexes for performance
Index(fields=['author_id', 'created_at']),  # For fellow posts
Index(fields=['channel_id', 'created_at']),  # For collective posts
Index(fields=['post_type', 'created_at']),   # For type filtering
Index(fields=['user_id', 'fellow_user_id', 'status']),  # For fellow checks
```

**Deliverables**:
- Database-level scoring (no Python loops)
- Multi-level caching system
- Optimized queries with proper indexes
- Performance benchmarks meeting targets
- Cache hit rate >80%

---

### Phase 3: Optional Performance Models (Only if Needed)
**Duration**: 1-2 days  
**Priority**: OPTIONAL - Only implement if Phase 2 benchmarks show performance issues  
**Files to Create/Modify**:
- `backend/post/models.py` - Add `PostScore` and `UserPostPreference` models (if needed)
- `backend/post/migrations/` - Migrations
- `backend/post/signals.py` (NEW) - Signals to update scores

**When to Implement**:
- Only if Phase 2 benchmarks show engagement/interaction history calculations are slow
- Current caching strategy should be sufficient for most cases

**Optional Models**:

1. **PostScore Model** (for engagement scoring):
   ```python
   class PostScore(models.Model):
       post = OneToOneField(Post, primary_key=True)
       hearts_count = IntegerField(default=0)
       praise_count = IntegerField(default=0)
       trophy_count = IntegerField(default=0)
       comment_count = IntegerField(default=0)
       engagement_score = FloatField(default=0.0)
       last_calculated = DateTimeField(auto_now=True)
   ```
   - Purpose: Pre-compute engagement scores to avoid subqueries
   - Update via signals when hearts/praise/trophies/comments change

2. **UserPostPreference Model** (for interaction history):
   ```python
   class UserPostPreference(models.Model):
       user = ForeignKey(User)
       author = ForeignKey(User)  # Author whose posts user interacted with
       hearts_given = IntegerField(default=0)
       praise_given = IntegerField(default=0)
       trophies_given = IntegerField(default=0)
       total_interactions = IntegerField(default=0)
       last_interaction_at = DateTimeField(auto_now=True)
   ```
   - Purpose: Pre-compute interaction history to avoid aggregations
   - Update via signals when user interacts with posts

**Tasks** (only if needed):
1. [ ] Benchmark current performance
2. [ ] If slow, add PostScore model and signals
3. [ ] If slow, add UserPostPreference model and signals
4. [ ] Update ranking algorithm to use pre-computed values
5. [ ] Re-benchmark to verify improvement

**Deliverables** (only if implemented):
- PostScore model (if needed)
- UserPostPreference model (if needed)
- Signals for automatic updates
- Updated ranking algorithm
- Performance improvement verification

---

### Phase 4: User Preferences Model (Optional)
**Duration**: 1-2 days  
**Priority**: OPTIONAL - User-facing feature  
**Files to Create/Modify**:
- `backend/core/models.py` - Add `UserPreference` model
- `backend/core/migrations/` - Migration
- `backend/core/serializers.py` - Serializer
- `backend/core/views.py` - API endpoints

**Tasks**:
1. ✅ **Create `UserPreference` model** - COMPLETED:
   - Added to `backend/core/models.py`
   - Fields: `preferred_post_types`, `preferred_artist_types`, `muted_collectives`, `blocked_users`
   - OneToOne relationship with User
2. [ ] Add migration (run `python manage.py makemigrations`)
3. [ ] Create API endpoints:
   - `GET /api/user/preferences/` - Get user preferences
   - `PUT /api/user/preferences/` - Update preferences
4. [ ] Integrate explicit preferences into scoring
5. [ ] Add frontend UI for preference management (future)

**Deliverables**:
- UserPreference model
- API endpoints
- Integration with scoring algorithm

---

### Phase 5: Advanced Features
**Duration**: 2-3 days  
**Files to Modify**:
- `backend/post/ranking.py`
- `backend/post/views.py`
- `backend/core/models.py` (if adding blocking)

**Tasks**:
1. ✅ Implement negative signals:
   - Hide posts from blocked users
   - Reduce score for posts user has already seen
   - Filter out muted collectives (future)
2. ✅ Add time-based boosts:
   - Boost posts from users user recently interacted with
   - Decay boost over time (last 7 days)
3. ✅ Implement A/B testing framework:
   - Allow switching between personalized and chronological
   - Track engagement metrics
4. ✅ Add admin controls:
   - Toggle personalized ranking on/off
   - Adjust scoring weights via settings

**Deliverables**:
- Negative signal filtering
- Time-based boosts
- A/B testing capability
- Admin controls

---

### Phase 6: Monitoring & Analytics
**Duration**: 1-2 days  
**Files to Create/Modify**:
- `backend/post/analytics.py` (NEW)
- `backend/post/views.py`

**Tasks**:
1. ✅ Add logging for ranking decisions:
   - Log top-scoring posts per user
   - Track score component breakdowns
2. ✅ Create analytics dashboard:
   - Average score per post type
   - User engagement with personalized feed
   - Comparison: personalized vs chronological
3. ✅ Add metrics tracking:
   - Feed engagement rate
   - Time spent on feed
   - Click-through rates

**Deliverables**:
- Analytics logging
- Dashboard (basic)
- Metrics tracking

---

## Technical Implementation Details

### File Structure

```
backend/
├── post/
│   ├── ranking.py          # NEW: Scoring functions
│   ├── analytics.py        # NEW: Analytics & logging
│   ├── views.py            # MODIFY: PostListView
│   └── tests/
│       └── test_ranking.py  # NEW: Unit tests
└── core/
    ├── models.py           # MODIFY: Add UserPreference (optional)
    └── views.py            # MODIFY: Add preferences endpoints (optional)
```

### Caching Strategy (Facebook-Style: Cache Calculations, Not Final Order)

**Philosophy**: Cache the building blocks (calculations), re-compute order fresh each time. This ensures freshness while maintaining performance.

**Level 1: User Interaction Stats** (10 min TTL) - **Building Blocks**
```python
cache_key = f"user_interaction_stats:{user_id}"
# Stores: author_interactions dict, preferred_post_types dict
# Purpose: Input for ranking algorithm
```

**Level 2: User Social Data** (5 min TTL) - **Building Blocks**
```python
cache_key = f"user_fellows:{user_id}"
# Stores: set of fellow_user_ids
# Purpose: Input for social connection scoring

cache_key = f"user_joined_collectives:{user_id}"
# Stores: set of collective_ids
# Purpose: Input for collective membership scoring
```

**Level 3: Calculation Version Tracking** (24 hour TTL)
```python
cache_key = f"calc_version:{user_id}"
# Stores: integer version number
# Purpose: Tracks when calculations change, invalidates post cache
# Incremented when: user interactions, fellow changes, collective changes
```

**Level 4: Full Feed Results** (5 min TTL) - **Optional Optimization**
```python
cache_key = f"post_list:{user_id}:calc_v{version}:{page}:{page_size}"
# Stores: serialized post list
# Note: Version in key ensures old cached data is invalid when calculations change
# Note: When retrieving, filter out deleted posts (is_deleted=True)
#       This keeps cache valid even when posts are deleted
```

**Cache Invalidation Strategy (REVISED - Calculation-Based Approach)**:

1. **Post Creation**:
   - ❌ NO invalidation - Let TTL handle it (5 min is acceptable)
   - New posts appear within 5 minutes naturally
   - Much better cache hit rates

2. **Post Deletion (Soft Delete)**:
   - ❌ NO invalidation needed
   - ✅ **Smart Filtering**: Filter deleted posts when retrieving from cache
   - Cache remains valid, just filters out deleted posts automatically
   - Implementation: Check `is_deleted=False` when retrieving cached results

3. **User Interactions** (Heart/Praise/Trophy):
   - ✅ Invalidate: `user_interaction_stats:{user_id}` cache
   - ✅ Increment: `calc_version:{user_id}` (invalidates all post caches automatically)
   - Reason: Interactions change personalized scores, need fresh ranking
   - Implementation: Call `invalidate_user_calculations(user_id)`

4. **Fellow Relationships**:
   - ✅ Invalidate: `user_fellows:{user_id}` cache (both users)
   - ✅ Increment: `calc_version:{user_id}` for both users
   - Reason: Changes social connection scores, need fresh ranking
   - Implementation: Call `invalidate_user_calculations(user_id)` for both users

5. **Collective Memberships**:
   - ✅ Invalidate: `user_joined_collectives:{user_id}` cache
   - ✅ Increment: `calc_version:{user_id}`
   - Reason: Changes collective membership scores, need fresh ranking
   - Implementation: Call `invalidate_user_calculations(user_id)`

**Key Function**:
```python
def invalidate_user_calculations(user_id):
    """Invalidate calculation caches and increment version"""
    # Delete calculation caches
    cache.delete(f"user_interaction_stats:{user_id}")
    cache.delete(f"user_fellows:{user_id}")
    cache.delete(f"user_joined_collectives:{user_id}")
    
    # Increment version (invalidates all post caches)
    version_key = f"calc_version:{user_id}"
    current_version = cache.get(version_key, 1)
    cache.set(version_key, current_version + 1, 86400)  # 24 hours
```

**Benefits of This Strategy**:
- ✅ Much better cache hit rates for calculations (90%+) - calculations change infrequently
- ✅ Fresh ranking on every request (calculations cached, order computed fresh)
- ✅ Automatic post cache invalidation when calculations change (via version)
- ✅ Deleted posts filtered immediately (no stale deleted posts in cache)
- ✅ Simpler logic (no complex invalidation tracking for posts)
- ✅ Acceptable freshness (5-minute TTL for posts, 10 min for calculations)
- ✅ Matches Facebook's approach (cache inputs, compute order fresh)

**Cache Hit Rate Targets**:
- Calculations: >90% (fellows, collectives, interaction stats)
- Posts: 50-70% (acceptable, freshness prioritized)

**🚨 URGENT: Calculation-Based Cache Invalidation (Facebook-Style)**:
- **Problem**: Old cached entries (created before personalized ranking) will return old chronological results, breaking the new ranking system
- **Solution**: Cache calculations separately, track calculation version, include version in post cache key
- **How It Works** (Similar to Facebook):
  1. **Cache Building Blocks**: Cache user calculations (fellows, collectives, interaction stats) - ✅ Already done
  2. **Track Calculation Version**: Maintain a version counter per user that increments when calculations change
  3. **Include Version in Post Cache Key**: `post_list:{user_id}:calc_v{version}:{page}:{page_size}`
  4. **When Calculations Change**: Increment version → automatically invalidates all post caches (different key)
  5. **Re-compute Order Fresh**: Use cached calculations to build fresh ranking (fast because inputs are cached)
- **Implementation**: 
  - Add `calc_version:{user_id}` cache key (integer, starts at 1)
  - Modify `PostListView.list()` to include version in cache key
  - Create `invalidate_user_calculations(user_id)` function that:
    - Deletes calculation caches (fellows, collectives, interaction_stats)
    - Increments `calc_version:{user_id}`
  - Call invalidation on: user interactions (heart/praise/trophy), fellow changes, collective changes
  - Optional: Add `invalidate_cache` query parameter for manual refresh
- **Benefits**: 
  - Automatically invalidates post cache when calculations change
  - Ensures fresh ranking on every request (calculations cached, order fresh)
  - No need for manual cache versioning on deploy
  - Matches Facebook's approach (cache inputs, compute order fresh)
  - Better cache hit rates for calculations (90%+) vs posts (50-70%)
- **Status**: 🚨 **CRITICAL** - Must be implemented before deployment to prevent serving old cached data

### Database Indexes (REQUIRED for Performance)

**Add to Post model migration**:
```python
class Migration(migrations.Migration):
    operations = [
        migrations.AddIndex(
            model_name='post',
            index=models.Index(fields=['author_id', 'created_at'], name='post_author_created_idx'),
        ),
        migrations.AddIndex(
            model_name='post',
            index=models.Index(fields=['channel_id', 'created_at'], name='post_channel_created_idx'),
        ),
        migrations.AddIndex(
            model_name='post',
            index=models.Index(fields=['post_type', 'created_at'], name='post_type_created_idx'),
        ),
    ]
```

**Add to UserFellow model migration**:
```python
migrations.AddIndex(
    model_name='userfellow',
    index=models.Index(fields=['user_id', 'fellow_user_id', 'status'], name='userfellow_lookup_idx'),
),
```

**Add to PostHeart/PostPraise/PostTrophy models** (for interaction stats):
```python
# These help with counting interactions per author
migrations.AddIndex(
    model_name='postheart',
    index=models.Index(fields=['author_id', 'post_id__author_id'], name='postheart_author_lookup_idx'),
),
```

### API Changes

**No breaking changes** - Existing endpoints remain the same:
- `GET /api/posts/` - Returns personalized posts (if authenticated)
- `GET /api/posts/?ordering=chronological` - Optional query param for chronological (future)

---

## Testing Strategy

### Unit Tests
- Test each scoring component independently
- Test edge cases (no interactions, no fellows, etc.)
- Test caching behavior

### Integration Tests
- Test full ranking pipeline
- Test with real user data
- Test performance with large datasets

### A/B Testing
- Compare personalized vs chronological feeds
- Measure engagement metrics
- Track user satisfaction

---

## Performance Targets

- **Response Time**: < 200ms for 50 posts
- **Database Queries**: < 10 queries per request
- **Cache Hit Rate**: > 80% for interaction stats
- **Memory Usage**: < 50MB per request

---

## Rollout Strategy

### Phase 1: Internal Testing (Week 1)
- Deploy to staging
- Test with internal users
- Monitor performance

### Phase 2: Beta Testing (Week 2)
- Enable for 10% of users (feature flag)
- Collect feedback
- Monitor metrics

### Phase 3: Gradual Rollout (Week 3-4)
- Increase to 50% of users
- Monitor engagement
- Fix issues

### Phase 4: Full Rollout (Week 5)
- Enable for all users
- Monitor closely
- Iterate based on feedback

---

## Success Metrics

### Engagement Metrics
- **Feed Engagement Rate**: % of posts user interacts with
- **Time on Feed**: Average time spent viewing feed
- **Scroll Depth**: How far users scroll
- **Return Rate**: Users returning to feed

### Quality Metrics
- **Relevance Score**: User-reported relevance (future)
- **Diversity**: Variety of post types shown
- **Recency Balance**: Mix of new and older posts

### Performance Metrics
- **Response Time**: P50, P95, P99
- **Cache Hit Rate**: % of cached requests
- **Database Load**: Queries per second

---

## Future Enhancements

1. **Machine Learning**: Train ML model for personalized scoring
2. **Content-Based Filtering**: Analyze post content (keywords, topics)
3. **Collaborative Filtering**: "Users like you also liked..."
4. **Real-Time Updates**: Update scores as user interacts
5. **Multi-Feed Support**: Different feeds (Following, Discover, Trending)
6. **User Feedback Loop**: "Not interested" button to improve ranking
7. **Client-Triggered Cache Invalidation**: Allow users to force cache refresh via hard refresh (Ctrl+Shift+R) using URL parameter (`?refresh=true`) - See "Optional: Client-Triggered Cache Invalidation" in Cache Invalidation Strategy section

---

## Risks & Mitigations

### Risk 1: Performance Degradation (CRITICAL)
- **Impact**: High - Could make feed unusable
- **Mitigation**: 
  - **MUST use database-level scoring** (not Python loops)
  - Implement multi-level caching
  - Add database indexes
  - Monitor query performance with silk
- **Monitoring**: 
  - Track response times (P50, P95, P99)
  - Set up alerts for >500ms responses
  - Monitor cache hit rates
  - Log slow queries

### Risk 2: Over-Personalization (Filter Bubble)
- **Impact**: Medium - Users see limited content
- **Mitigation**: 
  - Ensure diversity in feed (mix of signals)
  - Balance recency with personalization
  - Show popular content regardless of personalization
  - Add "Sort by: Newest" option
- **Monitoring**: 
  - Track diversity metrics (post types, authors)
  - Monitor user engagement

### Risk 3: User Confusion
- **Impact**: Low - Users may not understand ranking
- **Mitigation**: 
  - Add "Sort by: Newest" option
  - Clear documentation
  - Gradual rollout with feedback
- **Monitoring**: 
  - User feedback
  - Support tickets
  - A/B testing results

### Risk 4: Cache Invalidation Issues
- **Impact**: High - Users see stale data (especially old cached data with old ranking)
- **Mitigation**: 
  - 🚨 **CRITICAL**: Implement calculation-based cache invalidation (Facebook-style)
    - Cache calculations separately (already done)
    - Track calculation version per user
    - Include version in post cache key
    - When calculations change → increment version → invalidates post cache automatically
  - **Smart Filtering**: Filter deleted posts from cache (no invalidation needed)
  - **TTL Strategy**: Use TTL for post creation (5 min is acceptable)
  - **Calculation-Based Invalidation**: Invalidate post cache when calculation caches change
  - Proper cache keys with calculation version/user/page identifiers
  - TTL management (5 min for posts, 10 min for calculations)
  - Manual invalidation via `invalidate_cache` query parameter (optional)
- **Monitoring**: 
  - Cache hit rates (target >80%)
  - Stale data detection
  - User reports of outdated content
  - Verify deleted posts are filtered correctly

### Risk 5: Database Load
- **Impact**: High - Could slow down entire system
- **Mitigation**:
  - Use database indexes (REQUIRED)
  - Limit scoring to first page only
  - Use connection pooling
  - Monitor database CPU/memory
- **Monitoring**:
  - Database query times
  - Connection pool usage
  - Database server metrics

---

## Dependencies

- **Django**: Existing (no new packages needed)
- **Django Cache**: For caching interaction stats
- **Django Silk**: For performance profiling (already in use)

---

## Timeline Estimate

- **Phase 1**: 2-3 days
- **Phase 2**: 1-2 days
- **Phase 3**: 1-2 days (optional)
- **Phase 4**: 2-3 days (optional)
- **Phase 5**: 1-2 days (optional)

**Total**: 7-12 days (depending on optional phases)

---

## Next Steps

### 🚨 Immediate Priority (Before Deployment)

1. ✅ Review and approve this plan
2. ✅ Start Phase 1: Create `ranking.py` and scoring functions
3. ✅ Implement basic personalized ranking in `PostListView`
4. ✅ Add database indexes to all models
5. 🚨 **URGENT: Implement calculation-based cache invalidation** (Facebook-style)
   - [ ] Create `invalidate_user_calculations(user_id)` function in `backend/post/cache_utils.py` or `ranking.py`
   - [ ] Add calculation version tracking: `calc_version:{user_id}` (starts at 1)
   - [ ] Modify `PostListView.list()` to:
     - Get calculation version: `version = cache.get(f"calc_version:{user_id}", 1)`
     - Include version in cache key: `post_list:{user_id}:calc_v{version}:{page}:{page_size}`
     - Optional: Add `invalidate_cache` query parameter support
   - [ ] Add invalidation calls to:
     - `PostHeartCreateView.perform_create()` - call `invalidate_user_calculations(user.id)`
     - `PostPraiseCreateView.post()` - call `invalidate_user_calculations(user.id)`
     - `PostTrophyCreateView.post()` - call `invalidate_user_calculations(user.id)`
     - Fellow relationship views (when follow/unfollow happens)
     - Collective membership views (when join/leave happens)
   - [ ] Test: Verify old cached data is not served after calculations change

### 📊 Performance & Testing (After Cache Invalidation)

6. [ ] **Benchmark performance**:
   - Test with 50 posts (target: <200ms uncached, <50ms cached)
   - Monitor query performance with Silk
   - Verify cache hit rates (calculations >90%, posts 50-70%)
   - Document baseline metrics

7. [ ] **Test with sample data**:
   - Create test users with different interaction patterns
   - Verify personalized ranking works correctly
   - Test cache invalidation on interactions
   - [x] ✅ Verify deleted posts are filtered from cache (unit tests created)

8. [x] ✅ **Add unit tests**:
   - [x] ✅ Test `invalidate_user_calculations()` function
   - [x] ✅ Test calculation version tracking
   - [x] ✅ Test cache key generation
   - [x] ✅ Test smart filtering of deleted posts from cache
   - [ ] Test `build_personalized_queryset()` function (requires more complex setup)

### 🚀 Deployment & Monitoring

9. [ ] **Deploy to staging**:
   - Run migrations for database indexes
   - Deploy code changes
   - Monitor error logs
   - Verify cache invalidation works

10. [ ] **Monitor in production**:
    - Track cache hit rates (calculations vs posts)
    - Monitor response times (P50, P95, P99)
    - Watch for stale data issues
    - Collect user feedback

11. [ ] **Iterate based on feedback**:
    - Adjust scoring weights if needed
    - Optimize cache TTLs if needed
    - Add additional invalidation triggers if needed

### 🔮 Future Enhancements (Optional)

12. [ ] Implement smart filtering for deleted posts (filter from cache, don't invalidate)
13. [ ] Add API endpoints for `UserPreference` model
14. [ ] Add frontend UI for preference management
15. [ ] Consider optional performance models (`PostScore`, `UserPostPreference`) if benchmarks show need

---

## Notes

- ✅ Phase 1 foundation is complete (indexes, ranking.py, PostListView integration)
- 🚨 **Critical**: Cache invalidation must be implemented before deployment to prevent serving old cached data
- Cache calculations separately (already done), track versions, invalidate posts when calculations change
- Monitor performance closely - database-level scoring should be fast even without post cache
- Cache hit rate targets: Calculations >90%, Posts 50-70% (freshness prioritized)
- Gather user feedback early on ranking quality
- Be prepared to adjust scoring weights based on data
- Consider A/B testing to validate improvements
- Facebook-style approach: Cache inputs (calculations), compute order fresh each time

---

**Last Updated**: 2024-12-19  
**Status**: Core Implementation Complete - Ready for Testing & Benchmarking  
**Current Priority**: 📊 Performance Benchmarking & Manual Testing  
**Owner**: Development Team

