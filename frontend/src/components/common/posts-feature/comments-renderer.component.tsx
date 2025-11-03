// comments-renderer.tsx
import { usePostContext } from "@context/post-context";
import { useAuth } from "@context/auth-context";
import { getCommentsForPost } from "@utils";
import { ReplyComponent } from "@components/common";
import type { CommentPagination, Post } from "@types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faComment } from "@fortawesome/free-solid-svg-icons";
import { useState } from "react";

const CommentsRenderer = ({
  postItem,
  isFirstComments = true,
  showLoadMore = false,
}: {
  postItem: Post;
  isFirstComments?: boolean;
  showLoadMore?: boolean;
}) => {
  const { commentPagination, loadingComments, comments, setActivePost, handleCommentSubmit, commentForm, setCommentForm } =
    usePostContext();
  const { user } = useAuth();
  const postId = postItem.post_id;
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLoading = loadingComments[postId];
  let pagination = commentPagination[postId];

  const hasComments: boolean =
    Array.isArray(postItem.comments) && postItem.comments.length > 0;

  const handleSubmitComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (commentText.trim() && user && !isSubmitting) {
      const currentText = commentText.trim();
      setCommentText("");
      setIsSubmitting(true);

      try {
        // Create a synthetic form event
        const formEvent = e || new Event('submit') as any;
        
        // Update the comment form in context (same as the modal does)
        setCommentForm({
          text: currentText,
          post_id: postId,
        });

        // Use the existing handleCommentSubmit from context
        await handleCommentSubmit(formEvent);
        
        // Update the post item optimistically
        if (postItem.comments) {
          // Refresh will show the real comment, but let's update count
          postItem.comment_count = (postItem.comment_count || 0) + 1;
        }
        
      } catch (error) {
        console.error('Error posting comment:', error);
        setCommentText(currentText);
        alert('Failed to post comment. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Return early if isFirstComments is true and we need to show only the last comment blurred
  if (isFirstComments) {
    return (
      <div className="mt-2">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-semibold">
            Comments ({isLoading ? "..." : postItem.comment_count || 0})
          </h4>
        </div>

        {/* Comment Input Field */}
        <div className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Write a comment..."
              className="input input-bordered flex-1"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isSubmitting) {
                  handleSubmitComment();
                }
              }}
              disabled={isSubmitting}
            />
            <button
              className="btn btn-primary"
              onClick={handleSubmitComment}
              disabled={!commentText.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="space-y-2 relative">
          {!isLoading && postItem.comment_count > 0 && (
            <span
              className="text-sm hover:link cursor-pointer"
              onClick={() => setActivePost(postItem)}
            >
              View all {postItem.comment_count} comments
            </span>
          )}

          {/* Fading overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-base-200 via-transparent to-transparent pointer-events-none z-10 mb-2" />

          {/* Last two comments with decreasing opacity */}
          {hasComments ? (
            postItem?.comments?.map((comment, index) => {
              // Calculate opacity: first comment (more recent) is more visible, second is more faded
              const opacity = 1 - index * 0.4; // 100% for first, 60% for second
              const blur = index * 1; // 0px for first, 1px for second

              return (
                <>
                  {/* Fading overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-base-200 via-transparent to-transparent pointer-events-none z-10 mb-2" />
                  <div
                    key={comment.comment_id}
                    className="bg-base-200 p-3 rounded-lg transition-all duration-300"
                    style={{
                      opacity: opacity,
                      filter: `blur(${blur}px)`,
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium  text-sm flex flex-row gap-1">
                          {comment.author_picture ? (
                            <img
                              src={comment.author_picture}
                              alt="author_pic"
                              className="w-8 h-8 rounded-full border border-base-300"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center text-white justify-center text-xs font-bold">
                              {comment.author_username
                                ?.charAt(0)
                                .toUpperCase() || "U"}
                            </div>
                          )}
                          <span>{comment.author_username}</span>
                        </p>
                        <p className="text-sm">{comment.text}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(comment.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              );
            })
          ) : (
            <div className="text-center py-6">
              <div className="inline-block p-4 rounded-full bg-base-200 mb-4">
                <FontAwesomeIcon
                  icon={faComment}
                  className="text-2xl text-gray-400"
                />
              </div>
              <p className="text-lg font-medium text-gray-600">
                No comments yet
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Be the first to share your thoughts!
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Re initiate variables
  // Honestly I don't even want to bother refactoring this shit
  pagination = commentPagination[postId];
  const topLevelComments = getCommentsForPost(postId, comments)

  // Normal rendering for non-first comments or when there are no more pages
  return (
    <div className="mt-2">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-semibold">
          Comments (
          {isLoading
            ? "..."
            : pagination?.commentCount || 0}
          )
        </h4>
      </div>

      {/* Comment Input Field for full view */}
      <div className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Write a comment..."
            className="input input-bordered flex-1"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isSubmitting) {
                handleSubmitComment();
              }
            }}
            disabled={isSubmitting}
          />
          <button
            className="btn btn-primary"
            onClick={handleSubmitComment}
            disabled={!commentText.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {isLoading && topLevelComments.length === 0 ? (
        <div className="text-center py-4">
          <div className="loading loading-spinner loading-sm"></div>
          <span className="ml-2">Loading comments...</span>
        </div>
      ) : topLevelComments.length === 0 ? (
        <p className="text-gray-500 text-sm mb-2">No comments yet.</p>
      ) : (
        <>
          <div className="space-y-3">
            {/* Display existing comments */}
            {topLevelComments.map((comment) => (
              <ReplyComponent
                key={comment.comment_id}
                comment={comment}
                postId={postId}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default CommentsRenderer;
