import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lock, Loader2, Eye, EyeOff, CheckCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { authAPI } from "../lib/api";
import { toast } from "sonner";

const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const Brand = () => (
  <div className="flex items-center justify-center gap-3 mb-10">
    <span className="w-9 h-9 rounded-md bg-gradient-to-br from-[#C6A15B] to-[#8F7340] flex items-center justify-center">
      <span className="font-display text-[#0C0F13] text-base font-semibold">T</span>
    </span>
    <p className="font-display text-gray-900 text-xl tracking-wide">Crowther</p>
  </div>
);

const ResetPassword = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data) => {
    if (!token) {
      toast.error("Invalid reset link");
      return;
    }

    setIsLoading(true);
    try {
      await authAPI.resetPassword(token, data.password);
      setResetComplete(true);
      toast.success("Password reset successfully!");
    } catch (error) {
      const message = error.response?.data?.detail || "Reset failed. The link may have expired.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#F7F6F3] flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Brand />
          <div className="lux-card p-9 text-center">
            <p className="lux-eyebrow mb-3">Account Recovery</p>
            <h2 className="font-display text-[26px] text-gray-900 mb-3">Invalid reset link</h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-8">This password reset link is invalid or has expired.</p>
            <Link to="/forgot-password">
              <Button className="w-full h-12 bg-[#14181D] hover:bg-[#252b33] text-white font-medium rounded-full">
                Request New Link
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F6F3] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Brand />

        <div className="lux-card p-9">
          {resetComplete ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full border border-emerald-200 bg-emerald-50 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <h2 className="font-display text-[26px] text-gray-900 mb-3">Password reset</h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-8">
                Your password has been successfully reset. You can now sign in with your new password.
              </p>
              <Link to="/login">
                <Button className="w-full h-12 bg-[#14181D] hover:bg-[#252b33] text-white font-medium rounded-full" data-testid="go-to-login-btn">
                  Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <p className="lux-eyebrow mb-3">Account Recovery</p>
                <h2 className="font-display text-[26px] text-gray-900 mb-2">Reset your password</h2>
                <p className="text-gray-500 text-sm">Enter your new password below.</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      className="pl-11 pr-11 h-12 bg-white border-[#EAE7E0] text-gray-900 placeholder:text-gray-400 focus:border-[#C6A15B] focus:ring-[#C6A15B]/20 rounded-full text-[14px]"
                      {...register("password")}
                      data-testid="reset-password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-500 text-xs">{errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      className="pl-11 pr-11 h-12 bg-white border-[#EAE7E0] text-gray-900 placeholder:text-gray-400 focus:border-[#C6A15B] focus:ring-[#C6A15B]/20 rounded-full text-[14px]"
                      {...register("confirmPassword")}
                      data-testid="reset-confirm-password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-xs">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-[#14181D] hover:bg-[#252b33] text-white font-medium rounded-full"
                  disabled={isLoading}
                  data-testid="reset-submit-btn"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Resetting…
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
