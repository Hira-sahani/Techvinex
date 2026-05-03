import { useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ProfileTabSkeleton } from "@/components/skeletons/PageSkeletons";

const timeOptions = ["Full-time", "Part-time", "Flexible"];
const startOptions = ["Immediately", "In 1-2 weeks", "In 1 month", "In 2+ months"];

interface AvailabilityForm {
  availability: string;
  startDate: string;
  hoursPerWeek: string;
}

const emptyForm: AvailabilityForm = { availability: "", startDate: "", hoursPerWeek: "" };

const ProfileAvailabilityTab = () => {
  const { user } = useAuth();
  const [form, setForm] = useState<AvailabilityForm>(emptyForm);
  const [initialForm, setInitialForm] = useState<AvailabilityForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!user) { if (isMounted) setLoading(false); return; }
      const { data } = await supabase.from("profiles").select("work_experience").eq("user_id", user.id).maybeSingle();
      if (data?.work_experience && isMounted) {
        const we = data.work_experience as Record<string, string>;
        const next: AvailabilityForm = {
          availability: we.availability_type ?? "",
          startDate: we.start_date ?? "",
          hoursPerWeek: we.hours_per_week ?? "",
        };
        setForm(next);
        setInitialForm(next);
        if (next.availability || next.startDate || next.hoursPerWeek) setEditMode(false);
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

    // We store availability data inside work_experience JSON field
    const { data: existing } = await supabase.from("profiles").select("work_experience").eq("user_id", user.id).maybeSingle();
    const currentWe = (existing?.work_experience as Record<string, unknown>) ?? {};

    const { error } = await supabase.from("profiles").update({
      availability_set: true,
      work_experience: {
        ...currentWe,
        availability_type: form.availability,
        start_date: form.startDate,
        hours_per_week: form.hoursPerWeek,
      } as unknown as import("@/integrations/supabase/types").Json,
    }).eq("user_id", user.id);

    setSaving(false);
    if (error) { toast.error(`Save failed: ${error.message}`); return; }
    setInitialForm({ ...form });
    setEditMode(false);
    toast.success("Availability saved.");
  };

  if (loading) return <ProfileTabSkeleton rows={3} loadingLabel="Loading availability" />;

  return (
    <div className="space-y-6 max-w-xl pb-24">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">Availability</h3>
        {!editMode && (
          <Button variant="outline" size="sm" onClick={() => setEditMode(true)} className="gap-1.5">
            <Pencil size={14} /> Edit
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-xs font-medium text-foreground mb-2">What type of work are you available for?</p>
          <div className="flex flex-wrap gap-2">
            {timeOptions.map((opt) => (
              <button key={opt} onClick={() => editMode && setForm((p) => ({ ...p, availability: opt }))} disabled={disabled}
                className={`px-4 py-2 rounded-lg text-xs font-medium border transition-colors ${form.availability === opt ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border hover:bg-secondary"} ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}>
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-foreground mb-2">When can you start?</p>
          <div className="flex flex-wrap gap-2">
            {startOptions.map((opt) => (
              <button key={opt} onClick={() => editMode && setForm((p) => ({ ...p, startDate: opt }))} disabled={disabled}
                className={`px-4 py-2 rounded-lg text-xs font-medium border transition-colors ${form.startDate === opt ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border hover:bg-secondary"} ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}>
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-foreground mb-2">Hours per week you can commit</p>
          <input type="number" value={form.hoursPerWeek} onChange={(e) => setForm((p) => ({ ...p, hoursPerWeek: e.target.value }))} placeholder="e.g. 40" disabled={disabled}
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

export default ProfileAvailabilityTab;
