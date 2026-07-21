#!/usr/bin/env bash
# Live source→target data migration.
#
# Copies auth.users + auth.identities, all public.* tables, and storage.objects
# metadata from SUPABASE_DB_URL_SOURCE into SUPABASE_DB_URL_TARGET using
# pg_dump | psql. Idempotent: uses --column-inserts --on-conflict-do-nothing.
#
# Storage bytes are NOT copied here — see scripts/migrate-storage-bytes.mjs.
#
# Required environment:
#   SUPABASE_DB_URL_SOURCE   # postgres://... for the OLD project
#   SUPABASE_DB_URL_TARGET   # postgres://... for the NEW project
#
# Optional environment:
#   SKIP_AUTH=1              # skip auth schema (if target already has users)
#   SKIP_STORAGE=1           # skip storage.objects metadata
#   DRY_RUN=1                # dump only, do not restore

set -euo pipefail

: "${SUPABASE_DB_URL_SOURCE:?SUPABASE_DB_URL_SOURCE is required}"
: "${SUPABASE_DB_URL_TARGET:?SUPABASE_DB_URL_TARGET is required}"

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

echo "== Migration workspace: $WORK"
echo "== pg_dump: $(pg_dump --version)"
echo "== psql:    $(psql --version)"

# Tables in public we intentionally SKIP (ephemeral / per-request state).
EXCLUDES=(
  --exclude-table=public.rate_limit_buckets
  --exclude-table=public.idempotency_keys
  --exclude-table=public.ai_session_memory
)

# ---- 1. public schema ---------------------------------------------------
echo "== [1/3] Dumping public schema data from source"
pg_dump --schema=public --data-only --no-owner --no-privileges \
  --column-inserts --on-conflict-do-nothing --disable-triggers \
  "${EXCLUDES[@]}" \
  "$SUPABASE_DB_URL_SOURCE" > "$WORK/01_public.sql"
wc -l "$WORK/01_public.sql"

# ---- 2. auth schema (users + identities) --------------------------------
if [ "${SKIP_AUTH:-0}" != "1" ]; then
  echo "== [2/3] Dumping auth.users + auth.identities from source"
  pg_dump --data-only --no-owner --no-privileges \
    --column-inserts --on-conflict-do-nothing --disable-triggers \
    --table=auth.users --table=auth.identities \
    "$SUPABASE_DB_URL_SOURCE" > "$WORK/02_auth.sql"
  wc -l "$WORK/02_auth.sql"
else
  echo "== [2/3] SKIP_AUTH=1 — skipping auth schema"
  : > "$WORK/02_auth.sql"
fi

# ---- 3. storage.objects metadata ----------------------------------------
if [ "${SKIP_STORAGE:-0}" != "1" ]; then
  echo "== [3/3] Dumping storage.objects metadata from source"
  pg_dump --data-only --no-owner --no-privileges \
    --column-inserts --on-conflict-do-nothing --disable-triggers \
    --table=storage.objects \
    "$SUPABASE_DB_URL_SOURCE" > "$WORK/03_storage.sql"
  wc -l "$WORK/03_storage.sql"
else
  echo "== [3/3] SKIP_STORAGE=1 — skipping storage.objects"
  : > "$WORK/03_storage.sql"
fi

if [ "${DRY_RUN:-0}" = "1" ]; then
  echo "== DRY_RUN=1 — dumps written to $WORK, no restore performed"
  ls -la "$WORK"
  exit 0
fi

# ---- Restore order: auth first (FK parent), then public, then storage ---
apply() {
  local file="$1" label="$2"
  if [ ! -s "$file" ]; then
    echo "-- $label: empty, skipping"
    return
  fi
  echo "== Applying $label into target"
  # ON_ERROR_STOP=1 so a real failure fails the workflow; individual
  # ON CONFLICT DO NOTHING rows do not raise.
  psql -v ON_ERROR_STOP=1 --single-transaction "$SUPABASE_DB_URL_TARGET" -f "$file"
}

apply "$WORK/02_auth.sql"    "auth schema"
apply "$WORK/01_public.sql"  "public schema"
apply "$WORK/03_storage.sql" "storage.objects metadata"

# ---- Post-restore parity report -----------------------------------------
echo
echo "== Parity report (source vs target row counts)"
psql -At "$SUPABASE_DB_URL_SOURCE" -c "
  SELECT table_name || E'\t' || (xpath('/row/c/text()', xml_count))[1]::text
  FROM (
    SELECT table_name,
           query_to_xml(format('select count(*) as c from public.%I', table_name), false, true, '') AS xml_count
    FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE'
  ) t ORDER BY table_name;" > "$WORK/src_counts.tsv"

psql -At "$SUPABASE_DB_URL_TARGET" -c "
  SELECT table_name || E'\t' || (xpath('/row/c/text()', xml_count))[1]::text
  FROM (
    SELECT table_name,
           query_to_xml(format('select count(*) as c from public.%I', table_name), false, true, '') AS xml_count
    FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE'
  ) t ORDER BY table_name;" > "$WORK/tgt_counts.tsv"

printf '%-32s %10s %10s %s\n' TABLE SOURCE TARGET STATUS
join -a1 -a2 -e '-' -o '0,1.2,2.2' -t $'\t' \
  "$WORK/src_counts.tsv" "$WORK/tgt_counts.tsv" \
| awk -F'\t' '{
    status = ($2 == $3) ? "OK" : (($3 != "-" && $2 != "-" && $3+0 >= $2+0) ? "OK+extra" : "DRIFT")
    printf "%-32s %10s %10s %s\n", $1, $2, $3, status
  }'

echo
echo "== Published explore_jobs on TARGET"
psql "$SUPABASE_DB_URL_TARGET" -c \
  "SELECT id, title, status, visibility FROM public.explore_jobs WHERE status='published' ORDER BY created_at;"
