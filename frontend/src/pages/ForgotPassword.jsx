import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Loader2, ArrowLeft, CheckCircle, Atom } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { authAPI } from "../lib/api";
import { toast } from "sonner";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

const ForgotPassword = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await authAPI.forgotPassword(data.email);
      setEmailSent(true);
      toast.success("Reset link sent to your email");
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F6F3] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <span className="w-9 h-9 rounded-md bg-[#0C0F13] border border-[#1FB58A]/30 flex items-center justify-center p-1.5">
            <img src="/crowther-icon.png" alt="Crowther" className="w-full h-full object-contain" />
          </span>
          <p className="font-display text-gray-900 text-xl tracking-wide">Crowther</p>
        </div>

        <div className="lux-card p-9">
          {emailSent ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full border border-emerald-200 bg-emerald-50 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <h2 className="font-display text-[26px] text-gray-900 mb-3">Check your email</h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-8">
                We've sent a password reset link to your email address. The link will expire in 1 hour.
              </p>
              <Link to="/login">
                <Button className="w-full h-12 bg-[#14181D] hover:bg-[#252b33] text-white font-medium rounded-full" data-testid="back-to-login-btn">
                  Back to Login
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <p className="lux-eyebrow mb-3">Account Recovery</p>
                <h2 className="font-display text-[26px] text-gray-900 mb-2">Forgot your password?</h2>
                <p className="text-gray-500 text-sm">Enter your email and we'll send you a reset link.</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@thcohq.com"
                      className="pl-11 h-12 bg-white border-[#EAE7E0] text-gray-900 placeholder:text-gray-400 focus:border-[#C6A15B] focus:ring-[#C6A15B]/20 rounded-full text-[14px]"
                      {...register("email")}
                      data-testid="forgot-email-input"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-red-500 text-xs">{errors.email.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-[#14181D] hover:bg-[#252b33] text-white font-medium rounded-full"
                  disabled={isLoading}
                  data-testid="forgot-submit-btn"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </form>

              <Link
                to="/login"
                className="flex items-center justify-center gap-2 text-gray-400 hover:text-[#A9834E] mt-7 text-sm transition-colors"
                data-testid="back-to-login-link"
              >
                <ArrowLeft size={15} />
                Back to login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
