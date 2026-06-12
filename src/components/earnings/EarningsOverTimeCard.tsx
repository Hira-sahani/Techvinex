import { Button } from "@/components/ui/button";
import { DollarSign, Clock } from "lucide-react";
import { memo } from "react";

interface Props {
  totalPaid: number;
}

/**
 * Pure presentational earnings-over-time card. Extracted from Earnings.tsx.
 */
const EarningsOverTimeCard = ({ totalPaid }: Props) => (
  <div className="rounded-xl border border-border p-4 bg-card mb-4">
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-semibold text-foreground text-sm">Earnings Over Time</h3>
      <div className="flex items-center gap-2">
        <DollarSign size={16} className="text-muted-foreground" />
        <Clock size={16} className="text-muted-foreground" />
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Earnings total</p>
          <p className="text-sm font-bold text-foreground">${totalPaid.toFixed(2)}</p>
        </div>
      </div>
    </div>
    <div className="flex gap-2 mb-4 flex-wrap">
      <span className="text-[10px] px-2 py-1 rounded border border-border text-muted-foreground">📅 Billing Date: Mar 1 - Mar 18, 2026</span>
      <span className="text-[10px] px-2 py-1 rounded border border-border text-muted-foreground">📋 Contracts</span>
      <span className="text-[10px] px-2 py-1 rounded border border-border text-muted-foreground">📊 Type</span>
    </div>
    <div className="h-28 border-l-2 border-b-2 border-border relative">
      <span className="absolute -left-8 top-0 text-[10px] text-muted-foreground">$100</span>
      <span className="absolute -left-6 top-1/4 text-[10px] text-muted-foreground">$75</span>
      <span className="absolute -left-6 top-1/2 text-[10px] text-muted-foreground">$50</span>
    </div>
  </div>
);

export default memo(EarningsOverTimeCard);
