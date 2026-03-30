import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";

interface Education {
  school: string;
  degree: string;
  startYear: string;
  endYear: string;
  major: string;
  gpa: string;
}

interface WorkExp {
  company: string;
  role: string;
  startYear: string;
  endYear: string;
  city: string;
  country: string;
  description: string;
}

interface Props {
  form: {
    education: Education[];
    workExperience: WorkExp[];
  };
  update: (key: string, value: any) => void;
}

const emptyEducation: Education = { school: "", degree: "", startYear: "", endYear: "", major: "", gpa: "" };
const emptyWork: WorkExp = { company: "", role: "", startYear: "", endYear: "", city: "", country: "", description: "" };

const years = Array.from({ length: 30 }, (_, i) => String(2026 - i));

const StepExperience = ({ form, update }: Props) => {
  const updateEdu = (index: number, key: string, value: string) => {
    const updated = [...form.education];
    updated[index] = { ...updated[index], [key]: value };
    update("education", updated);
  };

  const removeEdu = (index: number) => {
    update("education", form.education.filter((_, i) => i !== index));
  };

  const updateWork = (index: number, key: string, value: string) => {
    const updated = [...form.workExperience];
    updated[index] = { ...updated[index], [key]: value };
    update("workExperience", updated);
  };

  const removeWork = (index: number) => {
    update("workExperience", form.workExperience.filter((_, i) => i !== index));
  };

  return (
    <div className="text-center">
      <h1 className="text-xl font-bold text-foreground mb-1">Confirm and add experiences</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Review your details to ensure everything is correct before moving on
      </p>

      <div className="text-left">
        <h2 className="text-base font-semibold text-foreground mb-4">Education</h2>

        {form.education.map((edu, i) => (
          <div key={i} className="relative border border-border rounded-lg p-4 mb-4">
            {form.education.length > 1 && (
              <button onClick={() => removeEdu(i)} className="absolute top-3 right-3 text-muted-foreground hover:text-destructive">
                <X size={16} />
              </button>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">School</label>
                <Input value={edu.school} onChange={(e) => updateEdu(i, "school", e.target.value)} placeholder="Ex: Stanford University" className="text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Degree</label>
                <Input value={edu.degree} onChange={(e) => updateEdu(i, "degree", e.target.value)} placeholder="Ex: Bachelor of Science" className="text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Start year</label>
                <select value={edu.startYear} onChange={(e) => updateEdu(i, "startYear", e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Select year</option>
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">End year</label>
                <select value={edu.endYear} onChange={(e) => updateEdu(i, "endYear", e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Select year</option>
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Major</label>
                <Input value={edu.major} onChange={(e) => updateEdu(i, "major", e.target.value)} placeholder="Ex: Computer Science" className="text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">GPA</label>
                <Input value={edu.gpa} onChange={(e) => updateEdu(i, "gpa", e.target.value)} placeholder="Ex: 3.9" className="text-sm" />
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={() => update("education", [...form.education, { ...emptyEducation }])}
          className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 mb-8"
        >
          <Plus size={14} /> Add Education
        </button>

        <h2 className="text-base font-semibold text-foreground mb-4">Work Experience</h2>

        {form.workExperience.map((work, i) => (
          <div key={i} className="relative border border-border rounded-lg p-4 mb-4">
            {form.workExperience.length > 1 && (
              <button onClick={() => removeWork(i)} className="absolute top-3 right-3 text-muted-foreground hover:text-destructive">
                <X size={16} />
              </button>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Company</label>
                <Input value={work.company} onChange={(e) => updateWork(i, "company", e.target.value)} placeholder="Ex: Microsoft" className="text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Role</label>
                <Input value={work.role} onChange={(e) => updateWork(i, "role", e.target.value)} placeholder="Ex: Software Engineer" className="text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Start year</label>
                <select value={work.startYear} onChange={(e) => updateWork(i, "startYear", e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Select year</option>
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">End year</label>
                <select value={work.endYear} onChange={(e) => updateWork(i, "endYear", e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Select year</option>
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">City</label>
                <Input value={work.city} onChange={(e) => updateWork(i, "city", e.target.value)} placeholder="Ex: San Francisco" className="text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Country</label>
                <Input value={work.country} onChange={(e) => updateWork(i, "country", e.target.value)} placeholder="Ex: United States" className="text-sm" />
              </div>
            </div>
            <div className="mt-3">
              <label className="text-xs font-medium text-foreground mb-1 block">Description</label>
              <textarea
                value={work.description}
                onChange={(e) => updateWork(i, "description", e.target.value)}
                placeholder="Ex: At Microsoft, I collaborated with..."
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
          </div>
        ))}

        <button
          onClick={() => update("workExperience", [...form.workExperience, { ...emptyWork }])}
          className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80"
        >
          <Plus size={14} /> Add Work Experience
        </button>
      </div>
    </div>
  );
};

export default StepExperience;
