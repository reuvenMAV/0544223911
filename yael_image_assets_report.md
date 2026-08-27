# Yael local image assets

Host: Oracle `129.159.138.4`. Secrets are not included. Only systemd `yael.service` was rebuilt and restarted.

## What changed

Zip `yael-image-assets.zip` (sha256 `90e6889192e3e3b52065920defb90305eba576ebfba8b0c169200ce6665f65c7`) was placed at `/home/ubuntu/Downloads/yael-image-assets.zip` and extracted to:

`/home/ubuntu/yael/app/client/public/assets/`

`Home.tsx` image `src` values were changed from `/manus-storage/<filename>` to `/assets/<filename>` (4 gallery/hero refs). The logo file is served from `/assets/` as well; it was not previously referenced in the page.

Then `pnpm build` ran in `/home/ubuntu/yael/app` only, followed by `systemctl restart yael.service`. Bind remains `127.0.0.1:3025`. Nginx was not edited.

## Public HTTP 200 checks

| Path | Status | Content-Type | Bytes |
|---|---|---|---|
| `/assets/yael-hero-spa_d491bd84.jpg` | 200 | `image/jpeg` | 164578 |
| `/assets/yael-pedicure-detail_d4a4994b.jpg` | 200 | `image/jpeg` | 278968 |
| `/assets/yael-manicure-detail_2f9812d6.jpg` | 200 | `image/jpeg` | 273558 |
| `/assets/yael-studio-atmosphere_eb67dd3d.jpg` | 200 | `image/jpeg` | 192994 |
| `/assets/yael-mavashev-logo_6c718b1a.png` | 200 | `image/png` | 336614 |

Homepage `https://yael.mavash.net/` is 200. Production JS bundle contains the four `/assets/yael-*.jpg` paths and **zero** `/manus-storage/` image refs.

Old `/manus-storage/yael-hero-spa_d491bd84.jpg` still returns 500 (`Storage proxy not configured`) because forge keys were not added. The live page no longer requests that path.

## No-touch

| Host | Result after Yael restart |
|---|---|
| `booking.mavash.net` | 200 |
| `newsite.mavash.net` | 200 |
| `n8n.mavash.net` | 200 |
| Portainer | 401 |

No `docker compose down`, no volume deletes, no other vhost edits.
