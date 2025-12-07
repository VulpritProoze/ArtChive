import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { useAuth } from "@context/auth-context";
import { core } from "@/lib/api";
import { formatErrorForToast, handleApiError, toast } from "@/utils";
import { defaultErrors } from "@/errors";
import { Lock, Eye, EyeOff, Shield } from "lucide-react";
import { MainLayout } from "@components/common/layout";

export default function Account() {
  const { user } = useAuth();
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const changePasswordSchema = z
    .object({
      oldPassword: z.string().min(1, "Current password is required"),
      newPassword: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(32, "Password must be less than 32 characters"),
      confirmPassword: z.string().min(1, "Please confirm your password"),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: "Passwords don't match",
      path: ["confirmPassword"],
    });

  type FormFields = z.infer<typeof changePasswordSchema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormFields>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit: SubmitHandler<FormFields> = async (data) => {
    try {
      await core.post("auth/change-password/", {
        old_password: data.oldPassword,
        new_password: data.newPassword,
        confirm_password: data.confirmPassword,
      });

      toast.success(
        "Password changed successfully",
        "Your password has been updated. Please use your new password for future logins."
      );
      reset();
    } catch (error) {
      const errorMessage = handleApiError(error, defaultErrors, true);
      const formattedError = formatErrorForToast(errorMessage);
      toast.error("Failed to change password", formattedError);
      console.error("Password change failed: ", error);
    }
  };

  return (
    <MainLayout showRightSidebar={false}>
    <div className="bg-base-200 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-base-100 rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-secondary text-primary-content px-6 py-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary-content/20 rounded-lg">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Account Settings</h1>
                <p className="text-sm opacity-90 mt-1">
                  Manage your account security settings
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* User Info Section */}
            <div className="bg-base-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-3 text-base-content">
                Account Information
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-base-content/70">Username:</span>
                  <span className="font-medium text-base-content">
                    {user?.username}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/70">Email:</span>
                  <span className="font-medium text-base-content">
                    {user?.email}
                  </span>
                </div>
              </div>
            </div>

            {/* Change Password Section */}
            <div className="border-t border-base-300 pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-base-content">
                  Change Password
                </h2>
              </div>
              <p className="text-sm text-base-content/70 mb-6">
                Update your password to keep your account secure. Make sure your
                new password is strong and different from your previous one.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Old Password */}
                <div>
                  <label
                    htmlFor="oldPassword"
                    className="block text-sm font-medium text-base-content mb-2"
                  >
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      id="oldPassword"
                      type={showOldPassword ? "text" : "password"}
                      autoComplete="current-password"
                      className="appearance-none relative block w-full px-3 py-3 pr-10 border border-base-300 placeholder-base-content/50 text-base-content rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm bg-base-100"
                      placeholder="Enter your current password"
                      {...register("oldPassword")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content transition-colors"
                      aria-label={
                        showOldPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showOldPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {errors.oldPassword && (
                    <p className="mt-1 text-sm text-error">
                      {errors.oldPassword.message}
                    </p>
                  )}
                </div>

                {/* New Password */}
                <div>
                  <label
                    htmlFor="newPassword"
                    className="block text-sm font-medium text-base-content mb-2"
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      autoComplete="new-password"
                      className="appearance-none relative block w-full px-3 py-3 pr-10 border border-base-300 placeholder-base-content/50 text-base-content rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm bg-base-100"
                      placeholder="Enter your new password"
                      {...register("newPassword")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content transition-colors"
                      aria-label={
                        showNewPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {errors.newPassword && (
                    <p className="mt-1 text-sm text-error">
                      {errors.newPassword.message}
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-base-content mb-2"
                  >
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      className="appearance-none relative block w-full px-3 py-3 pr-10 border border-base-300 placeholder-base-content/50 text-base-content rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm bg-base-100"
                      placeholder="Confirm your new password"
                      {...register("confirmPassword")}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content transition-colors"
                      aria-label={
                        showConfirmPassword
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-error">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-primary-content bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="loading loading-spinner loading-sm mr-2"></span>
                        Changing Password...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        Change Password
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
    </MainLayout>
  );
}

