import { Skeleton } from "@/components/ui/skeleton";

const JobDetailSkeleton = () => (
  <div className="min-h-screen bg-background">
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Back button */}
      <Skeleton className="h-8 w-24 rounded-lg mb-6" />
      
      {/* Title & badges */}
      <Skeleton className="h-7 w-3/4 mb-3" />
      <div className="flex gap-2 mb-4">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>

      {/* Meta info */}
      <div className="flex flex-wrap gap-4 mb-6">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>

      {/* Description block */}
      <div className="space-y-2 mb-8">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/6" />
      </div>

      {/* Skills */}
      <Skeleton className="h-5 w-20 mb-3" />
      <div className="flex flex-wrap gap-2 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-20 rounded-full" />
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
    </div>
  </div>
);

export default JobDetailSkeleton;
