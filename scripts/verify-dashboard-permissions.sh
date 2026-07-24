#!/usr/bin/env bash
set -euo pipefail

# Target-only dashboard permission verifier.
# Requires SUPABASE_DB_URL_TARGET to point at the independent production project.
# This script intentionally never uses Lovable-managed PG* variables.

if [ -z "${SUPABASE_DB_URL_TARGET:-}" ]; then
  echo "::error::SUPABASE_DB_URL_TARGET is required."
  exit 1
fi

case "$SUPABASE_DB_URL_TARGET" in
  postgresql://*|postgres://*) ;;
  *)
    echo "::error::SUPABASE_DB_URL_TARGET must be a postgres:// or postgresql:// URI."
    exit 1
    ;;
esac

OUT_DIR="${DASHBOARD_PERMISSION_EVIDENCE_DIR:-dashboard-permission-evidence}"
mkdir -p "$OUT_DIR"

psql_target() {
  psql -v ON_ERROR_STOP=1 -X -d "$SUPABASE_DB_URL_TARGET" "$@"
}

echo "=== Target identity ===" | tee "$OUT_DIR/00_target_identity.txt"
psql_target -P pager=off -c "SELECT current_database() AS database, current_user AS user, inet_server_addr()::text AS server_addr, inet_server_port() AS server_port;" \
  | tee -a "$OUT_DIR/00_target_identity.txt"

echo "=== Migration status for dashboard grant repair ===" | tee "$OUT_DIR/01_migration_status.txt"
psql_target -P pager=off -c "SELECT version, name, inserted_at FROM supabase_migrations.schema_migrations WHERE version IN ('20260724064830','20260724065655') ORDER BY version;" \
  | tee -a "$OUT_DIR/01_migration_status.txt"

echo "=== Required check 2: applications table grants ===" | tee "$OUT_DIR/02_applications_grants.txt"
psql_target -P pager=off -c "SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_schema = 'public' AND table_name = 'applications' ORDER BY grantee, privilege_type;" \
  | tee -a "$OUT_DIR/02_applications_grants.txt"

echo "=== Required check 3: applications RLS ===" | tee "$OUT_DIR/03_applications_rls.txt"
psql_target -P pager=off -c "SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'applications';" \
  | tee -a "$OUT_DIR/03_applications_rls.txt"

echo "=== Required check 4: applications policies ===" | tee "$OUT_DIR/04_applications_policies.txt"
psql_target -P pager=off -c "SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'public' AND tablename = 'applications' ORDER BY policyname;" \
  | tee -a "$OUT_DIR/04_applications_policies.txt"

echo "=== Dashboard dependency grant audit ===" | tee "$OUT_DIR/05_dashboard_dependency_grants.txt"
psql_target -P pager=off -c "WITH deps(table_name, needs) AS (VALUES ('profiles','SELECT'), ('applications','SELECT'), ('notifications','SELECT'), ('offers','SELECT'), ('contracts','SELECT'), ('saved_roles','SELECT')) SELECT d.table_name, d.needs, COALESCE(bool_or(g.grantee = 'authenticated' AND g.privilege_type = d.needs), false) AS authenticated_has_privilege, COALESCE(bool_or(g.grantee = 'service_role'), false) AS service_role_has_any_privilege FROM deps d LEFT JOIN information_schema.role_table_grants g ON g.table_schema = 'public' AND g.table_name = d.table_name GROUP BY d.table_name, d.needs ORDER BY d.table_name;" \
  | tee -a "$OUT_DIR/05_dashboard_dependency_grants.txt"

echo "=== Dashboard dependency RLS/policy audit ===" | tee "$OUT_DIR/06_dashboard_dependency_rls_policies.txt"
psql_target -P pager=off -c "WITH deps(table_name) AS (VALUES ('profiles'), ('applications'), ('notifications'), ('offers'), ('contracts'), ('saved_roles')) SELECT d.table_name, c.relrowsecurity, count(p.policyname) AS policy_count FROM deps d JOIN pg_class c ON c.relname = d.table_name JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public' LEFT JOIN pg_policies p ON p.schemaname = 'public' AND p.tablename = d.table_name GROUP BY d.table_name, c.relrowsecurity ORDER BY d.table_name;" \
  | tee -a "$OUT_DIR/06_dashboard_dependency_rls_policies.txt"

