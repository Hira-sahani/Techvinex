import { useState, useRef, useEffect, useMemo } from "react";
import { Upload, Plus, X, Info, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { countries } from "@/data/countries";
import { languages as languagesList } from "@/data/languages";
import { toast } from "sonner";
import { ProfileTabSkeleton } from "@/components/skeletons/PageSkeletons";

const hobbies = [
  "Football (American)", "Basketball", "Soccer", "Cricket",
  "Volleyball", "Hockey", "Golf", "Shopping/Fashion",
  "Music", "Reading", "Gaming", "Travel",
];

interface ResumeForm {
  fullName: string;
  email: string;
  phone: string;
  countryCode: string;
  linkedinUrl: string;
  noLinkedin: boolean;
  summary: string;
  resumeName: string;
  skills: string[];
  selectedHobbies: string[];
  portfolioUrl: string;
  otherLinks: string[];
  leetcode: string;
  github: string;
  codechef: string;
  codeforces: string;
  languages: string[];
}

const emptyForm: ResumeForm = {
  fullName: "", email: "", phone: "", countryCode: "IN",
  linkedinUrl: "", noLinkedin: false, summary: "", resumeName: "",
  skills: [], selectedHobbies: [], portfolioUrl: "", otherLinks: [""],
  leetcode: "", github: "", codechef: "", codeforces: "", languages: [],
};

const ProfileResumeTab = () => {
  const { user } = useAuth();
  const [form, setForm] = useState<ResumeForm>(emptyForm);
  const [initialForm, setInitialForm] = useState<ResumeForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(true);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [skillInput, setSkillInput] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedCountry = countries.find((c) => c.code === form.countryCode) || countries[0];
  const filteredCountries = countries.filter(
    (c) => c.name.toLowerCase().includes(countrySearch.toLowerCase()) || c.dial.includes(countrySearch)
  );

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!user) { if (isMounted) setLoading(false); return; }
      const { data } = await supabase.from("profiles")
        .select("full_name, email, phone, linkedin, no_linkedin, portfolio, other_links, leetcode, github, codechef, codeforces, resume_name, work_experience")
        .eq("user_id", user.id).maybeSingle();
      if (data && isMounted) {
        const we = (data.work_experience as Record<string, unknown>) ?? {};
        const next: ResumeForm = {
          fullName: data.full_name ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
          countryCode: (we.phone_country_code as string) ?? "IN",
          linkedinUrl: data.linkedin ?? "",
          noLinkedin: data.no_linkedin ?? false,
          summary: (we.summary as string) ?? "",
          resumeName: data.resume_name ?? "",
          skills: (we.skills as string[]) ?? [],
          selectedHobbies: (we.hobbies as string[]) ?? [],
          portfolioUrl: data.portfolio ?? "",
          otherLinks: data.other_links?.length ? data.other_links : [""],
          leetcode: data.leetcode ?? "",
          github: data.github ?? "",
          codechef: data.codechef ?? "",
          codeforces: data.codeforces ?? "",
          languages: (we.languages as string[]) ?? [],
        };
        setForm(next);
        setInitialForm(next);
        const hasSavedData = next.fullName || next.linkedinUrl || next.resumeName;
        if (hasSavedData) setEditMode(false);
      }
      if (isMounted) setLoading(false);
    };
    void load();
    return () => { isMounted = false; };
  }, [user]);

  const hasChanges = useMemo(() => JSON.stringify(form) !== JSON.stringify(initialForm) || resumeFile !== null, [form, initialForm, resumeFile]);
  const disabled = loading || !editMode;

  const updateField = <K extends keyof ResumeForm>(key: K, value: ResumeForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!editMode) return;
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf" && file.size <= 3 * 1024 * 1024) setResumeFile(file);
  };

  const handleSkillAdd = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && skillInput.trim()) {
      e.preventDefault();
      if (!form.skills.includes(skillInput.trim())) {
        updateField("skills", [...form.skills, skillInput.trim()]);
      }
      setSkillInput("");
    }
  };

  const handleSave = async () => {
    if (!user) { toast.error("Please login first."); return; }
    if (!form.fullName.trim()) { toast.error("Full name is required."); return; }
    setSaving(true);

    const { data: existing } = await supabase.from("profiles").select("work_experience").eq("user_id", user.id).maybeSingle();
    const currentWe = (existing?.work_experience as Record<string, unknown>) ?? {};

    const { error } = await supabase.from("profiles").update({
      full_name: form.fullName.trim(),
      phone: form.phone.trim(),
      linkedin: form.linkedinUrl.trim(),
      no_linkedin: form.noLinkedin,
      portfolio: form.portfolioUrl.trim(),
      other_links: form.otherLinks.filter((l) => l.trim()),
      leetcode: form.leetcode.trim(),
      github: form.github.trim(),
      codechef: form.codechef.trim(),
      codeforces: form.codeforces.trim(),
      resume_name: resumeFile ? resumeFile.name : form.resumeName,
      work_experience: {
        ...currentWe,
        summary: form.summary,
        skills: form.skills,
        hobbies: form.selectedHobbies,
        languages: form.languages,
        phone_country_code: form.countryCode,
      } as unknown as import("@/integrations/supabase/types").Json,
    }).eq("user_id", user.id);

    setSaving(false);
    if (error) { toast.error(`Save failed: ${error.message}`); return; }
    const savedForm = { ...form, resumeName: resumeFile ? resumeFile.name : form.resumeName };
    setForm(savedForm);
    setInitialForm(savedForm);
    setResumeFile(null);
    setEditMode(false);
    toast.success("Resume details saved.");
  };

  if (loading) return <ProfileTabSkeleton rows={6} loadingLabel="Loading resume" />;

  return (
    <div className="space-y-8 pb-24">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-foreground">Resume</h3>
        <p className="text-xs text-muted-foreground mt-1">This will be shown to companies to find you opportunities</p>
      </div>

      {/* Form */}
      <div className="space-y-4 max-w-2xl">
        {/* Full Name */}
        <div>
          <label className="text-xs font-medium text-foreground mb-1.5 block">Full Name <span className="text-destructive">*</span></label>
          <Input value={form.fullName} onChange={(e) => updateField("fullName", e.target.value)} className="h-10 text-sm" disabled={disabled} />
        </div>

        {/* Email & Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 flex items-center gap-1">Email <Info size={11} className="text-muted-foreground" /></label>
            <Input value={form.email} readOnly className="h-10 text-sm bg-muted/50" />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Phone</label>
            <div className="flex gap-2">
              <div className="relative" ref={dropdownRef}>
                <button type="button" onClick={() => editMode && setCountryOpen(!countryOpen)} disabled={disabled}
                  className={`flex items-center gap-1 h-10 px-2 rounded-md border border-input bg-background text-sm hover:bg-secondary transition-colors min-w-[80px] ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}>
                  <span>{selectedCountry.flag}</span>
                  <span className="text-xs">▾</span>
                  <span className="text-foreground text-xs">{selectedCountry.dial}</span>
                </button>
                {countryOpen && editMode && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => { setCountryOpen(false); setCountrySearch(""); }} />
                    <div className="absolute top-full left-0 mt-1 z-50 w-[260px] bg-popover rounded-lg border border-border shadow-xl">
                      <div className="p-2">
                        <Input placeholder="Search..." value={countrySearch} onChange={(e) => setCountrySearch(e.target.value)} className="h-8 text-xs" autoFocus />
                      </div>
                      <div className="max-h-[180px] overflow-y-auto">
                        {filteredCountries.map((c) => (
                          <button key={c.code} onClick={() => { updateField("countryCode", c.code); setCountryOpen(false); setCountrySearch(""); }}
                            className={`flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-secondary ${c.code === form.countryCode ? "bg-secondary font-medium" : ""}`}>
                            <span>{c.flag}</span>
                            <span className="flex-1 text-left">{c.name}</span>
                            <span className="text-muted-foreground">{c.dial}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
              <Input type="tel" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="+91 70817-50793" className="flex-1 h-10 text-sm" disabled={disabled} />
            </div>
          </div>
        </div>

        {/* LinkedIn */}
        <div>
          <label className="text-xs font-medium text-foreground mb-1.5 block">LinkedIn URL <span className="text-destructive">*</span></label>
          <div className="flex gap-2">
            <Input value={form.linkedinUrl} onChange={(e) => updateField("linkedinUrl", e.target.value)} placeholder="na" className="h-10 text-sm flex-1" disabled={disabled || form.noLinkedin} />
            <button disabled={disabled} className={`h-10 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity whitespace-nowrap ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}>
              Link LinkedIn
            </button>
          </div>
          <label className={`flex items-center gap-2 mt-2 ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}>
            <input type="checkbox" checked={form.noLinkedin} onChange={(e) => editMode && updateField("noLinkedin", e.target.checked)} disabled={disabled} className="w-3.5 h-3.5 rounded border-border" />
            <span className="text-xs text-muted-foreground">I don't have a LinkedIn</span>
          </label>
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Resume Upload */}
      <div className="max-w-2xl">
        <label className="text-sm font-medium text-foreground mb-3 block">Resume <span className="text-destructive">*</span></label>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          onClick={() => editMode && fileInputRef.current?.click()}
          className={`border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center transition-colors bg-muted/30 ${editMode ? "cursor-pointer hover:border-primary/40" : "opacity-60 cursor-not-allowed"}`}
        >
          <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" disabled={disabled} onChange={(e) => { const file = e.target.files?.[0]; if (file) setResumeFile(file); }} />
          {resumeFile ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">{resumeFile.name}</span>
              {editMode && <button onClick={(e) => { e.stopPropagation(); setResumeFile(null); }}><X size={14} className="text-muted-foreground hover:text-destructive" /></button>}
            </div>
          ) : form.resumeName ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">{form.resumeName}</span>
            </div>
          ) : (
            <>
              <Upload size={24} className="text-muted-foreground mb-2" />
              <p className="text-sm text-foreground font-medium">Drop your resume here</p>
              <p className="text-xs text-muted-foreground mt-1">or <span className="text-primary font-medium">browse files</span> on your computer</p>
              <p className="text-[10px] text-muted-foreground mt-1">Supports PDF up to 3MB</p>
            </>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="max-w-2xl">
        <label className="text-sm font-medium text-foreground mb-1.5 block">Summary</label>
        <Input value={form.summary} onChange={(e) => updateField("summary", e.target.value)} placeholder="Profile Summary" className="h-10 text-sm" disabled={disabled} />
      </div>

      <div className="border-t border-border" />

      {/* Education */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">Education</h3>
        {editMode && <button className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"><Plus size={14} /> Add Education</button>}
      </div>

      <div className="border-t border-border" />

      {/* Work Experience */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">Work Experience</h3>
        {editMode && <button className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"><Plus size={14} /> Add Work Experience</button>}
      </div>

      <div className="border-t border-border" />

      {/* Projects */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">Projects</h3>
        {editMode && <button className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"><Plus size={14} /> Add Project</button>}
      </div>

      <div className="border-t border-border" />

      {/* Publications */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">Publications</h3>
        {editMode && <button className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"><Plus size={14} /> Add Publication</button>}
      </div>

      <div className="border-t border-border" />

      {/* Certifications */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">Certifications</h3>
        {editMode && <button className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"><Plus size={14} /> Add Certification</button>}
      </div>

      <div className="border-t border-border" />

      {/* Awards */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">Awards</h3>
        {editMode && <button className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"><Plus size={14} /> Add Award</button>}
      </div>

      <div className="border-t border-border" />

      {/* Profiles */}
      <div className="max-w-2xl">
        <h3 className="text-base font-semibold text-foreground mb-1">Profiles</h3>
        <p className="text-xs text-muted-foreground mb-3">Profile username</p>
        <div className="space-y-2.5">
          <ProfileInput icon="⟨/⟩" placeholder="leetcode-username" value={form.leetcode} onChange={(v) => updateField("leetcode", v)} disabled={disabled} />
          <ProfileInput icon="⊙" placeholder="github-username" value={form.github} onChange={(v) => updateField("github", v)} disabled={disabled} />
          <ProfileInput icon="◈" placeholder="codechef-username" value={form.codechef} onChange={(v) => updateField("codechef", v)} disabled={disabled} />
          <ProfileInput icon="▥" placeholder="codeforces-username" value={form.codeforces} onChange={(v) => updateField("codeforces", v)} disabled={disabled} />
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Links */}
      <div className="max-w-2xl">
        <h3 className="text-base font-semibold text-foreground mb-2">Links</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Portfolio URL</label>
            <Input value={form.portfolioUrl} onChange={(e) => updateField("portfolioUrl", e.target.value)} placeholder="https://yourportfolio.com" className="h-10 text-sm" disabled={disabled} />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Other links</label>
            {form.otherLinks.map((link, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <Input value={link} onChange={(e) => { const updated = [...form.otherLinks]; updated[i] = e.target.value; updateField("otherLinks", updated); }} placeholder="https://example.com" className="h-10 text-sm" disabled={disabled} />
                {editMode && form.otherLinks.length > 1 && (
                  <button onClick={() => updateField("otherLinks", form.otherLinks.filter((_, idx) => idx !== i))}>
                    <X size={14} className="text-muted-foreground hover:text-destructive" />
                  </button>
                )}
              </div>
            ))}
            {editMode && (
              <button onClick={() => updateField("otherLinks", [...form.otherLinks, ""])} className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                <Plus size={14} /> Add more links
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Skills */}
      <div className="max-w-2xl">
        <h3 className="text-base font-semibold text-foreground mb-2">Skills</h3>
        {editMode && (
          <Input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={handleSkillAdd} placeholder="Type a skill and press Enter" className="h-10 text-sm" />
        )}
        {form.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {form.skills.map((skill) => (
              <span key={skill} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary text-foreground text-xs font-medium">
                {skill}
                {editMode && <X size={10} className="cursor-pointer hover:text-destructive" onClick={() => updateField("skills", form.skills.filter((s) => s !== skill))} />}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-border" />

      {/* Languages */}
      <LanguageSelector
        selected={form.languages}
        onChange={(v) => updateField("languages", v)}
        disabled={disabled}
        editMode={editMode}
      />

      <div className="border-t border-border" />

      {/* Hobbies */}
      <div className="max-w-2xl">
        <h3 className="text-base font-semibold text-foreground mb-1 flex items-center gap-1">Hobbies <Info size={12} className="text-muted-foreground" /></h3>
        <p className="text-xs text-muted-foreground mb-3">Select all that apply:</p>
        <div className="flex flex-wrap gap-2">
          {hobbies.map((hobby) => (
            <button key={hobby} onClick={() => editMode && updateField("selectedHobbies", form.selectedHobbies.includes(hobby) ? form.selectedHobbies.filter((h) => h !== hobby) : [...form.selectedHobbies, hobby])} disabled={disabled}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${form.selectedHobbies.includes(hobby) ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border hover:bg-secondary"} ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}>
              {hobby}
            </button>
          ))}
        </div>
      </div>

      {/* Save button */}
      {editMode && (
        <div className="max-w-2xl">
          <Button type="button" onClick={handleSave} disabled={saving || !hasChanges} className="w-full">
            {saving ? "Saving..." : hasChanges ? "Save Changes" : "Saved"}
          </Button>
        </div>
      )}
    </div>
  );
};

const ProfileInput = ({ icon, placeholder, value, onChange, disabled }: { icon: string; placeholder: string; value: string; onChange: (v: string) => void; disabled?: boolean }) => (
  <div className={`flex items-center border border-border rounded-lg overflow-hidden ${disabled ? "opacity-60" : ""}`}>
    <span className="w-10 h-10 flex items-center justify-center bg-muted/50 text-muted-foreground text-sm shrink-0 border-r border-border">{icon}</span>
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
      className="flex-1 h-10 px-3 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed" />
    {value && !disabled && (
      <button onClick={() => onChange("")} className="px-3"><X size={14} className="text-muted-foreground hover:text-destructive" /></button>
    )}
  </div>
);

const LanguageSelector = ({ selected, onChange, disabled, editMode }: { selected: string[]; onChange: (v: string[]) => void; disabled: boolean; editMode: boolean }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const filtered = languagesList.filter(
    (l) => l.toLowerCase().includes(search.toLowerCase()) && !selected.includes(l)
  );

  return (
    <div className="max-w-2xl" ref={ref}>
      <h3 className="text-base font-semibold text-foreground mb-1 flex items-center gap-1">Languages <Info size={12} className="text-muted-foreground" /></h3>
      <p className="text-xs text-muted-foreground mb-2">What languages can you natively speak, read, and write?</p>

      {/* Selected languages */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((lang) => (
            <span key={lang} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary text-foreground text-xs font-medium">
              {lang}
              {editMode && <X size={10} className="cursor-pointer hover:text-destructive" onClick={() => onChange(selected.filter((l) => l !== lang))} />}
            </span>
          ))}
        </div>
      )}

      {/* Dropdown trigger */}
      {editMode && (
        <div className="relative">
          <Input
            placeholder="Search languages..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            className="h-10 text-sm"
            disabled={disabled}
          />
          {open && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setSearch(""); }} />
              <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover rounded-lg border border-border shadow-xl max-h-[200px] overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">No languages found</p>
                ) : (
                  filtered.map((lang) => (
                    <button key={lang} onClick={() => { onChange([...selected, lang]); setSearch(""); }}
                      className="flex items-center w-full px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors">
                      {lang}
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfileResumeTab;
