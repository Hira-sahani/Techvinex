import { Shimmer } from "@/components/skeletons/Skeleton";

/**
 * Full-page loading state. Skeleton-based (no dot spinner / "Loading..." text / glass card).
 * Renders a page-filling layout of shimmer blocks so it feels like the real screen
 * is rendering, not a centered "loading" overlay.
 */
const JetraLoader = () => (
  <div
    className="fixed inset-0 z-50 bg-background overflow-hidden"
    role="status"
    aria-busy="true"
    aria-live="polite"
    aria-label="Loading"
  >
    <span className="sr-only">Loading</span>
    <div aria-hidden="true" className="h-full w-full px-4 sm:px-6 pt-6 pb-10 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <Shimmer className="h-8 w-8 rounded-full" />
        <Shimmer className="h-3 w-24" />
      </div>
      <div className="space-y-2">
        <Shimmer className="h-6 w-2/3" />
        <Shimmer className="h-3 w-1/2" />
      </div>
      <div className="space-y-3">
        <Shimmer className="h-10 w-full rounded-md" />
        <Shimmer className="h-10 w-full rounded-md" />
        <Shimmer className="h-10 w-full rounded-md" />
        <Shimmer className="h-10 w-3/4 rounded-md" />
      </div>
      <Shimmer className="h-32 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        <Shimmer className="h-16 rounded-lg" />
        <Shimmer className="h-16 rounded-lg" />
      </div>
      <Shimmer className="h-10 w-full rounded-md" />
    </div>
  </div>
);

export default JetraLoader;
