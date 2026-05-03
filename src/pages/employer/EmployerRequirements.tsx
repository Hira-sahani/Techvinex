import { useState } from "react";
import { useEmployerJobs, useEmployerCandidates } from "@/hooks/useEmployerData";
import { Target, Users, MapPin, Plus, X, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EmployerListSkeleton } from "@/components/skeletons/EmployerSkeletons";

const EmployerRequirements = () => {
  const { data: jobs = [], isLoading, createJob } = useEmployerJobs();
  const { data: candidates = [] } = useEmployerCandidates();
  const [showForm, setShowForm] = useState(false);
  const [matching, setMatching] = useState(false);
  const [form, setForm] = useState({
    title: "",
    department: "",
    location: "Remote",
    type: "Full-time",
    budget: "",
    skills: "",
    description: "",
  });

  const resetForm = () => {
    setForm({ title: "", department: "", location: "Remote", type: "Full-time", budget: "", skills: "", description: "" });
    setShowForm(false);
  };

  const handleCreate = async () => {
    if (!form.title) {
      toast.error("Requirement title is required");
      return;
    }

    try {
      await createJob.mutateAsync({
        title: form.title,
        department: form.department,
        location: form.location,
        type: form.type,
        budget: form.budget,
        skills: form.skills.split(",").map(s => s.trim()).filter(Boolean),
        description: form.description,
        status: "active",
      });
      toast.success("Requirement created successfully");
      resetForm();

      // Auto-trigger AI matching
      setMatching(true);
      try {
        const { data, error } = await supabase.functions.invoke("ai-match-candidates", {
          body: { auto_match: true },
        });
        if (!error && data?.scores?.length > 0) {
          toast.success(`${data.scores.length} candidates auto-matched!`);
        }
      } catch {
        // Matching is best-effort
      } finally {
        setMatching(false);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to create requirement");
    }
  };

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    paused: "bg-amber-100 text-amber-700",
    closed: "bg-muted text-muted-foreground",
  };

  if (isLoading) {
    return <EmployerListSkeleton />;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Requirements</h1>
          <p className="text-sm text-muted-foreground mt-1">Submit hiring requirements — AI automatically matches candidates</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gradient-cta text-primary-foreground border-0 gap-2">
          <Plus size={16} /> Create Requirement
        </Button>
      </div>

      {matching && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
          <Sparkles size={18} className="text-primary animate-pulse" />
          <p className="text-sm text-foreground">AI is matching candidates to your new requirement...</p>
        </div>
      )}

      {/* Create Requirement Form */}
      {showForm && (
        <div className="bg-card rounded-xl border border-border p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Target size={18} className="text-primary" />
              New Requirement
            </h2>
            <button onClick={resetForm} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
          </div>
          
          <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 flex items-center gap-2">
            <Zap size={14} className="text-primary" />
            <p className="text-xs text-muted-foreground">This requirement is <strong className="text-foreground">private</strong>. AI will automatically match and deliver candidates to your pipeline.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Role Title *</label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Senior React Developer" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Department</label>
              <Input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="e.g. Engineering" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Budget</label>
              <Input value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} placeholder="e.g. $60-80/hr" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Location</label>
              <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="e.g. Remote" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm text-foreground">
                <option>Full-time</option>
                <option>Part-time</option>
                <option>Contract</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Required Skills (comma separated)</label>
              <Input value={form.skills} onChange={e => setForm({ ...form, skills: e.target.value })} placeholder="React, TypeScript, Node.js" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-foreground mb-1 block">Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Describe the role requirements, responsibilities..."
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createJob.isPending}
              className="gradient-cta text-primary-foreground border-0 gap-2">
              <Sparkles size={14} />
              {createJob.isPending ? "Creating..." : "Create & Auto-Match"}
            </Button>
          </div>
        </div>
      )}

      {/* Requirements List */}
      <div className="space-y-3">
        {jobs.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-xl border border-border">
            <Target size={40} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">No requirements yet</p>
            <p className="text-xs text-muted-foreground">Create your first requirement and AI will start matching candidates automatically.</p>
          </div>
        ) : (
          jobs.map((job) => {
            const matchedCount = candidates.filter(c => c.job_id === job.id).length;
            return (
              <div key={job.id} className="bg-card rounded-xl border border-border p-5 shadow-card hover:shadow-card-hover transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-foreground">{job.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[job.status] || statusColors.active}`}>{job.status}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Private</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-2">
                      {job.department && <span>{job.department}</span>}
                      <span className="flex items-center gap-1"><MapPin size={12} />{job.location}</span>
                      <span>{job.type}</span>
                      {job.budget && <span className="font-medium text-foreground">{job.budget}</span>}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {(job.skills || []).map(s => <span key={s} className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium">{s}</span>)}
                    </div>
                    {job.description && <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg">
                      <Sparkles size={12} />
                      {matchedCount} matched
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default EmployerRequirements;
