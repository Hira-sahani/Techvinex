import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Building2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const EmployerLogin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { toast.error(error.message); setLoading(false); return; }

    const hasAccess = await checkAccess(data.user.id);
    if (!hasAccess) {
      await supabase.auth.signOut();
      toast.error("Access denied. Employer privileges required.");
      setLoading(false);
      return;
    }

    toast.success("Welcome back!");
    navigate("/employer/dashboard");
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="mx-auto w-9 h-9 rounded-md bg-primary flex items-center justify-center mb-3">
            <Building2 className="w-4 h-4 text-primary-foreground" />
          </div>
          <h1 className="text-sm font-semibold text-foreground">Employer Portal</h1>
          <p className="text-[10px] text-muted-foreground mt-0.5">Invite-only access for approved companies</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <form onSubmit={handleLogin} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="employer@company.com" required className="h-8 text-xs bg-muted/30 border-transparent focus-visible:border-border" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Password</Label>
              <div className="relative">
                <Input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className="h-8 text-xs pr-8 bg-muted/30 border-transparent focus-visible:border-border" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={loading} size="sm" className="w-full h-8 text-xs mt-1">
              {loading ? "Please wait..." : "Sign In"}
            </Button>
          </form>
          <p className="text-[10px] text-muted-foreground text-center mt-3">
            This portal is invite-only. Contact your account manager for access.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmployerLogin;
