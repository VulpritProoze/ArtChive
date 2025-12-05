import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@components/common/layout/MainLayout';
import { useGlobalSearch } from '@hooks/queries/use-global-search';
import { SimpleLoadingSpinner } from '@components/loading-spinner';
import { SearchResultUser } from '@components/common/search/search-result-user.component';
import { SearchResultPost } from '@components/common/search/search-result-post.component';
import { SearchResultCollective } from '@components/common/search/search-result-collective.component';
import { SearchResultGallery } from '@components/common/search/search-result-gallery.component';
import { Search, Filter } from 'lucide-react';

export const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const type = searchParams.get('type') || 'all';
  const [activeFilter, setActiveFilter] = useState<'all' | 'users' | 'posts' | 'collectives' | 'galleries'>(type as any || 'all');

  const { data, isLoading, error } = useGlobalSearch(
    query,
    { type: activeFilter },
    { enabled: query.length >= 2 }
  );

  useEffect(() => {
    if (type && type !== activeFilter) {
      setActiveFilter(type as any);
    }
  }, [type]);

  const handleFilterChange = (filter: 'all' | 'users' | 'posts' | 'collectives' | 'galleries') => {
    setActiveFilter(filter);
    setSearchParams({ q: query, ...(filter !== 'all' && { type: filter }) });
  };

  const filters = [
    { value: 'all' as const, label: 'All' },
    { value: 'users' as const, label: 'Users' },
    { value: 'posts' as const, label: 'Posts' },
    { value: 'collectives' as const, label: 'Collectives' },
    { value: 'galleries' as const, label: 'Galleries' },
  ];

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Search className="w-6 h-6 text-primary" />
            <h1 className="text-3xl font-bold">Search</h1>
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
        ) : isLoading ? (
          <div className="flex justify-center items-center py-12">
            <SimpleLoadingSpinner spinnerSize="lg" text="Searching..." />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-error">Error searching. Please try again.</p>
          </div>
        ) : data && data.total_count > 0 ? (
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
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-lg text-base-content/60">No results found for "{query}"</p>
            <p className="text-sm text-base-content/40 mt-2">Try a different search term</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

