import { useState, useEffect } from 'react';
import { useAuth } from '@context/auth-context';
import GalleryCommentSection from './gallery-comment-section.component';
import { useCreateGalleryComment, useUpdateGalleryComment, useUpdateGalleryCommentReply } from '@hooks/mutations/use-gallery-comment-mutations';
import { toast } from '@utils/toast.util';
import { handleApiError, formatErrorForToast } from '@utils';
import type { Comment } from '@types';

interface GalleryCommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  galleryId: string;
  highlightedItemId?: string | null;
}

export default function GalleryCommentsModal({
  isOpen,
  onClose,
  galleryId,
  highlightedItemId,
}: GalleryCommentsModalProps) {
  const { user } = useAuth();
  const [commentText, setCommentText] = useState('');
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createComment = useCreateGalleryComment();
  const updateComment = useUpdateGalleryComment();
  const updateReply = useUpdateGalleryCommentReply();

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCommentText('');
      setEditingComment(null);
    }
  }, [isOpen]);

  const handleEditComment = (comment: Comment) => {
    setEditingComment(comment);
    setCommentText(comment.text || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (editingComment) {
        // Update existing comment
        if (editingComment.replies_to) {
          // It's a reply
          await updateReply.mutateAsync({
            replyId: editingComment.comment_id,
            text: commentText.trim(),
            galleryId,
            parentCommentId: editingComment.replies_to,
          });
        } else {
          // It's a top-level comment
          await updateComment.mutateAsync({
            commentId: editingComment.comment_id,
            text: commentText.trim(),
            galleryId,
          });
        }
        setEditingComment(null);
      } else {
        // Create new comment
        await createComment.mutateAsync({
          text: commentText.trim(),
          gallery: galleryId,
        });
      }
      setCommentText('');
    } catch (error) {
      const message = handleApiError(error, {}, true, true);
      toast.error('Failed to save comment', formatErrorForToast(message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setCommentText('');
    setEditingComment(null);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-base-100 shadow-2xl z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-base-300 bg-base-200/50 sticky top-0 z-10">
          <h2 className="text-xl font-bold">Comments</h2>
          <button
            onClick={onClose}
            className="btn btn-circle btn-ghost btn-sm"
            aria-label="Close comments"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Comment Form */}
        {user && (
          <div className="px-6 py-4 border-b border-base-300 bg-base-100">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex gap-3 items-start">
                {/* User Avatar */}
                <div className="flex-shrink-0">
                  {user?.profile_picture ? (
                    <img
                      src={user.profile_picture}
                      alt={user.username}
                      className="w-10 h-10 rounded-full ring ring-primary ring-offset-base-100 ring-offset-1"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gradient-to-br from-primary via-secondary to-accent rounded-full flex items-center justify-center text-primary-content font-bold">
                      {user?.username?.[0]?.toUpperCase() || "U"}
                    </div>
                  )}
                </div>

                {/* Input and Actions */}
                <div className="flex-1 space-y-2">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={editingComment ? "Edit your comment..." : "Write a comment..."}
                    className="w-full px-4 py-2 text-sm bg-base-100 border border-base-300 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
                    rows={3}
                    required
                    autoFocus
                    disabled={isSubmitting}
                    maxLength={1000}
                  />

                  {/* Character Count and Actions */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-base-content/50">
                      {commentText.length}/1000
                    </span>

                    <div className="flex gap-2">
                      {editingComment && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs text-base-content/70 hover:text-error"
                          onClick={handleCancel}
                          disabled={isSubmitting}
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="submit"
                        className="btn btn-primary btn-xs gap-1"
                        disabled={!commentText.trim() || isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <span className="loading loading-spinner loading-xs"></span>
                            {editingComment ? "Updating..." : "Posting..."}
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {editingComment ? "Update" : "Post"}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Comments List - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <GalleryCommentSection
            galleryId={galleryId}
            highlightedItemId={highlightedItemId}
            enableInitialFetch={true}
            onEditComment={handleEditComment}
            onAddComment={() => {
              // Focus on textarea when "Add Comment" is clicked
              const textarea = document.querySelector('textarea');
              if (textarea) {
                textarea.focus();
              }
            }}
          />
        </div>
      </div>

      {/* Add slide-in animation styles */}
      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </>
  );
}

