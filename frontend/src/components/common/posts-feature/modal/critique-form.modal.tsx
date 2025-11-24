import React, { useEffect, useState } from 'react';
import { usePostContext } from '@context/post-context';
import { X, MessageSquare, Sparkles } from 'lucide-react';

export const CritiqueFormModal: React.FC = () => {
  const {
    showCritiqueForm,
    setShowCritiqueForm,
    critiqueForm,
    setCritiqueForm,
    editingCritique,
    handleCritiqueSubmit,
    setEditingCritique,
    setSelectedCritique,
    submittingCritique
  } = usePostContext();
  const [localCritiqueText, setLocalCritiqueText] = useState(critiqueForm.text);

  useEffect(() => {
    setLocalCritiqueText(critiqueForm.text);
  }, [critiqueForm.text]);

  if (!showCritiqueForm) return null;

  const handleClose = () => {
    setShowCritiqueForm(false);
    setEditingCritique(false);
    setSelectedCritique(null);
    setCritiqueForm({ text: "", impression: "positive", post_id: "" });
  };

  const impressionColors = {
    positive: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100',
    negative: 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100',
    neutral: 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
              {editingCritique ? (
                <Sparkles className="w-5 h-5 text-white" />
              ) : (
                <MessageSquare className="w-5 h-5 text-white" />
              )}
            </div>
            <h3 className="text-2xl font-bold text-slate-800">
              {editingCritique ? 'Edit Critique' : 'Add Critique'}
            </h3>
          </div>
          
          <button
            onClick={handleClose}
            className="absolute top-6 right-6 p-2 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleCritiqueSubmit} className="p-6 space-y-5">
          {/* Impression Selection */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              Overall Impression
              {editingCritique && (
                <span className="ml-2 text-xs font-normal text-slate-500">(Cannot be changed)</span>
              )}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['positive', 'negative', 'neutral'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => !editingCritique && setCritiqueForm(prev => ({ ...prev, impression: type }))}
                  disabled={editingCritique}
                  className={`
                    py-3 px-4 rounded-xl border-2 font-medium text-sm capitalize
                    transition-all duration-200 transform
                    ${critiqueForm.impression === type 
                      ? 'scale-105 shadow-md ' + impressionColors[type]
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }
                    ${editingCritique ? 'opacity-60 cursor-not-allowed' : ''}
                  `}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Critique Text */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              Your Critique
            </label>
            <textarea
              value={localCritiqueText}
              onChange={(e) => setLocalCritiqueText(e.target.value)}
              onBlur={() => setCritiqueForm(prev => ({ ...prev, text: localCritiqueText }))}
              className="w-full h-36 px-4 py-3 rounded-xl border-2 border-slate-200 
                       focus:border-purple-400 focus:ring-4 focus:ring-purple-100 
                       transition-all duration-200 resize-none
                       placeholder:text-slate-400 text-slate-700"
              placeholder="Share your detailed thoughts and feedback..."
              required
            />
            <p className="text-xs text-slate-500">
              Be constructive and specific in your feedback
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submittingCritique}
              className="flex-1 py-3 px-6 rounded-xl font-semibold text-white
                       bg-gradient-to-r from-purple-500 to-pink-500
                       hover:from-purple-600 hover:to-pink-600
                       transform hover:scale-[1.02] active:scale-[0.98]
                       shadow-lg hover:shadow-xl
                       transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submittingCritique ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="loading loading-spinner loading-sm"></span>
                  {editingCritique ? 'Updating...' : 'Submitting...'}
                </span>
              ) : (
                `${editingCritique ? 'Update' : 'Submit'} Critique`
              )}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="py-3 px-6 rounded-xl font-semibold
                       bg-slate-100 text-slate-700
                       hover:bg-slate-200
                       transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};