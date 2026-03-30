import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import DashboardSection from "@/components/DashboardSection";
import ApexSection from "@/components/ApexSection";
import FeaturesSection from "@/components/FeaturesSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";


const Index = () => {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      <HeroSection />
      <DashboardSection />
      <ApexSection />
      <FeaturesSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
