#!/usr/bin/env bash
# Run ON the Oracle box as ubuntu (instance-r223911m).
# Installs OpenReply under /home/ubuntu/openreply-app, nginx vhost, and Let's Encrypt.
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/reuvenMAV/0544223911.git}"
BRANCH="${BRANCH:-cursor/openreply-instagram-setup-eb64}"
APP_DIR="${APP_DIR:-/home/ubuntu/openreply-app}"
DOMAIN="openreply.mavash.net"

if [[ $EUID -eq 0 ]]; then
  echo "Run as ubuntu, not root (the script uses sudo)." >&2
  exit 1
fi

sudo apt-get update -y
sudo apt-get install -y git nginx certbot python3-certbot-nginx openssl rsync

if ! command -v docker >/dev/null 2>&1; then
  sudo apt-get install -y docker.io docker-compose-plugin || sudo apt-get install -y docker.io docker-compose
fi

sudo usermod -aG docker "$USER" || true
sudo mkdir -p /var/www/html

TMP="$(mktemp -d)"
git clone --depth 1 --branch "$BRANCH" --single-branch "$REPO_URL" "$TMP/repo"
mkdir -p "$APP_DIR"
rsync -a --delete --exclude '.env' "$TMP/repo/openreply/" "$APP_DIR/"
rm -rf "$TMP"

cd "$APP_DIR"

if [[ ! -f .env ]]; then
  POSTGRES_PASSWORD="$(openssl rand -hex 24)"
  NEXTAUTH_SECRET="$(openssl rand -base64 32)"
  CRON_SECRET="$(openssl rand -base64 32)"
  ENCRYPTION_KEY="$(openssl rand -hex 32)"
  WEBHOOK_VERIFY_TOKEN="$(openssl rand -hex 16)"
  cat > .env <<EOF
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
NEXTAUTH_URL=https://${DOMAIN}
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
CRON_SECRET=${CRON_SECRET}
ENCRYPTION_KEY=${ENCRYPTION_KEY}
WEBHOOK_VERIFY_TOKEN=${WEBHOOK_VERIFY_TOKEN}
DATABASE_URL=postgresql://openreply:${POSTGRES_PASSWORD}@postgres:5432/openreply
REDIS_URL=redis://redis:6379
RESEND_API_KEY=re_replace_me
EMAIL_FROM=OpenReply <noreply@mavash.net>
META_GRAPH_API_VERSION=v25.0
INSTAGRAM_APP_ID=pending
INSTAGRAM_APP_SECRET=pending
FACEBOOK_APP_SECRET=pending
EOF
  chmod 600 .env
  echo "Wrote $APP_DIR/.env — fill RESEND_API_KEY and Meta secrets."
fi

sudo cp deploy/oracle/nginx.openreply.conf /etc/nginx/sites-available/openreply.mavash.net
sudo ln -sfn /etc/nginx/sites-available/openreply.mavash.net /etc/nginx/sites-enabled/openreply.mavash.net
sudo nginx -t
sudo systemctl reload nginx

compose() {
  if sudo docker compose version >/dev/null 2>&1; then
    sudo docker compose "$@"
  else
    sudo docker-compose "$@"
  fi
}

compose -f docker-compose.oracle.yml --env-file .env up -d --build

if [[ ! -d /etc/letsencrypt/live/${DOMAIN} ]]; then
  sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m bitreuven@gmail.com --redirect || \
    echo "certbot failed — confirm DNS A ${DOMAIN} -> this host, then rerun certbot"
fi

echo "Health (local):"
curl -sS -m 10 http://127.0.0.1:3011/api/health || true
echo
echo "Done. Public: https://${DOMAIN}/api/health"
