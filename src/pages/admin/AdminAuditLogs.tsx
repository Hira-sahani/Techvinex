import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ShieldAlert, AlertTriangle } from "lucide-react";
import { SkeletonTableRows } from "@/components/skeletons/Skeleton";

type Filter = "all" | "denies";

const SPIKE_WINDOW_MS = 5 * 60 * 1000;
const SPIKE_THRESHOLD = 20;

const AdminAuditLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => { setLogs(data || []); setLoading(false); });
  }, []);

  const recentDenies = useMemo(() => {
    const cutoff = Date.now() - SPIKE_WINDOW_MS;
    return logs.filter((l) =>
      typeof l.action === "string" &&
      l.action.startsWith("deny:") &&
      new Date(l.created_at).getTime() >= cutoff
    );
  }, [logs]);

  const isSpike = recentDenies.length >= SPIKE_THRESHOLD;

  const filtered = useMemo(() => {
    const base = filter === "denies"
      ? logs.filter((l) => typeof l.action === "string" && l.action.startsWith("deny:"))
      : logs;
    const q = search.toLowerCase();
    if (!q) return base;
    return base.filter((l) =>
      (l.action || "").toLowerCase().includes(q) ||
      (l.target_type || "").toLowerCase().includes(q) ||
      JSON.stringify(l.details ?? {}).toLowerCase().includes(q)
    );
  }, [logs, filter, search]);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-foreground tracking-tight">Audit Logs</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Full activity tracking and history</p>
        </div>
        {isSpike && (
          <Badge variant="destructive" className="gap-1.5 h-7 px-2.5 text-[11px]">
            <AlertTriangle className="w-3 h-3" />
            Anomaly: {recentDenies.length} denies / 5 min
          </Badge>
        )}
      </div>

      <div className="bg-card border border-border rounded-lg">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-wrap">
          <div className="relative max-w-xs flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="Search logs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-xs bg-muted/30 border-transparent focus-visible:border-border" />
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
              className="h-8 text-[11px] px-3"
            >
              All
            </Button>
            <Button
              size="sm"
              variant={filter === "denies" ? "default" : "outline"}
              onClick={() => setFilter("denies")}
              className="h-8 text-[11px] px-3 gap-1"
            >
              <ShieldAlert className="w-3 h-3" />
              Denies ({recentDenies.length})
            </Button>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border">
              <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider h-8">Action</TableHead>
              <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider h-8">Target</TableHead>
              <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider h-8">Reason / IP</TableHead>
              <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider h-8">Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <SkeletonTableRows rows={5} cols={4} />
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground text-xs">No audit logs found</TableCell></TableRow>
            ) : (
              filtered.map((l) => {
                const isDeny = typeof l.action === "string" && l.action.startsWith("deny:");
                const details = (l.details ?? {}) as Record<string, unknown>;
                return (
                  <TableRow key={l.id} className="hover:bg-muted/30 border-b border-border/50">
                    <TableCell>
                      <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${isDeny ? "bg-destructive/10 text-destructive" : "bg-muted/60 text-foreground"}`}>
                        {l.action}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs py-2.5">{l.target_id || l.target_type || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-[10px] py-2.5 font-mono">
                      {String(details.reason ?? "")} {details.ip ? `· ${details.ip}` : ""}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-[10px] py-2.5 tabular-nums">{new Date(l.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminAuditLogs;
