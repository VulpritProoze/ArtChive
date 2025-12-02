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
    // Get random values from actual available options
    const skinOptions = Object.keys(skinTones);
    const faceShapeOptions = ['oval', 'round', 'square', 'heart', 'diamond'];
    const eyeOptions = ['default', 'large', 'almond', 'squint', 'wide'];
    const eyebrowOptions = ['default', 'thin', 'thick', 'arched', 'straight'];
    const noseOptions = ['default', 'small', 'large', 'pointed', 'wide'];
    const mouthOptions = ['smile', 'neutral', 'grin', 'laugh', 'serious'];
    const hairOptions = ['none', 'short', 'medium', 'long', 'curly', 'wavy', 'spiky', 'buzz'];
    const hairColorOptions = Object.keys(hairColors);
    const facialHairOptions = ['none', 'stubble', 'mustache', 'beard', 'goatee', 'full'];
    const accessoryOptions = ['none', 'glasses', 'sunglasses', 'hat', 'cap', 'headband', 'earrings'];
    const clothingOptions = Object.keys(clothingStyles);
    const backgroundColors = [
      '#F5F5F5', '#E3F2FD', '#FFF3E0', '#F3E5F5', '#E8F5E9',
      '#FCE4EC', '#E0F2F1', '#FFF9C4', '#FFE0B2', '#D7CCC8',
      '#CFD8DC', '#F8BBD0', '#C5CAE9', '#B2DFDB', '#DCEDC8',
    ];
    
    const randomSkin = skinOptions[Math.floor(Math.random() * skinOptions.length)];
    const randomFace = faceShapeOptions[Math.floor(Math.random() * faceShapeOptions.length)];
    const randomEyes = eyeOptions[Math.floor(Math.random() * eyeOptions.length)];
    const randomEyebrows = eyebrowOptions[Math.floor(Math.random() * eyebrowOptions.length)];
    const randomNose = noseOptions[Math.floor(Math.random() * noseOptions.length)];
    const randomMouth = mouthOptions[Math.floor(Math.random() * mouthOptions.length)];
    const randomHair = hairOptions[Math.floor(Math.random() * hairOptions.length)];
    const randomHairColor = hairColorOptions[Math.floor(Math.random() * hairColorOptions.length)];
    const randomFacialHair = facialHairOptions[Math.floor(Math.random() * facialHairOptions.length)];
    const randomAccessories = accessoryOptions[Math.floor(Math.random() * accessoryOptions.length)];
    const randomClothing = clothingOptions[Math.floor(Math.random() * clothingOptions.length)];
    const randomBackground = backgroundColors[Math.floor(Math.random() * backgroundColors.length)];
    
    setAvatarOptions({
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
      background: randomBackground,
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
               <div className="bg-gradient-to-br from-base-200 to-base-300 rounded-2xl border-2 border-base-300 p-6 shadow-xl">
                 <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                   <span className="text-primary">👁️</span>
                   Live Preview
                 </h2>
                   
                 {/* Preview Container with better styling */}
                 <div className="bg-base-100 rounded-2xl p-8 flex items-center justify-center border-2 border-base-300 shadow-inner">
                   <div className="relative">
                     <AvatarRenderer 
                       options={avatarOptions}
                       size={Math.min(400, typeof window !== 'undefined' ? window.innerWidth - 100 : 400)}
                       className="rounded-2xl shadow-2xl"
                     />
                     <div className="absolute -bottom-3 -right-3 bg-success text-success-content rounded-full w-12 h-12 flex items-center justify-center shadow-lg">
                       <span className="text-2xl">✓</span>
                     </div>
                   </div>
                 </div>

                 {/* Avatar Details */}
                 <div className="mt-6 space-y-4">
                   <div className="divider my-4">
                     <span className="text-sm font-semibold">Avatar Details</span>
                   </div>
                   
                   <div className="form-control">
                     <label className="label">
                       <span className="label-text font-semibold text-base">Name *</span>
                       <span className="label-text-alt text-xs badge badge-ghost">{name.length}/255</span>
                     </label>
                     <input
                       type="text"
                       placeholder="My Awesome Avatar"
                       className="input input-bordered w-full focus:input-primary transition-all"
                       value={name}
                       onChange={(e) => setName(e.target.value)}
                       maxLength={255}
                     />
                   </div>

                   <div className="form-control">
                     <label className="label">
                       <span className="label-text font-semibold text-base">Description</span>
                       <span className="label-text-alt text-xs badge badge-ghost">{description.length}/1000</span>
                     </label>
                     <textarea
                       className="textarea textarea-bordered h-24 focus:textarea-primary transition-all"
                       placeholder="Describe your avatar's personality or style..."
                       value={description}
                       onChange={(e) => setDescription(e.target.value)}
                       maxLength={1000}
                     ></textarea>
                   </div>

                   <div className="form-control">
                     <label className="label">
                       <span className="label-text font-semibold text-base">Status</span>
                     </label>
                     <select
                       className="select select-bordered w-full focus:select-primary transition-all"
                       value={status}
                       onChange={(e) => setStatus(e.target.value as 'draft' | 'active' | 'archived')}
                     >
                       <option value="draft">📝 Draft</option>
                       <option value="active">✅ Active</option>
                       <option value="archived">📦 Archived</option>
                     </select>
                   </div>
                 </div>
               </div>
             </div>
           </div>

           {/* Customization Panel */}
           <div className="bg-base-200 rounded-2xl border-2 border-base-300 shadow-xl overflow-hidden">
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

