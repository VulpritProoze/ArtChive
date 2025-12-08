# Global Search System - Implementation Plan

## Overview
Implement a comprehensive global search system that allows users to search across users, posts, collectives, and galleries with advanced filtering capabilities. Also implement context-specific search within collectives and galleries.

## Technology Stack Decision

### Recommended: PostgreSQL Full-Text Search
**Why:**
- ✅ Already using PostgreSQL (no additional dependencies)
- ✅ Fast and efficient for most use cases
- ✅ Built-in, no external services needed
- ✅ Good enough for moderate search needs
- ✅ Easy to implement and maintain

### Alternative: Meilisearch (if needed later)
**When to consider:**
- If PostgreSQL full-text search becomes insufficient
- Need advanced typo tolerance
- Need faceted search with complex filters
- Scale beyond PostgreSQL capabilities

**Decision:** Start with PostgreSQL Full-Text Search, migrate to Meilisearch if needed.

---

## Phase 1: Backend - Global Search API

### 1.0 User Search History Model

**File:** `backend/core/models.py` (or create `backend/common/models.py`)

**Model:** `UserSearchHistory`

**Fields:**
- `id` - Primary key
- `user` - ForeignKey to User (on_delete=CASCADE)
- `query` - CharField (max_length=255) - The search query
- `search_type` - CharField with choices: `('all', 'users', 'posts', 'collectives', 'galleries')`
- `result_count` - IntegerField (number of results found)
- `created_at` - DateTimeField (auto_now_add=True)
- `is_successful` - BooleanField (whether results were found)

**Indexes:**
- Index on `(user, created_at)` for fast user history retrieval
- Index on `query` for analytics

**Methods:**
- `__str__` - Return query string
- `get_recent_searches(user, limit=10)` - Class method to get recent searches

**Admin:**
- Register in Django admin
- Show user, query, search_type, created_at
- Filter by user, search_type, date

**Migration:**
- Create migration: `python manage.py makemigrations`
- Apply: `python manage.py migrate`

### 1.1 Database Setup (PostgreSQL Full-Text Search)

**Files to create/modify:**
- `backend/common/utils/search.py` - Search utilities
- `backend/common/search/` - New package for search functionality

**Tasks:**
1. Create search index migrations for:
   - Users: `username`, `email`, `first_name`, `last_name`
   - Posts: `description`, `post_type`
   - Collectives: `title`, `description`
   - Galleries: `title`, `description`, `status`

2. Add full-text search vectors to models (via migrations):
   ```python
   # Example for User model
   search_vector = SearchVectorField(null=True)
   ```

3. Create search ranking functions for relevance scoring

### 1.2 Unified Search Endpoint

**File:** `backend/common/views.py` (new file or add to existing)

**Endpoint:** `GET /api/search/`

**Query Parameters:**
- `q` (required): Search query string
- `type` (optional): Filter by type (`users`, `posts`, `collectives`, `galleries`, `all`)
- `limit` (optional): Results per type (default: 10)
- `offset` (optional): Pagination offset
- `sort` (optional): Sort order (`relevance`, `date`, `popularity`)

**Response Structure:**
```json
{
  "query": "search term",
  "results": {
    "users": {
      "count": 5,
      "items": [...]
    },
    "posts": {
      "count": 10,
      "items": [...]
    },
    "collectives": {
      "count": 3,
      "items": [...]
    },
    "galleries": {
      "count": 8,
      "items": [...]
    }
  },
  "total_count": 26
}
```

**Implementation:**
- Use PostgreSQL `SearchVector` and `SearchQuery`
- Combine results from all models
- Rank by relevance (ts_rank)
- Support pagination
- Cache popular searches
- **Save search to UserSearchHistory** (if user is authenticated)
  - Create `UserSearchHistory` entry after successful search
  - Store query, search_type, result_count, is_successful
  - Only save if query length >= 2 characters

### 1.3 Individual Type Search Endpoints

**Endpoints:**
- `GET /api/search/users/` - Search users only
- `GET /api/search/posts/` - Search posts only
- `GET /api/search/collectives/` - Search collectives only
- `GET /api/search/galleries/` - Search galleries only

**Benefits:**
- Allows frontend to fetch specific types
- Better performance for targeted searches
- Supports tabbed search UI

