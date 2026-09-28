#!/usr/bin/env bash
# Deploy Ashkelon Telegram bot to Oracle (ubuntu@129.159.138.4)
# Usage:
#   export ORACLE_HOST=129.159.138.4
#   export ORACLE_USER=ubuntu
#   export ORACLE_SSH_KEY=~/.ssh/id_rsa
#   # ensure telegram-bot/.env is filled locally (never commit it)
#   ./deploy-oracle.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
HOST="${ORACLE_HOST:-129.159.138.4}"
USER="${ORACLE_USER:-ubuntu}"
KEY="${ORACLE_SSH_KEY:-$HOME/.ssh/id_rsa}"
REMOTE_DIR="${ORACLE_REMOTE_DIR:-/home/${USER}/telegram-bot}"

if [[ ! -f "$KEY" ]]; then
  echo "Missing SSH key: $KEY"
  echo "Set ORACLE_SSH_KEY to your private key for ${USER}@${HOST}"
  exit 1
fi
if [[ ! -f "$ROOT/.env" ]]; then
  echo "Missing $ROOT/.env — copy .env.example and fill secrets first"
  exit 1
fi
if ! grep -q '^TELEGRAM_BOT_TOKEN=.\+' "$ROOT/.env"; then
  echo "TELEGRAM_BOT_TOKEN is empty in .env"
  exit 1
fi

SSH=(ssh -i "$KEY" -o StrictHostKeyChecking=accept-new "${USER}@${HOST}")
SCP=(scp -i "$KEY" -o StrictHostKeyChecking=accept-new)

echo "==> Sync files to ${USER}@${HOST}:${REMOTE_DIR}"
"${SSH[@]}" "mkdir -p '$REMOTE_DIR'"
"${SCP[@]}" \
  "$ROOT/bot.ts" \
  "$ROOT/cleaning-integration.ts" \
  "$ROOT/package.json" \
  "$ROOT/.env" \
  "$ROOT/n8n-cleaning-kanban-workflow.json" \
  "${USER}@${HOST}:${REMOTE_DIR}/"

echo "==> npm install + pm2"
"${SSH[@]}" bash -s <<EOF
set -euo pipefail
cd '$REMOTE_DIR'
command -v node >/dev/null || { curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -; sudo apt-get install -y nodejs; }
npm install
sudo npm install -g pm2 tsx || npm install -g pm2 tsx
# Avoid conflict with n8n Telegram Trigger (ASK-10) on same bot token
pm2 delete ashkelon-bot 2>/dev/null || true
pm2 start bot.ts --name ashkelon-bot --interpreter tsx
pm2 save
pm2 startup systemd -u '$USER' --hp "/home/$USER" 2>/dev/null || true
pm2 status ashkelon-bot
pm2 logs ashkelon-bot --lines 30 --nostream
EOF

echo "==> Done. Send /start to mavash2030_bot"
echo "Note: deactivate n8n ASK-10 Telegram Trigger to avoid getUpdates conflict."
