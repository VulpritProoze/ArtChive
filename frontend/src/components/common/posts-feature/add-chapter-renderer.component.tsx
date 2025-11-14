import React, { useState, useEffect } from 'react'
import type { PostForm } from '@types';

type AddChapterRendererType = {
    postForm: PostForm,
    setPostForm,
}

const AddChapterRenderer: React.FC<AddChapterRendererType> = ({ postForm, setPostForm }) => {
    const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
    const [validationErrors, setValidationErrors] = useState<{[key: number]: {chapter?: string, content?: string}}>({});

    // Reset to first chapter when chapters change significantly
    useEffect(() => {
      if (currentChapterIndex >= postForm.chapters.length && postForm.chapters.length > 0) {
        setCurrentChapterIndex(postForm.chapters.length - 1);
      }
    }, [postForm.chapters.length, currentChapterIndex]);

    const validateChapter = (index: number): boolean => {
        const chapter = postForm.chapters[index];
        const errors: {chapter?: string, content?: string} = {};

        if (!chapter.chapter || chapter.chapter.trim() === '') {
          errors.chapter = 'Chapter number is required';
        } else if (Number(chapter.chapter) < 1) {
          errors.chapter = 'Chapter number must be at least 1';
        }

        if (!chapter.content || chapter.content.trim() === '') {
          errors.content = 'Chapter content is required';
        }

        setValidationErrors(prev => ({ ...prev, [index]: errors }));
        return Object.keys(errors).length === 0;
      };

    const handleChapterChange = (index: number, field: 'chapter' | 'content', value: string) => {
        const updatedChapters = [...postForm.chapters];
        updatedChapters[index] = { ...updatedChapters[index], [field]: value };
        setPostForm(prev => ({ ...prev, chapters: updatedChapters }));

        // Only clear validation error if it exists, don't revalidate on every keystroke
        if (validationErrors[index]?.[field]) {
          const newErrors = { ...validationErrors };
          if (newErrors[index]) {
            delete newErrors[index][field];
            if (Object.keys(newErrors[index]).length === 0) {
              delete newErrors[index];
            }
          }
          setValidationErrors(newErrors);
        }
      };

      const addChapter = () => {
        // Validate current chapter before adding new one
        if (postForm.chapters.length > 0 && !validateChapter(currentChapterIndex)) {
          return;
        }

        const newChapter = { chapter: '', content: '' };
        setPostForm(prev => ({
          ...prev,
          chapters: [...prev.chapters, newChapter]
        }));
        setCurrentChapterIndex(postForm.chapters.length); // Move to the new chapter
      };

      const removeChapter = (index: number) => {
        if (postForm.chapters.length > 1) {
          const updatedChapters = postForm.chapters.filter((_, i) => i !== index);
          setPostForm(prev => ({ ...prev, chapters: updatedChapters }));

          // Remove validation errors for this chapter
          const newErrors = { ...validationErrors };
          delete newErrors[index];
          setValidationErrors(newErrors);

          // Adjust current index if needed
          if (currentChapterIndex >= index && currentChapterIndex > 0) {
            setCurrentChapterIndex(currentChapterIndex - 1);
          }
        }
      };

      const handlePrevious = () => {
        if (currentChapterIndex > 0) {
          setCurrentChapterIndex(currentChapterIndex - 1);
        }
      };

      const handleNext = () => {
        // Validate current chapter before moving to next
        if (validateChapter(currentChapterIndex) && currentChapterIndex < postForm.chapters.length - 1) {
          setCurrentChapterIndex(currentChapterIndex + 1);
        }
      };

      const currentChapter = postForm.chapters[currentChapterIndex] || { chapter: '', content: '' };
      const currentErrors = validationErrors[currentChapterIndex] || {};

    return (
        <div className="w-full h-full flex flex-col">
          {/* Header with Chapter Navigation */}
          <div className="sticky top-0 bg-base-200 rounded-2xl shadow-md z-10 mb-4">
            <div className="flex justify-between items-center p-4 border-b border-base-300">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    Novel Chapters
                  </h3>
                  <p className="text-xs text-base-content/60">{postForm.chapters.length} chapter{postForm.chapters.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm gap-2 shadow-lg hover:scale-105 transition-transform"
                onClick={addChapter}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Chapter
              </button>
            </div>

            {/* Chapter Navigation - Only show when chapters exist */}
            {postForm.chapters.length > 0 && (
              <div className="flex justify-between items-center px-4 py-3 bg-base-100">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm gap-2"
                  disabled={currentChapterIndex === 0}
                  onClick={handlePrevious}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">
                    Chapter {currentChapter.chapter || '?'}
                  </span>
                  <span className="text-xs text-base-content/60">
                    ({currentChapterIndex + 1} of {postForm.chapters.length})
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm gap-2"
                  disabled={currentChapterIndex >= postForm.chapters.length - 1}
                  onClick={handleNext}
                >
                  Next
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Current Chapter Editor */}
          <div className="flex-1 overflow-y-auto px-2">
            {postForm.chapters.length === 0 ? (
              <div className="text-center py-12 px-6">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                  <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h4 className="text-lg font-bold mb-2 text-base-content/70">No Chapters Yet</h4>
                <p className="text-sm text-base-content/50 mb-4">Start adding chapters to your novel</p>
                <button
                  type="button"
                  className="btn btn-primary gap-2"
                  onClick={addChapter}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Your First Chapter
                </button>
              </div>
            ) : (
              <div className="card bg-gradient-to-br from-base-100 to-base-200 border border-base-300 shadow-lg">
                <div className="card-body p-5">
                  {/* Chapter Actions */}
                  {postForm.chapters.length > 1 && (
                    <div className="flex justify-end mb-4">
                      <button
                        type="button"
                        className="btn btn-circle btn-sm btn-ghost hover:btn-error transition-colors"
                        onClick={() => removeChapter(currentChapterIndex)}
                        title="Remove this chapter"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {/* Chapter Number Input */}
                  <div className="form-control mb-4">
                    <label className="label">
                      <span className="label-text font-semibold flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                        </svg>
                        Chapter Number
                      </span>
                    </label>
                    <input
                      type="number"
                      className={`block w-full input input-bordered bg-base-100 focus:ring-2 transition-all ${
                        currentErrors.chapter ? 'input-error focus:ring-error' : 'focus:ring-primary'
                      }`}
                      value={currentChapter.chapter}
                      onChange={(e) => handleChapterChange(currentChapterIndex, 'chapter', e.target.value)}
                      min="1"
                      placeholder="Enter chapter number..."
                    />
                    {currentErrors.chapter && (
                      <label className="label">
                        <span className="label-text-alt text-error flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {currentErrors.chapter}
                        </span>
                      </label>
                    )}
                  </div>

                  {/* Content Textarea */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Chapter Content
                      </span>
                      <span className="label-text-alt text-base-content/60">
                        {currentChapter.content?.length || 0} characters
                      </span>
                    </label>
                    <textarea
                      className={`textarea w-full textarea-bordered bg-base-100 min-h-[300px] focus:ring-2 transition-all leading-relaxed ${
                        currentErrors.content ? 'textarea-error focus:ring-error' : 'focus:ring-primary'
                      }`}
                      value={currentChapter.content}
                      onChange={(e) => handleChapterChange(currentChapterIndex, 'content', e.target.value)}
                      placeholder="Write your chapter content here..."
                    />
                    {currentErrors.content && (
                      <label className="label">
                        <span className="label-text-alt text-error flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {currentErrors.content}
                        </span>
                      </label>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
    )
}

export default AddChapterRenderer