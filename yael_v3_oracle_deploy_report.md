# Yael v3 Oracle deploy report

Host: Oracle `129.159.138.4`. Secrets are not included. No booking form was submitted. n8n / Haya workflows were not imported, published, or run.

## Artifact

| Field | Value |
|---|---|
| URL | `https://files.manuscdn.com/user_upload_by_module/session_file/310419663032660305/qGMLMXteMntgOkqO.tgz` |
| sha256 | `07a5b4682efccc79f8c5e8931ae027bddc25f4cfa63c7ff6b7b900d17935b2a5` |
| Incoming | `/home/ubuntu/yael/.incoming/yael-v3.tgz` |
| App path | `/home/ubuntu/yael/app` |
| Backup | `/home/ubuntu/yael/app.bak.20260830-201152` |
| Service | systemd `yael.service` |
| Bind | `127.0.0.1:3025` (`PORT` / `HOST`; artifact `findAvailablePort` was **not** restored) |
| Secret file | `/home/ubuntu/yael/secrets/yael.env` mode `600` (unchanged) |
| Notifications | `enabled: false`; smoke confirmed `notificationsEnabled === false` |
| Testimonials rows | **0** (no dummy reviews) |

`pnpm install --frozen-lockfile`: ok. `pnpm test`: 16 passed. `pnpm check`: ok. `pnpm build`: ok.

## Migrations

`pnpm drizzle-kit migrate` ran against `postgresql://127.0.0.1:5435/yael` (userinfo omitted) and reported **migrations applied successfully**.

The artifact’s `drizzle/pg/0000_silly_gateway.sql` is a **full schema dump** (sha256 `289f5f13e4f62a4640ae9c850ea54c1a23810c3b44c4e09993c5d00b97aac950`). It was **not** executed (would hit `relation already exists`). The production journal stayed:

| Identifier | Hash | Status |
|---|---|---|
| `0000_bouncy_banshee` | `977e0977786bc2f9e8741721f06d986bce9e380b73c4f2faa4d1c3d88789367b` | already applied |
| `0001_yael_testimonials` | `97d3265edde0d55a87b879046042dd14ebc4779ac4b62907de2290ff02531af6` | already applied |

Table `yael_booking_testimonials` exists. Dump copy kept as `drizzle/pg/0000_silly_gateway.sql.artifact`.

## Site + images

| Check | Result |
|---|---|
| `https://yael.mavash.net/` | 200, title `Yael Mavashev — פדיקור ומניקור` |
| `Yael Mavashev` | present |
| `Mavash AI` | **absent** |
| Cert | `CN=yael.mavash.net`, Let’s Encrypt YE1, 2026-08-27 → 2026-11-25 |
| `/assets/yael-hero-spa_d491bd84.jpg` | 200 `image/webp` 164578 |
| `/assets/yael-pedicure-detail_d4a4994b.jpg` | 200 `image/webp` 278968 |
| `/assets/yael-manicure-detail_2f9812d6.jpg` | 200 `image/webp` 273558 |
| `/assets/yael-studio-atmosphere_eb67dd3d.jpg` | 200 `image/webp` 192994 |
| `/assets/yael-mavashev-logo_6c718b1a.png` | 200 `image/webp` 336614 |
| same four files under `/manus-storage/` | 200 `image/webp` (local fallback so artifact smoke passes) |

UI refs were rewritten `/manus-storage/<file>` → `/assets/<file>` per handoff (no forge keys in Yael secret). Local pack stayed in `client/public/assets/`.

Nginx was **not** edited. Other vhosts untouched.

## Smoke output

Command:

```bash
cd /home/ubuntu/yael/app
SMOKE_BASE_URL=https://yael.mavash.net pnpm smoke
```

```
PASS homepage shell
PASS asset yael-hero-spa_d491bd84.jpg
PASS asset yael-pedicure-detail_d4a4994b.jpg
PASS asset yael-manicure-detail_2f9812d6.jpg
PASS asset yael-studio-atmosphere_eb67dd3d.jpg
PASS notifications remain disabled
PASS public services query
PASS public approved-testimonials query
PASS slots input validation rejects invalid date
PASS admin appointments protected

All safe smoke checks passed. No appointment mutation or notification send was invoked.
```

Exit 0.

## Haya / n8n (artifact docs only — not executed)

Read-only findings from the artifact: one Personal workflow named `חיה - ארכיון Customers מתוך Appointments` (not opened/edited/run). Yael v3 content-drafts workflow (`Yael Mavashev — Content Drafts Only`) was **not** imported or published. Haya/Forever workflows were not changed.

## No-touch after restart

| Host | Status |
|---|---|
| `booking.mavash.net` | 200 |
| `newsite.mavash.net` | 200 |
| `n8n.mavash.net` | 200 |
| Portainer | 401 |

## Rollback

Restore `/home/ubuntu/yael/app.bak.20260830-201152` over `/home/ubuntu/yael/app`, then `systemctl restart yael.service`. Do not drop the database or touch other services.
