import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { SkeletonTableRows } from "@/components/skeletons/Skeleton";

const AdminAuditLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => { setLogs(data || []); setLoading(false); });
  }, []);

  const filtered = logs.filter((l) =>
    (l.action || "").toLowerCase().includes(search.toLowerCase()) ||
    (l.target_type || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-base font-semibold text-foreground tracking-tight">Audit Logs</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Full activity tracking and history</p>
      </div>

      <div className="bg-card border border-border rounded-lg">
        <div className="px-4 py-3 border-b border-border">
          <div className="relative max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="Search logs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-xs bg-muted/30 border-transparent focus-visible:border-border" />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border">
              <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider h-8">Action</TableHead>
              <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider h-8">Target</TableHead>
              <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider h-8">Target ID</TableHead>
              <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider h-8">Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <SkeletonTableRows rows={5} cols={4} />
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground text-xs">No audit logs found</TableCell></TableRow>
            ) : (
              filtered.map((l) => (
                <TableRow key={l.id} className="hover:bg-muted/30 border-b border-border/50">
                  <TableCell><span className="font-mono text-[10px] text-foreground bg-muted/60 px-1.5 py-0.5 rounded">{l.action}</span></TableCell>
                  <TableCell className="text-muted-foreground text-xs py-2.5">{l.target_type || "—"}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-[10px] py-2.5">{l.target_id ? l.target_id.slice(0, 8) + "..." : "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-[10px] py-2.5 tabular-nums">{new Date(l.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminAuditLogs;
