import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import GalleryReplyComponent from './gallery-reply.component';
import { SkeletonComment } from '@components/common/skeleton/skeleton-comment.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComment } from '@fortawesome/free-solid-svg-icons';
import { useGalleryComments } from '@hooks/queries/use-gallery-comments';
import { useAuth } from '@context/auth-context';
import type { Comment } from '@types';

interface GalleryCommentSectionProps {
  galleryId: string;
  highlightedItemId?: string | null;
  enableInitialFetch?: boolean;
  onEditComment?: (comment: Comment) => void;
  onAddComment?: () => void;
}

const GalleryCommentSection = ({ 
  galleryId, 
  highlightedItemId, 
  enableInitialFetch = true,
  onEditComment,
  onAddComment,
}: GalleryCommentSectionProps) => {
  const { user } = useAuth();
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useGalleryComments(galleryId, { enabled: enableInitialFetch && Boolean(galleryId) });

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
    if (onAddComment) {
      onAddComment();
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

  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex flex-col">
          <h4 className="font-semibold text-lg">
            Comments {!enableInitialFetch || (isLoading && !topLevelComments.length) ? `(${0})` : `(${totalComments})`}
          </h4>
        </div>
        {user && (
          <button className="btn btn-sm btn-primary" onClick={handleAddComment}>
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
        <div className="text-center py-12">
          <div className="inline-block p-4 rounded-full bg-base-200 mb-4">
            <FontAwesomeIcon icon={faComment} className="text-4xl text-base-content/30" />
          </div>
          <p className="text-lg font-medium text-base-content/70">No comments yet</p>
          <p className="text-sm text-base-content/50 mt-1">Be the first to share your thoughts!</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {/* Skeleton Loader for new comment */}
            {isCreating && <SkeletonComment />}

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
    </div>
  );
};

export default GalleryCommentSection;

