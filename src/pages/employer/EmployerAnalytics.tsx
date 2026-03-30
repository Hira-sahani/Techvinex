import { useEmployerCandidates, useEmployerJobs } from "@/hooks/useEmployerData";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Users, Briefcase } from "lucide-react";
import JetraLoaderInline from "@/components/JetraLoaderInline";

const PIE_COLORS = ["hsl(217, 91%, 60%)", "hsl(38, 92%, 50%)", "hsl(271, 91%, 65%)", "hsl(142, 71%, 45%)", "hsl(0, 0%, 70%)"];

const EmployerAnalytics = () => {
  const { data: jobs = [], isLoading: jobsLoading } = useEmployerJobs();
  const { data: candidates = [], isLoading: candidatesLoading } = useEmployerCandidates();

  if (jobsLoading || candidatesLoading) {
    return <div className="flex items-center justify-center py-20"><JetraLoaderInline /></div>;
  }

  const funnelData = [
    { stage: "Applied", count: candidates.length },
    { stage: "Shortlisted", count: candidates.filter(c => ["shortlisted", "interview", "hired"].includes(c.status)).length },
    { stage: "Interview", count: candidates.filter(c => ["interview", "hired"].includes(c.status)).length },
    { stage: "Hired", count: candidates.filter(c => c.status === "hired").length },
  ];

  const jobDistribution = jobs.map(j => ({
    name: j.title.length > 18 ? j.title.slice(0, 18) + "..." : j.title,
    candidates: candidates.filter(c => c.job_id === j.id).length,
  }));

  const statusPie = [
    { name: "Applied", value: candidates.filter(c => c.status === "applied").length },
    { name: "Shortlisted", value: candidates.filter(c => c.status === "shortlisted").length },
    { name: "Interview", value: candidates.filter(c => c.status === "interview").length },
    { name: "Hired", value: candidates.filter(c => c.status === "hired").length },
    { name: "Rejected", value: candidates.filter(c => c.status === "rejected").length },
  ].filter(s => s.value > 0);

  const avgAiScore = candidates.length > 0 ? Math.round(candidates.reduce((a, c) => a + c.ai_score, 0) / candidates.length) : 0;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Hiring funnel and performance metrics</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-5 shadow-card text-center">
          <Briefcase size={20} className="mx-auto text-primary mb-2" />
          <p className="text-2xl font-bold text-foreground tabular-nums">{jobs.filter(j => j.status === "active").length}</p>
          <p className="text-xs text-muted-foreground">Active Jobs</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 shadow-card text-center">
          <Users size={20} className="mx-auto text-blue-600 mb-2" />
          <p className="text-2xl font-bold text-foreground tabular-nums">{candidates.length}</p>
          <p className="text-xs text-muted-foreground">Total Candidates</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 shadow-card text-center">
          <TrendingUp size={20} className="mx-auto text-green-600 mb-2" />
          <p className="text-2xl font-bold text-foreground tabular-nums">{avgAiScore}</p>
          <p className="text-xs text-muted-foreground">Avg AI Score</p>
        </div>
      </div>

      {candidates.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-10 shadow-card text-center">
          <p className="text-sm text-muted-foreground">No data yet. Analytics will populate as candidates apply and progress through your pipeline.</p>
        </div>
      ) : (
        <>
          <div className="bg-card rounded-xl border border-border p-5 shadow-card">
            <h2 className="text-base font-semibold text-foreground mb-4">Hiring Funnel</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={funnelData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {jobDistribution.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-5 shadow-card">
                <h2 className="text-base font-semibold text-foreground mb-4">Candidates per Job</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={jobDistribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                    <Bar dataKey="candidates" fill="hsl(217, 91%, 60%)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {statusPie.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-5 shadow-card">
                <h2 className="text-base font-semibold text-foreground mb-4">Status Distribution</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={statusPie} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value">
                      {statusPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {statusPie.map((s, i) => (
                    <div key={s.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                      {s.name} ({s.value})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default EmployerAnalytics;
