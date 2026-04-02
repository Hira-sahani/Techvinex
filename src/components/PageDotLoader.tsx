import JetraLoader from "@/components/JetraLoader";
import SidebarNav from "@/components/SidebarNav";
import BottomTabBar from "@/components/BottomTabBar";
import TopStatusBar from "@/components/TopStatusBar";

const PageDotLoader = () => (
  <div className="min-h-screen bg-background">
    <SidebarNav />
    <div className="ml-16 pb-20">
      <TopStatusBar currentStep={2} />
    </div>
    <BottomTabBar />
    <JetraLoader />
  </div>
);

export default PageDotLoader;
