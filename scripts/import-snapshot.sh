#!/usr/bin/env bash
# Snapshot-only data import into the TARGET Supabase project.
#
# The original source project (xfgyzcvrvgsntjenxecp) has been permanently
# deleted, so a live pg_dump | psql pipeline is no longer possible. This
# script applies the committed point-in-time snapshot at
# supabase/data-migration/*.sql into the target only.
#
# Required environment:
#   SUPABASE_DB_URL_TARGET   # postgres://... for the LIVE (new) project
#
# Optional environment:
#   IMPORT_STORAGE_METADATA=1  # also apply 03_storage_objects.sql
#                              # DEFAULT: OFF. The source bucket bytes are
#                              # gone, so importing metadata creates orphan
#                              # rows whose downloads return 404. Only turn
#                              # this on after you have re-uploaded the
#                              # matching bytes to the target bucket.
#   DRY_RUN=1                  # print what would run, do not apply.
#
# NEVER reads any *_SOURCE secret. The source project no longer exists.

set -euo pipefail

# ---- Fail-fast: TARGET DB URL must be present AND a valid postgres URI ----
# If we ever call psql with an empty or non-URI value, psql silently falls
# back to the local Unix socket (/var/run/postgresql/.s.PGSQL.5432) and the
# job fails with a misleading "connection to server on socket ... failed"
# error. Validate the connection string BEFORE any psql invocation.
if [ -z "${SUPABASE_DB_URL_TARGET:-}" ]; then
  echo "::error::SUPABASE_DB_URL_TARGET is empty or unset. Refusing to run —"
  echo "         psql would fall back to the local /var/run/postgresql socket."
  echo "         Set the GitHub Actions secret SUPABASE_DB_URL_TARGET to the"
  echo "         full postgres:// connection URI of the TARGET Supabase project."
  exit 1
fi
case "$SUPABASE_DB_URL_TARGET" in
  postgres://*|postgresql://*) : ;;
  *)
    echo "::error::SUPABASE_DB_URL_TARGET is not a postgres:// URI."
    echo "         Value length=${#SUPABASE_DB_URL_TARGET}. First 12 chars:" \
         "'$(printf '%s' "$SUPABASE_DB_URL_TARGET" | cut -c1-12)'"
    echo "         Expected prefix: postgres:// or postgresql://"
    echo "         Without a URI scheme psql connects to the local socket."
    exit 1
    ;;
esac
# Masked confirmation (host + port only, no creds).
_TARGET_HOST="$(printf '%s' "$SUPABASE_DB_URL_TARGET" \
  | sed -E 's#^[a-z]+://[^@]*@([^:/?]+).*#\1#')"
_TARGET_PORT="$(printf '%s' "$SUPABASE_DB_URL_TARGET" \
  | sed -nE 's#^[a-z]+://[^@]*@[^:/?]+:([0-9]+).*#\1#p')"
: "${_TARGET_PORT:=5432}"
echo "  ✓ SUPABASE_DB_URL_TARGET host: ${_TARGET_HOST}:${_TARGET_PORT}"

# ---- IPv4 reachability preflight ----------------------------------------
# GitHub-hosted runners are IPv4-only. The Supabase *direct* database
# endpoint (db.<ref>.supabase.co) publishes ONLY an AAAA (IPv6) record, so
# psql from Actions fails with:
#     connection to server at "db.<ref>.supabase.co" ... Network is unreachable
# The fix is to use the Supabase *Session Pooler* host, which has A (IPv4)
# records and accepts the same password. Detect the direct host early and
# print the exact swap instructions instead of a cryptic psql error.
case "$_TARGET_HOST" in
  db.*.supabase.co)
    _REF="$(printf '%s' "$_TARGET_HOST" | sed -E 's#^db\.([^.]+)\.supabase\.co$#\1#')"
    echo "::error::Direct database host detected: ${_TARGET_HOST}"
    echo "         GitHub Actions runners are IPv4-only, and db.*.supabase.co"
    echo "         resolves ONLY to IPv6 (AAAA). That is why psql reports:"
    echo "           'Network is unreachable'"
    echo
    echo "         FIX: switch SUPABASE_DB_URL_TARGET to the Session Pooler URI."
    echo "         Format (port 5432, IPv4-reachable, same DB password):"
    echo "           postgresql://postgres.${_REF}:<DB_PASSWORD>@aws-0-<REGION>.pooler.supabase.com:5432/postgres"
    echo
    echo "         Find <REGION> in the target project's Connect dialog"
    echo "         (Session pooler tab). Update the GitHub secret and re-run."
    exit 1
    ;;
esac

# Generic IPv4 reachability check (works for pooler + any custom host).
if command -v getent >/dev/null 2>&1; then
  if ! getent ahostsv4 "$_TARGET_HOST" >/dev/null 2>&1; then
    echo "::error::No IPv4 (A) record for ${_TARGET_HOST}."
    echo "         GitHub Actions runners cannot reach IPv6-only hosts."
    echo "         Use a host that publishes A records (e.g. Supabase Session Pooler)."
    exit 1
  fi
