import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MainLayout } from '@components/common/layout';
import { useAvatar, useCreateAvatar, useUpdateAvatar } from '@hooks/queries/use-avatar';
import { CreateAvatarData, UpdateAvatarData } from '@services/avatar.service';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faArrowLeft } from '@fortawesome/free-solid-svg-icons';

const AvatarEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const { avatarId } = useParams<{ avatarId: string }>();
  const isEditMode = !!avatarId;

  // Fetch existing avatar if editing
  const { data: avatar, isLoading } = useAvatar(avatarId || '', isEditMode);
  
  // Mutations
  const { mutate: createAvatar, isPending: isCreating } = useCreateAvatar();
  const { mutate: updateAvatar, isPending: isUpdating } = useUpdateAvatar();

  // Form state
  const [name, setName] = useState('My Avatar');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'draft' | 'active' | 'archived'>('draft');

  // Canvas state (simplified)
  const [canvasData, setCanvasData] = useState({
    width: 512,
    height: 512,
    background: '#ffffff',
    objects: [] as any[],
  });

  // Load avatar data if editing
  useEffect(() => {
    if (avatar) {
      setName(avatar.name);
      setDescription(avatar.description || '');
      setStatus(avatar.status);
      if (avatar.canvas_json) {
        setCanvasData(avatar.canvas_json);
      }
    }
  }, [avatar]);

  const handleSave = () => {
    if (!name.trim()) {
      alert('Please enter a name for your avatar');
      return;
    }

    if (isEditMode && avatarId) {
      const updateData: UpdateAvatarData = {
        name,
        description,
        canvas_json: canvasData,
        status,
      };
      updateAvatar(
        { avatarId, data: updateData },
        {
          onSuccess: () => {
            navigate('/avatar');
          },
        }
      );
    } else {
      const createData: CreateAvatarData = {
        name,
        description,
        canvas_json: canvasData,
        status,
      };
      createAvatar(createData, {
        onSuccess: () => {
          navigate('/avatar');
        },
      });
    }
  };

  const handleCancel = () => {
    navigate('/avatar');
  };

  if (isEditMode && isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-screen">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={handleCancel}
              className="btn btn-ghost btn-circle"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
            </button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                {isEditMode ? 'Edit Avatar' : 'Create New Avatar'}
              </h1>
              <p className="text-base-content/60 mt-1">
                Design your custom avatar
              </p>
            </div>
          </div>
          <button
            onClick={handleSave}
            className="btn btn-primary gap-2"
            disabled={isCreating || isUpdating}
          >
            {(isCreating || isUpdating) ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <FontAwesomeIcon icon={faSave} />
            )}
            Save Avatar
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Canvas Area */}
          <div className="lg:col-span-2">
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">Canvas Editor</h2>
                <div className="bg-base-300 rounded-lg p-4 flex items-center justify-center min-h-[512px]">
                  {/* Simplified Canvas Preview */}
                  <div
                    className="bg-white rounded-lg shadow-inner"
                    style={{
                      width: '512px',
                      height: '512px',
                      backgroundColor: canvasData.background,
                      position: 'relative',
                    }}
                  >
                    <div className="flex items-center justify-center h-full text-base-content/30">
                      <div className="text-center">
                        <div className="text-8xl mb-4">🎨</div>
                        <p className="text-xl font-semibold">Canvas Editor</p>
                        <p className="text-sm mt-2">512 x 512 pixels</p>
                        <p className="text-xs mt-4 max-w-xs">
                          Note: Full canvas editor coming soon. For now, you can save avatar metadata.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Properties Panel */}
          <div className="space-y-6">
            {/* Avatar Details */}
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-lg">Avatar Details</h2>
                
                {/* Name */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Name *</span>
                  </label>
                  <input
                    type="text"
                    placeholder="My Avatar"
                    className="input input-bordered"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={255}
                  />
                </div>

                {/* Description */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Description</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered h-24"
                    placeholder="Optional description..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={1000}
                  ></textarea>
                </div>

                {/* Status */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Status</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'draft' | 'active' | 'archived')}
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Canvas Tools (Placeholder) */}
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-lg">Tools</h2>
                <div className="grid grid-cols-2 gap-2">
                  <button className="btn btn-sm btn-outline" disabled>
                    Rectangle
                  </button>
                  <button className="btn btn-sm btn-outline" disabled>
                    Circle
                  </button>
                  <button className="btn btn-sm btn-outline" disabled>
                    Text
                  </button>
                  <button className="btn btn-sm btn-outline" disabled>
                    Image
                  </button>
                </div>
                <p className="text-xs text-base-content/60 mt-2">
                  Canvas tools coming soon
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default AvatarEditorPage;

