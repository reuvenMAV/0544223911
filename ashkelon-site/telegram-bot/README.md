# Ashkelon Telegram Bot (Oracle + PM2)

Runs 24/7 on Oracle (`ubuntu@129.159.138.4` / `newsite.mavash.net`) with PM2.

## Files
- `bot.ts` — 8-button menu + `/block` `/status` `/today`
- `cleaning-integration.ts` — Kanban buttons + 6 photos
- `deploy-oracle.sh` — rsync/scp + pm2

## Required secrets
```
TELEGRAM_BOT_TOKEN   # mavash2030_bot (n8n cred 8K4uLUGikVrC2jmD)
TELEGRAM_CHAT_ID_REUVEN=8503731042
TELEGRAM_CHAT_ID_CLEANER=...
NEXT_PUBLIC_SUPABASE_URL=https://ufpgwuyijewmbuevyyby.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
AIRTABLE_API_KEY=pat...   # same as n8n cred 8V0JrT9oUrPlDQul
AIRTABLE_BASE_ID=appSP419jrkoX3u3x
```

## Deploy
```bash
cp .env.example .env   # fill secrets
export ORACLE_SSH_KEY=~/.ssh/id_rsa
./deploy-oracle.sh
```

## Conflict with n8n ASK-10
Only one consumer can poll Telegram `getUpdates`. After Oracle bot is up, deactivate **ASK-10 ניהול מטלגרם** Telegram Trigger (keep webhook `ashkelon-cmd-test` if needed).

## Cleaning trigger from n8n
`POST http://127.0.0.1:5055/trigger-cleaning` with `{ "booking": { ... } }`
