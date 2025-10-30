import { usePostContext } from "@context/post-context";
import { AddChapterRenderer, AddMediaRenderer } from '@components/common'
import { useAuth } from "@context/auth-context";

export default function PostFormModal({channel_id, user_id} : {channel_id?: string, user_id?: number}) {
  const { editing, handlePostSubmit, postForm, handlePostFormChange, setPostForm, resetForms, submittingPost} = usePostContext()
  const { user } = useAuth();

  return (
    <>
      {/* Enhanced Backdrop with Animation */}
      <div className="modal modal-open animate-fade-in">
        <div 
          className="fixed inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/70 backdrop-blur-lg transition-all duration-300" 
          onClick={() => resetForms(channel_id)}
        ></div>
        
        {/* Enhanced Modal Content with Scale Animation */}
        <div className="modal-box max-w-6xl p-0 overflow-hidden relative bg-base-100 rounded-3xl shadow-2xl animate-scale-in border border-base-300/50">
          
          {/* Modern Top Bar with Gradient */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-base-300 bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 backdrop-blur-sm sticky top-0 z-10">
            <button 
              type="button"
              onClick={() => resetForms(channel_id)}
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
                {editing ? "✏️ Edit Post" : "✨ Create New Post"}
              </h2>
            </div>
            
            <button
              type="submit"
              form="post-form"
              disabled={submittingPost}
              className="btn btn-primary btn-sm gap-2 hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submittingPost ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  {editing ? "Updating..." : "Posting..."}
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

          {/* Main Content Area */}
          <form id="post-form" onSubmit={(e) => handlePostSubmit(e, channel_id, user_id)} className="flex flex-col lg:flex-row max-h-[85vh]">
            
            {/* Left Side - Enhanced Media Preview with Gradient Background */}
            <div className="lg:w-3/5 bg-gradient-to-br from-base-200 via-base-300 to-base-200 flex items-center justify-center p-8 lg:min-h-[550px] relative overflow-hidden">
              {/* Animated Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-0 left-0 w-72 h-72 bg-primary rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
              </div>

              {/* Media Badge */}
              <div className="absolute top-4 left-4 z-10">
                <div className="badge badge-primary badge-lg gap-2 shadow-lg hover:scale-105 transition-transform">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                    <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  Media Preview
                </div>
              </div>
              
              <div className="w-full relative z-10">
                <AddMediaRenderer
                  postForm={postForm}
                  setPostForm={setPostForm}
                  editing={editing}
                />
              </div>
            </div>

            {/* Right Side - Enhanced Details Panel */}
            <div className="lg:w-2/5 flex flex-col overflow-y-auto max-h-[85vh] bg-base-100">
              
              {/* Post Type Selection with Enhanced Design */}
              {!editing && (
                <div className="p-6 border-b border-base-300 bg-gradient-to-br from-base-100 to-base-200">
                  <label className="block text-sm font-bold text-base-content mb-3 flex items-center gap-2">
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
                    onChange={handlePostFormChange}
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
                          {user?.username?.[0]?.toUpperCase() || "U"}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="font-bold text-base">{user?.fullname || user?.username || "User"}</span>
                      <span className="badge badge-sm badge-primary">@{user?.username || "user"}</span>
                    </div>
                    <textarea
                      className="w-full bg-transparent border-0 focus:outline-none resize-none text-base placeholder:text-base-content/50 leading-relaxed min-h-[200px]"
                      name="description"
                      value={postForm.description}
                      onChange={handlePostFormChange}
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
                          {postForm.description?.length || 0}
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

              {/* Enhanced Chapter Section for Novels */}
              {postForm.post_type === "novel" && (
                <div className="p-6 border-t border-base-300 bg-gradient-to-br from-base-50 to-base-100">
                  <div className="collapse collapse-arrow bg-gradient-to-br from-base-200 to-base-300 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 border border-base-300">
                    <input type="checkbox" /> 
                    <div className="collapse-title font-bold flex items-center gap-3 text-base">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <span>Add Chapters</span>
                      <span className="badge badge-primary badge-sm">Optional</span>
                    </div>
                    <div className="collapse-content">
                      <AddChapterRenderer
                        postForm={postForm}
                        setPostForm={setPostForm}
                      />
                    </div>
                  </div>
                </div>
              )}

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

      {/* Add these custom animations to your global CSS or Tailwind config */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
}