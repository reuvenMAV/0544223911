# Yael booking lifecycle automation

The Haya/Forever n8n JSON was **not** imported, activated, or pointed at Haya’s sheet. A Yael-only clone lives in this repo (JSON stays `active: false`) and is **published** on `newsite.mavash.net` as Personal workflow `Yael Mavashev — תורים` (`YaelBookLifeCycle01`).

## Why not copy the Haya workflow as-is

| Haya (do not reuse) | Yael |
|---|---|
| Google Sheet `Smart Booking — תורים` | Postgres `yael_booking_appointments` via `https://yael.mavash.net/api/n8n/*` |
| Credential `Google Sheets חיה` | No Sheets nodes |
| Green **642** | **Green account** (`Yt6E9F43cXq2ctMX`) on every Yael WhatsApp node |
| שלהבת חיה / הנביאים 45 / Haya Waze / Haya Google review | Yael Mavashev, אשקלון · נווה הדרים, Yael Waze search, **no invented Google review URL** |
| Owner labels `לחיה` | `ליעל` |
| Webhook `review-rating1` | `yael-review-rating` |

App WhatsApp/email in `server/notifications.ts` stays `enabled: false`. This n8n flow is a separate owner-forward inbox, same pattern as Haya: messages go to the operator, who forwards to the customer.

## Five lanes (same shape, Yael data)

1. Every minute: new rows with `Audit_Log=created` → two WhatsApp texts to the operator → mark `sent`.
2. Daily 09:00 Asia/Jerusalem: tomorrow + status ממתין/מאושר + `sent` → reminder pair → mark `reminder_sent`.
3. Every 5 minutes: status בוצע + empty `Review_Sent` → Fillout forward pair. **Skipped until a Yael Fillout URL is set** (empty constant in the Code node).
4. `POST /webhook/yael-review-rating`: rating ≥ 4 → Google-review forward text (placeholder until a Yael `g.page` link is approved); else low-rating note.
5. Hourly: rebuild customer archive into `yael_n8n_customers` (not Haya’s Customers tab).

## Confirmed Yael copy

- Brand: `Yael Mavashev — פדיקור ומניקור`
- Owner WhatsApp for this workflow (user-confirmed): `054-806-0140` / `972548060140@c.us`
- Area: `אשקלון, שכונת נווה הדרים` (exact street is still gated on the site)
- Waze: neighborhood search URL already used on `yael.mavash.net`
- Site: `https://yael.mavash.net/` public contact is `054-806-0140`.
- Survey form is native on Yael: `https://yael.mavash.net/survey` (Fillout cannot create forms via API).
- Studio login: `https://yael.mavash.net/admin` with `YAEL_ADMIN_PASSWORD` (not committed).

## Repo files

- `n8n/yael-mavashev-booking-lifecycle.workflow.json` — inactive
- `n8n/validate-yael-booking-lifecycle.mjs` — asserts no Haya ids
- `yael-n8n/` — Postgres lifecycle tables, HTTP API, tests, Oracle apply script

## Still open after Publish

1. First real booking after the Green-API 140 switch should deliver to `054-806-0140`. Community credential `Green biz140` returned 401 and was replaced.
2. Add an approved Yael Google review URL (do not invent). `GOOGLE_REVIEW_LINK` is still empty.
3. Native survey is `https://yael.mavash.net/survey`. The n8n rating webhook is `https://newsite.mavash.net/webhook/yael-review-rating` (Fillout-shaped payload). The public survey posts to `/api/survey`, not to that webhook.
4. `YAEL_N8N_TOKEN` is already set on newsite and in `yael.env`.

## Oracle apply (this run)

- Migration `0002_yael_n8n_lifecycle` applied. Tables `yael_n8n_lifecycle` and `yael_n8n_customers` exist in schema `yael`.
- `YAEL_N8N_TOKEN` added to `/home/ubuntu/yael/secrets/yael.env` (mode 600, not printed) and as n8n variable `YAEL_N8N_TOKEN` (length 64).
- `yael.service` rebuilt and restarted. `notifications.ts` still `enabled: false`.
- `GET /api/n8n/appointments` → 401 without token; 200 `{"appointments":[]}` with token.
- Vitest: 21 passed (includes 5 new lifecycle helper tests).
- `SMOKE_BASE_URL=https://yael.mavash.net pnpm smoke` passed, including `n8n appointments require token`.
- n8n-newsite Personal workflow `Yael Mavashev — תורים` id `YaelBookLifeCycle01` imported with **active=false**, then published after user approval.
- Isolation curl: `booking.mavash.net`, `newsite.mavash.net`, `n8n.mavash.net`, `yael.mavash.net` all 200.
- Native survey `https://yael.mavash.net/survey` and studio admin `https://yael.mavash.net/admin` return 200. Studio password login works (cookie `yael_studio`). A verification survey POST returned 200 and the test row was deleted.

## Publish (user approved)

- Guarded SQL: `yael-n8n/scripts/publish-yael-workflow.sql` + `publish-yael-workflow.sh`.
- `workflow_history` + `activeVersionId` + `triggerCount=6` + webhook `POST /webhook/yael-review-rating`.
- Targeted restart of **`n8n-newsite` only**. `/healthz` recovered; `yael` / `booking` / `n8n.mavash.net` stayed 200.
- After publish: `YaelBookLifeCycle01` **active=true**. Minute poller ran three times (`success`, ~150ms) with **0 appointments** — no lifecycle writes, no Green send.
- One accidental empty webhook POST hit `3️⃣ Code: Parse Fillout Rating` and **errored before WhatsApp**.
- Haya archive `חיה - ארכיון Customers...` still inactive. Rating workflow `MuPngG4_mD4gT75l3h5ka` still active and untouched.
- Repo JSON remains `active: false` so a re-import cannot republish by accident.

## First booking (stuck at IF, then Green 401)

- Appointment `#1` existed with `audit_log=created`, but `yael_booking_services` was empty. The public site books from an in-memory catalog, so the n8n join returned an empty `שירות` and `3️⃣ IF: Valid + New?` failed on `service isNotEmpty`.
- Seeded the five catalog services. API now returns `שירות=פדיקור`. IF no longer requires service; normalize falls back to `טיפול`.
- After the IF passed, community node `Green biz140` returned `401`. WhatsApp nodes now use official `@green-api/n8n-nodes-whatsapp-greenapi.greenapi` + `Green-API 140` (`VBzwcT8zWZQJypE4`), already shared to the same Personal project.

## Isolation

- Haya/Forever workflows, `booking.mavash.net`, OpenReply, Evolution, Chatwoot, Portainer: not edited.
- Yael postgres stays on `yael_net` / `127.0.0.1:5435`. n8n reaches data only through the public HTTPS API with a header token.
- No booking form was submitted. No WhatsApp was sent from this change.
