import { useState } from "react";
import { CheckCircle2, Clock, XCircle, ArrowRight, ChevronDown, ChevronUp, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const PIPELINE_STAGES = [
  { key: "applied", label: "Applied", icon: Clock, color: "bg-blue-500" },
  { key: "shortlisted", label: "Shortlisted", icon: Eye, color: "bg-indigo-500" },
  { key: "interview_scheduled", label: "Interview", icon: Clock, color: "bg-amber-500" },
  { key: "interview_completed", label: "Reviewed", icon: CheckCircle2, color: "bg-purple-500" },
  { key: "offer_received", label: "Offer", icon: CheckCircle2, color: "bg-primary" },
  { key: "hired", label: "Hired", icon: CheckCircle2, color: "bg-green-500" },
] as const;

const STATUS_MAP: Record<string, number> = {
  applied: 0,
  shortlisted: 1,
  interview_scheduled: 2,
  interview_completed: 3,
  offer_received: 4,
  hired: 5,
  rejected: -1,
  withdrawn: -2,
};

interface ApplicationPipelineProps {
  applications: any[];
}

const ApplicationPipeline = ({ applications }: ApplicationPipelineProps) => {
  const navigate = useNavigate();
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const activeApps = applications.filter(a => {
    if (filter === "all") return true;
    if (filter === "active") return !['rejected', 'withdrawn', 'hired'].includes(a.status);
    return a.status === filter;
  });

  const getStageIndex = (status: string) => STATUS_MAP[status] ?? 0;

  const statusBadgeClass = (status: string) => {
    const map: Record<string, string> = {
      applied: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      shortlisted: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
      interview_scheduled: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
      interview_completed: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      offer_received: "bg-primary/10 text-primary",
      hired: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      withdrawn: "bg-muted text-muted-foreground",
    };
    return map[status] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="border border-border rounded-xl bg-card">
      <div className="flex items-center justify-between p-4 pb-3">
        <h2 className="text-sm font-semibold text-foreground">Application Tracker</h2>
        <div className="flex gap-1">
          {["all", "active", "rejected"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                filter === f
                  ? "bg-foreground text-background"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {activeApps.length === 0 ? (
        <div className="px-4 pb-6 pt-2 text-center">
          <p className="text-xs text-muted-foreground">
            {filter === "all" && "No applications yet"}
            {filter === "active" && "No active applications"}
            {filter === "rejected" && "No rejected applications"}
          </p>
          {filter === "all" && (
            <button
              onClick={() => navigate("/explore")}
              className="mt-2 text-xs text-primary font-medium hover:underline"
            >
              Browse opportunities →
            </button>
          )}
          {filter === "active" && (
            <p className="mt-1 text-[11px] text-muted-foreground/70">
              Active applications will appear here when you apply for roles
            </p>
          )}
          {filter === "rejected" && (
            <p className="mt-1 text-[11px] text-muted-foreground/70">
              No applications have been rejected
            </p>
          )}
        </div>
      ) : (
        <div className="divide-y divide-border">
          {activeApps.map(app => {
            const stageIndex = getStageIndex(app.status);
            const isRejected = app.status === 'rejected';
            const isExpanded = expandedApp === app.id;

            return (
              <div key={app.id} className="px-4 py-3">
                {/* App header */}
                <button
                  onClick={() => setExpandedApp(isExpanded ? null : app.id)}
                  className="w-full flex items-center justify-between"
                >
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">{app.role_title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Applied {new Date(app.applied_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[10px] ${statusBadgeClass(app.status)}`}>
                      {app.status?.replace(/_/g, ' ')}
                    </Badge>
                    {isExpanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                  </div>
                </button>

                {/* Pipeline visualization */}
                {isExpanded && (
                  <div className="mt-4 mb-2">
                    {/* Progress bar */}
                    <div className="flex items-center gap-0 mb-3">
                      {PIPELINE_STAGES.map((stage, i) => {
                        const isCompleted = !isRejected && stageIndex >= i;
                        const isCurrent = !isRejected && stageIndex === i;
                        
                        return (
                          <div key={stage.key} className="flex items-center flex-1">
                            <div className="flex flex-col items-center flex-1">
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                                  isRejected
                                    ? "bg-red-100 dark:bg-red-900/30"
                                    : isCompleted
                                    ? stage.color
                                    : "bg-muted"
                                } ${isCurrent ? "ring-2 ring-offset-2 ring-primary ring-offset-background" : ""}`}
                              >
                                {isRejected ? (
                                  <XCircle size={14} className="text-red-500" />
                                ) : isCompleted ? (
                                  <stage.icon size={12} className="text-white" />
                                ) : (
                                  <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                                )}
                              </div>
                              <span className={`text-[9px] mt-1 font-medium text-center leading-tight ${
                                isCurrent ? "text-foreground" : "text-muted-foreground"
                              }`}>
                                {stage.label}
                              </span>
                            </div>
                            {i < PIPELINE_STAGES.length - 1 && (
                              <div className={`h-0.5 flex-1 -mt-4 ${
                                !isRejected && stageIndex > i ? stage.color : "bg-muted"
                              }`} />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Status message */}
                    <div className={`rounded-lg p-3 text-xs ${
                      isRejected
                        ? "bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400"
                        : "bg-secondary text-muted-foreground"
                    }`}>
                      {isRejected ? (
                        "Your application was not selected. Keep applying to find your perfect match!"
                      ) : app.status === 'hired' ? (
                        "🎉 Congratulations! You've been hired for this role."
                      ) : app.status === 'offer_received' ? (
                        "You've received an offer! Check your offers section to accept or decline."
                      ) : app.status === 'interview_scheduled' ? (
                        "Your interview has been scheduled. Check the Interviews section for details."
                      ) : app.status === 'shortlisted' ? (
                        "Great news! You've been shortlisted. An interview may be scheduled soon."
                      ) : (
                        "Your application is being reviewed. You'll be notified of any updates."
                      )}
                    </div>

                    {/* Withdraw option for active apps */}
                    {!isRejected && app.status !== 'hired' && (
                      <button className="text-[11px] text-muted-foreground hover:text-destructive mt-2 transition-colors">
                        Withdraw application
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ApplicationPipeline;
