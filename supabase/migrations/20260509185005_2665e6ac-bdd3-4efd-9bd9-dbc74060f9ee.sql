
CREATE TABLE public.rate_limit_buckets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bucket_key TEXT NOT NULL UNIQUE,
  count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_rl_buckets_expires ON public.rate_limit_buckets(expires_at);
ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read rate buckets"
ON public.rate_limit_buckets FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.rate_limit_hit(_key TEXT, _window_ms INTEGER)
RETURNS TABLE(current_count INTEGER, reset_ms INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _now TIMESTAMPTZ := now();
  _exp TIMESTAMPTZ;
  _row public.rate_limit_buckets;
BEGIN
  _exp := _now + make_interval(secs => _window_ms / 1000.0);

  INSERT INTO public.rate_limit_buckets(bucket_key, count, window_start, expires_at)
  VALUES (_key, 1, _now, _exp)
  ON CONFLICT (bucket_key) DO UPDATE
    SET count = CASE
        WHEN public.rate_limit_buckets.expires_at <= _now THEN 1
        ELSE public.rate_limit_buckets.count + 1
      END,
      window_start = CASE
        WHEN public.rate_limit_buckets.expires_at <= _now THEN _now
        ELSE public.rate_limit_buckets.window_start
      END,
      expires_at = CASE
        WHEN public.rate_limit_buckets.expires_at <= _now THEN _exp
        ELSE public.rate_limit_buckets.expires_at
      END
  RETURNING * INTO _row;

  current_count := _row.count;
  reset_ms := GREATEST(0, EXTRACT(EPOCH FROM (_row.expires_at - _now))::INTEGER * 1000);
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rate_limit_hit(TEXT, INTEGER) FROM anon, authenticated;
