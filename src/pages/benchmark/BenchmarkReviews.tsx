import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Eye } from "lucide-react";
import { toast } from "sonner";
import { SkeletonList } from "@/components/skeletons/Skeleton";

const BenchmarkReviews = () => {
  const { user } = useAuth();
  const [results, setResults] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [overrideScore, setOverrideScore] = useState("");
  const [comments, setComments] = useState("");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    // Only select non-secret task columns; expected_output is loaded per-row via RPC.
    const [resultsRes, reviewsRes] = await Promise.all([
      supabase.from("benchmark_results").select("*, benchmark_tasks(title, category, prompt)").order("created_at", { ascending: false }).limit(50),
      supabase.from("benchmark_reviews").select("*").order("created_at", { ascending: false }),
    ]);
    setResults(resultsRes.data || []);
    setReviews(reviewsRes.data || []);
    setLoading(false);
  };

  const openReview = async (result: any) => {
    setSelected(result);
    // Reviewer/admin: fetch the answer key via guarded edge function.
    const { data: secretRes } = await supabase.functions.invoke(
      "benchmark-task-secret",
      { body: { task_id: result.task_id } },
    );
    const secret = secretRes?.task;
    if (secret && (secret as any).expected_output && result.benchmark_tasks) {
      (result.benchmark_tasks as any).expected_output = (secret as any).expected_output;
    }
    const existing = reviews.find((r) => r.result_id === result.id);
    setOverrideScore(existing?.override_score?.toString() || "");
    setComments(existing?.comments || "");
    setReviewDialog(true);
  };

  const saveReview = async (status: "approved" | "rejected") => {
    if (!selected || !user) return;
    const existing = reviews.find((r) => r.result_id === selected.id);
    const payload = {
      result_id: selected.id,
      reviewer_id: user.id,
      override_score: overrideScore ? Number(overrideScore) : null,
      comments,
      status,
    };

    if (existing) {
      const { error } = await supabase.from("benchmark_reviews").update(payload).eq("id", existing.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("benchmark_reviews").insert(payload);
      if (error) { toast.error(error.message); return; }
    }

    toast.success(`Review ${status}`);
    setReviewDialog(false);
    fetchData();
  };

  const getReviewStatus = (resultId: string) => {
    const review = reviews.find((r) => r.result_id === resultId);
    return review?.status || null;
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-lg font-bold">Expert Reviews</h1>
        <p className="text-xs text-muted-foreground">Review and override AI scores</p>
      </div>

      {loading ? (
        <SkeletonList rows={5} />
      ) : results.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground">No results to review</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {results.map((r) => {
            const status = getReviewStatus(r.id);
            return (
              <Card key={r.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold">{(r.benchmark_tasks as any)?.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="outline" className="text-[9px]">{r.model}</Badge>
                      <span className="text-[10px] text-muted-foreground">Score: {Math.round(Number(r.score))}/{r.max_score}</span>
                      {status && (
                        <Badge variant={status === "approved" ? "default" : "destructive"} className="text-[9px]">
                          {status === "approved" ? <CheckCircle className="w-2.5 h-2.5 mr-0.5" /> : <XCircle className="w-2.5 h-2.5 mr-0.5" />}
                          {status}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="text-[10px] h-7" onClick={() => openReview(r)}>
                    <Eye className="w-3 h-3 mr-1" /> Review
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">Review Result</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div>
                <Label className="text-[10px] text-muted-foreground">Task</Label>
                <p className="text-xs font-medium">{(selected.benchmark_tasks as any)?.title}</p>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Prompt</Label>
                <p className="text-[10px] bg-muted/30 p-2 rounded">{(selected.benchmark_tasks as any)?.prompt}</p>
              </div>
              {(selected.benchmark_tasks as any)?.expected_output && (
                <div>
                  <Label className="text-[10px] text-muted-foreground">Expected Output</Label>
                  <p className="text-[10px] bg-muted/30 p-2 rounded">{(selected.benchmark_tasks as any)?.expected_output}</p>
                </div>
              )}
              <div>
                <Label className="text-[10px] text-muted-foreground">AI Response ({selected.model})</Label>
                <p className="text-[10px] bg-muted/30 p-2 rounded whitespace-pre-wrap max-h-40 overflow-y-auto">{selected.ai_response}</p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span>Auto Score: <strong>{Math.round(Number(selected.score))}/{selected.max_score}</strong></span>
                <span>·</span>
                <span>Latency: {selected.latency_ms}ms</span>
              </div>
              <div>
                <Label className="text-xs">Override Score</Label>
                <Input type="number" value={overrideScore} onChange={(e) => setOverrideScore(e.target.value)} className="h-8 text-xs" placeholder={`Max: ${selected.max_score}`} />
              </div>
              <div>
                <Label className="text-xs">Comments</Label>
                <Textarea value={comments} onChange={(e) => setComments(e.target.value)} className="text-xs min-h-[60px]" placeholder="Review notes..." />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => saveReview("approved")} size="sm" className="flex-1 text-xs bg-green-600 hover:bg-green-700">
                  <CheckCircle className="w-3 h-3 mr-1" /> Approve
                </Button>
                <Button onClick={() => saveReview("rejected")} size="sm" variant="destructive" className="flex-1 text-xs">
                  <XCircle className="w-3 h-3 mr-1" /> Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BenchmarkReviews;
