
-- 1. ai_security_audit
CREATE TABLE IF NOT EXISTS public.ai_security_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  job_id UUID,
  kind TEXT NOT NULL,
  event TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info','low','medium','high','critical')),
  plan_hash TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_security_audit TO authenticated;
GRANT ALL ON public.ai_security_audit TO service_role;

ALTER TABLE public.ai_security_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read ai_security_audit"
  ON public.ai_security_audit FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_ai_security_audit_user_time
  ON public.ai_security_audit (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_security_audit_sev_time
  ON public.ai_security_audit (severity, created_at DESC);

-- 2. ai_safe_actions registry
CREATE TABLE IF NOT EXISTS public.ai_safe_actions (
  name TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  param_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  required_role TEXT,
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  rate_per_minute INT NOT NULL DEFAULT 30,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_safe_actions TO authenticated;
GRANT ALL ON public.ai_safe_actions TO service_role;

ALTER TABLE public.ai_safe_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read ai_safe_actions"
  ON public.ai_safe_actions FOR SELECT TO authenticated USING (true);

INSERT INTO public.ai_safe_actions (name, description, param_schema, requires_approval, rate_per_minute) VALUES
  ('fetch_public_job',           'Fetch a public explore_jobs row by id',        '{"type":"object","properties":{"jobId":{"type":"string","format":"uuid"}},"required":["jobId"]}'::jsonb, false, 60),
  ('fetch_benchmark_task_public','Fetch public benchmark task metadata',         '{"type":"object","properties":{"taskId":{"type":"string","format":"uuid"}},"required":["taskId"]}'::jsonb, false, 60),
  ('record_interview_turn',      'Append a single interview turn to caller job', '{"type":"object","properties":{"jobId":{"type":"string","format":"uuid"},"text":{"type":"string","maxLength":8000}},"required":["jobId","text"]}'::jsonb, false, 30),
  ('flag_content_for_review',    'Flag content for human moderator review',      '{"type":"object","properties":{"reason":{"type":"string","maxLength":500},"payload":{"type":"object"}},"required":["reason"]}'::jsonb, true, 10)
ON CONFLICT (name) DO NOTHING;
