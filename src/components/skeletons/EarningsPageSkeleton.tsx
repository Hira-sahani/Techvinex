import { Skeleton } from "@/components/ui/skeleton";

const EarningsPageSkeleton = () => (
  <div className="max-w-2xl mx-auto">
    {/* Header */}
    <Skeleton className="h-7 w-32 mb-1.5" />
    <Skeleton className="h-4 w-72 mb-4" />

    {/* Payment method status */}
    <div className="flex items-center justify-between mb-4">
      <Skeleton className="h-3.5 w-48" />
      <Skeleton className="h-8 w-36 rounded-md" />
    </div>

    {/* Promo banner */}
    <div className="rounded-xl border border-border p-4 bg-card mb-4">
      <Skeleton className="h-4 w-56 mb-1.5" />
      <Skeleton className="h-3.5 w-full mb-1" />
      <Skeleton className="h-3.5 w-4/5 mb-3" />
      <Skeleton className="h-8 w-52 rounded-md" />
    </div>

    {/* Earnings chart */}
    <div className="rounded-xl border border-border p-4 bg-card mb-4">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="flex gap-2 mb-4">
        <Skeleton className="h-6 w-40 rounded" />
        <Skeleton className="h-6 w-20 rounded" />
        <Skeleton className="h-6 w-16 rounded" />
      </div>
      <Skeleton className="h-28 w-full rounded" />
    </div>

    {/* Summary cards */}
    <div className="grid grid-cols-2 gap-3 mb-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border p-4 bg-card">
          <Skeleton className="h-3.5 w-24 mb-2" />
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>

    {/* Payout history */}
    <div className="rounded-xl border border-border p-4 bg-card">
      <Skeleton className="h-5 w-32 mb-4" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-3 border-t border-border first:border-0">
          <div>
            <Skeleton className="h-4 w-36 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  </div>
);

export default EarningsPageSkeleton;
