import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, ShieldAlert } from "lucide-react";
import { checkPasswordStrength, checkLeakedPassword } from "@/lib/passwordSecurity";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    // Check URL hash for recovery type
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      toast.error("Please fill in both fields");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    const strength = checkPasswordStrength(password);
    if (!strength.isStrong) {
      toast.error(strength.errors[0]);
      return;
    }
    // Leaked password check
    setLoading(true);
    const leaked = await checkLeakedPassword(password);
    if (leaked.leaked) {
      setLoading(false);
      toast.error(`This password has been found in ${leaked.count.toLocaleString()} data breaches. Please choose a different one.`, { icon: <ShieldAlert className="w-5 h-5 text-destructive" /> });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md bg-card rounded-2xl shadow-xl p-10 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-5">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">Password Updated</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Your password has been reset successfully. You can now log in.
          </p>
          <Button
            className="w-full rounded-lg py-5 text-sm font-semibold gradient-cta border-0 text-primary-foreground hover:opacity-90"
            onClick={() => navigate("/login")}
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-xl p-10">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mb-5">
            <span className="text-4xl font-bold text-primary-foreground">X</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Reset Password
          </h1>
          {!isRecovery && (
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Click the link in your email to activate this form.
            </p>
          )}
        </div>

        <form onSubmit={handleReset} className="space-y-6">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">New Password</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg py-5 bg-background border-border"
              disabled={!isRecovery}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Confirm Password</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="rounded-lg py-5 bg-background border-border"
              disabled={!isRecovery}
            />
          </div>
          <Button
            type="submit"
            disabled={loading || !isRecovery}
            className="w-full rounded-lg py-5 text-sm font-semibold gradient-cta border-0 text-primary-foreground hover:opacity-90"
          >
            {loading ? <span className="inline-flex items-center gap-2"><span className="jetra-loader w-4 h-4 text-primary-foreground"><span className="jetra-loader__line jetra-loader__line--first w-3 !h-[2px]" /><span className="jetra-loader__line jetra-loader__line--second w-3 !h-[2px]" /></span> Please wait...</span> : "Update Password"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => navigate("/login")}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground mt-6 transition-colors"
        >
          ← Back to Login
        </button>
      </div>
    </div>
  );
};

export default ResetPassword;
