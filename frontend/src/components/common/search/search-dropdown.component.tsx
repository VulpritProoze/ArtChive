import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { useGlobalSearchPreview, useRecentSearchHistory } from '@hooks/queries/use-global-search';
import { SimpleLoadingSpinner } from '@components/loading-spinner';
import { SearchResultUser } from './search-result-user.component';
import { SearchResultPost } from './search-result-post.component';
import { SearchResultCollective } from './search-result-collective.component';
import { SearchResultGallery } from './search-result-gallery.component';

interface SearchDropdownProps {
  query: string;
  isOpen: boolean;
  onClose: () => void;
  onViewAll?: (type?: string) => void;
  onQuerySelect?: (query: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | HTMLDivElement | null>;
}

export const SearchDropdown = ({ query, isOpen, onClose, onViewAll, onQuerySelect, inputRef }: SearchDropdownProps) => {
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, error } = useGlobalSearchPreview(query, {}, { enabled: isOpen && query.length >= 2 });
  const { data: searchHistoryData, isLoading: isLoadingHistory } = useRecentSearchHistory({ enabled: isOpen && query.length < 2 });

  // Close dropdown on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Close dropdown when clicking outside both dropdown and input
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isOpen) return;
      
      const target = event.target as Node;
      const isClickInsideDropdown = dropdownRef.current?.contains(target);
      const isClickInsideInput = inputRef?.current?.contains(target);
      
      // Only close if click is outside both dropdown and input container
      if (!isClickInsideDropdown && !isClickInsideInput) {
        onClose();
      }
    };

    if (isOpen) {
      // Use click event (not capture phase) so stopPropagation works
      document.addEventListener('click', handleClickOutside);
      
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [isOpen, onClose, inputRef]);

  const handleViewAll = (type?: string) => {
    onClose();
    if (onViewAll) {
      onViewAll(type);
    } else {
      const searchParams = new URLSearchParams({ q: query });
      if (type && type !== 'all') {
        searchParams.set('type', type);
      }
      navigate(`/search?${searchParams.toString()}`);
    }
  };

  const handleHistoryItemClick = (historyQuery: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onQuerySelect) {
      onQuerySelect(historyQuery);
    }
    // Keep dropdown open to show search results
  };

  if (!isOpen) {
    return null;
  }

  // Show search history when query is empty or less than 2 characters
  if (query.length < 2) {
    return (
      <div
        ref={dropdownRef}
        className="absolute top-full left-0 right-0 mt-2 bg-base-100 rounded-xl shadow-2xl border border-base-300 z-50 max-h-[600px] overflow-y-auto"
      >
        {isLoadingHistory ? (
          <div className="flex items-center justify-center p-8">
            <SimpleLoadingSpinner spinnerSize="md" text="Loading..." />
          </div>
        ) : searchHistoryData && searchHistoryData.results.length > 0 ? (
          <div className="p-2">
            <div className="px-2 py-2 mb-2 border-b border-base-300">
              <h3 className="text-sm font-semibold text-base-content">Recent Searches</h3>
            </div>
            <div className="space-y-1">
              {searchHistoryData.results.map((historyItem) => (
                <button
                  key={historyItem.id}
                  onClick={(e) => handleHistoryItemClick(historyItem.query, e)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-base-200 rounded-lg transition-colors text-left"
                >
                  <Clock className="w-4 h-4 text-base-content/50 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-base-content truncate">{historyItem.query}</p>
                    <p className="text-xs text-base-content/60 capitalize">{historyItem.search_type}</p>
                  </div>
                  {historyItem.is_successful && (
                    <span className="text-xs text-base-content/40">{historyItem.result_count} results</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-base-content/60">
            <p>No recent searches</p>
          </div>
        )}
      </div>
    );
  }

  const results = data?.results;
  const hasResults = results && (
    results.users.count > 0 ||
    results.posts.count > 0 ||
    results.collectives.count > 0 ||
    results.galleries.count > 0
  );

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 right-0 mt-2 bg-base-100 rounded-xl shadow-2xl border border-base-300 z-50 max-h-[600px] overflow-y-auto"
    >
      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <SimpleLoadingSpinner spinnerSize="md" text="Searching..." />
        </div>
      ) : error ? (
        <div className="p-4 text-center text-error">
          <p>Error searching. Please try again.</p>
        </div>
      ) : !hasResults ? (
        <div className="p-4 text-center text-base-content/60">
          <p>No results found for "{query}"</p>
        </div>
      ) : (
        <div className="p-2">
          {/* Users Section */}
          {results.users.count > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between px-2 py-1 mb-2">
                <h3 className="text-sm font-semibold text-base-content">Users</h3>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleViewAll('users');
                  }}
                  className="text-xs text-primary hover:underline cursor-pointer"
                >
                  View All ({results.users.count})
                </button>
              </div>
              <div className="space-y-1">
                {results.users.items.slice(0, 3).map((user) => (
                  <SearchResultUser key={user.id} user={user} query={query} />
                ))}
              </div>
            </div>
          )}

          {/* Posts Section */}
          {results.posts.count > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between px-2 py-1 mb-2">
                <h3 className="text-sm font-semibold text-base-content">Posts</h3>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleViewAll('posts');
                  }}
                  className="text-xs text-primary hover:underline cursor-pointer"
                >
                  View All ({results.posts.count})
                </button>
              </div>
              <div className="space-y-1">
                {results.posts.items.slice(0, 3).map((post) => (
                  <SearchResultPost key={post.post_id} post={post} query={query} />
                ))}
              </div>
            </div>
          )}

          {/* Collectives Section */}
          {results.collectives.count > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between px-2 py-1 mb-2">
                <h3 className="text-sm font-semibold text-base-content">Collectives</h3>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleViewAll('collectives');
                  }}
                  className="text-xs text-primary hover:underline cursor-pointer"
                >
                  View All ({results.collectives.count})
                </button>
              </div>
              <div className="space-y-1">
                {results.collectives.items.slice(0, 3).map((collective) => (
                  <SearchResultCollective
                    key={collective.collective_id}
                    collective={collective}
                    query={query}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Galleries Section */}
          {results.galleries.count > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between px-2 py-1 mb-2">
                <h3 className="text-sm font-semibold text-base-content">Galleries</h3>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleViewAll('galleries');
                  }}
                  className="text-xs text-primary hover:underline cursor-pointer"
                >
                  View All ({results.galleries.count})
                </button>
              </div>
              <div className="space-y-1">
                {results.galleries.items.slice(0, 3).map((gallery) => (
                  <SearchResultGallery
                    key={gallery.gallery_id}
                    gallery={gallery}
                    query={query}
                  />
                ))}
              </div>
            </div>
          )}

          {/* View All Results Button */}
          {data && data.total_count > 0 && (
            <div className="border-t border-base-300 pt-2 mt-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleViewAll();
                }}
                className="w-full text-center py-2 text-sm font-semibold text-primary hover:bg-base-200 rounded-lg transition-colors cursor-pointer"
              >
                View All Results ({data.total_count})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

