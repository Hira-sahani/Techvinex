import BrandLogo from "@/components/BrandLogo";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { signInWithGooglePopup } from "@/lib/googleOAuth";
import { ArrowLeft, Eye, EyeOff, CheckCircle } from "lucide-react";

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const Login = () => {
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showCheckInbox, setShowCheckInbox] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const validate = (mode: "login" | "signup") => {
    let ok = true;
    if (!email) { setEmailError("Please enter your email"); ok = false; }
    else if (!isValidEmail(email)) { setEmailError("Invalid email address"); ok = false; }
    else setEmailError("");
    if (mode === "login") {
      if (!password) { setPasswordError("Please enter your password"); ok = false; }
      else setPasswordError("");
    } else {
      setPasswordError("");
    }
    return ok;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate("login")) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      if (/invalid|credentials/i.test(error.message)) setPasswordError("Invalid email or password");
      else if (/confirm/i.test(error.message)) toast.error("Please confirm your email before logging in.");
      else toast.error(error.message);
      return;
    }
    toast.success("Logged in successfully!");
    navigate("/");
  };

  const handleSignup = async () => {
    if (!validate("signup")) return;
    setLoading(true);
    // Passwordless signup via email confirmation link.
    // The Magic Link email template in Supabase must use {{ .ConfirmationURL }}
    // (not {{ .Token }}) so users receive a clickable link rather than a code.
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      if (/registered|exists/i.test(error.message)) toast.error("This email is already registered. Try logging in.");
      else toast.error(error.message);
      return;
    }
    setShowCheckInbox(true);
  };


  const handleForgotPassword = async () => {
    if (!email) { toast.error("Please enter your email first"); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else setResetEmailSent(true);
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const result = await signInWithGooglePopup({ prompt: "select_account" });
      if (result.error) {
        toast.error("Google sign-in failed: " + (result.error.message || String(result.error)));
      }
    } catch (e) {
      toast.error("Google sign-in failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  };


  if (resetEmailSent || showCheckInbox) {
    const isReset = resetEmailSent;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm bg-card border border-border rounded-lg p-5 flex flex-col items-center text-center">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mb-3">
            <CheckCircle className="w-4 h-4 text-green-600" />
          </div>
          <h1 className="text-sm font-semibold mb-1">Check your inbox</h1>
          <p className="text-[11px] text-muted-foreground mb-4">
            {isReset ? "We've sent you a password reset link." : (
              <>We've sent a confirmation link to <span className="text-foreground font-medium">{email}</span>.</>
            )}
          </p>
          <Button size="sm" className="w-full h-9 text-xs"
            onClick={() => { setResetEmailSent(false); setShowCheckInbox(false); }}>
            Got it
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <button type="button" onClick={() => navigate("/explore")}
          className="flex items-center gap-1 px-2 py-1 mb-4 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={12} /> Back
        </button>

        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex justify-center">
            <BrandLogo size={48} className="h-12 w-12" />
          </div>
          <h1 className="text-sm font-semibold text-foreground">Continue to Techvinex</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">Login or create your account</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <form onSubmit={authMode === "login" ? handleLogin : (e) => { e.preventDefault(); handleSignup(); }} className="space-y-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Email address</Label>
                {emailError && <span className="text-[10px] text-destructive">{emailError}</span>}
              </div>
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                placeholder="your@email.com"
                required
                className={`h-10 text-sm ${emailError ? "border-destructive" : ""}`}
              />
            </div>

            {(authMode === "login" || authMode === "signup") && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Password</Label>
                  {passwordError && <span className="text-[10px] text-destructive">{passwordError}</span>}
                </div>
                <div className="relative">
                  <Input
                    type={passwordVisible ? "text" : "password"}
                    value={password}
                    autoComplete={authMode === "login" ? "current-password" : "new-password"}
                    onChange={(e) => { setPassword(e.target.value); setPasswordError(""); }}
                    placeholder={authMode === "signup" ? "At least 8 characters" : "••••••••"}
                    className={`h-10 text-sm pr-9 ${passwordError ? "border-destructive" : ""}`}
                  />
                  <button type="button" onClick={() => setPasswordVisible(!passwordVisible)}
                    aria-label={passwordVisible ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {passwordVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {authMode === "login" && (
                  <button type="button" onClick={handleForgotPassword}
                    className="text-[11px] text-primary hover:underline block text-right pt-0.5">
                    Forgot password?
                  </button>
                )}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 text-sm font-medium bg-gradient-to-r from-primary to-primary/80 hover:opacity-90"
            >
              {loading ? "Please wait..." : authMode === "login" ? "Login" : "Sign Up"}
            </Button>

            {authMode === "login" ? (
              <Button
                type="button"
                variant="secondary"
                disabled={loading}
                className="w-full h-11 text-sm font-medium"
                onClick={() => { setAuthMode("signup"); setEmailError(""); setPasswordError(""); }}
              >
                Sign Up
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                className="w-full h-11 text-sm font-medium"
                onClick={() => { setAuthMode("login"); setEmailError(""); setPasswordError(""); }}
              >
                Login
              </Button>
            )}
          </form>

          <div className="flex items-center gap-2 my-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">Or continue with</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <Button variant="outline" className="w-full h-11 text-sm" disabled={loading} onClick={handleGoogle}>
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          By signing in, you agree to our{" "}
          <a href="/terms" className="underline text-foreground">Worker Terms of Service</a>.
        </p>
      </div>
    </div>
  );
};

export default Login;
