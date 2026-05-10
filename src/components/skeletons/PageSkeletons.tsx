import SidebarNav from "@/components/SidebarNav";
import TopStatusBar from "@/components/TopStatusBar";
import { Shimmer, SkeletonCard, SkeletonList, SkeletonTable } from "./Skeleton";
import { cn } from "@/lib/utils";

const a11y = (label: string) => ({
  role: "status" as const,
  "aria-busy": true,
  "aria-live": "polite" as const,
  "aria-label": label,
});

const Sr = ({ label }: { label: string }) => <span className="sr-only">{label}</span>;

/** Skeleton for the Earnings page layout. */
export const EarningsPageSkeleton = ({ className }: { className?: string } = {}) => (
  <div className={cn("min-h-screen bg-background", className)} {...a11y("Loading earnings")}>
    <Sr label="Loading earnings" />
    <SidebarNav />
    <div className="md:ml-16 pb-20" aria-hidden="true">
      <TopStatusBar currentStep={2} />
      <div className="px-4 sm:px-6 pt-4 max-w-2xl mx-auto space-y-4">
        <div className="space-y-2">
          <Shimmer className="h-6 w-40" />
          <Shimmer className="h-3 w-64" />
        </div>
        <div className="flex items-center justify-between">
          <Shimmer className="h-3 w-48" />
          <Shimmer className="h-8 w-36 rounded-md" />
        </div>
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
          <Shimmer className="h-4 w-56" />
          <Shimmer className="h-3 w-72" />
          <Shimmer className="h-8 w-44 rounded-md" />
        </div>
        <div className="rounded-xl border border-border p-4 bg-card space-y-3">
          <div className="flex items-center justify-between">
            <Shimmer className="h-4 w-40" />
            <Shimmer className="h-4 w-24" />
          </div>
          <Shimmer className="h-28 w-full rounded-md" />
        </div>
        <SkeletonTable rows={4} cols={6} />
      </div>
    </div>
  </div>
);

/** Skeleton for the Referrals page layout. */
export const ReferralsPageSkeleton = ({ className }: { className?: string } = {}) => (
  <div className={cn("min-h-screen bg-background", className)} {...a11y("Loading referrals")}>
    <Sr label="Loading referrals" />
    <SidebarNav />
    <div className="md:ml-16 pb-20" aria-hidden="true">
      <TopStatusBar currentStep={2} />
      <div className="px-4 sm:px-6 pt-4 max-w-2xl mx-auto space-y-5">
        <div className="space-y-2">
          <Shimmer className="h-6 w-44" />
          <Shimmer className="h-3 w-72" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => <SkeletonCard key={i} className="p-3" />)}
        </div>
        <div className="rounded-xl border border-border p-5 bg-card space-y-3">
          <Shimmer className="h-4 w-32" />
          <div className="flex gap-2">
            <Shimmer className="h-9 flex-1 rounded-md" />
            <Shimmer className="h-9 w-20 rounded-md" />
          </div>
        </div>
        <div className="rounded-xl border border-border p-5 bg-card space-y-4">
          <Shimmer className="h-4 w-40" />
          <Shimmer className="h-10 w-full rounded-md" />
          <Shimmer className="h-10 w-full rounded-md" />
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => <Shimmer key={i} className="h-8 rounded-md" />)}
          </div>
        </div>
        <SkeletonList rows={4} />
      </div>
    </div>
  </div>
);

/** Skeleton used inside individual profile tabs while data loads. */
export const ProfileTabSkeleton = ({
  rows = 5,
  className,
  loadingLabel = "Loading profile section",
}: { rows?: number; className?: string; loadingLabel?: string } = {}) => (
  <div className={cn("space-y-6 max-w-xl pb-24", className)} {...a11y(loadingLabel)}>
    <Sr label={loadingLabel} />
    <div aria-hidden="true" className="space-y-6">
      <div className="flex items-center justify-between">
        <Shimmer className="h-4 w-40" />
        <Shimmer className="h-8 w-20 rounded-md" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Shimmer className="h-3 w-24" />
            <Shimmer className="h-10 w-full rounded-md" />
          </div>
        ))}
      </div>
      <Shimmer className="h-10 w-full rounded-md" />
    </div>
  </div>
);
