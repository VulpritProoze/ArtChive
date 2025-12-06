import { useState, useEffect, useRef } from 'react';
import type { ReactElement } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@components/common/layout/MainLayout';
import { 
  useGlobalSearch, 
  useSearchUsers, 
  useSearchPosts, 
  useSearchCollectives, 
  useSearchGalleries 
} from '@hooks/queries/use-global-search';
import { SimpleLoadingSpinner } from '@components/loading-spinner';
import { SearchResultUser } from '@components/common/search/search-result-user.component';
import { SearchResultPost } from '@components/common/search/search-result-post.component';
import { SearchResultCollective } from '@components/common/search/search-result-collective.component';
import { SearchResultGallery } from '@components/common/search/search-result-gallery.component';
import { Search, Filter, ChevronRight } from 'lucide-react';

export const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const type = searchParams.get('type') || 'all';
  const [activeFilter, setActiveFilter] = useState<'all' | 'users' | 'posts' | 'collectives' | 'galleries'>(type as any || 'all');
  
  // Search input state
  const [searchInputValue, setSearchInputValue] = useState(query);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(query);
  
  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchInputValue);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchInputValue]);
  
  // Update search params when debounced query changes
  useEffect(() => {
    if (debouncedSearchQuery.length >= 2) {
      const params: Record<string, string> = { q: debouncedSearchQuery };
      // If active filter is not 'all', include the type parameter
      if (activeFilter !== 'all') {
        params.type = activeFilter;
      }
      // Reset to page 1 when search query changes
      params.page = '1';
      setSearchParams(params);
    } else if (debouncedSearchQuery.length === 0) {
      // Clear search params when query is empty
      const params: Record<string, string> = {};
      if (activeFilter !== 'all') {
        params.type = activeFilter;
      }
      setSearchParams(params);
    }
  }, [debouncedSearchQuery, activeFilter, setSearchParams]);
  
  // Sync search input with URL query param
  useEffect(() => {
    setSearchInputValue(query);
  }, [query]);

  // Use global search only when filter is 'all', otherwise use individual search hooks
  const globalSearchQuery = useGlobalSearch(
    query,
    {},
    { enabled: query.length >= 2 && activeFilter === 'all' }
  );

  const pageSize = parseInt(searchParams.get('page_size') || '10', 10);
  const observerTarget = useRef<HTMLDivElement>(null);

  const usersQuery = useSearchUsers(
    query,
    { page_size: pageSize },
    { enabled: query.length >= 2 && activeFilter === 'users' }
  );

  const postsQuery = useSearchPosts(
    query,
    { page_size: pageSize },
    { enabled: query.length >= 2 && activeFilter === 'posts' }
  );

  const collectivesQuery = useSearchCollectives(
    query,
    { page_size: pageSize },
    { enabled: query.length >= 2 && activeFilter === 'collectives' }
  );

  const galleriesQuery = useSearchGalleries(
    query,
    { page_size: pageSize },
    { enabled: query.length >= 2 && activeFilter === 'galleries' }
  );

  // Determine which query to use based on active filter
  const getActiveQuery = () => {
    switch (activeFilter) {
      case 'users':
        return usersQuery;
      case 'posts':
        return postsQuery;
      case 'collectives':
        return collectivesQuery;
      case 'galleries':
        return galleriesQuery;
      default:
        return globalSearchQuery;
    }
  };

  const activeQuery = getActiveQuery();
  // Handle both regular query and infinite query
  const data = 'pages' in activeQuery ? undefined : activeQuery.data;
  const isLoading = activeQuery.isLoading;
  const error = activeQuery.error;

  useEffect(() => {
    if (type && type !== activeFilter) {
      setActiveFilter(type as any);
    }
  }, [type]);

  const handleFilterChange = (filter: 'all' | 'users' | 'posts' | 'collectives' | 'galleries') => {
    // Update local state immediately for smooth UI transition
    setActiveFilter(filter);
    // Update URL params
    const params: Record<string, string> = { q: query };
    if (filter !== 'all') {
      params.type = filter;
    }
    // Reset to page 1 when changing filter
    params.page = '1';
    setSearchParams(params);
  };

  const handleViewMore = (type: 'users' | 'posts' | 'collectives' | 'galleries') => {
    setActiveFilter(type);
    setSearchParams({ q: query, type, page: '1' });
  };

  const handleLoadMore = () => {
    switch (activeFilter) {
      case 'users':
        usersQuery.fetchNextPage();
        break;
      case 'posts':
        postsQuery.fetchNextPage();
        break;
      case 'collectives':
        collectivesQuery.fetchNextPage();
        break;
      case 'galleries':
        galleriesQuery.fetchNextPage();
        break;
    }
  };

  // Infinite scroll observer for individual search types
  useEffect(() => {
    if (activeFilter === 'all') return;

    let hasNext = false;
    let isFetching = false;

    switch (activeFilter) {
      case 'users':
        hasNext = usersQuery.hasNextPage || false;
        isFetching = usersQuery.isFetchingNextPage || false;
        break;
      case 'posts':
        hasNext = postsQuery.hasNextPage || false;
        isFetching = postsQuery.isFetchingNextPage || false;
        break;
      case 'collectives':
        hasNext = collectivesQuery.hasNextPage || false;
        isFetching = collectivesQuery.isFetchingNextPage || false;
        break;
      case 'galleries':
        hasNext = galleriesQuery.hasNextPage || false;
        isFetching = galleriesQuery.isFetchingNextPage || false;
        break;
    }

    if (!hasNext) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNext && !isFetching) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget && hasNext) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
      observer.disconnect();
    };
  }, [activeFilter, query, pageSize, usersQuery.hasNextPage, postsQuery.hasNextPage, collectivesQuery.hasNextPage, galleriesQuery.hasNextPage]);

  const filters = [
    { value: 'all' as const, label: 'All' },
    { value: 'users' as const, label: 'Users' },
    { value: 'posts' as const, label: 'Posts' },
    { value: 'collectives' as const, label: 'Collectives' },
    { value: 'galleries' as const, label: 'Galleries' },
  ];

  // Skeleton components for search results
  const SearchResultSkeleton = ({ count = 3 }: { count?: number }) => {
    return (
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 p-2 rounded-lg">
            <div className="w-10 h-10 rounded-full skeleton flex-shrink-0"></div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="skeleton h-4 w-32"></div>
              <div className="skeleton h-3 w-24"></div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const SearchPostSkeleton = ({ count = 3 }: { count?: number }) => {
    return (
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 p-2 rounded-lg">
            <div className="w-16 h-16 rounded-lg skeleton flex-shrink-0"></div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="skeleton h-4 w-20"></div>
              <div className="skeleton h-3 w-full"></div>
              <div className="skeleton h-3 w-3/4"></div>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-6 h-6 rounded-full skeleton"></div>
                <div className="skeleton h-3 w-24"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const SearchCollectiveSkeleton = ({ count = 3 }: { count?: number }) => {
    return (
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 p-2 rounded-lg">
            <div className="w-12 h-12 rounded-lg skeleton flex-shrink-0"></div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="skeleton h-4 w-40"></div>
              <div className="skeleton h-3 w-full"></div>
              <div className="skeleton h-3 w-32"></div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const SearchGallerySkeleton = ({ count = 3 }: { count?: number }) => {
    return (
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 p-2 rounded-lg">
            <div className="w-16 h-16 rounded-lg skeleton flex-shrink-0"></div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="skeleton h-4 w-36"></div>
              <div className="skeleton h-3 w-full"></div>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-5 h-5 rounded-full skeleton"></div>
                <div className="skeleton h-3 w-28"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSearchResults = (): ReactElement => {
    // Check loading state for individual search types
    if (activeFilter !== 'all') {
      const activeQuery = getActiveQuery();
      // Only show loading if we don't have any data yet (initial load)
      // If we have data, keep showing it while fetching in background
      if (activeQuery.isLoading && !activeQuery.data) {
        // Show skeleton based on active filter
        return (
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              {filters.find(f => f.value === activeFilter)?.label}
              <span className="text-sm font-normal text-base-content/60">(Loading...)</span>
            </h2>
            {activeFilter === 'users' && <SearchResultSkeleton count={5} />}
            {activeFilter === 'posts' && <SearchPostSkeleton count={5} />}
            {activeFilter === 'collectives' && <SearchCollectiveSkeleton count={5} />}
            {activeFilter === 'galleries' && <SearchGallerySkeleton count={5} />}
          </div>
        );
      }
      if (activeQuery.error) {
        return (
          <div className="text-center py-12">
            <p className="text-error">Error searching. Please try again.</p>
          </div>
        );
      }
    } else {
      // Global search loading/error states
      // Only show loading if we don't have any data yet (initial load)
      if (isLoading && !data) {
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                Users
                <span className="text-sm font-normal text-base-content/60">(Loading...)</span>
              </h2>
              <SearchResultSkeleton count={3} />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                Posts
                <span className="text-sm font-normal text-base-content/60">(Loading...)</span>
              </h2>
              <SearchPostSkeleton count={3} />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                Collectives
                <span className="text-sm font-normal text-base-content/60">(Loading...)</span>
              </h2>
              <SearchCollectiveSkeleton count={3} />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                Galleries
                <span className="text-sm font-normal text-base-content/60">(Loading...)</span>
              </h2>
              <SearchGallerySkeleton count={3} />
            </div>
          </div>
        );
      }
      if (error) {
        return (
          <div className="text-center py-12">
            <p className="text-error">Error searching. Please try again.</p>
          </div>
        );
      }
    }

    // Render results
    // Handle different response structures based on filter type
    if (activeFilter === 'all') {
      // Global search response - show all types
      if (data && 'total_count' in data && data.total_count > 0) {
        return (
          <div className="space-y-8">
            {/* Users Section */}
            {data.results.users && data.results.users.count > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  Users
                  <span className="text-sm font-normal text-base-content/60">({data.results.users.count})</span>
                </h2>
                <div className="space-y-2">
                  {data.results.users.items.map((user) => (
                    <SearchResultUser key={user.id} user={user} query={query} />
                  ))}
                </div>
                {data.results.users.items.length < data.results.users.count && (
                  <button
                    onClick={() => handleViewMore('users')}
                    className="mt-3 text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                  >
                    View more users
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Posts Section */}
            {data.results.posts && data.results.posts.count > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  Posts
                  <span className="text-sm font-normal text-base-content/60">({data.results.posts.count})</span>
                </h2>
                <div className="space-y-2">
                  {data.results.posts.items.map((post) => (
                    <SearchResultPost key={post.post_id} post={post} query={query} />
                  ))}
                </div>
                {data.results.posts.items.length < data.results.posts.count && (
                  <button
                    onClick={() => handleViewMore('posts')}
                    className="mt-3 text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                  >
                    View more posts
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Collectives Section */}
            {data.results.collectives && data.results.collectives.count > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  Collectives
                  <span className="text-sm font-normal text-base-content/60">({data.results.collectives.count})</span>
                </h2>
                <div className="space-y-2">
                  {data.results.collectives.items.map((collective) => (
                    <SearchResultCollective
                      key={collective.collective_id}
                      collective={collective}
                      query={query}
                    />
                  ))}
                </div>
                {data.results.collectives.items.length < data.results.collectives.count && (
                  <button
                    onClick={() => handleViewMore('collectives')}
                    className="mt-3 text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                  >
                    View more collectives
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Galleries Section */}
            {data.results.galleries && data.results.galleries.count > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  Galleries
                  <span className="text-sm font-normal text-base-content/60">({data.results.galleries.count})</span>
                </h2>
                <div className="space-y-2">
                  {data.results.galleries.items.map((gallery) => (
                    <SearchResultGallery
                      key={gallery.gallery_id}
                      gallery={gallery}
                      query={query}
                    />
                  ))}
                </div>
                {data.results.galleries.items.length < data.results.galleries.count && (
                  <button
                    onClick={() => handleViewMore('galleries')}
                    className="mt-3 text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                  >
                    View more galleries
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        );
      }
      // No results for global search
      return (
        <div className="text-center py-12">
          <p className="text-lg text-base-content/60">No results found for "{query}"</p>
          <p className="text-sm text-base-content/40 mt-2">Try a different search term</p>
        </div>
      );
    } else {
      // Individual search response - show single type (using infinite query)
      let infiniteData: any;
      let hasNext = false;
      let isFetchingNext = false;

      switch (activeFilter) {
        case 'users':
          infiniteData = usersQuery.data;
          hasNext = usersQuery.hasNextPage ?? false;
          isFetchingNext = usersQuery.isFetchingNextPage ?? false;
          break;
        case 'posts':
          infiniteData = postsQuery.data;
          hasNext = postsQuery.hasNextPage ?? false;
          isFetchingNext = postsQuery.isFetchingNextPage ?? false;
          break;
        case 'collectives':
          infiniteData = collectivesQuery.data;
          hasNext = collectivesQuery.hasNextPage ?? false;
          isFetchingNext = collectivesQuery.isFetchingNextPage ?? false;
          break;
        case 'galleries':
          infiniteData = galleriesQuery.data;
          hasNext = galleriesQuery.hasNextPage ?? false;
          isFetchingNext = galleriesQuery.isFetchingNextPage ?? false;
          break;
      }

      // Check if we have data from infinite query
      // Handle both structures:
      // 1. Standard infinite query: { pages: [{ count, next, previous, results: [...] }, ...] }
      // 2. Direct response: { count, next, previous, results: [...] }
      let pages: Array<{ results: any[]; count: number; next: string | null }> = [];
      let totalCount = 0;
      
      if (infiniteData) {
        if (infiniteData.pages && Array.isArray(infiniteData.pages) && infiniteData.pages.length > 0) {
          // Standard infinite query structure
          pages = infiniteData.pages;
          totalCount = infiniteData.pages[0]?.count || 0;
        } else if ('results' in infiniteData && Array.isArray(infiniteData.results)) {
          // Direct response structure (fallback - React Query not wrapping properly)
          pages = [{
            results: infiniteData.results || [],
            count: infiniteData.count || 0,
            next: infiniteData.next || null
          }];
          totalCount = infiniteData.count || 0;
        }
      }
      
      const allResults = pages.flatMap(page => page.results || []);
      
      // Show results if we have any
      if (allResults.length > 0) {
        const renderResults = () => {
          switch (activeFilter) {
            case 'users':
              return allResults.map((user: any, index: number) => (
                <SearchResultUser key={`${user.id}-${index}`} user={user} query={query} />
              ));
            case 'posts':
              return allResults.map((post: any, index: number) => (
                <SearchResultPost key={`${post.post_id}-${index}`} post={post} query={query} />
              ));
            case 'collectives':
              return allResults.map((collective: any, index: number) => (
                <SearchResultCollective
                  key={`${collective.collective_id}-${index}`}
                  collective={collective}
                  query={query}
                />
              ));
            case 'galleries':
              return allResults.map((gallery: any, index: number) => (
                <SearchResultGallery
                  key={`${gallery.gallery_id}-${index}`}
                  gallery={gallery}
                  query={query}
                />
              ));
            default:
              return null;
          }
        };

        return (
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              {filters.find(f => f.value === activeFilter)?.label}
              <span className="text-sm font-normal text-base-content/60">({totalCount})</span>
            </h2>
            <div className="space-y-2">
              {renderResults()}
            </div>
            
            {/* Load More Button */}
            {hasNext && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={handleLoadMore}
                  disabled={isFetchingNext}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-content hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isFetchingNext ? (
                    <>
                      <SimpleLoadingSpinner spinnerSize="sm" />
                      Loading more...
                    </>
                  ) : (
                    <>
                      Load more
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Intersection observer target for infinite scroll */}
            {hasNext && (
              <div ref={observerTarget} className="h-10 w-full" />
            )}
          </div>
        );
      }
      
      // If we have pages but no results, show no results message
      return (
        <div className="text-center py-12">
          <p className="text-lg text-base-content/60">No results found for "{query}"</p>
          <p className="text-sm text-base-content/40 mt-2">Try a different search term</p>
        </div>
      );
    }
  };

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Search className="w-6 h-6 text-primary" />
            <h1 className="text-3xl font-bold">Search</h1>
          </div>

          {/* Search Input */}
          <div className="mb-4">
            <div className="relative w-full max-w-2xl">
              <input
                type="text"
                placeholder="Search artists, artworks, collectives..."
                value={searchInputValue}
                onChange={(e) => setSearchInputValue(e.target.value)}
                className="w-full px-4 py-2.5 pl-11 bg-base-200/50 rounded-full border border-base-300 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary focus:bg-base-200 transition-all"
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 flex-shrink-0 text-base-content/50" />
            </div>
          </div>

          {/* Search Query Display */}
          {query && (
            <div className="mb-4">
              <p className="text-base-content/70">
                Results for <span className="font-semibold text-base-content">"{query}"</span>
                {activeFilter !== 'all' && (
                  <span className="ml-2 text-sm">in {filters.find(f => f.value === activeFilter)?.label}</span>
                )}
              </p>
            </div>
          )}

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-base-content/50" />
            {filters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => handleFilterChange(filter.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeFilter === filter.value
                    ? 'bg-primary text-primary-content'
                    : 'bg-base-200 text-base-content hover:bg-base-300'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {!query || query.length < 2 ? (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-base-content/30 mx-auto mb-4" />
            <p className="text-lg text-base-content/60">Enter a search query to get started</p>
            <p className="text-sm text-base-content/40 mt-2">Search for users, posts, collectives, or galleries</p>
          </div>
        ) : renderSearchResults()}
      </div>
    </MainLayout>
  );
};
