#!/usr/bin/env bash
# Backup the full Supabase Postgres database to a timestamped .sql file.
#
# Usage:
#   SUPABASE_DB_URL="postgres://postgres:<password>@db.<ref>.supabase.co:5432/postgres" \
#     ./scripts/backup-db.sh [output-dir]
#
# Get SUPABASE_DB_URL from: Supabase Dashboard → Project Settings → Database → Connection string (URI).
# Requires: pg_dump (install via `brew install libpq` or `apt install postgresql-client`).

set -euo pipefail

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "ERROR: SUPABASE_DB_URL is not set." >&2
  echo "Export it first, e.g.:" >&2
  echo "  export SUPABASE_DB_URL='postgres://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres'" >&2
  exit 1
fi

OUT_DIR="${1:-./backups}"
mkdir -p "$OUT_DIR"

STAMP="$(date -u +%Y%m%d-%H%M%SZ)"
OUT_FILE="$OUT_DIR/supabase-backup-$STAMP.sql"

echo "→ Dumping database to $OUT_FILE"
pg_dump --no-owner --no-privileges --clean --if-exists "$SUPABASE_DB_URL" > "$OUT_FILE"

echo "✓ Backup complete: $OUT_FILE"
echo "  Size: $(du -h "$OUT_FILE" | cut -f1)"
echo ""
echo "To restore: psql \"\$SUPABASE_DB_URL\" < $OUT_FILE"
