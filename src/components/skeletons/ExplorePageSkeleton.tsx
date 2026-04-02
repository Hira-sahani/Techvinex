import { Skeleton } from "@/components/ui/skeleton";

const JobCardSkeleton = () => (
  <div className="border border-border rounded-xl p-4 bg-card flex flex-col gap-3">
    <div className="flex items-start justify-between gap-2">
      <Skeleton className="h-5 w-3/5" />
      <Skeleton className="h-5 w-5 rounded-md" />
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-16" />
    </div>
    <div className="flex flex-wrap gap-1.5">
      <Skeleton className="h-5 w-14 rounded-full" />
      <Skeleton className="h-5 w-16 rounded-full" />
      <Skeleton className="h-5 w-12 rounded-full" />
    </div>
    <Skeleton className="h-3.5 w-full" />
    <Skeleton className="h-3.5 w-4/5" />
  </div>
);

const ExplorePageSkeleton = () => (
  <div className="max-w-5xl mx-auto">
    {/* Header skeleton */}
    <div className="flex items-center justify-between mb-4">
      <div>
        <Skeleton className="h-6 w-48 mb-1.5" />
        <Skeleton className="h-3.5 w-56" />
      </div>
      <div className="flex items-center gap-3 md:hidden">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </div>

    {/* Search bar skeleton */}
    <div className="flex items-center gap-0 mb-4">
      <Skeleton className="h-10 w-10 rounded-l-lg rounded-r-none" />
      <Skeleton className="h-10 flex-1 rounded-r-lg rounded-l-none" />
    </div>

    {/* Sort & Refer skeleton */}
    <div className="flex items-center gap-2 mb-5">
      <Skeleton className="h-8 w-28 rounded-full" />
      <Skeleton className="h-8 w-28 rounded-full" />
    </div>

    {/* Job cards skeleton */}
    <div className="grid grid-cols-1 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <JobCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

export default ExplorePageSkeleton;
