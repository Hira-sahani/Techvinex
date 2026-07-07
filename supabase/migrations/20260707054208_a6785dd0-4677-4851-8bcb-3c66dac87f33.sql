CREATE OR REPLACE FUNCTION public.storage_object_owner(_bucket text, _name text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, storage
AS $$
  SELECT owner FROM storage.objects WHERE bucket_id = _bucket AND name = _name
$$;

REVOKE ALL ON FUNCTION public.storage_object_owner(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.storage_object_owner(text, text) TO service_role;