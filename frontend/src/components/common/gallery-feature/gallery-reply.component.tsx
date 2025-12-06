import React, { useEffect, useMemo, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import type { Comment } from "@types";
import formatArtistTypesArrToString from "@utils/format-artisttypes-arr-to-string";
import { useAuth } from "@context/auth-context";
import { usePostUI } from "@context/post-ui-context";
import { useGalleryCommentReplies } from "@hooks/queries/use-gallery-comments";
import {
  useCreateGalleryCommentReply,
  useDeleteGalleryComment,
} from "@hooks/mutations/use-gallery-comment-mutations";
import { toast } from "@utils/toast.util";
import { handleApiError, formatErrorForToast } from "@utils";
import { SkeletonComment } from "@components/common/skeleton/skeleton-comment.component";
import UserHoverModal from "@components/post/user-hover-modal.component";

interface GalleryReplyComponentProps {
  comment: Comment;
  galleryId: string;
  depth?: number;
  highlightedItemId?: string | null;
  onEditComment?: (comment: Comment) => void;
}

const GalleryReplyComponent: React.FC<GalleryReplyComponentProps> = ({
  comment,
  galleryId,
  depth = 0,
  highlightedItemId,
  onEditComment,
}) => {
  const { user } = useAuth();
  const {
    setSelectedComment,
    setCommentTargetGalleryId,
    setEditingComment,
    setShowCommentForm,
  } = usePostUI();
  const [localReplyText, setLocalReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(comment.is_replying ?? false);
  const [showReplies, setShowReplies] = useState(depth > 0 ? true : Boolean(comment.show_replies));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHoverModal, setShowHoverModal] = useState(false);
  const userInfoRef = useRef<HTMLDivElement>(null);

  const replyCount = comment.reply_count || 0;
  const hasReplies = replyCount > 0 || (comment.replies?.length ?? 0) > 0;
  const isTopLevel = depth === 0;

  const shouldFetchReplies = showReplies && hasReplies;
  const {
    data: repliesData,
    isFetching: isFetchingReplies,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGalleryCommentReplies(comment.comment_id, shouldFetchReplies);

  // Flatten paginated replies
  const fetchedReplies = repliesData?.pages.flatMap((page) => page.results) ?? [];
  const replies = useMemo(
    () => fetchedReplies.length > 0 ? fetchedReplies : (comment.replies ?? []),
    [fetchedReplies, comment.replies],
  );

  const { mutateAsync: createReplyMutation } = useCreateGalleryCommentReply();
  const { mutateAsync: deleteCommentMutation, isPending: isDeletingComment } = useDeleteGalleryComment();

  // Track comment update state for skeleton loader on text
  const { data: isUpdatingComment = false } = useQuery({
    queryKey: ['gallery-comment-updating', comment.comment_id],
    queryFn: () => false,
    initialData: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  // Track reply creation state for skeleton loader
  const { data: isCreatingReply = false } = useQuery({
    queryKey: ['gallery-reply-creating', comment.comment_id],
    queryFn: () => false,
    initialData: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  // Track reply update state for skeleton loader on text
  const { data: isUpdatingReply = false } = useQuery({
    queryKey: ['gallery-reply-updating', comment.comment_id],
    queryFn: () => false,
    initialData: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const isAuthor = user?.id === comment.author;
  const canEditOrDelete = isAuthor;

  const commentId = `comment-${comment.comment_id}`;
  const replyId = `reply-${comment.comment_id}`;
  const isHighlighted = highlightedItemId === commentId || highlightedItemId === replyId;

  const handleMouseEnter = () => {
    setShowHoverModal(true);
  };

  const handleMouseLeave = () => {
    setShowHoverModal(false);
  };

  useEffect(() => {
    if (highlightedItemId && highlightedItemId.startsWith("reply-") && depth === 0) {
      setShowReplies(true);
    }
  }, [highlightedItemId, depth]);

  const handleLocalReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localReplyText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createReplyMutation({
        text: localReplyText.trim(),
        replies_to: comment.comment_id,
        gallery: galleryId,
      });
      setLocalReplyText("");
      setIsReplying(false);
      setShowReplies(true);
    } catch (error) {
      const message = handleApiError(error, {}, true, true);
      toast.error("Failed to post reply", formatErrorForToast(message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleReplies = () => {
    setShowReplies((prev) => !prev);
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;
    try {
      await deleteCommentMutation({ commentId: comment.comment_id, galleryId });
    } catch (error) {
      const message = handleApiError(error, {}, true, true);
      toast.error("Failed to delete comment", formatErrorForToast(message));
    }
  };

  const handleEdit = () => {
    setSelectedComment(comment);
    setCommentTargetGalleryId(galleryId);
    setEditingComment(true);
    setShowCommentForm(true);
  };

  return (
    <div
      id={depth === 0 ? commentId : replyId}
      className={`${depth > 0 ? "ml-12 mt-3" : "py-3 border-b border-base-300"
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
              <div
                ref={userInfoRef}
                className="relative -m-2 p-2"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <Link
                  to={comment.author_username ? `/profile/@${comment.author_username}` : '#'}
                  className="flex items-center gap-2 mb-1 hover:opacity-80 transition-opacity"
                  onClick={(e) => {
                    if (!comment.author_username) {
                      e.preventDefault();
                    }
                  }}
                >
                  <span className="font-semibold text-sm">
                    {comment.author_username}
                  </span>
                  <p className="text-xs">
                    {formatArtistTypesArrToString(comment.author_artist_types)}
                  </p>
                </Link>
                {comment.author && (
                  <div
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                  >
                    <UserHoverModal
                      userId={comment.author}
                      isVisible={showHoverModal}
                    />
                  </div>
                )}
              </div>
              {(isUpdatingComment || isUpdatingReply) ? (
                <div className="text-sm">
                  <div className="skeleton h-4 w-full mb-1"></div>
                  <div className="skeleton h-4 w-3/4"></div>
                </div>
              ) : (
                <span className="text-sm whitespace-pre-wrap break-words">
                  {comment.text}
                </span>
              )}

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
                    onClick={() => {
                      setIsReplying(true);
                      setLocalReplyText("");
                      setShowReplies(true);
                    }}
                  >
                    Reply
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
                    onClick={handleEdit}
                  >
                    Edit
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 transition-colors"
                    onClick={handleDelete}
                    disabled={isDeletingComment}
                  >
                    {isDeletingComment ? (
                      <span className="flex items-center gap-2">
                        <span className="loading loading-spinner loading-xs"></span>
                        Deleting...
                      </span>
                    ) : (
                      "Delete"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Reply Form */}
          {isReplying && (
            <form
              className="mt-4 bg-base-200/50 rounded-lg p-3 border border-base-300"
              onSubmit={handleLocalReplySubmit}
            >
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
                    onChange={(e) => setLocalReplyText(e.target.value)}
                    placeholder="Write a reply..."
                    className="w-full px-4 py-2 text-sm bg-base-100 border border-base-300 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    required
                    autoFocus
                    disabled={isSubmitting || isCreatingReply}
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
                          setIsReplying(false);
                          setLocalReplyText("");
                        }}
                        disabled={isSubmitting || isCreatingReply}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary btn-xs gap-1"
                        disabled={!localReplyText.trim() || isSubmitting || isCreatingReply}
                      >
                        {isSubmitting || isCreatingReply ? (
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
            </form>
          )}
        </div>
      </div>

      {/* Nested Replies */}
      {(showReplies && (replies.length > 0 || isCreatingReply || isFetchingReplies)) && (
        <div className="mt-3 space-y-3">
          {/* Skeleton Loader for initial reply fetch */}
          {isFetchingReplies && fetchedReplies.length === 0 && <SkeletonComment isReply />}
          
          {/* Skeleton Loader for new reply */}
          {isCreatingReply && <SkeletonComment isReply />}

          {replies.map((reply) => (
            <GalleryReplyComponent
              key={reply.comment_id}
              comment={reply}
              galleryId={galleryId}
              depth={depth + 1}
              highlightedItemId={highlightedItemId}
              onEditComment={onEditComment}
            />
          ))}

          {/* Load More Replies Button */}
          {hasNextPage && (
            <button
              className="text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1 ml-12"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? (
                <>
                  <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin"></div>
                  Loading more...
                </>
              ) : (
                "Load more replies"
              )}
            </button>
          )}
        </div>
      )}

      {/* View Replies Line - Instagram style */}
      {isTopLevel && hasReplies && !showReplies && (
        <div className="mt-2 flex items-center gap-2">
          <div className="w-8 flex justify-center">
            <div className="w-0.5 h-6 bg-gray-300"></div>
          </div>
          <button
            className="text-xs font-semibold cursor-pointer text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
            onClick={handleToggleReplies}
            disabled={isFetchingReplies}
          >
            {isFetchingReplies ? (
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

export default GalleryReplyComponent;

