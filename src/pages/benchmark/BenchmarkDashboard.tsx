import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { BarChart3, Brain, CheckCircle, Clock, FlaskConical, TrendingUp } from "lucide-react";
import { BenchmarkDashboardSkeleton } from "@/components/skeletons/DashboardSkeletons";
import { DashboardEmptyState } from "@/components/dashboard/DashboardStates";

const BenchmarkDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalTasks: 0,
    totalResults: 0,
    avgScore: 0,
    passRate: 0,
    pendingReviews: 0,
    avgLatency: 0,
  });
  const [recentResults, setRecentResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchStats(), fetchRecentResults()]).finally(() => setLoading(false));
  }, []);

  const fetchStats = async () => {
    const [tasksRes, resultsRes, reviewsRes] = await Promise.all([
      supabase.from("benchmark_tasks").select("id", { count: "exact", head: true }),
      supabase.from("benchmark_results").select("score, max_score, pass_at_1, latency_ms"),
      supabase.from("benchmark_reviews").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);

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

    setStats({
      totalTasks: tasksRes.count || 0,
      totalResults: results.length,
      avgScore: Math.round(avgScore),
      passRate: Math.round(passRate),
      pendingReviews: reviewsRes.count || 0,
      avgLatency: Math.round(avgLatency),
    });
  };

  const fetchRecentResults = async () => {
    const { data } = await supabase
      .from("benchmark_results")
      .select("*, benchmark_tasks(title, category)")
      .order("created_at", { ascending: false })
      .limit(5);
    setRecentResults(data || []);
  };

  const statCards = [
    { label: "Total Tasks", value: stats.totalTasks, icon: FlaskConical, color: "text-blue-500" },
    { label: "Tests Run", value: stats.totalResults, icon: Brain, color: "text-purple-500" },
    { label: "Avg Score", value: `${stats.avgScore}%`, icon: TrendingUp, color: "text-green-500" },
    { label: "Pass@1 Rate", value: `${stats.passRate}%`, icon: CheckCircle, color: "text-emerald-500" },
    { label: "Pending Reviews", value: stats.pendingReviews, icon: BarChart3, color: "text-orange-500" },
    { label: "Avg Latency", value: `${stats.avgLatency}ms`, icon: Clock, color: "text-cyan-500" },
  ];

  if (loading) return <BenchmarkDashboardSkeleton />;

  if (stats.totalTasks === 0 && stats.totalResults === 0) {
    return (
      <div className="p-6">
        <DashboardEmptyState
          title="No benchmark activity yet"
          description="Create benchmark tasks and run your first model evaluation to see scores, pass rates, and latency here."
          actionLabel="Create task"
          onAction={() => navigate("/benchmark/tasks")}
          secondaryActionLabel="Run a test"
          onSecondaryAction={() => navigate("/benchmark/run")}
        />
      </div>
    );
  }


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
          <p className="text-xs text-muted-foreground">No results yet. Run your first benchmark test!</p>
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
};

export default BenchmarkDashboard;
