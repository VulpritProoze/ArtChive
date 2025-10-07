// frontend/src/components/account/register.component.tsx
import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { ARTIST_TYPE_VALUES } from "@types";
import { useAuth } from "@context/auth-context";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const { register: registerRoute } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);

  const registrationSchema = z
    .object({
      username: z
        .string()
        .min(8, "Username must be at least 8 characters")
        .max(32, "Username cannot exceed 32 characters"),
      email: z.string().email("Please enter a valid email address"),
      password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(32, "Password must be less than 32 characters"),
      confirmPassword: z.string().min(1, "Please confirm your password"),
      firstName: z.string().optional(),
      middleName: z.string().optional(),
      lastName: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      birthday: z
        .string()
        .optional()
        .nullable()
        .refine((dateStr) => !dateStr || !isNaN(Date.parse(dateStr)), {
          message: "Invalid date format",
        })
        .refine((dateStr) => !dateStr || new Date(dateStr) <= new Date(), {
          message: "Birthday must be in the past",
        })
        .refine(
          (dateStr) => {
            if (!dateStr) return true;
            const dob = new Date(dateStr);
            const today = new Date();
            const age = today.getFullYear() - dob.getFullYear();
            const monthDiff = today.getMonth() - dob.getMonth();
            const dayDiff = today.getDate() - dob.getDate();
            const adjustedAge =
              monthDiff > 0 || (monthDiff === 0 && dayDiff >= 0) ? age : age - 1;
            return adjustedAge >= 13;
          },
          {
            message: "You must be 13 years old or above to register",
          }
        ),
      artistTypes: z
        .array(z.enum(ARTIST_TYPE_VALUES))
        .optional()
        .refine((types) => new Set(types ?? []).size === (types?.length ?? 0), {
          message: "No duplicate artist types allowed",
        })
        .refine((types) => (types?.length ?? 0) <= 5, {
          message: "You can select up to 5 artist types",
        }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords don't match",
      path: ["confirmPassword"],
    });

  type FormFields = z.infer<typeof registrationSchema>;

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<FormFields>({
    defaultValues: {
      artistTypes: [],
    },
    resolver: zodResolver(registrationSchema),
  });

  const [selectedArtistTypes, setSelectedArtistTypes] = useState<string[]>([]);
  const formValues = watch();

  const handleArtistTypeChange = (type: string) => {
    let updatedTypes;
    if (selectedArtistTypes.includes(type)) {
      updatedTypes = selectedArtistTypes.filter((t) => t !== type);
    } else {
      if (selectedArtistTypes.length < 5) {
        updatedTypes = [...selectedArtistTypes, type];
      } else {
        updatedTypes = selectedArtistTypes;
      }
    }
    setSelectedArtistTypes(updatedTypes);
    setValue("artistTypes", updatedTypes as any);
  };

  const nextStep = async () => {
    let fieldsToValidate: (keyof FormFields)[] = [];

    if (currentStep === 1) {
      fieldsToValidate = ["username", "email", "password", "confirmPassword"];
    } else if (currentStep === 2) {
      fieldsToValidate = ["firstName", "middleName", "lastName", "city", "country"];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const onSubmit: SubmitHandler<FormFields> = async (data) => {
    try {
      const success = await registerRoute(
        data.username,
        data.email,
        data.password,
        data.confirmPassword,
        data.firstName || "",
        data.middleName || "",
        data.lastName || "",
        data.city || "",
        data.country || "",
        data.birthday || null,
        data.artistTypes || []
      );
      if (success) setTimeout(() => navigate("/home"), 2000);
    } catch (error) {
      setError("root", {
        message: error as string,
      });
      console.error("Registration failed: ", error);
    }
  };

  const artistTypeImages: Record<string, string> = {
    "visual arts": "/api/placeholder/120/120",
    "digital & new media arts": "/api/placeholder/120/120",
    "literary arts": "/api/placeholder/120/120",
    "performance arts": "/api/placeholder/120/120",
    "music art": "/api/placeholder/120/120",
    "culinary art": "/api/placeholder/120/120",
    "functional art": "/api/placeholder/120/120",
    "environmental art": "/api/placeholder/120/120",
    "film art": "/api/placeholder/120/120",
    "cross-disciplinary art": "/api/placeholder/120/120",
  };

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-base-100 rounded-2xl shadow-xl overflow-hidden">
          {/* Purple Header */}
          <div className="bg-primary text-primary-content py-6 px-6 text-center">
            <div className="flex justify-center mb-2">
              <img
                src="public/logo/Artchive_logo.png"
                alt="ArtChive"
                className="w-12 h-12"
              />
            </div>
            <h1 className="text-2xl font-bold">ArtChive</h1>
            <p className="text-sm mt-1 opacity-90">
              {currentStep === 1 && "Create your account"}
              {currentStep === 2 && "Personal Information"}
              {currentStep === 3 && "Select your artist types"}
              {currentStep === 4 && "Confirm your registration"}
            </p>
          </div>

          {/* Progress Indicator - CENTERED & SMALLER */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-center gap-3">
              {[1, 2, 3, 4].map((step, idx) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-base transition-all ${
                      currentStep === step
                        ? "bg-primary text-primary-content scale-110"
                        : currentStep > step
                        ? "bg-success text-success-content"
                        : "bg-base-300 text-base-content"
                    }`}
                  >
                    {currentStep > step ? "✓" : step}
                  </div>
                  {idx < 3 && (
                    <div
                      className={`h-1 w-10 mx-2 rounded transition-all ${
                        currentStep > step ? "bg-success" : "bg-base-300"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit(onSubmit)} className="px-6 pb-6">
            {errors.root && (
              <div className="alert alert-error mb-4 text-sm">
                <span>{errors.root.message}</span>
              </div>
            )}

            {/* Step 1: Account Info */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-center text-base-content/60 mb-4">
                  You are creating journey by creating your account
                </p>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-base-content/70 flex items-center gap-1">
                    <i className="fas fa-user text-xs"></i> Username
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your username"
                    className="input input-sm input-bordered w-full bg-base-200"
                    {...register("username")}
                  />
                  {errors.username && (
                    <p className="text-xs text-error mt-1">
                      {errors.username.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-base-content/70 flex items-center gap-1">
                    <i className="fas fa-envelope text-xs"></i> Email
                  </label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="input input-sm input-bordered w-full bg-base-200"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-xs text-error mt-1">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-base-content/70 flex items-center gap-1">
                    <i className="fas fa-lock text-xs"></i> Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter your password"
                    className="input input-sm input-bordered w-full bg-base-200"
                    {...register("password")}
                  />
                  {errors.password && (
                    <p className="text-xs text-error mt-1">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-base-content/70 flex items-center gap-1">
                    <i className="fas fa-lock text-xs"></i> Confirm Password
                  </label>
                  <input
                    type="password"
                    placeholder="Confirm your password"
                    className="input input-sm input-bordered w-full bg-base-200"
                    {...register("confirmPassword")}
                  />
                  {errors.confirmPassword && (
                    <p className="text-xs text-error mt-1">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Personal Info */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-center text-base-content/60 mb-4">
                  Tell us a bit more about yourself 
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-base-content/70 flex items-center gap-1">
                      <i className="fas fa-user text-xs"></i> First Name
                    </label>
                    <input
                      type="text"
                      placeholder="First Name"
                      className="input input-sm input-bordered w-full bg-base-200"
                      {...register("firstName")}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-base-content/70 flex items-center gap-1">
                      <i className="fas fa-user text-xs"></i> Middle Name (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Middle Name"
                      className="input input-sm input-bordered w-full bg-base-200"
                      {...register("middleName")}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-base-content/70 flex items-center gap-1">
                    <i className="fas fa-user text-xs"></i> Last Name
                  </label>
                  <input
                    type="text"
                    placeholder="Last Name"
                    className="input input-sm input-bordered w-full bg-base-200"
                    {...register("lastName")}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-base-content/70 flex items-center gap-1">
                    <i className="fas fa-city text-xs"></i> City
                  </label>
                  <input
                    type="text"
                    placeholder="City"
                    className="input input-sm input-bordered w-full bg-base-200"
                    {...register("city")}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-base-content/70 flex items-center gap-1">
                    <i className="fas fa-globe text-xs"></i> Country
                  </label>
                  <input
                    type="text"
                    placeholder="Country"
                    className="input input-sm input-bordered w-full bg-base-200"
                    {...register("country")}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Artist Types */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <p className="text-sm text-center text-base-content/60 mb-4">
                  Select at least one artist type that describes you
                </p>

                <div className="grid grid-cols-2 gap-3">
                  {ARTIST_TYPE_VALUES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleArtistTypeChange(type)}
                      className={`relative rounded-xl overflow-hidden border-2 transition-all hover:scale-105 ${
                        selectedArtistTypes.includes(type)
                          ? "border-primary shadow-lg"
                          : "border-base-300"
                      }`}
                    >
                      <img
                        src={artistTypeImages[type]}
                        alt={type}
                        className="w-full h-24 object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <p className="text-xs text-white font-semibold text-center">
                          {type}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                {errors.artistTypes && (
                  <p className="text-xs text-error text-center">
                    {errors.artistTypes.message}
                  </p>
                )}
              </div>
            )}

            {/* Step 4: Review */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-3xl">✓</span>
                  </div>
                  <h3 className="text-xl font-bold mb-1">Ready to join!</h3>
                  <p className="text-sm text-base-content/60">
                    Review your information and complete your registration
                  </p>
                </div>

                <div className="bg-base-200/50 rounded-xl p-4 space-y-2 text-sm">
                  <div>
                    <p className="text-xs text-base-content/60">Account Information</p>
                    <p className="font-semibold">Username: {formValues.username}</p>
                    <p className="font-semibold">Email: {formValues.email}</p>
                  </div>

                  {(formValues.firstName || formValues.lastName) && (
                    <div className="pt-2 border-t border-base-300">
                      <p className="text-xs text-base-content/60">
                        Personal Information
                      </p>
                      <p className="font-semibold">
                        Name: {formValues.firstName} {formValues.middleName}{" "}
                        {formValues.lastName}
                      </p>
                      {formValues.city && (
                        <p className="font-semibold">
                          Location: {formValues.city}, {formValues.country}
                        </p>
                      )}
                    </div>
                  )}

                  {selectedArtistTypes.length > 0 && (
                    <div className="pt-2 border-t border-base-300">
                      <p className="text-xs text-base-content/60 mb-2">
                        Artist Types
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {selectedArtistTypes.map((type) => (
                          <span
                            key={type}
                            className="badge badge-primary badge-sm"
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-6 pt-4">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="btn btn-sm btn-ghost gap-1"
                >
                  <i className="fas fa-arrow-left"></i> BACK
                </button>
              )}

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="btn btn-sm btn-primary gap-1 ml-auto"
                >
                  NEXT <i className="fas fa-arrow-right"></i>
                </button>
              ) : (
                <button
                  type="submit"
                  className="btn btn-sm btn-success gap-1 ml-auto"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                      CREATING...
                    </>
                  ) : (
                    <>
                      COMPLETE REGISTRATION
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}