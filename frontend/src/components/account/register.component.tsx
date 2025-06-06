import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faArrowLeft,
  faCheck,
  faUser,
  faEnvelope,
  faLock,
  faUserTag,
  faGlobe,
  faCity,
} from "@fortawesome/free-solid-svg-icons";
import type { ArtistType } from "@app/components/index/artist-type.type";

// Zod schema for form validation
const formSchema = z
  .object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    email: z.string().email("Please enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    firstName: z.string().optional(),
    middleName: z.string().optional(),
    lastName: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    artistTypes: z
      .array(z.string())
      .min(1, "Select at least one artist type")
      .max(3, "You can only select up to 3 artist types"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof formSchema>;

// Artist type data with sample images
const ARTIST_TYPES: { type: ArtistType; image: string }[] = [
  {
    type: "visual arts",
    image:
      "https://images.unsplash.com/photo-1578926375605-eaf7559b1458?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
  },
  {
    type: "digital & new media arts",
    image:
      "https://images.unsplash.com/photo-1551269901-5c5e14c25df7?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
  },
  {
    type: "literary arts",
    image:
      "https://images.unsplash.com/photo-1544947950-fa07a98d237f?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
  },
  {
    type: "performance arts",
    image:
      "https://images.unsplash.com/photo-1547153760-18fc86324498?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
  },
  {
    type: "music art",
    image:
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
  },
  {
    type: "culinary art",
    image:
      "https://images.unsplash.com/photo-1544025162-d76694265947?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
  },
  {
    type: "functional art",
    image:
      "https://images.unsplash.com/photo-1556911220-bff31c812dba?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
  },
  {
    type: "environmental art",
    image:
      "https://images.unsplash.com/photo-1586771107445-d3ca888129ce?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
  },
  {
    type: "film art",
    image:
      "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
  },
  {
    type: "cross-disciplinary art",
    image:
      "https://images.unsplash.com/photo-1493612276216-ee3925520721?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
  },
];

export default function Register() {
  const [step, setStep] = useState<number>(1);
  const [selectedTypes, setSelectedTypes] = useState<ArtistType[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      artistTypes: [],
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger,
    watch,
    setValue,
  } = form;

  useEffect(() => {
    setValue("artistTypes", selectedTypes);
  }, [selectedTypes, setValue]);

  const toggleArtistType = (type: ArtistType) => {
    const newTypes = selectedTypes.includes(type)
      ? selectedTypes.filter((t) => t !== type)
      : [...selectedTypes, type];

    setSelectedTypes(newTypes);
    setValue("artistTypes", newTypes);
    trigger("artistTypes");
  };

  const nextStep = async () => {
    if (step === 1) {
      const isValid = await trigger([
        "username",
        "email",
        "password",
        "confirmPassword",
      ]);
      if (isValid) setStep(2);
    } else if (step === 2) {
      // No validation required for optional personal info
      setStep(3);
    } else if (step === 3) {
      const isValid = await trigger(["artistTypes"]);
      if (isValid) setStep(4);
    }
  };

  const prevStep = () => {
    setStep((prev) => prev - 1);
  };

  const onSubmit = (data: FormData) => {
    console.log("Registration data:", data);
    // Handle registration logic here
  };

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl bg-base-100 rounded-xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-primary text-primary-content p-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <img
              src="favicon/favicon.ico"
              alt="ArtChive icon"
              className="w-10 h-10 rounded-lg"
            />
            <h1 className="text-3xl font-bold">ArtChive</h1>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {step === 1 && <p className="text-lg">Create your account</p>}
              {step === 2 && (
                <p className="text-lg">Personal information (optional)</p>
              )}
              {step === 3 && (
                <p className="text-lg">Select your artist types</p>
              )}
              {step === 4 && (
                <p className="text-lg">Complete your registration</p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress indicator */}
        <div className="flex justify-center p-4">
          <div className="flex items-center">
            {[1, 2, 3, 4].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step === stepNumber
                      ? "bg-primary text-primary-content"
                      : step > stepNumber
                      ? "bg-success text-success-content"
                      : "bg-base-300"
                  }`}
                >
                  {step > stepNumber ? (
                    <FontAwesomeIcon icon={faCheck} size="xs" />
                  ) : (
                    stepNumber
                  )}
                </div>
                {stepNumber < 4 && (
                  <div
                    className={`w-12 h-1 ${
                      step > stepNumber ? "bg-success" : "bg-base-300"
                    }`}
                  ></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form content */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <p className="text-center mb-6 opacity-80">
                  Start your creative journey by creating your account
                </p>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text flex items-center gap-2">
                      <FontAwesomeIcon icon={faUser} />
                      Username
                    </span>
                  </label>
                  <motion.input
                    type="text"
                    {...register("username")}
                    placeholder="Enter your username"
                    className={`input input-bordered w-full ${
                      errors.username ? "input-error" : ""
                    }`}
                    whileFocus={{ scale: 1.01 }}
                  />
                  {errors.username && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-error mt-1"
                    >
                      {errors.username.message}
                    </motion.p>
                  )}
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text flex items-center gap-2">
                      <FontAwesomeIcon icon={faEnvelope} />
                      Email
                    </span>
                  </label>
                  <motion.input
                    type="email"
                    {...register("email")}
                    placeholder="Enter your email"
                    className={`input input-bordered w-full ${
                      errors.email ? "input-error" : ""
                    }`}
                    whileFocus={{ scale: 1.01 }}
                  />
                  {errors.email && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-error mt-1"
                    >
                      {errors.email.message}
                    </motion.p>
                  )}
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text flex items-center gap-2">
                      <FontAwesomeIcon icon={faLock} />
                      Password
                    </span>
                  </label>
                  <motion.input
                    type="password"
                    {...register("password")}
                    placeholder="Enter your password"
                    className={`input input-bordered w-full ${
                      errors.password ? "input-error" : ""
                    }`}
                    whileFocus={{ scale: 1.01 }}
                  />
                  {errors.password && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-error mt-1"
                    >
                      {errors.password.message}
                    </motion.p>
                  )}
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text flex items-center gap-2">
                      <FontAwesomeIcon icon={faLock} />
                      Confirm Password
                    </span>
                  </label>
                  <motion.input
                    type="password"
                    {...register("confirmPassword")}
                    placeholder="Confirm your password"
                    className={`input input-bordered w-full ${
                      errors.confirmPassword ? "input-error" : ""
                    }`}
                    whileFocus={{ scale: 1.01 }}
                  />
                  {errors.confirmPassword && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-error mt-1"
                    >
                      {errors.confirmPassword.message}
                    </motion.p>
                  )}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <p className="text-center mb-6 opacity-80">
                  Tell us a bit more about yourself (optional)
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text flex items-center gap-2">
                        <FontAwesomeIcon icon={faUserTag} />
                        First Name
                      </span>
                    </label>
                    <motion.input
                      type="text"
                      {...register("firstName")}
                      placeholder="Your first name"
                      className="input input-bordered w-full"
                      whileFocus={{ scale: 1.01 }}
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text flex items-center gap-2">
                        <FontAwesomeIcon icon={faUserTag} />
                        Middle Name
                      </span>
                    </label>
                    <motion.input
                      type="text"
                      {...register("middleName")}
                      placeholder="Your middle name"
                      className="input input-bordered w-full"
                      whileFocus={{ scale: 1.01 }}
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text flex items-center gap-2">
                        <FontAwesomeIcon icon={faUserTag} />
                        Last Name
                      </span>
                    </label>
                    <motion.input
                      type="text"
                      {...register("lastName")}
                      placeholder="Your last name"
                      className="input input-bordered w-full"
                      whileFocus={{ scale: 1.01 }}
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text flex items-center gap-2">
                        <FontAwesomeIcon icon={faCity} />
                        City
                      </span>
                    </label>
                    <motion.input
                      type="text"
                      {...register("city")}
                      placeholder="Your city"
                      className="input input-bordered w-full"
                      whileFocus={{ scale: 1.01 }}
                    />
                  </div>

                  <div className="form-control md:col-span-2">
                    <label className="label">
                      <span className="label-text flex items-center gap-2">
                        <FontAwesomeIcon icon={faGlobe} />
                        Country
                      </span>
                    </label>
                    <motion.input
                      type="text"
                      {...register("country")}
                      placeholder="Your country"
                      className="input input-bordered w-full"
                      whileFocus={{ scale: 1.01 }}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
              >
                <p className="text-center mb-6 opacity-80">
                  Select at least one artist type that describes you
                </p>

                <input
                  type="hidden"
                  {...register("artistTypes")}
                  value={selectedTypes}
                />

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {ARTIST_TYPES.map(({ type, image }) => (
                    <motion.div
                      key={type}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => toggleArtistType(type)}
                      className={`card cursor-pointer ${
                        selectedTypes.includes(type)
                          ? "ring-2 ring-primary"
                          : ""
                      }`}
                    >
                      <figure className="relative h-24">
                        <img
                          src={image}
                          alt={type}
                          className="w-full h-full object-cover"
                        />
                        {selectedTypes.includes(type) && (
                          <div className="absolute top-2 right-2 bg-primary text-primary-content rounded-full w-6 h-6 flex items-center justify-center">
                            <FontAwesomeIcon icon={faCheck} size="xs" />
                          </div>
                        )}
                      </figure>
                      <div className="card-body p-3">
                        <h3 className="card-title text-sm capitalize">
                          {type}
                        </h3>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {errors.artistTypes && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-error mt-4 text-center"
                  >
                    {errors.artistTypes.message}
                  </motion.p>
                )}
              </motion.div>
            )}

{step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
                <div className="mb-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="w-20 h-20 bg-success text-success-content rounded-full flex items-center justify-center mx-auto mb-4"
                  >
                    <FontAwesomeIcon icon={faCheck} size="2x" />
                  </motion.div>
                  <h2 className="text-2xl font-bold mb-2">Ready to join!</h2>
                  <p className="opacity-80">
                    Review your information and complete your registration
                  </p>
                </div>

                <div className="bg-base-200 rounded-lg p-6 mb-6 text-left space-y-4">
                  <div>
                    <h3 className="font-bold mb-2">Account Information</h3>
                    <p>
                      <span className="opacity-70">Username:</span>{" "}
                      {watch("username")}
                    </p>
                    <p>
                      <span className="opacity-70">Email:</span> {watch("email")}
                    </p>
                  </div>

                  {(watch("firstName") || watch("lastName")) && (
                    <div>
                      <h3 className="font-bold mt-4 mb-2">Personal Information</h3>
                      <p>
                        <span className="opacity-70">Name:</span>{" "}
                        {[watch("firstName"), watch("middleName"), watch("lastName")]
                          .filter(Boolean)
                          .join(" ")}
                      </p>
                      {(watch("city") || watch("country")) && (
                        <p>
                          <span className="opacity-70">Location:</span>{" "}
                          {[watch("city"), watch("country")]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <h3 className="font-bold mt-4 mb-2">Artist Types</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedTypes.map((type) => (
                        <span
                          key={type}
                          className="badge badge-primary capitalize"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation buttons */}
          <div className="flex justify-between mt-8">
            {step > 1 ? (
              <motion.button
                type="button"
                onClick={prevStep}
                className="btn btn-ghost"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
                Back
              </motion.button>
            ) : (
              <div></div> // Empty div to maintain space
            )}

            {step < 4 ? (
              <motion.button
                type="button"
                onClick={nextStep}
                className="btn btn-primary"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Next
                <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
              </motion.button>
            ) : (
              <motion.button
                type="submit"
                className="btn btn-success"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Complete Registration
              </motion.button>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
}
