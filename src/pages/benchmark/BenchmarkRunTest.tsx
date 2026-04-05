import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

const models = [
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
];

const BenchmarkRunTest = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState("");
  const [selectedModel, setSelectedModel] = useState("gpt-4o");
  const [retryCount, setRetryCount] = useState(1);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    supabase
      .from("benchmark_tasks")
      .select("id, title, category, difficulty")
      .eq("is_active", true)
      .order("title")
      .then(({ data }) => setTasks(data || []));
  }, []);

  const runBenchmark = async () => {
    if (!selectedTask) { toast.error("Select a task"); return; }
    setRunning(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("openai-benchmark", {
        body: {
          task_id: selectedTask,
          model: selectedModel,
          retry_count: retryCount,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult(data);
      toast.success("Benchmark completed!");
    } catch (e: any) {
      toast.error(e.message || "Benchmark failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-lg font-bold">Run Benchmark Test</h1>
        <p className="text-xs text-muted-foreground">Execute AI model evaluation on selected task</p>
      </div>

      <Card className="p-4 space-y-4">
        <div>
          <Label className="text-xs">Select Task</Label>
          <Select value={selectedTask} onValueChange={setSelectedTask}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Choose a task..." /></SelectTrigger>
            <SelectContent>
              {tasks.map((t) => (
                <SelectItem key={t.id} value={t.id} className="text-xs">
                  {t.title} ({t.category} · {t.difficulty})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Model</Label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Retry Count (Pass@N)</Label>
            <Input type="number" min={1} max={5} value={retryCount} onChange={(e) => setRetryCount(Number(e.target.value))} className="h-8 text-xs" />
          </div>
        </div>

        <Button onClick={runBenchmark} disabled={running || !selectedTask} className="w-full text-xs">
          {running ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Running...</> : <><FlaskConical className="w-3 h-3 mr-1" /> Run Benchmark</>}
        </Button>
      </Card>

      {result && (
        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-semibold">Results</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center p-2 bg-muted/30 rounded-md">
              <p className="text-[10px] text-muted-foreground">Score</p>
              <p className="text-lg font-bold">{Math.round(Number(result.result.score))}<span className="text-xs text-muted-foreground">/{result.result.max_score}</span></p>
            </div>
            <div className="text-center p-2 bg-muted/30 rounded-md">
              <p className="text-[10px] text-muted-foreground">Latency</p>
              <p className="text-lg font-bold">{result.result.latency_ms}<span className="text-xs text-muted-foreground">ms</span></p>
            </div>
            <div className="text-center p-2 bg-muted/30 rounded-md">
              <p className="text-[10px] text-muted-foreground">Pass@1</p>
              {result.result.pass_at_1 ? <CheckCircle className="w-5 h-5 mx-auto text-green-500" /> : <XCircle className="w-5 h-5 mx-auto text-red-500" />}
            </div>
            <div className="text-center p-2 bg-muted/30 rounded-md">
              <p className="text-[10px] text-muted-foreground">Pass@N</p>
              {result.result.pass_at_n ? <CheckCircle className="w-5 h-5 mx-auto text-green-500" /> : <XCircle className="w-5 h-5 mx-auto text-red-500" />}
            </div>
          </div>

          {result.attempts?.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold mb-2">Attempts</h3>
              {result.attempts.map((a: any, i: number) => (
                <div key={i} className="p-2 border border-border rounded-md mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline" className="text-[9px]">Attempt {a.attempt}</Badge>
                    <span className="text-[10px] text-muted-foreground">Score: {Math.round(a.score)} · {a.latency_ms}ms</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground whitespace-pre-wrap line-clamp-4">{a.response}</p>
                </div>
              ))}
            </div>
          )}

          <div>
            <h3 className="text-xs font-semibold mb-1">AI Response</h3>
            <div className="p-3 bg-muted/30 rounded-md">
              <p className="text-xs whitespace-pre-wrap">{result.result.ai_response}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default BenchmarkRunTest;
