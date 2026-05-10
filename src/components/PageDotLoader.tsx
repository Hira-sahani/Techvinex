import SidebarNav from "@/components/SidebarNav";
import TopStatusBar from "@/components/TopStatusBar";
import { Shimmer, SkeletonCard, SkeletonList } from "@/components/skeletons/Skeleton";

/**
 * Full-page skeleton for candidate list/detail pages (Explore, RoleDetail, etc.).
 * Replaces the old dot-loader with a layout-aware shimmer.
 */
const PageDotLoader = () => (
  <div
    className="min-h-screen bg-background"
    role="status"
    aria-busy="true"
    aria-live="polite"
    aria-label="Loading"
  >
    <span className="sr-only">Loading</span>
    <SidebarNav />
    <div className="md:ml-16 pb-20" aria-hidden="true">
      <TopStatusBar currentStep={2} />
      <div className="px-4 sm:px-6 pt-4 max-w-5xl mx-auto space-y-5">
        <div className="space-y-2">
          <Shimmer className="h-6 w-48" />
          <Shimmer className="h-3 w-72" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <SkeletonList rows={4} />
      </div>
    </div>
  </div>
);

export default PageDotLoader;
