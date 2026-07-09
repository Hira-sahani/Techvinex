import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Shimmer } from "@/components/skeletons/Skeleton";

/**
 * Skeleton placeholder for job/opportunity detail pages. Mirrors the real
 * ExploreJobDetail / OpportunityDetail layout to prevent layout shift when
 * the fetched job data replaces the placeholder.
 */
const JobDetailSkeleton = () => (
  <div
    className="min-h-screen bg-background"
    role="status"
    aria-busy="true"
    aria-live="polite"
    aria-label="Loading job details"
  >
    <span className="sr-only">Loading job details</span>
    <Navbar />
    <div aria-hidden="true" className="pt-20 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Back link */}
        <Shimmer className="h-4 w-16 mb-4" />

        {/* Header card */}
        <div className="border border-border rounded-xl p-6 bg-card mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 space-y-3">
              <Shimmer className="h-5 w-24 rounded-full" />
              <Shimmer className="h-7 w-3/4" />
              <Shimmer className="h-4 w-5/6" />
            </div>
            <Shimmer className="h-9 w-9 rounded-lg" />
          </div>

          {/* Metadata row */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Shimmer className="h-5 w-24" />
            <Shimmer className="h-4 w-20" />
            <Shimmer className="h-4 w-24" />
            <Shimmer className="h-4 w-28" />
          </div>

          {/* Skills */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {[16, 20, 14, 18, 22, 16].map((w, i) => (
              <Shimmer key={i} className="h-6 rounded-full" style={{ width: `${w * 4}px` }} />
            ))}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {[12, 16, 14].map((w, i) => (
              <Shimmer key={i} className="h-5 rounded-full" style={{ width: `${w * 4}px` }} />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-border">
            <Shimmer className="h-10 w-32 rounded-md" />
            <div className="flex items-center gap-1 ml-auto">
              <Shimmer className="h-8 w-8 rounded-lg" />
              <Shimmer className="h-8 w-8 rounded-lg" />
              <Shimmer className="h-8 w-8 rounded-lg" />
            </div>
          </div>
        </div>

        {/* Description card */}
        <div className="border border-border rounded-xl p-6 bg-card mb-6 space-y-3">
          <Shimmer className="h-5 w-40 mb-2" />
          <Shimmer className="h-3 w-full" />
          <Shimmer className="h-3 w-11/12" />
          <Shimmer className="h-3 w-10/12" />
          <Shimmer className="h-3 w-full" />
          <Shimmer className="h-3 w-9/12" />
          <Shimmer className="h-3 w-8/12" />
        </div>

        {/* Experience card */}
        <div className="border border-border rounded-xl p-6 bg-card mb-6 space-y-2">
          <Shimmer className="h-5 w-48 mb-2" />
          <Shimmer className="h-3 w-2/3" />
        </div>
      </div>
    </div>
    <Footer />
  </div>
);

export default JobDetailSkeleton;
