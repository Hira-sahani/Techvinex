import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface BenchmarkTask {
  id: string;
  title: string;
  prompt: string;
  system_prompt: string | null;
  category: string;
  difficulty: string;
  rubric: any[];
  expected_output: string | null;
  input_type: string;
  max_score: number;
  is_active: boolean;
  tags: string[];
  created_at: string;
}

const categories = ["hiring", "finance", "reasoning", "coding", "general"];
const difficulties = ["easy", "medium", "hard", "expert"];

const BenchmarkTasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<BenchmarkTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BenchmarkTask | null>(null);
  const [form, setForm] = useState({
    title: "",
    prompt: "",
    system_prompt: "",
    category: "general",
    difficulty: "medium",
    expected_output: "",
    input_type: "text",
    max_score: 100,
    rubric_text: "",
    tags: "",
  });

  useEffect(() => { fetchTasks(); }, []);

  const fetchTasks = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("benchmark_tasks")
      .select("*")
      .order("created_at", { ascending: false });
    setTasks((data as any[]) || []);
    setLoading(false);
  };

  const resetForm = () => {
    setForm({ title: "", prompt: "", system_prompt: "", category: "general", difficulty: "medium", expected_output: "", input_type: "text", max_score: 100, rubric_text: "", tags: "" });
    setEditing(null);
  };

  const handleEdit = (task: BenchmarkTask) => {
    setEditing(task);
    setForm({
      title: task.title,
      prompt: task.prompt,
      system_prompt: task.system_prompt || "",
      category: task.category,
      difficulty: task.difficulty,
      expected_output: task.expected_output || "",
      input_type: task.input_type,
      max_score: task.max_score,
      rubric_text: Array.isArray(task.rubric) ? task.rubric.map((r: any) => `${r.criterion}:${r.weight || 1}`).join("\n") : "",
      tags: (task.tags || []).join(", "),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.prompt) { toast.error("Title and prompt required"); return; }

    const rubric = form.rubric_text
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [criterion, weight] = line.split(":");
        return { criterion: criterion.trim(), weight: Number(weight) || 1 };
      });

    const payload = {
      title: form.title,
      prompt: form.prompt,
      system_prompt: form.system_prompt || null,
      category: form.category,
      difficulty: form.difficulty,
      expected_output: form.expected_output || null,
      input_type: form.input_type,
      max_score: form.max_score,
      rubric,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      created_by: user?.id,
    };

    if (editing) {
      const { error } = await supabase.from("benchmark_tasks").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Task updated");
    } else {
      const { error } = await supabase.from("benchmark_tasks").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Task created");
    }

    setDialogOpen(false);
    resetForm();
    fetchTasks();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("benchmark_tasks").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Task deleted");
    fetchTasks();
  };

  const difficultyColor: Record<string, string> = {
    easy: "bg-green-500/10 text-green-600",
    medium: "bg-yellow-500/10 text-yellow-600",
    hard: "bg-orange-500/10 text-orange-600",
    expert: "bg-red-500/10 text-red-600",
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Benchmark Tasks</h1>
          <p className="text-xs text-muted-foreground">{tasks.length} tasks</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="text-xs"><Plus className="w-3 h-3 mr-1" /> Add Task</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-sm">{editing ? "Edit Task" : "Create Task"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="text-xs h-8" />
              </div>
              <div>
                <Label className="text-xs">Prompt</Label>
                <Textarea value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} className="text-xs min-h-[80px]" />
              </div>
              <div>
                <Label className="text-xs">System Prompt (hidden)</Label>
                <Textarea value={form.system_prompt} onChange={(e) => setForm({ ...form, system_prompt: e.target.value })} className="text-xs min-h-[60px]" placeholder="Optional role-based system prompt" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => <SelectItem key={c} value={c} className="text-xs capitalize">{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Difficulty</Label>
                  <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {difficulties.map((d) => <SelectItem key={d} value={d} className="text-xs capitalize">{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Expected Output</Label>
                <Textarea value={form.expected_output} onChange={(e) => setForm({ ...form, expected_output: e.target.value })} className="text-xs min-h-[60px]" placeholder="What the ideal response looks like" />
              </div>
              <div>
                <Label className="text-xs">Rubric (one per line: criterion:weight)</Label>
                <Textarea value={form.rubric_text} onChange={(e) => setForm({ ...form, rubric_text: e.target.value })} className="text-xs min-h-[60px]" placeholder="Accuracy:3&#10;Completeness:2&#10;Clarity:1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Max Score</Label>
                  <Input type="number" value={form.max_score} onChange={(e) => setForm({ ...form, max_score: Number(e.target.value) })} className="text-xs h-8" />
                </div>
                <div>
                  <Label className="text-xs">Input Type</Label>
                  <Select value={form.input_type} onValueChange={(v) => setForm({ ...form, input_type: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text" className="text-xs">Text</SelectItem>
                      <SelectItem value="pdf" className="text-xs">PDF</SelectItem>
                      <SelectItem value="csv" className="text-xs">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Tags (comma separated)</Label>
                <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="text-xs h-8" placeholder="logic, math, coding" />
              </div>
              <Button onClick={handleSave} size="sm" className="w-full text-xs">{editing ? "Update" : "Create"} Task</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading...</p>
      ) : tasks.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground">No tasks yet. Create your first benchmark task!</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <Card key={task.id} className="p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xs font-semibold">{task.title}</h3>
                    <Badge variant="outline" className={`text-[9px] ${difficultyColor[task.difficulty]}`}>
                      {task.difficulty}
                    </Badge>
                    <Badge variant="outline" className="text-[9px] capitalize">{task.category}</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">{task.prompt}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] text-muted-foreground">Max: {task.max_score}</span>
                    <span className="text-[9px] text-muted-foreground">·</span>
                    <span className="text-[9px] text-muted-foreground capitalize">{task.input_type}</span>
                    {(task.tags || []).map((t) => (
                      <Badge key={t} variant="secondary" className="text-[8px] px-1 py-0">{t}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEdit(task)}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDelete(task.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default BenchmarkTasks;
