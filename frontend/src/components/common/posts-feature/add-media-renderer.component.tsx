import React, { useState, useEffect } from 'react'
import type { PostForm } from '@types';

type AddMediaRendererType = {
    postForm: PostForm,
    setPostForm,
    editing: boolean
}

const AddMediaRenderer: React.FC<AddMediaRendererType> = ({ postForm, setPostForm, editing }) => {
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [videoPreview, setVideoPreview] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handlePostFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, files } = e.target;
        if (files?.[0]) {
          setPostForm(prev => ({ ...prev, [name]: files[0] }));

          // Create preview
          const file = files[0];
          const reader = new FileReader();
          reader.onloadend = () => {
            if (name === 'image_url') {
              setImagePreview(reader.result as string);
            } else if (name === 'video_url') {
              setVideoPreview(reader.result as string);
            }
          };
          reader.readAsDataURL(file);
        }
      };

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent, fieldName: string) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files?.[0]) {
        setPostForm(prev => ({ ...prev, [fieldName]: files[0] }));

        const file = files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
          if (fieldName === 'image_url') {
            setImagePreview(reader.result as string);
          } else if (fieldName === 'video_url') {
            setVideoPreview(reader.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    };

    const removeMedia = (type: 'image' | 'video') => {
      if (type === 'image') {
        setPostForm(prev => ({ ...prev, image_url: null }));
        setImagePreview(null);
      } else {
        setPostForm(prev => ({ ...prev, video_url: null }));
        setVideoPreview(null);
      }
    };

    // Load existing media preview when editing
    useEffect(() => {
      if (editing && postForm.image_url && typeof postForm.image_url === 'string') {
        setImagePreview(postForm.image_url);
      }
      if (editing && postForm.video_url && typeof postForm.video_url === 'string') {
        setVideoPreview(postForm.video_url);
      }
    }, [editing, postForm.image_url, postForm.video_url]);

  return (
    <>
      {postForm.post_type === "image" && (
        <div className="w-full h-full flex items-center justify-center p-0 lg:p-8">
          {imagePreview ? (
            <div className="relative w-full h-full min-h-[400px] lg:min-h-[400px] group">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-full max-h-[70vh] lg:max-h-[550px] object-contain lg:rounded-2xl shadow-2xl"
              />
              {/* Mobile: Always visible buttons at bottom */}
              <div className="lg:hidden absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                <label className="btn btn-primary btn-sm gap-2 shadow-lg">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Change
                  <input
                    type="file"
                    className="hidden"
                    name="image_url"
                    onChange={handlePostFileChange}
                    accept="image/*"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeMedia('image')}
                  className="btn btn-error btn-sm gap-2 shadow-lg"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Remove
                </button>
              </div>
              {/* Desktop: Hover overlay */}
              <div className="hidden lg:flex absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-2xl items-center justify-center gap-4">
                <label className="btn btn-primary gap-2 shadow-lg hover:scale-105 transition-transform">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Change Image
                  <input
                    type="file"
                    className="hidden"
                    name="image_url"
                    onChange={handlePostFileChange}
                    accept="image/*"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeMedia('image')}
                  className="btn btn-error gap-2 shadow-lg hover:scale-105 transition-transform"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <label
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'image_url')}
              className={`w-full h-full min-h-[50vh] lg:min-h-[400px] border-4 border-dashed rounded-none lg:rounded-3xl flex flex-col items-center justify-center gap-4 lg:gap-6 cursor-pointer transition-all duration-300 hover:scale-[1.02] p-6 ${
                isDragging
                  ? 'border-primary bg-primary/10 scale-[1.02]'
                  : 'border-base-content/20 hover:border-primary/50 hover:bg-base-300/50'
              }`}
            >
              <div className="w-16 h-16 lg:w-24 lg:h-24 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                <svg className="w-8 h-8 lg:w-12 lg:h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-center px-4 lg:px-6">
                <p className="text-lg lg:text-xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Upload Your Image
                </p>
                <p className="text-xs lg:text-sm text-base-content/60 mb-3 lg:mb-4">
                  <span className="hidden lg:inline">Drag and drop your image here, or </span>
                  <span className="lg:hidden">Tap to </span>
                  <span className="hidden lg:inline">click to </span>browse
                </p>
                <div className="badge badge-primary badge-md lg:badge-lg gap-2 shadow-lg">
                  <svg className="w-3 h-3 lg:w-4 lg:h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs lg:text-sm">JPG, PNG, GIF, WEBP</span>
                </div>
              </div>
              <input
                type="file"
                className="hidden"
                name="image_url"
                onChange={handlePostFileChange}
                accept="image/*"
                required={!editing}
              />
            </label>
          )}
        </div>
      )}

      {postForm.post_type === "video" && (
        <div className="w-full h-full flex items-center justify-center p-0 lg:p-8">
          {videoPreview ? (
            <div className="relative w-full h-full min-h-[400px] lg:min-h-[400px] group">
              <video
                src={videoPreview}
                controls
                className="w-full h-full max-h-[70vh] lg:max-h-[550px] object-contain lg:rounded-2xl shadow-2xl"
              />
              {/* Mobile: Always visible buttons at bottom */}
              <div className="lg:hidden absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                <label className="btn btn-primary btn-sm gap-2 shadow-lg">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Change
                  <input
                    type="file"
                    className="hidden"
                    name="video_url"
                    onChange={handlePostFileChange}
                    accept="video/*"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeMedia('video')}
                  className="btn btn-error btn-sm gap-2 shadow-lg"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Remove
                </button>
              </div>
              {/* Desktop: Hover buttons at top-right */}
              <div className="hidden lg:flex absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 gap-2">
                <label className="btn btn-primary btn-sm gap-2 shadow-lg hover:scale-105 transition-transform">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Change
                  <input
                    type="file"
                    className="hidden"
                    name="video_url"
                    onChange={handlePostFileChange}
                    accept="video/*"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeMedia('video')}
                  className="btn btn-error btn-sm gap-2 shadow-lg hover:scale-105 transition-transform"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <label
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'video_url')}
              className={`w-full h-full min-h-[50vh] lg:min-h-[400px] border-4 border-dashed rounded-none lg:rounded-3xl flex flex-col items-center justify-center gap-4 lg:gap-6 cursor-pointer transition-all duration-300 hover:scale-[1.02] p-6 ${
                isDragging
                  ? 'border-secondary bg-secondary/10 scale-[1.02]'
                  : 'border-base-content/20 hover:border-secondary/50 hover:bg-base-300/50'
              }`}
            >
              <div className="w-16 h-16 lg:w-24 lg:h-24 rounded-full bg-gradient-to-br from-secondary/20 to-accent/20 flex items-center justify-center">
                <svg className="w-8 h-8 lg:w-12 lg:h-12 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-center px-4 lg:px-6">
                <p className="text-lg lg:text-xl font-bold mb-2 bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
                  Upload Your Video
                </p>
                <p className="text-xs lg:text-sm text-base-content/60 mb-3 lg:mb-4">
                  <span className="hidden lg:inline">Drag and drop your video here, or </span>
                  <span className="lg:hidden">Tap to </span>
                  <span className="hidden lg:inline">click to </span>browse
                </p>
                <div className="badge badge-secondary badge-md lg:badge-lg gap-2 shadow-lg">
                  <svg className="w-3 h-3 lg:w-4 lg:h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs lg:text-sm">MP4, WEBM, OGG</span>
                </div>
              </div>
              <input
                type="file"
                className="hidden"
                name="video_url"
                onChange={handlePostFileChange}
                accept="video/*"
                required={!editing}
              />
            </label>
          )}
        </div>
      )}
    </>
  );
};

export default AddMediaRenderer;
