# OpenReply על שרת Oracle — 129.159.138.4

האתר הראשי [mavash.net](https://mavash.net) נשאר כמו שהוא.
OpenReply רץ **על אותו שרת nginx**, לא על Vercel:

**`https://openreply.mavash.net`** → `127.0.0.1:3011` (Docker)

DNS כבר נכון: A → `129.159.138.4`. אין לשנות ל-CNAME של Vercel.

## SSH מהסוכן

פורט 22 פתוח (`ubuntu@129.159.138.4`). אין מפתח פרטי באף אתר/ריפו קודם.
כדי לתת גישה, על השרת (מסשן SSH קיים):

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIF28PNdkjr9ninTkazhWQJeDQqvciQdcwQpq///2igmr openreply-cloud-agent' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

או הרצה מקומית בלי לתת גישה:

```bash
curl -fsSL https://raw.githubusercontent.com/reuvenMAV/0544223911/cursor/openreply-instagram-setup-eb64/openreply/deploy/oracle/install.sh | bash
```

## אחרי ההתקנה

| שדה | ערך |
| --- | --- |
| `NEXTAUTH_URL` | `https://openreply.mavash.net` |
| App Domains | `openreply.mavash.net` |
| OAuth | `https://openreply.mavash.net/api/instagram/callback` |
| Webhook | `https://openreply.mavash.net/api/webhook` |
| Privacy | `https://openreply.mavash.net/privacy` |
| Terms | `https://openreply.mavash.net/terms` |
| Health | `https://openreply.mavash.net/api/health` |

מלא ב-`/home/ubuntu/openreply-app/.env` את `RESEND_API_KEY` ושלושת סודות Meta, ואז:

```bash
cd /home/ubuntu/openreply-app
sudo docker compose -f docker-compose.oracle.yml --env-file .env up -d
```
