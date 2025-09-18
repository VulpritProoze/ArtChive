import React from 'react'
import type { PostForm } from '@types';

type AddMediaRendererType = {
    postForm: PostForm,
    setPostForm,
    editing: boolean
}

const AddMediaRenderer: React.FC<AddMediaRendererType> = ({ postForm, setPostForm, editing }) => {
    const handlePostFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, files } = e.target;
        if (files?.[0]) setPostForm(prev => ({ ...prev, [name]: files[0] }));
      };

  return (
    <>
      {postForm.post_type === "image" && (
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">Image</span>
          </label>
          <input
            type="file"
            className="file-input file-input-bordered"
            name="image_url"
            onChange={handlePostFileChange}
            accept="image/*"
            required={!editing}
          />
        </div>
      )}

      {postForm.post_type === "video" && (
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">Video</span>
          </label>
          <input
            type="file"
            className="file-input file-input-bordered"
            name="video_url"
            onChange={handlePostFileChange}
            accept="video/*"
            required={!editing}
          />
        </div>
      )}
    </>
  );
};

export default AddMediaRenderer;
