
-- Admin 2FA sessions
CREATE TABLE public.admin_2fa_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_2fa_sessions TO service_role;
ALTER TABLE public.admin_2fa_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role only sessions" ON public.admin_2fa_sessions FOR ALL USING (false) WITH CHECK (false);
CREATE INDEX idx_admin_2fa_sessions_user ON public.admin_2fa_sessions(user_id);
CREATE INDEX idx_admin_2fa_sessions_expires ON public.admin_2fa_sessions(expires_at);

-- Admin 2FA attempts audit log
CREATE TABLE public.admin_2fa_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.admin_2fa_sessions(id) ON DELETE SET NULL,
  user_id UUID,
  email TEXT,
  event TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  ip TEXT,
  user_agent TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_2fa_attempts TO service_role;
GRANT SELECT ON public.admin_2fa_attempts TO authenticated;
ALTER TABLE public.admin_2fa_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins can read 2fa attempts" ON public.admin_2fa_attempts FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_admin_2fa_attempts_user ON public.admin_2fa_attempts(user_id);
CREATE INDEX idx_admin_2fa_attempts_created ON public.admin_2fa_attempts(created_at DESC);

CREATE TRIGGER trg_admin_2fa_sessions_updated
BEFORE UPDATE ON public.admin_2fa_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
