import { useEffect, useState, useRef } from "react";
import { useAuth } from "@context/auth-context";
import { usePostUI } from "@context/post-ui-context";
import { useCreateGalleryComment, useUpdateGalleryComment, useUpdateGalleryCommentReply } from "@hooks/mutations/use-gallery-comment-mutations";
import { toast } from "@utils/toast.util";
import { handleApiError, formatErrorForToast } from "@utils";
import { MarkdownToolbar } from "@components/common/posts-feature/markdown-toolbar.component";
import { MarkdownRenderer } from "@components/common/markdown-renderer.component";
import { useTextUndoRedo } from "@hooks/use-undo-redo.hook";
import { FileText, Eye, EyeOff } from "lucide-react";

export default function GalleryCommentFormModal() {
  const {
    showCommentForm,
    setShowCommentForm,
    commentTargetGalleryId,
    selectedComment,
    setSelectedComment,
    editingComment,
    setEditingComment,
    setCommentTargetGalleryId,
  } = usePostUI();
  const { user } = useAuth();
  const [commentText, setCommentText] = useState(selectedComment?.text ?? "");
  const [showMarkdownToolbar, setShowMarkdownToolbar] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Undo/Redo functionality
  const undoRedo = useTextUndoRedo(commentText);

  useEffect(() => {
    const newText = editingComment && selectedComment ? selectedComment.text ?? "" : "";
    setCommentText(newText);
    undoRedo.reset(newText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedComment, editingComment]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea && !showPreview) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Set height to scrollHeight, with min and max constraints
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 120), 400);
      textarea.style.height = `${newHeight}px`;
    }
  }, [commentText, showPreview]);

  const createComment = useCreateGalleryComment();
  const updateComment = useUpdateGalleryComment();
  const updateReply = useUpdateGalleryCommentReply();
  const isSubmitting = createComment.isPending || updateComment.isPending || updateReply.isPending;

  const closeModal = () => {
    if (isSubmitting) return;
    setShowCommentForm(false);
    setSelectedComment(null);
    setEditingComment(false);
    setCommentTargetGalleryId(null);
    setCommentText("");
    undoRedo.reset('');
  };

  if (!showCommentForm || !commentTargetGalleryId) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      if (editingComment && selectedComment) {
        if (selectedComment.replies_to) {
          // It's a reply
          await updateReply.mutateAsync({
            replyId: selectedComment.comment_id,
            text: commentText,
            galleryId: commentTargetGalleryId,
            parentCommentId: selectedComment.replies_to,
          });
        } else {
          // It's a top-level comment
          await updateComment.mutateAsync({
            commentId: selectedComment.comment_id,
            text: commentText,
            galleryId: commentTargetGalleryId,
          });
        }
      } else {
        await createComment.mutateAsync({
          text: commentText,
          gallery: commentTargetGalleryId,
        });
        // Modal closes automatically via mutation onSuccess callback
      }
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
              form="gallery-comment-form"
              disabled={isSubmitting || !commentText.trim()}
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
          <form id="gallery-comment-form" onSubmit={handleSubmit} className="p-6">
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
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base">{user?.username || "User"}</span>
                    <span className="badge badge-sm badge-primary">@{user?.username || "user"}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowMarkdownToolbar(!showMarkdownToolbar)}
                      className={`btn btn-sm btn-ghost gap-2 transition-all ${
                        showMarkdownToolbar 
                          ? 'bg-primary/20 text-primary' 
                          : 'hover:bg-primary/10 hover:text-primary'
                      }`}
                      title="Toggle markdown toolbar"
                    >
                      <FileText className="w-4 h-4" />
                      Markdown
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPreview(!showPreview)}
                      className={`btn btn-sm btn-ghost gap-2 transition-all ${
                        showPreview 
                          ? 'bg-primary/20 text-primary' 
                          : 'hover:bg-primary/10 hover:text-primary'
                      }`}
                      title="Preview markdown"
                    >
                      {showPreview ? (
                        <>
                          <EyeOff className="w-4 h-4" />
                          Hide Preview
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          Preview
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Markdown Toolbar */}
                <MarkdownToolbar 
                  textareaRef={textareaRef} 
                  isVisible={showMarkdownToolbar}
                  onFormat={(newValue) => {
                    undoRedo.setValue(newValue, true);
                    setCommentText(newValue);
                  }}
                />

                {showPreview ? (
                  <div className="w-full bg-base-200 border border-base-300 rounded-lg p-4 min-h-[120px] max-h-[400px] overflow-y-auto">
                    {commentText ? (
                      <MarkdownRenderer 
                        content={commentText} 
                        className="text-base text-base-content"
                      />
                    ) : (
                      <p className="text-base-content/50 italic">Preview will appear here...</p>
                    )}
                  </div>
                ) : (
                  <textarea
                    ref={textareaRef}
                    className="w-full bg-transparent border border-base-300 rounded-lg p-3 focus:outline-none focus:border-primary resize-none text-base placeholder:text-base-content/50 leading-relaxed min-h-[120px] transition-all duration-200"
                    name="text"
                    value={commentText}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setCommentText(newValue);
                      undoRedo.setValue(newValue, true);
                    }}
                    onKeyDown={(e) => {
                      // Handle Ctrl+Z (Undo) and Ctrl+Y or Ctrl+Shift+Z (Redo)
                      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                        e.preventDefault();
                        const undoneValue = undoRedo.undo();
                        setCommentText(undoneValue);
                      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                        e.preventDefault();
                        const redoneValue = undoRedo.redo();
                        setCommentText(redoneValue);
                      }
                    }}
                    placeholder="Share your thoughts..."
                    rows={5}
                    maxLength={1000}
                    disabled={isSubmitting}
                    required
                  />
                )}

                {/* Character Count */}
                <div className="flex items-center justify-between mt-2">
                  <div className="text-xs text-base-content/50">
                    Press Enter to add line breaks
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`text-sm font-semibold transition-colors ${commentText.length > 900
                        ? "text-warning"
                        : commentText.length > 800
                          ? "text-info"
                          : "text-base-content/60"
                        }`}
                    >
                      {commentText.length}
                    </div>
                    <div className="text-xs text-base-content/40">/1,000</div>
                    {commentText.length > 800 && (
                      <div
                        className={`radial-progress text-xs ${commentText.length > 900 ? "text-warning" : "text-info"
                          }`}
                        style={{ "--value": (commentText.length / 1000) * 100, "--size": "1.5rem", "--thickness": "3px" } as React.CSSProperties}
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

