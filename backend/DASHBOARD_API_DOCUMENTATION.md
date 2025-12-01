# Dashboard API Documentation

## Overview

The Dashboard API provides asynchronous endpoints for fetching statistics for the admin dashboard. This architecture improves performance by:

1. **Fast Initial Page Load**: HTML is served immediately without waiting for database queries
2. **Progressive Loading**: Statistics load sequentially, showing data as it arrives
3. **Caching**: All statistics are cached for 5 minutes to reduce database load
4. **Better UX**: Skeleton loaders provide visual feedback during data fetching

## Architecture

### Endpoint Structure

All dashboard API endpoints follow this pattern:
```
/api/{app}/dashboard/{app}/{resource}/{action}/
```

Where:
- `{app}` is the Django app name: `core`, `post`, `collective`, or `gallery`
- `{resource}` is the resource type: `users`, `posts`, `collectives`, etc.
- `{action}` is the action: `counts`, `growth`, `types`, etc.

### Authentication

All endpoints use:
- **Authentication**: `SessionAuthentication` (uses existing Django admin session)
- **Permission**: `IsAdminUser` (requires superuser status)

### Caching Strategy

- **Duration**: 5 minutes (300 seconds) for all statistics
- **Type**: Time-based expiration (TTL) - no manual invalidation
- **Backend**: Redis (via django_redis)
- **Rationale**: Dashboard statistics are aggregate data that don't require real-time accuracy

### Cache Key Format

```
dashboard:{app}:{stat_type}[:{range_param}]
```

Examples:
- `dashboard:core:users:counts`
- `dashboard:core:users:growth:1m`
- `dashboard:post:posts:counts`
- `dashboard:collective:collectives:types`

## API Endpoints

### Core Dashboard

#### User Statistics
- `GET /api/core/dashboard/core/users/counts/` - User counts (total, active, inactive, 24h, 1w, 1m, 1y)
- `GET /api/core/dashboard/core/users/growth/?range={range}` - User growth over time

#### Artist Statistics
- `GET /api/core/dashboard/core/artists/counts/` - Artist counts (total, active, deleted, 24h, 1w, 1m, 1y)
- `GET /api/core/dashboard/core/artists/growth/?range={range}` - Artist growth over time
- `GET /api/core/dashboard/core/artists/types/` - Artists by type (aggregation)

#### Transaction Statistics
- `GET /api/core/dashboard/core/transactions/counts/` - Transaction counts (total, 24h, 1w, 1m, 1y)
- `GET /api/core/dashboard/core/transactions/types/` - Transactions by type (aggregation)
- `GET /api/core/dashboard/core/transactions/volume/?range={range}` - Transaction volume over time

### Post Dashboard

#### Post Statistics
- `GET /api/post/dashboard/post/posts/counts/` - Post counts (total, active, deleted, 24h, 1w, 1m, 1y)
- `GET /api/post/dashboard/post/posts/growth/?range={range}` - Post growth over time
- `GET /api/post/dashboard/post/posts/types/` - Posts by type (aggregation)
- `GET /api/post/dashboard/post/posts/channels/` - Posts per channel (top 10)

#### Engagement Statistics
- `GET /api/post/dashboard/post/engagement/counts/` - Engagement counts (hearts, praises, trophies)

#### Comment Statistics
- `GET /api/post/dashboard/post/comments/counts/` - Comment counts (total, active, deleted, 24h, 1w, 1m, 1y)
- `GET /api/post/dashboard/post/comments/growth/?range={range}` - Comment growth over time
- `GET /api/post/dashboard/post/comments/types/` - Comments by type (aggregation)

#### Critique Statistics
- `GET /api/post/dashboard/post/critiques/counts/` - Critique counts (total, 24h, 1w, 1m, 1y)
- `GET /api/post/dashboard/post/critiques/growth/?range={range}` - Critique growth over time
- `GET /api/post/dashboard/post/critiques/impressions/` - Critiques by impression (aggregation)

#### Novel Statistics
- `GET /api/post/dashboard/post/novels/counts/` - Novel post counts (total, average chapters)

### Collective Dashboard

#### Collective Statistics
- `GET /api/collective/dashboard/collective/collectives/counts/` - Collective counts (total, 24h, 1w, 1m, 1y)
- `GET /api/collective/dashboard/collective/collectives/growth/?range={range}` - Collective growth over time
- `GET /api/collective/dashboard/collective/collectives/types/` - Collectives by artist type (aggregation)

