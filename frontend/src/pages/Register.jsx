import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Mail, Lock, User, Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { authAPI } from "../lib/api";
import { toast } from "sonner";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const { register: registerField, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const response = await authAPI.register({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      toast.success(`Welcome, ${response.name}! Your account has been created.`);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      const message = error.response?.data?.detail || "Registration failed";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Mirrors Login.jsx: only offered once a real OAuth client is configured.
  // Previously redirected to auth.emergentagent.com, a scaffolding leftover.
  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
  const googleEnabled = Boolean(googleClientId);

  const handleGoogleLogin = () => {
    if (!googleEnabled) return;
    const params = new URLSearchParams({
      client_id: googleClientId,
      redirect_uri: `${window.location.origin}/auth/google/callback`,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "select_account",
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  };

  const fieldClass =
    "pl-11 h-12 bg-white border-[#EAE7E0] text-gray-900 placeholder:text-gray-400 focus:border-[#C6A15B] focus:ring-[#C6A15B]/20 rounded-full text-[14px]";
  const labelClass = "text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500";

  return (
    <div className="min-h-screen flex bg-[#F7F6F3]">
      {/* Left Side — ink editorial panel */}
      <div className="hidden lg:flex lg:w-[46%] relative overflow-hidden bg-[#0C0F13] flex-col justify-between p-14">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 60% at 30% 20%, rgba(198,161,91,0.08), transparent 60%)" }}
        />
        <div className="absolute inset-6 border border-white/[0.06] rounded-2xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          <span className="w-9 h-9 rounded-md bg-gradient-to-br from-[#C6A15B] to-[#8F7340] flex items-center justify-center">
            <span className="font-display text-[#0C0F13] text-base font-semibold">T</span>
          </span>
          <div>
            <p className="font-display text-white text-lg leading-none tracking-wide">THCO</p>
            <p className="text-[8px] uppercase tracking-[0.4em] text-[#6B7280] mt-1">Control Room</p>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#C6A15B] mb-6">New Account</p>
          <h1 className="font-display text-white text-[52px] leading-[1.08] mb-6">
            Join the<br />
            <em className="lux-gold-text not-italic">team.</em>
          </h1>
          <p className="text-[#9AA0AB] text-[15px] leading-relaxed max-w-sm">
            Access AI-powered tools to amplify your work across all business units.
          </p>
        </div>

        <div className="relative z-10 flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-[#5C626D]">
          <span>THCO &copy; {new Date().getFullYear()}</span>
          <span>Eleven Units · One Room</span>
        </div>
      </div>

      {/* Right Side — porcelain form */}
      <div className="w-full lg:w-[54%] flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-[400px]">
          <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
            <span className="w-9 h-9 rounded-md bg-gradient-to-br from-[#C6A15B] to-[#8F7340] flex items-center justify-center">
              <span className="font-display text-[#0C0F13] text-base font-semibold">T</span>
            </span>
            <p className="font-display text-gray-900 text-xl tracking-wide">THCO</p>
          </div>

          <div className="mb-8">
            <p className="lux-eyebrow mb-3">Get Started</p>
            <h2 className="font-display text-[32px] text-gray-900 leading-tight mb-2">Create your account</h2>
            <p className="text-gray-500 text-sm">Join the THCO internal portal.</p>
          </div>

          {googleEnabled && (
          <Button
            variant="outline"
            className="w-full mb-7 h-12 bg-white border-[#EAE7E0] text-gray-700 hover:bg-[#FBFAF7] hover:border-[#DCD5C6] rounded-full font-medium shadow-sm text-[14px]"
            onClick={handleGoogleLogin}
            data-testid="google-register-btn"
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>
          )}

          {googleEnabled && (
          <div className="relative mb-7">
            <div className="lux-divider" />
            <span className="absolute left-1/2 -translate-x-1/2 -top-2 bg-[#F7F6F3] px-4 text-[10px] text-gray-400 uppercase tracking-[0.3em]">or</span>
          </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className={labelClass}>Full Name</Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  className={fieldClass}
                  {...registerField("name")}
                  data-testid="register-name-input"
                />
              </div>
              {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className={labelClass}>Email</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@thcohq.com"
                  className={fieldClass}
                  {...registerField("email")}
                  data-testid="register-email-input"
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className={labelClass}>Password</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  className={`${fieldClass} pr-11`}
                  {...registerField("password")}
                  data-testid="register-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs">{errors.password.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className={labelClass}>Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  className={`${fieldClass} pr-11`}
                  {...registerField("confirmPassword")}
                  data-testid="register-confirm-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-red-500 text-xs">{errors.confirmPassword.message}</p>}
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-[#14181D] hover:bg-[#252b33] text-white font-medium mt-2 rounded-full text-[14px] tracking-wide"
              disabled={isLoading}
              data-testid="register-submit-btn"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating account…
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-7">
            Already have an account?{" "}
            <Link to="/login" className="text-gray-900 border-b border-[#C6A15B] pb-0.5 hover:text-[#A9834E] font-medium transition-colors" data-testid="login-link">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
