-- 1. Extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Extend cleanup to also handle stuck AI jobs
CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_buckets()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE n integer := 0; m integer;
BEGIN
  WITH deleted AS (
    DELETE FROM public.rate_limit_buckets WHERE expires_at < now() - interval '1 hour' RETURNING 1
  ) SELECT count(*) INTO m FROM deleted;
  n := n + m;

  WITH d2 AS (
    DELETE FROM public.idempotency_keys WHERE expires_at IS NOT NULL AND expires_at < now() RETURNING 1
  ) SELECT count(*) INTO m FROM d2;
  n := n + m;

  -- Fail stuck jobs that have been "running" for more than 30 minutes.
  WITH d3 AS (
    UPDATE public.ai_jobs
       SET status = 'failed',
           error = COALESCE(error, 'stuck_timeout'),
           completed_at = now(),
           updated_at = now()
     WHERE status = 'running'
       AND started_at IS NOT NULL
       AND started_at < now() - interval '30 minutes'
     RETURNING 1
  ) SELECT count(*) INTO m FROM d3;
  n := n + m;

  RETURN n;
END;
$function$;

-- 3. Schedule every 15 minutes (idempotent: unschedule if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-buckets') THEN
    PERFORM cron.unschedule('cleanup-expired-buckets');
  END IF;
  PERFORM cron.schedule(
    'cleanup-expired-buckets',
    '*/15 * * * *',
    $CRON$ SELECT public.cleanup_expired_rate_buckets(); $CRON$
  );
END $$;

-- 4. Least-privilege: revoke authenticated EXECUTE on admin-only DEFINER helpers.
--    They will be invoked exclusively through service-role edge functions after this batch.
--    `has_role` is intentionally left callable by authenticated users (SECURITY policies rely on it).
REVOKE EXECUTE ON FUNCTION public.admin_get_explore_job_internal_notes(uuid) FROM authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_benchmark_task_secret(uuid)             FROM authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_scan_reviewed(uuid, text)              FROM authenticated, PUBLIC;
