import { useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ProfileTabSkeleton } from "@/components/skeletons/PageSkeletons";

const roleTypes = ["Contract", "Full-time", "Part-time", "Freelance"];
const workModes = ["Remote", "Hybrid", "On-site"];

interface WorkPrefsForm {
  selectedRoles: string[];
  selectedModes: string[];
  minPay: string;
}

const emptyForm: WorkPrefsForm = { selectedRoles: [], selectedModes: [], minPay: "" };

const ProfileWorkPrefsTab = () => {
  const { user } = useAuth();
  const [form, setForm] = useState<WorkPrefsForm>(emptyForm);
  const [initialForm, setInitialForm] = useState<WorkPrefsForm>(emptyForm);
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
        const next: WorkPrefsForm = {
          selectedRoles: (we.pref_roles as string[]) ?? [],
          selectedModes: (we.pref_modes as string[]) ?? [],
          minPay: (we.min_pay as string) ?? "",
        };
        setForm(next);
        setInitialForm(next);
        if (next.selectedRoles.length || next.selectedModes.length || next.minPay) setEditMode(false);
      }
      if (isMounted) setLoading(false);
    };
    void load();
    return () => { isMounted = false; };
  }, [user]);

  const hasChanges = useMemo(() => JSON.stringify(form) !== JSON.stringify(initialForm), [form, initialForm]);
  const disabled = loading || !editMode;

  const toggle = (arr: string[], val: string) => arr.includes(val) ? arr.filter((a) => a !== val) : [...arr, val];

  const handleSave = async () => {
    if (!user) { toast.error("Please login first."); return; }
    setSaving(true);
    const { data: existing } = await supabase.from("profiles").select("work_experience").eq("user_id", user.id).maybeSingle();
    const currentWe = (existing?.work_experience as Record<string, unknown>) ?? {};
    const { error } = await supabase.from("profiles").update({
      work_experience: { ...currentWe, pref_roles: form.selectedRoles, pref_modes: form.selectedModes, min_pay: form.minPay } as unknown as import("@/integrations/supabase/types").Json,
    }).eq("user_id", user.id);
    setSaving(false);
    if (error) { toast.error(`Save failed: ${error.message}`); return; }
    setInitialForm({ ...form });
    setEditMode(false);
    toast.success("Work preferences saved.");
  };

  if (loading) return <ProfileTabSkeleton rows={3} loadingLabel="Loading work preferences" />;

  return (
    <div className="space-y-6 max-w-xl pb-24">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">Work Preferences</h3>
        {!editMode && (
          <Button variant="outline" size="sm" onClick={() => setEditMode(true)} className="gap-1.5">
            <Pencil size={14} /> Edit
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-xs font-medium text-foreground mb-2">What type of roles interest you?</p>
          <div className="flex flex-wrap gap-2">
            {roleTypes.map((r) => (
              <button key={r} onClick={() => editMode && setForm((p) => ({ ...p, selectedRoles: toggle(p.selectedRoles, r) }))} disabled={disabled}
                className={`px-4 py-2 rounded-lg text-xs font-medium border transition-colors ${form.selectedRoles.includes(r) ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border hover:bg-secondary"} ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}>
                {r}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-foreground mb-2">Preferred work mode</p>
          <div className="flex flex-wrap gap-2">
            {workModes.map((m) => (
              <button key={m} onClick={() => editMode && setForm((p) => ({ ...p, selectedModes: toggle(p.selectedModes, m) }))} disabled={disabled}
                className={`px-4 py-2 rounded-lg text-xs font-medium border transition-colors ${form.selectedModes.includes(m) ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border hover:bg-secondary"} ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}>
                {m}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-foreground mb-2">Minimum hourly pay (USD)</p>
          <input type="number" value={form.minPay} onChange={(e) => setForm((p) => ({ ...p, minPay: e.target.value }))} placeholder="e.g. 50" disabled={disabled}
            className={`h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring ${disabled ? "opacity-60 cursor-not-allowed" : ""}`} />
        </div>
      </div>

      {editMode && (
        <Button type="button" onClick={handleSave} disabled={loading || saving || !hasChanges} className="w-full">
          {loading ? <span className="inline-flex items-center gap-2"><span className="loader-cluster gap-1" role="status" aria-label="Loading">{[0, 0.1, 0.2, 0.3, 0.4, 0.5].map((d, i) => (<span key={i} className="loader-dot loader-dot--sm" style={{ animationDelay: `${d}s` }} />))}</span> Loading...</span> : saving ? "Saving..." : hasChanges ? "Save Changes" : "Saved"}
        </Button>
      )}
    </div>
  );
};

export default ProfileWorkPrefsTab;
