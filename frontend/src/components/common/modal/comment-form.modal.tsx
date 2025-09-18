import { usePostContext } from "@context/post-context";
import usePostComment from "@hooks/use-post-comment";

export default function CommentFormModal() {
  const { handleCommentSubmit, commentForm, editing, resetForms } = usePostContext()
  const { handleCommentFormChange} = usePostComment()

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h2 className="text-2xl font-bold mb-4">
          {editing ? "Edit Comment" : "Create Comment"}
        </h2>
        <form onSubmit={handleCommentSubmit}>
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Comment Text</span>
            </label>
            <textarea
              className="textarea textarea-bordered h-24"
              name="text"
              value={commentForm.text}
              onChange={handleCommentFormChange}
              required
            />
          </div>

          {!editing && (
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Post ID</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                name="post_id"
                value={commentForm.post_id}
                onChange={handleCommentFormChange}
                placeholder="Enter post ID to comment on"
                required
              />
            </div>
          )}

          <div className="modal-action">
            <button type="submit" className="btn btn-primary">
              {editing ? "Update" : "Create"}
            </button>
            <button type="button" className="btn" onClick={resetForms}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
