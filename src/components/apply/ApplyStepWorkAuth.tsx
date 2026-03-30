import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

interface Props {
  form: {
    authorizedToWork: boolean;
    workFromDifferentCountry: boolean;
    signatureName: string;
    signatureDate: string;
  };
  update: (key: string, value: any) => void;
}

const ApplyStepWorkAuth = ({ form, update }: Props) => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-bold text-foreground mb-1">Work Authorization</h2>
        <p className="text-[11px] text-muted-foreground mb-4">
          Please confirm your work authorization status to proceed with the application.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-start gap-2.5 border border-border rounded-xl p-3 bg-card">
          <Checkbox
            checked={form.authorizedToWork}
            onCheckedChange={(v) => update("authorizedToWork", !!v)}
            id="auth-work"
            className="mt-0.5"
          />
          <label htmlFor="auth-work" className="text-xs text-foreground leading-relaxed">
            I am authorized to work in my country of residence and do not require visa sponsorship.
          </label>
        </div>

        <div className="flex items-start gap-2.5 border border-border rounded-xl p-3 bg-card">
          <Checkbox
            checked={form.workFromDifferentCountry}
            onCheckedChange={(v) => update("workFromDifferentCountry", !!v)}
            id="diff-country"
            className="mt-0.5"
          />
          <label htmlFor="diff-country" className="text-xs text-foreground leading-relaxed">
            I may work from a different country than my country of residence.
          </label>
        </div>
      </div>

      {/* Digital Signature */}
      <div className="border-t border-border pt-4">
        <h3 className="text-sm font-bold text-foreground mb-2">Digital Signature</h3>
        <p className="text-[11px] text-muted-foreground mb-3">
          By signing below, I confirm that the information provided is accurate and complete.
        </p>
        <div className="space-y-2">
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Full Legal Name</label>
            <Input
              value={form.signatureName}
              onChange={(e) => update("signatureName", e.target.value)}
              placeholder="Your full legal name"
              className="text-xs h-9"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Date</label>
            <Input
              type="date"
              value={form.signatureDate}
              onChange={(e) => update("signatureDate", e.target.value)}
              className="text-xs h-9"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplyStepWorkAuth;
