# דומיין OpenReply — mavash.net

האתר הראשי [mavash.net](https://mavash.net) נשאר כמו שהוא (אתר העסק על `129.159.138.4`).
OpenReply רץ על סאב-דומיין פנוי:

**`https://openreply.mavash.net`**

`openreply.mavash.net` עדיין בלי רשומת DNS. `app.mavash.net` כבר מצביע לשרת הקיים — לא משתמשים בו.

## מה להדביק ב-Vercel / Railway / Meta

| שדה | ערך |
| --- | --- |
| `NEXTAUTH_URL` | `https://openreply.mavash.net` |
| `EMAIL_FROM` | `OpenReply <noreply@mavash.net>` |
| App Domains | `openreply.mavash.net` |
| Privacy Policy | `https://openreply.mavash.net/privacy` |
| Terms of Service | `https://openreply.mavash.net/terms` |
| Data deletion | `https://openreply.mavash.net/data-deletion` |
| OAuth redirect | `https://openreply.mavash.net/api/instagram/callback` |
| Webhook callback | `https://openreply.mavash.net/api/webhook` |
| Health | `https://openreply.mavash.net/api/health` |

בלי slash בסוף ה-OAuth וה-webhook.

## DNS (Google Domains — ns-cloud-a*.googledomains.com)

אחרי שיוצרים את פרויקט Vercel ומוסיפים דומיין `openreply.mavash.net`, Vercel מציג CNAME. בדרך כלל:

| Type | Name / Host | Value |
| --- | --- | --- |
| CNAME | `openreply` | `cname.vercel-dns.com` (או הערך המדויק במסך Vercel) |

SSL יוצא אוטומטית אחרי שה-CNAME מתייצב.

## מייל (Resend + Gmail קיים)

ה-MX של `mavash.net` הוא Google — לא לגעת בו, כדי לא לשבור את תיבת הדואר.

ב-Resend מאמתים את `mavash.net` ומוסיפים רק את רשומות ה-TXT/CNAME ש-Resend מבקש לשליחה. אחרי האימות:

```
EMAIL_FROM=OpenReply <noreply@mavash.net>
```

## סדר קצר

1. Deploy ב-Vercel (Root Directory `openreply`)
2. Domains → Add `openreply.mavash.net` → להעתיק CNAME ל-DNS
3. `NEXTAUTH_URL=https://openreply.mavash.net` ב-Vercel וב-Railway
4. להדביק את שורת ה-OAuth וה-webhook ב-Meta
