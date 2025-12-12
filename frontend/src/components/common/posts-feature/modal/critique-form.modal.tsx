import React, { useEffect, useState, useRef } from 'react';
import { X, MessageSquare, Sparkles, Eye, EyeOff, FileText } from 'lucide-react';
import { usePostUI } from '@context/post-ui-context';
import { useCritiqueForm } from '@hooks/forms/use-critique-form';
import { useCreateCritique, useUpdateCritique } from '@hooks/queries/use-critiques';
import { toast } from '@utils/toast.util';
import { handleApiError, formatErrorForToast } from '@utils';
import { MarkdownToolbar } from '@components/common/posts-feature/markdown-toolbar.component';
import { MarkdownRenderer } from '@components/common/markdown-renderer.component';
import { useTextUndoRedo } from '@hooks/use-undo-redo.hook';

const impressionColors = {
  positive: 'bg-success/10 border-success/30 text-success hover:bg-success/20 dark:bg-success/20 dark:border-success/40 dark:text-success',
  negative: 'bg-error/10 border-error/30 text-error hover:bg-error/20 dark:bg-error/20 dark:border-error/40 dark:text-error',
  neutral: 'bg-base-200 border-base-300 text-base-content hover:bg-base-300',
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
  const [showMarkdownToolbar, setShowMarkdownToolbar] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Undo/Redo functionality
  const undoRedo = useTextUndoRedo(form.text);

  const isSubmitting = createCritique.isPending || updateCritique.isPending;

  useEffect(() => {
    if (selectedCritique) {
      const newText = selectedCritique.text;
      setForm({
        text: newText,
        impression: selectedCritique.impression,
        post_id: selectedCritique.post_id || undefined,
        gallery_id: (selectedCritique as any).gallery_id || undefined,
      });
      undoRedo.reset(newText);
    } else {
      const targetType = critiqueTargetType || (critiqueTargetPostId ? 'post' : 'gallery');
      setForm({
        text: '',
        impression: 'positive',
        post_id: targetType === 'post' ? (critiqueTargetPostId || '') : undefined,
        gallery_id: targetType === 'gallery' ? (critiqueTargetGalleryId || '') : undefined,
      });
      undoRedo.reset('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCritique, critiqueTargetPostId, critiqueTargetGalleryId, critiqueTargetType, setForm]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea && !showPreview) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Set height to scrollHeight, with min and max constraints
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 144), 600);
      textarea.style.height = `${newHeight}px`;
    }
  }, [form.text, showPreview]);

  const closeModal = () => {
    if (isSubmitting) return;
    setShowCritiqueForm(false);
    setSelectedCritique(null);
    setCritiqueTargetPostId(null);
    setCritiqueTargetGalleryId(null);
    setCritiqueTargetType(null);
    setEditingCritiqueForm(false);
    resetForm();
    undoRedo.reset('');
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
      <div className="absolute inset-0 bg-base-content/50 backdrop-blur-sm" onClick={closeModal} />

      <div className="relative bg-base-100 rounded-2xl shadow-2xl max-w-3xl w-full animate-in zoom-in-95 duration-200 border border-base-300">
        <div className="relative px-6 pt-6 pb-4 border-b border-base-300">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-secondary">
              {editingCritiqueForm ? (
                <Sparkles className="w-5 h-5 text-primary-content" />
              ) : (
                <MessageSquare className="w-5 h-5 text-primary-content" />
              )}
            </div>
            <h3 className="text-2xl font-bold text-base-content">
              {editingCritiqueForm ? 'Edit Critique' : 'Add Critique'}
            </h3>
          </div>

          <button
            onClick={closeModal}
            className="absolute top-6 right-6 p-2 rounded-lg hover:bg-base-200 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-base-content/60" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-base-content">
              Overall Impression
              {editingCritiqueForm && (
                <span className="ml-2 text-xs font-normal text-base-content/60">(Cannot be changed)</span>
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
                        : 'bg-base-100 border-base-300 text-base-content hover:border-base-content/30'
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
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-base-content">Your Critique</label>
              <div className="flex items-center gap-2">
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
                handleFieldChange('text', newValue);
              }}
            />

            {showPreview ? (
              <div className="w-full bg-base-200 border-2 border-base-300 rounded-xl p-4 min-h-[144px] max-h-[600px] overflow-y-auto">
                {form.text ? (
                  <MarkdownRenderer 
                    content={form.text} 
                    className="text-base text-base-content"
                  />
                ) : (
                  <p className="text-base-content/50 italic">Preview will appear here...</p>
                )}
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={form.text}
                onChange={(e) => {
                  const newValue = e.target.value;
                  handleFieldChange('text', newValue);
                  undoRedo.setValue(newValue, false);
                }}
                className="w-full h-36 px-4 py-3 rounded-xl border-2 border-base-300 
                         bg-base-100 text-base-content
                         focus:border-primary focus:ring-4 focus:ring-primary/20 
                         transition-all duration-200 resize-none
                         placeholder:text-base-content/50"
                placeholder="Share your detailed thoughts and feedback..."
                required
              />
            )}
            <p className="text-xs text-base-content/60">Be constructive and specific in your feedback</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-6 rounded-xl font-semibold text-primary-content
                       bg-gradient-to-r from-primary to-secondary
                       hover:from-primary/90 hover:to-secondary/90
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
                       bg-base-200 text-base-content
                       hover:bg-base-300
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

