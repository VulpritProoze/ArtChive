import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collective } from "@lib/api";
import { collectiveService } from "@services/collective.service";
import { toast } from "@utils/toast.util";
import { handleApiError, formatErrorForToast } from "@utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

interface CollectiveEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  collectiveId: string;
}

interface CollectiveData {
  description: string;
  rules: string[];
  artist_types: string[];
  picture: string;
}

export default function CollectiveEditModal({
  isOpen,
  onClose,
  collectiveId,
}: CollectiveEditModalProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState<CollectiveData>({
    description: "",
    rules: [""],
    artist_types: [],
    picture: "",
  });
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [picturePreview, setPicturePreview] = useState<string>("");

  useEffect(() => {
    if (isOpen && collectiveId) {
      fetchCollectiveData();
    }
  }, [isOpen, collectiveId]);

  const fetchCollectiveData = async () => {
    try {
      setFetching(true);
      const response = await collective.get(`/${collectiveId}/`);
      const data = response.data;
      setFormData({
      description: data.description || "",
      rules: data.rules && data.rules.length > 0 ? data.rules : [""],
      artist_types: data.artist_types && data.artist_types.length > 0 ? data.artist_types : [""],
      picture: data.picture || "",
      });
      setPicturePreview(data.picture || "");
    } catch (error) {
      console.error("Error fetching collective data:", error);
      const message = handleApiError(error, {}, true, true);
      toast.error("Failed to load collective", formatErrorForToast(message));
      onClose();
    } finally {
      setFetching(false);
    }
  };

  const handleArtistTypeChange = (index: number, value: string) => {
    const newArtistTypes = [...formData.artist_types];
    newArtistTypes[index] = value;
    setFormData({ ...formData, artist_types: newArtistTypes });
  };

  const addArtistType = () => {
    setFormData({ ...formData, artist_types: [...formData.artist_types, ""] });
  };

  const removeArtistType = (index: number) => {
    if (formData.artist_types.length > 1) {
      const newArtistTypes = formData.artist_types.filter((_, i) => i !== index);
      setFormData({ ...formData, artist_types: newArtistTypes });
    }
  };

  const handleRuleChange = (index: number, value: string) => {
    const newRules = [...formData.rules];
    newRules[index] = value;
    setFormData({ ...formData, rules: newRules });
  };

  const addRule = () => {
    setFormData({ ...formData, rules: [...formData.rules, ""] });
  };

  const removeRule = (index: number) => {
    if (formData.rules.length > 1) {
      const newRules = formData.rules.filter((_, i) => i !== index);
      setFormData({ ...formData, rules: newRules });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setPictureFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);

      const updateData: any = {};
      if (formData.description.trim()) {
        updateData.description = formData.description.trim();
      }
      if (formData.rules.filter((r) => r.trim()).length > 0) {
        updateData.rules = formData.rules.filter((r) => r.trim());
      }
      if (formData.artist_types.filter((t) => t.trim()).length > 0) {
        updateData.artist_types = formData.artist_types.filter((t) => t.trim());
      }
      if (pictureFile) {
        updateData.picture = pictureFile;
      }
      // If no new file is selected, we don't include picture in updateData
      // The backend serializer's update() method will preserve the existing picture value

      await collectiveService.updateCollective(collectiveId, updateData);
      toast.success("Collective updated", "Collective details have been updated successfully!");
      navigate(`/collective/${collectiveId}`);
    } catch (error) {
      console.error("Error updating collective:", error);
      const message = handleApiError(error, {}, true, true);
      toast.error("Failed to update collective", formatErrorForToast(message));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-2xl">Edit Collective Details</h3>
          <button
            type="button"
            className="btn btn-sm btn-circle btn-ghost"
            onClick={onClose}
            disabled={loading || fetching}
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {fetching ? (
          <div className="flex items-center justify-center py-12">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form Section */}
            <div className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Description */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Description *</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered h-32"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Describe your collective..."
                    required
                    maxLength={4096}
                    disabled={loading}
                  />
                </div>

                {/* Rules */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Rules</span>
                  </label>
                  <div className="space-y-2">
                    {formData.rules.map((rule, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          className="input input-bordered flex-1"
                          value={rule}
                          onChange={(e) => handleRuleChange(index, e.target.value)}
                          placeholder={`Rule ${index + 1}`}
                          maxLength={100}
                          disabled={loading}
                        />
                        {formData.rules.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-sm btn-error"
                            onClick={() => removeRule(index)}
                            disabled={loading}
                          >
                            <FontAwesomeIcon icon={faTimes} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={addRule}
                      disabled={loading}
                    >
                      + Add Rule
                    </button>
                  </div>
                </div>

                {/* Artist Types */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Artist Types (max 5)</span>
                  </label>
                  <div className="space-y-2">
                    {formData.artist_types.map((type, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          className="input input-bordered flex-1"
                          value={type}
                          onChange={(e) => handleArtistTypeChange(index, e.target.value)}
                          placeholder={`Artist type ${index + 1}`}
                          disabled={loading}
                        />
                        {formData.artist_types.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-sm btn-error"
                            onClick={() => removeArtistType(index)}
                            disabled={loading}
                          >
                            <FontAwesomeIcon icon={faTimes} />
                          </button>
                        )}
                      </div>
                    ))}
                    {formData.artist_types.length < 5 && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={addArtistType}
                        disabled={loading}
                      >
                        + Add Artist Type
                      </button>
                    )}
                  </div>
                </div>

                {/* Picture Upload */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Picture</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="file-input file-input-bordered file-input-primary w-full"
                    disabled={loading}
                  />
                </div>

                {/* Actions */}
                <div className="modal-action pt-4">
                  <button
                    type="button"
                    className="btn"
                    onClick={onClose}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading || !formData.description.trim()}
                  >
                    {loading ? (
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

            {/* Preview Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-lg">Preview</h4>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  <FontAwesomeIcon
                    icon={showPreview ? faEyeSlash : faEye}
                    className="mr-2"
                  />
                  {showPreview ? "Hide" : "Show"} Preview
                </button>
              </div>

              {showPreview && (
                <div className="card bg-base-200 shadow-lg">
                  <figure className="aspect-video">
                    {picturePreview ? (
                      <img
                        src={picturePreview}
                        alt="Collective preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-base-300 flex items-center justify-center">
                        <span className="text-base-content/50">No image</span>
                      </div>
                    )}
                  </figure>
                  <div className="card-body">
                    <div className="space-y-2">
                      <div>
                        <h5 className="font-semibold text-sm text-base-content/70">
                          Description
                        </h5>
                        <p className="text-sm">
                          {formData.description || (
                            <span className="text-base-content/50 italic">
                              No description
                            </span>
                          )}
                        </p>
                      </div>

                      {formData.rules.filter((r) => r.trim()).length > 0 && (
                        <div>
                          <h5 className="font-semibold text-sm text-base-content/70">
                            Rules
                          </h5>
                          <ul className="list-disc list-inside text-sm space-y-1">
                            {formData.rules
                              .filter((r) => r.trim())
                              .map((rule, idx) => (
                                <li key={idx}>{rule}</li>
                              ))}
                          </ul>
                        </div>
                      )}

                      {formData.artist_types.filter((t) => t.trim()).length > 0 && (
                        <div>
                          <h5 className="font-semibold text-sm text-base-content/70">
                            Artist Types
                          </h5>
                          <ul className="list-disc list-inside text-sm space-y-1">
                            {formData.artist_types
                              .filter((t) => t.trim())
                              .map((type, idx) => (
                                <li key={idx}>{type}</li>
                              ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

