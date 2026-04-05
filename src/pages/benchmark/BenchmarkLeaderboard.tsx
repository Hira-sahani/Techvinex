import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Medal } from "lucide-react";

interface LeaderboardEntry {
  model: string;
  avg_score: number;
  total_runs: number;
  pass_rate: number;
  avg_latency: number;
}

const BenchmarkLeaderboard = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("all");
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => { fetchResults(); }, []);

  const fetchResults = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("benchmark_results")
      .select("model, score, max_score, pass_at_1, latency_ms, status, benchmark_tasks(category)")
      .eq("status", "completed");
    setResults(data || []);
    computeLeaderboard(data || [], filterCategory);
    setLoading(false);
  };

  useEffect(() => {
    computeLeaderboard(results, filterCategory);
  }, [filterCategory]);

  const computeLeaderboard = (data: any[], category: string) => {
    const filtered = category === "all" ? data : data.filter((r) => (r.benchmark_tasks as any)?.category === category);
    const byModel: Record<string, { scores: number[]; pass: number; latencies: number[] }> = {};

    filtered.forEach((r) => {
      if (!byModel[r.model]) byModel[r.model] = { scores: [], pass: 0, latencies: [] };
      byModel[r.model].scores.push((Number(r.score) / r.max_score) * 100);
      if (r.pass_at_1) byModel[r.model].pass++;
      byModel[r.model].latencies.push(r.latency_ms || 0);
    });

    const board: LeaderboardEntry[] = Object.entries(byModel).map(([model, data]) => ({
      model,
      avg_score: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
      total_runs: data.scores.length,
      pass_rate: Math.round((data.pass / data.scores.length) * 100),
      avg_latency: Math.round(data.latencies.reduce((a, b) => a + b, 0) / data.latencies.length),
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

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
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
        <p className="text-xs text-muted-foreground">Loading...</p>
      ) : entries.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground">No benchmark data yet. Run some tests first!</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => (
            <Card key={entry.model} className={`p-3 ${i === 0 ? "border-yellow-500/30 bg-yellow-500/5" : ""}`}>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8">{rankIcon(i)}</div>
                <div className="flex-1">
                  <p className="text-xs font-bold">{entry.model}</p>
                  <p className="text-[10px] text-muted-foreground">{entry.total_runs} runs · Avg {entry.avg_latency}ms</p>
                </div>
                <div className="flex items-center gap-3 text-right">
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
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default BenchmarkLeaderboard;
