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
  - [ ] When user receives **praise** → Add reputation amount equal to brushdrips granted (1 reputation)
  - [ ] When user receives **trophy** → Add reputation amount equal to brushdrips granted
    - [ ] Bronze Stroke: +5 reputation (matches 5 brushdrips)
    - [ ] Golden Bristle: +10 reputation (matches 10 brushdrips)
    - [ ] Diamond Canvas: +20 reputation (matches 20 brushdrips)
  - [ ] When user receives **positive critique** → Add reputation amount equal to brushdrips granted (3 reputation)
  
- [ ] **Lose Reputation:**
  - [ ] When user receives **negative critique** → Subtract reputation amount equal to brushdrips cost (3 reputation)
  - [ ] Note: Reputation amount lost equals the brushdrips cost of the critique

### 1.3 Implementation Points
- [ ] Identify where praise/trophy/critique actions occur in codebase
- [ ] Add reputation update logic to:
  - [ ] Praise creation endpoint (`PostPraiseCreateView`)
    - [ ] Add reputation amount: +1 (matches brushdrips granted)
  - [ ] Trophy awarding endpoint (`PostTrophyCreateView`)
    - [ ] Add reputation amount: +amount (matches brushdrips granted, varies by trophy type)
  - [ ] Critique creation endpoint (`CritiqueCreateView`)
    - [ ] Positive critique: Add reputation amount: +3 (matches brushdrips cost)
    - [ ] Negative critique: Subtract reputation amount: -3 (matches brushdrips cost)
    - [ ] Neutral critique: No reputation change
- [ ] Ensure atomic transactions (reputation update + brushdrips update)
- [ ] Use `select_for_update()` to lock user row during reputation updates
- [ ] Add validation to prevent negative reputation (or allow it?)
- [ ] Store reputation amount changes in same transaction as brushdrips updates

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

1. **Reputation Amounts:**
   - Reputation amounts match brushdrips: praise (+1), trophies (+5/+10/+20), critiques (+3/-3)
   - Should reputation amounts be configurable or hardcoded?
   - Confirm: Negative critique loses 3 reputation (equal to brushdrips cost)?

2. **Display:**
   - Replace brushdrips entirely with reputation, or show both?
   - Where should both be displayed?

3. **Leaderboard:**
   - Default time range? (All-time, monthly, weekly?)
   - How many users per page?
   - Should it auto-refresh?

4. **Reputation Calculation:**
   - Should reputation amounts be recalculated if a post is deleted?
   - Should reputation amounts be recalculated if a critique is changed from positive to negative?
   - If a praise/trophy/critique is deleted, should the reputation amount be reversed?
   - How to handle reputation amount corrections if transactions are found to be invalid?

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
- Reputation amounts always match brushdrips amounts for consistency
- Ensure reputation updates are atomic with brushdrips updates
- Use `select_for_update()` to prevent race conditions on reputation updates
- Consider rate limiting for reputation updates to prevent abuse
- Add logging/auditing for reputation amount changes (optional but recommended)
- Reputation amount calculation:
  - Praise: +1 reputation (1 brushdrip granted)
  - Trophy: +5/+10/+20 reputation (matches trophy brushdrip value)
  - Positive critique: +3 reputation (3 brushdrips cost)
  - Negative critique: -3 reputation (3 brushdrips cost)

