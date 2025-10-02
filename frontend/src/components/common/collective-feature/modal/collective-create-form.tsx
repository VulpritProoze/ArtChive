import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useCollectiveContext } from "@context/collective-context";
import { createCollectiveSchema, type CreateCollectiveFormData } from "@lib/validations/collective";
import { ARTIST_TYPE_VALUES, type ArtistType } from "@types";

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
    <div className="container mx-auto px-4 py-8">
      
      <div className="max-w-2xl mx-auto">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h1 className="card-title text-3xl font-bold mb-6">Create New Collective</h1>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Title */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Collective Title *</span>
                </label>
                <input
                  type="text"
                  {...register('title')}
                  placeholder="Enter collective title"
                  className={`input input-bordered ${errors.title ? 'input-error' : ''}`}
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
                  placeholder="Describe your collective..."
                  className={`textarea textarea-bordered h-32 ${errors.description ? 'textarea-error' : ''}`}
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
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="file-input file-input-bordered w-full"
                  disabled={loading}
                />
                <label className="label">
                  <span className="label-text-alt">
                    Supported formats: JPG, PNG, GIF, WEBP
                  </span>
                </label>
              </div>

              {/* Artist Types */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Artist Types *</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-base-200 rounded-lg">
                  {ARTIST_TYPE_VALUES.map((artistType) => {
                    const isSelected = formValues.artist_types?.includes(artistType);
                    return (
                      <div key={artistType} className="form-control">
                        <label className="label cursor-pointer justify-start gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleArtistTypeToggle(artistType)}
                            className="checkbox checkbox-primary"
                            disabled={loading}
                          />
                          <span className="label-text font-medium capitalize">
                            {artistType}
                          </span>
                        </label>
                      </div>
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
                  <div className="mt-4">
                    <label className="label">
                      <span className="label-text font-semibold">Selected Types:</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {formValues.artist_types?.map((type) => (
                        <span
                          key={type}
                          className="badge badge-primary badge-lg capitalize"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Rules */}
              <div className="form-control">
                <div className="flex items-center justify-between mb-2">
                  <label className="label">
                    <span className="label-text font-semibold">Rules</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => addArrayField('rules')}
                    className="btn btn-sm btn-outline"
                    disabled={loading}
                  >
                    Add Rule
                  </button>
                </div>
                
                {(formValues.rules || []).map((rule, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={rule}
                      onChange={(e) => handleArrayFieldChange('rules', index, e.target.value)}
                      onBlur={() => trigger(`rules.${index}`)}
                      placeholder="Enter a rule for the collective"
                      className="input input-bordered flex-1"
                      disabled={loading}
                    />
                    {(formValues.rules?.length || 0) > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayField('rules', index)}
                        className="btn btn-sm btn-error"
                        disabled={loading}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                {errors.rules && (
                  <label className="label">
                    <span className="label-text-alt text-error">
                      {errors.rules.message || "Invalid rules"}
                    </span>
                  </label>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="btn btn-outline"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="loading loading-spinner"></span>
                      Creating...
                    </>
                  ) : (
                    'Create Collective'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}