import { useState, useMemo } from "react";
import {
  Plus, Search, Edit2, Trash2, Eye, Copy, BarChart3, Star, Globe, Pause, Play, Clock,
  Flag, Share2, AlertTriangle, Shield, ExternalLink, MessageSquare, ArrowLeft,
} from "lucide-react";
import { useExploreJobs, useDeleteExploreJob, useUpdateExploreJob, useCreateExploreJob } from "@/hooks/useExploreJobs";
import type { ExploreJob } from "@/hooks/useExploreJobs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import AdminExploreJobForm from "@/components/admin/AdminExploreJobForm";

const statusColors: Record<string, string> = {
  draft: "bg-amber-500/10 text-amber-600",
  published: "bg-emerald-500/10 text-emerald-600",
  paused: "bg-orange-500/10 text-orange-600",
  expired: "bg-red-500/10 text-red-500",
};

const urgencyColors: Record<string, string> = {
  low: "text-muted-foreground",
  normal: "text-foreground",
  high: "text-orange-600",
  urgent: "text-red-500",
};

const AdminExploreJobs = () => {
  const { data: jobs = [], isLoading } = useExploreJobs(true);
  const deleteJob = useDeleteExploreJob();
  const updateJob = useUpdateExploreJob();
  const createJob = useCreateExploreJob();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingJob, setEditingJob] = useState<ExploreJob | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState("listings");
  const [selectedJob, setSelectedJob] = useState<ExploreJob | null>(null);

  const filtered = jobs.filter(j =>
    (statusFilter === "all" || j.status === statusFilter) &&
    (j.title.toLowerCase().includes(search.toLowerCase()) || (j.company_name || "").toLowerCase().includes(search.toLowerCase()))
  );

  const stats = useMemo(() => ({
    total: jobs.length,
    published: jobs.filter(j => j.status === "published").length,
    draft: jobs.filter(j => j.status === "draft").length,
    paused: jobs.filter(j => j.status === "paused").length,
    featured: jobs.filter(j => j.featured).length,
    totalViews: jobs.reduce((s, j) => s + (j.views_count || 0), 0),
    totalApps: jobs.reduce((s, j) => s + (j.applications_count || 0), 0),
    totalClicks: jobs.reduce((s, j) => s + (j.clicks_count || 0), 0),
  }), [jobs]);

  const duplicates = useMemo(() => {
    const titleMap = new Map<string, string[]>();
    jobs.forEach(j => {
      const key = j.title.toLowerCase().trim();
      const existing = titleMap.get(key) || [];
      existing.push(j.id);
      titleMap.set(key, existing);
    });
    const dupeIds = new Set<string>();
    titleMap.forEach(ids => { if (ids.length > 1) ids.forEach(id => dupeIds.add(id)); });
    return dupeIds;
  }, [jobs]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this job listing?")) return;
    try { await deleteJob.mutateAsync(id); toast.success("Job deleted"); } catch { toast.error("Failed to delete"); }
  };

  const handleToggleStatus = async (job: ExploreJob) => {
    const next = job.status === "published" ? "paused" : "published";
    try { await updateJob.mutateAsync({ id: job.id, status: next }); toast.success(`Job ${next}`); } catch { toast.error("Failed to update"); }
  };

  const handleClone = async (job: ExploreJob) => {
    try {
      const { id, created_at, updated_at, slug, views_count, clicks_count, applications_count, ...rest } = job;
      await createJob.mutateAsync({ ...rest, title: `${rest.title} (Copy)`, status: "draft" });
      toast.success("Job cloned as draft");
    } catch { toast.error("Failed to clone"); }
  };

  const handleToggleFeatured = async (job: ExploreJob) => {
    try { await updateJob.mutateAsync({ id: job.id, featured: !job.featured }); toast.success(job.featured ? "Removed from featured" : "Marked as featured"); } catch { toast.error("Failed to update"); }
  };

  const handleCopyLink = (job: ExploreJob) => {
    const url = `${window.location.origin}/jobs/${job.slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied!");
  };

  const handleSave = async (data: Partial<ExploreJob>) => {
    if (!editingJob) {
      const existing = jobs.find(j => j.title.toLowerCase().trim() === (data.title || "").toLowerCase().trim());
      if (existing && !confirm("A job with this title already exists. Create anyway?")) return;
    }
    try {
      if (editingJob) { await updateJob.mutateAsync({ id: editingJob.id, ...data }); toast.success("Job updated"); }
      else { await createJob.mutateAsync(data); toast.success("Job created"); }
      setShowForm(false); setEditingJob(null);
    } catch (e: any) { toast.error(e.message || "Failed to save"); }
  };

  if (showForm) {
    return <AdminExploreJobForm job={editingJob} onSave={handleSave} onCancel={() => { setShowForm(false); setEditingJob(null); }} />;
  }

  // Job detail panel
  if (selectedJob) {
    const conversionRate = selectedJob.views_count > 0 ? ((selectedJob.applications_count / selectedJob.views_count) * 100).toFixed(1) : "0";
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2.5">
          <button onClick={() => setSelectedJob(null)} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-foreground tracking-tight">{selectedJob.title}</h1>
              {selectedJob.featured && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
              {duplicates.has(selectedJob.id) && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 flex items-center gap-0.5">
                  <AlertTriangle className="w-2.5 h-2.5" /> Duplicate
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">{selectedJob.location} · {selectedJob.job_type} · {selectedJob.budget || "No budget"}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => { setEditingJob(selectedJob); setShowForm(true); setSelectedJob(null); }} className="gap-1 h-7 text-[10px] text-muted-foreground hover:text-foreground">
              <Edit2 className="w-3 h-3" /> Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleCopyLink(selectedJob)} className="gap-1 h-7 text-[10px] text-muted-foreground hover:text-foreground">
              <Share2 className="w-3 h-3" /> Share
            </Button>
            <Button variant="ghost" size="sm" onClick={() => window.open(`/jobs/${selectedJob.slug}`, "_blank")} className="gap-1 h-7 text-[10px] text-muted-foreground hover:text-foreground">
              <ExternalLink className="w-3 h-3" /> Preview
            </Button>
          </div>
        </div>

        {/* Analytics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {[
            { label: "Views", value: selectedJob.views_count },
            { label: "Clicks", value: selectedJob.clicks_count },
            { label: "Applications", value: selectedJob.applications_count },
            { label: "Conversion", value: `${conversionRate}%` },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-lg p-3.5">
              <p className="text-lg font-semibold text-foreground tabular-nums leading-none">{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-1.5 uppercase tracking-wider font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Moderation */}
          <div className="bg-card border border-border rounded-lg">
            <div className="px-4 pt-4 pb-3 border-b border-border flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs font-medium text-foreground">Moderation & Status</p>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Status", value: selectedJob.status, pill: true },
                  { label: "Visibility", value: selectedJob.visibility },
                  { label: "Urgency", value: selectedJob.urgency },
                  { label: "Expiry", value: selectedJob.expiry_date ? new Date(selectedJob.expiry_date).toLocaleDateString() : "None" },
                  { label: "Direct Apply", value: selectedJob.allow_direct_apply ? "Enabled" : "Disabled" },
                  { label: "Auto-match", value: selectedJob.auto_match_only ? "Yes" : "No" },
                ].map(item => (
                  <div key={item.label}>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{item.label}</p>
                    {item.pill ? (
                      <span className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded capitalize ${statusColors[selectedJob.status] || "bg-muted text-muted-foreground"}`}>{item.value}</span>
                    ) : (
                      <p className="text-xs font-medium text-foreground capitalize mt-1">{item.value}</p>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5 pt-3 mt-3 border-t border-border">
                <Button size="sm" variant="ghost" onClick={() => handleToggleStatus(selectedJob)} className="gap-1 text-[10px] h-6 px-2 text-muted-foreground hover:text-foreground">
                  {selectedJob.status === "published" ? <><Pause className="w-3 h-3" /> Pause</> : <><Play className="w-3 h-3" /> Publish</>}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleToggleFeatured(selectedJob)} className="gap-1 text-[10px] h-6 px-2 text-muted-foreground hover:text-foreground">
                  <Star className={`w-3 h-3 ${selectedJob.featured ? "fill-amber-500 text-amber-500" : ""}`} />
                  {selectedJob.featured ? "Unfeature" : "Feature"}
                </Button>
              </div>
            </div>
          </div>

          {/* Job Info */}
          <div className="bg-card border border-border rounded-lg">
            <div className="px-4 pt-4 pb-3 border-b border-border">
              <p className="text-xs font-medium text-foreground">Job Info</p>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Skills</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(selectedJob.skills || []).map(s => (
                    <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{s}</span>
                  ))}
                  {(!selectedJob.skills || selectedJob.skills.length === 0) && <span className="text-[10px] text-muted-foreground">None</span>}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Tags</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(selectedJob.tags || []).map(t => (
                    <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/50">{t}</span>
                  ))}
                </div>
              </div>
              {selectedJob.internal_notes && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Internal Notes</p>
                  <p className="mt-1 text-xs text-foreground bg-muted/40 rounded p-2">{selectedJob.internal_notes}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">SEO Slug</p>
                <p className="font-mono text-[10px] mt-1 text-muted-foreground">/jobs/{selectedJob.slug}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Share */}
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs font-medium text-foreground mb-2.5">Quick Share</p>
          <div className="flex gap-1.5">
            <Button variant="ghost" size="sm" className="gap-1 text-[10px] h-6 px-2 text-muted-foreground hover:text-foreground" onClick={() => handleCopyLink(selectedJob)}>
              <Copy className="w-3 h-3" /> Copy Link
            </Button>
            <Button variant="ghost" size="sm" className="gap-1 text-[10px] h-6 px-2 text-muted-foreground hover:text-foreground" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(selectedJob.title + " " + window.location.origin + "/jobs/" + selectedJob.slug)}`, "_blank")}>
              WhatsApp
            </Button>
            <Button variant="ghost" size="sm" className="gap-1 text-[10px] h-6 px-2 text-muted-foreground hover:text-foreground" onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.origin + "/jobs/" + selectedJob.slug)}`, "_blank")}>
              LinkedIn
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Main listing
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-foreground tracking-tight">Explore Job Control Center</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Create, manage & optimize curated job listings</p>
        </div>
        <Button onClick={() => { setEditingJob(null); setShowForm(true); }} size="sm" className="gap-1.5 h-7 text-xs">
          <Plus className="w-3 h-3" /> Create Job
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
        {[
          { label: "Total", value: stats.total },
          { label: "Published", value: stats.published },
          { label: "Draft", value: stats.draft },
          { label: "Paused", value: stats.paused },
          { label: "Featured", value: stats.featured },
          { label: "Views", value: stats.totalViews },
          { label: "Clicks", value: stats.totalClicks },
          { label: "Apps", value: stats.totalApps },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-lg p-2.5 text-center">
            <p className="text-sm font-semibold text-foreground tabular-nums">{s.value}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5 uppercase tracking-wider font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-8 bg-muted/50">
          <TabsTrigger value="listings" className="text-[10px] h-6 px-3">All Listings</TabsTrigger>
          <TabsTrigger value="moderation" className="text-[10px] h-6 px-3">
            Moderation
            {duplicates.size > 0 && <span className="ml-1 text-[9px] bg-red-500/10 text-red-500 px-1 rounded">{duplicates.size}</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="listings" className="space-y-3 mt-3">
          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Search jobs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs bg-muted/30 border-transparent focus-visible:border-border" />
            </div>
            {["all", "draft", "published", "paused", "expired"].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
                  statusFilter === s ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground text-xs">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-lg">
              <p className="text-muted-foreground text-xs mb-2.5">No jobs found</p>
              <Button variant="ghost" size="sm" onClick={() => { setEditingJob(null); setShowForm(true); }} className="text-xs h-7">
                <Plus className="w-3 h-3 mr-1" /> Create first job
              </Button>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Job</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Type</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Status</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Urgency</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden xl:table-cell">Views</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden xl:table-cell">Apps</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(job => {
                    const isDupe = duplicates.has(job.id);
                    return (
                      <tr
                        key={job.id}
                        className={`border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer ${isDupe ? "bg-red-500/[0.03]" : ""}`}
                        onClick={() => setSelectedJob(job)}
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            {job.featured && <Star className="w-3 h-3 text-amber-500 fill-amber-500 flex-shrink-0" />}
                            {isDupe && <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />}
                            <div>
                              <p className="text-xs font-medium text-foreground line-clamp-1">{job.title}</p>
                              <p className="text-[10px] text-muted-foreground">{job.location} · {job.budget || "No budget"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 hidden lg:table-cell">
                          <span className="text-[10px] text-muted-foreground capitalize">{job.job_type}</span>
                        </td>
                        <td className="px-4 py-2.5 hidden md:table-cell">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${statusColors[job.status] || "bg-muted text-muted-foreground"}`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 hidden lg:table-cell">
                          <span className={`text-[10px] font-medium capitalize ${urgencyColors[job.urgency] || ""}`}>{job.urgency}</span>
                        </td>
                        <td className="px-4 py-2.5 hidden xl:table-cell text-[10px] text-muted-foreground tabular-nums">{job.views_count}</td>
                        <td className="px-4 py-2.5 hidden xl:table-cell text-[10px] text-muted-foreground tabular-nums">{job.applications_count}</td>
                        <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-0.5">
                            <button onClick={() => handleToggleStatus(job)} className="p-1 rounded hover:bg-muted transition-colors" title={job.status === "published" ? "Pause" : "Publish"}>
                              {job.status === "published" ? <Pause className="w-3 h-3 text-orange-500" /> : <Play className="w-3 h-3 text-emerald-500" />}
                            </button>
                            <button onClick={() => handleToggleFeatured(job)} className="p-1 rounded hover:bg-muted transition-colors" title="Toggle featured">
                              <Star className={`w-3 h-3 ${job.featured ? "text-amber-500 fill-amber-500" : "text-muted-foreground"}`} />
                            </button>
                            <button onClick={() => { setEditingJob(job); setShowForm(true); }} className="p-1 rounded hover:bg-muted transition-colors" title="Edit">
                              <Edit2 className="w-3 h-3 text-muted-foreground" />
                            </button>
                            <button onClick={() => handleClone(job)} className="p-1 rounded hover:bg-muted transition-colors" title="Clone">
                              <Copy className="w-3 h-3 text-muted-foreground" />
                            </button>
                            <button onClick={() => handleCopyLink(job)} className="p-1 rounded hover:bg-muted transition-colors" title="Share">
                              <Share2 className="w-3 h-3 text-muted-foreground" />
                            </button>
                            <button onClick={() => handleDelete(job.id)} className="p-1 rounded hover:bg-red-500/10 transition-colors" title="Delete">
                              <Trash2 className="w-3 h-3 text-red-500" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="moderation" className="space-y-3 mt-3">
          <div className="bg-card border border-border rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs font-medium text-foreground">Moderation Panel</p>
            </div>
            <p className="text-[10px] text-muted-foreground">Review flagged jobs, duplicates, and suspicious listings.</p>

            {duplicates.size > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-red-500 flex items-center gap-1 uppercase tracking-wider">
                  <AlertTriangle className="w-3 h-3" /> Duplicate Titles ({duplicates.size})
                </p>
                {jobs.filter(j => duplicates.has(j.id)).map(job => (
                  <div key={job.id} className="flex items-center justify-between p-2.5 bg-red-500/[0.04] border border-red-500/10 rounded-md">
                    <div>
                      <p className="text-xs font-medium text-foreground">{job.title}</p>
                      <p className="text-[10px] text-muted-foreground">{job.status} · Created {new Date(job.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2 text-muted-foreground hover:text-foreground" onClick={() => { setEditingJob(job); setShowForm(true); }}>Edit</Button>
                      <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2 text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => handleDelete(job.id)}>Delete</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {jobs.filter(j => j.status === "published" && j.expiry_date && new Date(j.expiry_date) < new Date()).length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-orange-600 flex items-center gap-1 uppercase tracking-wider">
                  <Clock className="w-3 h-3" /> Published but Expired
                </p>
                {jobs.filter(j => j.status === "published" && j.expiry_date && new Date(j.expiry_date) < new Date()).map(job => (
                  <div key={job.id} className="flex items-center justify-between p-2.5 bg-orange-500/[0.04] border border-orange-500/10 rounded-md">
                    <div>
                      <p className="text-xs font-medium text-foreground">{job.title}</p>
                      <p className="text-[10px] text-muted-foreground">Expired {new Date(job.expiry_date!).toLocaleDateString()}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2 text-muted-foreground hover:text-foreground" onClick={() => updateJob.mutateAsync({ id: job.id, status: "expired" }).then(() => toast.success("Marked expired"))}>
                      Mark Expired
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {duplicates.size === 0 && jobs.filter(j => j.status === "published" && j.expiry_date && new Date(j.expiry_date) < new Date()).length === 0 && (
              <div className="text-center py-6">
                <Shield className="w-5 h-5 mx-auto text-emerald-500 mb-1.5" />
                <p className="text-xs text-muted-foreground">All clear — no issues detected</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminExploreJobs;
