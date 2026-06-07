CREATE TABLE public.applicants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  job_id UUID REFERENCES public.explore_jobs(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  linkedin_url TEXT,
  no_linkedin BOOLEAN NOT NULL DEFAULT false,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.applicants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applicants TO authenticated;
GRANT ALL ON public.applicants TO service_role;

ALTER TABLE public.applicants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create an applicant" ON public.applicants
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Users can view their own applicant rows" ON public.applicants
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR email = (auth.jwt() ->> 'email'));

CREATE POLICY "Users can update their own applicant rows" ON public.applicants
  FOR UPDATE TO authenticated USING (auth.uid() = user_id OR email = (auth.jwt() ->> 'email'));

CREATE TRIGGER update_applicants_updated_at BEFORE UPDATE ON public.applicants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_applicants_email ON public.applicants(email);
CREATE INDEX idx_applicants_job ON public.applicants(job_id);