### 1.4 Search Serializers

**Files:**
- `backend/common/serializers.py` (or separate `search_serializers.py`)

**Serializers needed:**
- `UserSearchSerializer` - Lightweight user data for search results
- `PostSearchSerializer` - Post preview data
- `CollectiveSearchSerializer` - Collective preview data
- `GallerySearchSerializer` - Gallery preview data
- `UserSearchHistorySerializer` - For returning user's search history

**Fields to include:**
- Essential identifying fields (id, title/username, picture)
- Relevance score (optional, for debugging)
- Snippet/highlight of matching text

**UserSearchHistorySerializer fields:**
- `id`
- `query`
- `search_type`
- `result_count`
- `is_successful`
- `created_at`

### 1.5 Advanced Filtering

**Additional Query Parameters:**
- `date_from`, `date_to` - Date range filter
- `user_id` - Filter by specific user
- `collective_id` - Filter by collective
- `status` - Filter by status (for galleries: `active`, `draft`, `archived`)
- `post_type` - Filter post types
- `artist_types` - Filter users by artist types

### 1.6 User Search History Endpoint

**Endpoint:** `GET /api/search/history/`

**Query Parameters:**
- `limit` (optional): Number of recent searches (default: 10, max: 50)
- `search_type` (optional): Filter by search type

**Response:**
```json
{
  "results": [
    {
      "id": 1,
      "query": "artwork",
      "search_type": "all",
      "result_count": 25,
      "is_successful": true,
      "created_at": "2024-01-15T10:30:00Z"
    },
    ...
  ],
  "count": 10
}
```

**Permissions:**
- Requires authentication
- Users can only see their own search history

**Implementation:**
- Filter by authenticated user
- Order by `created_at` descending
- Limit results
- Return serialized `UserSearchHistory` objects

---

## Phase 2: Backend - Collective Search

### 2.1 Search Within Collective

**Endpoint:** `GET /api/collective/<collective_id>/search/`

**Search Scope:**
- Posts within collective channels
- Channel names and descriptions
- Member usernames (optional)

**Query Parameters:**
- `q` (required): Search query
- `channel_id` (optional): Limit to specific channel
- `post_type` (optional): Filter post types
- `date_from`, `date_to` (optional): Date range

**Implementation:**
- Search within collective's channels
- Filter by user permissions (members can search their collective)
- Return posts with channel context

### 2.2 Search Collective Members

**Endpoint:** `GET /api/collective/<collective_id>/members/search/`

**Search Scope:**
- Member usernames
- Member display names
- Member roles

---

## Phase 3: Backend - Gallery Search

### 3.1 Search Within "Browse Other Galleries"

**Endpoint:** `GET /api/gallery/search/`

**Query Parameters:**
- `q` (required): Search query
- `status` (optional): Filter by status (`active`, `draft`, `archived`)
- `creator_id` (optional): Filter by creator
- `date_from`, `date_to` (optional): Date range
- `has_awards` (optional): Filter galleries with awards
- `min_reputation` (optional): Filter by creator reputation

**Search Fields:**
- Gallery title
- Gallery description
- Creator username/name

**Integration:**
- Update `GalleryListView` to support search parameter
- Maintain backward compatibility with existing filters

---

## Phase 4: Frontend - Global Search UI

### 4.1 MainLayout Search Dropdown

**File:** `frontend/src/components/common/layout/MainLayout.tsx`

**Integration:**
- Use existing search input in MainLayout header (lines 249-258 for desktop, 347-357 for mobile)
- Convert to functional search with dropdown results
- Opens dropdown below search input when user types

**Features:**
- Search input with debouncing (300ms)
- Dropdown overlay below search input
- Shows page 1 results only (limited preview)
- Results grouped by type (Users, Posts, Collectives, Galleries)
- "View All [Type]" links to full search page
- "View All Results" link to global search component
- Loading state with small loading spinner (`SimpleLoadingSpinner` from `loading-spinner.tsx`)
- Empty state when no results
- Error handling
- Click outside to close
- ESC key to close
- Keyboard navigation (arrow keys to navigate results)

