import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MainLayout } from '@components/common/layout';
import { useAvatar, useCreateAvatar, useUpdateAvatar } from '@hooks/queries/use-avatar';
import type { CreateAvatarData, UpdateAvatarData } from '@services/avatar.service';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faArrowLeft, faDownload } from '@fortawesome/free-solid-svg-icons';
import AvatarRenderer from './avatar-renderer.component';
import AvatarCustomizer from './avatar-customizer.component';
import type { AvatarOptions } from './avatar-options';
import { defaultAvatarOptions, skinTones, hairColors, clothingStyles } from './avatar-options';

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
  
  // Ref for the avatar SVG to enable download
  const avatarSvgRef = useRef<SVGSVGElement>(null);

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
        const canvasJson = avatar.canvas_json as any;
        setCanvasData({
          width: canvasJson.width || 512,
          height: canvasJson.height || 512,
          background: canvasJson.background || defaultAvatarOptions.background,
          objects: canvasJson.objects || [],
          avatarOptions: canvasJson.avatarOptions || defaultAvatarOptions,
        });
        // Load avatar options if they exist
        if (canvasJson.avatarOptions) {
          setAvatarOptions(canvasJson.avatarOptions);
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

    // Ensure avatarOptions are always included in canvas_json
    const finalCanvasData = {
      ...canvasData,
      avatarOptions: avatarOptions, // Always include current avatarOptions
    };

    if (isEditMode && avatarId) {
      const updateData: UpdateAvatarData = {
        name,
        description,
        canvas_json: finalCanvasData,
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
        canvas_json: finalCanvasData,
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

  const handleDownloadSVG = () => {
    if (!avatarSvgRef.current) return;
    
    const svgData = new XMLSerializer().serializeToString(avatarSvgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name || 'avatar'}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPNG = async () => {
    if (!avatarSvgRef.current) return;
    
    try {
      const svgData = new XMLSerializer().serializeToString(avatarSvgRef.current);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      canvas.width = 512;
      canvas.height = 512;
      
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      img.onload = () => {
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) {
              const downloadUrl = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = downloadUrl;
              link.download = `${name || 'avatar'}.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(downloadUrl);
            }
          });
        }
        URL.revokeObjectURL(url);
      };
      
      img.src = url;
    } catch (error) {
      console.error('Error downloading PNG:', error);
      alert('Failed to download PNG. Please try downloading as SVG instead.');
    }
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
        {/* Header */}
        <div className="bg-base-200 rounded-xl p-5 mb-6 border border-base-300 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handleCancel}
                className="btn btn-ghost btn-sm hover:bg-base-300 transition-all"
                title="Go back"
              >
                <FontAwesomeIcon icon={faArrowLeft} />
                <span className="hidden sm:inline">Back</span>
              </button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">
                  {isEditMode ? 'Edit Avatar' : 'Create Avatar'}
                </h1>
                <p className="text-sm text-base-content/60 mt-0.5">
                  {isEditMode ? 'Update your avatar design' : 'Design your unique avatar'}
                </p>
              </div>
            </div>
            <button
              onClick={handleSave}
              className="btn btn-primary gap-2 shadow-md hover:shadow-lg transition-all"
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

         {/* Main Layout: Preview Left, Customizer Right */}
         <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
           {/* Left Column: Preview and Form - WIDER NOW */}
           <div className="xl:col-span-1 space-y-6">
             {/* Preview Card */}
             <div className="sticky top-6">
               <div className="bg-gradient-to-br from-base-200 to-base-300 rounded-2xl border-2 border-base-300 p-6 shadow-xl">
                 <div className="flex items-center justify-between mb-4">
                   <h2 className="text-xl font-bold flex items-center gap-2">
                     <span className="text-primary">👁️</span>
                     Live Preview
                   </h2>
                   {/* Download Button - Better positioned */}
                   <div className="dropdown dropdown-bottom dropdown-end">
                     <label tabIndex={0} className="btn btn-sm btn-ghost gap-2 hover:btn-primary transition-all">
                       <FontAwesomeIcon icon={faDownload} />
                     </label>
                     <ul tabIndex={0} className="dropdown-content menu p-2 shadow-lg bg-base-100 rounded-box w-48 border border-base-300 z-50">
                       <li>
                         <button onClick={handleDownloadSVG} className="text-sm">
                           Download as SVG
                         </button>
                       </li>
                       <li>
                         <button onClick={handleDownloadPNG} className="text-sm">
                           Download as PNG
                         </button>
                       </li>
                     </ul>
                   </div>
                 </div>
                   
                 {/* Preview Container - MUCH LARGER, FULL WIDTH */}
                 <div className="bg-base-100 rounded-xl p-4 flex items-center justify-center border border-base-300 shadow-inner w-full">
                   <div className="relative w-full" style={{ aspectRatio: '1 / 1' }}>
                     <div className="absolute inset-0 flex items-center justify-center transition-transform duration-300 hover:scale-[1.02]">
                       <AvatarRenderer 
                         ref={avatarSvgRef}
                         options={avatarOptions}
                         size={512}
                         className="w-full h-full rounded-xl shadow-lg"
                       />
                     </div>
                   </div>
                 </div>

                 {/* Avatar Details Form - Compact */}
                 <div className="mt-6 space-y-4">
                   <div className="divider my-2">
                     <span className="text-xs font-semibold">Details</span>
                   </div>
                   
                   <div className="form-control">
                     <label className="label py-2">
                       <span className="label-text text-sm font-semibold">Name *</span>
                       <span className="label-text-alt text-xs">{name.length}/255</span>
                     </label>
                     <input
                       type="text"
                       placeholder="My Avatar"
                       className="input input-bordered input-sm w-full focus:input-primary transition-all"
                       value={name}
                       onChange={(e) => setName(e.target.value)}
                       maxLength={255}
                     />
                   </div>

                   <div className="form-control">
                     <label className="label py-2">
                       <span className="label-text text-sm font-semibold">Description</span>
                       <span className="label-text-alt text-xs">{description.length}/1000</span>
                     </label>
                     <textarea
                       className="textarea textarea-bordered textarea-sm h-20 focus:textarea-primary transition-all resize-none"
                       placeholder="Add a description..."
                       value={description}
                       onChange={(e) => setDescription(e.target.value)}
                       maxLength={1000}
                     ></textarea>
                   </div>

                   <div className="form-control">
                     <label className="label py-2">
                       <span className="label-text text-sm font-semibold">Status</span>
                     </label>
                     <select
                       className="select select-bordered select-sm w-full focus:select-primary transition-all"
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

           {/* Right Column: Customization Panel */}
           <div className="xl:col-span-1">
             <div className="bg-base-200 rounded-2xl border-2 border-base-300 shadow-xl overflow-hidden h-[calc(100vh-160px)]">
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

