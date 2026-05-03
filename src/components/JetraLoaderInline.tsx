import { Shimmer } from "@/components/skeletons/Skeleton";
import { cn } from "@/lib/utils";

/**
 * Inline loading state. Skeleton-based (no dot spinner / "Loading..." text).
 * Kept as a default export so existing callers continue to work.
 */
const JetraLoaderInline = ({ size = "md" }: { size?: "sm" | "md" }) => {
  const heightClass = size === "sm" ? "h-3" : "h-4";
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading"
      className={cn("w-full max-w-xs space-y-2")}
    >
      <span className="sr-only">Loading</span>
      <Shimmer className={cn(heightClass, "w-full")} aria-hidden="true" />
      <Shimmer className={cn(heightClass, "w-3/4")} aria-hidden="true" />
      <Shimmer className={cn(heightClass, "w-1/2")} aria-hidden="true" />
    </div>
  );
};

export default JetraLoaderInline;
