import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Mail, Lock, Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { authAPI } from "../lib/api";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await authAPI.getMe();
        navigate("/dashboard", { replace: true });
      } catch (error) {
        // Not authenticated
      }
    };
    checkAuth();
  }, [navigate]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const response = await authAPI.login(data);
      toast.success(`Welcome back, ${response.name}!`);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      const message = error.response?.data?.detail || "Login failed";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Google sign-in is only offered once a real OAuth client is configured.
  // This previously redirected to auth.emergentagent.com -- a leftover from the
  // scaffolding tool -- which sent staff to a third-party sign-in page instead
  // of Crowther's own. Showing no button is better than showing a broken one.
  //
  // To enable: create an OAuth 2.0 Web client in the thco-crm Google Cloud
  // project, set REACT_APP_GOOGLE_CLIENT_ID, and implement the backend
  // /api/auth/google/callback token exchange.
  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
  const googleEnabled = Boolean(googleClientId);

  const handleGoogleLogin = () => {
    if (!googleEnabled) return;
    setIsGoogleLoading(true);
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

  return (
    <div className="min-h-screen flex bg-[#F7F6F3]">
      {/* Left Side — aurora editorial panel */}
      <div className="hidden lg:flex lg:w-[46%] relative overflow-hidden bg-[#0C0F13] flex-col justify-between p-14">
        {/* Aurora background image */}
        <img
          src="/login-aurora.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
        />
        {/* Dark gradient overlay for text legibility */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(160deg, rgba(8,12,16,0.78) 0%, rgba(8,12,16,0.55) 45%, rgba(8,12,16,0.82) 100%)" }}
        />
        {/* Subtle radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 60% at 30% 20%, rgba(198,161,91,0.10), transparent 60%)" }}
        />
        {/* Hairline frame */}
        <div className="absolute inset-6 border border-white/[0.06] rounded-2xl pointer-events-none" />

        {/* Brand */}
        <div className="relative z-10 flex items-center gap-3">
          <span className="w-9 h-9 rounded-md bg-[#0C0F13] border border-[#1FB58A]/30 flex items-center justify-center p-1.5">
            <img src="/crowther-icon.png" alt="Crowther" className="w-full h-full object-contain" />
          </span>
          <div>
            <p className="font-display text-white text-lg leading-none tracking-wide">Crowther</p>
            <p className="text-[8px] uppercase tracking-[0.4em] text-[#6B7280] mt-1">Delivery OS</p>
          </div>
        </div>

        {/* Headline */}
        <div className="relative z-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#C6A15B] mb-6">Internal Portal</p>
          <h1 className="font-display text-white text-[52px] leading-[1.08] mb-6">
            Human insight.<br />
            <em className="lux-gold-text not-italic">Amplified.</em>
          </h1>
          <p className="text-[#9AA0AB] text-[15px] leading-relaxed max-w-sm">
            One login for every business unit — clients, pipelines, talent, presentations, and the tools that run Crowther.
          </p>
        </div>

        {/* Footer line */}
        <div className="relative z-10 flex items-center text-[10px] uppercase tracking-[0.25em] text-[#5C626D]">
          <span>Crowther &copy; {new Date().getFullYear()}</span>
        </div>
      </div>

      {/* Right Side — porcelain form */}
      <div className="w-full lg:w-[54%] flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-[400px]">
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
            <span className="w-9 h-9 rounded-md bg-[#0C0F13] border border-[#1FB58A]/30 flex items-center justify-center p-1.5">
              <img src="/crowther-icon.png" alt="Crowther" className="w-full h-full object-contain" />
            </span>
            <p className="font-display text-gray-900 text-xl tracking-wide">Crowther</p>
          </div>

          <div className="mb-9">
            <p className="lux-eyebrow mb-3">Welcome back</p>
            <h2 className="font-display text-[32px] text-gray-900 leading-tight mb-2">Sign in to the portal</h2>
            <p className="text-gray-500 text-sm">Enter your credentials to continue.</p>
          </div>

          {/* Google Login — hidden until an OAuth client is configured */}
          {googleEnabled && (
          <Button
            variant="outline"
            className="w-full mb-7 h-12 bg-white border-[#EAE7E0] text-gray-700 hover:bg-[#FBFAF7] hover:border-[#DCD5C6] rounded-full font-medium shadow-sm text-[14px]"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            data-testid="google-login-btn"
          >
            {isGoogleLoading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Continue with Google
          </Button>
          )}

          {/* The "or" divider only makes sense when there is an alternative
              sign-in method above it. */}
          {googleEnabled && (
          <div className="relative mb-7">
            <div className="lux-divider" />
            <span className="absolute left-1/2 -translate-x-1/2 -top-2 bg-[#F7F6F3] px-4 text-[10px] text-gray-400 uppercase tracking-[0.3em]">or</span>
          </div>
          )}

          {/* Email/Password Form */}
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
                  data-testid="login-email-input"
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-xs">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-gray-400 hover:text-[#A9834E] transition-colors"
                  data-testid="forgot-password-link"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="pl-11 pr-11 h-12 bg-white border-[#EAE7E0] text-gray-900 placeholder:text-gray-400 focus:border-[#C6A15B] focus:ring-[#C6A15B]/20 rounded-full text-[14px]"
                  {...register("password")}
                  data-testid="login-password-input"
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

            <Button
              type="submit"
              className="w-full h-12 bg-[#14181D] hover:bg-[#252b33] text-white font-medium rounded-full text-[14px] tracking-wide"
              disabled={isLoading}
              data-testid="login-submit-btn"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
