import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { toast.error(error.message); setLoading(false); return; }
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    if (!roles?.some((r) => r.role === "admin")) { await supabase.auth.signOut(); toast.error("Access denied. Admin privileges required."); setLoading(false); return; }
    toast.success("Welcome back, Admin!");
    navigate("/admin/requirements");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="mx-auto w-9 h-9 rounded-md bg-foreground flex items-center justify-center mb-3">
            <Shield className="w-4 h-4 text-background" />
          </div>
          <h1 className="text-sm font-semibold text-foreground">Jetra X Admin</h1>
          <p className="text-[10px] text-muted-foreground mt-0.5">Sign in to control center</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <form onSubmit={handleLogin} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@yourapp.com" required className="h-8 text-xs bg-muted/30 border-transparent focus-visible:border-border" />
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
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </div>
        
      </div>
    </div>
  );
};

export default AdminLogin;
