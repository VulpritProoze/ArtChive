# Admin Dashboard Refactoring Plan

## Goal
Refactor admin-dashboard views to improve performance by:
1. Initially fetching only HTML (fast page load)
2. Fetching statistics one by one via API endpoints
3. Showing skeleton loaders while data is being fetched

## Current Issues
- All dashboard views calculate statistics synchronously in `get_context_data()`
- Heavy database queries block page rendering
- Slow initial page load time

## Architecture

### Backend Changes

#### 1. API Endpoints Structure
```
/api/dashboard/core/stats/          - Core dashboard statistics
/api/dashboard/post/stats/          - Post dashboard statistics
/api/dashboard/collective/stats/     - Collective dashboard statistics
/api/dashboard/gallery/stats/        - Gallery dashboard statistics
```

#### 2. Authentication
- Use `SessionAuthentication` (already authenticated via Django admin)
- Permission: `IsAdminUser` or `IsSuperuser`

#### 3. API Response Structure
Each endpoint should return:
```json
{
  "stat_cards": {
    "total_users": 1234,
    "active_users": 1200,
    ...
  },
  "chart_data": {
    "user_growth_data": [...],
    "artist_type_data": [...],
    ...
  }
}
```

#### 4. View Refactoring
- Remove all database queries from `get_context_data()`
- Return only template with minimal context (current_range, colors, etc.)
- Create separate API views for each dashboard's statistics

### Frontend Changes

#### 1. Skeleton Components
Create CSS classes for:
- `.skeleton-card` - Loading state for stat cards
- `.skeleton-chart` - Loading state for chart containers
- Use shimmer/pulse animation

#### 2. JavaScript Implementation
- Fetch statistics sequentially (one by one) to avoid overwhelming the server
- Show skeleton loaders while fetching
- Update DOM with data as it arrives
- Handle errors gracefully

#### 3. Template Updates
- Replace Django template variables with placeholder divs
- Add skeleton classes initially
- Use JavaScript to populate data

## Implementation Steps

### Phase 1: Backend API Setup
1. ✅ Create API endpoint structure
2. ✅ Create serializers for dashboard statistics
3. ✅ Create API views with SessionAuthentication
4. ✅ Add API routes to urls.py

### Phase 2: Refactor Views
1. ✅ Refactor CoreDashboardView (remove stats)
2. ✅ Refactor PostDashboardView (remove stats)
3. ✅ Refactor CollectiveDashboardView (remove stats)
4. ✅ Refactor GalleryDashboardView (remove stats)

### Phase 3: Frontend Implementation
1. ✅ Create skeleton card component (CSS)
2. ✅ Create skeleton chart component (CSS)
3. ✅ Update dashboard.js with API fetching logic
4. ✅ Update view.html templates with placeholders

### Phase 4: Testing
1. ✅ Test performance improvements
2. ✅ Verify all statistics load correctly
3. ✅ Test error handling

## File Structure

### New Files to Create
```
backend/core/
  serializers.py (add dashboard serializers)
  urls.py (add dashboard API routes)

backend/post/
  serializers.py (add dashboard serializers)
  urls.py (add dashboard API routes)

backend/collective/
  serializers.py (add dashboard serializers)
  urls.py (add dashboard API routes)

backend/gallery/
  serializers.py (add dashboard serializers)
  urls.py (add dashboard API routes)

backend/core/static/admin-dashboard/
  skeleton.css (skeleton loading styles)
```

### Files to Modify
```
backend/core/views.py
backend/post/views.py
backend/collective/views.py
backend/gallery/views.py
backend/core/static/admin-dashboard/dashboard.js
backend/core/templates/core/admin-dashboard/view.html
backend/post/templates/post/admin-dashboard/view.html
backend/collective/templates/collective/admin-dashboard/view.html
backend/gallery/templates/gallery/admin-dashboard/view.html
```

## API Endpoint Details

### Core Dashboard Stats API
**Endpoint:** `GET /api/dashboard/core/stats/?range=1m`

**Response:**
```json
{
  "users": {
    "total": 1234,
    "active": 1200,
    "inactive": 34,
    "24h": 5,
    "1w": 25,
    "1m": 100,
    "1y": 500,
    "growth_data": [...]
  },
  "artists": {
    "total": 800,
    "active": 780,
    "deleted": 20,
    "24h": 3,
    "1w": 15,
    "1m": 60,
    "1y": 300,
    "growth_data": [...],
    "type_counts": [...]
  },
  "transactions": {
    "total": 5000,
    "24h": 50,
    "1w": 250,
    "1m": 1000,
    "1y": 4000,
    "type_bar_data": [...],
    "volume_data": [...]
  }
}
```

### Post Dashboard Stats API
**Endpoint:** `GET /api/dashboard/post/stats/?range=1m`

**Response:**
```json
{
  "posts": {
    "total": 5000,
    "active": 4800,
    "deleted": 200,
    "24h": 50,
    "1w": 250,
    "1m": 1000,
    "1y": 4000,
    "growth_data": [...],
    "by_type": [...],
    "per_channel": [...]
  },
  "engagement": {
    "total_hearts": 10000,
    "total_praises": 5000,
    "total_trophies": 2000
  },
  "comments": {
    "total": 20000,
    "active": 19500,
    "deleted": 500,
    "24h": 200,
    "1w": 1000,
    "1m": 4000,
    "1y": 15000,
    "growth_data": [...],
    "by_type": [...]
  },
  "critiques": {
    "total": 1000,
    "24h": 10,
    "1w": 50,
    "1m": 200,
    "1y": 800,
    "growth_data": [...],
    "by_impression": [...]
  },
  "novel_posts": {
    "total": 100,
    "average_chapters": 5.5
  }
}
```

### Collective Dashboard Stats API
**Endpoint:** `GET /api/dashboard/collective/stats/?range=1m`

### Gallery Dashboard Stats API
**Endpoint:** `GET /api/dashboard/gallery/stats/?range=1m`

## Skeleton Loading Design

### Stat Card Skeleton
```css
.skeleton-card {
  background: linear-gradient(90deg, 
    var(--color-base-200) 25%, 
    var(--color-base-300) 50%, 
    var(--color-base-200) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### Chart Skeleton
```css
.skeleton-chart {
  min-height: 400px;
  background: var(--color-base-200);
  border-radius: 0.5rem;
  position: relative;
  overflow: hidden;
}
```

## JavaScript Fetching Strategy

```javascript
// Fetch statistics sequentially
async function loadDashboardStats() {
  const stats = [
    { id: 'users', url: '/api/dashboard/core/stats/users/' },
    { id: 'artists', url: '/api/dashboard/core/stats/artists/' },
    { id: 'transactions', url: '/api/dashboard/core/stats/transactions/' }
  ];
  
  for (const stat of stats) {
    try {
      showSkeleton(stat.id);
      const data = await fetch(stat.url);
      updateStatCard(stat.id, data);
      hideSkeleton(stat.id);
    } catch (error) {
      showError(stat.id, error);
    }
  }
}
```

## Notes
- Use `SessionAuthentication` since users are already authenticated via Django admin
- Consider caching statistics for 1-5 minutes to reduce database load
- Add error handling and retry logic
- Consider pagination for large datasets
- Add loading indicators for better UX

