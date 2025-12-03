import React, { useMemo } from 'react';
import { useAuth } from '@context/auth-context';
import type { Critique } from '@types';
import { MessageSquare, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import { toast } from '@utils/toast.util';
import { handleApiError, formatErrorForToast } from '@utils';
import { usePostUI } from '@context/post-ui-context';
import {
  useCritiques,
  useCritiqueReplies,
  useCreateCritiqueReply,
  useDeleteCritique,
  useDeleteCritiqueReply,
  useUpdateCritiqueReply,
} from '@hooks/queries/use-critiques';

interface CritiqueSectionProps {
  postId?: string;
  galleryId?: string;
  targetType?: 'post' | 'gallery';
  highlightedItemId?: string | null;
}

export const CritiqueSection: React.FC<CritiqueSectionProps> = ({ 
  postId, 
  galleryId,
  targetType,
  highlightedItemId 
}) => {
  const {
    setShowCritiqueForm,
    setSelectedCritique,
    setCritiqueTargetPostId,
    setCritiqueTargetGalleryId,
    setCritiqueTargetType,
    setEditingCritiqueForm,
  } = usePostUI();
  
  // Determine target type and ID
  const finalTargetType = targetType || (postId ? 'post' : 'gallery');
  const targetId = postId || galleryId || '';
  
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useCritiques(
    targetId,
    finalTargetType
  );
  const critiques = useMemo(() => data?.pages.flatMap((page) => page.results || []) ?? [], [data]);

  // Calculate statistics
  const stats = useMemo(() => {
    const positive = critiques.filter((c) => c.impression === 'positive').length;
    const negative = critiques.filter((c) => c.impression === 'negative').length;
    const neutral = critiques.filter((c) => c.impression === 'neutral').length;
    return { positive, negative, neutral };
  }, [critiques]);

  const handleAddCritique = () => {
    setSelectedCritique(null);
    if (finalTargetType === 'gallery' && galleryId) {
      setCritiqueTargetGalleryId(galleryId);
      setCritiqueTargetPostId(null);
      setCritiqueTargetType('gallery');
    } else if (postId) {
      setCritiqueTargetPostId(postId);
      setCritiqueTargetGalleryId(null);
      setCritiqueTargetType('post');
    }
    setEditingCritiqueForm(false);
    setShowCritiqueForm(true);
  };

  const loadMoreCritiques = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  if (isLoading && critiques.length === 0) {
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
          {critiques.length} {critiques.length === 1 ? 'Critique' : 'Critiques'}
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
      {critiques.length > 0 && (
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
        {critiques.map((critique) => (
          <CritiqueCard
            key={critique.critique_id}
            critique={critique}
            postId={postId}
            galleryId={galleryId}
            targetType={finalTargetType}
            highlightedItemId={highlightedItemId}
          />
        ))}
      </div>

      {hasNextPage && (
        <button
          onClick={loadMoreCritiques}
          disabled={isFetchingNextPage}
          className="btn btn-outline btn-sm w-full mt-6 hover:btn-primary"
        >
          {isFetchingNextPage ? (
            <>
              <span className="loading loading-spinner loading-xs"></span>
              Loading...
            </>
          ) : (
            'Load More Critiques'
          )}
        </button>
      )}

      {critiques.length === 0 && !isLoading && (
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
const CritiqueCard: React.FC<{ 
  critique: Critique; 
  postId?: string;
  galleryId?: string;
  targetType?: 'post' | 'gallery';
  highlightedItemId?: string | null;
}> = ({
  critique,
  postId,
  galleryId,
  targetType,
  highlightedItemId,
}) => {
  const finalTargetType = targetType || (postId ? 'post' : 'gallery');
  const targetId = postId || galleryId || '';
  const { user } = useAuth();
  const {
    setShowCritiqueForm,
    setSelectedCritique,
    setCritiqueTargetPostId,
    setCritiqueTargetGalleryId,
    setCritiqueTargetType,
    setEditingCritiqueForm,
  } = usePostUI();
  const deleteCritiqueMutation = useDeleteCritique();
  const { data: repliesData, refetch: refetchReplies, isFetching: isFetchingReplies } = useCritiqueReplies(
    critique.critique_id,
    { enabled: false },
  );
  const createReplyMutation = useCreateCritiqueReply();
  const updateReplyMutation = useUpdateCritiqueReply();
  const deleteReplyMutation = useDeleteCritiqueReply();

  const [showReplies, setShowReplies] = React.useState(false);
  const [isReplying, setIsReplying] = React.useState(false);
  const [replyText, setReplyText] = React.useState('');
  const [editingReplyId, setEditingReplyId] = React.useState<string | null>(null);
  const [editingReplyText, setEditingReplyText] = React.useState('');
  const [pendingReplyId, setPendingReplyId] = React.useState<string | null>(null);

  const replies = repliesData ?? critique.replies ?? [];
  const critiqueId = `critique-${critique.critique_id}`;
  const isCritiqueHighlighted = highlightedItemId === critiqueId;
  const isAuthor = user?.id === critique.author;

  const handleEditCritique = () => {
    setSelectedCritique(critique);
    if (finalTargetType === 'gallery' && galleryId) {
      setCritiqueTargetGalleryId(galleryId);
      setCritiqueTargetPostId(null);
      setCritiqueTargetType('gallery');
    } else if (postId) {
      setCritiqueTargetPostId(postId);
      setCritiqueTargetGalleryId(null);
      setCritiqueTargetType('post');
    }
    setEditingCritiqueForm(true);
    setShowCritiqueForm(true);
  };

  const handleDeleteCritique = async () => {
    if (!window.confirm('Are you sure you want to delete this critique?')) return;
    try {
      await deleteCritiqueMutation.mutateAsync({ 
        critiqueId: critique.critique_id, 
        postId,
        galleryId,
        targetType: finalTargetType
      });
      toast.success('Critique deleted', 'The critique has been removed successfully');
    } catch (error) {
      const message = handleApiError(error, {}, true, true);
      toast.error('Failed to delete critique', formatErrorForToast(message));
    }
  };

  const handleToggleReplies = () => {
    const next = !showReplies;
    setShowReplies(next);
    if (next) {
      refetchReplies();
    }
  };

  const handleReplySubmit = async () => {
    if (!replyText.trim()) return;
    setPendingReplyId('new');
    try {
      await createReplyMutation.mutateAsync({
        critiqueId: critique.critique_id,
        postId,
        galleryId,
        targetType: finalTargetType,
        text: replyText,
      });
      setReplyText('');
      setIsReplying(false);
      await refetchReplies();
      toast.success('Reply posted', 'Your reply has been added successfully');
    } catch (error) {
      const message = handleApiError(error, {}, true, true);
      toast.error('Failed to post reply', formatErrorForToast(message));
    } finally {
      setPendingReplyId(null);
    }
  };

  const handleReplyEdit = (replyId: string, text: string) => {
    setEditingReplyId(replyId);
    setEditingReplyText(text);
  };

  const handleReplyUpdate = async () => {
    if (!editingReplyId || !editingReplyText.trim()) return;
    setPendingReplyId(editingReplyId);
    try {
      await updateReplyMutation.mutateAsync({
        replyId: editingReplyId,
        critiqueId: critique.critique_id,
        postId,
        galleryId,
        targetType: finalTargetType,
        text: editingReplyText,
      });
      setEditingReplyId(null);
      setEditingReplyText('');
      await refetchReplies();
      toast.success('Reply updated', 'Your reply has been updated successfully');
    } catch (error) {
      const message = handleApiError(error, {}, true, true);
      toast.error('Failed to update reply', formatErrorForToast(message));
    } finally {
      setPendingReplyId(null);
    }
  };

  const handleReplyDelete = async (replyId: string) => {
    if (!window.confirm('Are you sure you want to delete this reply?')) return;
    setPendingReplyId(replyId);
    try {
      await deleteReplyMutation.mutateAsync({ 
        replyId, 
        critiqueId: critique.critique_id, 
        postId,
        galleryId,
        targetType: finalTargetType
      });
      await refetchReplies();
      toast.success('Reply deleted', 'Your reply has been deleted successfully');
    } catch (error) {
      const message = handleApiError(error, {}, true, true);
      toast.error('Failed to delete reply', formatErrorForToast(message));
    } finally {
      setPendingReplyId(null);
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
                      onClick={handleDeleteCritique}
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
      <div className="border-t border-base-300 bg-base-50 px-6 py-4 space-y-3">
        <div className="flex items-center justify-between text-xs text-base-content/60">
          {critique.reply_count > 0 && (
            <button onClick={handleToggleReplies} className="hover:text-primary transition-colors">
              {showReplies ? 'Hide' : 'Show'} {critique.reply_count} comment{critique.reply_count !== 1 ? 's' : ''}
            </button>
          )}
          <button
            onClick={() => {
              setIsReplying((prev) => !prev);
              setShowReplies(true);
            }}
            className="hover:text-primary transition-colors"
          >
            {isReplying ? 'Cancel' : 'Add a comment'}
          </button>
        </div>

        {showReplies && (
          <>
            {isFetchingReplies ? (
              <div className="flex justify-center py-2">
                <div className="loading loading-spinner loading-sm text-primary" />
              </div>
            ) : replies.length > 0 ? (
              <div className="space-y-2">
                {replies.map((reply, index) => {
                  const critiqueReplyId = `critique-reply-${reply.comment_id}`;
                  const isReplyHighlighted = highlightedItemId === critiqueReplyId;
                  const isReplyAuthor = user?.id === reply.author;

                  return (
                    <div
                      key={reply.comment_id}
                      id={critiqueReplyId}
                      className={`py-2 text-sm ${index > 0 ? 'border-t border-base-200' : ''} ${
                        isReplyHighlighted
                          ? 'bg-primary/10 border-l-4 border-l-primary pl-3 rounded-lg transition-all duration-300'
                          : ''
                      }`}
                    >
                      {editingReplyId === reply.comment_id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editingReplyText}
                            onChange={(e) => setEditingReplyText(e.target.value)}
                            className="textarea textarea-bordered textarea-sm w-full text-sm focus:textarea-primary resize-none"
                            rows={2}
                            disabled={pendingReplyId === reply.comment_id}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleReplyUpdate}
                              className="btn btn-primary btn-xs"
                              disabled={
                                pendingReplyId === reply.comment_id || !editingReplyText.trim()
                              }
                            >
                              {pendingReplyId === reply.comment_id ? (
                                <>
                                  <span className="loading loading-spinner loading-xs"></span>
                                  Saving...
                                </>
                              ) : (
                                'Save'
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setEditingReplyId(null);
                                setEditingReplyText('');
                              }}
                              className="btn btn-ghost btn-xs"
                              disabled={pendingReplyId === reply.comment_id}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 text-base-content/90">
                            {reply.text} –{' '}
                            <span className="text-primary font-medium">{reply.author_username}</span>{' '}
                            <span className="text-base-content/50 text-xs">
                              {new Date(reply.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          {isReplyAuthor && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleReplyEdit(reply.comment_id, reply.text)}
                                className="text-xs px-1 py-0.5 text-base-content/60 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                              >
                                edit
                              </button>
                              <button
                                onClick={() => handleReplyDelete(reply.comment_id)}
                                className="text-xs px-1 py-0.5 text-base-content/60 hover:text-error hover:bg-error/10 rounded transition-colors disabled:opacity-50"
                                disabled={pendingReplyId === reply.comment_id}
                              >
                                {pendingReplyId === reply.comment_id ? (
                                  <span className="loading loading-spinner loading-xs"></span>
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
            ) : (
              <p className="text-xs text-base-content/60">No comments yet.</p>
            )}

            {isReplying && (
              <div className="space-y-2">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="textarea textarea-bordered textarea-sm w-full text-sm focus:textarea-primary resize-none"
                  rows={2}
                  placeholder="Add a comment..."
                  disabled={pendingReplyId === 'new'}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleReplySubmit}
                    className="btn btn-primary btn-xs"
                    disabled={pendingReplyId === 'new' || !replyText.trim()}
                  >
                    {pendingReplyId === 'new' ? (
                      <>
                        <span className="loading loading-spinner loading-xs"></span>
                        Posting...
                      </>
                    ) : (
                      'Post Comment'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsReplying(false);
                      setReplyText('');
                    }}
                    className="btn btn-ghost btn-xs"
                    disabled={pendingReplyId === 'new'}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
