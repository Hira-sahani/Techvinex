import { useNavigate } from "react-router-dom";
import { Target, Users, UserCheck, Award, ArrowRight, TrendingUp, Activity, AlertTriangle } from "lucide-react";
import { useEmployerJobs, useEmployerCandidates, useEmployerInterviews } from "@/hooks/useEmployerData";
import { EmployerDashboardSkeleton } from "@/components/skeletons/DashboardSkeletons";
import { DashboardDataBoundary } from "@/components/dashboard/DashboardDataBoundary";
import { useQueryAsDashboardData } from "@/hooks/useQueryAsDashboardData";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";

type EmployerData = { jobs: any[]; candidates: any[]; interviews: any[] };

const EmployerDashboard = () => {
  const navigate = useNavigate();
  const jobsQ = useEmployerJobs();
  const candidatesQ = useEmployerCandidates();
  const interviewsQ = useEmployerInterviews();

  // Aggregate three react-query results into one query-shape
  const aggregated = useMemo(() => ({
    data: jobsQ.data && candidatesQ.data && interviewsQ.data
      ? { jobs: jobsQ.data, candidates: candidatesQ.data, interviews: interviewsQ.data } as EmployerData
      : undefined,
    error: jobsQ.error || candidatesQ.error || interviewsQ.error,
    isLoading: jobsQ.isLoading || candidatesQ.isLoading || interviewsQ.isLoading,
    isFetching: jobsQ.isFetching || candidatesQ.isFetching || interviewsQ.isFetching,
    refetch: async () => {
      await Promise.all([jobsQ.refetch(), candidatesQ.refetch(), interviewsQ.refetch()]);
    },
  }), [jobsQ, candidatesQ, interviewsQ]);

  const query = useQueryAsDashboardData<EmployerData>(aggregated, {
    isEmpty: (d) => d.jobs.length === 0 && d.candidates.length === 0 && d.interviews.length === 0,
  });

  return (
    <DashboardDataBoundary
      query={query}
      skeleton={<EmployerDashboardSkeleton />}
      empty={{
        title: "No hiring activity yet",
        description: "Create your first requirement to start receiving matched candidates and scheduled interviews here.",
        actionLabel: "Create requirement",
        onAction: () => navigate("/employer/requirements"),
        secondaryActionLabel: "Refresh",
        onSecondaryAction: () => void query.refetch(),
      }}
    >
      {({ jobs, candidates, interviews }) => {
        const totalCandidates = candidates.length;
        const activeRequirements = jobs.filter((j) => j.status === "active").length;
        const shortlisted = candidates.filter((c) => c.status === "shortlisted").length;
        const hired = candidates.filter((c) => c.status === "hired").length;
        const inInterview = candidates.filter((c) => c.status === "interview").length;
        const upcomingInterviews = interviews.filter((i) => i.status === "scheduled");
        const avgAiScore = candidates.length > 0 ? Math.round(candidates.reduce((a, c) => a + (c.ai_score || 0), 0) / candidates.length) : 0;

        const stats = [
          { label: "Active Requirements", value: activeRequirements, icon: Target, color: "bg-primary/10 text-primary" },
          { label: "Matched Candidates", value: totalCandidates, icon: Users, color: "bg-primary/10 text-primary" },
          { label: "In Pipeline", value: shortlisted + inInterview, icon: UserCheck, color: "bg-secondary text-foreground" },
          { label: "Hired", value: hired, icon: Award, color: "bg-muted text-foreground" },
        ];

        const recentActivity = [...candidates]
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
          .slice(0, 6)
          .map((c) => ({
            id: c.id,
            text: `${c.candidate_name} → ${c.status}`,
            time: new Date(c.updated_at).toLocaleDateString(),
          }));

        const now = new Date();
        const slaJobs = jobs.filter((j) => {
          if (j.status !== "active") return false;
          const created = new Date(j.created_at);
          const daysSince = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          const hasHire = candidates.some((c) => c.job_id === j.id && c.status === "hired");
          return daysSince > 14 && !hasHire;
        });

        return (
          <div className="space-y-6 max-w-6xl animate-in fade-in-0 duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
                <p className="text-sm text-muted-foreground mt-1">Welcome back! Here's your hiring overview.</p>
              </div>
              <Button onClick={() => navigate("/employer/requirements")} className="gradient-cta text-primary-foreground border-0 gap-2 text-sm">
                <Target size={15} /> Create Requirement
              </Button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat) => (
                <div key={stat.label} className="bg-card rounded-xl border border-border p-5 shadow-card hover:shadow-card-hover transition-shadow">
                  <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>
                    <stat.icon size={20} />
                  </div>
                  <p className="text-2xl font-bold text-foreground tabular-nums">{stat.value}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            {slaJobs.length > 0 && (
              <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle size={18} className="text-destructive mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-destructive">SLA Alert: {slaJobs.length} requirement{slaJobs.length > 1 ? "s" : ""} open 14+ days without hire</p>
                  <div className="mt-1 space-y-0.5">
                    {slaJobs.slice(0, 3).map((j) => {
                      const days = Math.floor((now.getTime() - new Date(j.created_at).getTime()) / (1000 * 60 * 60 * 24));
                      return <p key={j.id} className="text-xs text-muted-foreground">• {j.title} — {days} days open</p>;
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="bg-card rounded-xl border border-border p-5 shadow-card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-foreground">Active Requirements</h2>
                  <button onClick={() => navigate("/employer/requirements")} className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                    View all <ArrowRight size={12} />
                  </button>
                </div>
                <div className="space-y-3">
                  {jobs.filter((j) => j.status === "active").length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No active requirements</p>
                  ) : (
                    jobs.filter((j) => j.status === "active").slice(0, 4).map((job) => (
                      <div key={job.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{job.title}</p>
                          <p className="text-xs text-muted-foreground">{job.location} · {job.type}</p>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Users size={13} />
                          {candidates.filter((c) => c.job_id === job.id).length}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-card rounded-xl border border-border p-5 shadow-card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-foreground">Upcoming Interviews</h2>
                  <button onClick={() => navigate("/employer/interviews")} className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                    View all <ArrowRight size={12} />
                  </button>
                </div>
                <div className="space-y-3">
                  {upcomingInterviews.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No upcoming interviews</p>
                  ) : (
                    upcomingInterviews.slice(0, 4).map((interview) => (
                      <div key={interview.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{interview.candidate_name}</p>
                          <p className="text-xs text-muted-foreground">{interview.job_title}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium text-foreground">{interview.scheduled_date}</p>
                          <p className="text-xs text-muted-foreground">{interview.scheduled_time}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-card rounded-xl border border-border p-5 shadow-card">
                <div className="flex items-center gap-2 mb-4">
                  <Activity size={16} className="text-primary" />
                  <h2 className="text-base font-semibold text-foreground">Recent Activity</h2>
                </div>
                <div className="space-y-3">
                  {recentActivity.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No recent activity</p>
                  ) : (
                    recentActivity.map((a) => (
                      <div key={a.id} className="flex items-center justify-between p-2">
                        <p className="text-xs text-foreground truncate flex-1">{a.text}</p>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">{a.time}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-5 shadow-card">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={18} className="text-primary" />
                <h2 className="text-base font-semibold text-foreground">Candidate Funnel</h2>
                {avgAiScore > 0 && <span className="text-xs text-muted-foreground ml-auto">Avg AI Score: {avgAiScore}</span>}
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {[
                  { label: "AI Matched", count: candidates.filter((c) => c.status === "applied").length, color: "bg-secondary text-foreground" },
                  { label: "Shortlisted", count: shortlisted, color: "bg-muted text-foreground" },
                  { label: "Interview", count: inInterview, color: "bg-primary/10 text-primary" },
                  { label: "Hired", count: hired, color: "bg-primary/10 text-primary" },
                ].map((step, i) => (
                  <div key={step.label} className="flex items-center gap-2">
                    <div className={`px-4 py-3 rounded-lg ${step.color} text-center min-w-[100px]`}>
                      <p className="text-xl font-bold tabular-nums">{step.count}</p>
                      <p className="text-xs font-medium mt-0.5">{step.label}</p>
                    </div>
                    {i < 3 && <ArrowRight size={16} className="text-muted-foreground flex-shrink-0" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }}
    </DashboardDataBoundary>
  );
};

export default EmployerDashboard;
