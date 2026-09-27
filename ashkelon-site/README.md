# Ashkelon Seaside — Phase1 Core Money + n8n

Next.js site for דירת נופש אשקלון, wired to `n8n.mavash.net` webhooks.

## APIs

| Route | n8n webhook |
|---|---|
| `POST /api/check-availability` (+ captureLead) | `/webhook/lead` |
| `POST /api/new-booking` | `/webhook/new-booking` |
| `POST /api/booking` | alias → new-booking |
| `POST /api/webhook/payplus` | `/webhook/payment-status` (+ success/failed) |
| `POST /api/chat` | `/webhook/chatbot-lead`, `/webhook/chat-to-wa` |
| `POST /api/lead` | `/webhook/lead` |

## Env (Vercel)

```
N8N_WEBHOOK_BASE=https://newsite.mavash.net/webhook
N8N_API_KEY=...
NEXT_PUBLIC_SITE_URL=https://ashkelon-site.vercel.app
NEXT_PUBLIC_WA_NUMBER=972544223911
# Optional later:
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
PAYPLUS_PAYMENT_PAGE_UID=
```

Without Supabase the site still books (creates `ASK-####`) and forwards to n8n.

## Import n8n workflows

```bash
node scripts/build-n8n-workflows.mjs
N8N_API_KEY=xxx npm run import:n8n
```

Activate workflows in n8n UI if activate API is blocked.
