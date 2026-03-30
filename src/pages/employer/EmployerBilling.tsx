import { useEmployerBilling } from "@/hooks/useEmployerData";
import { IndianRupee, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import JetraLoaderInline from "@/components/JetraLoaderInline";

const EmployerBilling = () => {
  const { data: billing = [], isLoading } = useEmployerBilling();

  const total = billing.reduce((a, b) => a + Number(b.fee), 0);
  const paid = billing.filter(b => b.status === "paid").reduce((a, b) => a + Number(b.fee), 0);
  const pending = billing.filter(b => b.status === "pending").reduce((a, b) => a + Number(b.fee), 0);

  const statusConfig: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
    paid: { color: "bg-green-100 text-green-700", icon: CheckCircle2 },
    pending: { color: "bg-amber-100 text-amber-700", icon: Clock },
    overdue: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  };

  const formatCurrency = (n: number) => "₹" + n.toLocaleString("en-IN");

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><JetraLoaderInline /></div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">Track hiring fees and payments</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-5 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <IndianRupee size={16} className="text-primary" />
            <span className="text-xs text-muted-foreground font-medium">Total Fees</span>
          </div>
          <p className="text-xl font-bold text-foreground tabular-nums">{formatCurrency(total)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={16} className="text-green-600" />
            <span className="text-xs text-muted-foreground font-medium">Paid</span>
          </div>
          <p className="text-xl font-bold text-green-600 tabular-nums">{formatCurrency(paid)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-amber-600" />
            <span className="text-xs text-muted-foreground font-medium">Pending</span>
          </div>
          <p className="text-xl font-bold text-amber-600 tabular-nums">{formatCurrency(pending)}</p>
        </div>
      </div>

      {billing.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-10 shadow-card text-center">
          <p className="text-sm text-muted-foreground">No billing records yet. Fees will appear here after successful hires.</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Candidate</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Job Title</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Hire Date</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground px-5 py-3">Fee</th>
                  <th className="text-center text-xs font-semibold text-muted-foreground px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {billing.map((b) => {
                  const cfg = statusConfig[b.status] || statusConfig.pending;
                  return (
                    <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-4 text-sm font-medium text-foreground">{b.candidate_name}</td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">{b.job_title}</td>
                      <td className="px-5 py-4 text-sm text-muted-foreground tabular-nums">{b.hire_date || "—"}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-foreground text-right tabular-nums">{formatCurrency(Number(b.fee))}</td>
                      <td className="px-5 py-4 text-center">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cfg.color}`}>{b.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployerBilling;
