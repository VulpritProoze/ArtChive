import React from 'react';
import { usePostContext } from '@context/post-context';
import type { Critique } from '@types';

interface CritiqueSectionProps {
  postId: string;
}

export const CritiqueSection: React.FC<CritiqueSectionProps> = ({ postId }) => {
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
    return <div className="loading loading-spinner"></div>;
  }

  return (
    <div className="mt-2">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">Critiques ({postCritiques.length})</h3>
        <button
          onClick={handleAddCritique}
          className="btn btn-primary btn-sm"
        >
          Add Critique
        </button>
      </div>

      <div className="space-y-4">
        {postCritiques.map(critique => (
          <CritiqueCard
            key={critique.critique_id}
            critique={critique}
            postId={postId}
          />
        ))}
      </div>

      {pagination?.hasNext && (
        <button
          onClick={loadMoreCritiques}
          disabled={loadingCritiques[postId]}
          className="btn btn-outline btn-sm w-full mt-4"
        >
          {loadingCritiques[postId] ? 'Loading...' : 'Load More Critiques'}
        </button>
      )}

      {postCritiques.length === 0 && !loadingCritiques[postId] && (
        <div className="text-center py-4 text-base-content/70">
          No critiques yet. Be the first to add one!
        </div>
      )}
    </div>
  );
};

// Individual Critique Card Component
const CritiqueCard: React.FC<{ critique: Critique; postId: string }> = ({ critique, postId }) => {
  const {
    deleteCritique,
    toggleCritiqueReplies,
    toggleCritiqueReplyForm,
    setupCritiqueReplyForm,
    critiqueReplyForms,
    handleCritiqueReplySubmit,
    handleCritiqueReplyFormChange,
    loadingCritiqueReplies
  } = usePostContext();

  const replyForm = critiqueReplyForms[critique.critique_id];

  return (
    <div className="card card-bordered bg-base-100 shadow-sm">
      <div className="card-body">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <img
              src={critique.author_picture || '/images/default-avatar.png'}
              alt={critique.author_username}
              className="w-8 h-8 rounded-full"
            />
            <div>
              <p className="font-semibold">{critique.author_fullname || critique.author_username}</p>
              <p className="text-sm text-base-content/70">
                {new Date(critique.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`badge ${
              critique.impression === 'positive' ? 'badge-success' : 
              critique.impression === 'negative' ? 'badge-error' : 'badge-warning'
            }`}>
              {critique.impression}
            </span>
            <button
              onClick={() => deleteCritique(critique.critique_id, postId)}
              className="btn btn-ghost btn-xs text-error"
            >
              Delete
            </button>
          </div>
        </div>

        <p className="mt-3">{critique.text}</p>

        <div className="card-actions justify-between items-center mt-4">
          <button
            onClick={() => {
              toggleCritiqueReplies(critique.critique_id);
            }}
            className="btn btn-ghost btn-sm"
          >
            {critique.reply_count || 0} Replies
          </button>

          <button
            onClick={() => {
              toggleCritiqueReplyForm(critique.critique_id);
              if (!critique.is_replying) {
                setupCritiqueReplyForm(critique.critique_id);
              }
            }}
            className="btn btn-ghost btn-sm"
          >
            Reply
          </button>
        </div>

        {/* Reply Form */}
        {critique.is_replying && (
          <form
            onSubmit={(e) => handleCritiqueReplySubmit(e, critique.critique_id)}
            className="mt-4"
          >
            <textarea
              value={replyForm?.text || ''}
              onChange={(e) => handleCritiqueReplyFormChange(critique.critique_id, e.target.value)}
              placeholder="Write a reply..."
              className="textarea textarea-bordered w-full"
              rows={3}
            />
            <div className="flex gap-2 mt-2">
              <button type="submit" className="btn btn-primary btn-sm">
                Post Reply
              </button>
              <button
                type="button"
                onClick={() => toggleCritiqueReplyForm(critique.critique_id)}
                className="btn btn-ghost btn-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Replies */}
        {critique.show_replies && (
          <div className="mt-4 border-t pt-4">
            {loadingCritiqueReplies[critique.critique_id] ? (
              <div className="loading loading-spinner"></div>
            ) : (
              <div className="space-y-3">
                {critique.replies?.map(reply => (
                  <div key={reply.comment_id} className="pl-4 border-l-2 border-base-300">
                    <div className="flex items-center gap-2">
                      <img
                        src={reply.author_picture || '/images/default-avatar.png'}
                        alt={reply.author_username}
                        className="w-6 h-6 rounded-full"
                      />
                      <p className="font-medium text-sm">{reply.author_username}</p>
                    </div>
                    <p className="mt-1 text-sm">{reply.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};