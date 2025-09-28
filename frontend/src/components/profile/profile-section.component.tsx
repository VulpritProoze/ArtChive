import React, { useState, useEffect } from "react";
import { useAuth } from "@context/auth-context";
import { core } from "@lib/api";
import { toast } from 'react-toastify'
import type { UserProfile } from "@types";

const ProfileComponent: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>({
    username: "",
    email: "",
    firstName: "",
    middleName: "",
    lastName: "",
    city: "",
    country: "",
    contactNo: "",
    birthday: "",
    artistTypes: [],
    profilePicture: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const { user } = useAuth();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      if (user?.id) {
        const response = await core.get(`profile/get/${user.id}/`);
        setProfile(response.data);
        setImagePreview(response.data.profilePicture)
      } else {
        console.error("User is null or not available");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error('Error fetching profile')
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (user?.id) {
        // Changes that reflect the addition of an image
        const formData = new FormData()

        Object.keys(profile).forEach(key => {
            if(key !== 'profilePicture' && key !== 'artistTypes' && key !== 'id') {
                formData.append(key, (profile as any)[key] || '')
            }
        })

        profile.artistTypes.forEach((type) => {
            formData.append('artistTypes', type)
        })

        if (selectedFile) {
            formData.append('profilePicture', selectedFile)
        }

        await core.put(`profile/update/${user.id}/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        setIsEditing(false);
        fetchProfile(); // Refresh data
        toast.success('Profile updated successfully!')
      } else {
        console.error("User is null or not available");
      }
    } catch (error) {
        toast.error('Error updating profile')
      console.error("Error updating profile:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
        setSelectedFile(file)

        // Create a preview of selected image
        const reader = new FileReader()
        reader.onloadend = () => {
            setImagePreview(reader.result as string)
        }
        reader.readAsDataURL(file)
    }
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleArtistTypeChange = (index: number, value: string) => {
    const newArtistTypes = [...profile.artistTypes];
    newArtistTypes[index] = value;
    setProfile((prev) => ({
      ...prev,
      artistTypes: newArtistTypes,
    }));
  };

  const addArtistType = () => {
    setProfile((prev) => ({
      ...prev,
      artistTypes: [...prev.artistTypes, ""],
    }));
  };

  const removeArtistType = (index: number) => {
    setProfile((prev) => ({
      ...prev,
      artistTypes: prev.artistTypes.filter((_, i) => i !== index),
    }));
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsEditing(true)
  }

  const handleCancelClick = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsEditing(false)
    setSelectedFile(null)
    setImagePreview(profile.profilePicture)
    fetchProfile()
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h1 className="card-title text-3xl mb-6">Profile</h1>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Profile Picture */}
              <div className="col-span-2 flex flex-col items-center mb-4">
                <div className="avatar">
                  <div className="w-24 h-24 rounded-full">
                    <img
                      src={imagePreview || "/static_img/default-pic-min.jpg"}
                      alt="Profile"
                      className="object-cover"
                    />
                  </div>
                </div>
                {isEditing && (
                  <input
                    type="file"
                    accept='image/jpeg,image/jpg,image/png,image/gif'
                    className="file-input file-input-bordered file-input-sm mt-2"
                    onChange={handleFileSelect}
                  />
                )}
              </div>

              {/* Read-only fields */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Username</span>
                </label>
                <input
                  type="text"
                  value={profile.username}
                  className="input input-bordered"
                  disabled
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Email</span>
                </label>
                <input
                  type="email"
                  value={profile.email}
                  className="input input-bordered"
                  disabled
                />
              </div>

              {/* Editable fields */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">First Name</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={profile.firstName}
                  onChange={handleInputChange}
                  className="input input-bordered"
                  disabled={!isEditing}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Middle Name</span>
                </label>
                <input
                  type="text"
                  name="middleName"
                  value={profile.middleName}
                  onChange={handleInputChange}
                  className="input input-bordered"
                  disabled={!isEditing}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Last Name</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={profile.lastName}
                  onChange={handleInputChange}
                  className="input input-bordered"
                  disabled={!isEditing}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">City</span>
                </label>
                <input
                  type="text"
                  name="city"
                  value={profile.city}
                  onChange={handleInputChange}
                  className="input input-bordered"
                  disabled={!isEditing}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Country</span>
                </label>
                <input
                  type="text"
                  name="country"
                  value={profile.country}
                  onChange={handleInputChange}
                  className="input input-bordered"
                  disabled={!isEditing}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Contact Number</span>
                </label>
                <input
                  type="text"
                  name="contactNo"
                  value={profile.contactNo}
                  onChange={handleInputChange}
                  className="input input-bordered"
                  disabled={!isEditing}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Birthday</span>
                </label>
                <input
                  type="date"
                  name="birthday"
                  value={profile.birthday}
                  onChange={handleInputChange}
                  className="input input-bordered"
                  disabled={!isEditing}
                />
              </div>
            </div>

            {/* Artist Types */}``
            <div className="mb-6">
              <label className="label">
                <span className="label-text">Artist Types (max 5)</span>
              </label>
              {profile.artistTypes.map((type, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={type}
                    onChange={(e) =>
                      handleArtistTypeChange(index, e.target.value)
                    }
                    className="input input-bordered flex-1"
                    disabled={!isEditing}
                    placeholder="Enter artist type"
                  />
                  {isEditing && profile.artistTypes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeArtistType(index)}
                      className="btn btn-error btn-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              {isEditing && profile.artistTypes.length < 5 && (
                <button
                  type="button"
                  onClick={addArtistType}
                  className="btn btn-primary btn-sm mt-2"
                >
                  Add Artist Type
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4">
              {!isEditing ? (
                <button
                  type="button"
                  onClick={handleEditClick}
                  className="btn btn-primary"
                >
                  Edit Profile
                </button>
              ) : (
                <>
                  <button
                    type="submit"
                    className="btn btn-success"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelClick}
                    className="btn btn-error"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileComponent;