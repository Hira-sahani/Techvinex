import { Shimmer } from "@/components/skeletons/Skeleton";
import { cn } from "@/lib/utils";

/**
 * Inline loading state. Skeleton-based (no dot spinner / "Loading..." text).
 * - "sm" renders a single compact shimmer (fits inside small buttons/icons).
 * - "md" renders a small stack of shimmer lines.
 */
const JetraLoaderInline = ({ size = "md" }: { size?: "sm" | "md" }) => {
  if (size === "sm") {
    return (
      <span
        role="status"
        aria-busy="true"
        aria-live="polite"
        aria-label="Loading"
        className="inline-flex"
      >
        <span className="sr-only">Loading</span>
        <Shimmer className="h-4 w-4 rounded-md" aria-hidden="true" />
      </span>
    );
  }

  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading"
      className={cn("w-full max-w-xs space-y-2")}
    >
      <span className="sr-only">Loading</span>
      <Shimmer className="h-4 w-full" aria-hidden="true" />
      <Shimmer className="h-4 w-3/4" aria-hidden="true" />
      <Shimmer className="h-4 w-1/2" aria-hidden="true" />
    </div>
  );
};

export default JetraLoaderInline;
