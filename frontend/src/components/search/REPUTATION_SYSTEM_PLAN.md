# Reputation System Implementation Plan

## Overview
Implement a reputation system where users earn or lose reputation based on interactions (praise, trophies, critiques). Create a leaderboard and update UI to display reputation alongside brushdrips.

**Key Principle**: Reputation amounts always match brushdrip amounts for consistency and simplicity.

---

## Phase 1: Backend - Reputation Model & Logic

### 1.1 Database Schema
- [x] Add `reputation` field to `User` model (IntegerField, default=0)
- [x] Add database index on `reputation` field for fast leaderboard queries
- [x] **Create `ReputationHistory` model** (`backend/core/models.py`):
  - [ ] Fields:
    - [ ] `user` - ForeignKey to User (required)
    - [ ] `amount` - IntegerField (positive or negative)
    - [ ] `source_type` - CharField with choices: 'praise', 'trophy', 'critique', 'gallery_award'
    - [ ] `source_id` - CharField/UUIDField (ID of the source object - praise_id, trophy_id, critique_id, award_id)
    - [ ] `source_object_type` - CharField (optional: 'post', 'gallery' for critiques/awards)
    - [ ] `created_at` - DateTimeField (auto_now_add)
    - [x] `description` - TextField (optional: human-readable description)
  - [x] Indexes:
    - [x] `models.Index(fields=['user', 'created_at'])` - For user history queries
    - [x] `models.Index(fields=['source_type', 'source_id'])` - For source lookups
    - [x] `models.Index(fields=['created_at'])` - For time-based queries
  - [x] Meta: `ordering = ['-created_at']`
- [ ] Create migration (run: `python manage.py makemigrations core --name add_reputation_and_history`)

### 1.2 Reputation Calculation Logic

**Current Brushdrip Costs (from codebase):**
- Praise: Costs 1 BD, grants 1 BD to post author
- Trophy: Costs 5/10/20 BD (bronze/golden/diamond), grants same to post author
- Critique: Costs 3 BD (no transfer to post author)

**Reputation Rules:**
- [ ] **Earn Reputation:**
  - [ ] When user receives **praise** → Add +1 reputation (matches 1 BD granted)
  - [ ] When user receives **trophy** → Add reputation equal to BD granted:
    - [ ] Bronze Stroke: +5 reputation (matches 5 BD)
    - [ ] Golden Bristle: +10 reputation (matches 10 BD)
    - [ ] Diamond Canvas: +20 reputation (matches 20 BD)
  - [ ] When user receives **positive critique** → Add +3 reputation (matches 3 BD cost)
  
- [ ] **Lose Reputation:**
  - [ ] When user receives **negative critique** → Subtract -3 reputation (matches 3 BD cost)
  - [ ] **Note**: Neutral critiques do NOT affect reputation (no change)

### 1.3 Implementation Strategy

**✅ Decision: Hybrid Approach (Recommended)**
- [ ] **Use signals for automatic handling** (`post_save`, `pre_delete`) on `PostPraise`, `PostTrophy`, `Critique`, `GalleryAward` models
- [ ] **Use view-based for explicit control** where needed (e.g., critique impression changes)
- [ ] **Benefits**: 
  - Automatic reputation updates on create/delete (signals)
  - Explicit control for complex cases (view-based)
  - Single source of truth in `reputation.py` utility
  - Easier to test and debug
- [ ] **Implementation**: Create signal handlers that call `update_reputation()` from utility module

### 1.4 Implementation Points

- [x] **Create utility module**: `backend/core/reputation.py`
  - [x] `update_reputation(user, amount, source_type, source_id, source_object_type=None, description=None)` - Main function:
    - [x] Atomic operation using `select_for_update()` and `F('reputation') + amount`
    - [x] Updates User.reputation field
    - [x] **Creates ReputationHistory record** for audit trail
    - [x] Returns updated reputation value
    - [x] Invalidates leaderboard cache
  - [x] `get_reputation_amount_for_praise()` → returns 1
  - [x] `get_reputation_amount_for_trophy_or_award(trophy_type)` → returns 5/10/20 (shared for trophies and gallery awards)
  - [x] `get_reputation_amount_for_critique(impression)` → returns +3/-3/0
  - [x] `get_recipient_for_critique(critique)` → returns `post.author` or `gallery.creator` (helper for signals)
  - [x] `get_user_reputation_history(user, limit=50, offset=0)` → Query ReputationHistory for user

- [x] **Create signal handlers** (`backend/core/signals.py`):
  - [x] `on_praise_created(sender, instance, created, **kwargs)` → 
    - [x] `update_reputation(instance.post_id.author, +1, 'praise', str(instance.id), 'post', 'Received praise on post')`
  - [x] `on_praise_deleted(sender, instance, **kwargs)` →
    - [x] `update_reputation(instance.post_id.author, -1, 'praise', str(instance.id), 'post', 'Praise deleted')`
  - [x] `on_trophy_created(sender, instance, created, **kwargs)` →
    - [x] `update_reputation(instance.post_id.author, +amount, 'trophy', str(instance.id), 'post', f'Received {trophy_type} trophy on post')`
  - [x] `on_trophy_deleted(sender, instance, **kwargs)` →
    - [x] `update_reputation(instance.post_id.author, -amount, 'trophy', str(instance.id), 'post', 'Trophy deleted')`
  - [x] `on_critique_created_or_updated(sender, instance, created, **kwargs)` →
    - [x] Determine recipient (post.author or gallery.creator)
    - [x] Determine object_type ('post' or 'gallery')
    - [x] Apply reputation based on impression: `update_reputation(recipient, amount, 'critique', str(instance.critique_id), object_type, f'Received {impression} critique')`
    - [x] Handle impression updates (reverse old, apply new)
  - [x] `on_critique_deleted(sender, instance, **kwargs)` →
    - [x] Determine recipient and object_type
    - [x] Reverse reputation: `update_reputation(recipient, -amount, 'critique', str(instance.critique_id), object_type, 'Critique deleted')`
  - [x] `on_gallery_award_created(sender, instance, created, **kwargs)` →
    - [x] `update_reputation(instance.gallery_id.creator, +amount, 'gallery_award', str(instance.id), 'gallery', f'Received {award_type} award on gallery')`
  - [x] `on_gallery_award_deleted(sender, instance, **kwargs)` →
    - [x] `update_reputation(instance.gallery_id.creator, -amount, 'gallery_award', str(instance.id), 'gallery', 'Gallery award deleted')`
  - [x] **Note**: All signal handlers use `transaction.on_commit()` to ensure brushdrip transaction completes first
  - [x] **Note**: ReputationHistory records are created for ALL reputation changes (audit trail)

