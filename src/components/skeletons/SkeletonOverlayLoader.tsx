import JetraLoaderInline from "@/components/JetraLoaderInline";

const SkeletonOverlayLoader = () => (
  <div className="flex items-center justify-center py-3">
    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border shadow-sm">
      <JetraLoaderInline size="sm" />
      <span className="text-xs text-muted-foreground font-medium">Loading…</span>
    </div>
  </div>
);

export default SkeletonOverlayLoader;
