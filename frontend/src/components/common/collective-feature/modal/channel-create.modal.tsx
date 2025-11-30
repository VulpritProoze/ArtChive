import { useEffect } from "react";
import { useCollectivePostContext } from "@context/collective-post-context";
import { useParams } from "react-router-dom";
import { useCollectiveData } from "@hooks/queries/use-collective-data";

interface ChannelCreateModalProps {
  channel_type?: 'Post Channel' | 'Media Channel' | 'Event Channel';
}

export default function ChannelCreateModal({ channel_type }: ChannelCreateModalProps) {
  const { collectiveId } = useParams<{ collectiveId: string }>();
  const { data: collectiveData } = useCollectiveData(collectiveId);
  const {
    setShowCreateChannelModal,
    handleCreateChannel,
    createChannelForm,
    setCreateChannelForm,
    creatingChannel,
  } = useCollectivePostContext();

  // Set channel_type when modal opens or channel_type prop changes
  useEffect(() => {
    if (channel_type) {
      setCreateChannelForm({
        ...createChannelForm,
        channel_type,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel_type]);

  return (
    <>
      {/* Create Channel Modal */}
      <div className="modal modal-open">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Create New Channel</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (collectiveData) {
                handleCreateChannel(collectiveData.collective_id);
              }
            }}
          >
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Title *</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={createChannelForm.title}
                onChange={(e) =>
                    setCreateChannelForm({ ...createChannelForm, title: e.target.value })
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
                value={createChannelForm.description}
                onChange={(e) =>
                    setCreateChannelForm({ ...createChannelForm, description: e.target.value })
                }
                maxLength={500}
              />
            </div>

            <div className="modal-action">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setShowCreateChannelModal(false);
                  setCreateChannelForm({ title: "", description: "", collective: "", channel_type: undefined });
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!createChannelForm.title.trim() || creatingChannel}
              >
                {creatingChannel ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    Creating...
                  </>
                ) : (
                  "Create Channel"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
