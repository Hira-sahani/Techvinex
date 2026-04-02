import JetraLoaderInline from "@/components/JetraLoaderInline";
import SidebarNav from "@/components/SidebarNav";
import TopStatusBar from "@/components/TopStatusBar";
import BottomTabBar from "@/components/BottomTabBar";

const PageDotLoader = () => (
  <div className="min-h-screen bg-background">
    <SidebarNav />
    <div className="ml-16 pb-20">
      <TopStatusBar currentStep={2} />
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <JetraLoaderInline size="md" />
          <span className="text-xs text-muted-foreground font-medium">Loading…</span>
        </div>
      </div>
    </div>
    <BottomTabBar />
  </div>
);

export default PageDotLoader;
