
CREATE TABLE public.storage_scan_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket TEXT NOT NULL,
  object_path TEXT NOT NULL,
  sha256 TEXT,
  size_bytes BIGINT,
  content_type TEXT,
  verdict TEXT NOT NULL CHECK (verdict IN ('pending','clean','suspicious','malicious','error')),
  engines_total INTEGER,
  engines_hit INTEGER,
  vendor TEXT,
  vendor_scan_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  uploaded_by UUID,
  action_taken TEXT,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.storage_scan_results TO authenticated;
GRANT ALL ON public.storage_scan_results TO service_role;

ALTER TABLE public.storage_scan_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read scan results"
  ON public.storage_scan_results FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "uploader reads own scan"
  ON public.storage_scan_results FOR SELECT
  TO authenticated
  USING (uploaded_by = auth.uid());

CREATE INDEX idx_storage_scan_verdict_time
  ON public.storage_scan_results (verdict, scanned_at DESC);
CREATE INDEX idx_storage_scan_uploader
  ON public.storage_scan_results (uploaded_by, scanned_at DESC);

CREATE TRIGGER trg_storage_scan_updated_at
  BEFORE UPDATE ON public.storage_scan_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notify admins when a suspicious/malicious verdict is recorded
CREATE OR REPLACE FUNCTION public.notify_admins_on_bad_scan()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin RECORD;
  _title TEXT;
  _body TEXT;
BEGIN
  IF NEW.verdict NOT IN ('malicious','suspicious') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.verdict = NEW.verdict THEN
    RETURN NEW;
  END IF;

  _title := CASE WHEN NEW.verdict = 'malicious'
                 THEN 'Malicious upload blocked'
                 ELSE 'Suspicious upload flagged' END;
  _body := format('%s/%s — %s engines flagged (%s)',
                  NEW.bucket, NEW.object_path,
                  COALESCE(NEW.engines_hit, 0),
                  COALESCE(NEW.vendor, 'scanner'));

  FOR _admin IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
    INSERT INTO public.notifications (user_id, title, body, action_url)
    VALUES (_admin.user_id, _title, _body, '/admin/malware-scans');
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_storage_scan_notify
  AFTER INSERT OR UPDATE OF verdict ON public.storage_scan_results
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_bad_scan();
