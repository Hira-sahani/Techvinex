import { Shimmer, SkeletonCard, SkeletonList } from "@/components/skeletons/Skeleton";

/**
 * Generic full-page skeleton placeholder used wherever a route or page-level
 * loader was previously shown. Replaces the old animated dots loader so the
 * user always sees a content-shaped shimmer instead of a spinner.
 */
const TechvinexLoader = () => (
  <div
    className="min-h-screen bg-background"
    role="status"
    aria-busy="true"
    aria-live="polite"
    aria-label="Loading"
  >
    <span className="sr-only">Loading</span>
    <div aria-hidden="true" className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-24 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Shimmer className="h-6 w-48" />
          <Shimmer className="h-3 w-64" />
        </div>
        <Shimmer className="h-9 w-9 rounded-full" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
      </div>

      {/* Tabs row */}
      <div className="flex gap-4 border-b border-border pb-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <Shimmer key={i} className="h-3 w-16" />
        ))}
      </div>

      {/* List */}
      <SkeletonList rows={5} />
    </div>
  </div>
);

export default TechvinexLoader;
