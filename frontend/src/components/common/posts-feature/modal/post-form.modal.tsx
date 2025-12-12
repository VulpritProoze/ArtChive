import React, { useEffect, useState, useRef } from 'react';
import { AddChapterRenderer, AddMediaRenderer } from '@components/common';
import { usePostUI } from '@context/post-ui-context';
import { usePostForm } from '@hooks/forms/use-post-form';
import { useCreatePost, useUpdatePost } from '@hooks/mutations/use-post-mutations';
import { useAuth } from '@context/auth-context';
import { toast } from '@utils/toast.util';
import { handleApiError, formatErrorForToast } from '@utils';
import { MarkdownToolbar } from '@components/common/posts-feature/markdown-toolbar.component';
import { MarkdownRenderer } from '@components/common/markdown-renderer.component';
import { useTextUndoRedo } from '@hooks/use-undo-redo.hook';
import { Undo2, Redo2 } from 'lucide-react';

interface PostFormModalProps {
  channel_id?: string;
  user_id?: number;
}

export default function PostFormModal({ channel_id }: PostFormModalProps) {
  const { showPostForm, closePostForm, selectedPost, editing } = usePostUI();
  const {
    form: postForm,
    setForm: setPostForm,
    handleFieldChange: handlePostFormChange,
  } = usePostForm({ channel_id: channel_id });

  const { mutateAsync: createPost, isPending: isCreating } = useCreatePost();
  const { mutateAsync: updatePost, isPending: isUpdating } = useUpdatePost();
  const { user } = useAuth();
  const [mobileView, setMobileView] = useState<'media' | 'details'>('media');
  const [localDescription, setLocalDescription] = useState(postForm?.description || '');
  const [showMarkdownToolbar, setShowMarkdownToolbar] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Undo/Redo functionality
  const undoRedo = useTextUndoRedo(localDescription);

  // Update form when selectedPost changes (for editing) or reset when creating new post
  useEffect(() => {
    if (!showPostForm) return;

    if (selectedPost && editing) {
      setPostForm({
        description: selectedPost.description || '',
        post_type: selectedPost.post_type || 'default',
        image_url: null,
        video_url: null,
        chapters:
          selectedPost.novel_post?.map((chapter) => ({
            chapter: chapter.chapter?.toString() ?? '',
            content: chapter.content ?? '',
          })) ?? [{ chapter: '', content: '' }],
        channel_id: selectedPost.channel_id ?? channel_id,
      });
      const newDesc = selectedPost.description || '';
      setLocalDescription(newDesc);
      undoRedo.reset(newDesc);
    } else if (!selectedPost && !editing) {
      // Reset form for new post
      setPostForm({
        description: '',
        post_type: 'default',
        image_url: null,
        video_url: null,
        chapters: [{ chapter: '', content: '' }],
        channel_id: channel_id,
      });
      setLocalDescription('');
      undoRedo.reset('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPostForm, selectedPost?.post_id, editing, channel_id]);

  useEffect(() => {
    const newDesc = postForm?.description || '';
    // Only update if it's different from current local description
    // This prevents loops when undo/redo updates the form
    if (newDesc !== localDescription) {
      setLocalDescription(newDesc);
      // Only sync undo/redo if the change came from outside (not from user typing or undo/redo)
      if (newDesc !== undoRedo.value) {
        undoRedo.setValue(newDesc, false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postForm?.description]);

  const isSubmitting = isCreating || isUpdating;

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    undoRedo.setValue(newValue, true);
    setLocalDescription(newValue);
    // Also update form immediately to keep in sync
    setPostForm((prev) => ({ ...prev, description: newValue }));
  };

  const handleTextareaBlur = () => {
    // Ensure we have the latest value from textarea
    const currentValue = textareaRef.current?.value || localDescription;
    setLocalDescription(currentValue);
    setPostForm((prev) => ({ ...prev, description: currentValue }));
  };

  const buildFormData = () => {
    const formData = new FormData();
    formData.append('description', postForm?.description || '');
    formData.append('post_type', postForm?.post_type || 'default');
    if (postForm?.channel_id || channel_id) {
      formData.append('channel', postForm?.channel_id ?? channel_id ?? '');
    }

    if (postForm?.image_url) {
      formData.append('image_url', postForm.image_url);
    }

    if (postForm?.video_url) {
      formData.append('video_url', postForm.video_url);
    }

    if (postForm?.post_type === 'novel') {
      postForm.chapters.forEach((chapter, index) => {
        formData.append(`chapters[${index}].chapter`, chapter.chapter);
        formData.append(`chapters[${index}].content`, chapter.content);
      });
    }

    return formData;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = buildFormData();

    try {
      if (editing && selectedPost) {
        await updatePost({ postId: selectedPost.post_id, formData });
        // Toast shown in mutation callback
      } else {
        await createPost({ formData });
        // Toast shown in mutation callback - remove duplicate
      }
      closePostForm();
      setPostForm({
        description: '',
        post_type: 'default',
        image_url: null,
        video_url: null,
        chapters: [{ chapter: '', content: '' }],
        channel_id: channel_id,
      });
      setLocalDescription('');
    } catch (error) {
      const message = handleApiError(error, undefined, true, true);
      toast.error('Operation failed', formatErrorForToast(message));
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    closePostForm();
    setPostForm({
      description: '',
      post_type: 'default',
      image_url: null,
      video_url: null,
      chapters: [{ chapter: '', content: '' }],
      channel_id: channel_id,
    });
    setLocalDescription('');
    undoRedo.reset('');
  };

  if (!showPostForm || !postForm) {
    return null;
  }

  return (
    <>
      {/* Enhanced Backdrop with Animation */}
      <div className="modal modal-open animate-fade-in">
        <div
          className="fixed inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/70 backdrop-blur-lg transition-all duration-300"
          onClick={handleClose}
        ></div>

        {/* Enhanced Modal Content with Scale Animation */}
        <div className={`modal-box max-w-6xl p-0 overflow-hidden relative bg-base-100 rounded-3xl shadow-2xl animate-scale-in border border-base-300/50 ${postForm.post_type === 'novel' ? 'flex flex-col max-h-[90vh] min-h-0' : ''}`}>
          {/* Modern Top Bar with Gradient */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-base-300 bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 backdrop-blur-sm sticky top-0 z-10">
            <button
              type="button"
              onClick={handleClose}
              className="btn btn-circle btn-ghost btn-sm hover:bg-error/10 hover:text-error transition-all duration-200 hover:rotate-90"
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
                {editing ? '✏️ Edit Post' : '✨ Create New Post'}
              </h2>
            </div>

            <button
              type="submit"
              form="post-form"
              disabled={isSubmitting}
              className="btn btn-primary btn-sm gap-2 hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  {editing ? 'Updating...' : 'Posting...'}
                </>
              ) : editing ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Update Post
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Share Post
                </>
              )}
            </button>
          </div>

          {/* Tab Navigation - Always visible for novel posts, mobile-only for other types */}
          {/* Hide media tab when editing image or video posts */}
          {postForm.post_type !== 'default' && !(editing && (postForm.post_type === 'image' || postForm.post_type === 'video')) && (
            <div className={`border-b border-base-300 bg-base-100 ${postForm.post_type === 'novel' ? '' : 'lg:hidden'}`}>
              <div className="flex">
                <button
                  type="button"
                  onClick={() => setMobileView('media')}
                  className={`flex-1 py-4 px-6 font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                    mobileView === 'media'
                      ? 'text-primary border-b-2 border-primary bg-primary/5'
                      : 'text-base-content/60 hover:text-base-content hover:bg-base-200/50'
                  }`}
                >
                  {postForm.post_type === 'novel' ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      Chapters
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Media
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setMobileView('details')}
                  className={`flex-1 py-4 px-6 font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                    mobileView === 'details'
                      ? 'text-secondary border-b-2 border-secondary bg-secondary/5'
                      : 'text-base-content/60 hover:text-base-content hover:bg-base-200/50'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Details
                </button>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <form id="post-form" onSubmit={handleSubmit} className={`flex flex-col ${postForm.post_type === 'novel' ? '' : 'lg:flex-row'} flex-1 ${postForm.post_type === 'novel' ? 'overflow-y-auto min-h-0' : 'max-h-[85vh]'}`}>
            {/* Left Side - Enhanced Media Preview / Chapters with Gradient Background */}
            {/* Hide media section when editing image or video posts */}
            {postForm.post_type !== 'default' && !(editing && (postForm.post_type === 'image' || postForm.post_type === 'video')) && (
              <div
                className={`${postForm.post_type === 'novel' ? 'w-full' : 'lg:w-3/5'} bg-gradient-to-br from-base-200 via-base-300 to-base-200 flex items-center justify-center p-0 pt-2 lg:min-h-[550px] relative ${
                  postForm.post_type === 'novel' 
                    ? 'overflow-hidden' // Keep overflow-hidden for background pattern
                    : 'overflow-hidden'
                } ${
                  postForm.post_type === 'novel' 
                    ? (mobileView === 'media' ? 'block min-h-[60vh]' : 'hidden')
                    : (mobileView === 'media' ? 'block min-h-[60vh]' : 'hidden lg:flex')
                }`}
              >
                {/* Animated Background Pattern */}
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute top-0 left-0 w-72 h-72 bg-primary rounded-full blur-3xl animate-pulse"></div>
                  <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                </div>

                {/* Media/Chapter Badge - Hidden on mobile */}
                {postForm.post_type !== 'novel' && (
                <div className="absolute top-4 left-4 z-10 hidden lg:block">
                  <div className="badge badge-primary badge-lg gap-2 shadow-lg hover:scale-105 transition-transform">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                        <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
                      </svg>
                      Media Preview
                  </div>
                </div>
                )}

                <div className={`w-full ${postForm.post_type === 'novel' ? 'flex flex-col min-h-0' : 'h-full'} relative z-10`}>
                  {postForm.post_type === 'novel' ? (
                    <div className="w-full flex flex-col pt-4 px-4 pb-4 min-h-0">
                      <AddChapterRenderer postForm={postForm} setPostForm={setPostForm} />
                    </div>
                  ) : (
                    <AddMediaRenderer postForm={postForm} setPostForm={setPostForm} editing={editing || false} />
                  )}
                </div>
              </div>
            )}

            {/* Right Side - Enhanced Details Panel */}
            {/* Expand to full width when editing image/video posts (no media section) */}
            <div
              className={`${
                postForm.post_type === 'default' || (editing && (postForm.post_type === 'image' || postForm.post_type === 'video'))
                  ? 'w-full'
                  : postForm.post_type === 'novel'
                  ? 'w-full'
                  : 'lg:w-2/5'
              } flex flex-col overflow-y-auto max-h-[85vh] bg-base-100 ${
                postForm.post_type === 'default' || (editing && (postForm.post_type === 'image' || postForm.post_type === 'video'))
                  ? 'block'
                  : postForm.post_type === 'novel'
                  ? (mobileView === 'details' ? 'block' : 'hidden')
                  : (mobileView === 'details' ? 'block' : 'hidden lg:flex')
              }`}
            >
              {/* Post Type Selection with Enhanced Design */}
              {!editing && (
                <div className="p-6 border-b border-base-300 bg-gradient-to-br from-base-100 to-base-200">
                  <label className="text-sm font-bold text-base-content mb-3 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                    </div>
                    Post Type
                  </label>
                  <select
                    className="select select-bordered w-full bg-base-200 hover:bg-base-300 focus:ring-2 focus:ring-primary transition-all duration-200 font-medium"
                    name="post_type"
                    value={postForm.post_type}
                    onChange={(e) => handlePostFormChange('post_type', e.target.value)}
                    required
                  >
                    <option value="default">📌 Default Post</option>
                    <option value="image">🖼️ Image Gallery</option>
                    <option value="video">🎥 Video Content</option>
                    <option value="novel">📚 Novel Chapter</option>
                  </select>
                </div>
              )}

              {/* Enhanced Description Area with User Profile */}
              <div className="p-6 flex-1 bg-base-100">
                <div className="flex items-start gap-4">
                  {/* Enhanced User Avatar */}
                  <div className="avatar">
                    <div className="w-12 h-12 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2 hover:ring-secondary transition-all duration-300 shadow-lg">
                      {user?.profile_picture ? (
                        <img src={user.profile_picture} alt={user.username} className="object-cover" />
                      ) : (
                        <div className="bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center text-primary-content font-bold text-lg">
                          {user?.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base">{user?.username || 'User'}</span>
                        <span className="badge badge-sm badge-primary">@{user?.username || 'user'}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const undoneValue = undoRedo.undo();
                            setLocalDescription(undoneValue);
                            setPostForm((prev) => ({ ...prev, description: undoneValue }));
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
                            const redoneValue = undoRedo.redo();
                            setLocalDescription(redoneValue);
                            setPostForm((prev) => ({ ...prev, description: redoneValue }));
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
                      </div>
                    </div>
                    
                    {/* Markdown Toolbar */}
                    <MarkdownToolbar 
                      textareaRef={textareaRef} 
                      isVisible={showMarkdownToolbar}
                      onFormat={(newValue) => {
                        undoRedo.setValue(newValue, true);
                        setLocalDescription(newValue);
                        setPostForm((prev) => ({ ...prev, description: newValue }));
                      }}
                    />
                    
                    {showPreview ? (
                      <div className="w-full bg-base-200 border border-base-300 rounded-lg p-4 min-h-[200px] max-h-[400px] overflow-y-auto">
                        {(() => {
                          // Always read the current textarea value to ensure we have the latest
                          const currentText = textareaRef.current?.value || localDescription;
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
                        className="w-full bg-transparent border-0 focus:outline-none resize-none text-base placeholder:text-base-content/50 leading-relaxed min-h-[200px]"
                        name="description"
                        value={localDescription}
                        onChange={handleTextareaChange}
                        onBlur={handleTextareaBlur}
                        onKeyDown={(e) => {
                          // Handle Ctrl+Z (Undo) and Ctrl+Y or Ctrl+Shift+Z (Redo)
                          if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                            e.preventDefault();
                            const undoneValue = undoRedo.undo();
                            setLocalDescription(undoneValue);
                            setPostForm((prev) => ({ ...prev, description: undoneValue }));
                          } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                            e.preventDefault();
                            const redoneValue = undoRedo.redo();
                            setLocalDescription(redoneValue);
                            setPostForm((prev) => ({ ...prev, description: redoneValue }));
                          }
                        }}
                        placeholder="Share your thoughts, describe your artwork, tell your story..."
                        rows={10}
                        maxLength={2200}
                      />
                    )}

                    {/* Enhanced Footer with Icons and Character Count */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-base-300">
                      <div className="flex gap-1">
                        <button type="button" className="btn btn-ghost btn-sm btn-circle hover:bg-primary/10 hover:text-primary transition-all" title="Add emoji">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm btn-circle hover:bg-secondary/10 hover:text-secondary transition-all" title="Add hashtag">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                          </svg>
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm btn-circle hover:bg-accent/10 hover:text-accent transition-all" title="Add mention">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                          </svg>
                        </button>
                        <button 
                          type="button" 
                          className={`btn btn-ghost btn-sm btn-circle transition-all ${
                            showMarkdownToolbar 
                              ? 'bg-primary/20 text-primary' 
                              : 'hover:bg-primary/10 hover:text-primary'
                          }`}
                          title="Markdown formatting"
                          onClick={() => setShowMarkdownToolbar(!showMarkdownToolbar)}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`text-sm font-semibold transition-colors ${
                            (localDescription.length || 0) > 2000
                              ? 'text-warning'
                              : (localDescription.length || 0) > 1800
                              ? 'text-info'
                              : 'text-base-content/60'
                          }`}
                        >
                          {localDescription.length || 0}
                        </div>
                        <div className="text-xs text-base-content/40">/2,200</div>
                        {(localDescription.length || 0) > 1800 && (
                          <div
                            className={`radial-progress text-xs ${(localDescription.length || 0) > 2000 ? 'text-warning' : 'text-info'}`}
                            style={
                              {
                                '--value': ((localDescription.length || 0) / 2200) * 100,
                                '--size': '2rem',
                                '--thickness': '3px',
                              } as React.CSSProperties
                            }
                          ></div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Additional Options */}
              <div className="border-t border-base-300 bg-base-50">
                {/* Accessibility Option */}
                <div className="p-5 hover:bg-base-200/50 transition-all duration-200 cursor-pointer group border-b border-base-300/50">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all duration-200 group-hover:scale-110">
                        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </div>
                      <div>
                        <span className="text-sm font-bold block">Accessibility</span>
                        <p className="text-xs text-base-content/60">Add alt text for images</p>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-base-content/40 group-hover:text-primary group-hover:translate-x-1 transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>

                {/* Advanced Settings Option */}
                <div className="p-5 hover:bg-base-200/50 transition-all duration-200 cursor-pointer group">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-all duration-200 group-hover:scale-110">
                        <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                      </div>
                      <div>
                        <span className="text-sm font-bold block">Advanced Settings</span>
                        <p className="text-xs text-base-content/60">Privacy & visibility options</p>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-base-content/40 group-hover:text-secondary group-hover:translate-x-1 transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
