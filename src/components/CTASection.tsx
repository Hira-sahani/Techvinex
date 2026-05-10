import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section id="cta" className="py-12 sm:py-20 px-3 sm:px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
          Ready to shape the future?
        </h2>
        <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
          Join thousands of top professionals already earning on Techvinex X. Start working today.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Button
            onClick={() => navigate("/explore")}
            className="rounded-full px-8 py-6 text-base font-medium gradient-cta border-0 text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Start working
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/explore")}
            className="rounded-full px-8 py-6 text-base font-medium"
          >
            Learn more
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
