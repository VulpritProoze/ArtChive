import { usePostContext } from "@context/post-context";
import { AddChapterRenderer, AddMediaRenderer } from '@components/common'
import { useAuth } from "@context/auth-context";

export default function PostFormModal({channel_id, user_id} : {channel_id?: string, user_id?: number}) {
  const { editing, handlePostSubmit, postForm, handlePostFormChange, setPostForm, resetForms, submittingPost} = usePostContext()
  const { user } = useAuth();

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

          {/* Main Content Area */}
          <form id="post-form" onSubmit={(e) => handlePostSubmit(e, channel_id, user_id)} className="flex flex-col max-h-[80vh]">
            
            {/* Content Area */}
            <div className="flex flex-col overflow-y-auto">
              
              {/* Post Type Selection */}
              {!editing && (
                <div className="p-6 border-b border-base-300">
                  <label className="block text-sm font-medium mb-2">
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

              {/* Description Area */}
              <div className="p-6">
                <textarea
                  className="w-full bg-transparent border-0 focus:outline-none resize-none text-base placeholder:text-base-content/50 min-h-[150px]"
                  name="description"
                  value={postForm.description}
                  onChange={handlePostFormChange}
                  placeholder="What's on your mind?"
                  rows={6}
                  maxLength={2200}
                />
                
                {/* Character Count */}
                <div className="flex items-center justify-end mt-2 text-sm text-base-content/60">
                  {postForm.description?.length || 0} / 2,200
                </div>
              </div>

              {/* Media Preview */}
              {(postForm.post_type === "image" || postForm.post_type === "video") && (
                <div className="px-6 pb-6">
                  <AddMediaRenderer
                    postForm={postForm}
                    setPostForm={setPostForm}
                    editing={editing}
                  />
                </div>
              )}

              {/* Chapter Section for Novels */}
              {postForm.post_type === "novel" && (
                <div className="px-6 pb-6">
                  <div className="collapse collapse-arrow bg-base-200 rounded-lg">
                    <input type="checkbox" /> 
                    <div className="collapse-title font-medium">
                      Add Chapters
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

              {/* Additional Options */}
              <div className="border-t border-base-300">
                
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
