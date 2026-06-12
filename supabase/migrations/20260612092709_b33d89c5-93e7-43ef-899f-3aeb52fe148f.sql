DROP POLICY IF EXISTS "Jobs viewable by everyone" ON public.explore_jobs;

CREATE POLICY "Public can view published public jobs"
  ON public.explore_jobs FOR SELECT TO anon, authenticated
  USING (status = 'published' AND visibility = 'public');

CREATE POLICY "Admins can view all explore jobs"
  ON public.explore_jobs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

REVOKE SELECT ON public.explore_jobs FROM anon, authenticated;
GRANT SELECT (
  id, source_requirement_id, title, short_description, description, skills,
  experience, budget, job_type, location, company_name, show_company, show_salary,
  urgency, tags, compliance_info, visibility, geo_targeting, skill_targeting,
  featured, status, slug, meta_title, meta_description, allow_direct_apply,
  auto_match_only, application_limit, expiry_date, views_count, clicks_count,
  applications_count, created_by, created_at, updated_at
) ON public.explore_jobs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.explore_jobs TO authenticated;
GRANT ALL ON public.explore_jobs TO service_role;

CREATE OR REPLACE FUNCTION public.admin_get_explore_job_internal_notes(_job_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _notes text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  SELECT internal_notes INTO _notes FROM public.explore_jobs WHERE id = _job_id;
  RETURN _notes;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_get_explore_job_internal_notes(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_explore_job_internal_notes(uuid) TO authenticated;

-- ---- benchmark_tasks ----
REVOKE SELECT ON public.benchmark_tasks FROM anon, authenticated;
GRANT SELECT (
  id, title, prompt, category, difficulty, input_type, input_data, max_score,
  is_active, tags, created_by, created_at, updated_at
) ON public.benchmark_tasks TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.benchmark_tasks TO authenticated;
GRANT ALL ON public.benchmark_tasks TO service_role;

CREATE OR REPLACE FUNCTION public.get_benchmark_task_secret(_task_id uuid)
RETURNS TABLE (id uuid, system_prompt text, expected_output text, rubric jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'reviewer')) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT t.id, t.system_prompt, t.expected_output, t.rubric
    FROM public.benchmark_tasks t WHERE t.id = _task_id;
END;
$$;
REVOKE ALL ON FUNCTION public.get_benchmark_task_secret(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_benchmark_task_secret(uuid) TO authenticated;

-- ---- applicants ----
DROP POLICY IF EXISTS "Users can view their own applicant rows" ON public.applicants;
CREATE POLICY "Users can view their own applicant rows"
  ON public.applicants FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all applicants"
  ON public.applicants FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));