**UI/UX:**
- Dropdown appears below search input
- Max height with scroll for long results
- Shows top 3-5 results per type
- Each result type has a "View All" link
- Loading spinner appears in dropdown center
- Smooth transitions

**Implementation Details:**
- Create `SearchDropdown` component
- Use React Query hook for search
- Debounce input (300ms)
- Store search query in state
- Show/hide dropdown based on query and focus state

### 4.2 Global Search Component (Full Page)

**File:** `frontend/src/components/common/search/global-search.component.tsx`

**Route:** `/search` - Dedicated search page

**Features:**
- Full search interface with all results
- Search input with debouncing (300ms)
- Tabbed results (Users, Posts, Collectives, Galleries, All)
- Result cards with previews
- Pagination/infinite scroll for each tab
- Advanced filters sidebar
- Loading states
- Empty states
- Error handling
- Search history display
- Popular searches

**UI/UX:**
- Full page layout
- Keyboard navigation (ESC to close, arrow keys to navigate)
- Recent searches (from UserSearchHistory model)
- Popular searches (from backend)
- Filter chips/tags
- Sort options

### 4.2 Search Result Components

**Files:**
- `frontend/src/components/common/search/search-result-user.component.tsx`
- `frontend/src/components/common/search/search-result-post.component.tsx`
- `frontend/src/components/common/search/search-result-collective.component.tsx`
- `frontend/src/components/common/search/search-result-gallery.component.tsx`

**Features:**
- Clickable cards linking to respective pages
- Preview images
- Metadata (date, author, etc.)
- Highlight matching text

### 4.3 Search Dropdown Component

**File:** `frontend/src/components/common/search/search-dropdown.component.tsx`

**Props:**
- `query: string` - Current search query
- `isOpen: boolean` - Whether dropdown is open
- `onClose: () => void` - Close handler
- `onViewAll: (type?: string) => void` - Navigate to full search page

**Features:**
- Displays page 1 results (limited preview)
- Shows top 3-5 results per type
- Loading state with `SimpleLoadingSpinner` (small size)
- Empty state message
- "View All [Type]" buttons
- "View All Results" button
- Click outside to close
- ESC key to close
- Keyboard navigation

