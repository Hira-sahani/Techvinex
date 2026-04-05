
-- Benchmark Tasks
CREATE TABLE public.benchmark_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  system_prompt TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  difficulty TEXT NOT NULL DEFAULT 'medium',
  rubric JSONB NOT NULL DEFAULT '[]'::jsonb,
  expected_output TEXT,
  input_type TEXT NOT NULL DEFAULT 'text',
  input_data TEXT,
  max_score INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  tags TEXT[] DEFAULT '{}'::text[],
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.benchmark_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage benchmark tasks" ON public.benchmark_tasks
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Reviewers can view benchmark tasks" ON public.benchmark_tasks
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'reviewer'::app_role));

CREATE POLICY "Viewers can view benchmark tasks" ON public.benchmark_tasks
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'viewer'::app_role));

-- Benchmark Results
CREATE TABLE public.benchmark_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.benchmark_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model TEXT NOT NULL DEFAULT 'gpt-4o',
  ai_response TEXT,
  score NUMERIC DEFAULT 0,
  max_score INTEGER NOT NULL DEFAULT 100,
  latency_ms INTEGER DEFAULT 0,
  attempts JSONB DEFAULT '[]'::jsonb,
  pass_at_1 BOOLEAN DEFAULT false,
  pass_at_n BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.benchmark_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage benchmark results" ON public.benchmark_results
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own results" ON public.benchmark_results
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own results" ON public.benchmark_results
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Reviewers can view all results" ON public.benchmark_results
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'reviewer'::app_role));

CREATE POLICY "Viewers can view all results" ON public.benchmark_results
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'viewer'::app_role));

-- Benchmark Reviews (Human Expert Reviews)
CREATE TABLE public.benchmark_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  result_id UUID NOT NULL REFERENCES public.benchmark_results(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  override_score NUMERIC,
  comments TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.benchmark_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage reviews" ON public.benchmark_reviews
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Reviewers can manage reviews" ON public.benchmark_reviews
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'reviewer'::app_role));

CREATE POLICY "Viewers can view reviews" ON public.benchmark_reviews
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'viewer'::app_role));
