import { useState } from "react";
import { useEmployerCandidates, useEmployerJobs } from "@/hooks/useEmployerData";
import { Search, UserCheck, UserX, Calendar, Star, FileText, Video, ChevronDown, ChevronUp, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EmployerListSkeleton } from "@/components/skeletons/EmployerSkeletons";

interface AIScoreResult {
  candidate_id: string;
  skills_score: number;
  experience_score: number;
  interview_score: number;
  total_score: number;
  reasoning: string;
}

const EmployerCandidates = () => {
  const { data: candidates = [], isLoading, updateCandidate, refetch } = useEmployerCandidates();
  const { data: jobs = [] } = useEmployerJobs();
  const [selectedJob, setSelectedJob] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [scoring, setScoring] = useState(false);
  const [aiResults, setAiResults] = useState<AIScoreResult[]>([]);
  const [sortByScore, setSortByScore] = useState(false);

  let filtered = candidates.filter(c => {
    if (selectedJob !== "all" && c.job_id !== selectedJob) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return c.candidate_name.toLowerCase().includes(q) || (c.skills || []).some((s: string) => s.toLowerCase().includes(q));
    }
    return true;
  });

  if (sortByScore) {
    filtered = [...filtered].sort((a, b) => (b.ai_score || 0) - (a.ai_score || 0));
  }

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await updateCandidate.mutateAsync({ id, status });
      toast.success(`Candidate ${status}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to update");
    }
  };

  const runAIMatch = async (jobId: string) => {
    setScoring(true);
    setAiResults([]);
    try {
      const { data, error } = await supabase.functions.invoke("ai-match-candidates", {
        body: { job_id: jobId },
      });

      if (error) throw new Error(error.message || "AI matching failed");

      if (data?.scores?.length > 0) {
        setAiResults(data.scores);
        toast.success(`${data.scores.length} candidates scored by AI`);
        if (typeof refetch === "function") refetch();
      } else {
        toast.info(data?.message || "No candidates to score");
      }
    } catch (e: any) {
      console.error("AI match error:", e);
      if (e.message?.includes("429")) {
        toast.error("AI rate limited. Please wait a moment and try again.");
      } else if (e.message?.includes("402")) {
        toast.error("AI credits exhausted. Please add funds.");
      } else {
        toast.error(e.message || "AI matching failed");
      }
    } finally {
      setScoring(false);
    }
  };

  const getAIResult = (candidateId: string) => aiResults.find(r => r.candidate_id === candidateId);

  const statusColors: Record<string, string> = {
    applied: "bg-blue-100 text-blue-700",
    shortlisted: "bg-amber-100 text-amber-700",
    interview: "bg-purple-100 text-purple-700",
    hired: "bg-green-100 text-green-700",
    rejected: "bg-muted text-muted-foreground",
  };

  const statusLabels: Record<string, string> = {
    applied: "AI Matched",
    shortlisted: "Shortlisted",
    interview: "Interview",
    hired: "Hired",
    rejected: "Rejected",
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50";
    if (score >= 60) return "text-amber-600 bg-amber-50";
    if (score >= 40) return "text-orange-600 bg-orange-50";
    return "text-red-600 bg-red-50";
  };

  const getJobTitle = (jobId: string) => jobs.find(j => j.id === jobId)?.title || "—";

  if (isLoading) {
    return <EmployerListSkeleton />;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Matched Candidates</h1>
          <p className="text-sm text-muted-foreground mt-1">AI-matched candidates for your requirements</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setSortByScore(!sortByScore)}
            className={`gap-1.5 text-xs ${sortByScore ? "bg-primary/10 border-primary text-primary" : ""}`}>
            <TrendingUp size={14} /> {sortByScore ? "Sorted by Score" : "Sort by AI Score"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name or skill..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <select value={selectedJob} onChange={e => setSelectedJob(e.target.value)}
          className="px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground">
          <option value="all">All Requirements</option>
          {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
        </select>
        {selectedJob !== "all" && (
          <Button onClick={() => runAIMatch(selectedJob)} disabled={scoring}
            className="gradient-cta text-primary-foreground border-0 gap-1.5 text-sm">
            <Sparkles size={15} className={scoring ? "animate-spin" : ""} />
            {scoring ? "AI Scoring..." : "Re-Match AI"}
          </Button>
        )}
      </div>

      {/* AI Score Breakdown Panel */}
      {aiResults.length > 0 && (
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-primary" />
            <h3 className="text-sm font-semibold text-foreground">AI Match Results</h3>
            <span className="text-xs text-muted-foreground">Skills 40% · Experience 30% · Interview Ready 30%</span>
          </div>
          <div className="grid gap-2">
            {aiResults.sort((a, b) => b.total_score - a.total_score).map((r, idx) => {
              const candidate = candidates.find(c => c.id === r.candidate_id);
              return (
                <div key={r.candidate_id} className="flex items-center gap-3 bg-card rounded-lg px-3 py-2 border border-border">
                  <span className="text-xs font-bold text-muted-foreground w-5">#{idx + 1}</span>
                  <span className="text-sm font-medium text-foreground flex-1">{candidate?.candidate_name || "Unknown"}</span>
                  <div className="flex gap-2 text-xs">
                    <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600" title="Skills">S:{r.skills_score}</span>
                    <span className="px-1.5 py-0.5 rounded bg-green-50 text-green-600" title="Experience">E:{r.experience_score}</span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-600" title="Interview">I:{r.interview_score}</span>
                  </div>
                  <span className={`text-sm font-bold px-2 py-0.5 rounded ${getScoreColor(r.total_score)}`}>{r.total_score}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-xl border border-border">
            <Sparkles size={40} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">No matched candidates yet</p>
            <p className="text-xs text-muted-foreground">Candidates will appear here when AI matches them to your requirements.</p>
          </div>
        ) : (
          filtered.map((c) => {
            const aiResult = getAIResult(c.id);
            return (
              <div key={c.id} className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
                <button onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                      {c.candidate_name.split(" ").map((n: string) => n[0]).join("")}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">{c.candidate_name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[c.status] || ""}`}>
                          {statusLabels[c.status] || c.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{getJobTitle(c.job_id)} · {c.experience} yrs exp</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {(c.ai_score > 0 || aiResult) && (
                      <div className={`flex items-center gap-1 text-sm font-bold px-2 py-0.5 rounded ${getScoreColor(aiResult?.total_score || c.ai_score)}`}>
                        <Sparkles size={12} /> {aiResult?.total_score || c.ai_score}
                      </div>
                    )}
                    {expandedId === c.id ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                  </div>
                </button>

                {expandedId === c.id && (
                  <div className="px-4 pb-4 pt-0 border-t border-border">
                    {aiResult && (
                      <div className="bg-gradient-to-r from-primary/5 to-transparent rounded-lg p-3 mb-3 mt-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Sparkles size={13} className="text-primary" />
                          <span className="text-xs font-semibold text-foreground">AI Score Breakdown</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mb-2">
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-600">{aiResult.skills_score}<span className="text-xs text-muted-foreground">/40</span></div>
                            <div className="text-xs text-muted-foreground">Skills</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-600">{aiResult.experience_score}<span className="text-xs text-muted-foreground">/30</span></div>
                            <div className="text-xs text-muted-foreground">Experience</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-purple-600">{aiResult.interview_score}<span className="text-xs text-muted-foreground">/30</span></div>
                            <div className="text-xs text-muted-foreground">Interview Ready</div>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground italic">"{aiResult.reasoning}"</p>
                      </div>
                    )}

                    <div className="grid sm:grid-cols-2 gap-4 py-3">
                      <div className="space-y-2 text-sm">
                        <p className="text-muted-foreground">Email: <span className="text-foreground">{c.email || "—"}</span></p>
                        <p className="text-muted-foreground">Phone: <span className="text-foreground">{c.phone || "—"}</span></p>
                        <p className="text-muted-foreground">Matched: <span className="text-foreground">{new Date(c.applied_at).toLocaleDateString()}</span></p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1.5">
                          {(c.skills || []).map((s: string) => <span key={s} className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium">{s}</span>)}
                        </div>
                        <div className="flex gap-2">
                          {c.resume_url && <a href={c.resume_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline"><FileText size={13} /> Resume</a>}
                          {c.video_url && <a href={c.video_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline"><Video size={13} /> Video</a>}
                        </div>
                        {c.notes && !aiResult && <p className="text-xs text-muted-foreground italic">"{c.notes}"</p>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {c.status !== "shortlisted" && c.status !== "hired" && (
                        <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(c.id, "shortlisted")} className="gap-1 text-xs">
                          <UserCheck size={13} /> Shortlist
                        </Button>
                      )}
                      {c.status !== "rejected" && (
                        <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(c.id, "rejected")} className="gap-1 text-xs text-destructive border-destructive/30 hover:bg-destructive/10">
                          <UserX size={13} /> Reject
                        </Button>
                      )}
                      {c.status !== "interview" && c.status !== "hired" && (
                        <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(c.id, "interview")} className="gap-1 text-xs">
                          <Calendar size={13} /> Schedule Interview
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default EmployerCandidates;
