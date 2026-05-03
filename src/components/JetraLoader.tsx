import { Shimmer } from "@/components/skeletons/Skeleton";

/**
 * Full-page loading state. Skeleton-based (no dot spinner / "Loading..." text).
 * Kept as a default export so existing callers continue to work.
 */
const JetraLoader = () => (
  <div
    className="loader-overlay"
    role="status"
    aria-busy="true"
    aria-live="polite"
    aria-label="Loading"
  >
    <span className="sr-only">Loading</span>
    <div className="loader-shell w-full max-w-md px-6" aria-hidden="true">
      <div className="space-y-4">
        <Shimmer className="h-5 w-1/2" />
        <Shimmer className="h-3 w-3/4" />
        <Shimmer className="h-3 w-2/3" />
        <Shimmer className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-3">
          <Shimmer className="h-16 rounded-lg" />
          <Shimmer className="h-16 rounded-lg" />
        </div>
      </div>
    </div>
  </div>
);

export default JetraLoader;
