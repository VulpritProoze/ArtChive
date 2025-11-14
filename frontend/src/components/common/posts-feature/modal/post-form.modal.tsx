import { usePostContext } from "@context/post-context";
import { AddChapterRenderer, AddMediaRenderer } from '@components/common'
import { useAuth } from "@context/auth-context";
import React, { useEffect, useState } from 'react';

export default function PostFormModal({channel_id, user_id} : {channel_id?: string, user_id?: number}) {
  const { editing, handlePostSubmit, postForm, handlePostFormChange, setPostForm, resetForms, submittingPost} = usePostContext()
  const { user } = useAuth();
  const [mobileView, setMobileView] = React.useState<'media' | 'details'>('media');
  const [localDescription, setLocalDescription] = useState(postForm.description);

  useEffect(() => {
    setLocalDescription(postForm.description);
  }, [postForm.description]);
  
  const handleTextareaChange = (e) => {
    setLocalDescription(e.target.value);
  };
  
  const handleTextareaBlur = () => {
    setPostForm(prev => ({ ...prev, description: localDescription }));
  };

  return (
    <>
      {/* Backdrop */}
      <div className="modal modal-open">
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm" 
          onClick={() => resetForms(channel_id)}
        ></div>
        
        {/* Modal Content */}
        <div className="modal-box max-w-4xl p-0 overflow-hidden bg-base-100 rounded-xl shadow-xl">
          
          {/* Top Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-base-300">
            <button 
              type="button"
              onClick={() => resetForms(channel_id)}
              className="btn btn-ghost btn-sm btn-circle"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <h2 className="text-lg font-semibold">
              {editing ? "Edit Post" : "Create Post"}
            </h2>
            
            <button
              type="submit"
              form="post-form"
              disabled={submittingPost}
              className="btn btn-primary btn-sm"
            >
              {submittingPost ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  {editing ? "Updating..." : "Posting..."}
                </>
              ) : editing ? (
                "Update"
              ) : (
                "Post"
              )}
            </button>
          </div>

          {/* Mobile Tab Navigation - Only visible on small screens and when not default post */}
          {postForm.post_type !== 'default' && (
            <div className="lg:hidden border-b border-base-300 bg-base-100">
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
          <form id="post-form" onSubmit={(e) => handlePostSubmit(e, channel_id, user_id)} className="flex flex-col lg:flex-row max-h-[85vh]">

            {/* Left Side - Enhanced Media Preview / Chapters with Gradient Background */}
            {postForm.post_type !== 'default' && (
              <div className={`lg:w-3/5 bg-gradient-to-br from-base-200 via-base-300 to-base-200 flex items-center justify-center p-0 lg:p-8 lg:min-h-[550px] relative overflow-hidden ${
                mobileView === 'media' ? 'block min-h-[60vh]' : 'hidden lg:flex'
              }`}>
                {/* Animated Background Pattern */}
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute top-0 left-0 w-72 h-72 bg-primary rounded-full blur-3xl animate-pulse"></div>
                  <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
                </div>

                {/* Media/Chapter Badge - Hidden on mobile */}
                <div className="absolute top-4 left-4 z-10 hidden lg:block">
                  <div className="badge badge-primary badge-lg gap-2 shadow-lg hover:scale-105 transition-transform">
                    {postForm.post_type === 'novel' ? (
                      <>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                        </svg>
                        Chapters
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                          <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                        Media Preview
                      </>
                    )}
                  </div>
                </div>

                <div className="w-full h-full relative z-10">
                  {postForm.post_type === 'novel' ? (
                    <div className="w-full h-full p-4 lg:p-6 overflow-y-auto max-h-[60vh] lg:max-h-[550px]">
                      <AddChapterRenderer
                        postForm={postForm}
                        setPostForm={setPostForm}
                      />
                    </div>
                  ) : (
                    <AddMediaRenderer
                      postForm={postForm}
                      setPostForm={setPostForm}
                      editing={editing}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Right Side - Enhanced Details Panel */}
            <div className={`${postForm.post_type === 'default' ? 'w-full' : 'lg:w-2/5'} flex flex-col overflow-y-auto max-h-[85vh] bg-base-100 ${
              postForm.post_type === 'default' ? 'block' : mobileView === 'details' ? 'block' : 'hidden lg:flex'
            }`}>
              
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
                    className="select select-bordered w-full"
                    name="post_type"
                    value={postForm.post_type}
                    onChange={handlePostFormChange}
                    required
                  >
                    <option value="default">Default</option>
                    <option value="image">Photo</option>
                    <option value="video">Video</option>
                    <option value="novel">Novel</option>
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
                          {user?.username?.[0]?.toUpperCase() || "U"}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="font-bold text-base">{user?.username || "User"}</span>
                      <span className="badge badge-sm badge-primary">@{user?.username || "user"}</span>
                    </div>
                    <textarea
                      className="w-full bg-transparent border-0 focus:outline-none resize-none text-base placeholder:text-base-content/50 leading-relaxed min-h-[200px]"
                      name="description"
                      value={localDescription}
                      onChange={handleTextareaChange}
                      onBlur={handleTextareaBlur}
                      placeholder="Share your thoughts, describe your artwork, tell your story..."
                      rows={10}
                      maxLength={2200}
                    />
                    
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
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`text-sm font-semibold transition-colors ${
                          postForm.description?.length > 2000 
                            ? 'text-warning' 
                            : postForm.description?.length > 1800 
                            ? 'text-info' 
                            : 'text-base-content/60'
                        }`}>
                          {localDescription.length || 0}
                        </div>
                        <div className="text-xs text-base-content/40">/2,200</div>
                        {postForm.description?.length > 1800 && (
                          <div className={`radial-progress text-xs ${
                            postForm.description?.length > 2000 ? 'text-warning' : 'text-info'
                          }`} 
                          style={{"--value": (postForm.description?.length / 2200) * 100, "--size": "2rem", "--thickness": "3px"} as React.CSSProperties}>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Additional Options */}
              <div className="border-t border-base-300 bg-base-50">
                
                {/* Tags */}
                <div className="p-6 border-b border-base-300">
                  <label className="block text-sm font-medium mb-2">
                    Tags
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    placeholder="e.g. digital-art, painting, technique"
                    name="tags"
                  />
                  <p className="text-xs text-base-content/60 mt-1">
                    Add up to 5 tags to describe your post (press Enter)
                  </p>
                </div>

                {/* Category */}
                <div className="p-6 border-b border-base-300">
                  <label className="block text-sm font-medium mb-2">
                    Category
                  </label>
                  <select className="select select-bordered w-full">
                    <option>General</option>
                  </select>
                  <p className="text-xs text-base-content/60 mt-1">
                    Choose a category to organize your post
                  </p>
                </div>

                {/* Upload Featured Image */}
                <div className="p-6 border-b border-base-300">
                  <label className="block text-sm font-medium mb-2">
                    Upload Featured Image
                  </label>
                  <input type="file" className="file-input file-input-bordered w-full" />
                  <p className="text-xs text-base-content/60 mt-1">
                    Upload an image to represent your post (optional)
                  </p>
                </div>

                {/* Collaboration */}
                <div className="collapse collapse-arrow">
                  <input type="checkbox" /> 
                  <div className="collapse-title font-medium">
                    Collaboration
                  </div>
                  <div className="collapse-content">
                    <p className="text-sm text-base-content/70">Collaboration settings...</p>
                  </div>
                </div>

                {/* Advanced Settings */}
                <div className="collapse collapse-arrow">
                  <input type="checkbox" /> 
                  <div className="collapse-title font-medium">
                    Advanced Settings
                  </div>
                  <div className="collapse-content">
                    <p className="text-sm text-base-content/70">Privacy & visibility options...</p>
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="p-6 flex gap-3 border-t border-base-300">
                <button type="button" className="btn btn-outline flex-1">
                  Save Draft
                </button>
                <button type="button" className="btn btn-secondary flex-1">
                  Preview
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  Post
                </button>
              </div>
            </div>

          </form>
        </div>
      </div>
    </>
  );
}
