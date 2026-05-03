import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { SkeletonTableRows } from "@/components/skeletons/Skeleton";

const AdminCandidates = () => {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCandidates = async () => {
      const [{ data: profiles }, { data: apps }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("applications").select("user_id, status"),
      ]);
      const appCounts: Record<string, number> = {};
      (apps || []).forEach((a) => { appCounts[a.user_id] = (appCounts[a.user_id] || 0) + 1; });
      setCandidates((profiles || []).map((p) => ({ ...p, application_count: appCounts[p.user_id] || 0 })));
      setLoading(false);
    };
    fetchCandidates();
  }, []);

  const filtered = candidates.filter((c) =>
    (c.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-base font-semibold text-foreground tracking-tight">Candidates</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Candidate intelligence and insights</p>
      </div>

      <div className="bg-card border border-border rounded-lg">
        <div className="px-4 py-3 border-b border-border">
          <div className="relative max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="Search candidates..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-xs bg-muted/30 border-transparent focus-visible:border-border" />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border">
              <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider h-8">Name</TableHead>
              <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider h-8">Email</TableHead>
              <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider h-8">Country</TableHead>
              <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider h-8">Apps</TableHead>
              <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider h-8">Onboarding</TableHead>
              <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider h-8">Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <SkeletonTableRows rows={5} cols={6} />
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-xs">No candidates found</TableCell></TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow key={c.id} className="hover:bg-muted/30 border-b border-border/50">
                  <TableCell className="font-medium text-foreground text-xs py-2.5">{c.full_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs py-2.5">{c.email || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs py-2.5">{c.country || "—"}</TableCell>
                  <TableCell className="text-xs py-2.5 tabular-nums text-muted-foreground">{c.application_count}</TableCell>
                  <TableCell>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${c.onboarding_completed ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                      {c.onboarding_completed ? "Complete" : "Incomplete"}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-[10px] py-2.5 tabular-nums">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminCandidates;
