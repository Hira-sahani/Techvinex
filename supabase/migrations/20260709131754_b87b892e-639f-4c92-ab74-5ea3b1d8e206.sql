-- Restore missing table-level grants on public.explore_jobs.
-- RLS still enforces WHO can see WHICH rows; these grants let PostgREST reach the table at all.
GRANT SELECT ON public.explore_jobs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.explore_jobs TO authenticated;
GRANT ALL ON public.explore_jobs TO service_role;

-- Keep internal_notes private to admins (read via admin_get_explore_job_internal_notes RPC).
REVOKE SELECT (internal_notes) ON public.explore_jobs FROM anon, authenticated;