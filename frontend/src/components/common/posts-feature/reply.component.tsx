import React, { useState, useEffect } from "react";
import { usePostContext } from "@context/post-context";
import usePost from "@hooks/use-post";
import type { Comment } from "@types";
import formatArtistTypesArrToString from "@utils/format-artisttypes-arr-to-string";
import { useAuth } from "@context/auth-context";

interface ReplyComponentProps {
  comment: Comment;
  postId: string;
  depth?: number;
  highlightedItemId?: string | null;
}

const ReplyComponent: React.FC<ReplyComponentProps> = ({
  comment,
  postId,
  depth = 0,
  highlightedItemId,
}) => {
  const {
    handleReplySubmit,
    replyForms,
    loadingReplies,
    deleteComment,
    toggleReplyForm,
  } = usePostContext();

  const {
    setupNewReply,
    handleReplyChange,
    handleToggleReplies,
    setupEditComment,
  } = usePost();

  const { user } = useAuth();
  const [localReplyText, setLocalReplyText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const replyForm = replyForms[comment.comment_id];
  const isLoadingReplies = loadingReplies[comment.comment_id];
  const replyCount = comment.reply_count || 0;
  const hasReplies = replyCount > 0 || (comment.replies && comment.replies.length > 0);
  const isTopLevel = depth === 0;
  
  // Check if current user is the author of this comment
  const isAuthor = user?.id === comment.author;
  const canEditOrDelete = isAuthor;
  
  // Sync local text with reply form
  useEffect(() => {
    if (replyForm?.text !== undefined) {
      setLocalReplyText(replyForm.text);
    }
  }, [replyForm?.text]);
  
  // Check if this comment or reply should be highlighted
  const commentId = `comment-${comment.comment_id}`;
  const replyId = `reply-${comment.comment_id}`;
  const isHighlighted = highlightedItemId === commentId || highlightedItemId === replyId;

  const handleLocalReplyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalReplyText(e.target.value);
  };

  const handleLocalReplyBlur = () => {
    handleReplyChange(comment.comment_id, localReplyText);
  };

  const handleLocalReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localReplyText.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      // Sync before submitting
      handleReplyChange(comment.comment_id, localReplyText);
      await handleReplySubmit(e, comment.comment_id);
      setLocalReplyText("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id={depth === 0 ? commentId : replyId}
      className={`${
        depth > 0 ? "ml-12 mt-3" : "py-3 border-b border-base-300"
      } ${isHighlighted ? "bg-primary/10 border-l-4 border-l-primary pl-3 rounded-lg transition-all duration-300" : ""}`}
    >
      {/* Comment Content */}
      <div className="flex gap-3">
        {/* User Avatar */}
        <div className="flex-shrink-0">
          {comment.author_picture ? (
            <img
              src={comment.author_picture}
              alt="author_pic"
              className="w-8 h-8 rounded-full border border-base-300"
            />
          ) : (
            <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {comment.author_username?.charAt(0).toUpperCase() || "U"}
            </div>
          )}
        </div>

        {/* Comment Body */}
        <div className="flex-1 min-w-0 text-base-content">
          {/* Username and Text */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">
                  {comment.author_username}
                </span>
                <p className="text-xs">
                  {formatArtistTypesArrToString(comment.author_artist_types)}
                </p>
              </div>
              <span className="text-sm whitespace-pre-wrap break-words">
                {comment.text}
              </span>

              {/* Time and Actions */}
              <div className="flex items-center gap-4 mt-1">
                <span className="text-xs text-gray-400">
                  {new Date(comment.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>

                {/* Reply Button - only for top-level comments */}
                {isTopLevel && (
                  <button
                    className="text-xs font-semibold cursor-pointer text-gray-500 hover:text-gray-700 transition-colors"
                    onClick={() => setupNewReply(comment.comment_id, postId)}
                  >
                    Reply
                  </button>
                )}

                {/* Show Replies Toggle - only for top-level comments with replies */}
                {isTopLevel && hasReplies && (
                  <button
                    className="text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
                    onClick={() => handleToggleReplies(comment.comment_id)}
                    disabled={isLoadingReplies}
                  >
                    <span className="cursor-pointer flex flex-row gap-1 items-center">
                      {isLoadingReplies && comment.show_replies && (
                        <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin"></div>
                      )}{" "}
                      {comment.show_replies ? "Hide" : "View"} {replyCount}{" "}
                      {replyCount === 1 ? "reply" : "replies"}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Action Menu (3 dots) - Only show if user is the author */}
            {canEditOrDelete && (
              <div className="relative group">
                <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="12" r="1.5" />
                    <circle cx="6" cy="12" r="1.5" />
                    <circle cx="18" cy="12" r="1.5" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                <div className="absolute right-0 top-6 hidden group-hover:block bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[120px]">
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setupEditComment(comment)}
                  >
                    Edit
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 transition-colors"
                    onClick={() => deleteComment(comment.comment_id, postId)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Reply Form */}
          {comment.is_replying && (
            <div className="mt-4 bg-base-200/50 rounded-lg p-3 border border-base-300">
              <div className="flex gap-3 items-start">
                {/* User Avatar */}
                <div className="flex-shrink-0">
                  {user?.profile_picture ? (
                    <img
                      src={user.profile_picture}
                      alt={user.username}
                      className="w-8 h-8 rounded-full ring ring-primary ring-offset-base-100 ring-offset-1"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-br from-primary via-secondary to-accent rounded-full flex items-center justify-center text-primary-content text-xs font-bold">
                      {user?.username?.[0]?.toUpperCase() || "U"}
                    </div>
                  )}
                </div>

                {/* Input and Actions */}
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={localReplyText}
                    onChange={handleLocalReplyChange}
                    onBlur={handleLocalReplyBlur}
                    placeholder="Write a reply..."
                    className="w-full px-4 py-2 text-sm bg-base-100 border border-base-300 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    required
                    autoFocus
                    disabled={isSubmitting}
                    maxLength={500}
                  />
                  
                  {/* Character Count */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-base-content/50">
                      {localReplyText.length}/500
                    </span>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs text-base-content/70 hover:text-error"
                        onClick={() => {
                          toggleReplyForm(comment.comment_id);
                          setLocalReplyText("");
                        }}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary btn-xs gap-1"
                        onClick={handleLocalReplySubmit}
                        disabled={!localReplyText.trim() || isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <span className="loading loading-spinner loading-xs"></span>
                            Posting...
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Post Reply
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nested Replies */}
      {comment.show_replies && comment.replies && (
        <div className="mt-3 space-y-3">
          {comment.replies.map((reply) => (
            <ReplyComponent
              key={reply.comment_id}
              comment={reply}
              postId={postId}
              depth={depth + 1}
              highlightedItemId={highlightedItemId}
            />
          ))}
        </div>
      )}

      {/* View Replies Line - Instagram style */}
      {isTopLevel && hasReplies && !comment.show_replies && (
        <div className="mt-2 flex items-center gap-2">
          <div className="w-8 flex justify-center">
            <div className="w-0.5 h-6 bg-gray-300"></div>
          </div>
          <button
            className="text-xs font-semibold cursor-pointer text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
            onClick={() => handleToggleReplies(comment.comment_id)}
            disabled={isLoadingReplies}
          >
            {isLoadingReplies ? (
              <>
                <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin"></div>
                Loading replies...
              </>
            ) : (
              `View replies (${replyCount})`
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default ReplyComponent;
