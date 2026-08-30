# Yael booking lifecycle automation

The Haya/Forever n8n JSON was **not** imported, activated, or pointed at Haya’s sheet. A Yael-only clone lives in this repo and on `newsite.mavash.net` as an **unpublished** Personal workflow named `Yael Mavashev — תורים`.

## Why not copy the Haya workflow as-is

| Haya (do not reuse) | Yael |
|---|---|
| Google Sheet `Smart Booking — תורים` | Postgres `yael_booking_appointments` via `https://yael.mavash.net/api/n8n/*` |
| Credential `Google Sheets חיה` | No Sheets nodes |
| Green **642** | Green **biz140** (matches 054-808-0140) |
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

## Confirmed Yael copy (from the live site / `yaelContact.ts`)

- Brand: `Yael Mavashev — פדיקור ומניקור`
- Phone / WhatsApp: `054-808-0140` / `972548080140`
- Area: `אשקלון, שכונת נווה הדרים` (exact street is still gated on the site)
- Waze: neighborhood search URL already used on `yael.mavash.net`
- Site: `https://yael.mavash.net/`
- Operator chat id kept from the source workflow: `972544223911@c.us` (Reuven). Not invented. Can be switched to Yael’s `972548080140@c.us` later.

## Repo files

- `n8n/yael-mavashev-booking-lifecycle.workflow.json` — inactive
- `n8n/validate-yael-booking-lifecycle.mjs` — asserts no Haya ids
- `yael-n8n/` — Postgres lifecycle tables, HTTP API, tests, Oracle apply script

## Blocked before Publish

1. Set n8n variable `YAEL_N8N_TOKEN` on **newsite** to the same value as `/home/ubuntu/yael/secrets/yael.env` (never commit it).
2. Confirm Green **biz140** is Yael’s WhatsApp and not another business.
3. Add an approved Yael Fillout public URL in the survey Code node.
4. Add an approved Yael Google review URL (do not invent).
5. Do **not** publish until those are confirmed. Do not execute the workflow against real customers.

## Isolation

- Haya/Forever workflows, `booking.mavash.net`, OpenReply, Evolution, Chatwoot, Portainer: not edited.
- Yael postgres stays on `yael_net` / `127.0.0.1:5435`. n8n reaches data only through the public HTTPS API with a header token.
- No booking form was submitted. No WhatsApp was sent from this change.
