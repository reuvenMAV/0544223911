# Yael production smoke

Command run on Oracle in `/home/ubuntu/yael/app`:

```bash
SMOKE_BASE_URL=https://yael.mavash.net pnpm smoke
```

The deployed package had no `smoke` script. Added `/home/ubuntu/yael/app/scripts/smoke.mjs` and `"smoke": "node scripts/smoke.mjs"` in Yael `package.json` only. No booking form was submitted. `yael.service` was not restarted for this script.

## Result: passed (exit 0)

```
PASS  GET / -> 200 (368173 bytes)
PASS  HTML marker Yael Mavashev
PASS  Mavash AI absent
PASS  GET /assets/index-Cc47NKsD.js -> 200
PASS  bundle refs /assets/yael-hero-spa_d491bd84.jpg
PASS  bundle refs /assets/yael-pedicure-detail_d4a4994b.jpg
PASS  bundle refs /assets/yael-manicure-detail_2f9812d6.jpg
PASS  bundle refs /assets/yael-studio-atmosphere_eb67dd3d.jpg
PASS  bundle has no /manus-storage/yael- refs
PASS  phone 054-808-0140 / WhatsApp present
PASS  empty testimonials copy present
PASS  GET /assets/yael-hero-spa_d491bd84.jpg -> 200 image/jpeg 164578
PASS  GET /assets/yael-pedicure-detail_d4a4994b.jpg -> 200 image/jpeg 278968
PASS  GET /assets/yael-manicure-detail_2f9812d6.jpg -> 200 image/jpeg 273558
PASS  GET /assets/yael-studio-atmosphere_eb67dd3d.jpg -> 200 image/jpeg 192994
PASS  GET /assets/yael-mavashev-logo_6c718b1a.png -> 200 image/png 336614
PASS  GET /api/booking/services -> 200 (5 services)

smoke passed against https://yael.mavash.net
```

Copy of the script: `scripts/yael-smoke.mjs`.

Re-run after the WebP Content-Type + header logo fix: **passed**. Assets now report `image/webp`. Logo is referenced in the bundle. `/manus-storage/yael-hero-spa_d491bd84.jpg` is 200 from the local file.
