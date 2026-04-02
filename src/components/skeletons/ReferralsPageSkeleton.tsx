import { Skeleton } from "@/components/ui/skeleton";
import SkeletonOverlayLoader from "./SkeletonOverlayLoader";

const ReferralsPageSkeleton = () => (
  <div className="max-w-2xl mx-auto space-y-5">
    <SkeletonOverlayLoader />
    {/* Header */}
    <div>
      <Skeleton className="h-7 w-36 mb-1.5" />
      <Skeleton className="h-4 w-64" />
    </div>

    {/* Stats */}
    <div className="grid grid-cols-3 gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border p-3 bg-card text-center">
          <Skeleton className="h-4 w-4 mx-auto mb-1 rounded-full" />
          <Skeleton className="h-3 w-12 mx-auto mb-1" />
          <Skeleton className="h-6 w-8 mx-auto" />
        </div>
      ))}
    </div>

    {/* Invite by email */}
    <div className="rounded-xl border border-border p-5 bg-card space-y-3">
      <Skeleton className="h-4 w-28" />
      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1 rounded-md" />
        <Skeleton className="h-9 w-20 rounded-md" />
      </div>
    </div>

    {/* Referral Code Card */}
    <div className="rounded-xl border border-border p-5 bg-card space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div>
          <Skeleton className="h-4 w-28 mb-1" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1 rounded-md" />
        <Skeleton className="h-9 flex-1 rounded-md" />
      </div>
    </div>

    {/* How it works */}
    <div className="rounded-xl border border-border p-5 bg-card space-y-3">
      <Skeleton className="h-5 w-28 mb-2" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          <div className="flex-1">
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>

    {/* Referral history */}
    <div className="rounded-xl border border-border p-5 bg-card space-y-3">
      <Skeleton className="h-5 w-36 mb-2" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-2">
          <div>
            <Skeleton className="h-4 w-40 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  </div>
);

export default ReferralsPageSkeleton;
