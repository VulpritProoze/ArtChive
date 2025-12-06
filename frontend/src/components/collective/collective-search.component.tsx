import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useCollectiveSearchPosts } from '@hooks/queries/use-collective-search';
import { PostCard, InfiniteScrolling } from '@components/common/posts-feature';
import { SimpleLoadingSpinner } from '@components/loading-spinner';
import type { Channel } from '@types';

interface CollectiveSearchProps {
  collectiveId: string;
  selectedChannel?: Channel;
  onClose?: () => void;
}

export const CollectiveSearch = ({ collectiveId, selectedChannel, onClose }: CollectiveSearchProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const {
    data: searchData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isSearchLoading,
    error: searchError,
  } = useCollectiveSearchPosts(
    collectiveId,
    debouncedSearchQuery,
    {
      channel_id: selectedChannel?.channel_id,
      page_size: 10,
    },
    { enabled: debouncedSearchQuery.length >= 2 }
  );

  const searchResults = searchData?.pages.flatMap((page) => page.results) ?? [];

  // Focus search input when search is shown
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // Infinite scroll for search results
  useEffect(() => {
    if (!observerTarget.current) return;

    let isFetching = false;
    const target = observerTarget.current;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasNextPage &&
          !isFetchingNextPage &&
          !isSearchLoading &&
          !isFetching
        ) {
          isFetching = true;
          fetchNextPage().finally(() => {
            isFetching = false;
          });
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [hasNextPage, isFetchingNextPage, isSearchLoading, fetchNextPage]);

  if (!showSearch) {
    return (
      <button
        onClick={() => setShowSearch(true)}
        className="btn btn-ghost btn-sm gap-2"
        title="Search posts"
      >
        <Search className="w-4 h-4" />
        <span className="hidden sm:inline">Search</span>
      </button>
    );
  }

  return (
    <div className="w-full">
      {/* Search Input */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/50" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search posts in this collective..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2 bg-base-200 rounded-lg border border-base-300 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setDebouncedSearchQuery('');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => {
            setShowSearch(false);
            setSearchQuery('');
            setDebouncedSearchQuery('');
            onClose?.();
          }}
          className="btn btn-ghost btn-sm"
        >
          Cancel
        </button>
      </div>

      {/* Search Results */}
      {debouncedSearchQuery.length >= 2 && (
        <div className="space-y-4">
          {isSearchLoading && searchResults.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <SimpleLoadingSpinner spinnerSize="md" text="Searching..." />
            </div>
          ) : searchError ? (
            <div className="p-4 text-center text-error">
              <p>Error searching. Please try again.</p>
            </div>
          ) : searchResults.length > 0 ? (
            <>
              <div className="text-sm text-base-content/60 mb-4">
                Found {searchData?.pages[0]?.count || searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
              </div>
              <div className="space-y-4">
                {searchResults.map((post) => (
                  <PostCard
                    key={post.post_id}
                    postItem={{ ...post, novel_post: post.novel_post || [] }}
                    countsLoading={false}
                  />
                ))}
              </div>
              {hasNextPage && (
                <InfiniteScrolling
                  observerTarget={observerTarget}
                  isFetchingMore={isFetchingNextPage}
                  hasNextPage={hasNextPage}
                  totalCount={searchData?.pages[0]?.count || searchResults.length}
                  itemCount={searchResults.length}
                  itemName="post"
                  itemNamePlural="posts"
                />
              )}
            </>
          ) : (
            <div className="p-4 text-center text-base-content/60">
              <p>No posts found for "{debouncedSearchQuery}"</p>
            </div>
          )}
        </div>
      )}

      {debouncedSearchQuery.length < 2 && debouncedSearchQuery.length > 0 && (
        <div className="p-4 text-center text-base-content/60">
          <p>Type at least 2 characters to search</p>
        </div>
      )}
    </div>
  );
};

