# דומיין OpenReply — mavash.net

האתר הראשי [mavash.net](https://mavash.net) נשאר כמו שהוא (אתר העסק על `129.159.138.4`).
OpenReply רץ על סאב-דומיין פנוי:

**`https://openreply.mavash.net`**

`app.mavash.net` כבר מצביע לשרת הקיים — לא משתמשים בו.

## מצב DNS עכשיו (25 באוגוסט 2026)

הרשומה קיימת, אבל היא **A → `129.159.138.4`** (אותו שרת nginx של `mavash.net`), לא CNAME ל-Vercel.

מה שקורה בפועל:

- תעודת SSL שמוחזרת היא של `ai.mavash.net` — הדפדפן מציג שגיאת תעודה
- nginx מפנה כברירת מחדל לאתר אחר (Vercel מאחורי הפרוקסי), **לא** OpenReply
- Meta לא תוכל לאמת webhook על הכתובת הזו עד שיש SSL תקין על `openreply.mavash.net`

### תיקון

1. ב-Vercel: הפרויקט של OpenReply, Root Directory `openreply`, אחרי דיפלוי: **Settings → Domains → Add** `openreply.mavash.net`
2. ב-Google Domains: **מחק** את רשומת ה-A של `openreply`
3. הוסף במקומה:

| Type | Name / Host | Value |
| --- | --- | --- |
| CNAME | `openreply` | הערך ש-Vercel מציג (בדרך כלל `cname.vercel-dns.com`) |

לא להשאיר A ו-CNAME על אותו שם. אחרי שה-CNAME חי, `https://openreply.mavash.net/api/health` אמור להיפתח בלי אזהרת SSL.

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

אין להשתמש ב-A לאותו IP של `mavash.net`. רק CNAME ל-Vercel:

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
