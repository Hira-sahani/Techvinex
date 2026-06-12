
CREATE TABLE IF NOT EXISTS public.ai_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('interview', 'tts', 'benchmark')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb,
  error text,
  attempts integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.ai_jobs TO authenticated;
GRANT ALL ON public.ai_jobs TO service_role;

ALTER TABLE public.ai_jobs ENABLE ROW LEVEL SECURITY;

-- Users can read only their own jobs.
CREATE POLICY "ai_jobs_select_own"
  ON public.ai_jobs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can enqueue jobs for themselves only.
CREATE POLICY "ai_jobs_insert_own"
  ON public.ai_jobs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- service_role bypasses RLS — that's what the worker uses to update status/result.

-- Hot indexes
CREATE INDEX IF NOT EXISTS idx_ai_jobs_user_created
  ON public.ai_jobs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_status_created
  ON public.ai_jobs (status, created_at DESC);

-- updated_at trigger (reuse existing helper)
DROP TRIGGER IF EXISTS trg_ai_jobs_updated_at ON public.ai_jobs;
CREATE TRIGGER trg_ai_jobs_updated_at
  BEFORE UPDATE ON public.ai_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Stream completion events to subscribers (per-user channel multiplexed by app bus).
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_jobs;
