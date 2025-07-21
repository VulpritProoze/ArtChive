import { useState, useContext } from "react";
import { useNavigate } from 'react-router-dom'
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEnvelope,
  faLock,
  faEye,
  faEyeSlash,
  faCircleNotch,
} from "@fortawesome/free-solid-svg-icons";
import api from "@lib/api";
import axios from 'axios'
import { AuthContext } from '@context/auth-context'

// Zod schema for form validation
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(32, "Password must be less than 32 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState("");

  const authContext = useContext(AuthContext)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFormData) => {
    if(!authContext) {
      setLoginError("Auth system is not yet ready")
      return
    }

    setIsSubmitting(true);
    setLoginError("");

    try {
      await authContext.login({ email: data.email, password: data.password })

      navigate('/home')

      // Handle successful login here
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        // Handle error from API
        const message = error.response?.data?.message || "Invalid email or password.";
        setLoginError(message);
      } else {
        setLoginError("An unexpected error occurred.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="card bg-base-100 shadow-2xl overflow-hidden">
          <div className="card-body p-8">
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
                className="flex justify-center mb-4"
              >
                <img
                  src="favicon/favicon.ico"
                  alt="ArtChive Logo"
                  className="w-16 h-16"
                />
              </motion.div>
              <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
              <p className="text-base-content/70">
                Sign in to your ArtChive account
              </p>
            </div>

            <AnimatePresence>
              {loginError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="alert alert-error mb-6"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="stroke-current shrink-0 h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>{loginError}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="form-control">
                <label className="label" htmlFor="email">
                  <span className="label-text">Email</span>
                </label>
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileFocus={{ scale: 1.01 }}
                  className="relative"
                >
                  <div className="absolute inset-y-0 z-10 left-0 pl-3 flex items-center pointer-events-none">
                    <FontAwesomeIcon
                      icon={faEnvelope}
                      className="text-base-content/50"
                    />
                  </div>
                  <input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    className={`input input-bordered w-full pl-10 ${
                      errors.email ? "input-error" : ""
                    }`}
                    {...register("email")}
                  />
                </motion.div>
                <AnimatePresence>
                  {errors.email && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 text-sm text-error"
                    >
                      {errors.email.message}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <div className="form-control">
                <label className="label" htmlFor="password">
                  <span className="label-text">Password</span>
                </label>
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileFocus={{ scale: 1.01 }}
                  className="relative"
                >
                  <div className="absolute inset-y-0 z-10 left-0 pl-3 flex items-center pointer-events-none">
                    <FontAwesomeIcon
                      icon={faLock}
                      className="text-base-content/50"
                    />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className={`input input-bordered w-full pl-10 pr-10 ${
                      errors.password ? "input-error" : ""
                    }`}
                    {...register("password")}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <FontAwesomeIcon
                      icon={showPassword ? faEyeSlash : faEye}
                      className="text-base-content/50 hover:text-base-content transition-colors"
                    />
                  </button>
                </motion.div>
                <AnimatePresence>
                  {errors.password && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 text-sm text-error"
                    >
                      {errors.password.message}
                    </motion.p>
                  )}
                </AnimatePresence>
                <label className="label mt-1">
                  <a
                    href="#"
                    className="label-text-alt link link-hover text-primary"
                  >
                    Forgot password?
                  </a>
                </label>
              </div>

              <div className="form-control mt-8">
                <motion.button
                  type="submit"
                  className="btn btn-primary"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <FontAwesomeIcon
                        icon={faCircleNotch}
                        className="fa-spin mr-2"
                      />
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </motion.button>
              </div>
            </form>

            <div className="divider my-6">OR</div>

            <div className="flex flex-col space-y-4">
              <button className="btn btn-outline">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12.545 10.239v3.821h5.445c-0.712 2.315-2.647 3.972-5.445 3.972-3.332 0-6.033-2.701-6.033-6.032s2.701-6.032 6.033-6.032c1.498 0 2.866 0.549 3.921 1.453l2.814-2.814c-1.786-1.667-4.146-2.676-6.735-2.676-5.521 0-10 4.479-10 10s4.479 10 10 10c8.396 0 10-7.496 10-10 0-0.67-0.069-1.325-0.189-1.955h-9.811z" />
                </svg>
                Continue with Google
              </button>
              <button className="btn btn-outline">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                Continue with GitHub
              </button>
            </div>

            <div className="text-center mt-6">
              <p className="text-base-content/70">
                Don't have an account?{" "}
                <a
                  href="/register"
                  className="link link-hover text-primary font-medium"
                >
                  Sign up
                </a>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
