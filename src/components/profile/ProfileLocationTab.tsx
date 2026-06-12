import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { countries } from "@/data/countries";
import { statesByCountry } from "@/data/states";
import { loadCities } from "@/lib/loadCities";
import { toast } from "sonner";
import { ProfileTabSkeleton } from "@/components/skeletons/PageSkeletons";

const profileLocationSchema = z.object({
  country: z.string().trim().max(100),
  state: z.string().trim().max(100),
  city: z.string().trim().max(100),
  postalCode: z.string().trim().max(20),
  authorizedToWork: z.boolean().nullable(),
  workFromDifferent: z.boolean().nullable(),
});

type ProfileLocationForm = z.infer<typeof profileLocationSchema>;

const emptyForm: ProfileLocationForm = {
  country: "",
  state: "",
  city: "",
  postalCode: "",
  authorizedToWork: null,
  workFromDifferent: null,
};

const ProfileLocationTab = () => {
  const { user } = useAuth();
  const [form, setForm] = useState<ProfileLocationForm>(emptyForm);
  const [initialForm, setInitialForm] = useState<ProfileLocationForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      if (!user) { if (isMounted) setLoading(false); return; }
      const { data, error } = await supabase
        .from("profiles")
        .select("country, state, city, postal_code, authorized_to_work, work_from_different_country")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) toast.error("Location details load nahi ho paaye.");
      if (data && isMounted) {
        const nextForm: ProfileLocationForm = {
          country: data.country ?? "",
          state: data.state ?? "",
          city: data.city ?? "",
          postalCode: data.postal_code ?? "",
          authorizedToWork: data.authorized_to_work,
          workFromDifferent: data.work_from_different_country,
        };
        setForm(nextForm);
        setInitialForm(nextForm);
        const hasSavedData = nextForm.country || nextForm.state || nextForm.city;
        if (hasSavedData) setEditMode(false);
      }
      if (isMounted) setLoading(false);
    };
    void loadProfile();
    return () => { isMounted = false; };
  }, [user]);

  const hasChanges = useMemo(() => JSON.stringify(form) !== JSON.stringify(initialForm), [form, initialForm]);

  const updateField = <K extends keyof ProfileLocationForm>(key: K, value: ProfileLocationForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!user) { toast.error("Please login first."); return; }
    const parsed = profileLocationSchema.safeParse({ ...form, country: form.country.trim(), state: form.state.trim(), city: form.city.trim(), postalCode: form.postalCode.trim() });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Please check your inputs."); return; }
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      user_id: user.id, country: parsed.data.country, state: parsed.data.state, city: parsed.data.city, postal_code: parsed.data.postalCode, authorized_to_work: parsed.data.authorizedToWork, work_from_different_country: parsed.data.workFromDifferent,
    }, { onConflict: "user_id" });
    setSaving(false);
    if (error) { toast.error(`Save failed: ${error.message}`); return; }
    setForm(parsed.data);
    setInitialForm(parsed.data);
    setEditMode(false);
    toast.success("Location details saved.");
  };

  const disabled = loading || !editMode;

  if (loading) return <ProfileTabSkeleton rows={5} loadingLabel="Loading location" />;

  return (
    <div className="space-y-6 max-w-xl pb-24">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">Location</h3>
        {!editMode && (
          <Button variant="outline" size="sm" onClick={() => setEditMode(true)} className="gap-1.5">
            <Pencil size={14} /> Edit
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-foreground mb-1.5 block">Country</label>
          <Select value={form.country || undefined} onValueChange={(value) => { updateField("country", value); if (form.country !== value) { updateField("state", ""); updateField("city", ""); } }} disabled={disabled}>
            <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Select country" /></SelectTrigger>
            <SelectContent className="max-h-72">{countries.map((c) => (<SelectItem key={c.code} value={c.name}>{c.flag} {c.name}</SelectItem>))}</SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">State / Province</label>
            {statesByCountry[form.country] ? (
              <Select value={form.state || undefined} onValueChange={(value) => { updateField("state", value); if (form.state !== value) updateField("city", ""); }} disabled={disabled}>
                <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent className="max-h-72">{statesByCountry[form.country].map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
              </Select>
            ) : (
              <Input value={form.state} onChange={(e) => updateField("state", e.target.value)} placeholder="Enter state" className="h-10 text-sm" disabled={disabled} />
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">City</label>
            {cityOptions.length > 0 ? (
              <Select value={form.city || undefined} onValueChange={(value) => updateField("city", value)} disabled={disabled}>
                <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Select city" /></SelectTrigger>
                <SelectContent className="max-h-72">{cityOptions.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
              </Select>
            ) : (
              <Input value={form.city} onChange={(e) => updateField("city", e.target.value)} placeholder="Enter city" className="h-10 text-sm" disabled={disabled} />
            )}
          </div>

        </div>

        <div>
          <label className="text-xs font-medium text-foreground mb-1.5 block">Postal Code</label>
          <Input value={form.postalCode} onChange={(e) => updateField("postalCode", e.target.value)} placeholder="Enter postal code" className="h-10 text-sm" disabled={disabled} />
        </div>
      </div>

      <div className="border-t border-border" />

      <div>
        <h3 className="text-base font-semibold text-foreground mb-4">Work Authorization</h3>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-foreground mb-2">Are you authorized to work in your current country?</p>
            <div className="flex gap-3 flex-wrap">
              {[true, false].map((val) => (
                <button key={String(val)} type="button" onClick={() => editMode && updateField("authorizedToWork", val)} disabled={disabled}
                  className={`px-4 py-2 rounded-lg text-xs font-medium border transition-colors ${form.authorizedToWork === val ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border hover:bg-secondary"} ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}>
                  {val ? "Yes" : "No"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-foreground mb-2">Would you like to work from a different country?</p>
            <div className="flex gap-3 flex-wrap">
              {[true, false].map((val) => (
                <button key={String(val)} type="button" onClick={() => editMode && updateField("workFromDifferent", val)} disabled={disabled}
                  className={`px-4 py-2 rounded-lg text-xs font-medium border transition-colors ${form.workFromDifferent === val ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border hover:bg-secondary"} ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}>
                  {val ? "Yes" : "No"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {editMode && (
        <Button type="button" onClick={handleSave} disabled={saving || !hasChanges} className="w-full">
          {saving ? "Saving..." : hasChanges ? "Save Changes" : "Saved"}
        </Button>
      )}
    </div>
  );
};

export default ProfileLocationTab;
