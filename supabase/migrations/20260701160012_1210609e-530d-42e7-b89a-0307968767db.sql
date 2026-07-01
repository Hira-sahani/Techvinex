
CREATE TABLE IF NOT EXISTS public.ai_usage_quota (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  period_start DATE NOT NULL DEFAULT CURRENT_DATE,
  used_count INTEGER NOT NULL DEFAULT 0,
  used_tokens BIGINT NOT NULL DEFAULT 0,
  daily_limit INTEGER NOT NULL DEFAULT 200,
  monthly_limit INTEGER NOT NULL DEFAULT 3000,
  blocked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, period_start)
);

GRANT SELECT ON public.ai_usage_quota TO authenticated;
GRANT ALL ON public.ai_usage_quota TO service_role;
ALTER TABLE public.ai_usage_quota ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own quota" ON public.ai_usage_quota
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins read all quota" ON public.ai_usage_quota
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.ai_quota_hit(_user_id uuid, _kind text, _tokens int DEFAULT 0)
RETURNS TABLE(allowed boolean, used_count integer, daily_limit integer, blocked_until timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _row public.ai_usage_quota;
BEGIN
  INSERT INTO public.ai_usage_quota(user_id, kind, period_start, used_count, used_tokens)
  VALUES (_user_id, _kind, CURRENT_DATE, 1, GREATEST(_tokens,0))
  ON CONFLICT (user_id, kind, period_start) DO UPDATE
    SET used_count = public.ai_usage_quota.used_count + 1,
        used_tokens = public.ai_usage_quota.used_tokens + GREATEST(_tokens,0),
        updated_at = now()
  RETURNING * INTO _row;
  allowed := (_row.blocked_until IS NULL OR _row.blocked_until <= now())
             AND _row.used_count <= _row.daily_limit;
  used_count := _row.used_count;
  daily_limit := _row.daily_limit;
  blocked_until := _row.blocked_until;
  RETURN NEXT;
END $$;

REVOKE ALL ON FUNCTION public.ai_quota_hit(uuid, text, int) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_quota_hit(uuid, text, int) TO service_role;
