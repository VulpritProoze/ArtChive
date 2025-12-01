# Reputation System Implementation Plan

## Overview
Implement a reputation system where users earn or lose reputation based on interactions (praise, trophies, critiques). Create a leaderboard and update UI to display reputation alongside brushdrips.

---

## Phase 1: Backend - Reputation Model & Logic

### 1.1 Database Schema
- [ ] Create `Reputation` model or add `reputation` field to `User` model
- [ ] Add `reputation` field (IntegerField, default=0)
- [ ] Create migration
- [ ] Consider: Do we need a `ReputationHistory` model to track changes?

### 1.2 Reputation Calculation Logic
- [ ] **Earn Reputation:**
  - [ ] When user receives **praise** → Add reputation equal to brushdrips granted
  - [ ] When user receives **trophy** → Add reputation equal to brushdrips granted
  - [ ] When user receives **positive critique** → Add reputation equal to brushdrips granted
  
- [ ] **Lose Reputation:**
  - [ ] When user receives **negative critique** → Subtract reputation (amount TBD)

### 1.3 Implementation Points
- [ ] Identify where praise/trophy/critique actions occur in codebase
- [ ] Add reputation update logic to:
  - [ ] Praise creation endpoint
  - [ ] Trophy awarding endpoint
  - [ ] Critique creation endpoint (positive vs negative detection)
- [ ] Ensure atomic transactions (reputation update + brushdrips update)
- [ ] Add validation to prevent negative reputation (or allow it?)

### 1.4 API Endpoints
- [ ] Create endpoint to get user reputation: `GET /api/core/users/{id}/reputation/`
- [ ] Create endpoint to get reputation leaderboard: `GET /api/core/reputation/leaderboard/`
  - [ ] Support pagination
  - [ ] Support filtering (top 10, top 100, etc.)
  - [ ] Support time range (all-time, monthly, weekly)

---

## Phase 2: Backend - Leaderboard

### 2.1 Leaderboard View
- [ ] Create `ReputationLeaderboardView` or similar
- [ ] Query users ordered by reputation (descending)
- [ ] Include user info (username, profile_picture, reputation count)
- [ ] Add caching for performance (Redis)
- [ ] Support pagination

### 2.2 Leaderboard Serializer
- [ ] Create serializer for leaderboard entries
- [ ] Include: user_id, username, fullname, profile_picture, reputation, rank

---

## Phase 3: Frontend - Reputation Display

### 3.1 Update User Header/Profile
- [ ] **User Header (MainLayout):**
  - [ ] Display both brushdrips count AND reputation count
  - [ ] Use red dot indicator for reputation (similar to current brushdrips)
  - [ ] Update styling to accommodate both

- [ ] **Profile/Timeline:**
  - [ ] Replace brushdrips count display with reputation count
  - [ ] Or show both? (Clarify with user)

### 3.2 Update All Brushdrips Displays
- [ ] Find all components displaying brushdrips count
- [ ] Replace with reputation count OR show both
- [ ] Components to check:
  - [ ] MainLayout header
  - [ ] Profile/Timeline component
  - [ ] User profile cards
  - [ ] Any other user summary displays

### 3.3 API Integration
- [ ] Create service method: `getUserReputation(userId)`
- [ ] Create service method: `getReputationLeaderboard(params)`
- [ ] Create React Query hooks:
  - [ ] `useUserReputation(userId)`
  - [ ] `useReputationLeaderboard(params)`

---

## Phase 4: Frontend - Leaderboard Page

### 4.1 Leaderboard Component
- [ ] Create `ReputationLeaderboard` component
- [ ] Display ranked list of users
- [ ] Show: rank, avatar, username, reputation count
- [ ] Add pagination
- [ ] Add time range filter (all-time, monthly, weekly)
- [ ] Highlight current user's position

### 4.2 Routing
- [ ] Add route: `/reputation/leaderboard` or `/leaderboard`
- [ ] Add navigation link in MainLayout or appropriate location

---

## Phase 5: Testing & Edge Cases

### 5.1 Edge Cases
- [ ] What happens if reputation goes negative?
- [ ] What if user deletes a post that had reputation-earning interactions?
- [ ] Handle concurrent reputation updates
- [ ] Prevent reputation manipulation (e.g., spam praising)

### 5.2 Testing
- [ ] Test reputation earning from praise
- [ ] Test reputation earning from trophy
- [ ] Test reputation earning from positive critique
- [ ] Test reputation loss from negative critique
- [ ] Test leaderboard accuracy
- [ ] Test UI updates in real-time
- [ ] Test pagination and filtering

---

## Phase 6: Migration & Data

### 6.1 Existing Data
- [ ] Decide: Should existing users start with 0 reputation?
- [ ] Or calculate initial reputation from existing interactions?
- [ ] Create migration script if calculating from history

### 6.2 Performance
- [ ] Index `reputation` field for fast leaderboard queries
- [ ] Consider materialized view or cached leaderboard
- [ ] Optimize reputation update queries

---

## Questions to Clarify

1. **Reputation Loss:**
   - How much reputation is lost for negative critique? (Equal to brushdrips lost? Fixed amount?)

2. **Display:**
   - Replace brushdrips entirely with reputation, or show both?
   - Where should both be displayed?

3. **Leaderboard:**
   - Default time range? (All-time, monthly, weekly?)
   - How many users per page?
   - Should it auto-refresh?

4. **Reputation Calculation:**
   - Should reputation be recalculated if a post is deleted?
   - Should reputation be recalculated if a critique is changed from positive to negative?

5. **UI/UX:**
   - What color/style for reputation indicator? (Red dot mentioned)
   - Should reputation be visible to all users or only on profile?

---

## File Structure (Expected)

### Backend
```
backend/core/
  models.py (add reputation field)
  views.py (reputation endpoints, leaderboard view)
  serializers.py (reputation serializer, leaderboard serializer)
  urls.py (reputation routes)
  migrations/ (reputation migration)
```

### Frontend
```
frontend/src/
  components/
    reputation/
      leaderboard.component.tsx
  services/
    reputation.service.ts (or add to user.service.ts)
  hooks/
    queries/
      use-reputation.ts
  types/
    reputation.types.ts
```

---

## Implementation Order

1. **Day 1 Morning:** Backend model, migration, basic reputation calculation
2. **Day 1 Afternoon:** API endpoints, leaderboard backend
3. **Day 2 Morning:** Frontend service, hooks, update UI displays
4. **Day 2 Afternoon:** Leaderboard component, routing, testing

---

## Notes
- Keep brushdrips system intact (reputation is separate/additional)
- Ensure reputation updates are atomic with brushdrips updates
- Consider rate limiting for reputation updates to prevent abuse
- Add logging/auditing for reputation changes (optional but recommended)