**UI Structure:**
```
┌─────────────────────────────┐
│ Loading Spinner (if loading)│
│ or                          │
│ ┌─────────────────────────┐ │
│ │ Users (3 results)      │ │
│ │ [User cards...]        │ │
│ │ [View All Users]       │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Posts (5 results)       │ │
│ │ [Post cards...]         │ │
│ │ [View All Posts]        │ │
│ └─────────────────────────┘ │
│ ... (Collectives, Galleries)│
│ ┌─────────────────────────┐ │
│ │ [View All Results]      │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

### 4.4 Search Service & Hooks

**File:** `frontend/src/services/search.service.ts`

**Methods:**
- `searchAll(query, filters, pagination)`
- `searchUsers(query, filters)`
- `searchPosts(query, filters)`
- `searchCollectives(query, filters)`
- `searchGalleries(query, filters)`
- `getSearchHistory(limit, searchType)` - Get user's search history

**File:** `frontend/src/hooks/queries/use-global-search.ts`

**Hooks:**
- `useGlobalSearch(query, filters, options)` - Full search with pagination
- `useGlobalSearchPreview(query, filters)` - Page 1 only (for dropdown)
- `useSearchUsers(query, filters)`
- `useSearchPosts(query, filters)`
- `useSearchCollectives(query, filters)`
- `useSearchGalleries(query, filters)`
- `useSearchHistory(limit, searchType)` - Get user's search history

**Features:**
- React Query for caching
- Debounced queries (300ms)
- Infinite scroll support (for full search page)
- Error handling
- `useGlobalSearchPreview` returns only first page (limited results)

### 4.5 Search Integration in MainLayout

**File:** `frontend/src/components/common/layout/MainLayout.tsx`

**Changes to existing search inputs:**

**Desktop Search (lines 249-258):**
- Add state for search query and dropdown visibility
- Add `onChange` handler with debouncing
- Add `onFocus` to show dropdown
- Add `onBlur` to hide dropdown (with delay to allow clicks)
- Integrate `SearchDropdown` component
- Use `useGlobalSearchPreview` hook
- Show `SimpleLoadingSpinner` when loading

**Mobile Search (lines 347-357):**
- Same implementation as desktop
- Dropdown appears below search input
- Responsive styling

**Implementation Steps:**
1. Import `SearchDropdown` component
2. Import `useGlobalSearchPreview` hook
3. Import `SimpleLoadingSpinner` from `loading-spinner.tsx`
4. Add state: `const [searchQuery, setSearchQuery] = useState('')`
5. Add state: `const [isDropdownOpen, setIsDropdownOpen] = useState(false)`
6. Add debounced search handler
7. Render `SearchDropdown` conditionally
8. Handle navigation to `/search` page

### 4.6 Search Integration Points

**Locations to add search:**
1. **MainLayout Header** - Search input with dropdown (page 1 preview)
2. **Dedicated Search Page** - `/search` route with full search interface
3. **Mobile Menu** - Search input in mobile header (same dropdown behavior)

---

## Phase 5: Frontend - Collective Search

### 5.1 Collective Search Component

**File:** `frontend/src/components/collective/collective-search.component.tsx`

**Integration:**
- Add to `CollectiveLayout` sidebar or header
- Search input in collective header
- Results filtered to current collective

**Features:**
- Search posts within collective
- Filter by channel
- Filter by post type
- Date range filter
- Real-time results as you type

### 5.2 Update CollectiveLayout

**File:** `frontend/src/components/common/layout/CollectiveLayout.tsx`

**Changes:**
- Add search input/icon in collective header
- Toggle search panel
- Display search results overlay

---

## Phase 6: Frontend - Gallery Search

### 6.1 Gallery Browse Search

**File:** `frontend/src/components/common/gallery-feature/section/other-galleries-section.component.tsx`

**Changes:**
- Add search bar above gallery grid
- Filter galleries by search query
- Maintain existing infinite scroll
- Add filter dropdowns (status, date, etc.)

**Features:**
- Search input with clear button
- Filter chips/tags
- Sort options (relevance, date, popularity)
- Results count display

### 6.2 Update Gallery Index

**File:** `frontend/src/components/gallery/index.component.tsx`

**Changes:**
- Integrate search into "Browse Other Galleries" section
- Pass search query to `OtherGalleriesSection`
- Update `useGalleryList` hook to accept search parameter

---

## Phase 7: Performance & Optimization

### 7.1 Backend Optimizations

1. **Database Indexing:**
   - Add GIN indexes for full-text search vectors
   - Index frequently searched fields
   - Composite indexes for common filter combinations

2. **Caching:**
   - Cache popular search queries (Redis)
   - Cache search results for 5-10 minutes
   - Invalidate cache on content updates

3. **Query Optimization:**
   - Use `select_related` and `prefetch_related`
   - Limit result sets appropriately
   - Use database connection pooling

4. **Rate Limiting:**
   - Add rate limits to search endpoints
   - Prevent abuse
   - Different limits for authenticated vs anonymous users

### 7.2 Frontend Optimizations

1. **Debouncing:**
   - Debounce search input (300ms)
   - Prevent excessive API calls

2. **Caching:**
   - React Query cache for search results
   - Cache recent searches in localStorage
   - Prefetch popular searches

3. **Lazy Loading:**
   - Lazy load search result images
   - Virtual scrolling for long result lists
   - Pagination/infinite scroll

4. **Code Splitting:**
   - Lazy load search components
   - Reduce initial bundle size

---

## Phase 8: Testing & Quality Assurance

### 8.1 Backend Tests

**Files:**
- `backend/common/tests/test_search.py`
- `backend/collective/tests/test_collective_search.py`
- `backend/gallery/tests/test_gallery_search.py`

**Test Cases:**
- Search accuracy (relevance ranking)
- Filter functionality
- Pagination
- Edge cases (empty queries, special characters)
- Performance (response times)
- Permission checks

### 8.2 Frontend Tests

**Files:**
- `frontend/src/components/common/search/__tests__/`
- `frontend/src/hooks/queries/__tests__/use-global-search.test.ts`

**Test Cases:**
- Search input handling
- Result rendering
- Filter application
- Navigation
- Error states
- Loading states

---

## Implementation Timeline

### Week 1: Backend Foundation
- ✅ Create UserSearchHistory model and migration
- ✅ Set up PostgreSQL full-text search
- ✅ Create unified search endpoint
- ✅ Implement individual type endpoints
- ✅ Create search serializers
- ✅ Add basic filtering
- ✅ Create search history endpoint

### Week 2: Backend Specialized Search
- ✅ Collective search endpoint
- ✅ Gallery search endpoint
- ✅ Advanced filtering
- ✅ Performance optimizations

### Week 3: Frontend Global Search
- ✅ Search dropdown component (for MainLayout)
- ✅ Global search component (full page)
- ✅ Search result components
- ✅ Search service & hooks (including preview hook)
- ✅ Integration into MainLayout search inputs
- ✅ Loading states with SimpleLoadingSpinner

### Week 4: Frontend Specialized Search
- ✅ Collective search UI
- ✅ Gallery browse search UI
- ✅ Filter UI components
- ✅ Polish & optimization

### Week 5: Testing & Refinement
- ✅ Backend tests
- ✅ Frontend tests
- ✅ Performance testing
- ✅ Bug fixes
- ✅ Documentation

---

## API Endpoints Summary

### Global Search
- `GET /api/search/` - Unified search across all types
- `GET /api/search/users/` - Search users
- `GET /api/search/posts/` - Search posts
- `GET /api/search/collectives/` - Search collectives
- `GET /api/search/galleries/` - Search galleries
- `GET /api/search/history/` - Get user's search history (authenticated)

### Collective Search
- `GET /api/collective/<collective_id>/search/` - Search within collective
- `GET /api/collective/<collective_id>/members/search/` - Search members

### Gallery Search
- `GET /api/gallery/search/` - Search galleries (enhanced version of existing)

---

## File Structure

```
backend/
├── common/
│   ├── search/
│   │   ├── __init__.py
│   │   ├── views.py          # Global search views
│   │   ├── serializers.py    # Search serializers
│   │   └── utils.py          # Search utilities
│   └── utils/
│       └── search.py          # Search helper functions
├── core/
│   └── models.py              # Add UserSearchHistory model
├── collective/
│   └── views.py               # Add collective search view
└── gallery/
    └── views.py               # Add gallery search view

