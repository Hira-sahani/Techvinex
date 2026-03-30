import { useNavigate } from "react-router-dom";
import { Info, Upload } from "lucide-react";

interface Props {
  currentStep?: number; // 1=Resume, 2=Location, 3=Assessment
}

const steps = [
  { num: 1, label: "Resume" },
  { num: 2, label: "Location" },
  { num: 3, label: "Assessment" },
];

const TopStatusBar = ({ currentStep = 2 }: Props) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between bg-background border-b border-border px-3 py-2 text-xs overflow-x-auto gap-2">
      {/* Instant Work Offers */}
      <button
        onClick={() => navigate("/explore")}
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground whitespace-nowrap shrink-0"
      >
        <span className="font-medium text-foreground">Get</span>
        <span>Instant Work Offers</span>
        <Info size={12} className="text-muted-foreground" />
      </button>

      {/* Progress steps */}
      <div className="flex items-center gap-0 shrink-0">
        {steps.map((step, i) => (
          <div key={step.num} className="flex items-center">
            <div className="flex items-center gap-1">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step.num <= currentStep
                    ? "bg-foreground text-background"
                    : "bg-border text-muted-foreground"
                }`}
              >
                {step.num}
              </div>
              <span className={`text-[11px] ${step.num <= currentStep ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-6 h-px mx-1 ${step.num < currentStep ? "bg-foreground" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Upload Resume */}
      <button
        onClick={() => navigate("/onboarding")}
        className="flex items-center gap-1 text-foreground hover:text-primary whitespace-nowrap shrink-0 font-medium"
      >
        <Upload size={12} />
        Upload Resume
      </button>
    </div>
  );
};

export default TopStatusBar;
