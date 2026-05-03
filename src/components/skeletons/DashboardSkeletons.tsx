import {
  SkeletonHeader, SkeletonStatGrid, SkeletonChart, SkeletonList, SkeletonTable, SkeletonCard, Shimmer,
} from "./Skeleton";
import SidebarNav from "@/components/SidebarNav";
import TopStatusBar from "@/components/TopStatusBar";
import { cn } from "@/lib/utils";

/**
 * All dashboard skeletons accept optional layout overrides so each page can
 * tune its skeleton (stat count, chart height, list rows, extra slots) while
 * still flowing through the same DashboardDataBoundary gate.
 */

export type DashboardSkeletonOptions = {
  className?: string;
  /** Optional extra skeleton slot rendered at the bottom for page-specific blocks. */
  extraSlot?: React.ReactNode;
};

type CandidateOpts = DashboardSkeletonOptions & {
  statCount?: number;
  statCols?: string;
  listRows?: number[];
  showProgress?: boolean;
};

export const CandidateDashboardSkeleton = ({
  className,
  extraSlot,
  statCount = 5,
  statCols = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
  listRows = [4, 3],
  showProgress = true,
}: CandidateOpts = {}) => (
  <div className={cn("min-h-screen bg-background", className)}>
    <SidebarNav />
    <div className="ml-16 pb-20">
      <TopStatusBar currentStep={2} />
      <div className="px-4 sm:px-6 pt-4">
        <div className="max-w-5xl mx-auto space-y-6">
          <SkeletonHeader />
          <SkeletonStatGrid count={statCount} cols={statCols} />
          {showProgress && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <Shimmer className="h-3 w-32" />
              <Shimmer className="h-2 w-full" />
            </div>
          )}
          {listRows.map((rows, i) => <SkeletonList key={i} rows={rows} />)}
          {extraSlot}
        </div>
      </div>
    </div>
  </div>
);

type EmployerOpts = DashboardSkeletonOptions & {
  statCount?: number;
  statCols?: string;
  columns?: number[];
  showChart?: boolean;
  chartHeight?: number;
};

export const EmployerDashboardSkeleton = ({
  className,
  extraSlot,
  statCount = 4,
  statCols,
  columns = [4, 4, 5],
  showChart = true,
  chartHeight = 120,
}: EmployerOpts = {}) => (
  <div className={cn("space-y-6 max-w-6xl", className)}>
    <SkeletonHeader />
    <SkeletonStatGrid count={statCount} cols={statCols} />
    <div className={cn("grid gap-6", `lg:grid-cols-${columns.length}`)}>
      {columns.map((rows, i) => <SkeletonList key={i} rows={rows} />)}
    </div>
    {showChart && <SkeletonChart height={chartHeight} />}
    {extraSlot}
  </div>
);

type AdminOpts = DashboardSkeletonOptions & {
  statCount?: number;
  statCols?: string;
  chartCount?: number;
  tableRows?: number;
  tableCols?: number;
};

export const AdminOverviewSkeleton = ({
  className,
  extraSlot,
  statCount = 6,
  statCols = "grid-cols-2 sm:grid-cols-3 xl:grid-cols-6",
  chartCount = 2,
  tableRows = 5,
  tableCols = 4,
}: AdminOpts = {}) => (
  <div className={cn("space-y-6", className)}>
    <SkeletonHeader />
    <SkeletonStatGrid count={statCount} cols={statCols} />
    <div className={cn("grid grid-cols-1 gap-3", chartCount >= 2 && "lg:grid-cols-2")}>
      {Array.from({ length: chartCount }).map((_, i) => <SkeletonChart key={i} />)}
    </div>
    <SkeletonTable rows={tableRows} cols={tableCols} />
    {extraSlot}
  </div>
);

type BenchmarkOpts = DashboardSkeletonOptions & {
  statCount?: number;
  statCols?: string;
  listRows?: number;
};

export const BenchmarkDashboardSkeleton = ({
  className,
  extraSlot,
  statCount = 6,
  statCols = "grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
  listRows = 5,
}: BenchmarkOpts = {}) => (
  <div className={cn("p-6 space-y-6", className)}>
    <div className="space-y-2">
      <Shimmer className="h-5 w-48" />
      <Shimmer className="h-3 w-64" />
    </div>
    <SkeletonStatGrid count={statCount} cols={statCols} />
    <SkeletonList rows={listRows} />
    {extraSlot}
  </div>
);

type BlogOpts = DashboardSkeletonOptions & {
  statCount?: number;
  tabCount?: number;
  cardCount?: number;
};

export const BlogDashboardSkeleton = ({
  className,
  extraSlot,
  statCount = 3,
  tabCount = 5,
  cardCount = 4,
}: BlogOpts = {}) => (
  <div className={cn("min-h-screen bg-background", className)}>
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
      <SkeletonStatGrid count={statCount} cols={`grid-cols-${statCount}`} />
      <div className="flex gap-4">
        {Array.from({ length: tabCount }).map((_, i) => <Shimmer key={i} className="h-3 w-16" />)}
      </div>
      <div className="space-y-3">
        {Array.from({ length: cardCount }).map((_, i) => <SkeletonCard key={i} className="h-24" />)}
      </div>
      {extraSlot}
    </div>
  </div>
);

type AdminBlogsOpts = DashboardSkeletonOptions & {
  statCount?: number;
  tableRows?: number;
  tableCols?: number;
};

export const AdminBlogsSkeleton = ({
  className,
  extraSlot,
  statCount = 3,
  tableRows = 6,
  tableCols = 5,
}: AdminBlogsOpts = {}) => (
  <div className={cn("space-y-5", className)}>
    <SkeletonHeader />
    <SkeletonStatGrid count={statCount} cols={`grid-cols-${statCount}`} />
    <SkeletonTable rows={tableRows} cols={tableCols} />
    {extraSlot}
  </div>
);