#### Channel Statistics
- `GET /api/collective/dashboard/collective/channels/counts/` - Channel counts (total, 24h, 1w, 1m, 1y)
- `GET /api/collective/dashboard/collective/channels/growth/?range={range}` - Channel growth over time
- `GET /api/collective/dashboard/collective/channels/per-collective/` - Channels per collective (aggregation)

### Gallery Dashboard

#### Gallery Statistics
- `GET /api/gallery/dashboard/gallery/galleries/counts/` - Gallery counts (total, published, draft, archived, 24h, 1w, 1m, 1y)
- `GET /api/gallery/dashboard/gallery/galleries/growth/?range={range}` - Gallery growth over time

## Request Parameters

### Time Range Parameter

For growth endpoints, use the `range` query parameter:

- `24h` - Last 24 hours
- `1w` - Last week
- `1m` - Last month (default)
- `1y` - Last year

Example:
```
GET /api/core/dashboard/core/users/growth/?range=1w
```

## Response Formats

### Lightweight Count Endpoints

```json
{
  "total": 1234,
  "active": 1200,
  "inactive": 34,
  "24h": 5,
  "1w": 25,
  "1m": 100,
  "1y": 500
}
```

### Growth Data Endpoints

```json
{
  "growth_data": [
    {"x": "2024-01-01", "y": 5},
    {"x": "2024-01-02", "y": 8},
    {"x": "2024-01-03", "y": 12}
  ]
}
```

### Aggregation Endpoints

```json
{
  "data": [
    {"x": "Type A", "y": 100},
    {"x": "Type B", "y": 50},
    {"x": "Type C", "y": 25}
  ]
}
```

## Error Handling

All endpoints return standard HTTP status codes:
- `200 OK` - Successful request
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not a superuser
- `500 Internal Server Error` - Server error

## Frontend Integration

The frontend JavaScript automatically loads statistics when dashboard pages are loaded:

1. **Initial Load**: HTML is served immediately with skeleton loaders
2. **Lightweight Stats**: Count endpoints are fetched first (fast, immediate feedback)
3. **Heavy Stats**: Growth and aggregation endpoints are fetched sequentially
4. **Progressive Display**: Data is displayed as it arrives

### JavaScript Functions

- `loadCoreDashboardStats(range)` - Load Core dashboard statistics
- `loadPostDashboardStats(range)` - Load Post dashboard statistics
- `loadCollectiveDashboardStats(range)` - Load Collective dashboard statistics
- `loadGalleryDashboardStats(range)` - Load Gallery dashboard statistics

### Skeleton Loaders

Skeleton loaders are automatically shown/hidden:
- Stat cards show skeleton while loading
- Charts show skeleton while loading
- Content is hidden until data arrives

## Performance Considerations

1. **Caching**: All responses are cached for 5 minutes
2. **Sequential Loading**: Heavy computations load one at a time to avoid server overload
3. **Lightweight First**: Fast count queries load first for immediate user feedback
4. **Database Optimization**: Queries are optimized with proper indexes

## Cache Management

Cache keys are generated using `core.cache_utils.get_dashboard_cache_key()`:

```python
from core.cache_utils import get_dashboard_cache_key

# Generate cache key
cache_key = get_dashboard_cache_key('core', 'users', 'counts')
# Returns: 'dashboard:core:users:counts'

# With range parameter
cache_key = get_dashboard_cache_key('core', 'users', 'growth', '1m')
# Returns: 'dashboard:core:users:growth:1m'
```

Cache is automatically managed by Django's cache framework. No manual invalidation is needed - cache expires after 5 minutes.

## Development Notes

### Adding New Endpoints

1. Create API view in `{app}/dashboard_api_views.py`
2. Add route to `{app}/urls.py`
3. Add JavaScript loading function in `core/static/admin-dashboard/dashboard.js`
4. Update template with skeleton loaders and placeholders

### Testing

Test endpoints using:
- Django admin session (authentication)
- Browser developer tools (Network tab)
- API testing tools (Postman, curl, etc.)

Example curl request:
```bash
curl -X GET "http://localhost:8000/api/core/dashboard/core/users/counts/" \
  -H "Cookie: sessionid=YOUR_SESSION_ID"
```

