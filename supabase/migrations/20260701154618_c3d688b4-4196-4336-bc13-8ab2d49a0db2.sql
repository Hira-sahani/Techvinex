
CREATE TABLE IF NOT EXISTS public.ai_approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid,
  action text NOT NULL,
  risk text NOT NULL CHECK (risk IN ('low','medium','high','critical')),
  reason text NOT NULL,
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  plan_hash text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','expired','executed')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by uuid,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);
GRANT SELECT, INSERT, UPDATE ON public.ai_approval_requests TO authenticated;
GRANT ALL ON public.ai_approval_requests TO service_role;
ALTER TABLE public.ai_approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own approvals read" ON public.ai_approval_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins decide" ON public.ai_approval_requests
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_ai_approval_status ON public.ai_approval_requests(status, requested_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_session_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid,
  scope text NOT NULL DEFAULT 'session',
  classification text NOT NULL DEFAULT 'internal' CHECK (classification IN ('public','internal','confidential','secret')),
  content jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);
GRANT SELECT, INSERT, DELETE ON public.ai_session_memory TO authenticated;
GRANT ALL ON public.ai_session_memory TO service_role;
ALTER TABLE public.ai_session_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own session memory" ON public.ai_session_memory
  FOR ALL TO authenticated
  USING (auth.uid() = user_id AND classification <> 'secret')
  WITH CHECK (auth.uid() = user_id AND classification <> 'secret');

CREATE INDEX IF NOT EXISTS idx_ai_session_memory_lookup
  ON public.ai_session_memory(user_id, session_id, created_at DESC);
