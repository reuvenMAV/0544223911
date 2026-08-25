#!/usr/bin/env bash
# Generate local .env from .env.example with fresh secrets.
# Does not overwrite an existing .env. Never commit .env.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  echo "openreply/.env already exists — not overwriting."
  echo "Delete it first if you want a fresh file."
  exit 1
fi

if [[ ! -f .env.example ]]; then
  echo "Missing .env.example" >&2
  exit 1
fi

NEXTAUTH_SECRET="$(openssl rand -base64 32)"
CRON_SECRET="$(openssl rand -base64 32)"
ENCRYPTION_KEY="$(openssl rand -hex 32)"
WEBHOOK_VERIFY_TOKEN="$(openssl rand -hex 16)"

python3 - "$NEXTAUTH_SECRET" "$CRON_SECRET" "$ENCRYPTION_KEY" "$WEBHOOK_VERIFY_TOKEN" <<'PY'
import pathlib
import sys

nextauth, cron, enc, webhook = sys.argv[1:5]
src = pathlib.Path(".env.example").read_text()
replacements = {
    "NEXTAUTH_SECRET=replace-with-a-strong-random-secret": f"NEXTAUTH_SECRET={nextauth}",
    "CRON_SECRET=replace-with-a-strong-random-secret": f"CRON_SECRET={cron}",
    "ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef": f"ENCRYPTION_KEY={enc}",
    "WEBHOOK_VERIFY_TOKEN=replace-with-a-webhook-verify-token": f"WEBHOOK_VERIFY_TOKEN={webhook}",
}
for old, new in replacements.items():
    if old not in src:
        raise SystemExit(f"placeholder not found in .env.example: {old}")
    src = src.replace(old, new, 1)
pathlib.Path(".env").write_text(src)
PY

chmod 600 .env
echo "Wrote openreply/.env with generated secrets."
echo "Fill RESEND_API_KEY, EMAIL_FROM, INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET, FACEBOOK_APP_SECRET next."
echo "Use the same ENCRYPTION_KEY on Vercel and Railway."
