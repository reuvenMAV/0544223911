# Telegram Bot — English Coach (Shlish)

**Bot display name:** Shlish  
**Bot username:** `@ShlishBot`  
**n8n workflow:** https://dev.n8n.mavash.net/workflow/aMINGA4gK6JD0Yvj  
**Web app:** https://mora-anglit.vercel.app

Telegram is an additional channel to the same coach. Teaching logic stays in `english-coach-chat` (n8n + MiMo). Progress is stored in Supabase.

## Architecture

```text
Telegram Bot
    ↓ HTTPS webhook
n8n (english-coach-telegram)  OR  Next.js /api/telegram/handle
    ↓ normalize + idempotency
english-coach-chat (n8n)
    ↓
Xiaomi MiMo + Supabase
    ↓
Inline Keyboard reply → Telegram Bot API
```

## 1. Create the bot (BotFather)

1. Open [@BotFather](https://t.me/BotFather) in Telegram.
2. `/newbot` → choose display name and username (e.g. `@YourEnglishCoachBot`).
3. Save the **bot token** — never commit it to Git.

## 2. Secure credentials

| Variable | Where | Notes |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | n8n credential **or** Vercel env (server only) | Required to send messages |
| `TELEGRAM_WEBHOOK_SECRET` | n8n + Vercel | Optional; validates `X-Telegram-Webhook-Secret` |
| `TELEGRAM_BOT_USERNAME` | Vercel (public name only) | `ShlishBot` — no token |
| `N8N_WEBHOOK_URL` | Vercel | Points to `english-coach-chat` |
| `N8N_WEBHOOK_SECRET` | Vercel + n8n | Shared webhook auth |
| `SUPABASE_URL` | Vercel + n8n | Progress + telegram tables |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel + n8n | Server only |
| `COACH_BACKEND` | Vercel | Set `n8n` for production Telegram |
| `NEXT_PUBLIC_SITE_URL` | Vercel | Used by `/web` command |

**Never** put `TELEGRAM_BOT_TOKEN`, MiMo keys, or Supabase service role in client code or `NEXT_PUBLIC_*`.

## 3. Supabase migration

Run after `001_init.sql`:

```bash
# In Supabase SQL editor
supabase/migrations/002_telegram.sql
```

Tables: `telegram_learners`, `telegram_updates`, `telegram_link_codes`, `telegram_callback_tokens`, `telegram_message_log`.

## 4. Import n8n workflows

1. Import `english-coach-chat.workflow.json` (if not already).
2. Import `english-coach-telegram.workflow.json`.
3. Attach credentials:
   - **Telegram Bot** → `TELEGRAM_BOT_TOKEN`
   - **Xiaomi MiMo** → OpenAI-compatible, `mimo-v2.5-pro`, `https://api.xiaomimimo.com/v1`, `responsesApiEnabled: false`
   - **Supabase** → service role (for Load/Save nodes when implemented)

## 5. Webhook setup (HTTPS only)

### Option A — Telegram → n8n (recommended for Shlish)

1. Open the workflow: https://dev.n8n.mavash.net/workflow/aMINGA4gK6JD0Yvj
2. Ensure Telegram credential for **Shlish** (`@ShlishBot`) is attached.
3. Activate the workflow (Production).
4. Copy the production webhook URL (example shape):
   `https://dev.n8n.mavash.net/webhook/<path-from-trigger>`
5. Set n8n env / workflow vars:
   - `NEXT_APP_URL=https://mora-anglit.vercel.app`
   - `TELEGRAM_BOT_USERNAME=ShlishBot`
   - `TELEGRAM_WEBHOOK_SECRET=<shared-secret>`
6. Register webhook with Telegram (replace TOKEN and PATH; do not commit the token):

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://dev.n8n.mavash.net/webhook/<path-from-trigger>",
    "secret_token": "<TELEGRAM_WEBHOOK_SECRET>",
    "allowed_updates": ["message", "callback_query"]
  }'
```

### Option B — Telegram → Vercel (shared TypeScript processor)

Point webhook to:

`https://mora-anglit.vercel.app/api/telegram/handle`

Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET` on Vercel. Telegram sends `secret_token` as header `X-Telegram-Bot-Api-Secret-Token` (also accepted as `X-Telegram-Webhook-Secret`).

## 6. Link web account to Telegram

1. On the website `/chat`, click **צור קוד קישור**.
2. In Telegram send: `/link AB12CD` (6-character code, 10 minutes, one-time).
3. Default for new Telegram users: new internal `learnerId` unless linked.

## 7. Commands

| Command | Behavior |
|---|---|
| `/start` | Create/load learner, start onboarding |
| `/help` | Short usage guide |
| `/progress` | Phase, lesson, estimated level |
| `/stop` | Pause learning messages |
| `/web` | Link to website |
| `/link <code>` | One-time link to web learner |

## 8. Test vs production bot

- Create a separate bot in BotFather for testing.
- Use a separate n8n workflow or Vercel preview env.
- Do **not** send real messages in automated tests without `TELEGRAM_TEST_CHAT_ID`.

## 9. Disable / rollback

```bash
# Remove webhook
curl "https://api.telegram.org/bot<TOKEN>/deleteWebhook"

# Deactivate n8n workflow
# Remove TELEGRAM_BOT_TOKEN from Vercel
```

## 10. Run tests

```bash
cd english-coach-web
npm run lint
npm run typecheck
npm test
npm run build
```

Telegram-specific tests: `tests/unit/telegram-*.test.ts`, `tests/api/telegram-link-route.test.ts`, `tests/security/telegram-secrets.test.ts`.

## 11. Monitoring

Each Telegram message logs (masked IDs only): `requestId`, `update_id`, phase, versions, response time, `errorCode`. Full chat content is **not** stored in routine logs.
