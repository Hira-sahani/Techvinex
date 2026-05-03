import { useEmployerInterviews } from "@/hooks/useEmployerData";
import { Calendar, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { EmployerListSkeleton } from "@/components/skeletons/EmployerSkeletons";

const EmployerInterviews = () => {
  const { data: interviews = [], isLoading, updateInterview } = useEmployerInterviews();

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await updateInterview.mutateAsync({ id, status });
      toast.success(`Interview marked as ${status}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to update");
    }
  };

  const statusConfig: Record<string, { color: string; icon: typeof Calendar }> = {
    scheduled: { color: "bg-blue-100 text-blue-700", icon: Clock },
    completed: { color: "bg-green-100 text-green-700", icon: CheckCircle2 },
    cancelled: { color: "bg-muted text-muted-foreground", icon: XCircle },
  };

  const scheduled = interviews.filter(i => i.status === "scheduled");
  const past = interviews.filter(i => i.status !== "scheduled");

  if (isLoading) {
    return <EmployerListSkeleton />;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Interviews</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage interview schedules</p>
      </div>

      <div>
        <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
          <Calendar size={18} className="text-primary" /> Upcoming ({scheduled.length})
        </h2>
        {scheduled.length === 0 ? (
          <p className="text-sm text-muted-foreground bg-card rounded-xl border border-border p-6 text-center">No upcoming interviews</p>
        ) : (
          <div className="space-y-3">
            {scheduled.map(i => (
              <div key={i.id} className="bg-card rounded-xl border border-border p-5 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {i.candidate_name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{i.candidate_name}</p>
                    <p className="text-xs text-muted-foreground">{i.job_title}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">{i.scheduled_date}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end"><Clock size={11} />{i.scheduled_time}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(i.id, "completed")} className="text-xs gap-1">
                      <CheckCircle2 size={13} /> Done
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(i.id, "cancelled")} className="text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10">
                      <XCircle size={13} /> Cancel
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {past.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">Past Interviews</h2>
          <div className="space-y-3">
            {past.map(i => {
              const cfg = statusConfig[i.status] || statusConfig.completed;
              return (
                <div key={i.id} className="bg-card rounded-xl border border-border p-5 shadow-card opacity-75">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                        {i.candidate_name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{i.candidate_name}</p>
                        <p className="text-xs text-muted-foreground">{i.job_title} · {i.scheduled_date}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{i.status}</span>
                  </div>
                  {i.feedback && <p className="mt-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 italic">"{i.feedback}"</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployerInterviews;
