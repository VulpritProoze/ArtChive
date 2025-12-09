import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import GalleryReplyComponent from './gallery-reply.component';
import { SkeletonComment } from '@components/common/skeleton/skeleton-comment.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComment, faStar, faTrophy } from '@fortawesome/free-solid-svg-icons';
import { useGalleryComments } from '@hooks/queries/use-gallery-comments';
import { useGalleryAwards } from '@hooks/queries/use-gallery-awards';
import { useGallery } from '@hooks/queries/use-gallery';
import { useAuth } from '@context/auth-context';
import { usePostUI } from '@context/post-ui-context';
import { CritiqueSection } from '@components/common/posts-feature/critique-section.component';
import TrophySelectionModal from '@components/common/posts-feature/modal/trophy-selection.modal';
import TrophyListModal from '@components/common/posts-feature/modal/trophy-list.modal';
import GalleryAwardDisplay from './gallery-award-display.component';
import GalleryCommentFormModal from './modal/gallery-comment-form.modal';
import { CritiqueFormModal } from '@components/common/posts-feature/modal/critique-form.modal';
import type { Comment } from '@types';

interface GallerySidebarSectionProps {
  galleryId: string;
  highlightedItemId?: string | null;
  enableInitialFetch?: boolean;
  onEditComment?: (comment: Comment) => void;
}