frontend/src/
├── components/
│   ├── common/
│   │   ├── layout/
│   │   │   └── MainLayout.tsx          # Modify existing search inputs
│   │   └── search/
│   │       ├── search-dropdown.component.tsx      # New: Dropdown for MainLayout
│   │       ├── global-search.component.tsx         # Full page search
│   │       ├── search-result-*.component.tsx       # Result cards
│   │       └── search-filters.component.tsx         # Filter UI
│   ├── collective/
│   │   └── collective-search.component.tsx
│   └── gallery/
│       └── gallery-search.component.tsx
├── services/
│   └── search.service.ts
└── hooks/
    └── queries/
        └── use-global-search.ts
```

---

## Success Metrics

1. **Performance:**
   - Search results returned in < 200ms (95th percentile)
   - Frontend search UI responsive (< 100ms render)

2. **Accuracy:**
   - Relevant results in top 5 for 80% of queries
   - No false positives for exact matches

3. **User Experience:**
   - Search accessible from main navigation
   - Clear, intuitive filtering options
   - Helpful empty states and error messages

4. **Adoption:**
   - Track search usage analytics
   - Monitor popular search terms
   - Gather user feedback

---

## Future Enhancements

1. **Advanced Features:**
   - Search history
   - Saved searches
   - Search suggestions/autocomplete
   - Typo tolerance (fuzzy search)
   - Multi-language support

2. **Analytics:**
   - Search analytics dashboard
   - Popular searches
   - Search-to-conversion tracking
   - A/B testing for search UI

3. **AI/ML Integration:**
   - Personalized search results
   - Search result ranking based on user behavior
   - Semantic search (understanding intent)

4. **Migration to Meilisearch:**
   - If PostgreSQL search becomes limiting
   - Better typo tolerance needed
   - More advanced faceted search required

---

## Notes

- Start simple with PostgreSQL full-text search
- Iterate based on user feedback
- Monitor performance and scale as needed
- Keep search endpoints RESTful and consistent
- Document all search parameters and responses
- Consider accessibility (keyboard navigation, screen readers)

