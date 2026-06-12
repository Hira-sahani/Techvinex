REVOKE ALL ON FUNCTION public.cleanup_expired_rate_buckets() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_rate_buckets() TO service_role;

REVOKE ALL ON FUNCTION public.rate_limit_hit(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(text, integer) TO service_role;