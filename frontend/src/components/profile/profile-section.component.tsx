// frontend/src/components/profile/profile-section.component.tsx
import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@context/auth-context";
import { core } from "@lib/api";
import { galleryService } from "@services/gallery.service";
import { toast } from "@utils/toast.util";
import { handleApiError, formatErrorForToast } from "@utils";
import type { UserProfile } from "@types";
import { ARTIST_TYPE_VALUES, type ArtistType } from "@types";
import { MainLayout } from "@components/common/layout";

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [hasActiveGallery, setHasActiveGallery] = useState<boolean | null>(null);
  const [_isCheckingGallery, setIsCheckingGallery] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { user, refreshUser } = useAuth();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    checkActiveGallery();
  }, [user?.id]);

  const checkActiveGallery = async () => {
    if (!user?.id) return;
    
    try {
      setIsCheckingGallery(true);
      const response = await galleryService.hasActiveGallery(user.id);
      setHasActiveGallery(response.has_active);
    } catch (error) {
      console.error("Error checking active gallery:", error);
      // If error, assume no active gallery
      setHasActiveGallery(false);
    } finally {
      setIsCheckingGallery(false);
    }
  };

  const fetchProfile = async () => {
    try {
      if (user?.id) {
        const response = await core.get(`profile/get/${user.id}/`);
        setProfile(response.data);
        setImagePreview(response.data.profilePicture);
      } else {
        console.error("User is null or not available");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      const message = handleApiError(error, {}, true, true);
      toast.error('Failed to load profile', formatErrorForToast(message));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (user?.id) {
        const formData = new FormData();

        Object.keys(profile).forEach((key) => {
          if (
            key !== "profilePicture" &&
            key !== "artistTypes" &&
            key !== "id"
          ) {
            formData.append(key, (profile as any)[key] || "");
          }
        });

        profile.artistTypes.forEach((type) => {
          formData.append("artistTypes", type);
        });

        if (selectedFile) {
          formData.append("profilePicture", selectedFile);
        }

        await core.put(`profile/update/${user.id}/`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        setIsEditing(false);
        toast.success("Profile updated", "Profile updated successfully!");
        
        // Fetch updated profile data
        await fetchProfile();
        
        // Refresh user context to update header and other components
        if (refreshUser) {
          await refreshUser();
        }
        
        // Optional: Force page refresh to ensure all components are updated
        // Uncomment the line below if you want a full page refresh
        // window.location.reload();
        
      } else {
        console.error("User is null or not available");
      }
    } catch (error) {
      const message = handleApiError(error, {}, true, true);
      toast.error("Failed to update profile", formatErrorForToast(message));
      console.error("Error updating profile:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleArtistTypeToggle = (artistType: ArtistType) => {
    const currentTypes = profile.artistTypes || [];
    const newTypes = currentTypes.includes(artistType)
      ? currentTypes.filter(type => type !== artistType)
      : [...currentTypes, artistType];
    
    setProfile((prev) => ({
      ...prev,
      artistTypes: newTypes,
    }));
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsEditing(true);
  };

  const handleCancelClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsEditing(false);
    setSelectedFile(null);
    setImagePreview(profile.profilePicture);
    fetchProfile();
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-base-content">
              Profile Settings
            </h1>
            <p className="text-base-content/60 mt-1">
              Manage your account information and preferences
            </p>
          </div>
          {/* Three Dots Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="btn btn-circle btn-ghost"
              aria-label="More options"
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="6" cy="12" r="1.5" />
                <circle cx="18" cy="12" r="1.5" />
              </svg>
            </button>
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-base-100 rounded-lg shadow-xl border border-base-300 z-50 overflow-hidden">
                <div className="p-2">
                  {user?.id && (
                    <div
                      title={
                        hasActiveGallery === false
                          ? "You don't have an active gallery yet. Publish a gallery to view it here."
                          : undefined
                      }
                    >
                      {hasActiveGallery ? (
                        <Link
                          to={`/gallery/${user.id}`}
                          className="btn btn-outline btn-sm w-full justify-start gap-3 normal-case"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          <span>View Published Gallery</span>
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm w-full justify-start gap-3 normal-case"
                          disabled
                          style={{ cursor: 'not-allowed' }}
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          <span>View Published Gallery</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-base-100 rounded-2xl shadow-xl border border-base-300 overflow-hidden">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 px-6 py-4 border-b border-base-300">
            <h2 className="text-xl font-semibold text-base-content">
              Personal Information
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            {/* Profile Picture Section */}
            <div className="flex flex-col items-center mb-8 p-6 bg-base-200/50 rounded-xl">
              <div className="relative group mb-4">
                <div className="avatar">
                  <div className="w-32 h-32 rounded-full ring ring-primary ring-offset-base-100 ring-offset-4 shadow-xl group-hover:ring-secondary transition-all duration-300">
                    <img
                      src={imagePreview || "/static_img/default-pic-min.jpg"}
                      alt="Profile"
                      className="object-cover"
                    />
                  </div>
                </div>
                {isEditing && (
                  <div className="absolute bottom-0 right-0 bg-primary rounded-full p-2 shadow-lg">
                    <svg
                      className="w-5 h-5 text-primary-content"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                )}
              </div>
              {isEditing && (
                <div className="flex flex-col items-center">
                  <label className="btn btn-sm btn-outline gap-2 cursor-pointer">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                      />
                    </svg>
                    Upload Photo
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </label>
                  <p className="text-xs text-base-content/60 mt-2">
                    JPG, PNG or GIF (max 5MB)
                  </p>
                </div>
              )}
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Username - Read only */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold flex items-center gap-2">
                    <span>👤</span> Username
                  </span>
                </label>
                <input
                  type="text"
                  value={profile.username}
                  className="input input-bordered bg-base-200 w-full"
                  disabled
                />
              </div>

              {/* Email - Read only */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold flex items-center gap-2">
                    <span>📧</span> Email
                  </span>
                </label>
                <input
                  type="email"
                  value={profile.email}
                  className="input input-bordered bg-base-200 w-full"
                  disabled
                />
              </div>

              {/* First Name */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">First Name</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={profile.firstName}
                  onChange={handleInputChange}
                  className={`input input-bordered w-full ${
                    isEditing ? "input-primary" : "bg-base-200"
                  }`}
                  disabled={!isEditing}
                  placeholder="Enter first name"
                />
              </div>

              {/* Middle Name */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Middle Name</span>
                </label>
                <input
                  type="text"
                  name="middleName"
                  value={profile.middleName}
                  onChange={handleInputChange}
                  className={`input input-bordered w-full ${
                    isEditing ? "input-primary" : "bg-base-200"
                  }`}
                  disabled={!isEditing}
                  placeholder="Enter middle name"
                />
              </div>

              {/* Last Name */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Last Name</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={profile.lastName}
                  onChange={handleInputChange}
                  className={`input input-bordered w-full ${
                    isEditing ? "input-primary" : "bg-base-200"
                  }`}
                  disabled={!isEditing}
                  placeholder="Enter last name"
                />
              </div>

              {/* City */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold flex items-center gap-2">
                    <span>🏙️</span> City
                  </span>
                </label>
                <input
                  type="text"
                  name="city"
                  value={profile.city}
                  onChange={handleInputChange}
                  className={`input input-bordered w-full ${
                    isEditing ? "input-primary" : "bg-base-200"
                  }`}
                  disabled={!isEditing}
                  placeholder="Enter city"
                />
              </div>

              {/* Country */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold flex items-center gap-2">
                    <span>🌍</span> Country
                  </span>
                </label>
                <input
                  type="text"
                  name="country"
                  value={profile.country}
                  onChange={handleInputChange}
                  className={`input input-bordered w-full ${
                    isEditing ? "input-primary" : "bg-base-200"
                  }`}
                  disabled={!isEditing}
                  placeholder="Enter country"
                />
              </div>

              {/* Contact Number */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold flex items-center gap-2">
                    <span>📱</span> Contact Number
                  </span>
                </label>
                <input
                  type="text"
                  name="contactNo"
                  value={profile.contactNo}
                  onChange={handleInputChange}
                  className={`input input-bordered w-full ${
                    isEditing ? "input-primary" : "bg-base-200"
                  }`}
                  disabled={!isEditing}
                  placeholder="Enter contact number"
                />
              </div>

              {/* Birthday */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold flex items-center gap-2">
                    <span>🎂</span> Birthday
                  </span>
                </label>
                <input
                  type="date"
                  name="birthday"
                  value={profile.birthday}
                  onChange={handleInputChange}
                  className={`input input-bordered w-full ${
                    isEditing ? "input-primary" : "bg-base-200"
                  }`}
                  disabled={!isEditing}
                />
              </div>
            </div>

            {/* Artist Types */}
            <div className="mb-6 p-4 bg-base-200/50 rounded-xl">
              <label className="label">
                <span className="label-text font-semibold text-lg flex items-center gap-2">
                  <span>🎨</span> Artist Types
                </span>
              </label>
              <p className="text-base-content/70 text-sm mb-4">
                Select the types of art you practice
              </p>
              {isEditing ? (
                <div className="flex flex-wrap gap-2">
                  {ARTIST_TYPE_VALUES.map((artistType) => {
                    const isSelected = profile.artistTypes?.includes(artistType);
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
                      >
                        <span className="capitalize">{artistType}</span>
                        {isSelected && <span className="ml-2">✓</span>}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profile.artistTypes && profile.artistTypes.length > 0 ? (
                    profile.artistTypes.map((type) => (
                      <span
                        key={type}
                        className="badge badge-primary capitalize text-sm"
                      >
                        {type}
                      </span>
                    ))
                  ) : (
                    <span className="text-base-content/60 text-sm">No artist types selected</span>
                  )}
                </div>
              )}
              {/* Selected Artist Types Preview (when editing) */}
              {isEditing && (profile.artistTypes?.length || 0) > 0 && (
                <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-sm text-base-content">
                      Selected ({profile.artistTypes?.length}):
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile.artistTypes?.map((type) => (
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

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-base-300">
              {!isEditing ? (
                <button
                  type="button"
                  onClick={handleEditClick}
                  className="btn btn-primary gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Edit Profile
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleCancelClick}
                    className="btn btn-ghost gap-2"
                    disabled={saving}
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success gap-2"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Save Changes
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  );
};

export default ProfileComponent;