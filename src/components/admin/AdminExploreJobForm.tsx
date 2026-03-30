import { useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ExploreJob } from "@/hooks/useExploreJobs";

interface Props {
  job: ExploreJob | null;
  onSave: (data: Partial<ExploreJob>) => Promise<void>;
  onCancel: () => void;
}

const skillOptions = ["React", "Node.js", "Python", "TypeScript", "AI/ML", "Data Science", "Java", "Go", "Rust", "AWS", "DevOps", "Flutter", "Figma", "SQL", "Blockchain"];
const tagOptions = ["AI", "Remote", "BPO", "Web3", "Startup", "Enterprise", "Healthcare", "Fintech", "EdTech", "SaaS"];

const inputClass = "h-8 text-xs bg-muted/30 border-transparent focus-visible:border-border";
const labelClass = "text-[10px] text-muted-foreground uppercase tracking-wider font-medium";

const AdminExploreJobForm = ({ job, onSave, onCancel }: Props) => {
  const [form, setForm] = useState({
    title: job?.title || "",
    short_description: job?.short_description || "",
    description: job?.description || "",
    skills: job?.skills || [],
    experience: job?.experience || "",
    budget: job?.budget || "",
    job_type: job?.job_type || "contract",
    location: job?.location || "Remote",
    company_name: job?.company_name || "",
    show_company: job?.show_company ?? false,
    show_salary: job?.show_salary ?? true,
    urgency: job?.urgency || "normal",
    tags: job?.tags || [],
    internal_notes: job?.internal_notes || "",
    visibility: job?.visibility || "public",
    featured: job?.featured ?? false,
    status: job?.status || "draft",
    allow_direct_apply: job?.allow_direct_apply ?? true,
    auto_match_only: job?.auto_match_only ?? false,
    application_limit: job?.application_limit ?? null,
    expiry_date: job?.expiry_date ? job.expiry_date.slice(0, 10) : "",
    meta_title: job?.meta_title || "",
    meta_description: job?.meta_description || "",
    geo_targeting: job?.geo_targeting || [],
    skill_targeting: job?.skill_targeting || [],
  });
  const [saving, setSaving] = useState(false);

  const update = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const toggleArrayItem = (key: string, item: string) => {
    const arr = (form as any)[key] as string[];
    update(key, arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item]);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await onSave({ ...form, application_limit: form.application_limit || null, expiry_date: form.expiry_date || null });
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button onClick={onCancel} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-semibold text-foreground tracking-tight">{job ? "Edit Job" : "Create Explore Job"}</h1>
            <p className="text-[10px] text-muted-foreground mt-0.5">Fill in the details to publish to explore page</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={onCancel} className="text-xs h-7 text-muted-foreground">Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving || !form.title.trim()} className="gap-1 h-7 text-xs">
            <Save className="w-3 h-3" /> {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-3">
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <p className="text-xs font-medium text-foreground">Job Details</p>

            <div className="space-y-1">
              <Label className={labelClass}>Job Title *</Label>
              <Input value={form.title} onChange={e => update("title", e.target.value)} placeholder="Senior React Developer" className={inputClass} />
            </div>

            <div className="space-y-1">
              <Label className={labelClass}>Short Description</Label>
              <Input value={form.short_description} onChange={e => update("short_description", e.target.value)} placeholder="Brief one-liner..." className={inputClass} />
            </div>

            <div className="space-y-1">
              <Label className={labelClass}>Full Description</Label>
              <Textarea value={form.description} onChange={e => update("description", e.target.value)} placeholder="Detailed job description..." rows={5} className="text-xs bg-muted/30 border-transparent focus-visible:border-border resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className={labelClass}>Experience</Label>
                <Input value={form.experience} onChange={e => update("experience", e.target.value)} placeholder="3-5 years" className={inputClass} />
              </div>
              <div className="space-y-1">
                <Label className={labelClass}>Budget / Rate</Label>
                <Input value={form.budget} onChange={e => update("budget", e.target.value)} placeholder="$50-100/hr" className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className={labelClass}>Job Type</Label>
                <Select value={form.job_type} onValueChange={v => update("job_type", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                    <SelectItem value="freelance">Freelance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className={labelClass}>Location</Label>
                <Input value={form.location} onChange={e => update("location", e.target.value)} placeholder="Remote / On-site" className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className={labelClass}>Company Name</Label>
                <Input value={form.company_name} onChange={e => update("company_name", e.target.value)} placeholder="Optional" className={inputClass} />
              </div>
              <div className="space-y-1">
                <Label className={labelClass}>Urgency</Label>
                <Select value={form.urgency} onValueChange={v => update("urgency", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Skills */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-2.5">
            <p className="text-xs font-medium text-foreground">Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {skillOptions.map(skill => (
                <button
                  key={skill}
                  onClick={() => toggleArrayItem("skills", skill)}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                    form.skills.includes(skill) ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted/60 bg-muted/30"
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-2.5">
            <p className="text-xs font-medium text-foreground">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {tagOptions.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleArrayItem("tags", tag)}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                    form.tags.includes(tag) ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted/60 bg-muted/30"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* SEO */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <p className="text-xs font-medium text-foreground">SEO & Meta</p>
            <div className="space-y-1">
              <Label className={labelClass}>Meta Title</Label>
              <Input value={form.meta_title} onChange={e => update("meta_title", e.target.value)} placeholder="SEO title (auto-generated if empty)" className={inputClass} />
            </div>
            <div className="space-y-1">
              <Label className={labelClass}>Meta Description</Label>
              <Textarea value={form.meta_description} onChange={e => update("meta_description", e.target.value)} placeholder="SEO description..." rows={2} className="text-xs bg-muted/30 border-transparent focus-visible:border-border resize-none" />
            </div>
          </div>

          {/* Internal Notes */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-2.5">
            <p className="text-xs font-medium text-foreground">Internal Notes</p>
            <Textarea value={form.internal_notes} onChange={e => update("internal_notes", e.target.value)} placeholder="Notes visible only to admin team..." rows={3} className="text-xs bg-muted/30 border-transparent focus-visible:border-border resize-none" />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-3">
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <p className="text-xs font-medium text-foreground">Publishing</p>
            <div className="space-y-1">
              <Label className={labelClass}>Status</Label>
              <Select value={form.status} onValueChange={v => update("status", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className={labelClass}>Expiry Date</Label>
              <Input type="date" value={form.expiry_date} onChange={e => update("expiry_date", e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <p className="text-xs font-medium text-foreground">Visibility</p>
            {[
              { label: "Public", checked: form.visibility === "public", onChange: (v: boolean) => update("visibility", v ? "public" : "private") },
              { label: "Featured", checked: form.featured, onChange: (v: boolean) => update("featured", v) },
              { label: "Show Company", checked: form.show_company, onChange: (v: boolean) => update("show_company", v) },
              { label: "Show Salary", checked: form.show_salary, onChange: (v: boolean) => update("show_salary", v) },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">{item.label}</Label>
                <Switch checked={item.checked} onCheckedChange={item.onChange} />
              </div>
            ))}
          </div>

          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <p className="text-xs font-medium text-foreground">Candidate Controls</p>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Allow Direct Apply</Label>
              <Switch checked={form.allow_direct_apply} onCheckedChange={v => update("allow_direct_apply", v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Auto-match Only</Label>
              <Switch checked={form.auto_match_only} onCheckedChange={v => update("auto_match_only", v)} />
            </div>
            <div className="space-y-1">
              <Label className={labelClass}>Application Limit</Label>
              <Input
                type="number"
                value={form.application_limit ?? ""}
                onChange={e => update("application_limit", e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Unlimited"
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminExploreJobForm;
