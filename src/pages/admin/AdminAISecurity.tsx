import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ShieldAlert, Bug, FileWarning, KeyRound, Activity } from "lucide-react";
import { SkeletonTableRows } from "@/components/skeletons/Skeleton";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

interface AuditRow {
  id: string;
  user_id: string | null;
  kind: string;
  event: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  plan_hash: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

interface QuotaRow {
  user_id: string;
  kind: string;
  used_count: number;
  daily_limit: number;
  blocked_until: string | null;
  period_start: string;
}

const SEV_COLOR: Record<string, string> = {
  info: "bg-muted text-muted-foreground",
  low: "bg-blue-100 text-blue-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const AdminAISecurity = () => {
  useDocumentMeta({ title: "AI Security · Techvinex Admin", description: "Live view of prompt-injection, jailbreak, file, and quota events across all AI surfaces.", robots: "noindex,nofollow" });
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [quotas, setQuotas] = useState<QuotaRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [a, u] = await Promise.all([
        supabase.from("ai_security_audit").select("*").order("created_at", { ascending: false }).limit(300),
        supabase.from("ai_usage_quota").select("*").order("used_count", { ascending: false }).limit(50),
      ]);
      setAudit((a.data as AuditRow[]) || []);
      setQuotas((u.data as QuotaRow[]) || []);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const day = Date.now() - 24 * 60 * 60 * 1000;
    const recent = audit.filter((r) => new Date(r.created_at).getTime() >= day);
    return {
      injections: recent.filter((r) => r.event.startsWith("injection")).length,
      jailbreaks: recent.filter((r) => /jailbreak|role-hijack|prompt-leak/i.test(JSON.stringify(r.details ?? {}))).length,
      planViolations: recent.filter((r) => r.event.startsWith("plan_violation")).length,
      fileThreats: recent.filter((r) => /file|upload|signature|macro/.test(r.kind)).length,
      criticals: recent.filter((r) => r.severity === "critical" || r.severity === "high").length,
      total: recent.length,
    };
  }, [audit]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return audit;
    return audit.filter((r) =>
      r.kind.toLowerCase().includes(t) ||
      r.event.toLowerCase().includes(t) ||
      r.severity.toLowerCase().includes(t) ||
      (r.user_id ?? "").toLowerCase().includes(t) ||
      JSON.stringify(r.details ?? {}).toLowerCase().includes(t),
    );
  }, [audit, q]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-base font-semibold text-foreground tracking-tight">AI Security Dashboard</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Prompt injection · jailbreaks · plan violations · file threats · per-user quotas</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
        <StatCard icon={ShieldAlert} label="Injection attempts (24h)" value={stats.injections} tone="orange" />
        <StatCard icon={Bug} label="Jailbreak signals" value={stats.jailbreaks} tone="red" />
        <StatCard icon={KeyRound} label="Plan violations" value={stats.planViolations} tone="amber" />
        <StatCard icon={FileWarning} label="File threats" value={stats.fileThreats} tone="orange" />
        <StatCard icon={Activity} label="Total AI events" value={stats.total} tone="muted" />
      </div>

      <div className="flex items-center gap-2">
        <Input placeholder="Filter events / kinds / users…" value={q} onChange={(e) => setQ(e.target.value)} className="h-8 text-xs max-w-md" />
        <Badge variant="outline" className="text-[10px]">{filtered.length} / {audit.length}</Badge>
      </div>

      <div className="rounded border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[10px]">When</TableHead>
              <TableHead className="text-[10px]">Kind</TableHead>
              <TableHead className="text-[10px]">Event</TableHead>
              <TableHead className="text-[10px]">Severity</TableHead>
              <TableHead className="text-[10px]">User</TableHead>
              <TableHead className="text-[10px]">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <SkeletonTableRows rows={8} cols={6} /> : filtered.slice(0, 200).map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-[10px] text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</TableCell>
                <TableCell className="text-[11px] font-mono">{r.kind}</TableCell>
                <TableCell className="text-[11px]">{r.event}</TableCell>
                <TableCell><Badge className={`${SEV_COLOR[r.severity] ?? "bg-muted"} text-[10px]`}>{r.severity}</Badge></TableCell>
                <TableCell className="text-[10px] font-mono text-muted-foreground">{r.user_id?.slice(0, 8) ?? "—"}</TableCell>
                <TableCell className="text-[10px] font-mono text-muted-foreground max-w-md truncate">{JSON.stringify(r.details ?? {})}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-foreground mb-2">Top consumers · today</h2>
        <div className="rounded border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px]">User</TableHead>
                <TableHead className="text-[10px]">Kind</TableHead>
                <TableHead className="text-[10px]">Used</TableHead>
                <TableHead className="text-[10px]">Daily limit</TableHead>
                <TableHead className="text-[10px]">Blocked</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotas.map((r) => (
                <TableRow key={`${r.user_id}-${r.kind}-${r.period_start}`}>
                  <TableCell className="text-[10px] font-mono">{r.user_id.slice(0, 8)}</TableCell>
                  <TableCell className="text-[11px]">{r.kind}</TableCell>
                  <TableCell className="text-[11px] font-semibold">{r.used_count}</TableCell>
                  <TableCell className="text-[11px]">{r.daily_limit}</TableCell>
                  <TableCell className="text-[10px]">{r.blocked_until ? <Badge variant="destructive" className="text-[10px]">until {new Date(r.blocked_until).toLocaleString()}</Badge> : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: "red" | "orange" | "amber" | "muted" }) => {
  const map: Record<string, string> = {
    red: "text-red-600 bg-red-50 border-red-200",
    orange: "text-orange-600 bg-orange-50 border-orange-200",
    amber: "text-amber-600 bg-amber-50 border-amber-200",
    muted: "text-muted-foreground bg-muted/40 border-border",
  };
  return (
    <div className={`rounded border p-2.5 ${map[tone]}`}>
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
};

export default AdminAISecurity;