- [ ] **Transaction Safety:**
  - [ ] Use `select_for_update()` on User model when updating reputation (same as brushdrips)
  - [ ] Ensure reputation updates are in the same `transaction.atomic()` block as brushdrip updates
  - [ ] Use `F('reputation') + amount` for atomic database updates (prevents race conditions)

- [ ] **Edge Cases:**
  - [ ] **Negative reputation**: ✅ **ALLOWED** - Display negative values, colored **RED** in client UI
  - [ ] **Concurrent updates**: Already handled by `select_for_update()` and `F()` expressions
  - [ ] **Post deletion**: ✅ **CRITICAL** - Reputation is NEVER lost. Post deletion does NOT affect reputation.
  - [ ] **Gallery deletion**: ✅ **CRITICAL** - Reputation is NEVER lost. Gallery deletion does NOT affect reputation.
  - [ ] **Reputation permanence**: Reputation only changes on user interactions (praise/trophy/critique/award create/delete), never on content deletion

### 1.5 Deletion & Reversal Logic

**Critical Decision Points:**

- [ ] **If praise/trophy/critique/gallery_award is deleted:**
  - [ ] **Option 1**: Reverse reputation (subtract what was added)
  - [ ] **Option 2**: Keep reputation (no reversal)
  - [ ] **Recommendation**: **Option 1 (Reverse)** - Maintains data integrity
  - [ ] Implementation: Add signal handler for `pre_delete` on praise/trophy/critique/gallery_award models

- [ ] **If post is deleted:**
  - [ ] ✅ **CRITICAL RULE**: **NEVER reverse reputation** - Reputation is permanent and only changes on user interactions
  - [ ] Post deletion does NOT affect reputation at all
  - [ ] Implementation: No action needed (soft delete keeps relationships intact, reputation remains unchanged)

- [ ] **If gallery is deleted:**
  - [ ] ✅ **CRITICAL RULE**: **NEVER reverse reputation** - Reputation is permanent and only changes on user interactions
  - [ ] Gallery deletion does NOT affect reputation at all
  - [ ] Implementation: No action needed (soft delete keeps relationships intact, reputation remains unchanged)

- [ ] **If critique impression is changed:**
  - [ ] **Option 1**: Recalculate reputation (reverse old, apply new)
  - [ ] **Option 2**: No change (reputation locked at creation)
  - [ ] **Recommendation**: **Option 1 (Recalculate)** - If critique can be edited, reputation should reflect current state
  - [ ] Implementation: Add signal handler for `post_save` on Critique model, check if impression changed

- [ ] **If transaction is found to be invalid:**
  - [ ] Create admin command to recalculate reputation from transaction history
  - [ ] Use `BrushDripTransaction` records as source of truth
  - [ ] Command: `python manage.py recalculate_reputation [--user-id=ID]`

### 1.6 API Endpoints

- [x] Create endpoint: `GET /api/core/users/{id}/reputation/`
  - [x] Returns: `{ "user_id": int, "username": str, "reputation": int }`
  - [x] Public endpoint (anyone can view)
  - [x] Created `ReputationSerializer` for this endpoint

- [x] Create endpoint: `GET /api/core/users/{id}/reputation/history/`
  - [x] Query parameters:
    - [x] `limit` (default: 50, max: 100) - Number of history records
    - [x] `offset` (default: 0) - Pagination offset
  - [x] Returns paginated list of ReputationHistory records for user
  - [x] Include: `amount`, `source_type`, `source_id`, `source_object_type`, `description`, `created_at`
  - [x] Ordered by `created_at` descending (most recent first)

- [x] Create endpoint: `GET /api/core/reputation/leaderboard/`
  - [x] Query parameters:
    - [x] `limit` (default: 25, max: 100) - Number of users to return
    - [x] `offset` (default: 0) - Pagination offset
    - [ ] `time_range` (optional: 'all-time', 'monthly', 'weekly') - **Note**: Requires ReputationHistory for time-based filtering (future enhancement)
  - [x] Returns paginated list of users ordered by reputation (descending)
  - [x] Include: `user_id`, `username`, `fullname`, `profile_picture`, `reputation`, `rank`, `artist_types`
  - [x] **Caching**: Cache top 100 users for 5 minutes (Redis)

- [x] Create endpoint: `GET /api/core/reputation/leaderboard/me/`
  - [x] Returns current user's rank and surrounding users (±5 positions)
  - [x] Useful for showing user their position without loading full leaderboard

### 1.7 Rate Limiting & Abuse Prevention

