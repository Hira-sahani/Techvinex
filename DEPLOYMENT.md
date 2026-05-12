# Deployment & Independence Guide

This project is designed to run **independently of Lovable**. Lovable is only the
editor; GitHub is the source of truth, Vercel (or Netlify) hosts the frontend,
and Supabase hosts the backend (auth, database, storage, edge functions).

If Lovable access is ever lost, everything below still works.

---

## 1. One-time setup

### 1a. Connect Lovable ↔ GitHub (two-way sync)
In the Lovable editor: **Plus (+) → GitHub → Connect project → authorize → Create Repository**.
After this every change in either place auto-syncs.

### 1b. Connect GitHub → Vercel
1. https://vercel.com → **Add New → Project → Import** the GitHub repo.
2. Framework: **Vite**. Build command: `npm run build`. Output: `dist`.
3. `vercel.json` already configures SPA rewrites and asset caching.

### 1c. Environment variables (Vercel → Settings → Environment Variables)
Set for **Production + Preview + Development**:

| Name | Value | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://xfgyzcvrvgsntjenxecp.supabase.co` | publishable |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | (from `.env`) | publishable anon key, safe in client |
| `VITE_SUPABASE_PROJECT_ID` | `xfgyzcvrvgsntjenxecp` | publishable |
| `VITE_SITE_URL` | your custom domain | for SEO / OG tags |

**Never** put `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `LOVABLE_API_KEY`,
or `ELEVENLABS_API_KEY` in Vercel. Those are server secrets and live only in
Supabase Edge Function settings.

### 1d. Supabase auth / Google OAuth (independent of Lovable)
In the Supabase Dashboard:

- **Authentication → URL Configuration** — add to allowed redirect URLs:
  - `https://<your-domain>`
  - `https://<your-project>.vercel.app`
  - `https://*.vercel.app/**` (for preview deploys)
- **Authentication → Providers → Google** — confirm Client ID + Secret are
  saved here directly (not only configured via the Lovable Cloud UI). This is
  the critical step that keeps Google sign-in working without Lovable.
- In **Google Cloud Console → Credentials → OAuth client → Authorized redirect URIs**,
  ensure this is listed:
  `https://xfgyzcvrvgsntjenxecp.supabase.co/auth/v1/callback`

---

## 2. Running locally from a fresh GitHub clone

```bash
git clone <your-github-repo>
cd <repo>
cp .env.example .env        # fill in the VITE_SUPABASE_* values
bun install                 # or: npm install
bun run dev                 # http://localhost:8080
```

That is the entire bootstrap. No Lovable account required.

---

## 3. Manual production deploy (no Lovable, no Vercel UI)

```bash
./scripts/deploy.sh                # deploys to Vercel
TARGET=netlify ./scripts/deploy.sh # deploys to Netlify
```

Or fully by hand:

```bash
bun run build       # produces dist/
npx vercel --prod   # or: npx netlify deploy --prod --dir=dist
```

`dist/` is plain static files; any static host works (Cloudflare Pages,
S3+CloudFront, Render, GitHub Pages, etc.).

Hosting fallback configs already included in the repo:
- `vercel.json` — Vercel SPA rewrites + caching headers
- `netlify.toml` + `public/_redirects` — Netlify equivalent

---

## 4. Backup strategy

### Code
GitHub is the backup. Optional: mirror to GitLab/Bitbucket via a GitHub Action.

### Database
- **Automatic:** Supabase Dashboard → Database → Backups (daily on paid plans).
- **Manual / scripted:**
  ```bash
  export SUPABASE_DB_URL="postgres://postgres:PASSWORD@db.xfgyzcvrvgsntjenxecp.supabase.co:5432/postgres"
  ./scripts/backup-db.sh ./backups
  ```
  Run on a cron / GitHub Actions schedule. Restore with `psql "$SUPABASE_DB_URL" < file.sql`.

### Storage buckets (`blog-images`)
Use the Supabase CLI: `supabase storage download blog-images ./backups/blog-images`.

### Edge functions
Already in `supabase/functions/` — backed up with the code. Manual deploy:
```bash
supabase functions deploy <name> --project-ref xfgyzcvrvgsntjenxecp
```

### Secrets
Keep an encrypted copy (1Password / Bitwarden) of:
- All Supabase Edge Function secrets
- Google OAuth Client ID + Secret
- Custom domain DNS records

---

## 5. Recovery — what to do if Lovable becomes unavailable

The project keeps running because:
1. **Frontend** is already deployed on Vercel from GitHub. New deploys happen
   on `git push` — no Lovable involvement.
2. **Backend** (Supabase) is a separate account you control directly.
3. **Google OAuth** is configured directly in Supabase, not via Lovable.

To continue development:
```bash
git clone <repo>
# edit code in VS Code / Cursor / any editor
git push                            # → triggers Vercel deploy automatically
```

Edge functions can be deployed with `supabase functions deploy` using the
Supabase CLI — no Lovable required.

---

## 6. Best practices going forward

- **Branch protection:** in GitHub, require PRs to `main` and a green CI check
  (`.github/workflows/ci.yml` already runs typecheck + build + tests).
- **Preview deploys:** every PR gets a Vercel preview URL automatically — test
  there before merging.
- **Database migrations:** keep all SQL changes in `supabase/migrations/` so a
  fresh project can be rebuilt deterministically.
- **Never commit `.env`** — it is gitignored. Share secrets through Vercel /
  Supabase dashboards or a password manager.
- **Rotate keys** if they ever leak: Supabase Dashboard → API → rotate, then
  update the `VITE_SUPABASE_PUBLISHABLE_KEY` in Vercel and redeploy.
- **Monitor:** enable Vercel Analytics + Supabase log drains for production
  visibility.

---

## 7. Production safety while migrating

Do this in order to avoid downtime:
1. Connect GitHub (sync only, doesn't change anything live).
2. Import to Vercel pointed at a non-production branch first; verify build +
   Google login on the `*.vercel.app` URL.
3. Only then switch your custom domain DNS to Vercel.
4. Keep publishing from Lovable in parallel until Vercel is fully verified.
