import React, { useEffect } from 'react';
import { X, MessageSquare, Sparkles } from 'lucide-react';
import { usePostUI } from '@context/post-ui-context';
import { useCritiqueForm } from '@hooks/forms/use-critique-form';
import { useCreateCritique, useUpdateCritique } from '@hooks/queries/use-critiques';
import { toast } from '@utils/toast.util';
import { handleApiError, formatErrorForToast } from '@utils';

const impressionColors = {
  positive: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100',
  negative: 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100',
  neutral: 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100',
};

export const CritiqueFormModal: React.FC = () => {
  const {
    showCritiqueForm,
    setShowCritiqueForm,
    selectedCritique,
    setSelectedCritique,
    critiqueTargetPostId,
    setCritiqueTargetPostId,
    critiqueTargetGalleryId,
    setCritiqueTargetGalleryId,
    critiqueTargetType,
    setCritiqueTargetType,
    editingCritiqueForm,
    setEditingCritiqueForm,
  } = usePostUI();

  const { form, handleFieldChange, resetForm, setForm } = useCritiqueForm();
  const createCritique = useCreateCritique();
  const updateCritique = useUpdateCritique();

  const isSubmitting = createCritique.isPending || updateCritique.isPending;

  useEffect(() => {
    if (selectedCritique) {
      setForm({
        text: selectedCritique.text,
        impression: selectedCritique.impression,
        post_id: selectedCritique.post_id || undefined,
        gallery_id: (selectedCritique as any).gallery_id || undefined,
      });
    } else {
      const targetType = critiqueTargetType || (critiqueTargetPostId ? 'post' : 'gallery');
      setForm({
        text: '',
        impression: 'positive',
        post_id: targetType === 'post' ? (critiqueTargetPostId || '') : undefined,
        gallery_id: targetType === 'gallery' ? (critiqueTargetGalleryId || '') : undefined,
      });
    }
  }, [selectedCritique, critiqueTargetPostId, critiqueTargetGalleryId, critiqueTargetType, setForm]);

  const closeModal = () => {
    if (isSubmitting) return;
    setShowCritiqueForm(false);
    setSelectedCritique(null);
    setCritiqueTargetPostId(null);
    setCritiqueTargetGalleryId(null);
    setCritiqueTargetType(null);
    setEditingCritiqueForm(false);
    resetForm();
  };

  const hasTarget = critiqueTargetPostId || critiqueTargetGalleryId;

  if (!showCritiqueForm || !hasTarget) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (editingCritiqueForm && selectedCritique) {
        const critiqueTargetType = (selectedCritique as any).gallery_id ? 'gallery' : 'post';
        await updateCritique.mutateAsync({
          critiqueId: selectedCritique.critique_id,
          text: form.text,
          postId: selectedCritique.post_id,
          galleryId: (selectedCritique as any).gallery_id,
          targetType: critiqueTargetType,
        });
        toast.success('Critique updated', 'Your critique has been updated successfully');
      } else {
        const finalTargetType = critiqueTargetType || (form.post_id ? 'post' : 'gallery');
        await createCritique.mutateAsync({
          text: form.text,
          impression: form.impression,
          post_id: form.post_id,
          gallery_id: form.gallery_id,
          targetType: finalTargetType,
        });
        toast.success('Critique created', 'Your critique has been submitted successfully');
      }
      closeModal();
    } catch (error) {
      const message = handleApiError(error, {}, true, true);
      toast.error('Failed to save critique', formatErrorForToast(message));
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />

      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full animate-in zoom-in-95 duration-200">
        <div className="relative px-6 pt-6 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
              {editingCritiqueForm ? (
                <Sparkles className="w-5 h-5 text-white" />
              ) : (
                <MessageSquare className="w-5 h-5 text-white" />
              )}
            </div>
            <h3 className="text-2xl font-bold text-slate-800">
              {editingCritiqueForm ? 'Edit Critique' : 'Add Critique'}
            </h3>
          </div>

          <button
            onClick={closeModal}
            className="absolute top-6 right-6 p-2 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              Overall Impression
              {editingCritiqueForm && (
                <span className="ml-2 text-xs font-normal text-slate-500">(Cannot be changed)</span>
              )}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['positive', 'negative', 'neutral'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleFieldChange('impression', type)}
                  disabled={editingCritiqueForm}
                  className={`
                    py-3 px-4 rounded-xl border-2 font-medium text-sm capitalize
                    transition-all duration-200 transform
                    ${
                      form.impression === type
                        ? 'scale-105 shadow-md ' + impressionColors[type]
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }
                    ${editingCritiqueForm ? 'opacity-60 cursor-not-allowed' : ''}
                  `}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Your Critique</label>
            <textarea
              value={form.text}
              onChange={(e) => handleFieldChange('text', e.target.value)}
              className="w-full h-36 px-4 py-3 rounded-xl border-2 border-slate-200 
                       focus:border-purple-400 focus:ring-4 focus:ring-purple-100 
                       transition-all duration-200 resize-none
                       placeholder:text-slate-400 text-slate-700"
              placeholder="Share your detailed thoughts and feedback..."
              required
            />
            <p className="text-xs text-slate-500">Be constructive and specific in your feedback</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-6 rounded-xl font-semibold text-white
                       bg-gradient-to-r from-purple-500 to-pink-500
                       hover:from-purple-600 hover:to-pink-600
                       transform hover:scale-[1.02] active:scale-[0.98]
                       shadow-lg hover:shadow-xl
                       transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="loading loading-spinner loading-sm"></span>
                  {editingCritiqueForm ? 'Updating...' : 'Submitting...'}
                </span>
              ) : (
                `${editingCritiqueForm ? 'Update' : 'Submit'} Critique`
              )}
            </button>
            <button
              type="button"
              onClick={closeModal}
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

