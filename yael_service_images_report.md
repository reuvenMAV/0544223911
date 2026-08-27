# Yael service card images

Each of the five booking services now has a photo on the public card.

| Slug | Service | Image |
|---|---|---|
| `pedicure` | פדיקור | `/assets/yael-pedicure-detail_d4a4994b.jpg` (original) |
| `manicure` | מניקור | `/assets/yael-manicure-detail_2f9812d6.jpg` (original) |
| `mini-pedicure` | מיני פדיקור | `/assets/yael-service-mini-pedicure.jpg` |
| `gel-polish` | לק גל | `/assets/yael-service-gel-polish.jpg` |
| `pedicure-manicure` | פדיקור + מניקור | `/assets/yael-service-pedicure-manicure.jpg` |

Mapped in `/home/ubuntu/yael/app/client/src/lib/yaelServiceImages.ts`. No database migration. `pnpm test`: 16 passed. Only `yael.service` rebuilt/restarted. booking 200, Portainer 401.
