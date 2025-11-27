import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@context/auth-context";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { SubmitHandler } from 'react-hook-form'
import { loginErrors } from "@errors";
import { handleApiError } from "@utils";
import { toast } from "@utils/toast.util";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const loginSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(32, "Password must be less than 32 characters"),
  });

  type FormFields = z.infer<typeof loginSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormFields>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit: SubmitHandler<FormFields> = async (data) => {
    try {
      await login(data.email, data.password);
      toast.success('Welcome back!', 'Successfully logged in to your account');
      navigate("/home");
    } catch (error) {
      const errMessage = handleApiError(error, loginErrors);
      toast.error('Login failed', errMessage);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-base-100 p-10 rounded-xl shadow-lg">
        <div className="text-center">
          <img
            src="/logo/mainLogo.png"
            alt="ArtChive Logo"
            className="mx-auto h-24 w-auto" // adjust h-16 to make bigger/smaller
          />
          <p className="mt-2 text-sm text-base-content/70">
            Sign in to your ArtChive account
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="rounded-md -space-y-px">
            <div className="mb-5">
              <label htmlFor="email" className="block text-sm font-medium text-base-content mb-1">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="appearance-none relative block w-full px-3 py-3 border border-base-300 placeholder-base-content/50 text-base-content rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:z-10 sm:text-sm bg-base-100"
                placeholder="your@email.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-error">{errors.email.message}</p>
              )}
            </div>
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-base-content mb-1">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className="appearance-none relative block w-full px-3 py-3 border border-base-300 placeholder-base-content/50 text-base-content rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:z-10 sm:text-sm bg-base-100"
                placeholder="Enter your password"
                {...register("password")}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-error">{errors.password.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end mb-6">
            <div className="text-sm">
              <a href="#" className="font-medium text-primary hover:text-primary/80">
                Forgot password?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-primary-content bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                "SIGN IN"
              )}
            </button>
          </div>

          {errors.root && (
            <div className="rounded-md bg-error/10 p-4">
              <div className="text-sm text-error">{errors.root.message}</div>
            </div>
          )}
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-base-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-base-100 text-base-content/70">OR</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              className="inline-flex justify-center py-2 px-4 border border-base-300 rounded-md shadow-sm bg-base-100 text-sm font-medium text-base-content hover:bg-base-200 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <span>CONTINUE WITH GOOGLE</span>
            </button>

            <button
              type="button"
              className="inline-flex justify-center py-2 px-4 border border-base-300 rounded-md shadow-sm bg-base-100 text-sm font-medium text-base-content hover:bg-base-200 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <span>CONTINUE WITH GITHUB</span>
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-base-content/70">
            Don't have an account?{" "}
            <Link to='/register' className="font-medium text-primary hover:text-primary/80">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
