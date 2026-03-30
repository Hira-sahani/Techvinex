import { useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CommsForm {
  emailNotifs: boolean;
  jobAlerts: boolean;
  referralUpdates: boolean;
  marketingEmails: boolean;
}

const defaultForm: CommsForm = { emailNotifs: true, jobAlerts: true, referralUpdates: true, marketingEmails: false };

const ProfileCommunicationsTab = () => {
  const { user } = useAuth();
  const [form, setForm] = useState<CommsForm>(defaultForm);
  const [initialForm, setInitialForm] = useState<CommsForm>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!user) { if (isMounted) setLoading(false); return; }
      const { data } = await supabase.from("profiles").select("work_experience").eq("user_id", user.id).maybeSingle();
      if (data?.work_experience && isMounted) {
        const we = data.work_experience as Record<string, unknown>;
        if (we.comms_prefs) {
          const cp = we.comms_prefs as Record<string, boolean>;
          const next: CommsForm = {
            emailNotifs: cp.emailNotifs ?? true,
            jobAlerts: cp.jobAlerts ?? true,
            referralUpdates: cp.referralUpdates ?? true,
            marketingEmails: cp.marketingEmails ?? false,
          };
          setForm(next);
          setInitialForm(next);
          setEditMode(false);
        }
      }
      if (isMounted) setLoading(false);
    };
    void load();
    return () => { isMounted = false; };
  }, [user]);

  const hasChanges = useMemo(() => JSON.stringify(form) !== JSON.stringify(initialForm), [form, initialForm]);
  const disabled = loading || !editMode;

  const handleSave = async () => {
    if (!user) { toast.error("Please login first."); return; }
    setSaving(true);
    const { data: existing } = await supabase.from("profiles").select("work_experience").eq("user_id", user.id).maybeSingle();
    const currentWe = (existing?.work_experience as Record<string, unknown>) ?? {};
    const { error } = await supabase.from("profiles").update({
      work_experience: { ...currentWe, comms_prefs: form } as unknown as import("@/integrations/supabase/types").Json,
    }).eq("user_id", user.id);
    setSaving(false);
    if (error) { toast.error(`Save failed: ${error.message}`); return; }
    setInitialForm({ ...form });
    setEditMode(false);
    toast.success("Communication preferences saved.");
  };

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button onClick={() => editMode && onChange(!checked)} disabled={disabled}
      className={`w-10 h-6 rounded-full transition-colors relative ${checked ? "bg-primary" : "bg-border"} ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}>
      <div className={`w-4 h-4 rounded-full bg-primary-foreground absolute top-1 transition-transform ${checked ? "translate-x-5" : "translate-x-1"}`} />
    </button>
  );

  const items = [
    { label: "Email Notifications", desc: "Receive updates about your applications", key: "emailNotifs" as const },
    { label: "Job Alerts", desc: "Get notified about new matching opportunities", key: "jobAlerts" as const },
    { label: "Referral Updates", desc: "Updates on your referral status and earnings", key: "referralUpdates" as const },
    { label: "Marketing Emails", desc: "Promotional content and platform updates", key: "marketingEmails" as const },
  ];

  return (
    <div className="space-y-6 max-w-xl pb-24">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">Communication Preferences</h3>
        {!editMode && (
          <Button variant="outline" size="sm" onClick={() => setEditMode(true)} className="gap-1.5">
            <Pencil size={14} /> Edit
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <Toggle checked={form[item.key]} onChange={(v) => setForm((p) => ({ ...p, [item.key]: v }))} />
          </div>
        ))}
      </div>

      {editMode && (
        <Button type="button" onClick={handleSave} disabled={loading || saving || !hasChanges} className="w-full">
          {loading ? <span className="inline-flex items-center gap-2"><span className="jetra-loader w-4 h-4 text-primary-foreground"><span className="jetra-loader__line jetra-loader__line--first w-3 !h-[2px]" /><span className="jetra-loader__line jetra-loader__line--second w-3 !h-[2px]" /></span> Loading...</span> : saving ? "Saving..." : hasChanges ? "Save Changes" : "Saved"}
        </Button>
      )}
    </div>
  );
};

export default ProfileCommunicationsTab;
