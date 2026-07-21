# One-shot data migration: xfgyzcvrvgsntjenxecp → yparkrguxoektihjpynr

The website is already pointing at the new project (`yparkrguxoektihjpynr`),
but its database and storage are empty. This directory holds the tooling to
copy production data across in one go.

## What gets migrated

| Layer | Tool | Coverage |
| --- | --- | --- |
| `public.*` tables | `scripts/migrate-data.sh` via `pg_dump | psql` | All base tables except ephemeral state (`rate_limit_buckets`, `idempotency_keys`, `ai_session_memory`) |
| `auth.users` + `auth.identities` | same script | Existing sessions/logins keep working after cutover |
| `storage.objects` metadata | same script | Row-level metadata (paths, mimetypes, owners) |
| Storage object **bytes** | `scripts/migrate-storage-bytes.mjs` | File contents in every bucket |

Every step is **idempotent**: rerunning the workflow is safe. Row inserts use
`ON CONFLICT DO NOTHING`; storage uploads skip objects that already exist on
the target.

## Snapshot for audit

`01_public_data.sql` and `03_storage_objects.sql` in this directory are
point-in-time snapshots taken from the source project during migration
planning. They exist for auditability — the live migration re-dumps
straight from the source at run time, so it never drifts.

## How to run (from your phone, via GitHub Actions)

1. In the new Supabase project's dashboard, grab the **pooled** connection
   string (Session mode, port 6543) and the **service_role** key.
2. In the old (`xfgyzcvrvgsntjenxecp`) project's dashboard, grab the same
   two values.
3. In this repo's GitHub → Settings → Secrets and variables → Actions, add:
   - `SUPABASE_DB_URL_SOURCE`
   - `SUPABASE_DB_URL_TARGET`
   - `SUPABASE_URL_SOURCE`  (e.g. `https://xfgyzcvrvgsntjenxecp.supabase.co`)
   - `SUPABASE_URL_TARGET`  (e.g. `https://yparkrguxoektihjpynr.supabase.co`)
   - `SUPABASE_SERVICE_ROLE_KEY_SOURCE`
   - `SUPABASE_SERVICE_ROLE_KEY_TARGET`
4. Trigger `Deploy Supabase (external project)` with stage
   `data-import` and type the target ref (`yparkrguxoektihjpynr`) into
   `confirm_ref`.

The workflow prints a parity report and the 4 published `explore_jobs` on
the target as its final step — that's your proof of completion.

## Manual fallback

If you'd rather run it locally:

```bash
export SUPABASE_DB_URL_SOURCE=...
export SUPABASE_DB_URL_TARGET=...
bash scripts/migrate-data.sh

export SUPABASE_URL_SOURCE=... SUPABASE_SERVICE_ROLE_KEY_SOURCE=...
export SUPABASE_URL_TARGET=... SUPABASE_SERVICE_ROLE_KEY_TARGET=...
node scripts/migrate-storage-bytes.mjs
```
