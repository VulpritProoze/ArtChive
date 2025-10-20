import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useCollectiveContext } from "@context/collective-context";
import { createCollectiveSchema, type CreateCollectiveFormData } from "@lib/validations/collective";
import { ARTIST_TYPE_VALUES, type ArtistType } from "@types";
import { MainLayout } from "@components/common/layout";

export default function CreateCollectiveForm() {
  const navigate = useNavigate();
  const { loading, createCollective } = useCollectiveContext();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    trigger,
  } = useForm<CreateCollectiveFormData>({
    resolver: zodResolver(createCollectiveSchema),
    defaultValues: {
      rules: [""],
      artist_types: [],
      picture: null,
    },
  });

  const formValues = watch();

  const handleArtistTypeToggle = (artistType: ArtistType) => {
    const currentTypes = formValues.artist_types || [];
    const newTypes = currentTypes.includes(artistType)
      ? currentTypes.filter(type => type !== artistType)
      : [...currentTypes, artistType];
    
    setValue('artist_types', newTypes, { shouldValidate: true });
  };

  const handleArrayFieldChange = (field: 'rules', index: number, value: string) => {
    const currentValues = formValues[field] || [];
    const newValues = currentValues.map((item, i) => i === index ? value : item);
    setValue(field, newValues, { shouldValidate: true });
  };

  const addArrayField = async (field: 'rules') => {
    const currentValues = formValues[field] || [];
    setValue(field, [...currentValues, ""], { shouldValidate: true });
  };

  const removeArrayField = async (field: 'rules', index: number) => {
    const currentValues = formValues[field] || [];
    const newValues = currentValues.filter((_, i) => i !== index);
    setValue(field, newValues, { shouldValidate: true });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setValue('picture', file, { shouldValidate: true });
  };

  const onSubmit = async (data: CreateCollectiveFormData) => {
    try {
      const collectiveId = await createCollective(data);
      toast.success("Collective created successfully!");
      navigate(`/collective/${collectiveId}`);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <MainLayout showSidebar={true} showRightSidebar={false}>
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 rounded-xl p-6 text-center">
          <div className="text-4xl mb-3">🎨</div>
          <h1 className="text-2xl font-bold text-base-content mb-2">
            Create Your Collective
          </h1>
          <p className="text-base-content/70 text-sm">
            Build a vibrant community of artists and creators
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information Card */}
          <div className="bg-base-100 rounded-xl p-6 shadow-md border border-base-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-2xl">📝</div>
              <h2 className="text-xl font-bold">Basic Information</h2>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Collective Title *</span>
                </label>
                <input
                  type="text"
                  {...register('title')}
                  placeholder="Enter a creative name for your collective"
                  className={`input input-bordered w-full ${errors.title ? 'input-error' : 'focus:input-primary'}`}
                  disabled={loading}
                />
                {errors.title && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.title.message}</span>
                  </label>
                )}
              </div>

              {/* Description */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Description *</span>
                </label>
                <textarea
                  {...register('description')}
                  placeholder="Describe your collective's purpose, vision, and what makes it unique..."
                  className={`textarea textarea-bordered h-32 w-full ${errors.description ? 'textarea-error' : 'focus:textarea-primary'}`}
                  disabled={loading}
                />
                {errors.description && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.description.message}</span>
                  </label>
                )}
              </div>

              {/* Picture Upload */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Collective Picture</span>
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="file-input file-input-bordered file-input-primary w-full"
                    disabled={loading}
                  />
                </div>
                <label className="label">
                  <span className="label-text-alt text-base-content/60 text-xs">
                    📷 Upload an image that represents your collective (JPG, PNG, GIF, WEBP)
                  </span>
                </label>
                {formValues.picture && (
                  <div className="mt-2">
                    <span className="badge badge-success badge-sm gap-2">
                      ✓ Image selected: {formValues.picture.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Artist Types Card */}
          <div className="bg-base-100 rounded-xl p-6 shadow-md border border-base-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-2xl">🎭</div>
              <h2 className="text-xl font-bold">Artist Types *</h2>
            </div>

            <p className="text-base-content/70 text-sm mb-4">
              Select the types of artists that will be part of your collective
            </p>

            <div className="flex flex-wrap gap-2">
              {ARTIST_TYPE_VALUES.map((artistType) => {
                const isSelected = formValues.artist_types?.includes(artistType);
                return (
                  <button
                    key={artistType}
                    type="button"
                    onClick={() => handleArtistTypeToggle(artistType)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-primary text-primary-content shadow-md scale-105'
                        : 'bg-base-200 text-base-content hover:bg-base-300'
                    }`}
                    disabled={loading}
                  >
                    <span className="capitalize">{artistType}</span>
                    {isSelected && <span className="ml-2">✓</span>}
                  </button>
                );
              })}
            </div>

            {errors.artist_types && (
              <label className="label">
                <span className="label-text-alt text-error">{errors.artist_types.message}</span>
              </label>
            )}
            
            {/* Selected Artist Types Preview */}
            {(formValues.artist_types?.length || 0) > 0 && (
              <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-sm text-base-content">
                    Selected ({formValues.artist_types?.length}):
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formValues.artist_types?.map((type) => (
                    <span
                      key={type}
                      className="badge badge-primary capitalize text-xs"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Rules Card */}
          <div className="bg-base-100 rounded-xl p-6 shadow-md border border-base-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-2xl">📜</div>
                <h2 className="text-xl font-bold">Community Rules</h2>
              </div>
              <button
                type="button"
                onClick={() => addArrayField('rules')}
                className="btn btn-outline btn-primary btn-sm gap-2"
                disabled={loading}
              >
                <span>+</span>
                Add Rule
              </button>
            </div>

            <p className="text-base-content/70 text-sm mb-4">
              Set guidelines to maintain a positive and creative environment
            </p>
            
            <div className="space-y-3">
              {(formValues.rules || []).map((rule, index) => (
                <div key={index} className="flex gap-3 items-start">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary mt-2">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={rule}
                      onChange={(e) => handleArrayFieldChange('rules', index, e.target.value)}
                      onBlur={() => trigger(`rules.${index}`)}
                      placeholder={`Rule ${index + 1}: e.g., Be respectful to all members`}
                      className="input input-bordered w-full focus:input-primary"
                      disabled={loading}
                    />
                  </div>
                  {(formValues.rules?.length || 0) > 1 && (
                    <button
                      type="button"
                      onClick={() => removeArrayField('rules', index)}
                      className="btn btn-ghost btn-sm text-error hover:bg-error/10 mt-2"
                      disabled={loading}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {errors.rules && (
              <label className="label">
                <span className="label-text-alt text-error">
                  {errors.rules.message || "Invalid rules"}
                </span>
              </label>
            )}
          </div>

          {/* Action Buttons */}
          <div className="bg-base-200/50 rounded-xl p-4 flex gap-4 justify-between items-center">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn btn-ghost gap-2"
              disabled={loading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Creating...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Create Collective
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}