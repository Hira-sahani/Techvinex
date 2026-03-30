import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X } from "lucide-react";
import { useState } from "react";

interface Props {
  form: {
    linkedin: string;
    portfolio: string;
    otherLinks: string[];
    noLinkedin: boolean;
    leetcode: string;
    github: string;
    codechef: string;
    codeforces: string;
  };
  update: (key: string, value: any) => void;
}

const StepLinks = ({ form, update }: Props) => {
  const addLink = () => {
    update("otherLinks", [...form.otherLinks, ""]);
  };

  const updateLink = (index: number, value: string) => {
    const updated = [...form.otherLinks];
    updated[index] = value;
    update("otherLinks", updated);
  };

  const removeLink = (index: number) => {
    update("otherLinks", form.otherLinks.filter((_, i) => i !== index));
  };

  return (
    <div className="text-center">
      <h1 className="text-xl font-bold text-foreground mb-1">Confirm your information</h1>
      <p className="text-sm text-muted-foreground mb-3">
        Review your details to ensure everything is correct before moving on
      </p>
      <div className="bg-accent/50 rounded-full px-4 py-2 inline-flex items-center gap-2 mb-6">
        <span className="text-primary">💡</span>
        <span className="text-xs text-foreground">Tip: Profiles with LinkedIns and other public links get viewed 2x more</span>
      </div>

      <div className="text-left space-y-4">
        <h2 className="text-base font-semibold text-foreground">Links</h2>

        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">LinkedIn URL *</label>
          <Input
            value={form.linkedin}
            onChange={(e) => update("linkedin", e.target.value)}
            placeholder="https://www.linkedin.com/in/..."
            disabled={form.noLinkedin}
          />
          <div className="flex items-center gap-2 mt-2">
            <Checkbox
              id="no-linkedin"
              checked={form.noLinkedin}
              onCheckedChange={(checked) => {
                update("noLinkedin", !!checked);
                if (checked) update("linkedin", "");
              }}
            />
            <label htmlFor="no-linkedin" className="text-xs text-muted-foreground cursor-pointer">I don't have a LinkedIn</label>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Portfolio</label>
          <Input value={form.portfolio} onChange={(e) => update("portfolio", e.target.value)} placeholder="https://yourportfolio.com" />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Other links</label>
          {form.otherLinks.map((link, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <Input value={link} onChange={(e) => updateLink(i, e.target.value)} placeholder="https://example.com" className="flex-1" />
              <button onClick={() => removeLink(i)} className="text-muted-foreground hover:text-destructive p-2">
                <X size={16} />
              </button>
            </div>
          ))}
          <button onClick={addLink} className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 mt-1">
            <Plus size={14} /> Add more links
          </button>
        </div>

        <h2 className="text-base font-semibold text-foreground pt-2">Other Profiles</h2>

        {[
          { key: "leetcode", icon: "⚡", placeholder: "leetcode-username" },
          { key: "github", icon: "🐙", placeholder: "github-username" },
          { key: "codechef", icon: "👨‍🍳", placeholder: "codechef-username" },
          { key: "codeforces", icon: "📊", placeholder: "codeforces-username" },
        ].map((profile) => (
          <div key={profile.key} className="flex items-center gap-3 border border-input rounded-lg px-3 py-2.5">
            <span className="text-lg">{profile.icon}</span>
            <input
              value={(form as any)[profile.key]}
              onChange={(e) => update(profile.key, e.target.value)}
              placeholder={profile.placeholder}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            {(form as any)[profile.key] && (
              <button onClick={() => update(profile.key, "")} className="text-muted-foreground hover:text-destructive">
                <X size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StepLinks;
