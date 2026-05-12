#!/usr/bin/env bash
# Manual production deploy helper — works WITHOUT Lovable.
#
# Usage:
#   ./scripts/deploy.sh           # deploy to Vercel production
#   TARGET=netlify ./scripts/deploy.sh
#
# Requires .env to be populated (see .env.example).

set -euo pipefail

TARGET="${TARGET:-vercel}"

echo "→ Installing dependencies"
if command -v bun >/dev/null 2>&1; then
  bun install
else
  npm install
fi

echo "→ Type-checking"
npx tsc --noEmit || { echo "Type errors — aborting deploy"; exit 1; }

echo "→ Building production bundle"
if command -v bun >/dev/null 2>&1; then
  bun run build
else
  npm run build
fi

case "$TARGET" in
  vercel)
    echo "→ Deploying to Vercel production"
    npx vercel --prod
    ;;
  netlify)
    echo "→ Deploying to Netlify production"
    npx netlify deploy --prod --dir=dist
    ;;
  *)
    echo "Unknown TARGET: $TARGET (expected vercel|netlify)" >&2
    exit 1
    ;;
esac

echo "✓ Deploy finished"
