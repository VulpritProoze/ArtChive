import React, { useEffect, useState, useRef } from 'react';
import { X, MessageSquare, Sparkles, ChevronDown, ChevronUp, Undo2, Redo2 } from 'lucide-react';
import { usePostUI } from '@context/post-ui-context';
import { useCritiqueForm } from '@hooks/forms/use-critique-form';
import { useCreateCritique, useUpdateCritique } from '@hooks/queries/use-critiques';
import { toast } from '@utils/toast.util';
import { handleApiError, formatErrorForToast } from '@utils';
import { MarkdownToolbar } from '@components/common/posts-feature/markdown-toolbar.component';
import { MarkdownRenderer } from '@components/common/markdown-renderer.component';
import { useTextUndoRedo } from '@hooks/use-undo-redo.hook';

const impressionColors = {
  positive: 'bg-success/10 border-success/30 text-success hover:bg-success/20',
  negative: 'bg-error/10 border-error/30 text-error hover:bg-error/20',
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
  const [isImpressionCollapsed, setIsImpressionCollapsed] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />

      <div className="relative bg-base-100 rounded-2xl shadow-2xl max-w-3xl w-full animate-in zoom-in-95 duration-200 border border-base-300 max-h-[90vh] flex flex-col">
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
            <X className="w-5 h-5 text-base-content/70" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setIsImpressionCollapsed(!isImpressionCollapsed)}
              className="flex items-center justify-between w-full text-left"
            >
              <label className="text-sm font-semibold text-base-content cursor-pointer">
                Overall Impression
                {editingCritiqueForm && (
                  <span className="ml-2 text-xs font-normal text-base-content/60">(Cannot be changed)</span>
                )}
              </label>
              {isImpressionCollapsed ? (
                <ChevronDown className="w-4 h-4 text-base-content/70" />
              ) : (
                <ChevronUp className="w-4 h-4 text-base-content/70" />
              )}
            </button>
            {!isImpressionCollapsed && (
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
                          : 'bg-base-200 border-base-300 text-base-content hover:border-base-400'
                      }
                      ${editingCritiqueForm ? 'opacity-60 cursor-not-allowed' : ''}
                    `}
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-base-content">Your Critique</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    // Save scroll position before undo
                    const scrollY = formRef.current?.scrollTop || 0;
                    const undoneValue = undoRedo.undo();
                    handleFieldChange('text', undoneValue);
                    // Restore scroll position after state update
                    requestAnimationFrame(() => {
                      if (formRef.current) {
                        formRef.current.scrollTop = scrollY;
                      }
                    });
                  }}
                  disabled={!undoRedo.canUndo}
                  className="btn btn-sm btn-ghost gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/10 hover:text-primary"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Save scroll position before redo
                    const scrollY = formRef.current?.scrollTop || 0;
                    const redoneValue = undoRedo.redo();
                    handleFieldChange('text', redoneValue);
                    // Restore scroll position after state update
                    requestAnimationFrame(() => {
                      if (formRef.current) {
                        formRef.current.scrollTop = scrollY;
                      }
                    });
                  }}
                  disabled={!undoRedo.canRedo}
                  className="btn btn-sm btn-ghost gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/10 hover:text-primary"
                  title="Redo (Ctrl+Y)"
                >
                  <Redo2 className="w-4 h-4" />
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
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {showPreview ? 'Hide Preview' : 'Preview'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowMarkdownToolbar(!showMarkdownToolbar)}
                  className={`btn btn-sm btn-ghost gap-2 transition-all ${
                    showMarkdownToolbar 
                      ? 'bg-primary/20 text-primary' 
                      : 'hover:bg-primary/10 hover:text-primary'
                  }`}
                  title="Markdown formatting"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Format
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
              <div className="w-full bg-base-200 border border-base-300 rounded-xl p-4 min-h-[144px] max-h-[400px] overflow-y-auto">
                {(() => {
                  // Always read the current textarea value to ensure we have the latest
                  const currentText = textareaRef.current?.value || form.text;
                  return currentText ? (
                    <MarkdownRenderer 
                      content={currentText} 
                      className="text-base text-base-content"
                    />
                  ) : (
                    <p className="text-base-content/50 italic">Preview will appear here...</p>
                  );
                })()}
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={form.text}
                onChange={(e) => {
                  const newValue = e.target.value;
                  undoRedo.setValue(newValue, true);
                  handleFieldChange('text', newValue);
                }}
                onKeyDown={(e) => {
                  // Handle Ctrl+Z (Undo) and Ctrl+Y or Ctrl+Shift+Z (Redo)
                  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    // Save scroll position before undo
                    const scrollY = formRef.current?.scrollTop || 0;
                    const undoneValue = undoRedo.undo();
                    handleFieldChange('text', undoneValue);
                    // Restore scroll position after state update
                    requestAnimationFrame(() => {
                      if (formRef.current) {
                        formRef.current.scrollTop = scrollY;
                      }
                    });
                  } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                    e.preventDefault();
                    // Save scroll position before redo
                    const scrollY = formRef.current?.scrollTop || 0;
                    const redoneValue = undoRedo.redo();
                    handleFieldChange('text', redoneValue);
                    // Restore scroll position after state update
                    requestAnimationFrame(() => {
                      if (formRef.current) {
                        formRef.current.scrollTop = scrollY;
                      }
                    });
                  }
                }}
                className="w-full min-h-[144px] max-h-[600px] px-4 py-3 rounded-xl border-2 border-base-300 
                         focus:border-primary focus:ring-4 focus:ring-primary/20 
                         transition-all duration-200 resize-none overflow-y-hidden
                         placeholder:text-base-content/50 text-base-content bg-base-100"
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

