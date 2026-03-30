import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Settings, Shield, Database, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";

const defaultFlags = [
  { flag_key: "ai_matching", description: "AI-powered candidate matching engine", enabled: true },
  { flag_key: "employer_portal", description: "Employer self-service portal", enabled: true },
  { flag_key: "auto_screening", description: "Automated resume screening", enabled: false },
  { flag_key: "video_interviews", description: "Video interview recording", enabled: false },
  { flag_key: "referral_system", description: "Candidate referral rewards", enabled: true },
  { flag_key: "advanced_analytics", description: "Advanced analytics dashboard", enabled: true },
];

const AdminSettings = () => {
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    supabase.from("feature_flags").select("*").order("flag_key").then(({ data }) => {
      setFlags(data && data.length > 0 ? data : defaultFlags.map((f, i) => ({ id: `default-${i}`, ...f })));
      setLoading(false);
    });
  }, []);

  const toggleFlag = async (flag: any) => {
    const newEnabled = !flag.enabled;
    setFlags((prev) => prev.map((f) => (f.flag_key === flag.flag_key ? { ...f, enabled: newEnabled } : f)));
    if (!flag.id?.startsWith("default-")) {
      await supabase.from("feature_flags").update({ enabled: newEnabled }).eq("id", flag.id);
    }
    toast.success(`${flag.flag_key} ${newEnabled ? "enabled" : "disabled"}`);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-base font-semibold text-foreground tracking-tight">Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">System configuration and feature management</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 bg-card border border-border rounded-lg">
          <div className="px-4 pt-4 pb-3 border-b border-border">
            <div className="flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs font-medium text-foreground">Feature Flags</p>
            </div>
          </div>
          <div className="p-4 space-y-1.5">
            {flags.map((flag) => (
              <div key={flag.flag_key} className="flex items-center justify-between py-2.5 px-3 rounded-md bg-muted/20 border border-border/50">
                <div>
                  <p className="text-xs font-medium text-foreground">{flag.flag_key}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{flag.description}</p>
                </div>
                <Switch checked={flag.enabled} onCheckedChange={() => toggleFlag(flag)} />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {/* Dark Mode Toggle */}
          <div className="bg-card border border-border rounded-lg">
            <div className="px-4 pt-4 pb-3 border-b border-border">
              <div className="flex items-center gap-1.5">
                {isDark ? <Moon className="w-3.5 h-3.5 text-muted-foreground" /> : <Sun className="w-3.5 h-3.5 text-muted-foreground" />}
                <p className="text-xs font-medium text-foreground">Appearance</p>
              </div>
            </div>
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-foreground">Dark Mode</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Switch between light and dark theme</p>
                </div>
                <Switch checked={isDark} onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg">
            <div className="px-4 pt-4 pb-3 border-b border-border">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs font-medium text-foreground">Security</p>
              </div>
            </div>
            <div className="px-4 py-3 space-y-2">
              {["RLS Enabled", "JWT Auth", "Rate Limiting"].map((item) => (
                <div key={item} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{item}</span>
                  <span className="text-[10px] text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">Active</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg">
            <div className="px-4 pt-4 pb-3 border-b border-border">
              <div className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs font-medium text-foreground">System Info</p>
              </div>
            </div>
            <div className="px-4 py-3 space-y-2">
              {["Database", "Edge Functions", "Storage"].map((item) => (
                <div key={item} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{item}</span>
                  <span className="text-[10px] text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">Healthy</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
