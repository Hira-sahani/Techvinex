import { Skeleton } from "@/components/ui/skeleton";

const ProfilePageSkeleton = () => (
  <div className="max-w-4xl mx-auto">
    <Skeleton className="h-6 w-20 mb-4" />

    {/* Tabs */}
    <div className="border-b border-border mb-6 flex gap-0">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-9 rounded-none" style={{ width: `${60 + Math.random() * 60}px` }} />
      ))}
    </div>

    {/* Content area */}
    <div className="space-y-4">
      {/* Form fields */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      ))}

      {/* Upload area */}
      <div className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>

      {/* More fields */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      ))}

      {/* Save button */}
      <Skeleton className="h-10 w-28 rounded-md" />
    </div>
  </div>
);

export default ProfilePageSkeleton;
