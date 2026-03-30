import { useState, useCallback } from "react";
import { useEmployerCandidates, useEmployerJobs } from "@/hooks/useEmployerData";
import { GripVertical, Sparkles } from "lucide-react";
import { toast } from "sonner";
import JetraLoaderInline from "@/components/JetraLoaderInline";

const STAGES = [
  { key: "applied", label: "AI Matched", color: "border-blue-400 bg-blue-50" },
  { key: "shortlisted", label: "Shortlisted", color: "border-amber-400 bg-amber-50" },
  { key: "interview", label: "Interview", color: "border-purple-400 bg-purple-50" },
  { key: "hired", label: "Hired", color: "border-green-400 bg-green-50" },
  { key: "rejected", label: "Rejected", color: "border-muted bg-muted/30" },
];

const EmployerPipeline = () => {
  const { data: candidates = [], isLoading, updateCandidate } = useEmployerCandidates();
  const { data: jobs = [] } = useEmployerJobs();
  const [selectedJob, setSelectedJob] = useState("all");
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const filtered = selectedJob === "all" ? candidates : candidates.filter(c => c.job_id === selectedJob);

  const handleDrop = useCallback(async (candidateId: string, newStatus: string) => {
    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate || candidate.status === newStatus) return;
    try {
      await updateCandidate.mutateAsync({ id: candidateId, status: newStatus });
      toast.success(`Moved to ${STAGES.find(s => s.key === newStatus)?.label || newStatus}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to move candidate");
    }
  }, [candidates, updateCandidate]);

  const getJobTitle = (jobId: string) => jobs.find(j => j.id === jobId)?.title || "—";

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-amber-600";
    return "text-muted-foreground";
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><JetraLoaderInline /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Hiring Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-1">Drag candidates between stages</p>
        </div>
        <select value={selectedJob} onChange={e => setSelectedJob(e.target.value)}
          className="px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground">
          <option value="all">All Requirements</option>
          {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
        </select>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 500 }}>
        {STAGES.map(stage => {
          const stageCandidates = filtered.filter(c => c.status === stage.key);
          return (
            <div key={stage.key}
              className={`flex-shrink-0 w-64 rounded-xl border-t-4 ${stage.color} bg-card border border-border flex flex-col`}
              onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
              onDrop={e => {
                e.preventDefault();
                const id = e.dataTransfer.getData("candidateId");
                if (id) handleDrop(id, stage.key);
              }}
            >
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">{stage.label}</h3>
                  <span className="text-xs font-bold text-muted-foreground bg-muted rounded-full w-6 h-6 flex items-center justify-center">
                    {stageCandidates.length}
                  </span>
                </div>
              </div>

              <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[60vh]">
                {stageCandidates.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-8 opacity-60">
                    Drop candidates here
                  </div>
                ) : (
                  stageCandidates.map(c => (
                    <div key={c.id}
                      draggable
                      onDragStart={e => {
                        e.dataTransfer.setData("candidateId", c.id);
                        setDraggedId(c.id);
                      }}
                      onDragEnd={() => setDraggedId(null)}
                      className={`bg-background rounded-lg border border-border p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
                        draggedId === c.id ? "opacity-50" : ""
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{c.candidate_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{getJobTitle(c.job_id)}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-xs text-muted-foreground">{c.experience}yr exp</span>
                            {c.ai_score > 0 && (
                              <span className={`text-xs font-bold flex items-center gap-0.5 ${getScoreColor(c.ai_score)}`}>
                                <Sparkles size={10} />{c.ai_score}
                              </span>
                            )}
                          </div>
                          {(c.skills || []).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {c.skills!.slice(0, 3).map(s => (
                                <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{s}</span>
                              ))}
                              {c.skills!.length > 3 && <span className="text-[10px] text-muted-foreground">+{c.skills!.length - 3}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EmployerPipeline;
