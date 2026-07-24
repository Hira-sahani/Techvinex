GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_roles TO authenticated;
GRANT ALL ON public.saved_roles TO service_role;

DO $$
DECLARE
  missing text;
BEGIN
  SELECT string_agg(format('%I.%I missing %s for %s', table_schema, table_name, privilege_type, grantee), ', ')
  INTO missing
  FROM (
    SELECT 'public'::text AS table_schema, t.table_name, r.grantee, p.privilege_type
    FROM (VALUES ('profiles'), ('applications'), ('notifications'), ('offers'), ('contracts'), ('saved_roles')) AS t(table_name)
    CROSS JOIN (VALUES ('authenticated'), ('service_role')) AS r(grantee)
    CROSS JOIN LATERAL (
      SELECT unnest(CASE WHEN r.grantee = 'authenticated'
        THEN ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[]
        ELSE ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']::text[]
      END) AS privilege_type
    ) p
    WHERE NOT EXISTS (
      SELECT 1
      FROM information_schema.role_table_grants g
      WHERE g.table_schema = 'public'
        AND g.table_name = t.table_name
        AND g.grantee = r.grantee
        AND g.privilege_type = p.privilege_type
    )
  ) gaps;

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Dashboard Data API grant verification failed: %', missing;
  END IF;
END $$;