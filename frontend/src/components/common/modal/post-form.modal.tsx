import { usePostContext } from "@context/post-context";
import { AddChapterRenderer, AddMediaRenderer } from '@components/common'

export default function PostFormModal({channel_id} : {channel_id?: string}) {
  const { editing, handlePostSubmit, postForm, handlePostFormChange, setPostForm, resetForms} = usePostContext()

  return (
    <>
      <div className="modal modal-open">
        <div className="modal-box max-w-4xl">
          <h2 className="text-2xl font-bold mb-4">
            {editing ? "Edit Post" : "Create Post"}
          </h2>
          <form onSubmit={(e) => handlePostSubmit(e, channel_id)}>
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Description</span>
              </label>
              <textarea
                className="textarea textarea-bordered h-24"
                name="description"
                value={postForm.description}
                onChange={handlePostFormChange}
              />
            </div>

            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Post Type</span>
              </label>
              <select
                className="select select-bordered"
                name="post_type"
                value={postForm.post_type}
                onChange={handlePostFormChange}
                required
              >
                <option value="default">Default</option>
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="novel">Novel</option>
              </select>
            </div>

            <AddMediaRenderer
              postForm={postForm}
              setPostForm={setPostForm}
              editing={editing}
            />

            {postForm.post_type === "novel" && (
              <AddChapterRenderer
                postForm={postForm}
                setPostForm={setPostForm}
              />
            )}

            <div className="modal-action">
              <button type="submit" className="btn btn-primary">
                {editing ? "Update" : "Create"}
              </button>
              <button type="button" className="btn" onClick={() => resetForms(channel_id)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