- [ ] **Rate limiting**: Already handled by existing brushdrip system (can't spam if no BD)
- [ ] **Validation**: Ensure user can't praise/trophy/critique their own posts (if not already enforced)
- [ ] **Duplicate prevention**: Ensure user can't create multiple praises/trophies for same post (if not already enforced)

---

## Phase 2: Backend - Leaderboard

### 2.1 Leaderboard View

- [x] Create `ReputationLeaderboardView` (ListAPIView)
- [x] Query: `User.objects.filter(is_deleted=False).order_by('-reputation', 'id')`
  - [x] Order by reputation descending, then by ID for consistent ranking
- [x] Use `select_related('artist')` for performance
- [x] Support pagination (limit/offset query parameters)
- [x] **Caching Strategy**:
  - [x] Cache top 100 users for 5 minutes
  - [x] Cache key: `reputation_leaderboard:top_100:limit_{limit}:offset_{offset}`
  - [x] Invalidate cache when reputation changes (signal handler in `reputation.py`)

### 2.2 Leaderboard Serializer

- [x] Create `ReputationLeaderboardEntrySerializer`
- [x] Fields:
  - [x] `rank` (calculated: offset + index + 1)
  - [x] `user_id` / `id`
  - [x] `username`
  - [x] `fullname`
  - [x] `profile_picture`
  - [x] `reputation`
  - [x] `artist_types` (from related artist model)

### 2.3 Reputation History Serializer

- [x] Create `ReputationHistorySerializer`
- [x] Fields:
  - [x] `amount` (positive or negative)
  - [x] `source_type` ('praise', 'trophy', 'critique', 'gallery_award')
  - [x] `source_id` (UUID of source object)
  - [x] `source_object_type` ('post' or 'gallery', optional)
  - [x] `description` (human-readable description)
  - [x] `created_at` (timestamp)

### 2.4 Performance Optimizations

- [ ] Add database index on `reputation` field (if not already in migration)
- [ ] Use `only()` or `defer()` to limit fields fetched
- [ ] Consider materialized view for very large user bases (PostgreSQL)
- [ ] Cache leaderboard in Redis with 5-minute TTL
- [ ] Invalidate cache on reputation updates (use signal)

---

## Phase 3: Frontend - Reputation Display

### 3.1 Update User Header/Profile

- [ ] **User Header (MainLayout.tsx):**
  - [ ] **For current user (authenticated)**: Display both brushdrips count AND reputation count
    - [ ] Layout: `[BD Icon] X BD  [Rep Icon] Y Rep` or stacked vertically
    - [ ] Use red dot indicator for reputation (shade of red, configurable in globals.css)
    - [ ] **Number formatting**: Truncate numbers >= 1000 to "1k", "3k", etc. (e.g., 1000 → "1k", 3500 → "3k")
    - [ ] **Title attribute**: Display full value in `title` attribute for tooltip (e.g., `title="1000 Brush Drips"`)
  - [ ] **For other users**: Display ONLY reputation count (no brushdrips)
    - [ ] Layout: `[Rep Icon] Y Rep`
    - [ ] **Number formatting**: Truncate numbers >= 1000 to "1k", "3k", etc.
    - [ ] **Title attribute**: Display full value in `title` attribute for tooltip
  - [ ] **Negative reputation styling**: Display negative values colored **RED** in client UI
  - [ ] Update styling to accommodate both without cluttering
  - [ ] **Create utility function**: `formatNumber(value)` in `utils/format-number.util.ts`
    - [ ] Formats numbers >= 1000 as "1k", "3k", etc. (returns formatted string like "1k")
    - [ ] Full number value is used separately in `title` attribute (e.g., `title="1000 Brush Drips"`)

- [ ] **Profile/Timeline:**
  - [ ] **For current user (own profile)**: Show both brushdrips AND reputation
    - [ ] Display format: `X Brushdrips | Y Reputation`
    - [ ] **Number formatting**: Truncate numbers >= 1000 to "1k", "3k", etc.
    - [ ] **Title attribute**: Display full value in `title` attribute for tooltip
  - [ ] **For other users**: Show ONLY reputation
    - [ ] Display format: `Y Reputation`
    - [ ] **Number formatting**: Truncate numbers >= 1000 to "1k", "3k", etc.
    - [ ] **Title attribute**: Display full value in `title` attribute for tooltip
  - [ ] Reputation uses red dot indicator (shade of red from globals.css)

### 3.2 Update All Brushdrips Displays

- [ ] **Create reputation color variable** (`frontend/src/assets/globals.css`):
  - [ ] Add CSS custom property: `--color-reputation` (shade of red)
  - [ ] Add to both light and dark themes
  - [ ] Example: `--color-reputation: #ef4444` (or similar red shade)
  - [ ] Create utility classes: `.text-reputation`, `.bg-reputation`, `.border-reputation`

- [ ] **Create utility function** (`utils/format-number.util.ts`):
  - [ ] `formatNumber(value: number | null | undefined): string`
  - [ ] Formats numbers >= 1000 as "1k", "3k", etc. (e.g., 1000 → "1k", 3500 → "3k")
  - [ ] Returns formatted string for display (e.g., "1k", "3k", "999")
  - [ ] Full number value is used separately in `title` attribute (not returned by function)
  - [ ] Handles null/undefined values (returns "0")
  - [ ] Handles negative numbers (preserves sign: "-1k")

- [ ] **Create reusable reputation components**:
  - [ ] `ReputationDisplay` component - Shows reputation with red dot indicator
    - [ ] Uses `formatNumber()` for display
    - [ ] Includes `title` attribute with full value
  - [ ] `ReputationBadge` component - Badge-style reputation display
    - [ ] Uses `formatNumber()` for display
    - [ ] Includes `title` attribute with full value
  - [ ] `UserStatsDisplay` component - Shows both BD (for current user) and Rep
    - [ ] Uses `formatNumber()` for both brushdrips and reputation
    - [ ] Includes `title` attributes with full values

- [ ] **Update components displaying brushdrips/reputation**:
  - [ ] `MainLayout.tsx` header (line ~264) - Show BD + Rep for current user, Rep only for others
    - [ ] Apply number formatting (truncate >= 1000 to "1k", etc.)
    - [ ] Add `title` attributes with full values
  - [ ] Profile/Timeline component - Show BD + Rep for own profile, Rep only for others
    - [ ] Apply number formatting (truncate >= 1000 to "1k", etc.)
    - [ ] Add `title` attributes with full values
  - [ ] User profile cards/summaries - Show Rep only (no BD)
    - [ ] Apply number formatting (truncate >= 1000 to "1k", etc.)
    - [ ] Add `title` attributes with full values
  - [ ] User hover modals - Show Rep only (no BD)
    - [ ] Apply number formatting (truncate >= 1000 to "1k", etc.)
    - [ ] Add `title` attributes with full values
  - [ ] Any `UserSummary` displays - Show Rep only (no BD)
    - [ ] Apply number formatting (truncate >= 1000 to "1k", etc.)
    - [ ] Add `title` attributes with full values
  - [ ] **Gallery list component** - Replace brushdrips with reputation
    - [ ] Apply number formatting (truncate >= 1000 to "1k", etc.)
    - [ ] Add `title` attributes with full values
  - [ ] **Collective component** - Count reputation of all users instead of brushdrips
    - [ ] Apply number formatting (truncate >= 1000 to "1k", etc.)
    - [ ] Add `title` attributes with full values
- [ ] **Strategy**: 
  - [ ] Current user: Show both BD and Rep
  - [ ] Other users: Show Rep only (replaces brushdrips display)

### 3.3 API Integration

- [ ] **Service Methods** (`user.service.ts` or new `reputation.service.ts`):
  - [ ] `getUserReputation(userId: number): Promise<{ reputation: number }>`
  - [ ] `getReputationLeaderboard(params?: { limit?, offset?, time_range? }): Promise<LeaderboardResponse>`
  - [ ] `getMyLeaderboardPosition(): Promise<{ rank, surrounding_users }>`
  - [ ] `getUserReputationHistory(userId: number, params?: { limit?, offset? }): Promise<ReputationHistoryResponse>`

- [ ] **React Query Hooks** (`use-reputation.ts`):
  - [ ] `useUserReputation(userId?: number)` - Fetches reputation for user (defaults to current user)
  - [ ] `useReputationLeaderboard(params)` - Fetches leaderboard
  - [ ] `useMyLeaderboardPosition()` - Fetches current user's rank
  - [ ] `useUserReputationHistory(userId?: number, params?)` - Fetches reputation history for user

- [ ] **Type Definitions** (`reputation.types.ts`):
  - [ ] `ReputationResponse` interface
  - [ ] `LeaderboardEntry` interface
  - [ ] `LeaderboardResponse` interface (paginated)
  - [ ] `ReputationHistoryEntry` interface (amount, source_type, source_id, source_object_type, description, created_at)
  - [ ] `ReputationHistoryResponse` interface (paginated)

### 3.4 Real-Time Updates

- [ ] **WebSocket Integration** (optional enhancement):
  - [ ] Broadcast reputation changes via WebSocket when user's reputation updates
  - [ ] Update UI in real-time when viewing leaderboard
  - [ ] Use existing `RealtimeConsumer` infrastructure

### 3.5 CSS Configuration

- [ ] **Add reputation color to globals.css**:
  - [ ] Define `--color-reputation` in both light and dark themes
  - [ ] Use shade of red (e.g., `#ef4444` or similar)
  - [ ] Create utility classes:
    - [ ] `.text-reputation` - Text color
    - [ ] `.bg-reputation` - Background color
    - [ ] `.border-reputation` - Border color
  - [ ] Ensure red dot indicator uses this color
  - [ ] Negative reputation values use this red color

---

## Phase 4: Frontend - Reputation Component (Leaderboard + History)

### 4.1 MainLayout Settings Sidebar Integration

- [ ] **Update Settings Sidebar** (`MainLayout.tsx`):
  - [ ] Add "Reputation" button below "Drips" button in `settingsItems` array
  - [ ] Button icon: Red dot or reputation icon
  - [ ] Button action: Opens reputation component (same layout as Drips page)
  - [ ] Position: After "Drips" item in settings menu

### 4.2 Reputation Component (Unified View)

- [ ] Create `Reputation` component (`components/reputation/reputation.component.tsx`):
  - [ ] **Layout**: Same as Drips page layout (for consistency)
  - [ ] **Tabs**:
    - [ ] Tab 1: "Leaderboard" - Shows reputation leaderboard
    - [ ] Tab 2: "History" - Shows reputation history for current user
  - [ ] Use existing tab component pattern (same as Drips page)

### 4.3 Leaderboard Tab

- [ ] **Leaderboard Tab Content**:
  - [ ] Display ranked list of users (table or card layout)
  - [ ] Show: rank, avatar, username, fullname, reputation count
  - [ ] Pagination controls (use existing pagination component)
  - [ ] Time range filter (all-time, monthly, weekly) - **Note**: Requires backend support
  - [ ] Highlight current user's position (if in view)
  - [ ] "Jump to my position" button
  - [ ] Loading states and error handling
  - [ ] Medal/badge icons for top 3 positions (🥇🥈🥉 or custom icons)
  - [ ] Highlight top 10 users with special styling
  - [ ] Responsive design (mobile-friendly table/cards)

### 4.4 History Tab

- [ ] **History Tab Content**:
  - [ ] Display reputation history for current user
  - [ ] Show: amount (colored red if negative), source_type, description, created_at
  - [ ] Group by date (optional enhancement)
  - [ ] Pagination controls
  - [ ] Loading states and error handling
  - [ ] Responsive design

### 4.5 Routing

- [ ] Add route: `/reputation` (unified reputation page with tabs)
- [ ] Settings sidebar button navigates to `/reputation`
- [ ] Consider adding to mobile bottom navigation (optional)

---

## Phase 5: Testing & Edge Cases

### 5.1 Edge Cases

- [ ] **Negative reputation**: ✅ Test display - Show negative values colored **RED** in UI
- [ ] **Post deletion**: ✅ Verify reputation is NOT affected (reputation remains unchanged)
- [ ] **Gallery deletion**: ✅ Verify reputation is NOT affected (reputation remains unchanged)
- [ ] **Praise/trophy/critique/award deletion**: Verify reputation IS reversed (user interaction deletion)
- [ ] **ReputationHistory**: Verify all reputation changes are recorded in history
- [ ] **Concurrent updates**: Test multiple simultaneous reputation updates
- [ ] **User deletion**: Verify reputation is handled (soft delete keeps data)
- [ ] **Invalid transactions**: Test reputation recalculation command
- [ ] **Large numbers**: Test leaderboard with 10,000+ users
- [ ] **Tie-breaking**: Test users with same reputation (should rank by ID or username)

### 5.2 Testing

- [ ] **Unit Tests:**
  - [ ] Test reputation calculation functions
  - [ ] Test reputation update utility
  - [ ] Test signal handlers
  - [ ] Test leaderboard query performance

- [ ] **Integration Tests:**
  - [ ] Test praise creation → reputation +1
  - [ ] Test trophy creation → reputation +5/+10/+20
  - [ ] Test positive critique (post) → reputation +3
  - [ ] Test negative critique (post) → reputation -3
  - [ ] Test neutral critique (post) → reputation unchanged
  - [ ] Test positive critique (gallery) → reputation +3
  - [ ] Test negative critique (gallery) → reputation -3
  - [ ] Test gallery award creation → reputation +5/+10/+20
  - [ ] Test praise deletion → reputation -1
  - [ ] Test gallery award deletion → reputation -5/-10/-20
  - [ ] Test leaderboard accuracy and pagination
  - [ ] Test negative reputation display (colored red in UI)

- [ ] **Performance Tests:**
  - [ ] Test leaderboard query with 10,000+ users
  - [ ] Test reputation update with concurrent requests
  - [ ] Test cache invalidation

### 5.3 Security & Validation

- [ ] Ensure users can't manipulate their own reputation directly
- [ ] Verify reputation updates only happen through valid interactions
- [ ] Test rate limiting (already handled by brushdrip system)
- [ ] Verify transaction atomicity (reputation + brushdrips in same transaction)

---

## Phase 6: Migration & Data

### 6.1 Existing Data

- [ ] **Decision**: Should existing users start with 0 reputation?
  - [ ] **Option 1**: All users start at 0 (clean slate)
  - [ ] **Option 2**: Calculate initial reputation from existing `BrushDripTransaction` records
  - [ ] **Recommendation**: **Option 2** - Fairer to existing users, maintains continuity
  - [ ] Implementation: Create management command `calculate_initial_reputation`

- [x] **Migration Command** (`backend/core/management/commands/calculate_initial_reputation.py`):
  - [x] **Optimization**: Use bulk operations for performance
  - [x] Query all `BrushDripTransaction` records (use `select_related('transacted_to')`)
  - [x] Group by `transacted_to` user in memory (dict)
  - [x] Calculate reputation based on transaction types:
    - [x] `transaction_object_type == 'praise'` → +1 per transaction
    - [x] `transaction_object_type == 'trophy'` → +amount per transaction
    - [x] `transaction_object_type == 'gallery_award'` → +amount per transaction
    - [x] `transaction_object_type == 'critique'` → Batch query `Critique` model to get impressions:
      - [x] Collect all critique IDs, query once with `Critique.objects.filter(critique_id__in=ids).values(...)`
      - [x] Create dict mapping critique_id → (impression, object_type)
      - [x] Positive → +3, Negative → -3, Neutral → 0
      - [x] Determine object_type: 'post' if post_id exists, 'gallery' if gallery_id exists (handles missing gallery_id gracefully)
  - [x] **Bulk update**: Use `User.objects.bulk_update()` to update all users at once
  - [x] **Create ReputationHistory records**: Use `ReputationHistory.objects.bulk_create()` for all historical changes
    - [x] Create history records for each transaction (for audit trail)
    - [x] Include source_type, source_id, source_object_type, description
    - [x] Preserve original transaction timestamps
  - [x] Log progress and results (shows progress every 1000 transactions)
  - [x] Support `--dry-run` flag for testing
  - [x] Support `--batch-size` parameter (default: 1000) for large datasets

### 6.2 Performance

- [ ] Add database index on `reputation` field (in migration)
- [ ] Consider composite index: `(reputation, id)` for leaderboard queries
- [ ] Cache leaderboard in Redis (5-minute TTL)
- [ ] Invalidate cache on reputation updates (signal-based)
- [ ] Consider materialized view for very large datasets (PostgreSQL-specific)

### 6.3 Data Integrity

- [ ] Create management command to verify reputation accuracy: `verify_reputation`
  - [ ] Recalculates reputation from transactions
  - [ ] Compares with stored reputation
  - [ ] Reports discrepancies
- [ ] Schedule periodic verification (cron job or Celery task)

---

## Questions to Clarify (UPDATED)

1. **Reputation Amounts:**
   - ✅ Confirmed: Reputation amounts match brushdrips (praise: +1, trophies: +5/+10/+20, critiques: +3/-3)
   - ❓ Should reputation amounts be configurable (settings) or hardcoded?
   - ❓ **Clarified**: Negative critique loses 3 reputation (equal to brushdrips cost) ✅

2. **Display:**
   - ❓ Replace brushdrips entirely with reputation, or show both?
   - ❓ Where should both be displayed? (Header, profile, cards?)
   - ❓ What icon/color for reputation? (Red dot, gold star, badge?)

3. **Leaderboard:**
   - ❓ Default time range? (All-time recommended for MVP)
   - ❓ How many users per page? (25 recommended)
   - ❓ Should it auto-refresh? (No for MVP, add later if needed)

4. **Reputation Calculation:**
   - ✅ **Clarified**: Post deletion → Keep reputation (no reversal)
   - ✅ **Clarified**: Praise/trophy/critique deletion → Reverse reputation
   - ❓ If critique impression is changed, recalculate reputation? (Recommended: Yes)
   - ❓ How to handle reputation corrections if transactions are invalid? (Management command)

5. **UI/UX:**
   - ✅ **Clarified**: Reputation indicator is red dot (shade of red, configurable in globals.css)
   - ✅ **Clarified**: Reputation visible to all users (replaces brushdrips display for other users)
   - ✅ **Clarified**: Reputation shown in user cards/hover modals (replaces brushdrips)
   - ✅ **Clarified**: Current user sees both BD and Rep, other users see Rep only

6. **Implementation Approach:**
   - ✅ **Clarified**: Use hybrid approach (signals + views)
   - ✅ **Clarified**: ReputationHistory model included from start

7. **Backend Algorithm Changes:**
   - ✅ **Clarified**: NO changes to `post/ranking.py` or any ranking algorithms
   - ✅ **Clarified**: NO changes to `post/algorithm.py` or any other algorithms
   - ✅ **Clarified**: Reputation is for display/leaderboard only, does NOT affect calculations

---

## File Structure (UPDATED)

### Backend
```
backend/core/
  models.py (add reputation field to User, create ReputationHistory model)
  views.py (reputation endpoints, leaderboard view, reputation history view)
  serializers.py (reputation serializer, leaderboard serializer, reputation history serializer)
  urls.py (reputation routes, reputation history routes)
  reputation.py (NEW - utility functions for reputation updates, creates history records)
  signals.py (NEW - signal handlers for reputation updates - handles all models)
  management/commands/
    calculate_initial_reputation.py (NEW - optimized with bulk operations, creates history records)
    verify_reputation.py (NEW - optional)
    recalculate_reputation.py (NEW - for corrections)
  migrations/ (reputation migration, reputation history migration)

backend/post/
  models.py (add gallery_id to Critique model, add indexes)
  views.py (update CritiqueCreateView for gallery support - accepts both post_id and gallery_id)
  serializers.py (update critique serializers for gallery_id)
  apps.py (connect signals on app ready)
  migrations/ (critique gallery_id migration)

backend/gallery/
  models.py (modify AwardType to use choices, add indexes to GalleryAward)
  views.py (create GalleryAwardCreateView, GalleryAwardDeleteView - similar to PostTrophyCreateView)
  serializers.py (create gallery award serializers - similar to trophy serializers)
  urls.py (add gallery award routes)
  apps.py (connect signals on app ready)
  migrations/ (award type choices migration)

backend/common/utils/
  choices.py (add GALLERY_AWARD_CHOICES, GALLERY_AWARD_BRUSH_DRIP_COSTS, update TRANSACTION_OBJECT_CHOICES)
```

### Frontend
```
frontend/src/
  components/
    reputation/
      reputation.component.tsx (NEW - unified component with tabs: Leaderboard + History)
      reputation-display.component.tsx (NEW - reusable reputation display with red dot)
      reputation-badge.component.tsx (NEW - badge-style reputation display)
      user-stats-display.component.tsx (NEW - shows BD + Rep for current user, Rep only for others)
      leaderboard-tab.component.tsx (NEW - leaderboard tab content)
      history-tab.component.tsx (NEW - history tab content)
    gallery/
      gallery-list.component.tsx (UPDATE - replace brushdrips with reputation, add number formatting)
    collective/
      collective.component.tsx (UPDATE - count reputation of all users instead of brushdrips, add number formatting)
    post/
      critique-section.component.tsx (UPDATE - add targetType prop for gallery support)
      trophy-button.component.tsx (UPDATE - add targetType prop for gallery awards)
      trophy-display.component.tsx (UPDATE - add targetType prop)
      trophy-list.component.tsx (UPDATE - add targetType prop)
  services/
    reputation.service.ts (NEW - or add to user.service.ts)
    post.service.ts (UPDATE - extend createCritique/getCritiques for gallery support)
    gallery.service.ts (UPDATE - add award methods, or extend post.service.ts)
  hooks/
    queries/
      use-reputation.ts (NEW)
      use-critiques.ts (UPDATE - add targetType: 'post' | 'gallery' parameter)
      use-trophies.ts (UPDATE - add targetType: 'post' | 'gallery' parameter)
  types/
    reputation.types.ts (NEW)
    post.types.ts (UPDATE - add gallery_id to Critique type)
    gallery.types.ts (UPDATE - add award types)
  utils/
    format-number.util.ts (NEW - utility function to format numbers as "1k", "3k", etc.)
  assets/
    globals.css (UPDATE - add --color-reputation CSS variable and utility classes)
```

---

## Implementation Order (OPTIMIZED)

### Day 1: Backend Foundation
1. **Morning:**
   - [ ] Add `reputation` field to User model
   - [ ] Create `ReputationHistory` model with all fields and indexes
   - [ ] Create migration (reputation field + ReputationHistory model)
   - [ ] Create `reputation.py` utility module (core functions, creates history records)
   - [ ] Create `signals.py` with signal handlers
   - [ ] Connect signals to models (`post_save`, `pre_delete`)

2. **Afternoon:**
   - [ ] Create API endpoints (get reputation, leaderboard, reputation history)
   - [ ] Create serializers (reputation, leaderboard, reputation history)
   - [ ] Add caching for leaderboard
   - [ ] Test reputation updates via signals (verify history records are created)

### Day 2: Backend Completion & Migration
1. **Morning:**
   - [ ] Create management command for initial reputation calculation
   - [ ] Run migration and calculate initial reputation
   - [ ] Test edge cases (deletions, concurrent updates)
   - [ ] Performance testing

2. **Afternoon:**
   - [ ] Frontend service methods
   - [ ] React Query hooks
   - [ ] Add reputation color variable to globals.css
   - [ ] Create `formatNumber` utility function (`utils/format-number.util.ts`)
     - [ ] Formats numbers >= 1000 as "1k", "3k", etc.
     - [ ] Handles null/undefined values
     - [ ] Handles negative numbers
   - [ ] Create reputation display components (ReputationDisplay, ReputationBadge)
   - [ ] Update MainLayout header to show BD + Rep for current user, Rep only for others
     - [ ] Apply `formatNumber()` to brushdrips and reputation counts
     - [ ] Add `title` attributes with full values for tooltips

### Day 3: Frontend & Polish
1. **Morning:**
   - [ ] Create unified Reputation component (with Leaderboard and History tabs)
   - [ ] Add "Reputation" button to MainLayout settings sidebar (below Drips)
   - [ ] Create leaderboard tab content
   - [ ] Create history tab content
   - [ ] Add routing for `/reputation`
   - [ ] Styling and responsive design (same layout as Drips page)
   - [ ] Implement negative reputation display (colored red)

2. **Afternoon:**
   - [ ] Update profile components (show BD + Rep for own profile, Rep only for others)
     - [ ] Apply number formatting and title attributes
   - [ ] Update gallery list component (replace brushdrips with reputation)
     - [ ] Apply number formatting and title attributes
   - [ ] Update collective component (count reputation instead of brushdrips)
     - [ ] Apply number formatting and title attributes
   - [ ] Update all user summary/card components (show Rep only, no BD)
     - [ ] Apply number formatting and title attributes
   - [ ] Testing (unit, integration, E2E)
   - [ ] Bug fixes
   - [ ] Documentation

### Day 4: Gallery Features
1. **Morning:**
   - [x] Add `gallery_id` field to Critique model
   - [ ] Create migration (NEXT STEP)
   - [x] Update CritiqueCreateView for gallery support (accepts both post_id and gallery_id)
   - [x] Update critique serializers (add gallery_id field)
   - [x] Update signal handlers to handle gallery critiques (already handles both via `get_recipient_for_critique()`)
   - [ ] Test gallery critique creation (after migration)

2. **Afternoon:**
   - [x] Create gallery award choices in choices.py
   - [x] Modify AwardType model (use choices)
   - [x] Create GalleryAwardCreateView and GalleryAwardDeleteView (similar to PostTrophyCreateView)
   - [x] Create gallery award serializers
   - [x] Add signal handlers for GalleryAward (reputation updates automatic)
   - [ ] Test gallery award creation (after migration)

### Day 5: Gallery Frontend Integration
1. **Morning:**
   - [x] Extend existing critique components for gallery support (reuse code) - CritiqueSection updated
   - [ ] Extend existing trophy components for gallery awards (reuse code)
   - [ ] Integrate in gallery comments section
   - [x] Update service methods and hooks (extend existing, don't duplicate) - Services and hooks updated

2. **Afternoon:**
   - [ ] Testing gallery features
   - [ ] UI/UX polish
   - [ ] Bug fixes
   - [ ] Documentation

---

## Notes & Best Practices

- **Keep brushdrips system intact** - Reputation is separate/additional metric
- **Reputation amounts always match brushdrips** - Ensures consistency
- **Use atomic transactions** - Reputation + brushdrips in same transaction
- **Use `select_for_update()` + `F()` expressions** - Prevents race conditions
- **Hybrid approach (signals + views)** - Signals for automatic updates, views for complex cases
- **Code reuse** - Extend existing components/hooks for gallery features instead of duplicating
- **Cache leaderboard** - Redis with 5-minute TTL, invalidate on updates
- **Index reputation field** - Critical for leaderboard performance
- **Allow negative reputation** - ✅ Display negative values colored **RED** in client UI
- **Reputation calculation from transactions** - Use `BrushDripTransaction` as source of truth for initial calculation
- **Management commands** - Essential for data migration and verification
- **Bulk operations** - Use `bulk_update()` and batch queries for performance in migrations
- **Generic components/hooks** - Create reusable components that work for both posts and galleries
- **Display logic**:
  - **Current user**: Show both brushdrips AND reputation
  - **Other users**: Show reputation ONLY (replaces brushdrips display)
- **Reputation color**: Red dot indicator (shade of red, configurable in globals.css)
- **No algorithm changes**: Reputation is for display/leaderboard only, does NOT affect post ranking or any algorithms

## Reputation Amount Reference

| Action | Brushdrip Cost/Grant | Reputation Change | Recipient |
|--------|---------------------|-------------------|-----------|
| Praise | Cost: 1, Grant: 1 | +1 | Post author |
| Bronze Trophy | Cost: 5, Grant: 5 | +5 | Post author |
| Golden Trophy | Cost: 10, Grant: 10 | +10 | Post author |
| Diamond Trophy | Cost: 20, Grant: 20 | +20 | Post author |
| Positive Critique (Post) | Cost: 3, Grant: 0 | +3 | Post author |
| Negative Critique (Post) | Cost: 3, Grant: 0 | -3 | Post author |
| Neutral Critique (Post) | Cost: 3, Grant: 0 | 0 | Post author |
| Positive Critique (Gallery) | Cost: 3, Grant: 0 | +3 | Gallery creator |
| Negative Critique (Gallery) | Cost: 3, Grant: 0 | -3 | Gallery creator |
| Neutral Critique (Gallery) | Cost: 3, Grant: 0 | 0 | Gallery creator |
| Bronze Gallery Award | Cost: 5, Grant: 5 | +5 | Gallery creator |
| Golden Gallery Award | Cost: 10, Grant: 10 | +10 | Gallery creator |
| Diamond Gallery Award | Cost: 20, Grant: 20 | +20 | Gallery creator |

## Phase 7: Gallery Critique Feature

### 7.1 Database Schema Updates

- [x] **Modify `Critique` model** (`backend/post/models.py`, line ~164):
  - [x] Add `gallery_id` field: `ForeignKey(Gallery, on_delete=models.SET_NULL, blank=True, null=True, related_name='gallery_critique')`
  - [x] Add validation: Ensure either `post_id` OR `gallery_id` is set (not both, not neither) - validation in serializer
  - [x] Add database index: `models.Index(fields=['gallery_id', 'is_deleted', 'created_at'], name='critique_gal_del_created_idx')`
  - [x] Update existing index to include gallery: Consider composite index for queries
  - [x] Create migration (completed - migrations already finished)

### 7.2 Backend Implementation

- [x] **Update `CritiqueCreateView`** (`backend/post/views.py`, line ~994):
  - [x] Accept `gallery_id` in request data (in addition to `post_id`)
  - [x] Validate: Either `post_id` OR `gallery_id` must be provided (not both)
  - [x] Determine recipient:
    - [x] If `post_id`: recipient = `post.author`
    - [x] If `gallery_id`: recipient = `gallery.creator`
  - [x] Apply reputation changes to recipient (same logic as post critiques)
  - [x] Create `BrushDripTransaction` with appropriate `transaction_object_type`

- [x] **Update `CritiqueSerializer`** (`backend/post/serializers.py`):
  - [x] Add `gallery_id` field to create/update serializers
  - [x] Add validation to ensure either `post_id` or `gallery_id` is provided
  - [x] Include `gallery_id` in response serializers (added `gallery_title` field)

- [ ] **Update `Comment` model usage** (already supports gallery via `gallery` field):
  - [ ] Ensure `Comment` model can reply to gallery critiques (via `critique_id` field)
  - [ ] Validation: If `is_critique_reply=True` and `critique_id` is set, ensure critique's `gallery_id` matches comment's `gallery` field
  - [ ] Update `GalleryCommentReplyCreateSerializer` to handle critique replies

- [ ] **Update critique deletion** (`CritiqueDeleteView`):
  - [ ] Handle deletion for both post and gallery critiques
  - [ ] Reverse reputation appropriately (same as post critiques)

### 7.3 Frontend Implementation

- [x] **Reuse existing critique components** (optimize for code reuse):
  - [x] **Option A (Recommended)**: Extend existing `CritiqueSection` component to accept `targetType: 'post' | 'gallery'` prop
  - [x] Updated `CritiqueSection` to accept `galleryId` and `targetType` props
  - [x] Updated `CritiqueCard` to work with both posts and galleries
  - [ ] Allow creating critiques on galleries (in gallery comments section) - Form modal needs update
  - [ ] Display gallery critiques in gallery comments section - Integration pending
  - [x] Allow replying to gallery critiques (use existing `Comment` component with `is_critique_reply=True`) - Hooks updated

- [x] **Update critique forms**:
  - [x] Modify existing critique creation form to accept `gallery_id` OR `post_id` parameter
  - [x] Update `CritiqueFormModal` to support `gallery_id`
  - [x] Update `use-critique-form.ts` to support `gallery_id`
  - [x] Update `PostUI` context to support `galleryId` for critiques
  - [x] Update validation to ensure either `post_id` or `gallery_id` is provided (not both)
  - [ ] Display critiques in gallery comments section (alongside regular comments) - Integration pending

- [x] **Service methods** (`post.service.ts` - extend existing):
  - [x] Update `createCritique()` to accept `gallery_id?: string` in addition to `post_id?: string`
  - [x] Update `getCritiques()` - Added `getGalleryCritiques()` method
  - [x] `deleteCritique()` already works for both (uses critique_id)

- [x] **React Query hooks** (extend existing):
  - [x] Update `useCritiques(targetId, targetType: 'post' | 'gallery')` - Generic hook for both
  - [x] Update `useCreateCritique()` to handle both post and gallery critiques
  - [x] Update `useUpdateCritique()`, `useDeleteCritique()`, and all reply hooks to support both
  - [x] `useDeleteCritique()` already works for both

### 7.4 UI/UX - Gallery Comments Section

- [ ] **Integrate critiques and awards in gallery comments section**:
  - [ ] Display gallery critiques alongside regular gallery comments
  - [ ] Display gallery awards in the same section
  - [ ] Use tabs or sections: "Comments", "Critiques", "Awards" (or unified view)
  - [ ] Allow users to:
    - [ ] Create critique on gallery
    - [ ] Reply to gallery critiques (as comments)
    - [ ] Award gallery
    - [ ] View all critiques and awards

---

## Phase 8: Gallery Award Feature

### 8.1 Database Schema Updates

- [x] **Create gallery award choices** (`backend/common/utils/choices.py`):
  - [x] Add `GALLERY_AWARD_CHOICES` (similar to `POST_TROPHY_CHOICES`)
  - [x] Add `GALLERY_AWARD_BRUSH_DRIP_COSTS` (same values as trophies)

- [x] **Modify `AwardType` model** (`backend/gallery/models.py`, line ~47):
  - [x] Change `award` field to use `CharField` with `choices=choices.GALLERY_AWARD_CHOICES`
  - [x] Keep `brush_drip_value` field (or derive from choices)
  - [x] Create migration (completed - migrations already finished)
  - [ ] Update existing `AwardType` records to use new choice values (if any exist)

- [x] **Update `GalleryAward` model** (`backend/gallery/models.py`, line ~41):
  - [x] Add `is_deleted` field for soft delete
  - [x] Add indexes for performance:
    - [x] `models.Index(fields=['gallery_id', 'author'], name='galleryaward_gal_author_idx')`
    - [x] `models.Index(fields=['author', 'awarded_at'], name='galleryaward_author_at_idx')`
  - [x] Ensure unique constraint: User can't award same gallery multiple times (enforced in serializer)

### 8.2 Backend Implementation

- [x] **Create `GalleryAwardCreateView`** (`backend/gallery/award_views.py`):
  - [x] Similar to `PostTrophyCreateView` (line ~1502 in `post/views.py`)
  - [x] Endpoint: `POST /api/gallery/award/create/`
  - [x] Request body: `{ "gallery_id": "<uuid>", "award_type": "bronze_stroke" | "golden_bristle" | "diamond_canvas" }`
  - [x] Validation:
    - [x] User has sufficient Brush Drips (5/10/20 based on award type)
    - [x] User can't award their own gallery (enforced)
    - [x] User can't award same gallery multiple times (enforced)
  - [x] Transaction logic:
    - [x] Lock wallets (`select_for_update()`)
    - [x] Deduct Brush Drips from user
    - [x] Add Brush Drips to gallery creator
    - [x] Create `GalleryAward` record
    - [x] Create `BrushDripTransaction` record
    - [x] Update reputation: `update_reputation(gallery.creator, +amount, 'gallery_award', award.id)` (via signals)
  - [x] All operations in `transaction.atomic()`

- [x] **Create `GalleryAwardDeleteView`** (`backend/gallery/award_views.py`):
  - [x] Endpoint: `DELETE /api/gallery/award/<award_id>/delete/`
  - [x] Soft delete the award
  - [x] Reverse Brush Drip transaction (if needed)
  - [x] Reverse reputation: `update_reputation(gallery.creator, -amount, 'gallery_award', award.id)` (via signals)

- [x] **Create serializers** (`backend/gallery/award_serializers.py`):
  - [x] `GalleryAwardCreateSerializer` - For creating awards
  - [x] `GalleryAwardSerializer` - For displaying awards
  - [x] `GalleryAwardDeleteSerializer` - For deleting awards

- [x] **Update URLs** (`backend/gallery/urls.py`):
  - [x] Add route: `path("award/create/", GalleryAwardCreateView.as_view(), name="gallery-award-create")`
  - [x] Add route: `path("award/<int:award_id>/delete/", GalleryAwardDeleteView.as_view(), name="gallery-award-delete")`
  - [x] Add route: `path("<uuid:gallery_id>/awards/", GalleryAwardListView.as_view(), name="gallery-award-list")`

### 8.3 Frontend Implementation

- [x] **Reuse existing trophy components** (optimize for code reuse):
  - [ ] **Option A (Recommended)**: Extend existing `TrophyButton`, `TrophyDisplay`, `TrophyList` components to accept `targetType: 'post' | 'gallery'` prop
  - [x] **Option B**: Create gallery award components that share logic via hooks/utilities
  - [x] Use same styling and behavior as post trophies for consistency
  - [x] Created `GalleryAwardDisplay` component (`frontend/src/components/gallery/gallery-award-display.component.tsx`) that inherits TrophyListModal style

- [x] **Service methods** (`gallery.service.ts` or extend `post.service.ts`):
  - [x] Added `createGalleryAward()` method in `gallery.service.ts`
  - [x] Added `getGalleryAwards()` method in `gallery.service.ts`
  - [x] Added `deleteGalleryAward()` method in `gallery.service.ts`
  - [x] Create React Query hooks for gallery awards
  - [x] Extend trophy components to support gallery awards

- [x] **React Query hooks** (extend existing):
  - [x] Created `useGalleryAwards()` hook for gallery awards
  - [x] Created `useCreateGalleryAward()` hook
  - [x] Created `useDeleteGalleryAward()` hook
  - [x] Update trophy components to support gallery awards (completed via GalleryAwardDisplay component)

- [x] **UI Integration in Gallery Comments Section**:
  - [x] Display gallery awards in gallery comments section
  - [x] Show award button/interface in same section
  - [x] Display awards alongside critiques and comments
  - [x] Use consistent styling with post trophies
  - [x] Integrated `GalleryAwardDisplay` component in `gallery-comment-section.component.tsx`
  - [x] Fixed missing imports (useState, usePostUI, useGalleryAwards, CritiqueSection, icons, modals)

### 8.4 Reputation Integration

- [x] **Update reputation calculation**:
  - [x] Gallery awards grant reputation to gallery creator (same as post trophies):
    - [x] Bronze Stroke: +5 reputation
    - [x] Golden Bristle: +10 reputation
    - [x] Diamond Canvas: +20 reputation
  - [x] Reputation updates handled automatically via signals (`on_gallery_award_created`, `on_gallery_award_deleted`)
  - [x] Reverse reputation on award deletion (handled by signal)

- [x] **Update management command** (`calculate_initial_reputation.py`):
  - [x] Include gallery awards in initial reputation calculation (import added, logic already handles it via transaction_object_type)
  - [x] Query `BrushDripTransaction` records with `transaction_object_type == 'gallery_award'` (already handled in existing logic)

- [x] **Update transaction object types** (`backend/common/utils/choices.py`):
  - [x] Add `'gallery_award'` to `TRANSACTION_OBJECT_CHOICES` (already done)
  - [x] Update `TRANSACTION_TYPES` SimpleNamespace (already done)

---

## Critical Implementation Details

1. **Transaction Safety**: Always use `transaction.atomic()` and `select_for_update()`
2. **Signal Timing**: Use `transaction.on_commit()` in signal handlers to ensure brushdrip transaction completes first
3. **Cache Invalidation**: Invalidate leaderboard cache when any user's reputation changes (via signal)
4. **Initial Migration**: Calculate reputation from existing `BrushDripTransaction` records (including gallery awards) - use bulk operations, create ReputationHistory records
5. **Deletion Handling**: 
   - ✅ **CRITICAL**: Post/gallery deletion does NOT affect reputation (reputation is permanent)
   - Reverse reputation ONLY when user interactions are deleted (praise/trophy/critique/gallery_award) via signals
6. **ReputationHistory**: Create history record for EVERY reputation change (audit trail)
7. **Performance**: Index `reputation` field, cache leaderboard, use `only()`/`defer()` in queries, bulk operations in migrations
8. **Negative Reputation**: ✅ **ALLOWED** - Display negative values colored **RED** in client UI
9. **Gallery Features**: Integrate critiques and awards in gallery comments section for unified UX
10. **Code Reuse**: Extend existing components/hooks for gallery features instead of duplicating code
11. **Generic Utilities**: Create shared functions for trophies/awards and critiques that work for both posts and galleries
12. **Reputation Permanence**: Reputation only changes on user interactions, NEVER on content deletion
13. **Frontend Display Rules**:
    - **Current user**: Show both brushdrips AND reputation (in header, profile, etc.)
    - **Other users**: Show reputation ONLY (replaces brushdrips display)
    - **Reputation indicator**: Red dot (shade of red, configurable in globals.css)
14. **No Algorithm Changes**: ✅ **CRITICAL** - Reputation is for display/leaderboard only
    - Do NOT modify `post/ranking.py` or any ranking algorithms
    - Do NOT modify `post/algorithm.py` or any other algorithms
    - Reputation does NOT affect post ranking, search, or any other calculations
    - Reputation is purely for display, leaderboard, and quick user performance view
15. **Component Updates**:
    - Gallery list component: Replace brushdrips with reputation
    - Collective component: Count reputation of all users instead of brushdrips
    - All user cards/summaries: Show reputation only (no brushdrips)
