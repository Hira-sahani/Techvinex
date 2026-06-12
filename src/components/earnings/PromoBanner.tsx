import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { memo } from "react";

/** Static promo banner extracted from Earnings.tsx. */
const PromoBanner = () => (
  <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 mb-4">
    <p className="font-semibold text-foreground text-sm mb-1">Unlock more earnings with Intros</p>
    <p className="text-xs text-muted-foreground mb-3">You decide who to introduce and what gets sent. We handle the invite, so you don't need to reach out personally.</p>
    <Button size="sm" className="gap-1.5 text-xs" onClick={() => window.open("https://www.linkedin.com", "_blank")}>
      Explore LinkedIn Connections <ArrowRight size={14} />
    </Button>
  </div>
);

export default memo(PromoBanner);
