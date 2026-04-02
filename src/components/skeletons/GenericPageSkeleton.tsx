import { Skeleton } from "@/components/ui/skeleton";
import SkeletonOverlayLoader from "./SkeletonOverlayLoader";

const GenericPageSkeleton = () => (
  <div className="min-h-screen bg-background">
    {/* Sidebar placeholder */}
    <aside className="fixed left-0 top-0 bottom-0 w-16 border-r border-border bg-background z-50">
      <div className="flex flex-col items-center pt-4 gap-4">
        <Skeleton className="h-9 w-9 rounded-xl" />
        <div className="flex flex-col items-center gap-3 mt-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-10 rounded-lg" />
          ))}
        </div>
      </div>
    </aside>

    <div className="ml-16 pb-20">
      {/* Top bar */}
      <Skeleton className="h-10 w-full" />

      <div className="px-4 sm:px-6 pt-4 max-w-4xl mx-auto">
        <SkeletonOverlayLoader />
        {/* Header */}
        <Skeleton className="h-7 w-48 mb-2" />
        <Skeleton className="h-4 w-64 mb-6" />

        {/* Content blocks */}
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border p-4 bg-card space-y-3">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default GenericPageSkeleton;
