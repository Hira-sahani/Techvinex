import { Skeleton } from "@/components/ui/skeleton";

const DashboardPageSkeleton = () => (
  <div className="max-w-5xl mx-auto">
    {/* Header */}
    <div className="flex items-center justify-between mb-6">
      <div>
        <Skeleton className="h-6 w-44 mb-1.5" />
        <Skeleton className="h-4 w-52" />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </div>

    {/* Stats Cards */}
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="border border-border rounded-xl p-4 bg-card">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-7 w-10" />
        </div>
      ))}
    </div>

    {/* Profile Strength */}
    <div className="border border-border rounded-xl p-4 bg-card mb-6">
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-2 w-full rounded-full mb-1.5" />
      <Skeleton className="h-3 w-64" />
    </div>

    {/* Pipeline section */}
    <div className="border border-border rounded-xl p-4 bg-card mb-6">
      <Skeleton className="h-5 w-40 mb-4" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div>
                <Skeleton className="h-4 w-36 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>

    {/* Upcoming interviews */}
    <div className="border border-border rounded-xl p-4 bg-card">
      <Skeleton className="h-5 w-44 mb-4" />
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-4 w-40 mb-1" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default DashboardPageSkeleton;
