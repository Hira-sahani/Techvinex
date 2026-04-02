import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Building2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const EmployerLogin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    checkAccess(user.id).then((hasAccess) => {
      if (hasAccess) navigate("/employer/dashboard", { replace: true });
    });
  }, [user, navigate]);

  const checkAccess = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    return data?.some((r: any) => r.role === "employer" || r.role === "admin") ?? false;
  };

  const handleLogin = async () => {
    setError("");
    if (!email || !password) { setError("Please enter email and password"); return; }

    setLoading(true);
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const hasAccess = await checkAccess(data.user.id);
    if (!hasAccess) {
      await supabase.auth.signOut();
      setError("You don't have employer portal access. Contact your account manager.");
      setLoading(false);
      return;
    }

    toast.success("Welcome back!");
    navigate("/employer/dashboard");
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen bg-muted/30 flex items-center justify-center px-4">
      
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-xl p-8 md:p-10">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl gradient-cta flex items-center justify-center mb-4">
              <Building2 className="w-7 h-7 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Employer Portal</h1>
            <p className="text-sm text-muted-foreground mt-1">Invite-only access for approved companies</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
              <Input type="email" placeholder="employer@company.com" value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }} className="rounded-lg py-5" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  className="rounded-lg py-5 pr-10"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button onClick={handleLogin} disabled={loading}
              className="w-full rounded-lg py-5 text-sm font-semibold gradient-cta border-0 text-primary-foreground hover:opacity-90">
              {loading ? "Please wait..." : "Sign In"}
            </Button>
          </div>

          <div className="mt-6">
            <p className="text-xs text-muted-foreground text-center">
              This portal is invite-only. Contact your account manager for access.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployerLogin;
