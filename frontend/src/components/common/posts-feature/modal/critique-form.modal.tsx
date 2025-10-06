import React from 'react';
import { usePostContext } from '@context/post-context';

export const CritiqueFormModal: React.FC = () => {
  const {
    showCritiqueForm,
    setShowCritiqueForm,
    critiqueForm,
    setCritiqueForm,
    editingCritique,
    handleCritiqueSubmit,
    setEditingCritique,
    setSelectedCritique
  } = usePostContext();

  if (!showCritiqueForm) return null;

  const handleClose = () => {
    setShowCritiqueForm(false);
    setEditingCritique(false);
    setSelectedCritique(null);
    setCritiqueForm({ text: "", impression: "positive", post_id: "" });
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">
          {editingCritique ? 'Edit Critique' : 'Add Critique'}
        </h3>
        
        <form onSubmit={handleCritiqueSubmit}>
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Impression</span>
            </label>
            <select
              value={critiqueForm.impression}
              onChange={(e) => setCritiqueForm(prev => ({ ...prev, impression: e.target.value }))}
              className="select select-bordered w-full"
              required
            >
              <option value="positive">Positive</option>
              <option value="negative">Negative</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Your Critique</span>
            </label>
            <textarea
              value={critiqueForm.text}
              onChange={(e) => setCritiqueForm(prev => ({ ...prev, text: e.target.value }))}
              className="textarea textarea-bordered h-32"
              placeholder="Share your detailed critique..."
              required
            />
          </div>

          <div className="modal-action">
            <button type="submit" className="btn btn-primary">
              {editingCritique ? 'Update' : 'Submit'} Critique
            </button>
            <button type="button" onClick={handleClose} className="btn btn-ghost">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};