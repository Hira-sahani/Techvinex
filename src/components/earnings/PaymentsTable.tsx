import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { memo } from "react";

export interface PayoutRow {
  id: string;
  created_at: string;
  notes: string | null;
  status: string;
  amount: number | string;
}

interface Props {
  payoutHistory: PayoutRow[];
}

/**
 * Pure presentational payments table. Extracted from Earnings.tsx to
 * shrink that route's chunk and make this block independently memoizable.
 */
const PaymentsTable = ({ payoutHistory }: Props) => (
  <div className="rounded-xl border border-border p-4 bg-card">
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-semibold text-foreground text-sm">Payments</h3>
      <Button variant="outline" size="sm" className="text-xs gap-1.5">
        <Download size={14} /> Download Payment Report
      </Button>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 font-medium text-muted-foreground">Payout date</th>
            <th className="text-left py-2 font-medium text-muted-foreground">Type</th>
            <th className="text-left py-2 font-medium text-muted-foreground">Description</th>
            <th className="text-left py-2 font-medium text-muted-foreground">Status</th>
            <th className="text-left py-2 font-medium text-muted-foreground">Hours</th>
            <th className="text-left py-2 font-medium text-muted-foreground">Earned</th>
          </tr>
        </thead>
        <tbody>
          {payoutHistory.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center py-8">
                <p className="text-sm text-muted-foreground font-medium">No payment history yet</p>
                <p className="text-xs text-muted-foreground">Once you receive your first payout, it will appear here</p>
              </td>
            </tr>
          ) : (
            payoutHistory.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="py-2 text-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                <td className="py-2 text-foreground">Payout</td>
                <td className="py-2 text-foreground">{p.notes || "—"}</td>
                <td className="py-2">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    p.status === "completed" ? "bg-green-500/10 text-green-600" :
                    p.status === "pending" ? "bg-amber-500/10 text-amber-600" :
                    "bg-destructive/10 text-destructive"
                  }`}>
                    {p.status}
                  </span>
                </td>
                <td className="py-2 text-foreground">—</td>
                <td className="py-2 font-medium text-foreground">${Number(p.amount).toFixed(2)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
);

export default memo(PaymentsTable);
