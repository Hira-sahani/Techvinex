-- P0 Security Fixes (additive, idempotent)
-- Project ref: xfgyzcvrvgsntjenxecp

-- =========================================================
-- A. Restrict has_role() EXECUTE to authenticated + service_role
-- =========================================================
-- Anon cannot be admin; revoking anon EXECUTE prevents role enumeration.
-- Retarget the 10 admin policies currently role={public} to {authenticated}
-- so anon queries do not hit the has_role function during policy evaluation.

ALTER POLICY "Admins can insert audit logs"     ON public.audit_logs      TO authenticated;
ALTER POLICY "Admins can view audit logs"       ON public.audit_logs      TO authenticated;
ALTER POLICY "Admins can manage blogs"          ON public.blogs           TO authenticated;
ALTER POLICY "Admins can manage feature flags"  ON public.feature_flags   TO authenticated;
ALTER POLICY "Feature flags viewable by admins" ON public.feature_flags   TO authenticated;
ALTER POLICY "Admins can view analytics"        ON public.job_analytics   TO authenticated;
ALTER POLICY "Admins can manage stats"          ON public.platform_stats  TO authenticated;
ALTER POLICY "Admins can manage roles"          ON public.roles           TO authenticated;
ALTER POLICY "Admins can manage roles"          ON public.user_roles      TO authenticated;

-- Now safe to revoke anon EXECUTE on has_role.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

-- =========================================================
-- B. Fix applicants overlapping INSERT policies
-- =========================================================
-- The permissive "Anyone can submit an application" policy has no
-- email_verified=false check and no user_id IS NULL check for anon.
-- Because permissive policies are OR'd, this lets an anon insert with
-- email_verified=true, bypassing verification. Drop it. The remaining
-- two strict INSERT policies preserve public + authenticated submission.
DROP POLICY IF EXISTS "Anyone can submit an application" ON public.applicants;

-- =========================================================
-- C. Consolidate explore_jobs admin policies
-- =========================================================
-- The {public} ALL policy overlaps the {authenticated} SELECT admin policy
-- and needlessly widens the role scope. Retarget it to {authenticated}.
-- Public read for published+public jobs remains via the anon+authenticated
-- SELECT policy (unchanged).
ALTER POLICY "Admins can manage explore jobs" ON public.explore_jobs TO authenticated;
-- The separate admin SELECT policy is now redundant with the ALL policy above.
DROP POLICY IF EXISTS "Admins can view all explore jobs" ON public.explore_jobs;