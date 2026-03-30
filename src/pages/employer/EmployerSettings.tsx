import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, Bell, Shield, Save, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useTheme } from "next-themes";

const EmployerSettings = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  const [company, setCompany] = useState({ name: "Jetra X", industry: "Technology", size: "50-200", website: "" });
  const [notifs, setNotifs] = useState({ newCandidates: true, interviewReminders: true, aiScoring: true, billing: true, weeklyDigest: false });

  const handleSave = () => {
    toast.success("Settings saved");
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your company profile and preferences</p>
      </div>

      {/* Company Profile */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-card space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Building2 size={18} className="text-primary" />
          <h2 className="text-base font-semibold text-foreground">Company Profile</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Company Name</label>
            <Input value={company.name} onChange={e => setCompany({ ...company, name: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Industry</label>
            <Input value={company.industry} onChange={e => setCompany({ ...company, industry: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Company Size</label>
            <select value={company.size} onChange={e => setCompany({ ...company, size: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground">
              <option value="1-10">1-10</option>
              <option value="11-50">11-50</option>
              <option value="50-200">50-200</option>
              <option value="200-1000">200-1000</option>
              <option value="1000+">1000+</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Website</label>
            <Input value={company.website} onChange={e => setCompany({ ...company, website: e.target.value })} placeholder="https://..." />
          </div>
        </div>
        <div className="text-xs text-muted-foreground">Logged in as: {user?.email}</div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-card space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Bell size={18} className="text-primary" />
          <h2 className="text-base font-semibold text-foreground">Notification Preferences</h2>
        </div>
        {[
          { key: "newCandidates" as const, label: "New candidate applications", desc: "Get notified when someone applies" },
          { key: "interviewReminders" as const, label: "Interview reminders", desc: "Reminders before scheduled interviews" },
          { key: "aiScoring" as const, label: "AI scoring complete", desc: "When AI finishes scoring candidates" },
          { key: "billing" as const, label: "Billing updates", desc: "Payment and invoice notifications" },
          { key: "weeklyDigest" as const, label: "Weekly digest", desc: "Summary of hiring activity" },
        ].map(item => (
          <div key={item.key} className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <Switch checked={notifs[item.key]} onCheckedChange={v => setNotifs({ ...notifs, [item.key]: v })} />
          </div>
        ))}
      </div>

      {/* Appearance */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-card">
        <div className="flex items-center gap-2 mb-3">
          {isDark ? <Moon size={18} className="text-primary" /> : <Sun size={18} className="text-primary" />}
          <h2 className="text-base font-semibold text-foreground">Appearance</h2>
        </div>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium text-foreground">Dark Mode</p>
            <p className="text-xs text-muted-foreground">Switch between light and dark theme</p>
          </div>
          <Switch checked={isDark} onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} />
        </div>
      </div>

      {/* Security */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={18} className="text-primary" />
          <h2 className="text-base font-semibold text-foreground">Security</h2>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-foreground">Two-factor authentication</p>
              <p className="text-xs text-muted-foreground">Add an extra layer of security</p>
            </div>
            <Button variant="outline" size="sm" className="text-xs">Enable</Button>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-foreground">Change password</p>
              <p className="text-xs text-muted-foreground">Update your login password</p>
            </div>
            <Button variant="outline" size="sm" className="text-xs">Change</Button>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="gradient-cta text-primary-foreground border-0 gap-2">
          <Save size={16} /> Save Settings
        </Button>
      </div>
    </div>
  );
};

export default EmployerSettings;
