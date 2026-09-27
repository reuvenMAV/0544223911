#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
npm install
node scripts/build-n8n-workflows.mjs
npm run build
npx vercel --prod --yes --name ashkelon-site
echo "Set ENV in Vercel: N8N_WEBHOOK_BASE=https://newsite.mavash.net/webhook"
echo "Then: N8N_API_KEY=... npm run import:n8n"
