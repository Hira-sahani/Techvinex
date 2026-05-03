import { cn } from "@/lib/utils";
import { TableCell, TableRow } from "@/components/ui/table";

/**
 * Shimmer skeleton primitive. Uses a moving gradient overlay over a muted bg.
 * Theme-aware (uses semantic tokens) and respects prefers-reduced-motion.
 */
export const Shimmer = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "relative overflow-hidden rounded-md bg-muted",
      "before:absolute before:inset-0 before:-translate-x-full",
      "before:bg-gradient-to-r before:from-transparent before:via-foreground/[0.18] before:to-transparent",
      "before:animate-shimmer motion-reduce:before:animate-none",
      className,
    )}
    {...props}
  />
);

export const SkeletonText = ({
  lines = 3,
  className,
}: { lines?: number; className?: string }) => (
  <div className={cn("space-y-2", className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Shimmer
        key={i}
        className="h-3"
        style={{ width: `${i === lines - 1 ? 60 : 90 + Math.random() * 8}%` }}
      />
    ))}
  </div>
);

export const SkeletonCard = ({ className }: { className?: string }) => (
  <div className={cn("rounded-xl border border-border bg-card p-4 space-y-3", className)}>
    <div className="flex items-center justify-between">
      <Shimmer className="h-8 w-8 rounded-lg" />
      <Shimmer className="h-3 w-10" />
    </div>
    <Shimmer className="h-6 w-20" />
    <Shimmer className="h-3 w-24" />
  </div>
);

export const SkeletonStatGrid = ({
  count = 4,
  cols = "grid-cols-2 lg:grid-cols-4",
}: { count?: number; cols?: string }) => (
  <div className={cn("grid gap-3", cols)}>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

export const SkeletonChart = ({ height = 220, className }: { height?: number; className?: string }) => (
  <div className={cn("rounded-xl border border-border bg-card p-4 space-y-3", className)}>
    <div className="flex items-center justify-between">
      <Shimmer className="h-3 w-32" />
      <Shimmer className="h-3 w-16" />
    </div>
    <div className="flex items-end gap-2 pt-2" style={{ height }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <Shimmer
          key={i}
          className="flex-1 rounded-t"
          style={{ height: `${30 + Math.random() * 70}%` }}
        />
      ))}
    </div>
  </div>
);

export const SkeletonList = ({ rows = 5, className }: { rows?: number; className?: string }) => (
  <div className={cn("rounded-xl border border-border bg-card p-4 space-y-3", className)}>
    <Shimmer className="h-3 w-32 mb-2" />
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 py-2">
        <Shimmer className="h-9 w-9 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Shimmer className="h-3 w-1/2" />
          <Shimmer className="h-2.5 w-1/3" />
        </div>
        <Shimmer className="h-3 w-12" />
      </div>
    ))}
  </div>
);

export const SkeletonTable = ({
  rows = 6,
  cols = 4,
  className,
}: { rows?: number; cols?: number; className?: string }) => (
  <div className={cn("rounded-xl border border-border bg-card overflow-hidden", className)}>
    <div className="grid gap-3 px-4 py-3 border-b border-border" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
      {Array.from({ length: cols }).map((_, i) => <Shimmer key={i} className="h-3" />)}
    </div>
    {Array.from({ length: rows }).map((_, r) => (
      <div
        key={r}
        className="grid gap-3 px-4 py-3 border-b border-border last:border-0"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}
      >
        {Array.from({ length: cols }).map((_, c) => (
          <Shimmer key={c} className="h-3" style={{ width: `${60 + Math.random() * 35}%` }} />
        ))}
      </div>
    ))}
  </div>
);

/**
 * Shimmer rows for use inside an existing <TableBody>. Renders TableRow/TableCell
 * elements so it can be dropped in place of a "Loading..." row.
 */

export const SkeletonTableRows = ({
  rows = 5,
  cols = 4,
}: { rows?: number; cols?: number }) => (
  <>
    {Array.from({ length: rows }).map((_, r) => (
      <TableRow key={r}>
        {Array.from({ length: cols }).map((_, c) => (
          <TableCell key={c}>
            <Shimmer className="h-3" style={{ width: `${60 + Math.random() * 35}%` }} />
          </TableCell>
        ))}
      </TableRow>
    ))}
  </>
);

export const SkeletonHeader = () => (
  <div className="flex items-center justify-between">
    <div className="space-y-2">
      <Shimmer className="h-5 w-40" />
      <Shimmer className="h-3 w-56" />
    </div>
    <Shimmer className="h-9 w-32 rounded-lg" />
  </div>
);
