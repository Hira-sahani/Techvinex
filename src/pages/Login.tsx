import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { CheckCircle, ArrowLeft, Eye, EyeOff, LogIn } from "lucide-react";

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

type Mode = "login" | "signup";

const Login = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCheckInbox, setShowCheckInbox] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const validate = () => {
    let ok = true;
    if (!email) { setEmailError("Please enter your email"); ok = false; }
    else if (!isValidEmail(email)) { setEmailError("Invalid email address"); ok = false; }
    else setEmailError("");
    if (!password) { setPasswordError("Please enter your password"); ok = false; }
    else if (mode === "signup" && password.length < 6) { setPasswordError("Password must be at least 6 characters"); ok = false; }
    else setPasswordError("");
    return ok;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        if (/invalid|credentials/i.test(error.message)) {
          setPasswordError("Invalid email or password");
        } else if (/confirm/i.test(error.message)) {
          toast.error("Please confirm your email before logging in.");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success("Logged in successfully!");
        navigate("/");
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/` },
      });
      setLoading(false);
      if (error) {
        if (/already|registered|exists/i.test(error.message)) {
          setEmailError("This email is already registered. Please log in.");
          setMode("login");
        } else {
          toast.error(error.message);
        }
      } else {
        setShowCheckInbox(true);
      }
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) toast.error("Google sign-in failed: " + (error as Error).message);
    } catch (e) {
      toast.error("Google sign-in failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  };

  if (resetEmailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm bg-card border border-border rounded-lg p-5 flex flex-col items-center text-center">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mb-3">
            <CheckCircle className="w-4 h-4 text-green-600" />
          </div>
          <h1 className="text-sm font-semibold mb-1">Check your inbox</h1>
          <p className="text-[10px] text-muted-foreground mb-4">We've sent you a password reset link.</p>
          <Button size="sm" className="w-full h-8 text-xs" onClick={() => setResetEmailSent(false)}>Got it</Button>
        </div>
      </div>
    );
  }

  if (showCheckInbox) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm bg-card border border-border rounded-lg p-5 flex flex-col items-center text-center">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mb-3">
            <CheckCircle className="w-4 h-4 text-green-600" />
          </div>
          <h1 className="text-sm font-semibold mb-1">Confirm your email</h1>
          <p className="text-[10px] text-muted-foreground mb-4">
            We've sent a confirmation link to <span className="text-foreground font-medium">{email}</span>. Click it to activate your account, then log in.
          </p>
          <Button size="sm" className="w-full h-8 text-xs"
            onClick={() => { setShowCheckInbox(false); setMode("login"); setPassword(""); }}>
            Back to login
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
          <div className="mx-auto w-9 h-9 rounded-md bg-foreground flex items-center justify-center mb-3">
            <LogIn className="w-4 h-4 text-background" />
          </div>
          <h1 className="text-sm font-semibold text-foreground">Continue to Jetra</h1>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {mode === "login" ? "Sign in to your account" : "Create your account"}
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          {/* Mode tabs */}
          <div className="flex gap-1 mb-4 p-0.5 bg-muted/40 rounded-md">
            {(["login", "signup"] as Mode[]).map((m) => (
              <button key={m} type="button"
                onClick={() => { setMode(m); setEmailError(""); setPasswordError(""); }}
                className={`flex-1 h-7 text-[11px] font-medium rounded transition-colors ${
                  mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}>
                {m === "login" ? "Log in" : "Sign up"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Email</Label>
                {emailError && <span className="text-[10px] text-destructive">{emailError}</span>}
              </div>
              <Input type="email" inputMode="email" autoComplete="email" value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                placeholder="your@email.com" required
                className={`h-8 text-xs bg-muted/30 border-transparent focus-visible:border-border ${emailError ? "border-destructive" : ""}`} />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Password</Label>
                {passwordError && <span className="text-[10px] text-destructive">{passwordError}</span>}
              </div>
              <div className="relative">
                <Input type={passwordVisible ? "text" : "password"} value={password}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  onChange={(e) => { setPassword(e.target.value); setPasswordError(""); }}
                  placeholder="••••••••"
                  className={`h-8 text-xs pr-8 bg-muted/30 border-transparent focus-visible:border-border ${passwordError ? "border-destructive" : ""}`} />
                <button type="button" onClick={() => setPasswordVisible(!passwordVisible)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {passwordVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
              </div>
              {mode === "login" && (
                <button type="button" onClick={handleForgotPassword}
                  className="text-[10px] text-primary hover:underline block text-right">
                  Forgot password?
                </button>
              )}
            </div>

            <Button type="submit" disabled={loading} size="sm" className="w-full h-8 text-xs mt-1">
              {loading ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
            </Button>
          </form>

          <div className="flex items-center gap-2 my-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] text-muted-foreground">Or continue with</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <Button variant="outline" size="sm" className="w-full h-8 text-xs" disabled={loading} onClick={handleGoogle}>
            <svg className="w-3.5 h-3.5 mr-1.5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground text-center mt-3">
          By continuing, <a href="/terms" className="underline text-foreground">you agree to our Terms of Service</a>.
        </p>
      </div>
    </div>
  );
};

export default Login;
