import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUpRight, ArrowDownRight, DollarSign } from "lucide-react";
import { SkeletonTableRows } from "@/components/skeletons/Skeleton";

const AdminPayments = () => {
  const [billing, setBilling] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("employer_billing").select("*").order("created_at", { ascending: false }),
      supabase.from("payout_history").select("*").order("created_at", { ascending: false }),
    ]).then(([b, p]) => { setBilling(b.data || []); setPayouts(p.data || []); setLoading(false); });
  }, []);

  const totalRevenue = billing.reduce((s, b) => s + (Number(b.fee) || 0), 0);
  const totalPayouts = payouts.reduce((s, p) => s + (Number(p.amount) || 0), 0);

  const metricCards = [
    { label: "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, icon: ArrowUpRight, color: "text-emerald-600" },
    { label: "Total Payouts", value: `$${totalPayouts.toLocaleString()}`, icon: ArrowDownRight, color: "text-muted-foreground" },
    { label: "Net Revenue", value: `$${(totalRevenue - totalPayouts).toLocaleString()}`, icon: DollarSign, color: "text-foreground" },
  ];

  const tableHeaderClass = "text-[10px] font-semibold text-muted-foreground uppercase tracking-wider h-8";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-base font-semibold text-foreground tracking-tight">Payments</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Revenue, billing, and payout management</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {metricCards.map((m) => (
          <div key={m.label} className="bg-card border border-border rounded-lg p-3.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-muted/60 flex items-center justify-center">
              <m.icon className={`w-3.5 h-3.5 ${m.color}`} />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{m.label}</p>
              <p className="text-sm font-semibold text-foreground tabular-nums">{m.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-lg">
        <div className="px-4 pt-4">
          <Tabs defaultValue="billing">
            <TabsList className="h-8 bg-muted/50">
              <TabsTrigger value="billing" className="text-[10px] h-6 px-3">Employer Billing ({billing.length})</TabsTrigger>
              <TabsTrigger value="payouts" className="text-[10px] h-6 px-3">Candidate Payouts ({payouts.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="billing" className="mt-3">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border">
                    <TableHead className={tableHeaderClass}>Candidate</TableHead>
                    <TableHead className={tableHeaderClass}>Job Title</TableHead>
                    <TableHead className={tableHeaderClass}>Fee</TableHead>
                    <TableHead className={tableHeaderClass}>Status</TableHead>
                    <TableHead className={tableHeaderClass}>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <SkeletonTableRows rows={4} cols={5} />
                  ) : billing.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-xs">No billing records</TableCell></TableRow>
                  ) : billing.map((b) => (
                    <TableRow key={b.id} className="hover:bg-muted/30 border-b border-border/50">
                      <TableCell className="font-medium text-foreground text-xs py-2.5">{b.candidate_name || "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-xs py-2.5">{b.job_title || "—"}</TableCell>
                      <TableCell className="font-semibold text-foreground text-xs py-2.5 tabular-nums">${Number(b.fee || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${b.status === "paid" ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>{b.status || "pending"}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-[10px] py-2.5 tabular-nums">{new Date(b.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="payouts" className="mt-3">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border">
                    <TableHead className={tableHeaderClass}>Description</TableHead>
                    <TableHead className={tableHeaderClass}>Amount</TableHead>
                    <TableHead className={tableHeaderClass}>Status</TableHead>
                    <TableHead className={tableHeaderClass}>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <SkeletonTableRows rows={4} cols={4} />
                  ) : payouts.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-xs">No payout records</TableCell></TableRow>
                  ) : payouts.map((p) => (
                    <TableRow key={p.id} className="hover:bg-muted/30 border-b border-border/50">
                      <TableCell className="font-medium text-foreground text-xs py-2.5">{p.description || "—"}</TableCell>
                      <TableCell className="font-semibold text-foreground text-xs py-2.5 tabular-nums">${Number(p.amount || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${p.status === "completed" ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>{p.status || "pending"}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-[10px] py-2.5 tabular-nums">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AdminPayments;
