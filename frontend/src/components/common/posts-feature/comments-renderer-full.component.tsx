// comments-renderer-full.tsx - For post detail page
// This component fetches and displays ALL comments for a post
// It also handles fetching specific highlighted comments from notifications using with-context
import { useEffect, useState } from "react";
import { usePostContext } from "@context/post-context";
import usePost from "@hooks/use-post";
import { getCommentsForPost } from "@utils";
import { ReplyComponent } from "@components/common";
import type { Post, Comment } from "@types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faComment } from "@fortawesome/free-solid-svg-icons";
import { postService } from "@services/post.service";

interface CommentsRendererFullProps {
  postItem: Post;
  highlightedItemId?: string | null;
}

const CommentsRendererFull = ({
  postItem,
  highlightedItemId,
}: CommentsRendererFullProps) => {
  const { commentPagination, loadingComments, comments, fetchCommentsForPost, setComments } =
    usePostContext();
  const { setupNewComment } = usePost();
  const postId = postItem.post_id;
  const [fetchingHighlighted, setFetchingHighlighted] = useState(false);

  const isLoading = loadingComments[postId];
  const pagination = commentPagination[postId];
  const allComments = getCommentsForPost(postId, comments);
  
  // Remove duplicates based on comment_id
  const uniqueComments = allComments.reduce((acc: Comment[], current) => {
    const exists = acc.find(c => c.comment_id === current.comment_id);
    if (!exists) {
      acc.push(current);
    }
    return acc;
  }, []);
  
  let topLevelComments = uniqueComments;

  // Fetch highlighted comment with context FIRST if provided
  useEffect(() => {
    const fetchHighlightedComment = async () => {
      if (!highlightedItemId) {
        // No highlighted item, just fetch normal comments
        if (!topLevelComments || topLevelComments.length === 0) {
          fetchCommentsForPost(postId, 1, false);
        }
        return;
      }

      if (fetchingHighlighted) return;

      // Parse the highlighted item ID (e.g., "comment-123" or "reply-456")
      const parts = highlightedItemId.split('-');
      const type = parts[0]; // "comment" or "reply"
      const commentId = parts.slice(1).join('-'); // The UUID

      // Only fetch if it's a comment or reply type
      if (type === 'comment' || type === 'reply') {
        setFetchingHighlighted(true);
        try {
          const data = await postService.getCommentWithContext(commentId);
          
          if (data.is_reply) {
            // It's a reply - add the parent comment with all replies to the top
            const parentWithReplies = {
              ...data.parent_comment,
              replies: data.all_replies?.map((reply: Comment) => ({
                ...reply,
                is_replying: false // Initialize UI state
              })),
              show_replies: true, // Auto-expand to show the highlighted reply
              is_replying: false // Initialize UI state
            };
            
            // Add to comments state at the top
            setComments((prev) => ({
              ...prev,
              [postId]: [parentWithReplies]
            }));
          } else {
            // It's a top-level comment - add it with its replies
            const commentWithReplies = {
              ...data.comment,
              replies: data.replies?.map((reply: Comment) => ({
                ...reply,
                is_replying: false // Initialize UI state
              })),
              show_replies: data.replies?.length > 0, // Auto-expand if has replies
              is_replying: false // Initialize UI state
            };
            
            // Add to comments state at the top
            setComments((prev) => ({
              ...prev,
              [postId]: [commentWithReplies]
            }));
          }

          // After fetching highlighted comment, fetch regular comments
          // Don't append to avoid duplicates - the deduplication logic will handle it
          await fetchCommentsForPost(postId, 1, false);
        } catch (error) {
          console.error('Failed to fetch highlighted comment:', error);
          // Still fetch regular comments even if highlighted fetch fails
          fetchCommentsForPost(postId, 1, false);
        } finally {
          setFetchingHighlighted(false);
        }
      } else {
        // Not a comment/reply type, just fetch normal comments
        fetchCommentsForPost(postId, 1, false);
      }
    };

    fetchHighlightedComment();
  }, [highlightedItemId, postId]); // Only depend on highlightedItemId and postId

  const handleLoadMore = () => {
    if (pagination && pagination.hasNext) {
      fetchCommentsForPost(postId, pagination.currentPage + 1, true);
    }
  };

  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-semibold text-lg">
          Comments (
          {isLoading && !topLevelComments.length
            ? "..."
            : pagination?.commentCount || 0}
          )
        </h4>
        <button
          className="btn btn-sm btn-primary"
          onClick={() => setupNewComment(postId)}
        >
          Add Comment
        </button>
      </div>

      {isLoading && topLevelComments.length === 0 ? (
        <div className="text-center py-8">
          <div className="loading loading-spinner loading-md"></div>
          <span className="ml-2 text-base-content/60">Loading comments...</span>
        </div>
      ) : topLevelComments.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-block p-4 rounded-full bg-base-200 mb-4">
            <FontAwesomeIcon
              icon={faComment}
              className="text-4xl text-base-content/30"
            />
          </div>
          <p className="text-lg font-medium text-base-content/70">
            No comments yet
          </p>
          <p className="text-sm text-base-content/50 mt-1">
            Be the first to share your thoughts!
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {topLevelComments.map((comment) => (
              <ReplyComponent
                key={comment.comment_id}
                comment={comment}
                postId={postId}
                highlightedItemId={highlightedItemId}
              />
            ))}
          </div>

          {/* Load More Button */}
          {pagination && pagination.hasNext && (
            <div className="mt-6 text-center">
              <button
                onClick={handleLoadMore}
                disabled={isLoading}
                className="btn btn-outline btn-sm"
              >
                {isLoading ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    Loading...
                  </>
                ) : (
                  `Load More Comments (${pagination.commentCount - topLevelComments.length} remaining)`
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CommentsRendererFull;