echo "=== Exact dashboard SQL shape ===" | tee "$OUT_DIR/07_exact_dashboard_queries.txt"
cat <<'SQL' | tee -a "$OUT_DIR/07_exact_dashboard_queries.txt"
-- Executed by src/pages/CandidateDashboard.tsx through PostgREST as the signed-in user:
SELECT * FROM public.profiles      WHERE user_id = auth.uid() LIMIT 1;
SELECT * FROM public.applications  WHERE user_id = auth.uid() ORDER BY applied_at DESC;
SELECT * FROM public.notifications WHERE user_id = auth.uid() AND is_read = false ORDER BY created_at DESC LIMIT 5;
SELECT * FROM public.offers        WHERE user_id = auth.uid() ORDER BY created_at DESC;
SELECT * FROM public.contracts     WHERE user_id = auth.uid() ORDER BY created_at DESC;
SELECT * FROM public.saved_roles   WHERE user_id = auth.uid();
SQL

echo "=== Authenticated-role SQL probe for first permission-denied object ===" | tee "$OUT_DIR/08_authenticated_role_probe.txt"
probe_sql=$(mktemp)
cat > "$probe_sql" <<'SQL'
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.role = 'authenticated';
SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-000000000000';

DO $$
DECLARE
  q record;
BEGIN
  FOR q IN
    SELECT * FROM (VALUES
      ('profiles',      'SELECT * FROM public.profiles      WHERE user_id = auth.uid() LIMIT 1'),
      ('applications',  'SELECT * FROM public.applications  WHERE user_id = auth.uid() ORDER BY applied_at DESC LIMIT 1'),
      ('notifications', 'SELECT * FROM public.notifications WHERE user_id = auth.uid() AND is_read = false ORDER BY created_at DESC LIMIT 1'),
      ('offers',        'SELECT * FROM public.offers        WHERE user_id = auth.uid() ORDER BY created_at DESC LIMIT 1'),
      ('contracts',     'SELECT * FROM public.contracts     WHERE user_id = auth.uid() ORDER BY created_at DESC LIMIT 1'),
      ('saved_roles',   'SELECT * FROM public.saved_roles   WHERE user_id = auth.uid() LIMIT 1')
    ) AS v(object_name, sql_text)
  LOOP
    BEGIN
      EXECUTE q.sql_text;
      RAISE NOTICE 'OK: %', q.object_name;
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE EXCEPTION 'FIRST_PERMISSION_DENIED_OBJECT=% SQL=% ERROR=%', q.object_name, q.sql_text, SQLERRM USING ERRCODE = SQLSTATE;
    WHEN OTHERS THEN
      RAISE EXCEPTION 'FIRST_ERROR_OBJECT=% SQL=% SQLSTATE=% ERROR=%', q.object_name, q.sql_text, SQLSTATE, SQLERRM USING ERRCODE = SQLSTATE;
    END;
  END LOOP;
END $$;
SQL
set +e
psql_target -P pager=off -f "$probe_sql" 2>&1 | tee -a "$OUT_DIR/08_authenticated_role_probe.txt"
probe_status=${PIPESTATUS[0]}
set -e
rm -f "$probe_sql"

if [ "$probe_status" -ne 0 ]; then
  echo "::error::Authenticated-role dashboard probe failed. See $OUT_DIR/08_authenticated_role_probe.txt for the first failing object."
  exit "$probe_status"
fi

echo "=== Result ===" | tee "$OUT_DIR/09_result.txt"
echo "PASS: dashboard dependency queries succeed as PostgreSQL role authenticated; any remaining dashboard error is not caused by table-level GRANT/RLS on these objects." | tee -a "$OUT_DIR/09_result.txt"