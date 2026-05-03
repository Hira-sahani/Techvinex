import {
  SkeletonHeader, SkeletonStatGrid, SkeletonChart, SkeletonList, SkeletonTable, SkeletonCard, Shimmer,
} from "./Skeleton";
import SidebarNav from "@/components/SidebarNav";
import TopStatusBar from "@/components/TopStatusBar";

/** Candidate dashboard skeleton — preserves SidebarNav + TopStatusBar layout. */
export const CandidateDashboardSkeleton = () => (
  <div className="min-h-screen bg-background">
    <SidebarNav />
    <div className="ml-16 pb-20">
      <TopStatusBar currentStep={2} />
      <div className="px-4 sm:px-6 pt-4">
        <div className="max-w-5xl mx-auto space-y-6">
          <SkeletonHeader />
          <SkeletonStatGrid count={5} cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" />
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <Shimmer className="h-3 w-32" />
            <Shimmer className="h-2 w-full" />
          </div>
          <SkeletonList rows={4} />
          <SkeletonList rows={3} />
        </div>
      </div>
    </div>
  </div>
);

/** Employer dashboard skeleton (rendered inside EmployerLayout). */
export const EmployerDashboardSkeleton = () => (
  <div className="space-y-6 max-w-6xl">
    <SkeletonHeader />
    <SkeletonStatGrid count={4} />
    <div className="grid lg:grid-cols-3 gap-6">
      <SkeletonList rows={4} />
      <SkeletonList rows={4} />
      <SkeletonList rows={5} />
    </div>
    <SkeletonChart height={120} />
  </div>
);

/** Admin overview skeleton (rendered inside AdminLayout). */
export const AdminOverviewSkeleton = () => (
  <div className="space-y-6">
    <SkeletonHeader />
    <SkeletonStatGrid count={6} cols="grid-cols-2 sm:grid-cols-3 xl:grid-cols-6" />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <SkeletonChart />
      <SkeletonChart />
    </div>
    <SkeletonTable rows={5} cols={4} />
  </div>
);

/** Atlas Benchmark dashboard skeleton. */
export const BenchmarkDashboardSkeleton = () => (
  <div className="p-6 space-y-6">
    <div className="space-y-2">
      <Shimmer className="h-5 w-48" />
      <Shimmer className="h-3 w-64" />
    </div>
    <SkeletonStatGrid count={6} cols="grid-cols-2 md:grid-cols-3 lg:grid-cols-6" />
    <SkeletonList rows={5} />
  </div>
);

/** Blog dashboard skeleton (sticky header layout). */
export const BlogDashboardSkeleton = () => (
  <div className="min-h-screen bg-background">
    <div className="sticky top-0 z-30 bg-background border-b border-border">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shimmer className="h-8 w-8 rounded-lg" />
          <Shimmer className="h-3 w-32 hidden sm:block" />
        </div>
        <Shimmer className="h-8 w-8 rounded-lg" />
      </div>
    </div>
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <SkeletonHeader />
      <SkeletonStatGrid count={3} cols="grid-cols-3" />
      <div className="flex gap-4">
        {Array.from({ length: 5 }).map((_, i) => <Shimmer key={i} className="h-3 w-16" />)}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} className="h-24" />)}
      </div>
    </div>
  </div>
);

/** Admin Blogs skeleton (rendered inside AdminLayout). */
export const AdminBlogsSkeleton = () => (
  <div className="space-y-5">
    <SkeletonHeader />
    <SkeletonStatGrid count={3} cols="grid-cols-3" />
    <SkeletonTable rows={6} cols={5} />
  </div>
);
