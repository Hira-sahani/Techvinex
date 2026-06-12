import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { BarChart3, Brain, CheckCircle, Clock, FlaskConical, TrendingUp } from "lucide-react";
import { BenchmarkDashboardSkeleton } from "@/components/skeletons/DashboardSkeletons";
import { DashboardDataBoundary } from "@/components/dashboard/DashboardDataBoundary";
import { useDashboardData } from "@/hooks/useDashboardData";

type BenchmarkData = {
  stats: {
    totalTasks: number;
    totalResults: number;
    avgScore: number;
    passRate: number;
    pendingReviews: number;
    avgLatency: number;
  };
  recentResults: any[];
};

const fetchBenchmarkData = async (): Promise<BenchmarkData> => {
  const [tasksRes, resultsRes, reviewsRes, recentRes] = await Promise.all([
    supabase.from("benchmark_tasks").select("id", { count: "exact", head: true }),
    supabase.from("benchmark_results").select("score, max_score, pass_at_1, latency_ms"),
    supabase.from("benchmark_reviews").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("benchmark_results")
      .select("id, model, score, max_score, pass_at_1, latency_ms, status, created_at, task_title, task_category")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const firstError = [tasksRes, resultsRes, reviewsRes, recentRes].find((r) => r.error)?.error;
  if (firstError) throw firstError;

  const results = resultsRes.data || [];
  const avgScore = results.length > 0
    ? results.reduce((s, r) => s + ((Number(r.score) / Number(r.max_score)) * 100), 0) / results.length
    : 0;
  const passRate = results.length > 0
    ? (results.filter((r) => r.pass_at_1).length / results.length) * 100
    : 0;
  const avgLatency = results.length > 0
    ? results.reduce((s, r) => s + (r.latency_ms || 0), 0) / results.length
    : 0;

  return {
    stats: {
      totalTasks: tasksRes.count || 0,
      totalResults: results.length,
      avgScore: Math.round(avgScore),
      passRate: Math.round(passRate),
      pendingReviews: reviewsRes.count || 0,
      avgLatency: Math.round(avgLatency),
    },
    recentResults: recentRes.data || [],
  };
};

const BenchmarkDashboard = () => {
  const navigate = useNavigate();
  const query = useDashboardData<BenchmarkData>({
    fetcher: fetchBenchmarkData,
    isEmpty: (d) => d.stats.totalTasks === 0 && d.stats.totalResults === 0,
  });

  return (
    <DashboardDataBoundary
      query={query}
      skeleton={<BenchmarkDashboardSkeleton />}
      empty={{
        title: "No benchmark activity yet",
        description: "Create benchmark tasks and run your first model evaluation to see scores, pass rates, and latency here.",
        actionLabel: "Create task",
        onAction: () => navigate("/benchmark/tasks"),
        secondaryActionLabel: "Run a test",
        onSecondaryAction: () => navigate("/benchmark/run"),
      }}
    >
      {({ stats, recentResults }) => {
        const statCards = [
          { label: "Total Tasks", value: stats.totalTasks, icon: FlaskConical, color: "text-blue-500" },
          { label: "Tests Run", value: stats.totalResults, icon: Brain, color: "text-purple-500" },
          { label: "Avg Score", value: `${stats.avgScore}%`, icon: TrendingUp, color: "text-green-500" },
          { label: "Pass@1 Rate", value: `${stats.passRate}%`, icon: CheckCircle, color: "text-emerald-500" },
          { label: "Pending Reviews", value: stats.pendingReviews, icon: BarChart3, color: "text-orange-500" },
          { label: "Avg Latency", value: `${stats.avgLatency}ms`, icon: Clock, color: "text-cyan-500" },
        ];

        return (
          <div className="p-6 space-y-6">
            <div>
              <h1 className="text-lg font-bold text-foreground">Benchmark Dashboard</h1>
              <p className="text-xs text-muted-foreground">AI model evaluation overview</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {statCards.map((s) => (
                <Card key={s.label} className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                    <span className="text-[10px] text-muted-foreground">{s.label}</span>
                  </div>
                  <p className="text-lg font-bold text-foreground">{s.value}</p>
                </Card>
              ))}
            </div>

            <Card className="p-4">
              <h2 className="text-sm font-semibold mb-3">Recent Results</h2>
              {recentResults.length === 0 ? (
                <div className="flex items-center justify-between gap-3 py-2">
                  <p className="text-xs text-muted-foreground">No results yet. Run your first benchmark test.</p>
                  <button onClick={() => navigate("/benchmark/run")} className="text-xs font-medium text-primary hover:underline">Run test →</button>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentResults.map((r) => (
                    <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <p className="text-xs font-medium">{(r.benchmark_tasks as any)?.title || "Unknown Task"}</p>
                        <p className="text-[10px] text-muted-foreground">{r.model} · {(r.benchmark_tasks as any)?.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold">{Math.round(Number(r.score))}/{r.max_score}</p>
                        <p className="text-[10px] text-muted-foreground">{r.latency_ms}ms</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        );
      }}
    </DashboardDataBoundary>
  );
};

export default BenchmarkDashboard;
