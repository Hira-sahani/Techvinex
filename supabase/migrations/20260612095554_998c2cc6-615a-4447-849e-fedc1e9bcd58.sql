
-- 1. Denormalized columns -------------------------------------------------
ALTER TABLE public.benchmark_results
  ADD COLUMN IF NOT EXISTS task_title text,
  ADD COLUMN IF NOT EXISTS task_category text;

-- 2. Backfill -------------------------------------------------------------
UPDATE public.benchmark_results r
   SET task_title    = t.title,
       task_category = t.category
  FROM public.benchmark_tasks t
 WHERE r.task_id = t.id
   AND (r.task_title IS DISTINCT FROM t.title
        OR r.task_category IS DISTINCT FROM t.category);

-- 3. Sync trigger: result-side (INSERT / task_id change) ------------------
CREATE OR REPLACE FUNCTION public.benchmark_results_sync_task_denorm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.task_id IS DISTINCT FROM OLD.task_id THEN
    SELECT t.title, t.category
      INTO NEW.task_title, NEW.task_category
      FROM public.benchmark_tasks t
     WHERE t.id = NEW.task_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_benchmark_results_sync_task ON public.benchmark_results;
CREATE TRIGGER trg_benchmark_results_sync_task
  BEFORE INSERT OR UPDATE OF task_id ON public.benchmark_results
  FOR EACH ROW EXECUTE FUNCTION public.benchmark_results_sync_task_denorm();

-- 4. Sync trigger: task-side (propagate title/category renames) -----------
CREATE OR REPLACE FUNCTION public.benchmark_tasks_propagate_denorm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.title IS DISTINCT FROM OLD.title
     OR NEW.category IS DISTINCT FROM OLD.category THEN
    UPDATE public.benchmark_results
       SET task_title    = NEW.title,
           task_category = NEW.category
     WHERE task_id = NEW.id
       AND (task_title IS DISTINCT FROM NEW.title
            OR task_category IS DISTINCT FROM NEW.category);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_benchmark_tasks_propagate ON public.benchmark_tasks;
CREATE TRIGGER trg_benchmark_tasks_propagate
  AFTER UPDATE OF title, category ON public.benchmark_tasks
  FOR EACH ROW EXECUTE FUNCTION public.benchmark_tasks_propagate_denorm();

-- 5. Covering indexes -----------------------------------------------------
-- Leaderboard: WHERE status='completed' (aggregated by model/category)
CREATE INDEX IF NOT EXISTS idx_benchmark_results_status_created
  ON public.benchmark_results (status, created_at DESC);

-- Recent-results lists (dashboard + reviews + admin), ordered by created_at
CREATE INDEX IF NOT EXISTS idx_benchmark_results_created_desc
  ON public.benchmark_results (created_at DESC);
