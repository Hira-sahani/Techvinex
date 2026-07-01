import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import StatsBar from "./StatsBar";
import { useLang } from "@/contexts/LangContext";

const HeroSection = () => {
  const navigate = useNavigate();
  const { t } = useLang();

  return (
    <section className="gradient-hero pt-20 sm:pt-24 pb-8 sm:pb-10 px-3 sm:px-4">
      <div className="max-w-4xl mx-auto text-center">
        <div className="mb-4 animate-fade-in">
          <StatsBar />
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-foreground tracking-tight leading-tight mb-2 animate-fade-in">
          <span className="sr-only">Techvinex — </span>
          {t("hero.title").split(".")[0]}.
          <span className="text-primary"> {t("hero.title").split(".")[1]}</span>
        </h1>

        <p className="text-sm sm:text-lg text-muted-foreground max-w-md mx-auto mb-0 animate-fade-in">
          <span className="font-semibold text-foreground">Techvinex</span> — {t("hero.subtitle")}
        </p>

        <div className="flex items-center justify-center gap-1.5 animate-fade-in">
          <Button
            onClick={() => navigate("/explore")}
            size="sm"
            className="rounded-full px-5 py-2 text-sm font-medium gradient-cta border-0 text-primary-foreground hover:opacity-90 hover-scale transition-all"
          >
            {t("hero.start")}
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/explore")}
            size="sm"
            className="rounded-full px-5 py-2 text-sm font-medium hover-scale transition-all"
          >
            {t("hero.search")}
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
