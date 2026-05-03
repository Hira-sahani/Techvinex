import { Shimmer, SkeletonList, SkeletonStatGrid, SkeletonTable } from "@/components/skeletons/Skeleton";
import { cn } from "@/lib/utils";

const a11y = (label: string) => ({
  role: "status" as const,
  "aria-busy": true,
  "aria-live": "polite" as const,
  "aria-label": label,
});

const Sr = ({ label }: { label: string }) => <span className="sr-only">{label}</span>;

/**
 * Generic skeleton for employer pages that show a header + list/table.
 */
export const EmployerListSkeleton = ({
  className,
  loadingLabel = "Loading",
  rows = 5,
}: { className?: string; loadingLabel?: string; rows?: number } = {}) => (
  <div className={cn("space-y-6 max-w-5xl", className)} {...a11y(loadingLabel)}>
    <Sr label={loadingLabel} />
    <div aria-hidden="true" className="space-y-4">
      <div className="space-y-2">
        <Shimmer className="h-5 w-48" />
        <Shimmer className="h-3 w-64" />
      </div>
      <SkeletonList rows={rows} />
    </div>
  </div>
);

/**
 * Skeleton for analytics/billing-style pages: stats grid + table.
 */
export const EmployerStatsSkeleton = ({
  className,
  loadingLabel = "Loading",
  cols = 3,
  withTable = true,
}: { className?: string; loadingLabel?: string; cols?: number; withTable?: boolean } = {}) => (
  <div className={cn("space-y-6 max-w-5xl", className)} {...a11y(loadingLabel)}>
    <Sr label={loadingLabel} />
    <div aria-hidden="true" className="space-y-4">
      <Shimmer className="h-5 w-48" />
      <SkeletonStatGrid count={cols} cols={`grid-cols-2 sm:grid-cols-${cols}`} />
      {withTable && <SkeletonTable rows={5} cols={cols + 1} />}
    </div>
  </div>
);
