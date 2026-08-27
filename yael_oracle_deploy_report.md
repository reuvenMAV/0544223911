# Yael Oracle deploy report

Host: `instance-r223911m` (`129.159.138.4`).  
Secrets (`YAEL_DATABASE_URL`, passwords, JWT, tokens) are **not** in this file.

## Pre-change baseline (read-only)

| Check | Result |
|---|---|
| DNS A `yael.mavash.net` | `129.159.138.4` (already present; no DNS write) |
| Dedicated nginx `server_name yael.mavash.net` | **absent** |
| HTTPS (curl `-k`) | HTTP/2 200, Vercel headers, ETag `"86909eaceda18273aa7aa08ce1c0fe1f"` |
| Title before | `בניית אתרים, דפי נחיתה וסוכני AI לעסקים – ראובן \| Mavash AI` |
| TLS SNI before | certificate `CN=ai.mavash.net` (default SSL vhost) |
| HTTP 80 before | 301 → `https://yael.mavash.net/` via first SSL/HTTP default (`ai.mavash.net`) |
| `YAEL_APP_PORT` existing runtime | **none** — scan then allocate **3025** (`ss` showed free) |
| Dedicated DB | `yael-postgres` healthy, db/schema `yael`, user `yael_app`, secret `600` |

No-touch HTTP status before:

| Host | Status |
|---|---|
| booking.mavash.net | 200 |
| openreply.mavash.net | 200 |
| newsite.mavash.net | 200 |
| n8n.mavash.net | 200 |
| portainer.mavash.net | 401 |
| mavash.net | 200 |

## Checkout and service

| Field | Value |
|---|---|
| Checkout | `/home/ubuntu/yael/app` |
| Artifact URL | Manus gzip (see instructions); sha256 `ac4b53580115f63ae3817c048b552d4d509b9c0c5dff3c2960c09c164f921cf6` |
| Service | systemd `yael.service` (`/etc/systemd/system/yael.service`) |
| Internal port | `127.0.0.1:3025` only |
| Process | `node dist/index.js`, `NODE_ENV=production` |
| Env file | `/home/ubuntu/yael/secrets/yael.env` mode `600` |
| Postgres | container `yael-postgres`, database/schema `yael`, role `yael_app` |
| Notifications | left **disabled** (appointment-created/changed/cancelled) |

`pnpm test`: 9 passed. `pnpm check`: ok. `pnpm build`: ok.

Local listen patch (backup `server/_core/index.ts.bak.20260827-232201`): bind `HOST=127.0.0.1` and GET `/api/booking/services`. File sha256 after patch: `0a98326e07214c3aa8ae8132e0b68a8fd6ef3e159713dd68b4acf3a2c6f54289`.

## Migration

| Field | Value |
|---|---|
| Command | `pnpm drizzle-kit migrate` with `drizzle.config.ts` dialect `postgresql` / `drizzle/pg` |
| Identifier | **`0000_bouncy_banshee`** |
| Drizzle row | id `1`, hash `977e0977786bc2f9e8741721f06d986bce9e380b73c4f2faa4d1c3d88789367b` |
| Target (non-secret) | hostpath `127.0.0.1:5435/yael` |
| `relation already exists` | no |
| Tables | `yael_booking_*` plus `users` in schema `yael` |

`YAEL_DATABASE_URL` starts with `postgres`; value not printed. Other stacks were not given this env.

## DNS / TLS

DNS was already `A yael.mavash.net → 129.159.138.4`. No extra DNS change.

| Cert | Value |
|---|---|
| subject | `CN=yael.mavash.net` |
| issuer | Let's Encrypt YE1 |
| notBefore | 2026-08-27 19:26:52 GMT |
| notAfter | 2026-11-25 19:26:51 GMT |

## HTTP / HTTPS after switch

| Check | Result |
|---|---|
| `https://yael.mavash.net/` | 200, Express, **no** `x-vercel-*` |
| Marker `Yael Mavashev` | present |
| Marker `Mavash AI` | absent |
| `/api/booking/services` | 200 JSON (5 services) |
| Listen | `127.0.0.1:3025` |
| Browser | homepage, tel `+972548080140`, WhatsApp, Maps search, Waze; form **not** submitted |

## Nginx backups and checksums

| File | Notes |
|---|---|
| `/etc/nginx/nginx.conf.bak.20260827-232426` | identical to live `nginx.conf` (`4f981f731d5a2c6fb27bccc9ca4548077e289795a61c2374c31179fe7f1099e0`) |
| `/etc/nginx/sites-available/yael.mavash.net` | new file; after certbot sha256 `2abbd21e3010908c7cfcf6ad4bfe01de3ee0f4b17f1bae8673b5ab32082b718a` |
| `proxy_pass` | `http://127.0.0.1:3025` |

No-touch site checksums unchanged (booking / openreply / newsite / n8n / mavash.net / portainer). Status after: 200 / 200 / 200 / 200 / 401 / 200.

`nginx -t` succeeded before every reload. Existing `api.mavash.net` duplicate-name warnings were pre-existing.

## Rollback (do not delete DNS, volumes, or DB)

```bash
sudo systemctl stop yael.service
sudo rm -f /etc/nginx/sites-enabled/yael.mavash.net
# no pre-existing yael site to restore; remove the new available file only if reverting the vhost
sudo nginx -t && sudo systemctl reload nginx
```

Code rollback: restore `/home/ubuntu/yael/app/server/_core/index.ts.bak.20260827-232201` and rebuild if needed. Leave `yael-postgres` and `yael-pgdata` in place.

Tested service version: artifact sha256 above + systemd unit `yael.service` + listen `127.0.0.1:3025`.
