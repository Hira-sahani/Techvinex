import { Shimmer } from "@/components/skeletons/Skeleton";
import { cn } from "@/lib/utils";

/**
 * Inline skeleton placeholder used inside cards, sidebars, and small
 * sections where a full-page loader would be too heavy. Replaces the old
 * animated dots so the loading state always looks like a skeleton.
 */
const TechvinexLoaderInline = ({ size = "md" }: { size?: "sm" | "md" }) => {
  const isSm = size === "sm";
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading"
      className={cn("w-full", isSm ? "py-2" : "py-4")}
    >
      <span className="sr-only">Loading</span>
      <div aria-hidden="true" className={cn("space-y-2", isSm ? "" : "space-y-3")}>
        <Shimmer className={cn(isSm ? "h-3" : "h-4", "w-2/3")} />
        <Shimmer className={cn(isSm ? "h-3" : "h-4", "w-5/6")} />
        <Shimmer className={cn(isSm ? "h-3" : "h-4", "w-1/2")} />
      </div>
    </div>
  );
};

export default TechvinexLoaderInline;
