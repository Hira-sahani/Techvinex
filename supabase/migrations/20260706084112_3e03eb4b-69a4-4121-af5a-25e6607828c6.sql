
ALTER TABLE public.storage_scan_results
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS review_note TEXT;

CREATE OR REPLACE FUNCTION public.mark_scan_reviewed(_scan_id UUID, _note TEXT DEFAULT NULL)
RETURNS public.storage_scan_results
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _row public.storage_scan_results;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE public.storage_scan_results
     SET reviewed_at = now(),
         reviewed_by = auth.uid(),
         review_note = COALESCE(_note, review_note),
         updated_at = now()
   WHERE id = _scan_id
  RETURNING * INTO _row;

  IF _row.id IS NULL THEN
    RAISE EXCEPTION 'scan not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN _row;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_scan_reviewed(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_scan_reviewed(UUID, TEXT) TO authenticated, service_role;
