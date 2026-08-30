#!/usr/bin/env bash
# Sync production env vars to mora-anglit (names only in output).
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT="${VERCEL_PROJECT:-mora-anglit}"

require() {
  if [[ -z "${!1:-}" ]]; then
    echo "Missing $1" >&2
    exit 1
  fi
}

add_env() {
  local name="$1"
  local value="$2"
  local env="${3:-production}"
  if npx vercel env ls "$env" 2>/dev/null | grep -q "^ ${name} "; then
    echo "skip (exists): $name"
  else
    printf '%s' "$value" | npx vercel env add "$name" "$env" --force
    echo "added: $name"
  fi
}

npx vercel link --project "$PROJECT" --yes >/dev/null

if [[ -n "${SUPABASE_URL:-}" ]]; then
  add_env SUPABASE_URL "$SUPABASE_URL"
fi
if [[ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  add_env SUPABASE_SERVICE_ROLE_KEY "$SUPABASE_SERVICE_ROLE_KEY"
fi
if [[ -n "${N8N_WEBHOOK_SECRET:-}" ]]; then
  add_env N8N_WEBHOOK_SECRET "$N8N_WEBHOOK_SECRET"
fi
if [[ -n "${N8N_WEBHOOK_URL:-}" ]]; then
  add_env N8N_WEBHOOK_URL "$N8N_WEBHOOK_URL" production config 2>/dev/null || \
    printf '%s' "$N8N_WEBHOOK_URL" | npx vercel env add N8N_WEBHOOK_URL production --type config
fi

if [[ "${SWITCH_TO_N8N:-}" == "1" ]]; then
  require N8N_WEBHOOK_URL
  require N8N_WEBHOOK_SECRET
  npx vercel env rm COACH_BACKEND production --yes 2>/dev/null || true
  printf 'n8n' | npx vercel env add COACH_BACKEND production
  echo "COACH_BACKEND=n8n"
fi

echo "Redeploy with: cd .. && npx vercel --prod --yes"
echo "Project: $PROJECT"
