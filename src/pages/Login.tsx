import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { CheckCircle, ShieldAlert, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { checkPasswordStrength, checkLeakedPassword } from "@/lib/passwordSecurity";

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCheckInbox, setShowCheckInbox] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Please enter your email first");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setResetEmailSent(true);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      if (!password) setPasswordError("Please enter your password");
      return;
    }
    setPasswordError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setPasswordError("Invalid email or password");
    } else {
      toast.success("Logged in successfully!");
    }
  };

  const handleSignUp = async () => {
    if (!email) {
      setEmailError("Please enter your email");
      return;
    }
    if (!isValidEmail(email)) {
      setEmailError("Invalid email address");
      return;
    }
    setEmailError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
        shouldCreateUser: true,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setIsSignUp(true);
      setShowCheckInbox(true);
    }
  };

  const handleLoginClick = async () => {
    if (!email) {
      setEmailError("Please enter your email");
      return;
    }
    if (!isValidEmail(email)) {
      setEmailError("Invalid email address");
      return;
    }
    setEmailError("");
    if (!showPassword) {
      setIsSignUp(false);
      setShowPassword(true);
      return;
    }
    await handleLogin();
  };

  if (resetEmailSent) {
    return (
      <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md bg-card rounded-2xl shadow-xl p-10 mb-6 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-5">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">Check your inbox</h1>
          <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
            We've sent you a password reset link.<br />
            Please check your email to continue.
          </p>
          <Button
            className="w-full rounded-lg py-5 text-sm font-semibold gradient-cta border-0 text-primary-foreground hover:opacity-90"
            onClick={() => {
              setResetEmailSent(false);
              setShowForgotPassword(false);
              setShowPassword(false);
            }}
          >
            Got it
          </Button>
        </div>
      </div>
    );
  }

  if (showCheckInbox) {
    return (
      <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md bg-card rounded-2xl shadow-xl p-10 mb-6 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-5">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">Check your inbox</h1>
          <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
            We've sent you an activation link. Please check your email<br />
            and login with magic link.
          </p>
          <Button
            className="w-full rounded-lg py-5 text-sm font-semibold gradient-cta border-0 text-primary-foreground hover:opacity-90"
            onClick={() => {
              setShowCheckInbox(false);
              setShowPassword(false);
              setPassword("");
              setIsSignUp(false);
            }}
          >
            Got it
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          By signing in, <a href="/terms" className="underline text-foreground">you agree to our Worker Terms of Service</a>.
        </p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-muted/30 flex flex-col items-center justify-center px-4">
      {loading && <JetraLoader />}
      <div className="w-full max-w-md">
        <button
          type="button"
          onClick={() => navigate("/explore")}
          className="flex items-center gap-1.5 px-3 py-1.5 mb-4 rounded-lg bg-secondary text-foreground text-sm font-medium hover:bg-primary/15 hover:text-primary active:bg-primary/25 active:text-primary transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="bg-card rounded-2xl shadow-xl p-10 mb-6">
          <div className="flex flex-col items-center mb-10">
            <div className="flex gap-1.5 mb-5" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  className="w-2.5 h-2.5 rounded-full bg-primary/40"
                  style={{ opacity: i === 5 ? 1 : 0.5 }}
                />
              ))}
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Continue to Jetra
            </h1>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">Email address</label>
                {emailError && (
                  <span className="text-xs text-destructive">{emailError}</span>
                )}
              </div>
              <Input
                type="text"
                inputMode="email"
                autoComplete="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                className={`rounded-lg py-5 bg-background ${emailError ? "border-destructive" : "border-border"}`}
              />
            </div>

            {showPassword && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground">Password</label>
                  {passwordError && (
                    <span className="text-xs text-destructive">{passwordError}</span>
                  )}
                </div>
                <div className="relative">
                  <Input
                    type={passwordVisible ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setPasswordError(""); }}
                    className={`rounded-lg py-5 pr-10 bg-background ${passwordError ? "border-destructive" : "border-border"}`}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setPasswordVisible(!passwordVisible)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {passwordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-primary hover:underline mt-1.5 block text-right"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button
              type="button"
              disabled={loading}
              className="w-full rounded-lg py-5 text-sm font-semibold gradient-cta border-0 text-primary-foreground hover:opacity-90"
              onClick={handleLoginClick}
            >
              {loading && !isSignUp ? "Please wait..." : "Login"}
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={loading}
              className="w-full rounded-lg py-5 text-sm font-semibold border-border"
              onClick={handleSignUp}
            >
              {loading && isSignUp ? "Please wait..." : "Sign Up"}
            </Button>
          </div>

          <div className="flex items-center gap-3 my-8">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">Or continue with</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="flex gap-4">
            <Button
              variant="outline"
              className="flex-1 rounded-lg py-5 text-sm font-medium border-border"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                const { error } = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: window.location.origin,
                });
                setLoading(false);
                if (error) {
                  toast.error("Google sign-in failed: " + (error as Error).message);
                }
              }}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </Button>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        By signing in, <a href="/terms" className="underline text-foreground">you agree to our Worker Terms of Service</a>.
      </p>
    </div>
  );
};

export default Login;
