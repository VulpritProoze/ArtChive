// channel-edit.modal.tsx
import { useCollectivePostContext } from "@context/collective-post-context";

export default function ChannelEditModal() {
  const {
    editingChannel,
    setEditingChannel,
    handleUpdateChannel,
    updatingChannel,
    deletingChannel,
  } = useCollectivePostContext();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleUpdateChannel({
      title: editingChannel.title,
      description: editingChannel.description || '',
    });
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-lg">
        <h3 className="font-bold text-lg mb-4">Edit Channel</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Title *</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              value={editingChannel.title}
              onChange={(e) =>
                setEditingChannel({
                  ...editingChannel,
                  title: e.target.value,
                })
              }
              required
              maxLength={100}
            />
          </div>

          <div className="form-control mb-6">
            <label className="label">
              <span className="label-text">Description</span>
            </label>
            <textarea
              className="textarea textarea-bordered"
              rows={3}
              value={editingChannel.description || ''}
              onChange={(e) =>
                setEditingChannel({
                  ...editingChannel,
                  description: e.target.value,
                })
              }
              maxLength={500}
            />
          </div>

          <div className="modal-action">
            <button
              type="button"
              className="btn"
              onClick={() => setEditingChannel(null)}
              disabled={updatingChannel || deletingChannel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!editingChannel.title.trim() || updatingChannel}
            >
              {updatingChannel ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}