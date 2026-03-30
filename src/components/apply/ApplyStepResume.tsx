import { Upload, X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { countries } from "@/data/countries";

interface Education {
  school: string;
  degree: string;
  field: string;
  startYear: string;
  endYear: string;
}

interface WorkExp {
  company: string;
  title: string;
  startDate: string;
  endDate: string;
  description: string;
}

interface ProjectItem {
  name: string;
  description: string;
  url: string;
}

interface FormData {
  resumeName: string;
  fullName: string;
  email: string;
  phone: string;
  countryCode: string;
  linkedin: string;
  noLinkedin: boolean;
  summary: string;
  education: Education[];
  workExperience: WorkExp[];
  projects: ProjectItem[];
  publications: string[];
  certifications: string[];
  awards: string[];
  leetcode: string;
  github: string;
  codechef: string;
  codeforces: string;
  portfolio: string;
  otherLinks: string[];
  skills: string[];
}

interface Props {
  form: FormData;
  update: (key: string, value: any) => void;
}

const ApplyStepResume = ({ form, update }: Props) => {
  const [skillInput, setSkillInput] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");

  const selectedCountry = countries.find((c) => c.code === form.countryCode) || countries[0];
  const filteredCountries = countries.filter(
    (c) => c.name.toLowerCase().includes(countrySearch.toLowerCase()) || c.dial.includes(countrySearch)
  );

  const addEducation = () => {
    update("education", [...form.education, { school: "", degree: "", field: "", startYear: "", endYear: "" }]);
  };

  const addWorkExp = () => {
    update("workExperience", [...form.workExperience, { company: "", title: "", startDate: "", endDate: "", description: "" }]);
  };

  const addProject = () => {
    update("projects", [...form.projects, { name: "", description: "", url: "" }]);
  };

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !form.skills.includes(trimmed)) {
      update("skills", [...form.skills, trimmed]);
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    update("skills", form.skills.filter((s) => s !== skill));
  };

  return (
    <div className="space-y-4">
      {/* Upload Resume */}
      <div>
        <h2 className="text-sm font-bold text-foreground mb-1">Upload resume</h2>
        <p className="text-[11px] text-muted-foreground mb-3">
          Please upload your resume to initiate the application process and help us evaluate your qualifications.
        </p>
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-6 cursor-pointer hover:border-primary/50 transition-colors bg-card">
          <Upload size={20} className="text-muted-foreground mb-1.5" />
          <p className="text-xs text-foreground font-medium">
            {form.resumeName || "Drop your resume here"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            or <span className="text-primary">browse files</span> on your computer
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Supports PDF up to 3MB</p>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) update("resumeName", file.name);
            }}
          />
        </label>
        <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
          Uploading a new resume will also update the resume on your profile.<br />
          By uploading your resume, you agree to our <span className="text-primary underline">Terms and Conditions</span> and <span className="text-primary underline">Privacy Policy</span>.<br />
          We will not share your resume with any third parties.
        </p>
      </div>

      {/* Full Name */}
      <div>
        <label className="text-xs font-medium text-foreground mb-1 block">Full Name *</label>
        <Input value={form.fullName} onChange={(e) => update("fullName", e.target.value)} placeholder="Your full name" className="text-xs h-9" />
      </div>

      {/* Email & Phone */}
      <div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-medium text-foreground">Email ⓘ</label>
          <label className="text-xs font-medium text-foreground">Phone</label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@email.com" className="text-xs h-9" />
          <div className="flex gap-1">
            <div className="relative">
              <button
                type="button"
                onClick={() => setCountryOpen(!countryOpen)}
                className="flex items-center gap-0.5 h-9 px-1.5 rounded-md border border-input bg-background text-xs whitespace-nowrap"
              >
                <span className="text-sm">{selectedCountry.flag}</span>
                <span className="text-foreground">{selectedCountry.dial}</span>
              </button>
              {countryOpen && (
                <>
                  <div className="fixed inset-0 z-[79]" onClick={() => { setCountryOpen(false); setCountrySearch(""); }} />
                  <div className="absolute top-full left-0 mt-1 z-[80] w-[260px] bg-popover rounded-lg border border-border shadow-xl">
                    <div className="p-2">
                      <Input placeholder="Search..." value={countrySearch} onChange={(e) => setCountrySearch(e.target.value)} className="h-8 text-xs" autoFocus />
                    </div>
                    <div className="max-h-[180px] overflow-y-auto">
                      {filteredCountries.map((c) => (
                        <button
                          key={c.code}
                          onClick={() => { update("countryCode", c.code); setCountryOpen(false); setCountrySearch(""); }}
                          className={`flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-secondary ${c.code === form.countryCode ? "bg-secondary font-medium" : ""}`}
                        >
                          <span>{c.flag}</span>
                          <span className="flex-1 text-left">{c.name}</span>
                          <span className="text-muted-foreground">{c.dial}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <Input
              type="tel"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="Phone number"
              className="flex-1 text-xs h-9"
            />
          </div>
        </div>
      </div>

      {/* LinkedIn */}
      <div>
        <label className="text-xs font-medium text-foreground mb-1 block">LinkedIn URL *</label>
        <div className="flex gap-2">
          <Input
            value={form.linkedin}
            onChange={(e) => update("linkedin", e.target.value)}
            placeholder="https://linkedin.com/in/yourprofile"
            className="flex-1 text-xs h-9"
            disabled={form.noLinkedin}
          />
          <Button size="sm" className="rounded-md gradient-cta border-0 text-primary-foreground text-[11px] px-3 h-9">
            Link LinkedIn
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Checkbox
            checked={form.noLinkedin}
            onCheckedChange={(v) => update("noLinkedin", !!v)}
            id="no-linkedin"
            className="h-3.5 w-3.5"
          />
          <label htmlFor="no-linkedin" className="text-[11px] text-muted-foreground">I don't have a LinkedIn</label>
        </div>
      </div>

      {/* Summary */}
      <div>
        <label className="text-xs font-medium text-foreground mb-1 block">Summary</label>
        <Input value={form.summary} onChange={(e) => update("summary", e.target.value)} placeholder="Profile Summary" className="text-xs h-9" />
      </div>

      {/* Education */}
      <div>
        <h3 className="text-sm font-bold text-foreground mb-1.5">Education</h3>
        {form.education.map((edu, i) => (
          <div key={i} className="border border-border rounded-lg p-2.5 mb-2 space-y-1.5 bg-card">
            <Input placeholder="School/University" value={edu.school} className="text-xs h-8" onChange={(e) => {
              const arr = [...form.education]; arr[i] = { ...arr[i], school: e.target.value }; update("education", arr);
            }} />
            <div className="grid grid-cols-2 gap-1.5">
              <Input placeholder="Degree" value={edu.degree} className="text-xs h-8" onChange={(e) => {
                const arr = [...form.education]; arr[i] = { ...arr[i], degree: e.target.value }; update("education", arr);
              }} />
              <Input placeholder="Field of Study" value={edu.field} className="text-xs h-8" onChange={(e) => {
                const arr = [...form.education]; arr[i] = { ...arr[i], field: e.target.value }; update("education", arr);
              }} />
            </div>
          </div>
        ))}
        <button onClick={addEducation} className="flex items-center gap-1 text-[11px] text-primary hover:underline">
          <Plus size={12} /> Add Education
        </button>
      </div>

      {/* Work Experience */}
      <div>
        <h3 className="text-sm font-bold text-foreground mb-1.5">Work Experience</h3>
        {form.workExperience.map((w, i) => (
          <div key={i} className="border border-border rounded-lg p-2.5 mb-2 space-y-1.5 bg-card">
            <Input placeholder="Company" value={w.company} className="text-xs h-8" onChange={(e) => {
              const arr = [...form.workExperience]; arr[i] = { ...arr[i], company: e.target.value }; update("workExperience", arr);
            }} />
            <Input placeholder="Job Title" value={w.title} className="text-xs h-8" onChange={(e) => {
              const arr = [...form.workExperience]; arr[i] = { ...arr[i], title: e.target.value }; update("workExperience", arr);
            }} />
          </div>
        ))}
        <button onClick={addWorkExp} className="flex items-center gap-1 text-[11px] text-primary hover:underline">
          <Plus size={12} /> Add Work Experience
        </button>
      </div>

      {/* Projects */}
      <div>
        <h3 className="text-sm font-bold text-foreground mb-1.5">Projects</h3>
        {form.projects.map((p, i) => (
          <div key={i} className="border border-border rounded-lg p-2.5 mb-2 space-y-1.5 bg-card">
            <Input placeholder="Project Name" value={p.name} className="text-xs h-8" onChange={(e) => {
              const arr = [...form.projects]; arr[i] = { ...arr[i], name: e.target.value }; update("projects", arr);
            }} />
            <Input placeholder="Description" value={p.description} className="text-xs h-8" onChange={(e) => {
              const arr = [...form.projects]; arr[i] = { ...arr[i], description: e.target.value }; update("projects", arr);
            }} />
          </div>
        ))}
        <button onClick={addProject} className="flex items-center gap-1 text-[11px] text-primary hover:underline">
          <Plus size={12} /> Add Project
        </button>
      </div>

      {/* Publications */}
      <div>
        <h3 className="text-sm font-bold text-foreground mb-1.5">Publications</h3>
        <button onClick={() => update("publications", [...form.publications, ""])} className="flex items-center gap-1 text-[11px] text-primary hover:underline">
          <Plus size={12} /> Add Publication
        </button>
      </div>

      {/* Certifications */}
      <div>
        <h3 className="text-sm font-bold text-foreground mb-1.5">Certifications</h3>
        <button onClick={() => update("certifications", [...form.certifications, ""])} className="flex items-center gap-1 text-[11px] text-primary hover:underline">
          <Plus size={12} /> Add Certification
        </button>
      </div>

      {/* Awards */}
      <div>
        <h3 className="text-sm font-bold text-foreground mb-1.5">Awards</h3>
        <button onClick={() => update("awards", [...form.awards, ""])} className="flex items-center gap-1 text-[11px] text-primary hover:underline">
          <Plus size={12} /> Add Award
        </button>
      </div>

      {/* Profiles */}
      <div>
        <h3 className="text-sm font-bold text-foreground mb-1.5">Profiles</h3>
        <p className="text-[11px] text-muted-foreground mb-1.5">Profile username</p>
        <div className="space-y-1.5">
          {[
            { icon: "⚡", key: "leetcode", placeholder: "leetcode-username" },
            { icon: "🐙", key: "github", placeholder: "github-username" },
            { icon: "🍳", key: "codechef", placeholder: "codechef-username" },
            { icon: "📊", key: "codeforces", placeholder: "codeforces-username" },
          ].map((p) => (
            <div key={p.key} className="flex items-center gap-2 border border-border rounded-lg px-2.5 py-1.5 bg-card">
              <span className="text-xs">{p.icon}</span>
              <Input
                value={(form as any)[p.key] || ""}
                onChange={(e) => update(p.key, e.target.value)}
                placeholder={p.placeholder}
                className="border-0 p-0 h-auto text-xs focus-visible:ring-0"
              />
              {(form as any)[p.key] && (
                <button onClick={() => update(p.key, "")} className="text-muted-foreground hover:text-foreground">
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Links */}
      <div>
        <h3 className="text-sm font-bold text-foreground mb-1.5">Links</h3>
        <label className="text-[11px] font-medium text-foreground mb-1 block">Portfolio URL</label>
        <Input value={form.portfolio} onChange={(e) => update("portfolio", e.target.value)} placeholder="https://yourportfolio.com" className="mb-1.5 text-xs h-9" />
        <label className="text-[11px] font-medium text-foreground mb-1 block">Other links</label>
        {form.otherLinks.map((link, i) => (
          <Input
            key={i}
            value={link}
            onChange={(e) => {
              const arr = [...form.otherLinks]; arr[i] = e.target.value; update("otherLinks", arr);
            }}
            placeholder="https://example.com"
            className="mb-1 text-xs h-9"
          />
        ))}
        <button onClick={() => update("otherLinks", [...form.otherLinks, ""])} className="flex items-center gap-1 text-[11px] text-primary hover:underline">
          <Plus size={12} /> Add more links
        </button>
      </div>

      {/* Skills */}
      <div>
        <h3 className="text-sm font-bold text-foreground mb-1.5">Skills</h3>
        <div className="flex flex-wrap gap-1 mb-1.5">
          {form.skills.map((skill) => (
            <span key={skill} className="flex items-center gap-1 bg-secondary text-secondary-foreground text-[11px] px-2 py-0.5 rounded-full">
              {skill}
              <button onClick={() => removeSkill(skill)}><X size={10} /></button>
            </span>
          ))}
        </div>
        <Input
          value={skillInput}
          onChange={(e) => setSkillInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
          placeholder="Type a skill and press Enter"
          className="text-xs h-9"
        />
      </div>

      {/* FAQ & Support */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <span className="text-[11px] text-muted-foreground">ⓘ FAQ</span>
        <span className="text-[11px] text-primary">Contact Support →</span>
      </div>
    </div>
  );
};

export default ApplyStepResume;
