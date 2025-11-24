import React from 'react';
import { usePostContext } from '@context/post-context';
import { useAuth } from '@context/auth-context';
import type { Critique } from '@types';
import { MessageSquare, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import { toast } from '@utils/toast.util';
import { handleApiError } from '@utils';

interface CritiqueSectionProps {
  postId: string;
  highlightedItemId?: string | null;
}

export const CritiqueSection: React.FC<CritiqueSectionProps> = ({ postId, highlightedItemId }) => {
  const {
    critiques,
    loadingCritiques,
    critiquePagination,
    fetchCritiquesForPost,
    setShowCritiqueForm,
    setCritiqueForm,
  } = usePostContext();

  const postCritiques = critiques[postId] || [];
  const pagination = critiquePagination[postId];

  // Calculate statistics
  const stats = React.useMemo(() => {
    const positive = postCritiques.filter(c => c.impression === 'positive').length;
    const negative = postCritiques.filter(c => c.impression === 'negative').length;
    const neutral = postCritiques.filter(c => c.impression === 'neutral').length;
    return { positive, negative, neutral };
  }, [postCritiques]);

  const handleAddCritique = () => {
    setCritiqueForm(prev => ({ ...prev, post_id: postId }));
    setShowCritiqueForm(true);
  };

  const loadMoreCritiques = () => {
    if (pagination && pagination.hasNext) {
      fetchCritiquesForPost(postId, pagination.currentPage + 1, true);
    }
  };

  if (loadingCritiques[postId] && postCritiques.length === 0) {
    return (
      <div className="flex justify-center py-8">
        <div className="loading loading-spinner loading-md text-primary"></div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-base-300">
        <h3 className="text-xl font-bold text-base-content flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          {postCritiques.length} {postCritiques.length === 1 ? 'Critique' : 'Critiques'}
        </h3>
        <button
          onClick={handleAddCritique}
          className="btn btn-primary btn-sm gap-2 hover:scale-105 transition-transform"
        >
          <MessageSquare className="w-4 h-4" />
          Add Critique
        </button>
      </div>

      {/* Feedback Statistics */}
      {postCritiques.length > 0 && (
        <div className="mb-6 p-4 bg-base-200/30 rounded-lg border border-base-300">
          <div className="flex items-center justify-around gap-4">
            {/* Positive */}
            <div className="flex items-center gap-2">
              <div className="p-2 bg-success/10 rounded-lg border border-success/20">
                <ThumbsUp className="w-4 h-4 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-success">{stats.positive}</p>
                <p className="text-xs text-base-content/60">Positive</p>
              </div>
            </div>

            {/* Neutral */}
            <div className="flex items-center gap-2">
              <div className="p-2 bg-warning/10 rounded-lg border border-warning/20">
                <Minus className="w-4 h-4 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-warning">{stats.neutral}</p>
                <p className="text-xs text-base-content/60">Neutral</p>
              </div>
            </div>

            {/* Negative */}
            <div className="flex items-center gap-2">
              <div className="p-2 bg-error/10 rounded-lg border border-error/20">
                <ThumbsDown className="w-4 h-4 text-error" />
              </div>
              <div>
                <p className="text-2xl font-bold text-error">{stats.negative}</p>
                <p className="text-xs text-base-content/60">Negative</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {postCritiques.map(critique => (
          <CritiqueCard
            key={critique.critique_id}
            critique={critique}
            postId={postId}
            highlightedItemId={highlightedItemId}
          />
        ))}
      </div>

      {pagination?.hasNext && (
        <button
          onClick={loadMoreCritiques}
          disabled={loadingCritiques[postId]}
          className="btn btn-outline btn-sm w-full mt-6 hover:btn-primary"
        >
          {loadingCritiques[postId] ? (
            <>
              <span className="loading loading-spinner loading-xs"></span>
              Loading...
            </>
          ) : (
            'Load More Critiques'
          )}
        </button>
      )}

      {postCritiques.length === 0 && !loadingCritiques[postId] && (
        <div className="text-center py-12 bg-base-200/30 rounded-xl border-2 border-dashed border-base-300">
          <MessageSquare className="w-12 h-12 mx-auto text-base-content/30 mb-3" />
          <p className="text-base-content/70 font-medium">No critiques yet</p>
          <p className="text-sm text-base-content/50 mt-1">Be the first to share your thoughts!</p>
        </div>
      )}
    </div>
  );
};

// Individual Critique Card Component (StackOverflow-style)
const CritiqueCard: React.FC<{ critique: Critique; postId: string; highlightedItemId?: string | null }> = ({ critique, postId, highlightedItemId }) => {
  const { user } = useAuth();
  const {
    deleteCritique,
    toggleCritiqueReplies,
    toggleCritiqueReplyForm,
    setupCritiqueReplyForm,
    critiqueReplyForms,
    handleCritiqueReplySubmit,
    handleCritiqueReplyFormChange,
    loadingCritiqueReplies,
    submittingCritiqueReply,
    setShowCritiqueForm,
    setCritiqueForm,
    setEditingCritique,
    setSelectedCritique,
    fetchRepliesForCritique
  } = usePostContext();

  const replyForm = critiqueReplyForms[critique.critique_id];
  const isAuthor = user?.id === critique.author;
  const isSubmitting = submittingCritiqueReply[critique.critique_id];
  const [showAddReply, setShowAddReply] = React.useState(false);
  const [editingReplyId, setEditingReplyId] = React.useState<string | null>(null);
  const [editingReplyText, setEditingReplyText] = React.useState('');
  const [updatingReply, setUpdatingReply] = React.useState(false);
  const [deletingReplyId, setDeletingReplyId] = React.useState<string | null>(null);
  
  // Check if this critique or critique reply should be highlighted
  const critiqueId = `critique-${critique.critique_id}`;
  const isCritiqueHighlighted = highlightedItemId === critiqueId;

  const handleEditCritique = () => {
    setSelectedCritique(critique);
    setCritiqueForm({
      text: critique.text,
      impression: critique.impression,
      post_id: critique.post_id
    });
    setEditingCritique(true);
    setShowCritiqueForm(true);
  };

  const handleEditReply = (reply: any) => {
    setEditingReplyId(reply.comment_id);
    setEditingReplyText(reply.text);
  };

  const handleCancelEditReply = () => {
    setEditingReplyId(null);
    setEditingReplyText('');
  };

  const handleUpdateReply = async (commentId: string) => {
    if (!editingReplyText.trim() || updatingReply) return;

    setUpdatingReply(true);
    try {
      const { postService } = await import('@services/post.service');
      await postService.updateCritiqueReply(commentId, { text: editingReplyText });
      
      toast.success('Reply updated', 'Your reply has been updated successfully');
      
      // Refresh replies
      await fetchRepliesForCritique(critique.critique_id);
      
      setEditingReplyId(null);
      setEditingReplyText('');
    } catch (error) {
      console.error('Error updating reply:', error);
      handleApiError(error, 'Failed to update reply');
    } finally {
      setUpdatingReply(false);
    }
  };

  const handleDeleteReply = async (commentId: string) => {
    if (deletingReplyId) return;

    if (!window.confirm('Are you sure you want to delete this reply?')) {
      return;
    }

    setDeletingReplyId(commentId);
    try {
      const { postService } = await import('@services/post.service');
      await postService.deleteCritiqueReply(commentId);
      
      toast.success('Reply deleted', 'Your reply has been deleted successfully');
      
      // Refresh replies
      await fetchRepliesForCritique(critique.critique_id);
    } catch (error) {
      console.error('Error deleting reply:', error);
      handleApiError(error, 'Failed to delete reply');
    } finally {
      setDeletingReplyId(null);
    }
  };

  const getImpressionIcon = (impression: string) => {
    switch (impression) {
      case 'positive':
        return <ThumbsUp className="w-4 h-4" />;
      case 'negative':
        return <ThumbsDown className="w-4 h-4" />;
      default:
        return <Minus className="w-4 h-4" />;
    }
  };

  const getImpressionStyle = (impression: string) => {
    switch (impression) {
      case 'positive':
        return 'bg-success/10 text-success border-success/20';
      case 'negative':
        return 'bg-error/10 text-error border-error/20';
      default:
        return 'bg-warning/10 text-warning border-warning/20';
    }
  };

  return (
    <div 
      id={critiqueId}
      className={`border border-base-300 rounded-lg bg-base-100 ${isCritiqueHighlighted ? "ring-4 ring-primary/30 bg-primary/5 transition-all duration-300" : ""}`}
    >
      <div className="p-6">
        {/* Critique Content */}
        <div className="flex gap-4">
          {/* Impression Badge (left side) */}
          <div className="flex flex-col items-center gap-2 pt-1">
            <div className={`px-3 py-2 rounded-lg border flex items-center gap-1.5 ${getImpressionStyle(critique.impression)}`}>
              {getImpressionIcon(critique.impression)}
              <span className="text-xs font-semibold uppercase tracking-wide">{critique.impression}</span>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Critique Text */}
            <div className="text-base text-base-content leading-relaxed mb-6">
              <p className="whitespace-pre-wrap">{critique.text}</p>
            </div>

            {/* Author Info & Actions Row */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              {/* Action Buttons (left) */}
              <div className="flex items-center gap-1">
                {isAuthor && (
                  <>
                    <button
                      onClick={handleEditCritique}
                      className="text-xs px-2 py-1 text-base-content/60 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteCritique(critique.critique_id, postId)}
                      className="text-xs px-2 py-1 text-base-content/60 hover:text-error hover:bg-error/10 rounded transition-colors"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>

              {/* Author Card (right) */}
              <div className="bg-primary/5 border border-primary/10 rounded px-2 py-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-base-content/60">answered</span>
                  <span className="text-base-content/70">
                    {new Date(critique.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <img
                    src={critique.author_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(critique.author_username)}&background=random&size=32`}
                    alt={critique.author_username}
                    className="w-8 h-8 rounded"
                    onError={(e) => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(critique.author_username)}&background=random&size=32`;
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-primary truncate">
                      {critique.author_fullname || critique.author_username}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Comments Section (SO-style) */}
      <div className="border-t border-base-300 bg-base-50 px-6 py-4">
        {/* Comments List */}
        {critique.show_replies && loadingCritiqueReplies[critique.critique_id] ? (
          <div className="flex justify-center py-2">
            <div className="loading loading-spinner loading-sm text-primary"></div>
          </div>
        ) : critique.show_replies && critique.replies && critique.replies.length > 0 ? (
          <div className="space-y-2 mb-3">
            {critique.replies.map((reply, index) => {
              const critiqueReplyId = `critique-reply-${reply.comment_id}`;
              const isReplyHighlighted = highlightedItemId === critiqueReplyId;
              
              return (
              <div 
                key={reply.comment_id} 
                id={critiqueReplyId}
                className={`py-2 text-sm ${index > 0 ? 'border-t border-base-200' : ''} ${isReplyHighlighted ? "bg-primary/10 border-l-4 border-l-primary pl-3 rounded-lg transition-all duration-300" : ""}`}
              >
                {editingReplyId === reply.comment_id ? (
                  // Edit mode
                  <div className="space-y-2">
                    <textarea
                      value={editingReplyText}
                      onChange={(e) => setEditingReplyText(e.target.value)}
                      className="textarea textarea-bordered textarea-sm w-full text-sm focus:textarea-primary resize-none"
                      rows={2}
                      disabled={updatingReply}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateReply(reply.comment_id)}
                        className="btn btn-primary btn-xs"
                        disabled={updatingReply || !editingReplyText.trim()}
                      >
                        {updatingReply ? (
                          <>
                            <span className="loading loading-spinner loading-xs"></span>
                            Saving...
                          </>
                        ) : (
                          'Save'
                        )}
                      </button>
                      <button
                        onClick={handleCancelEditReply}
                        className="btn btn-ghost btn-xs"
                        disabled={updatingReply}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 text-base-content/90">
                      {reply.text} –{' '}
                      <a href="#" className="text-primary hover:text-primary/80 font-medium">
                        {reply.author_username}
                      </a>{' '}
                      <span className="text-base-content/50 text-xs">
                        {new Date(reply.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    {user?.id === reply.author && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditReply(reply)}
                          className="text-xs px-1 py-0.5 text-base-content/60 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                          disabled={deletingReplyId === reply.comment_id}
                        >
                          edit
                        </button>
                        <button
                          onClick={() => handleDeleteReply(reply.comment_id)}
                          className="text-xs px-1 py-0.5 text-base-content/60 hover:text-error hover:bg-error/10 rounded transition-colors disabled:opacity-50"
                          disabled={deletingReplyId === reply.comment_id}
                        >
                          {deletingReplyId === reply.comment_id ? (
                            <>
                              <span className="loading loading-spinner loading-xs"></span>
                            </>
                          ) : (
                            'delete'
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
            })}
          </div>
        ) : null}

        {/* Show/Hide Comments & Add Comment Actions */}
        <div className="flex items-center gap-3 text-xs text-base-content/60">
          {critique.reply_count > 0 && (
            <button
              onClick={() => toggleCritiqueReplies(critique.critique_id)}
              className="hover:text-primary transition-colors"
            >
              {critique.show_replies ? 'hide' : 'show'} {critique.reply_count} comment{critique.reply_count !== 1 ? 's' : ''}
            </button>
          )}
          <button
            onClick={() => {
              setShowAddReply(!showAddReply);
              if (!showAddReply && !critique.is_replying) {
                setupCritiqueReplyForm(critique.critique_id);
                toggleCritiqueReplyForm(critique.critique_id);
              } else if (showAddReply) {
                toggleCritiqueReplyForm(critique.critique_id);
              }
            }}
            className="hover:text-primary transition-colors"
          >
            add a comment
          </button>
        </div>

        {/* Add Comment Form (SO-style inline) */}
        {showAddReply && critique.is_replying && (
          <form
            onSubmit={async (e) => {
              await handleCritiqueReplySubmit(e, critique.critique_id);
              if (!isSubmitting) {
                setShowAddReply(false);
              }
            }}
            className="mt-3"
          >
            <textarea
              value={replyForm?.text || ''}
              onChange={(e) => handleCritiqueReplyFormChange(critique.critique_id, e.target.value)}
              placeholder="Add a comment..."
              className="textarea textarea-bordered textarea-sm w-full text-sm focus:textarea-primary resize-none"
              rows={2}
              disabled={isSubmitting}
            />
            <div className="flex gap-2 mt-2">
              <button 
                type="submit" 
                className="btn btn-primary btn-xs"
                disabled={isSubmitting || !replyForm?.text?.trim()}
              >
                {isSubmitting ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    Adding...
                  </>
                ) : (
                  'Add Comment'
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddReply(false);
                  toggleCritiqueReplyForm(critique.critique_id);
                }}
                className="btn btn-ghost btn-xs"
                disabled={isSubmitting}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
