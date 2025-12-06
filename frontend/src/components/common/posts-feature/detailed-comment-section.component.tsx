import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ReplyComponent } from '@components/common';
import { SkeletonComment } from '@components/common/skeleton/skeleton-comment.component';
import type { Post } from '@types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComment } from '@fortawesome/free-solid-svg-icons';
import { usePostUI } from '@context/post-ui-context';
import { useComments } from '@hooks/queries/use-comments';

interface DetailedCommentSectionProps {
  postItem: Post;
  highlightedItemId?: string | null;
  enableInitialFetch?: boolean;
}

const DetailedCommentSection = ({ postItem, highlightedItemId, enableInitialFetch = true }: DetailedCommentSectionProps) => {
  const { setSelectedComment, setCommentTargetPostId, setShowCommentForm, setEditingComment } =
    usePostUI();

  const postId = postItem.post_id;
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useComments(postId, { enabled: enableInitialFetch && Boolean(postId) });

  // Track creation state for skeleton loader
  // Using a minimal queryFn that returns the cached value or default
  const { data: isCreating = false } = useQuery({
    queryKey: ['comment-creating', postId],
    queryFn: () => false, // Dummy function - actual value comes from setQueryData
    initialData: false,
    staleTime: Infinity, // Never refetch - this is just for state management
    gcTime: Infinity, // Keep in cache indefinitely
  });

  const comments = useMemo(
    () => data?.pages.flatMap((page) => page.results || []) ?? [],
    [data],
  );
  const topLevelComments = comments.filter((comment) => !comment.replies_to);
  const totalComments =
    data?.pages[0]?.total_comments ?? data?.pages[0]?.count ?? postItem.comment_count ?? 0;

  const handleAddComment = () => {
    setSelectedComment(null);
    setCommentTargetPostId(postId);
    setEditingComment(false);
    setShowCommentForm(true);
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
            Comments {!enableInitialFetch || (isLoading && !topLevelComments.length) ? `(${postItem.comment_count || 0})` : `(${totalComments})`}
          </h4>
          {!enableInitialFetch && (postItem.comment_count || 0) > 0 && (
            <button
              onClick={handleAddComment}
              className="text-sm text-primary hover:underline font-semibold text-left mt-1"
            >
              View all {postItem.comment_count || 0} {postItem.comment_count === 1 ? 'comment' : 'comments'}
            </button>
          )}
        </div>
        <button className="btn btn-sm btn-primary" onClick={handleAddComment}>
          Add Comment
        </button>
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
              <ReplyComponent
                key={comment.comment_id}
                comment={comment}
                postId={postId}
                highlightedItemId={highlightedItemId}
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

export default DetailedCommentSection;


