# n8n Intent Router + Specialist Agents (Image-aligned)

This workflow now follows the node structure you provided:

- `When chat message received`
- `AI Agent` + `OpenRouter Chat Model` + `Structured Output Parser` + `Simple Memory`
- `Switch Intent1`
- specialist HTTP branches:
  - `Billing Agent1`
  - `General Agent1`
  - `Support Agent1`
  - `Service Agent1`
- merge/output:
  - `Build Final Answer1`
  - `Save Memory1`
  - `Respond1`

---

## 1) Router Output Contract

`AI Agent` must return JSON that matches Structured Output Parser schema:

```json
{
  "intent": "billing",
  "confidence": 0.92
}
```

If confidence is below `0.6`, `Switch Intent1` forces route to `general`.

---

## 2) Required Credentials (n8n)

- Create one OpenRouter credential in n8n:
  - **Credential type**: `OpenRouter API`
  - Use your OpenRouter API key
- Attach this credential to all `OpenRouter Chat Model` nodes.

---

## 3) Import & Run

1. Open n8n.
2. Import file:
   - `n8n/workflows/intent-router-openrouter.json`
3. Configure OpenRouter credential in `OpenRouter Chat Model`.
4. Set env vars in n8n runtime:
   - `OPENROUTER_API_KEY`
   - optional: `OPENROUTER_MODEL`
5. Activate workflow and test with chat trigger.

---

## 4) Node Order (as implemented)

1. `When chat message received`
2. `AI Agent` (intent classifier)
3. `Switch Intent1`
4. `Billing Agent1` / `General Agent1` / `Support Agent1` / `Service Agent1`
5. `Build Final Answer1`
6. `Save Memory1`
7. `Respond1`

Sub-node attachments:
- `OpenRouter Chat Model` -> `AI Agent` (`ai_languageModel`)
- `Structured Output Parser` -> `AI Agent` (`ai_outputParser`)
- `Simple Memory` -> `AI Agent` (`ai_memory`)

---

## 5) Telegram / WhatsApp Integration

### Telegram (recommended first)

For Telegram production:
- replace `When chat message received` with `Telegram Trigger`
- map telegram text to `chatInput`
- keep the rest of the flow unchanged

### WhatsApp (Meta or Twilio)

Use WhatsApp webhook as input and map incoming text to `chatInput`.
Reuse same router + switch + specialist HTTP branches.

---

## 6) Production Hardening Checklist

- Add workflow-level **Error Trigger** + alerting
- Add retries/backoff in model calls
- Add request logging (DB/Sheets)
- Add rate limiting per `user_id`
- Replace `Simple Memory` with persistent store (Redis/Postgres) when scaling

---

## 7) Notes on Memory

- Runtime memory for router is via `Simple Memory` node.
- Persistent memory per user is stored in `Save Memory1` (workflow static data), keeping last 5 turns.
- For production scale, move persisted memory to Redis/Postgres/Supabase.
