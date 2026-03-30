import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowRight } from "lucide-react";
import { useCreateExploreJob } from "@/hooks/useExploreJobs";
import { toast } from "sonner";

const AdminRequirements = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const createExploreJob = useCreateExploreJob();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from("employer_jobs").select("*").order("created_at", { ascending: false })
      .then(({ data }) => { setJobs(data || []); setLoading(false); });
  }, []);

  const filtered = jobs.filter((j) =>
    (j.title || "").toLowerCase().includes(search.toLowerCase()) ||
    (j.department || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleConvert = async (job: any) => {
    try {
      await createExploreJob.mutateAsync({
        title: job.title, description: job.description || "", skills: job.skills || [],
        budget: job.budget || "", job_type: job.type || "contract", location: job.location || "Remote",
        source_requirement_id: job.id, status: "draft",
      });
      toast.success("Requirement converted to Explore Job (Draft)");
      navigate("/admin/explore-jobs");
    } catch { toast.error("Failed to convert"); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-base font-semibold text-foreground tracking-tight">Requirements</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Monitor employer job requirements & convert to explore listings</p>
      </div>

      <div className="bg-card border border-border rounded-lg">
        <div className="px-4 py-3 border-b border-border">
          <div className="relative max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="Search requirements..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-xs bg-muted/30 border-transparent focus-visible:border-border" />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border">
              <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider h-8">Title</TableHead>
              <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider h-8">Department</TableHead>
              <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider h-8">Type</TableHead>
              <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider h-8">Location</TableHead>
              <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider h-8">Candidates</TableHead>
              <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider h-8">Status</TableHead>
              <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider h-8">Created</TableHead>
              <TableHead className="text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider h-8">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground text-xs">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground text-xs">No requirements found</TableCell></TableRow>
            ) : filtered.map((j) => (
              <TableRow key={j.id} className="hover:bg-muted/30 border-b border-border/50">
                <TableCell className="font-medium text-foreground text-xs py-2.5">{j.title}</TableCell>
                <TableCell className="text-muted-foreground text-xs py-2.5">{j.department || "—"}</TableCell>
                <TableCell className="text-muted-foreground text-xs py-2.5">{j.type || "—"}</TableCell>
                <TableCell className="text-muted-foreground text-xs py-2.5">{j.location || "Remote"}</TableCell>
                <TableCell className="text-muted-foreground text-xs py-2.5 tabular-nums">{j.candidate_count || 0}</TableCell>
                <TableCell>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">{j.status || "active"}</span>
                </TableCell>
                <TableCell className="text-muted-foreground text-[10px] py-2.5 tabular-nums">{new Date(j.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleConvert(j)} className="gap-1 text-[10px] h-6 px-2 text-muted-foreground hover:text-foreground" disabled={createExploreJob.isPending}>
                    Convert <ArrowRight className="w-3 h-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminRequirements;
