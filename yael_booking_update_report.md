# Yael Booking update report

Host: Oracle `129.159.138.4`. Secrets are not included.

## What was deployed

| Field | Value |
|---|---|
| App path | `/home/ubuntu/yael/app` |
| Previous app backup | `/home/ubuntu/yael/app.bak.20260827-234413` |
| Artifact sha256 | `9c26491a81708e307eecfc4facf5a2f3713ce5570b4698909a745c6e1d7b2146` |
| Service | systemd `yael.service` |
| Port | `127.0.0.1:3025` (`PORT` / `YAEL_APP_PORT`) |
| Secret file | `/home/ubuntu/yael/secrets/yael.env` mode `600` (unchanged contents except not printed) |
| DB | PostgreSQL 16.15, database/schema `yael`, user `yael_app`, container `yael-postgres` (healthy) |
| Notifications | still **disabled** |
| Testimonials rows | **0** (no dummy reviews inserted) |

`pnpm test`: 15 passed. `pnpm check`: ok. `pnpm build`: ok.

## Migrations

Existing `0000_bouncy_banshee` was already applied. The artifact’s `0000_silly_gateway.sql` is a full schema dump and was **not** re-run (would hit `relation already exists`).

Incremental apply:

| Identifier | Result |
|---|---|
| `0000_bouncy_banshee` | already present (hash `977e0977786bc2f9e8741721f06d986bce9e380b73c4f2faa4d1c3d88789367b`) |
| `0001_yael_testimonials` | applied (hash `97d3265edde0d55a87b879046042dd14ebc4779ac4b62907de2290ff02531af6`) |

Table `yael_booking_testimonials` exists (`approved` default false). Public query is approved-only.

## Nginx / TLS

| Check | Result |
|---|---|
| nginx -t | success (pre-existing `api.mavash.net` duplicate-name warnings only) |
| reload | `systemctl reload nginx` after successful `-t` |
| `proxy_pass` | `http://127.0.0.1:3025` (yael block only) |
| Backups | `/etc/nginx/sites-available/yael.mavash.net.bak.20260827-234810`, `/etc/nginx/nginx.conf.bak.20260827-234810` |
| HTTPS | 200, Express, no Vercel headers |
| Cert | `CN=yael.mavash.net`, Let’s Encrypt YE1, 2026-08-27 → **2026-11-25** (existing cert; not reissued) |

No-touch checksums **unchanged** for booking, OpenReply, newsite, n8n, mavash.net, Portainer. Status after: 200 / 200 / 200 / 200 / 200 / **401**.

Postgres still bound `127.0.0.1:5435` only.

## Content checks

| Check | Result |
|---|---|
| `Yael Mavashev` | present |
| Old Mavash AI title/copy | **absent** |
| Reviews UI | empty approved-only: “המלצות אמיתיות בדרך” |
| Booking UI | service/date/slots work; form **not** submitted |
| Google/Apple Calendar | in confirmation UI only; not shown because no booking was created |
| Slot loading copy | present in bundle (`טוענת שעות` / `מחפשת שעות פנויות`) |

## Images (required 200) — blocked

All four URLs return **HTTP 500** `Storage proxy not configured` (`text/html`, 28 bytes):

- `/manus-storage/yael-hero-spa_d491bd84.jpg`
- `/manus-storage/yael-pedicure-detail_d4a4994b.jpg`
- `/manus-storage/yael-manicure-detail_2f9812d6.jpg`
- `/manus-storage/yael-studio-atmosphere_eb67dd3d.jpg`

Cause: app storage proxy needs `BUILT_IN_FORGE_API_URL` and `BUILT_IN_FORGE_API_KEY`. They are **not** in `/home/ubuntu/yael/secrets/yael.env`. Per the artifact instructions, original WebDev images were not copied into `client/public`, not replaced with placeholders, and not downloaded from unknown files.

To finish image 200s: add those two keys to the Yael secret file only (mode 600), then `systemctl restart yael.service`. Do not put them in other services.
