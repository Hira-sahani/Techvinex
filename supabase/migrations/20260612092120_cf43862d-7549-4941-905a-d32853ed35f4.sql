CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON public.audit_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created ON public.audit_logs (action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_applications_user ON public.job_applications (user_id);
CREATE INDEX IF NOT EXISTS idx_job_bookmarks_user ON public.job_bookmarks (user_id);
CREATE INDEX IF NOT EXISTS idx_saved_roles_user ON public.saved_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_benchmark_results_task ON public.benchmark_results (task_id);
CREATE INDEX IF NOT EXISTS idx_benchmark_results_user_created ON public.benchmark_results (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_benchmark_reviews_result ON public.benchmark_reviews (result_id);
CREATE INDEX IF NOT EXISTS idx_employer_candidates_employer ON public.employer_candidates (employer_id);
CREATE INDEX IF NOT EXISTS idx_employer_candidates_job ON public.employer_candidates (job_id);
CREATE INDEX IF NOT EXISTS idx_employer_interviews_employer ON public.employer_interviews (employer_id);
CREATE INDEX IF NOT EXISTS idx_employer_jobs_employer ON public.employer_jobs (employer_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_applications_user ON public.applications (user_id);
CREATE INDEX IF NOT EXISTS idx_blogs_published_created ON public.blogs (created_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_expires ON public.rate_limit_buckets (expires_at);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires ON public.idempotency_keys (expires_at);

CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_buckets()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n integer;
BEGIN
  WITH deleted AS (
    DELETE FROM public.rate_limit_buckets WHERE expires_at < now() - interval '1 hour' RETURNING 1
  ) SELECT count(*) INTO n FROM deleted;
  WITH d2 AS (
    DELETE FROM public.idempotency_keys WHERE expires_at IS NOT NULL AND expires_at < now() RETURNING 1
  ) SELECT n + count(*) INTO n FROM d2;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_expired_rate_buckets() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_rate_buckets() TO service_role;