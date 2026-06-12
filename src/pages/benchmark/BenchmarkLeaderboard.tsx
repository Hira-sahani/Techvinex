import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Medal, BarChart3, Zap, Target, Clock, TrendingUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SkeletonStatGrid, SkeletonTable } from "@/components/skeletons/Skeleton";

interface LeaderboardEntry {
  model: string;
  avg_score: number;
  total_runs: number;
  pass_rate: number;
  avg_latency: number;
  best_score: number;
  worst_score: number;
  categories: Record<string, { avg: number; count: number }>;
}

const MODEL_COLORS = [
  "hsl(var(--primary))",
  "hsl(280, 70%, 55%)",
  "hsl(160, 70%, 45%)",
  "hsl(30, 90%, 55%)",
  "hsl(340, 70%, 55%)",
  "hsl(200, 70%, 50%)",
];

const BenchmarkLeaderboard = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("all");
  const [results, setResults] = useState<any[]>([]);
  const [viewTab, setViewTab] = useState("ranking");

  useEffect(() => { fetchResults(); }, []);

  const fetchResults = async () => {
    setLoading(true);
    // Denormalized task_category lives on benchmark_results — no lateral join.
    const { data } = await supabase
      .from("benchmark_results")
      .select("model, score, max_score, pass_at_1, latency_ms, status, task_category")
      .eq("status", "completed");
    setResults(data || []);
    computeLeaderboard(data || [], filterCategory);
    setLoading(false);
  };

  useEffect(() => {
    computeLeaderboard(results, filterCategory);
  }, [filterCategory]);

  const computeLeaderboard = (data: any[], category: string) => {
    const filtered = category === "all" ? data : data.filter((r) => (r.task_category ?? (r.benchmark_tasks as any)?.category) === category);
    const byModel: Record<string, { scores: number[]; pass: number; latencies: number[]; cats: Record<string, number[]> }> = {};

    filtered.forEach((r) => {
      if (!byModel[r.model]) byModel[r.model] = { scores: [], pass: 0, latencies: [], cats: {} };
      const pct = (Number(r.score) / r.max_score) * 100;
      byModel[r.model].scores.push(pct);
      if (r.pass_at_1) byModel[r.model].pass++;
      byModel[r.model].latencies.push(r.latency_ms || 0);
      const cat = r.task_category ?? (r.benchmark_tasks as any)?.category ?? "general";
      if (!byModel[r.model].cats[cat]) byModel[r.model].cats[cat] = [];
      byModel[r.model].cats[cat].push(pct);
    });

    const board: LeaderboardEntry[] = Object.entries(byModel).map(([model, d]) => ({
      model,
      avg_score: Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length),
      total_runs: d.scores.length,
      pass_rate: Math.round((d.pass / d.scores.length) * 100),
      avg_latency: Math.round(d.latencies.reduce((a, b) => a + b, 0) / d.latencies.length),
      best_score: Math.round(Math.max(...d.scores)),
      worst_score: Math.round(Math.min(...d.scores)),
      categories: Object.fromEntries(
        Object.entries(d.cats).map(([cat, scores]) => [cat, {
          avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
          count: scores.length,
        }])
      ),
    }));

    board.sort((a, b) => b.avg_score - a.avg_score);
    setEntries(board);
  };

  const rankIcon = (i: number) => {
    if (i === 0) return <Trophy className="w-4 h-4 text-yellow-500" />;
    if (i === 1) return <Medal className="w-4 h-4 text-gray-400" />;
    if (i === 2) return <Medal className="w-4 h-4 text-amber-600" />;
    return <span className="text-xs font-bold text-muted-foreground w-4 text-center">{i + 1}</span>;
  };

  const maxLatency = Math.max(...entries.map((e) => e.avg_latency), 1);
  const allCategories = [...new Set(results.map((r) => (r.benchmark_tasks as any)?.category).filter(Boolean))];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-500" /> Leaderboard</h1>
          <p className="text-xs text-muted-foreground">Model performance rankings</p>
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Categories</SelectItem>
            <SelectItem value="hiring" className="text-xs">Hiring</SelectItem>
            <SelectItem value="finance" className="text-xs">Finance</SelectItem>
            <SelectItem value="reasoning" className="text-xs">Reasoning</SelectItem>
            <SelectItem value="coding" className="text-xs">Coding</SelectItem>
            <SelectItem value="general" className="text-xs">General</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          <SkeletonStatGrid count={4} cols="grid-cols-2 sm:grid-cols-4" />
          <SkeletonTable rows={6} cols={5} />
        </div>
      ) : entries.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground">No benchmark data yet. Run some tests first!</p>
        </Card>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Card className="p-3 text-center">
              <BarChart3 className="w-4 h-4 mx-auto text-primary mb-1" />
              <p className="text-lg font-bold">{entries.length}</p>
              <p className="text-[10px] text-muted-foreground">Models Tested</p>
            </Card>
            <Card className="p-3 text-center">
              <Target className="w-4 h-4 mx-auto text-primary mb-1" />
              <p className="text-lg font-bold">{entries.reduce((s, e) => s + e.total_runs, 0)}</p>
              <p className="text-[10px] text-muted-foreground">Total Runs</p>
            </Card>
            <Card className="p-3 text-center">
              <TrendingUp className="w-4 h-4 mx-auto text-primary mb-1" />
              <p className="text-lg font-bold">{entries[0]?.avg_score || 0}%</p>
              <p className="text-[10px] text-muted-foreground">Top Score</p>
            </Card>
            <Card className="p-3 text-center">
              <Zap className="w-4 h-4 mx-auto text-primary mb-1" />
              <p className="text-lg font-bold">{Math.min(...entries.map(e => e.avg_latency))}ms</p>
              <p className="text-[10px] text-muted-foreground">Fastest Avg</p>
            </Card>
          </div>

          <Tabs value={viewTab} onValueChange={setViewTab}>
            <TabsList className="h-8">
              <TabsTrigger value="ranking" className="text-xs h-6">Ranking</TabsTrigger>
              <TabsTrigger value="comparison" className="text-xs h-6">Comparison</TabsTrigger>
              {allCategories.length > 1 && (
                <TabsTrigger value="category" className="text-xs h-6">By Category</TabsTrigger>
              )}
            </TabsList>

            {/* Ranking Tab */}
            <TabsContent value="ranking" className="space-y-2 mt-3">
              {entries.map((entry, i) => (
                <Card key={entry.model} className={`p-3 ${i === 0 ? "border-yellow-500/30 bg-yellow-500/5" : ""}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8">{rankIcon(i)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{entry.model}</p>
                      <p className="text-[10px] text-muted-foreground">{entry.total_runs} runs · Avg {entry.avg_latency}ms</p>
                    </div>
                    <div className="flex items-center gap-3 text-right shrink-0">
                      <div>
                        <p className="text-xs font-bold text-primary">{entry.avg_score}%</p>
                        <p className="text-[9px] text-muted-foreground">Avg Score</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold">{entry.pass_rate}%</p>
                        <p className="text-[9px] text-muted-foreground">Pass Rate</p>
                      </div>
                    </div>
                  </div>
                  {/* Score range bar */}
                  <div className="mt-2 ml-11">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-muted-foreground w-6">{entry.worst_score}%</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden relative">
                        <div
                          className="absolute h-full rounded-full opacity-30"
                          style={{
                            left: `${entry.worst_score}%`,
                            width: `${entry.best_score - entry.worst_score}%`,
                            backgroundColor: MODEL_COLORS[i % MODEL_COLORS.length],
                          }}
                        />
                        <div
                          className="absolute h-full w-1.5 rounded-full"
                          style={{
                            left: `${entry.avg_score}%`,
                            backgroundColor: MODEL_COLORS[i % MODEL_COLORS.length],
                          }}
                        />
                      </div>
                      <span className="text-[9px] text-muted-foreground w-6">{entry.best_score}%</span>
                    </div>
                  </div>
                </Card>
              ))}
            </TabsContent>

            {/* Comparison Tab */}
            <TabsContent value="comparison" className="mt-3">
              <Card className="p-4 space-y-4">
                {/* Score Comparison */}
                <div>
                  <p className="text-xs font-semibold mb-2 flex items-center gap-1.5"><Target className="w-3 h-3" /> Average Score</p>
                  <div className="space-y-2">
                    {entries.map((entry, i) => (
                      <div key={entry.model} className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-28 truncate shrink-0">{entry.model.split("/").pop()}</span>
                        <div className="flex-1 h-4 bg-muted rounded-sm overflow-hidden">
                          <div
                            className="h-full rounded-sm flex items-center justify-end pr-1 transition-all"
                            style={{
                              width: `${entry.avg_score}%`,
                              backgroundColor: MODEL_COLORS[i % MODEL_COLORS.length],
                            }}
                          >
                            <span className="text-[9px] font-bold text-white drop-shadow-sm">{entry.avg_score}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pass Rate Comparison */}
                <div>
                  <p className="text-xs font-semibold mb-2 flex items-center gap-1.5"><Zap className="w-3 h-3" /> Pass@1 Rate</p>
                  <div className="space-y-2">
                    {entries.map((entry, i) => (
                      <div key={entry.model} className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-28 truncate shrink-0">{entry.model.split("/").pop()}</span>
                        <div className="flex-1 h-4 bg-muted rounded-sm overflow-hidden">
                          <div
                            className="h-full rounded-sm flex items-center justify-end pr-1 transition-all"
                            style={{
                              width: `${entry.pass_rate}%`,
                              backgroundColor: MODEL_COLORS[i % MODEL_COLORS.length],
                              opacity: 0.8,
                            }}
                          >
                            <span className="text-[9px] font-bold text-white drop-shadow-sm">{entry.pass_rate}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Latency Comparison */}
                <div>
                  <p className="text-xs font-semibold mb-2 flex items-center gap-1.5"><Clock className="w-3 h-3" /> Avg Latency (lower is better)</p>
                  <div className="space-y-2">
                    {entries.map((entry, i) => (
                      <div key={entry.model} className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-28 truncate shrink-0">{entry.model.split("/").pop()}</span>
                        <div className="flex-1 h-4 bg-muted rounded-sm overflow-hidden">
                          <div
                            className="h-full rounded-sm flex items-center justify-end pr-1 transition-all"
                            style={{
                              width: `${(entry.avg_latency / maxLatency) * 100}%`,
                              backgroundColor: MODEL_COLORS[i % MODEL_COLORS.length],
                              opacity: 0.6,
                            }}
                          >
                            <span className="text-[9px] font-bold text-white drop-shadow-sm">{entry.avg_latency}ms</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Category Breakdown Tab */}
            {allCategories.length > 1 && (
              <TabsContent value="category" className="mt-3">
                <Card className="p-4 space-y-4">
                  {allCategories.map((cat) => (
                    <div key={cat}>
                      <p className="text-xs font-semibold mb-2 capitalize">{cat}</p>
                      <div className="space-y-1.5">
                        {entries
                          .filter((e) => e.categories[cat])
                          .sort((a, b) => (b.categories[cat]?.avg || 0) - (a.categories[cat]?.avg || 0))
                          .map((entry, i) => (
                            <div key={entry.model} className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground w-28 truncate shrink-0">{entry.model.split("/").pop()}</span>
                              <div className="flex-1 h-3.5 bg-muted rounded-sm overflow-hidden">
                                <div
                                  className="h-full rounded-sm flex items-center justify-end pr-1"
                                  style={{
                                    width: `${entry.categories[cat].avg}%`,
                                    backgroundColor: MODEL_COLORS[entries.indexOf(entry) % MODEL_COLORS.length],
                                  }}
                                >
                                  <span className="text-[8px] font-bold text-white drop-shadow-sm">
                                    {entry.categories[cat].avg}% ({entry.categories[cat].count})
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </>
      )}
    </div>
  );
};

export default BenchmarkLeaderboard;