fi
if command -v nc >/dev/null 2>&1; then
  if ! nc -4 -z -w 5 "$_TARGET_HOST" "$_TARGET_PORT" >/dev/null 2>&1; then
    echo "::warning::TCP preflight to ${_TARGET_HOST}:${_TARGET_PORT} over IPv4 failed."
    echo "           psql will still attempt the connection; if it fails with"
    echo "           'Network is unreachable', switch to the Session Pooler URI."
  else
    echo "  ✓ IPv4 TCP reachable: ${_TARGET_HOST}:${_TARGET_PORT}"
  fi
fi

if [ -n "${SUPABASE_DB_URL_SOURCE:-}${SUPABASE_URL_SOURCE:-}${SUPABASE_SERVICE_ROLE_KEY_SOURCE:-}" ]; then
  echo "::warning::A *_SOURCE env var is set but will be ignored — the source project is deleted."
fi


ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SNAP_DIR="$ROOT/supabase/data-migration"
PUBLIC_SQL="$SNAP_DIR/01_public_data.sql"
STORAGE_SQL="$SNAP_DIR/03_storage_objects.sql"

for f in "$PUBLIC_SQL" "$STORAGE_SQL"; do
  [ -s "$f" ] || { echo "::error::Missing snapshot file: $f"; exit 1; }
done

echo "== psql: $(psql --version)"
echo "== Snapshot files:"
wc -l "$PUBLIC_SQL" "$STORAGE_SQL"

# Pass the connection URI via -d explicitly (not positionally) so psql never
# reinterprets it as a bare dbname if the leading chars are ever mangled.
apply() {
  local file="$1" label="$2"
  if [ "${DRY_RUN:-0}" = "1" ]; then
    echo "-- DRY_RUN: would apply $label ($file)"
    return
  fi
  echo "== Applying $label into TARGET (${_TARGET_HOST})"
  # ON_ERROR_STOP=1 fails on real errors. Individual ON CONFLICT DO NOTHING
  # rows are not errors, so re-runs are idempotent.
  #
  # EXCLUSION: public.audit_logs rows are stripped before apply.
  # Rationale: audit_logs.user_id has a FK to auth.users. The source project
  # is permanently deleted, so most historical user_ids in the snapshot do
  # NOT exist in the TARGET's auth.users. Importing them raises:
  #   ERROR: insert or update on table "audit_logs" violates foreign key
  #   constraint "audit_logs_user_id_fkey"
  # Audit logs are non-essential historical telemetry (edge-function deny
  # traces, admin-verify pings) — losing them does not affect app behavior;
  # new rows will be written on TARGET with valid user_ids. Filtering is
  # done via streaming grep so the committed snapshot stays byte-identical
  # for auditability. Only whole-line INSERTs into public.audit_logs are
  # dropped; the "-- Data for Name: audit_logs" comment is harmless.
  if [ "$file" = "$PUBLIC_SQL" ]; then
    local _skipped
    _skipped=$(grep -c '^INSERT INTO public\.audit_logs ' "$file" || true)
    echo "  -- excluding ${_skipped} public.audit_logs row(s) (FK to auth.users; source project deleted)"
    grep -v '^INSERT INTO public\.audit_logs ' "$file" \
      | psql -v ON_ERROR_STOP=1 --single-transaction -d "$SUPABASE_DB_URL_TARGET" -f -
  else
    psql -v ON_ERROR_STOP=1 --single-transaction -d "$SUPABASE_DB_URL_TARGET" -f "$file"
  fi
}

apply "$PUBLIC_SQL" "public.* snapshot"

if [ "${IMPORT_STORAGE_METADATA:-0}" = "1" ]; then
  apply "$STORAGE_SQL" "storage.objects metadata snapshot"
else
  echo "-- Skipping storage.objects metadata (IMPORT_STORAGE_METADATA!=1)."
  echo "   Source bucket bytes are permanently lost with the deleted project."
  echo "   Enable only after re-uploading matching bytes to the target bucket."
fi

# ---- Proof: row counts + published explore_jobs on TARGET ---------------
if [ "${DRY_RUN:-0}" = "1" ]; then
  exit 0
fi

echo
echo "== TARGET row counts (public.*)"
psql -At -d "$SUPABASE_DB_URL_TARGET" -c "
  SELECT table_name || E'\t' || (xpath('/row/c/text()', xml_count))[1]::text
  FROM (
    SELECT table_name,
           query_to_xml(format('select count(*) as c from public.%I', table_name), false, true, '') AS xml_count
    FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE'
  ) t ORDER BY table_name;"

echo
echo "== Published explore_jobs on TARGET"
psql -d "$SUPABASE_DB_URL_TARGET" -c \
  "SELECT id, title, status, visibility FROM public.explore_jobs WHERE status='published' ORDER BY created_at;"
