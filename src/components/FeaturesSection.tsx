import { Zap, Shield, Globe, DollarSign } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "AI-Powered Matching",
    description: "Our algorithms match you with the perfect role based on your skills and experience.",
  },
  {
    icon: Shield,
    title: "Vetted Opportunities",
    description: "Every role is verified and comes from top-tier companies building the future of AI.",
  },
  {
    icon: Globe,
    title: "Fully Remote",
    description: "Work from anywhere in the world. All roles on Techvinex X are 100% remote.",
  },
  {
    icon: DollarSign,
    title: "Competitive Pay",
    description: "Earn top-market rates with average pay of $78/hr across all roles.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-12 sm:py-20 px-3 sm:px-4 bg-secondary">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-foreground mb-4">Why choose Techvinex X?</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            The premier platform for AI professionals to find high-paying, remote opportunities.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-card rounded-xl p-6 border border-border hover:shadow-card-hover transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon size={20} className="text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
