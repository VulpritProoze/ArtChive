import { useState, useMemo, useRef, useEffect } from "react";
import { useAuth } from "@context/auth-context";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@components/common/layout";
import { SkeletonCollectiveCard } from "@components/common/skeleton";
import { ArrowUp, ArrowDown, ArrowUpDown, Clock, UserPlus, Settings, Plus, Search, X } from "lucide-react";
import { formatNumber } from "@utils/format-number.util";
import { CollectiveJoinRequestModal } from "@components/common/collective-feature/modal";
import { useBulkPendingJoinRequests } from "@hooks/queries/use-join-requests";
import { useCollectives, useBulkActiveMembersCount, type PaginatedCollectivesResponse } from "@hooks/queries/use-collectives";
import type { CollectiveListItem } from "@services/collective.service";
import { searchService, type CollectiveSearchResult } from "@services/search.service";

export default function Index() {
  const navigate = useNavigate();
  const [selectedCollective, setSelectedCollective] = useState<CollectiveListItem | null>(null);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CollectiveSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const { isMemberOfACollective, fetchCollectiveMemberDetails } =
    useAuth();

  // Fetch paginated collectives
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useCollectives(10);

  // Flatten all pages into a single array
  const collectives = useMemo(() => {
    if (!data?.pages) return [];
    return (data.pages as PaginatedCollectivesResponse[]).flatMap((page) => {
      // Filter out the public collective indicator
      return page.results.filter(
        (item) => item.collective_id !== "00000000-0000-0000-0000-000000000001"
      );
    });
  }, [data]);

  const handleJoinClick = (collective: CollectiveListItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCollective(collective);
    setIsJoinModalOpen(true);
  };

  const handleJoinSuccess = () => {
    // Refresh collectives list
    refetch();
    fetchCollectiveMemberDetails();
  };

  const handleCancelRequest = async () => {
    // Refresh collectives list to update pending status
    refetch();
  };

  const handleCollectiveClick = (collectiveId: string) => {
    navigate(`/collective/${collectiveId}`);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  // Handle search with debounce
  useEffect(() => {
    const handleSearch = async (query: string) => {
      if (!query || query.trim().length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        setSearchError(null);
        return;
      }

      setIsSearching(true);
      setSearchError(null);

      try {
        const response = await searchService.searchCollectives(query.trim(), {
          page_size: 50
        });
        setSearchResults(response.results);
      } catch (error: any) {
        setSearchError(error?.response?.data?.detail || "Failed to search collectives");
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Determine which collectives to display
  const displayCollectives = useMemo(() => {
    if (searchQuery.trim().length >= 2) {
      // Convert search results to CollectiveListItem format
      return searchResults.map((result) => ({
        collective_id: result.collective_id,
        title: result.title,
        description: result.description,
        picture: result.picture || "",
        created_at: result.created_at,
        updated_at: result.created_at,
        rules: [],
        artist_types: [],
        channels: [],
        member_count: result.member_count,
        reputation: 0,
      })) as CollectiveListItem[];
    }
    return collectives;
  }, [searchQuery, searchResults, collectives]);

  // Get collective IDs for bulk operations
  const collectiveIds = useMemo(() => 
    displayCollectives.map(c => c.collective_id),
    [displayCollectives]
  );

  // Fetch pending join requests for displayed collectives
  const { data: pendingRequestsMap = {} } = useBulkPendingJoinRequests(
    collectiveIds,
    displayCollectives.length > 0 && !isLoading && !isSearching
  );

  // Fetch active member counts for displayed collectives
  const { data: activeMembersCountMap = {} } = useBulkActiveMembersCount(
    collectiveIds,
    displayCollectives.length > 0 && !isLoading && !isSearching
  );

  return (
    <MainLayout showSidebar={true} showRightSidebar={false}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="bg-base-200/50 rounded-xl p-6">
          <div className="flex items-start justify-between mb-2">
            <h1 className="text-3xl font-bold text-base-content">
              Discover Collectives
            </h1>
            {/* Gear Icon Button with Dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="btn btn-ghost btn-circle"
                aria-label="Menu"
              >
                <Settings className="w-5 h-5" />
              </button>

              {/* Dropdown Menu */}
              {isMenuOpen && (
                <div className="absolute top-12 right-0 bg-base-100 shadow-lg rounded-lg border border-base-300 z-50 min-w-[160px]">
                  <div className="py-2">
                    <button
                      onClick={() => {
                        navigate("create");
                        setIsMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-base-200 transition-colors flex items-center gap-2 text-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create Collective</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <p className="text-base-content/70">
            Join artist communities and collaborate with fellow creators
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-base-200/50 rounded-xl p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-base-content/50 pointer-events-none z-10" />
            <input
              type="text"
              placeholder="Search collectives..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-bordered w-full pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                  setSearchError(null);
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 btn btn-ghost btn-sm btn-circle"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-xs text-base-content/60 mt-2">
              {isSearching ? "Searching..." : searchResults.length > 0 
                ? `Found ${searchResults.length} collective${searchResults.length !== 1 ? 's' : ''}`
                : searchError 
                  ? `Error: ${searchError}`
                  : "No collectives found"}
            </p>
          )}
        </div>

        {/* Collectives Grid */}
        <div>
          {isLoading || isSearching ? (
            <SkeletonCollectiveCard
              count={6}
              containerClassName="grid grid-cols-1 gap-4"
            />
          ) : displayCollectives.length === 0 ? (
            <div className="text-center my-16 bg-base-200/30 rounded-xl p-12">
              <div className="text-6xl mb-4">🎨</div>
              <p className="text-lg font-semibold text-base-content">
                {searchQuery ? "No collectives found." : "No collectives found."}
              </p>
              <p className="text-sm text-base-content/60 mt-2">
                {searchQuery ? "Try a different search term." : "Be the first to create one!"}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4">
                {displayCollectives.map((collective) => (
                <div
                  key={collective.collective_id}
                  className="card bg-base-100 shadow-md hover:shadow-xl transition-all duration-300 border border-base-300 cursor-pointer"
                  onClick={() => handleCollectiveClick(collective.collective_id)}
                >
                  <div className="card-body p-4">
                    <div className="flex gap-4">
                      {/* Collective Thumbnail */}
                      <div className="flex-shrink-0">
                        <div className="w-20 h-20 bg-base-300 rounded-lg overflow-hidden">
                          <img
                            src={collective.picture}
                            alt={collective.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = "";
                            }}
                          />
                        </div>
                      </div>

                      {/* Collective Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h2 className="text-lg font-bold text-base-content mb-1">
                              {collective.title}
                            </h2>
                            <div className="flex items-center gap-3 text-sm text-base-content/70">
                              <span>{collective.member_count || 0} members</span>
                              {(() => {
                                const reputation = collective.reputation ?? 0;
                                const isPositive = reputation > 0;
                                const isNegative = reputation < 0;
                                return (
                                  <span className="flex items-center gap-1" title="Total Reputation">
                                    {isPositive ? (
                                      <ArrowUp className="w-3 h-3 text-success flex-shrink-0" />
                                    ) : isNegative ? (
                                      <ArrowDown className="w-3 h-3 text-error flex-shrink-0" />
                                    ) : (
                                      <ArrowUpDown className="w-3 h-3 text-base-content/50 flex-shrink-0" />
                                    )}
                                    <span className={isPositive ? 'text-success' : isNegative ? 'text-error' : 'text-base-content/70'}>
                                      {formatNumber(reputation)} Rep
                                    </span>
                                  </span>
                                );
                              })()}
                              <span className="flex items-center gap-1" title="Total Posts">
                                💬 {collective.channels?.reduce((sum, ch) => sum + (ch.posts_count || 0), 0) || 0}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-cyan-500 text-sm font-medium">
                              {activeMembersCountMap[collective.collective_id] ?? 0} online
                            </span>
                            <div className="text-xs text-base-content/50 mt-1">
                              Active {new Date(collective.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        {/* Artist Types */}
                        {collective.artist_types.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {collective.artist_types.slice(0, 4).map((type, index) => (
                              <span
                                key={index}
                                className="px-3 py-1 bg-base-200 text-xs rounded-full text-base-content/80"
                              >
                                {type}
                              </span>
                            ))}
                            {collective.artist_types.length > 4 && (
                              <span className="px-3 py-1 bg-base-200 text-xs rounded-full text-base-content/60">
                                +{collective.artist_types.length - 4} more
                              </span>
                            )}
                          </div>
                        )}

                        {/* Channels */}
                        {collective.channels && collective.channels.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {collective.channels.slice(0, 3).map((channel) => (
                              <div
                                key={channel.channel_id}
                                className="flex items-center gap-2 text-sm text-base-content/70"
                              >
                                <span className="flex items-center gap-1">
                                  <span className="text-base-content/50">#</span>
                                  {channel.title}
                                </span>
                                <span className="badge badge-primary badge-sm"
                                  title={`${channel.posts_count ?? '?'} posts`}
                                >{channel.posts_count ?? '?'}</span>
                              </div>
                            ))}
                            {collective.channels && collective.channels.length > 3 && (
                              <span className="text-xs text-base-content/50">
                                +{collective.channels.length - 3} more channels
                              </span>
                            )}
                          </div>
                        )}

                        {/* Action Buttons - Hidden on hover/click to go to page */}
                        <div className="flex gap-2 mt-3">
                          {isMemberOfACollective(collective.collective_id) ? (
                            <button
                              className="btn btn-sm btn-primary"
                              disabled
                              onClick={(e) => e.stopPropagation()}
                            >
                              ✓ Joined
                            </button>
                          ) : pendingRequestsMap[collective.collective_id] ? (
                            <button
                              className="btn btn-sm"
                              onClick={(e) => handleJoinClick(collective, e)}
                            >
                              <Clock className="w-4 h-4 mr-1" />
                              Pending
                            </button>
                          ) : (
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={(e) => handleJoinClick(collective, e)}
                            >
                              <UserPlus className="w-4 h-4 mr-1" />
                              Join
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                ))}
              </div>

              {/* Load More Button - Only show when not searching */}
              {!searchQuery && hasNextPage && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="btn btn-primary"
                  >
                    {isFetchingNextPage ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {selectedCollective && (
        <CollectiveJoinRequestModal
          collective={selectedCollective}
          isOpen={isJoinModalOpen}
          onClose={() => {
            setIsJoinModalOpen(false);
            setSelectedCollective(null);
          }}
          onSuccess={handleJoinSuccess}
          onCancelRequest={handleCancelRequest}
          existingRequestId={pendingRequestsMap[selectedCollective.collective_id] || null}
        />
      )}
    </MainLayout>
  );
}