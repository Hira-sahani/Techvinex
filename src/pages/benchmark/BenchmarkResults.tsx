import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SkeletonList } from "@/components/skeletons/Skeleton";

const BenchmarkResults = () => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterModel, setFilterModel] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => { fetchResults(); }, []);

  const fetchResults = async () => {
    setLoading(true);
    // Explicit column list: drops heavy `ai_response`, `attempts`, `metadata`
    // from the list view; difficulty is the only field that still needs the
    // join (task_title/category are denormalized on the row).
    const { data } = await supabase
      .from("benchmark_results")
      .select("id, model, score, max_score, pass_at_1, latency_ms, status, created_at, task_title, task_category, benchmark_tasks(difficulty)")
      .order("created_at", { ascending: false })
      .limit(50);
    setResults(data || []);
    setLoading(false);
  };

  const filtered = results.filter((r) => {
    if (filterModel !== "all" && r.model !== filterModel) return false;
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    return true;
  });

  const uniqueModels = [...new Set(results.map((r) => r.model))];

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-lg font-bold">Results</h1>
        <p className="text-xs text-muted-foreground">{results.length} total results</p>
      </div>

      <div className="flex gap-2">
        <Select value={filterModel} onValueChange={setFilterModel}>
          <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="Model" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Models</SelectItem>
            {uniqueModels.map((m) => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Status</SelectItem>
            <SelectItem value="completed" className="text-xs">Completed</SelectItem>
            <SelectItem value="pending" className="text-xs">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <SkeletonList rows={5} />
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground">No results found</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const scorePercent = (Number(r.score) / r.max_score) * 100;
            return (
              <Card key={r.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold">{r.task_title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="outline" className="text-[9px]">{r.model}</Badge>
                      <Badge variant="outline" className="text-[9px] capitalize">{r.task_category}</Badge>
                      <Badge variant={r.pass_at_1 ? "default" : "secondary"} className="text-[9px]">
                        Pass@1: {r.pass_at_1 ? "✓" : "✗"}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${scorePercent}%`, backgroundColor: scorePercent >= 70 ? "hsl(var(--primary))" : scorePercent >= 40 ? "hsl(40, 90%, 50%)" : "hsl(0, 70%, 50%)" }} />
                      </div>
                      <span className="text-xs font-bold">{Math.round(scorePercent)}%</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground">{r.latency_ms}ms · {new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BenchmarkResults;
