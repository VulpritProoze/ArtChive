import { useState } from "react";
import { z } from 'zod'
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from 'react-hook-form'
import type { SubmitHandler } from "react-hook-form";
import { ARTIST_TYPE_VALUES } from "@types";
import { useAuth } from "@context/auth-context";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const { register: registerRoute } = useAuth() // registerRoute is alias
  const navigate = useNavigate()

  const registrationSchema = z.object({
    username: z.string().min(8, "Username must be at least 8 characters").max(32, "Username cannot exceed 32 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters").max(32, "Password must be less than 32 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),

    // Optional fields
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
      .refine((dateStr) => {
        if (!dateStr) return true;
        const dob = new Date(dateStr);
        const today = new Date();
        const age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        const dayDiff = today.getDate() - dob.getDate();
        const adjustedAge = monthDiff > 0 || (monthDiff === 0 && dayDiff >= 0)
          ? age
          : age - 1;
        return adjustedAge >= 13;
      }, {
        message: "You must be 13 years old or above to register",
      }),
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
    path: ["confirmPassword"] // Point error to confirm password
  })

  type FormFields = z.infer<typeof registrationSchema>

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormFields>({ 
    defaultValues: {
      artistTypes: []
    },
    resolver: zodResolver(registrationSchema) 
  })

  const [selectedArtistTypes, setSelectedArtistTypes] = useState<string[]>([]);

  const handleArtistTypeChange = (type: string) => {
    let updatedTypes;
    if (selectedArtistTypes.includes(type)) {
      updatedTypes = selectedArtistTypes.filter(t => t !== type);
    } else {
      if (selectedArtistTypes.length < 5) {
        updatedTypes = [...selectedArtistTypes, type];
      } else {
        updatedTypes = selectedArtistTypes; // Don't change if limit reached
      }
    }
    setSelectedArtistTypes(updatedTypes);
    setValue('artistTypes', updatedTypes as any);
  };

  const onSubmit: SubmitHandler<FormFields> = async (data) => {
    try {
      const success = await registerRoute(
        data.username,
        data.email,
        data.password,
        data.confirmPassword,
        data.firstName || '',
        data.middleName || '',
        data.lastName || '',
        data.city || '',
        data.country || '',
        data.birthday || null,
        data.artistTypes || [],
      )
      if (success) setTimeout(() => navigate('/home'), 2000)
    } catch(error) {
      setError('root', {
        message: error,
      })
      console.error('Registration failed: ', error)
    }
  }

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="card w-full max-w-2xl shadow-2xl bg-base-100">
        <div className="card-body">
          <h2 className="card-title text-2xl font-bold mb-6">Create Account</h2>
          
          {errors.root && (
            <div className="alert alert-error mb-4">
              <span>{errors.root.message}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Required Fields */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Username*</span>
                </label>
                <input 
                  type="text" 
                  placeholder="Username" 
                  className={`input input-bordered ${errors.username ? 'input-error' : ''}`}
                  {...register('username')}
                />
                {errors.username && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.username.message}</span>
                  </label>
                )}
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Email*</span>
                </label>
                <input 
                  type="email" 
                  placeholder="Email" 
                  className={`input input-bordered ${errors.email ? 'input-error' : ''}`}
                  {...register('email')}
                />
                {errors.email && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.email.message}</span>
                  </label>
                )}
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Password*</span>
                </label>
                <input 
                  type="password" 
                  placeholder="Password" 
                  className={`input input-bordered ${errors.password ? 'input-error' : ''}`}
                  {...register('password')}
                />
                {errors.password && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.password.message}</span>
                  </label>
                )}
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Confirm Password*</span>
                </label>
                <input 
                  type="password" 
                  placeholder="Confirm Password" 
                  className={`input input-bordered ${errors.confirmPassword ? 'input-error' : ''}`}
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.confirmPassword.message}</span>
                  </label>
                )}
              </div>
            </div>
            
            <div className="divider">Optional Information</div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">First Name</span>
                </label>
                <input 
                  type="text" 
                  placeholder="First Name" 
                  className="input input-bordered"
                  {...register('firstName')}
                />
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Middle Name</span>
                </label>
                <input 
                  type="text" 
                  placeholder="Middle Name" 
                  className="input input-bordered"
                  {...register('middleName')}
                />
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Last Name</span>
                </label>
                <input 
                  type="text" 
                  placeholder="Last Name" 
                  className="input input-bordered"
                  {...register('lastName')}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">City</span>
                </label>
                <input 
                  type="text" 
                  placeholder="City" 
                  className="input input-bordered"
                  {...register('city')}
                />
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Country</span>
                </label>
                <input 
                  type="text" 
                  placeholder="Country" 
                  className="input input-bordered"
                  {...register('country')}
                />
              </div>
            </div>
            
            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text">Birthday</span>
              </label>
              <input 
                type="date" 
                className={`input input-bordered ${errors.birthday ? 'input-error' : ''}`}
                {...register('birthday')}
              />
              {errors.birthday && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.birthday.message}</span>
                </label>
              )}
            </div>
            
            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text">Artist Types (select up to 5)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {ARTIST_TYPE_VALUES.map((type) => (
                  <div key={type} className="form-control">
                    <label className="label cursor-pointer gap-2">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-primary"
                        value={type}
                        checked={selectedArtistTypes.includes(type)}
                        onChange={() => handleArtistTypeChange(type)}
                      />
                      <span className="label-text">{type}</span>
                    </label>
                  </div>
                ))}
              </div>
              <input type="hidden" {...register('artistTypes')} value={selectedArtistTypes} />
              {errors.artistTypes && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.artistTypes.message}</span>
                </label>
              )}
            </div>
            
            <div className="form-control mt-6">
              <button 
                type="submit" 
                className={`btn btn-primary ${isSubmitting ? 'loading' : ''}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
