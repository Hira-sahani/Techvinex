import { useState } from "react";
import { useEmployerCandidates, useEmployerJobs } from "@/hooks/useEmployerData";
import { Search, Star, Sparkles, UserCheck, Mail, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import JetraLoaderInline from "@/components/JetraLoaderInline";

const EmployerTalentPool = () => {
  const { data: candidates = [], isLoading, updateCandidate } = useEmployerCandidates();
  const { data: jobs = [] } = useEmployerJobs();
  const [search, setSearch] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [minExp, setMinExp] = useState(0);

  // Talent pool = shortlisted + hired candidates (top talent)
  const pool = candidates
    .filter(c => ["shortlisted", "hired", "interview"].includes(c.status))
    .filter(c => {
      if (search) {
        const q = search.toLowerCase();
        return c.candidate_name.toLowerCase().includes(q) ||
          (c.skills || []).some(s => s.toLowerCase().includes(q));
      }
      return true;
    })
    .filter(c => (c.ai_score || 0) >= minScore)
    .filter(c => (c.experience || 0) >= minExp)
    .sort((a, b) => (b.ai_score || 0) - (a.ai_score || 0));

  const getJobTitle = (jobId: string) => jobs.find(j => j.id === jobId)?.title || "—";

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50";
    if (score >= 60) return "text-amber-600 bg-amber-50";
    return "text-muted-foreground bg-muted";
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><JetraLoaderInline /></div>;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Talent Pool</h1>
        <p className="text-sm text-muted-foreground mt-1">Your shortlisted top candidates for current and future roles</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name or skill..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select value={minScore} onChange={e => setMinScore(Number(e.target.value))}
          className="px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground">
          <option value={0}>Min AI Score: Any</option>
          <option value={60}>60+</option>
          <option value={70}>70+</option>
          <option value={80}>80+</option>
          <option value={90}>90+</option>
        </select>
        <select value={minExp} onChange={e => setMinExp(Number(e.target.value))}
          className="px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground">
          <option value={0}>Min Experience: Any</option>
          <option value={2}>2+ years</option>
          <option value={5}>5+ years</option>
          <option value={8}>8+ years</option>
        </select>
      </div>

      <div className="text-xs text-muted-foreground">{pool.length} candidate{pool.length !== 1 ? "s" : ""} in talent pool</div>

      {pool.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <Star size={40} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No candidates in your talent pool yet. Shortlist candidates to add them here.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {pool.map(c => (
            <div key={c.id} className="bg-card rounded-xl border border-border p-5 shadow-card hover:shadow-card-hover transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                  {c.candidate_name.split(" ").map(n => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-foreground">{c.candidate_name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      c.status === "hired" ? "bg-green-100 text-green-700" :
                      c.status === "interview" ? "bg-purple-100 text-purple-700" :
                      "bg-amber-100 text-amber-700"
                    }`}>{c.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{getJobTitle(c.job_id)} · {c.experience} yrs experience</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(c.skills || []).map(s => (
                      <span key={s} className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium">{s}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {c.email && <span className="flex items-center gap-1"><Mail size={11} />{c.email}</span>}
                    {c.phone && <span className="flex items-center gap-1"><Phone size={11} />{c.phone}</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  {c.ai_score > 0 && (
                    <div className={`flex items-center gap-1 text-sm font-bold px-2.5 py-1 rounded-lg ${getScoreColor(c.ai_score)}`}>
                      <Sparkles size={13} /> {c.ai_score}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmployerTalentPool;
