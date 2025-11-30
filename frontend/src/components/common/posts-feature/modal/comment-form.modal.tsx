import { useEffect } from "react";
import { useAuth } from "@context/auth-context";
import { usePostUI } from "@context/post-ui-context";
import { useCommentForm } from "@hooks/forms/use-comment-form";
import { useCreateComment, useUpdateComment, useUpdateReply } from "@hooks/mutations/use-comment-mutations";
import { toast } from "@utils/toast.util";
import { handleApiError, formatErrorForToast } from "@utils";

export default function CommentFormModal() {
  const {
    showCommentForm,
    setShowCommentForm,
    commentTargetPostId,
    selectedComment,
    setSelectedComment,
    editingComment,
    setEditingComment,
    setCommentTargetPostId,
  } = usePostUI();
  const { user } = useAuth();

  const {
    form,
    handleChange,
    setPostId,
    resetForm,
    setForm,
  } = useCommentForm({
    text: selectedComment?.text ?? "",
    post_id: commentTargetPostId ?? "",
  });

  useEffect(() => {
    if (commentTargetPostId) {
      setPostId(commentTargetPostId);
    }
  }, [commentTargetPostId, setPostId]);

  useEffect(() => {
    setForm((prev) => ({ ...prev, text: selectedComment?.text ?? "" }));
  }, [selectedComment, setForm]);

  const createComment = useCreateComment();
  const updateComment = useUpdateComment();
  const updateReply = useUpdateReply();
  const isSubmitting = createComment.isPending || updateComment.isPending || updateReply.isPending;

  const closeModal = () => {
    if (isSubmitting) return;
    setShowCommentForm(false);
    setSelectedComment(null);
    setEditingComment(false);
    setCommentTargetPostId(null);
    resetForm();
  };

  if (!showCommentForm || !commentTargetPostId) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.text.trim()) return;

    try {
      if (editingComment && selectedComment) {
        if (selectedComment.replies_to) {
          // It's a reply
          await updateReply.mutateAsync({
            replyId: selectedComment.comment_id,
            text: form.text,
            postId: commentTargetPostId,
            parentCommentId: selectedComment.replies_to,
          });
        } else {
          // It's a top-level comment
          await updateComment.mutateAsync({
            commentId: selectedComment.comment_id,
            text: form.text,
            postId: commentTargetPostId,
          });
        }
      } else {
        await createComment.mutateAsync({
          text: form.text,
          post_id: commentTargetPostId,
        });
      }
      // Form closes automatically via mutation callbacks (closeCommentForm)
    } catch (error) {
      const message = handleApiError(error, {}, true, true);
      toast.error('Failed to save comment', formatErrorForToast(message));
    }
  };

  return (
    <>
      {/* Enhanced Backdrop with Animation */}
      <div className="modal modal-open animate-fade-in">
        <div
          className="fixed inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/70 backdrop-blur-lg transition-all duration-300"
          onClick={closeModal}
        ></div>

        {/* Enhanced Modal Content with Scale Animation */}
        <div className="modal-box max-w-2xl p-0 overflow-hidden relative bg-base-100 rounded-3xl shadow-2xl animate-scale-in border border-base-300/50">
          {/* Modern Top Bar with Gradient */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-base-300 bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 backdrop-blur-sm sticky top-0 z-10">
            <button
              type="button"
              onClick={closeModal}
              disabled={isSubmitting}
              className="btn btn-circle btn-ghost btn-sm hover:bg-error/10 hover:text-error transition-all duration-200 hover:rotate-90 disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
                <div className="absolute inset-0 w-3 h-3 bg-primary rounded-full animate-ping"></div>
              </div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                {editingComment ? "✏️ Edit Comment" : "💬 Add Comment"}
              </h2>
            </div>

            <button
              type="submit"
              form="comment-form"
              disabled={isSubmitting || !form.text.trim()}
              className="btn btn-primary btn-sm gap-2 hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  {editingComment ? "Updating..." : "Posting..."}
                </>
              ) : editingComment ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Update
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Post Comment
                </>
              )}
            </button>
          </div>

          {/* Comment Form Content */}
          <form id="comment-form" onSubmit={handleSubmit} className="p-6">
            <div className="flex items-start gap-4">
              {/* User Avatar */}
              <div className="avatar">
                <div className="w-12 h-12 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2 hover:ring-secondary transition-all duration-300 shadow-lg">
                  {user?.profile_picture ? (
                    <img src={user.profile_picture} alt={user.username} className="object-cover" />
                  ) : (
                    <div className="bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center text-primary-content font-bold text-lg">
                      {user?.username?.[0]?.toUpperCase() || "U"}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1">
                <div className="mb-3 flex items-center gap-2">
                  <span className="font-bold text-base">{user?.username || "User"}</span>
                  <span className="badge badge-sm badge-primary">@{user?.username || "user"}</span>
                </div>

                <textarea
                  className="w-full bg-transparent border border-base-300 rounded-lg p-3 focus:outline-none focus:border-primary resize-none text-base placeholder:text-base-content/50 leading-relaxed min-h-[120px] transition-all duration-200"
                  name="text"
                  value={form.text}
                  onChange={(e) => handleChange(e.target.value)}
                  placeholder="Share your thoughts..."
                  rows={5}
                  maxLength={1000}
                  disabled={isSubmitting}
                  required
                />

                {/* Character Count */}
                <div className="flex items-center justify-between mt-2">
                  <div className="text-xs text-base-content/50">
                    Press Enter to add line breaks
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`text-sm font-semibold transition-colors ${form.text.length > 900
                        ? "text-warning"
                        : form.text.length > 800
                          ? "text-info"
                          : "text-base-content/60"
                        }`}
                    >
                      {form.text.length}
                    </div>
                    <div className="text-xs text-base-content/40">/1,000</div>
                    {form.text.length > 800 && (
                      <div
                        className={`radial-progress text-xs ${form.text.length > 900 ? "text-warning" : "text-info"
                          }`}
                        style={{ "--value": (form.text.length / 1000) * 100, "--size": "1.5rem", "--thickness": "3px" } as React.CSSProperties}
                      ></div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </form>

          {/* Footer Tips */}
          <div className="px-6 py-4 bg-base-200/50 border-t border-base-300">
            <div className="flex items-start gap-2 text-xs text-base-content/60">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-semibold text-base-content/70">Comment Guidelines:</p>
                <p className="mt-1">
                  Be respectful and constructive. Share your thoughts and engage meaningfully with the community.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
