/**
 * Submit an async AI job and observe its status.
 *
 * The client calls `enqueue-ai-job` which returns `{ jobId }` in <50 ms
 * (the upstream model call happens in a separate Edge Function via
 * fire-and-forget). The hook then:
 *
 *   1. Subscribes to the user's ai_jobs row via the shared Realtime bus
 *      (zero extra channel — multiplexed onto the existing user channel).
 *   2. Falls back to a 1.5 s poll on `get-ai-job-status` if Realtime is
 *      throttled or the page just regained focus.
 *   3. Resolves a React Query cache entry as soon as status is terminal.
 */
import { useEffect, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeRealtime } from "@/lib/realtimeBus";
import { sanitizeAiJson } from "@/lib/aiSecurity";

export type AiJobKind = "interview" | "tts" | "benchmark";
export type AiJobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export interface AiJob {
  id: string;
  kind: AiJobKind;
  status: AiJobStatus;
  result: unknown;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

export function useEnqueueAiJob() {
  return useMutation({
    mutationFn: async (payload: { kind: AiJobKind; input: Record<string, unknown> }) => {
      const { data, error } = await supabase.functions.invoke<{ jobId: string; status: AiJobStatus }>(
        "enqueue-ai-job",
        { body: payload },
      );
      if (error) throw error;
      if (!data?.jobId) throw new Error("no_job_id");
      return data;
    },
  });
}

export function useAiJob(jobId: string | null | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [push, setPush] = useState(0);

  // Subscribe to push updates on the user-scope channel (already open).
  useEffect(() => {
    if (!user || !jobId) return;
    return subscribeRealtime({
      table: "ai_jobs",
      scope: "user",
      filter: `user_id=eq.${user.id}`,
      handler: (payload) => {
        const row = payload.new as { id?: string } | null;
        if (row?.id === jobId) {
          // Bump the polling key so React Query refetches immediately.
          setPush((n) => n + 1);
          queryClient.invalidateQueries({ queryKey: ["ai-job", jobId] });
        }
      },
    });
  }, [user, jobId, queryClient]);

  return useQuery({
    queryKey: ["ai-job", jobId, push],
    queryFn: async (): Promise<AiJob | null> => {
      if (!jobId) return null;
      const { data, error } = await supabase.functions.invoke<AiJob>(
        "get-ai-job-status",
        { body: { jobId } },
      );
      if (error) throw error;
      // Defense-in-depth: strip secrets / tool-call blocks from anything the
      // model produced before it can reach a render surface.
      return data ? sanitizeAiJson(data) : null;
    },
    enabled: !!jobId,
    // Poll only while pending — terminal statuses stop polling.
    refetchInterval: (q) => {
      const s = (q.state.data as AiJob | null)?.status;
      if (s === "completed" || s === "failed" || s === "cancelled") return false;
      return 1500;
    },
    staleTime: 0,
  });
}

/**
 * Convenience: submit + observe in one call.
 */
export function useRunAiJob() {
  const [jobId, setJobId] = useState<string | null>(null);
  const enqueue = useEnqueueAiJob();
  const job = useAiJob(jobId);

  const run = useCallback(async (payload: { kind: AiJobKind; input: Record<string, unknown> }) => {
    const { jobId: id } = await enqueue.mutateAsync(payload);
    setJobId(id);
    return id;
  }, [enqueue]);

  const reset = useCallback(() => setJobId(null), []);

  return {
    run,
    reset,
    isEnqueuing: enqueue.isPending,
    job: job.data ?? null,
    isProcessing: job.data?.status === "queued" || job.data?.status === "running",
    isComplete: job.data?.status === "completed",
    isFailed: job.data?.status === "failed",
    error: enqueue.error ?? (job.data?.error ? new Error(job.data.error) : null),
  };
}