const GallerySidebarSection = ({ 
  galleryId, 
  highlightedItemId, 
  enableInitialFetch = true,
  onEditComment,
}: GallerySidebarSectionProps) => {
  const { user } = useAuth();
  const {
    showTrophyModal,
    setShowTrophyModal,
    selectedPostForTrophy,
    setSelectedPostForTrophy,
    setSelectedPostTrophyAwards,
    showTrophyListModal,
    setShowTrophyListModal,
    setSelectedComment,
    setCommentTargetGalleryId,
    setShowCommentForm,
    setEditingComment,
  } = usePostUI();
  const [activeTab, setActiveTab] = useState<'comments' | 'critiques' | 'awards'>('comments');
  
  // Fetch gallery details - use public endpoint for published galleries
  const { data: gallery, isLoading: isLoadingGallery } = useGallery(galleryId, {
    enabled: Boolean(galleryId),
    usePublic: true, // Use public endpoint to allow viewing published galleries
  });
  
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
  } = useGalleryComments(galleryId, { enabled: enableInitialFetch && Boolean(galleryId) && activeTab === 'comments' });

  // Fetch gallery awards for awards tab
  const { data: awardsData } = useGalleryAwards(galleryId, { 
    enabled: activeTab === 'awards' && Boolean(galleryId) 
  });
  const awards = useMemo(
    () => awardsData?.pages.flatMap((page) => page.results || []) ?? [],
    [awardsData]
  );

  // Track creation state for skeleton loader
  const { data: isCreating = false } = useQuery({
    queryKey: ['gallery-comment-creating', galleryId],
    queryFn: () => false,
    initialData: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const comments = useMemo(
    () => data?.pages.flatMap((page) => page.results || []) ?? [],
    [data],
  );
  const topLevelComments = comments.filter((comment) => !comment.replies_to);
  const totalComments =
    data?.pages[0]?.total_comments ?? data?.pages[0]?.count ?? 0;

  const handleAddComment = () => {
    setSelectedComment(null);
    setCommentTargetGalleryId(galleryId);
    setEditingComment(false);
    setShowCommentForm(true);
  };

  const handleEmptyStateClick = () => {
    if (user) {
      handleAddComment();
    }
  };

  useEffect(() => {
    if (!highlightedItemId) return;
    const element = document.getElementById(highlightedItemId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedItemId, comments]);

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const handleOpenAwardModal = () => {
    setSelectedPostForTrophy(galleryId);
    // Don't clear awards - let TrophySelectionModal fetch and initialize them
    // setSelectedPostTrophyAwards([]);
    setShowTrophyModal(true);
  };

  const handleOpenAwardList = () => {
    setShowTrophyListModal(true);
  };

  const handleCloseAwardList = () => {
    setShowTrophyListModal(false);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="mt-4">
      {/* Gallery Details Section - Instagram Style */}
      {gallery && (
        <div className="mb-6 pb-6 border-b border-base-300">
          {/* Creator Info */}
          {gallery.creator_details && (
            <div className="flex items-center gap-3 mb-4">
              <Link
                to={`/profile/@${gallery.creator_details.username}`}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <div className="w-12 h-12 rounded-full bg-base-200 flex items-center justify-center overflow-hidden">
                  {gallery.creator_details.profile_picture ? (
                    <img
                      src={gallery.creator_details.profile_picture}
                      alt={gallery.creator_details.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-semibold text-base-content">
                      {gallery.creator_details.username.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-base-content">
                    {gallery.creator_details.first_name && gallery.creator_details.last_name
                      ? `${gallery.creator_details.first_name} ${gallery.creator_details.last_name}`
                      : gallery.creator_details.username}
                  </p>
                  <p className="text-xs text-base-content/60">
                    @{gallery.creator_details.username}
                  </p>
                  {gallery.created_at && (
                    <p className="text-xs text-base-content/60">
                      {formatDate(gallery.created_at)}
                    </p>
                  )}
                </div>
              </Link>
            </div>
          )}

          {/* Gallery Title */}
          <h2 className="text-2xl font-bold text-base-content mb-2">
            {gallery.title}
          </h2>

          {/* Gallery Description */}
          {gallery.description && (
            <p className="text-base-content/80 whitespace-pre-wrap break-words mb-3">
              {gallery.description}
            </p>
          )}

          {/* Gallery Picture Preview */}
          {gallery.picture && (
            <div className="mt-4 rounded-lg overflow-hidden border border-base-300">
              <img
                src={gallery.picture}
                alt={gallery.title}
                className="w-full h-auto object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Loading State for Gallery Details */}
      {isLoadingGallery && (
        <div className="mb-6 pb-6 border-b border-base-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-base-200 animate-pulse" />
            <div className="flex-1">
              <div className="h-4 bg-base-200 rounded w-24 mb-2 animate-pulse" />
              <div className="h-3 bg-base-200 rounded w-32 animate-pulse" />
            </div>
          </div>
          <div className="h-6 bg-base-200 rounded w-3/4 mb-2 animate-pulse" />
          <div className="h-4 bg-base-200 rounded w-full mb-1 animate-pulse" />
          <div className="h-4 bg-base-200 rounded w-5/6 animate-pulse" />
        </div>
      )}

      {/* Tabs */}
      <div className="tabs tabs-boxed mb-4 bg-base-200">
        <button
          className={`tab ${activeTab === 'comments' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('comments')}
        >
          <FontAwesomeIcon icon={faComment} className="mr-2" />
          Comments {!enableInitialFetch || (isLoading && !topLevelComments.length) ? `(0)` : `(${totalComments})`}
        </button>
        <button
          className={`tab ${activeTab === 'critiques' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('critiques')}
        >
          <FontAwesomeIcon icon={faStar} className="mr-2" />
          Critiques
        </button>
        <button
          className={`tab ${activeTab === 'awards' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('awards')}
        >
          <FontAwesomeIcon icon={faTrophy} className="mr-2" />
          Awards ({awards.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'comments' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <div className="flex flex-col">
              <h4 className="font-semibold text-lg">
                Comments {!enableInitialFetch || (isLoading && !topLevelComments.length) ? `(${0})` : `(${totalComments})`}
              </h4>
            </div>
            {user && (
              <button 
                className="btn btn-sm btn-primary" 
                onClick={handleAddComment}
                title="Add a comment"
              >
                <FontAwesomeIcon icon={faComment} className="mr-2" />
                Add Comment
              </button>
            )}
          </div>

          {isLoading && topLevelComments.length === 0 ? (
            <div className="space-y-4">
              <SkeletonComment />
              <SkeletonComment />
              <SkeletonComment />
            </div>
          ) : topLevelComments.length === 0 && !isCreating ? (
            <div 
              className={`text-center py-12 ${user ? 'cursor-pointer hover:bg-base-200/50 rounded-lg transition-colors' : ''}`}
              onClick={handleEmptyStateClick}
            >
              <div className="inline-block p-4 rounded-full bg-base-200 mb-4">
                <FontAwesomeIcon icon={faComment} className="text-4xl text-base-content/30" />
              </div>
              <p className="text-lg font-medium text-base-content/70">No comments yet</p>
              <p className="text-sm text-base-content/50 mt-1">
                {user ? 'Click here to be the first to share your thoughts!' : 'Be the first to share your thoughts!'}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {/* Skeleton Loader for new comment - show when creating OR fetching */}
                {(isCreating || (isFetching && topLevelComments.length > 0)) && <SkeletonComment />}

                {topLevelComments.map((comment) => (
                  <GalleryReplyComponent
                    key={comment.comment_id}
                    comment={comment}
                    galleryId={galleryId}
                    highlightedItemId={highlightedItemId}
                    onEditComment={onEditComment}
                  />
                ))}
              </div>

              {hasNextPage && (
                <div className="mt-6 text-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={isFetchingNextPage}
                    className="btn btn-outline btn-sm"
                  >
                    {isFetchingNextPage ? (
                      <>
                        <span className="loading loading-spinner loading-xs" />
                        Loading...
                      </>
                    ) : (
                      `Load More Comments (${Math.max(totalComments - comments.length, 0)} remaining)`
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Critiques Tab */}
      {activeTab === 'critiques' && (
        <CritiqueSection 
          galleryId={galleryId} 
          targetType="gallery"
          highlightedItemId={highlightedItemId} 
        />
      )}

      {/* Awards Tab */}
      {activeTab === 'awards' && (
        <GalleryAwardDisplay
          awards={awards}
          onOpenAwardModal={handleOpenAwardModal}
          onOpenAwardList={handleOpenAwardList}
        />
      )}

      {/* Trophy Selection Modal for Gallery Awards */}
      {showTrophyModal && selectedPostForTrophy === galleryId && (
        <TrophySelectionModal targetType="gallery" targetId={galleryId} />
      )}

      {/* Trophy List Modal for Gallery Awards */}
      {showTrophyListModal && (
        <TrophyListModal
          isOpen={showTrophyListModal}
          onClose={handleCloseAwardList}
          galleryId={galleryId}
          targetType="gallery"
        />
      )}

      {/* Gallery Comment Form Modal */}
      <GalleryCommentFormModal />

      {/* Critique Form Modal */}
      <CritiqueFormModal />
    </div>
  );
};

export default GallerySidebarSection;


