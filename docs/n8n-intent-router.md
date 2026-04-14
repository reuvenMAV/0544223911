# n8n Intent Router + Specialist Agents (AI Agent Nodes)

This workflow is aligned to the updated n8n AI stack and the node layout in your screenshot:

- `When chat message received` (Chat Trigger)
- `Router Agent` + `OpenRouter Chat Model` + `Structured Output Parser` + `Simple Memory`
- `Switch Intent`
- 4 specialist branches:
  - `Billing Agent`
  - `General Agent`
  - `Support Agent`
  - `Service Agent`
- each branch has:
  - `OpenRouter Chat Model`
  - `Simple Memory`
  - `Chat` (Send Message)

---

## 1) Data Contract (Router output)

Router agent must return JSON that matches the Structured Output Parser schema:

```json
{
  "intent": "billing",
  "confidence": 0.92
}
```

If confidence is below `0.6`, the Switch routes to `general`.

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
3. In **When chat message received**:
   - keep response mode as `Using Response Nodes`
4. In each OpenRouter Chat Model node:
   - choose model (default in workflow: `openai/gpt-4o-mini`)
5. Activate workflow and test from chat UI.

---

## 4) Node Order (as implemented)

1. When chat message received
2. Normalize Input (Set)
3. Router Agent (AI Agent)
4. OpenRouter Chat Model (Router)
5. Structured Output Parser (intent/confidence schema)
6. Simple Memory (Router)
6. Switch Intent
7. Billing Agent / General Agent / Support Agent / Service Agent (AI Agent nodes)
8. OpenRouter model + Simple Memory per specialist branch
9. Chat Send Message per specialist branch

---

## 5) Telegram / WhatsApp Integration

### Telegram (recommended first)

Two options:

1. Keep current Chat Trigger flow for webchat testing.
2. For Telegram production:
   - replace `When chat message received` with `Telegram Trigger`
   - keep `Normalize Input` mapping (`user_id`, `chatInput`)
   - replace branch `Chat` nodes with `Telegram -> Send Message`.

### WhatsApp (Meta or Twilio)

Use WhatsApp webhook trigger as input, then map incoming payload to:
- `user_id`
- `chatInput`

Reuse the same Router/Switch/Agent branches and send response via your provider send-message API.

---

## 6) Production Hardening Checklist

- Add workflow-level **Error Trigger** + alerting
- Add retries/backoff in model calls
- Add request logging (DB/Sheets)
- Add rate limiting per `user_id`
- Replace `Simple Memory` with persistent store (Redis/Postgres) when scaling

---

## 7) Notes on Memory

Current flow uses `Simple Memory` nodes with:
- `sessionIdType: customKey`
- `sessionKey: {{$('Normalize Input').item.json.user_id}}`
- `contextWindowLength: 5`

This mirrors your visual architecture (memory under each agent block). For high scale or queue-mode deployments, move to external memory storage.
