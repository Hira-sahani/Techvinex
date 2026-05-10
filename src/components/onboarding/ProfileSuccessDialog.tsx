import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const slides = [
  {
    emoji: "🎉",
    title: "Welcome to Techvinex X!",
    description: "Discover top-tier, fully remote AI roles tailored to your expertise. Get matched with high-impact opportunities at leading companies where your skills stand out.",
  },
  {
    emoji: "⚡",
    title: "Unlock Instant Offers",
    description: "Instant Work Offers match your profile and assessed skills to future roles, letting hiring teams send you an offer without a formal application or extra interviews.",
  },
  {
    emoji: "🚀",
    title: "Your profile has been created",
    description: "Your profile is now visible to employers looking for candidates like you",
  },
];

const ProfileSuccessDialog = () => {
  const [slideIndex, setSlideIndex] = useState(0);
  const navigate = useNavigate();
  const slide = slides[slideIndex];
  const isLast = slideIndex === slides.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/50" />
      <div className="relative bg-background rounded-t-2xl sm:rounded-2xl w-full max-w-md mx-auto overflow-hidden">
        {/* Gradient header */}
        <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent py-8 flex items-center justify-center">
          <span className="text-5xl">{slide.emoji}</span>
        </div>

        <div className="px-6 pb-6 text-center">
          <h2 className="text-lg font-bold text-foreground mb-2">{slide.title}</h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{slide.description}</p>

          <Button
            onClick={() => {
              if (isLast) navigate("/explore");
              else setSlideIndex(slideIndex + 1);
            }}
            className="w-full rounded-lg"
          >
            {isLast ? "Explore opportunities" : "Next"}
          </Button>

          {/* Dots */}
          <div className="flex items-center justify-center gap-1.5 mt-4">
            {slides.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${i === slideIndex ? "bg-primary" : "bg-border"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSuccessDialog;
