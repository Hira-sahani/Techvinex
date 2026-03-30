import { Upload } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  form: {
    resumeName: string;
    noResume: boolean;
  };
  update: (key: string, value: any) => void;
}

const StepResume = ({ form, update }: Props) => {
  return (
    <div className="text-center">
      <h1 className="text-xl font-bold text-foreground mb-1">Upload a recent resume or CV</h1>
      <p className="text-sm text-muted-foreground mb-3">
        Autofill your profile in seconds by uploading your resume
      </p>
      <div className="bg-accent/50 rounded-full px-4 py-2 inline-flex items-center gap-2 mb-8">
        <span className="text-primary">💡</span>
        <span className="text-xs text-foreground">Tip: Hiring managers are more likely to reach out when they see a resume attached</span>
      </div>

      <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-10 cursor-pointer transition-colors ${
        form.resumeName ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
      } ${form.noResume ? "opacity-50 pointer-events-none" : ""}`}>
        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-4">
          <Upload size={20} className="text-muted-foreground" />
        </div>
        {form.resumeName ? (
          <p className="text-sm font-medium text-foreground">{form.resumeName}</p>
        ) : (
          <>
            <p className="text-sm text-foreground font-medium">Drop your resume here</p>
            <p className="text-sm text-muted-foreground">
              or <span className="text-primary font-medium">browse files</span> on your computer
            </p>
          </>
        )}
        <p className="text-xs text-muted-foreground mt-2">Supports PDF up to 3MB</p>
        <input
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) update("resumeName", file.name);
          }}
        />
      </label>

      <div className="flex items-center gap-2 mt-4">
        <Checkbox
          id="no-resume"
          checked={form.noResume}
          onCheckedChange={(checked) => {
            update("noResume", !!checked);
            if (checked) update("resumeName", "");
          }}
        />
        <label htmlFor="no-resume" className="text-sm text-muted-foreground cursor-pointer">I don't have a resume</label>
      </div>
    </div>
  );
};

export default StepResume;
