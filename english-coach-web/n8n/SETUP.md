# n8n setup — english-coach-chat

## Goal

Wire the Next.js app (`COACH_BACKEND=n8n`) to an n8n webhook that runs Xiaomi MiMo and persists progress in Supabase.

## Steps

1. Import `english-coach-chat.workflow.json` into n8n.
2. Create credential **Xiaomi MiMo**:
   - Type: OpenAI-compatible / Header Auth with `Authorization: Bearer <key>`
   - Base URL: `https://api.xiaomimimo.com/v1`
   - Model: `mimo-v2.5-pro`
   - Do **not** enable Responses API (`responsesApiEnabled: false`)
3. Set workflow env / n8n env:
   - `N8N_WEBHOOK_SECRET`
   - Supabase URL + service role (in the Load/Save nodes)
4. Activate the workflow and copy the Production Webhook URL.
5. In Vercel / `.env.local`:
   ```bash
   COACH_BACKEND=n8n
   N8N_WEBHOOK_URL=https://<your-n8n>/webhook/english-coach-chat
   N8N_WEBHOOK_SECRET=<same-secret>
   SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```
6. Apply `supabase/migrations/001_init.sql` in your Supabase project.

## Local MVP without n8n

Keep `COACH_BACKEND=local` (default). The Next.js server runs the built-in coach engine so onboarding → placement → lesson 1 → recap works without external credentials.

## Fallback

Do not connect NVIDIA/Groq unless explicitly requested after Xiaomi failures.
