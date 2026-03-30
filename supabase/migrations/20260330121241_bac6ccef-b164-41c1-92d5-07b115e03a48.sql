
-- ENUM for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user', 'employer');

-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 1. user_roles (FIRST, before has_role function)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role security definer function (NOW safe since user_roles exists)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 2. profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  dob DATE,
  linkedin TEXT,
  no_linkedin BOOLEAN DEFAULT false,
  resume_name TEXT,
  no_resume BOOLEAN DEFAULT false,
  portfolio TEXT,
  other_links TEXT[],
  leetcode TEXT,
  github TEXT,
  codechef TEXT,
  codeforces TEXT,
  country TEXT,
  state TEXT,
  city TEXT,
  postal_code TEXT,
  authorized_to_work BOOLEAN DEFAULT false,
  work_from_different_country BOOLEAN DEFAULT false,
  education JSONB DEFAULT '[]'::jsonb,
  work_experience JSONB DEFAULT '{}'::jsonb,
  signature_name TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  availability_set BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. roles
CREATE TABLE public.roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  pay TEXT,
  hired_count INT DEFAULT 0,
  category TEXT,
  description TEXT,
  requirements TEXT[],
  type TEXT,
  location TEXT,
  referral_bonus TEXT,
  contingent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Roles viewable by everyone" ON public.roles FOR SELECT USING (true);
CREATE POLICY "Admins can manage roles" ON public.roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. explore_jobs
CREATE TABLE public.explore_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_requirement_id UUID,
  title TEXT NOT NULL,
  short_description TEXT,
  description TEXT,
  skills TEXT[] DEFAULT '{}',
  experience TEXT,
  budget TEXT,
  job_type TEXT DEFAULT 'full-time',
  location TEXT DEFAULT 'Remote',
  company_name TEXT,
  show_company BOOLEAN DEFAULT false,
  show_salary BOOLEAN DEFAULT true,
  urgency TEXT DEFAULT 'normal',
  tags TEXT[] DEFAULT '{}',
  compliance_info JSONB DEFAULT '{}'::jsonb,
  internal_notes TEXT,
  visibility TEXT DEFAULT 'public',
  geo_targeting TEXT[] DEFAULT '{}',
  skill_targeting TEXT[] DEFAULT '{}',
  featured BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft',
  slug TEXT UNIQUE,
  meta_title TEXT,
  meta_description TEXT,
  allow_direct_apply BOOLEAN DEFAULT true,
  auto_match_only BOOLEAN DEFAULT false,
  application_limit INT,
  expiry_date TIMESTAMPTZ,
  views_count INT DEFAULT 0,
  clicks_count INT DEFAULT 0,
  applications_count INT DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.explore_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Jobs viewable by everyone" ON public.explore_jobs FOR SELECT USING (true);
CREATE POLICY "Admins can manage explore jobs" ON public.explore_jobs FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_explore_jobs_updated_at BEFORE UPDATE ON public.explore_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. applications
CREATE TABLE public.applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID,
  job_id UUID,
  status TEXT DEFAULT 'applied',
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own applications" ON public.applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create applications" ON public.applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own applications" ON public.applications FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. contracts
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  status TEXT DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own contracts" ON public.contracts FOR SELECT USING (auth.uid() = user_id);
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. offers
CREATE TABLE public.offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  company TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own offers" ON public.offers FOR SELECT USING (auth.uid() = user_id);
CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON public.offers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. assessments
CREATE TABLE public.assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  status TEXT DEFAULT 'pending',
  score INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own assessments" ON public.assessments FOR SELECT USING (auth.uid() = user_id);
CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON public.assessments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. saved_roles
CREATE TABLE public.saved_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.saved_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own saved roles" ON public.saved_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can save roles" ON public.saved_roles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave roles" ON public.saved_roles FOR DELETE USING (auth.uid() = user_id);

-- 10. platform_stats
CREATE TABLE public.platform_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stat_key TEXT NOT NULL UNIQUE,
  stat_value TEXT DEFAULT '0',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stats viewable by everyone" ON public.platform_stats FOR SELECT USING (true);
CREATE POLICY "Admins can manage stats" ON public.platform_stats FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 11. notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- 12. job_bookmarks
CREATE TABLE public.job_bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, user_id)
);
ALTER TABLE public.job_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own bookmarks" ON public.job_bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create bookmarks" ON public.job_bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete bookmarks" ON public.job_bookmarks FOR DELETE USING (auth.uid() = user_id);

-- 13. job_analytics
CREATE TABLE public.job_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  user_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.job_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Analytics insertable by authenticated" ON public.job_analytics FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can view analytics" ON public.job_analytics FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 14. job_applications
CREATE TABLE public.job_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'applied',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, user_id)
);
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own job applications" ON public.job_applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can apply to jobs" ON public.job_applications FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 15. employer_jobs
CREATE TABLE public.employer_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  department TEXT,
  location TEXT,
  type TEXT,
  budget TEXT,
  skills TEXT[] DEFAULT '{}',
  description TEXT,
  status TEXT DEFAULT 'active',
  candidate_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employer_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employers can view own jobs" ON public.employer_jobs FOR SELECT USING (auth.uid() = employer_id);
CREATE POLICY "Employers can manage own jobs" ON public.employer_jobs FOR ALL USING (auth.uid() = employer_id);
CREATE TRIGGER update_employer_jobs_updated_at BEFORE UPDATE ON public.employer_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 16. employer_candidates
CREATE TABLE public.employer_candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID,
  employer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  candidate_name TEXT,
  email TEXT,
  phone TEXT,
  skills TEXT[] DEFAULT '{}',
  experience INT DEFAULT 0,
  ai_score INT DEFAULT 0,
  resume_url TEXT,
  video_url TEXT,
  status TEXT DEFAULT 'new',
  notes TEXT,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employer_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employers can view own candidates" ON public.employer_candidates FOR SELECT USING (auth.uid() = employer_id);
CREATE POLICY "Employers can manage own candidates" ON public.employer_candidates FOR ALL USING (auth.uid() = employer_id);
CREATE TRIGGER update_employer_candidates_updated_at BEFORE UPDATE ON public.employer_candidates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 17. employer_interviews
CREATE TABLE public.employer_interviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID,
  job_id UUID,
  employer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  candidate_name TEXT,
  job_title TEXT,
  scheduled_date DATE,
  scheduled_time TEXT,
  status TEXT DEFAULT 'scheduled',
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employer_interviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employers can view own interviews" ON public.employer_interviews FOR SELECT USING (auth.uid() = employer_id);
CREATE POLICY "Employers can manage own interviews" ON public.employer_interviews FOR ALL USING (auth.uid() = employer_id);

-- 18. employer_billing
CREATE TABLE public.employer_billing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  candidate_name TEXT,
  job_title TEXT,
  hire_date DATE,
  fee NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employer_billing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employers can view own billing" ON public.employer_billing FOR SELECT USING (auth.uid() = employer_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.explore_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.roles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_stats;

-- Default platform stats
INSERT INTO public.platform_stats (stat_key, stat_value) VALUES
  ('total_candidates', '0'),
  ('roles_created', '0'),
  ('daily_payouts', '0'),
  ('active_contracts', '0');
