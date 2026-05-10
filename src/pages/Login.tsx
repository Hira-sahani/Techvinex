import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, ArrowLeft, LogIn } from "lucide-react";

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [sentMode, setSentMode] = useState<null | "login" | "signup">(null);

  const validate = () => {
    if (!email) { setEmailError("Please enter your email"); return false; }
    if (!isValidEmail(email)) { setEmailError("Invalid email address"); return false; }
    setEmailError("");
    return true;
  };

  const sendMagicLink = async (mode: "login" | "signup") => {
    if (!validate()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: mode === "signup",
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    setLoading(false);
    if (error) {
      if (mode === "login" && /not.*found|signup.*disabled/i.test(error.message)) {
        setEmailError("No account found. Please sign up first.");
      } else if (mode === "signup" && /already|registered|exists/i.test(error.message)) {
        setEmailError("This email is already registered. Please log in.");
      } else {
        toast.error(error.message);
      }
      return;
    }
    setSentMode(mode);
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) toast.error("Google sign-in failed: " + error.message);
    } catch (e) {
      toast.error("Google sign-in failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  };

  if (sentMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm bg-card border border-border rounded-lg p-5 flex flex-col items-center text-center">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mb-3">
            <CheckCircle className="w-4 h-4 text-green-600" />
          </div>
          <h1 className="text-sm font-semibold mb-1">Check your inbox</h1>
          <p className="text-[10px] text-muted-foreground mb-4">
            We've sent a {sentMode === "signup" ? "sign-up" : "login"} link to{" "}
            <span className="text-foreground font-medium">{email}</span>.
          </p>
          <Button size="sm" className="w-full h-8 text-xs" onClick={() => setSentMode(null)}>
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
          <div className="mx-auto w-9 h-9 rounded-md bg-foreground flex items-center justify-center mb-3">
            <LogIn className="w-4 h-4 text-background" />
          </div>
          <h1 className="text-sm font-semibold text-foreground">Continue to Techvinex</h1>
          <p className="text-[10px] text-muted-foreground mt-0.5">Login or create your account</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <form onSubmit={(e) => { e.preventDefault(); sendMagicLink("login"); }} className="space-y-3">
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

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 text-sm font-medium bg-gradient-to-r from-primary to-primary/80 hover:opacity-90"
            >
              {loading ? "Please wait..." : "Login"}
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => sendMagicLink("signup")}
              className="w-full h-11 text-sm font-medium"
            >
              Sign Up
            </Button>
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
