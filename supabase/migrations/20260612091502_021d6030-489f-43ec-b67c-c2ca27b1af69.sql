-- CV-2 patch: Tighten public.applicants RLS to block anon spam-flood and
-- prevent anonymous UPDATEs. Add server-side field validation in WITH CHECK.

-- 1. Revoke the over-broad UPDATE grant from anonymous callers.
REVOKE UPDATE ON public.applicants FROM anon;

-- 2. Replace the wide-open INSERT policy.
DROP POLICY IF EXISTS "Anyone can create an applicant" ON public.applicants;

-- 2a. Anon can only insert *unverified* rows with no user_id and validated fields.
CREATE POLICY "Anon can create unverified applicant"
  ON public.applicants
  FOR INSERT TO anon
  WITH CHECK (
    user_id IS NULL
    AND email_verified = false
    AND char_length(full_name) BETWEEN 2 AND 120
    AND char_length(email)     BETWEEN 5 AND 254
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND (linkedin_url IS NULL OR linkedin_url ~* '^https://([a-z0-9-]+\.)?linkedin\.com/.+')
  );

-- 2b. Authenticated users can only insert rows tied to themselves.
CREATE POLICY "Authenticated can create own applicant"
  ON public.applicants
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND char_length(full_name) BETWEEN 2 AND 120
    AND char_length(email)     BETWEEN 5 AND 254
  );

-- 3. UPDATE policy: tighten so anon cannot reach it at all (grant revoked above)
--    and authenticated users can only modify their own rows AND cannot flip
--    `email_verified` to true client-side.
DROP POLICY IF EXISTS "Users can update their own applicant rows" ON public.applicants;
CREATE POLICY "Users can update their own applicant rows"
  ON public.applicants
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND email_verified = false);

-- 4. CV-3 / linter: Lock down has_role so signed-in users cannot enumerate
--    other users' admin status. RLS policies that call has_role keep working
--    because the function is SECURITY DEFINER and runs as its owner.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

-- 5. Helpful index for the new applicant lookups by email (already present in
--    a prior migration as idx_applicants_email — guard with IF NOT EXISTS).
CREATE INDEX IF NOT EXISTS idx_applicants_email_lower ON public.applicants (lower(email));