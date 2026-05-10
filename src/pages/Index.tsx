import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import SEOContent from "@/components/SEOContent";
import DashboardSection from "@/components/DashboardSection";
import ApexSection from "@/components/ApexSection";
import FeaturesSection from "@/components/FeaturesSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { isLoggedIn } = useAuth();

  if (isLoggedIn) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Navbar />
        <div className="pt-16">
          <DashboardSection />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      <HeroSection />
      <SEOContent />
      <ApexSection />
      <FeaturesSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
