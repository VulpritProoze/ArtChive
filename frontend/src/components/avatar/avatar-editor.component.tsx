import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MainLayout } from '@components/common/layout';
import { useAvatar, useCreateAvatar, useUpdateAvatar } from '@hooks/queries/use-avatar';
import { CreateAvatarData, UpdateAvatarData } from '@services/avatar.service';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import AvatarRenderer from './avatar-renderer.component';
import AvatarCustomizer from './avatar-customizer.component';
import { AvatarOptions, defaultAvatarOptions, skinTones, hairColors, clothingStyles } from './avatar-options';

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

  // Avatar customization options
  const [avatarOptions, setAvatarOptions] = useState<AvatarOptions>(defaultAvatarOptions);

  // Canvas data (for backward compatibility with API)
  const [canvasData, setCanvasData] = useState({
    width: 512,
    height: 512,
    background: avatarOptions.background,
    objects: [] as any[],
    avatarOptions: avatarOptions, // Store avatar options in canvas JSON
  });

  // Load avatar data if editing
  useEffect(() => {
    if (avatar) {
      setName(avatar.name);
      setDescription(avatar.description || '');
      setStatus(avatar.status);
      if (avatar.canvas_json) {
        setCanvasData(avatar.canvas_json);
        // Load avatar options if they exist
        if ((avatar.canvas_json as any).avatarOptions) {
          setAvatarOptions((avatar.canvas_json as any).avatarOptions);
        }
      }
    }
  }, [avatar]);

  // Update canvas data when avatar options change
  useEffect(() => {
    setCanvasData(prev => ({
      ...prev,
      background: avatarOptions.background,
      avatarOptions: avatarOptions,
    }));
  }, [avatarOptions]);

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

  const handleRandomize = () => {
    const randomSkin = Object.keys(skinTones)[Math.floor(Math.random() * 6)];
    const randomFace = ['oval', 'round', 'square'][Math.floor(Math.random() * 3)];
    const randomEyes = ['normal', 'wide', 'narrow'][Math.floor(Math.random() * 3)];
    const randomEyebrows = ['normal', 'thick', 'thin'][Math.floor(Math.random() * 3)];
    const randomNose = ['normal', 'small', 'large'][Math.floor(Math.random() * 3)];
    const randomMouth = ['smile', 'neutral', 'grin', 'laugh', 'serious'][Math.floor(Math.random() * 5)];
    const randomHair = ['short', 'medium', 'long', 'curly', 'spiky', 'buzz', 'wavy', 'none'][Math.floor(Math.random() * 8)];
    const randomHairColor = Object.keys(hairColors)[Math.floor(Math.random() * 8)];
    const randomFacialHair = ['none', 'stubble', 'mustache', 'beard', 'goatee', 'full'][Math.floor(Math.random() * 6)];
    const randomAccessories = ['none', 'glasses', 'sunglasses', 'hat', 'cap', 'headband', 'earrings'][Math.floor(Math.random() * 7)];
    const randomClothing = Object.keys(clothingStyles)[Math.floor(Math.random() * 5)];
    
    setAvatarOptions({
      ...avatarOptions,
      skin: randomSkin,
      faceShape: randomFace,
      eyes: randomEyes,
      eyebrows: randomEyebrows,
      nose: randomNose,
      mouth: randomMouth,
      hair: randomHair,
      hairColor: randomHairColor,
      facialHair: randomFacialHair,
      accessories: randomAccessories,
      clothing: randomClothing,
    });
  };

  const handleReset = () => {
    setAvatarOptions(defaultAvatarOptions);
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
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Simple Header */}
        <div className="bg-base-200 rounded-xl p-6 mb-6 border border-base-300">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handleCancel}
                className="btn btn-ghost btn-sm"
              >
                <FontAwesomeIcon icon={faArrowLeft} />
                Back
              </button>
              <div>
                <h1 className="text-3xl font-bold">
                  {isEditMode ? 'Edit Avatar' : 'Create Avatar'}
                </h1>
                <p className="text-base-content/60 mt-1">
                  Customize your avatar
                </p>
              </div>
            </div>
            <button
              onClick={handleSave}
              className="btn btn-primary gap-2"
              disabled={isCreating || isUpdating}
            >
              {(isCreating || isUpdating) ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faSave} />
                  <span>Save Avatar</span>
                </>
              )}
            </button>
          </div>
        </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           {/* Avatar Preview */}
           <div>
             <div className="sticky top-6">
               <div className="bg-base-200 rounded-xl border border-base-300 p-6">
                 <h2 className="text-xl font-bold mb-4">Preview</h2>
                   
                 {/* Preview Container */}
                 <div className="bg-base-100 rounded-lg p-6 flex items-center justify-center border border-base-300">
                   <AvatarRenderer 
                     options={avatarOptions}
                     size={Math.min(400, typeof window !== 'undefined' ? window.innerWidth - 100 : 400)}
                     className="rounded-lg"
                   />
                 </div>

                 {/* Avatar Details */}
                 <div className="mt-6 space-y-4">
                   <div className="form-control">
                     <label className="label">
                       <span className="label-text font-medium">Name *</span>
                       <span className="label-text-alt">{name.length}/255</span>
                     </label>
                     <input
                       type="text"
                       placeholder="My Avatar"
                       className="input input-bordered w-full"
                       value={name}
                       onChange={(e) => setName(e.target.value)}
                       maxLength={255}
                     />
                   </div>

                   <div className="form-control">
                     <label className="label">
                       <span className="label-text font-medium">Description</span>
                       <span className="label-text-alt">{description.length}/1000</span>
                     </label>
                     <textarea
                       className="textarea textarea-bordered h-20"
                       placeholder="Describe your avatar..."
                       value={description}
                       onChange={(e) => setDescription(e.target.value)}
                       maxLength={1000}
                     ></textarea>
                   </div>

                   <div className="form-control">
                     <label className="label">
                       <span className="label-text font-medium">Status</span>
                     </label>
                     <select
                       className="select select-bordered w-full"
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
             </div>
           </div>

           {/* Customization Panel */}
           <div className="bg-base-200 rounded-xl border border-base-300">
             <div className="h-[calc(100vh-180px)]">
               <AvatarCustomizer
                 options={avatarOptions}
                 onChange={setAvatarOptions}
                 onRandomize={handleRandomize}
                 onReset={handleReset}
               />
             </div>
           </div>
         </div>

      </div>
    </MainLayout>
  );
};

export default AvatarEditorPage;

