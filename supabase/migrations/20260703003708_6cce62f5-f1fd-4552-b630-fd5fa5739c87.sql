
REVOKE EXECUTE ON FUNCTION public.notify_admins_on_bad_scan() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.notify_admins_on_bad_scan() TO service_role;
