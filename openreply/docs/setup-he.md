# OpenReply — מדריך התקנה (עברית)

מקור באנגלית: [setup.md](setup.md). כאן הסדר המעשי לפריסה מהריפו הזה (`openreply/` כ-Root Directory).

**יעד:** תגובה עם מילת מפתח באינסטגרם → DM אוטומטי עם לינק. בחינם, על התשתית שלך.

**כתובת ייצור:** `https://openreply.mavash.net` על שרת Oracle `129.159.138.4` — ראה [domain-mavash.md](domain-mavash.md). לא Vercel.

## ארכיטקטורה

| רכיב | טכנולוגיה | איפה רץ |
| --- | --- | --- |
| Web app + API + webhook | Next.js | Docker על Oracle, מאחורי nginx |
| Worker (שולח את ה-DM) | Node.js + BullMQ | Docker על אותו שרת |
| DB | PostgreSQL | Docker על אותו שרת |
| תור / rate limit | Redis | Docker על אותו שרת |
| Instagram | Meta Graph API (Instagram Login) | Meta Developer App |

ה-web וה-worker **חייבים** את אותו `DATABASE_URL` (עם host מתאים), אותו `REDIS_URL`, ואותו `ENCRYPTION_KEY`. מפתח שונה = כל שליחה נכשלת בפענוח הטוקן.

## סטטוס

| שלב | מי | סטטוס |
| --- | --- | --- |
| קוד בריפו (`openreply/`) | סוכן | בוצע |
| יצירת סודות (`NEXTAUTH_SECRET`, `CRON_SECRET`, `ENCRYPTION_KEY`, `WEBHOOK_VERIFY_TOKEN`) | אתה — הרץ את הסקריפט | ממתין |
| חשבון Resend + שולח מאומת | אתה | ממתין |
| Railway: Postgres + Redis + worker | אתה | ממתין |
| Vercel: web app | אתה | ממתין |
| אפליקציית Meta + App ID / Secret | אתה ב-[developers.facebook.com](https://developers.facebook.com/apps) | ממתין |
| חיבור Instagram + בדיקת תגובה | אתה | ממתין |

העתק מקומי שלך: `/home/mavash/openreply/`. העותק ב-GitHub הוא `openreply/` בריפו הזה, ומשם פורסים.

---

## 0. יצירת סודות מקומית

מתוך תיקיית `openreply/`:

```bash
chmod +x scripts/generate-secrets.sh
./scripts/generate-secrets.sh
```

הקובץ `.env` לא נכנס ל-git. אותם ערכים של `ENCRYPTION_KEY` / `NEXTAUTH_SECRET` / `CRON_SECRET` / `WEBHOOK_VERIFY_TOKEN` מדביקים גם ב-Vercel וגם ב-Railway.

משתנים שאתה ממלא ידנית אחר כך:

- `RESEND_API_KEY`, `EMAIL_FROM`
- `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `FACEBOOK_APP_SECRET`
- `NEXTAUTH_URL=https://openreply.mavash.net`
- `DATABASE_URL`, `REDIS_URL` (אחרי Railway)

---

## 1. Resend (כניסה במייל)

בלי זה אף אחד לא יכול להתחבר לדשבורד.

1. הירשם ב-[resend.com](https://resend.com)
2. אמת את הדומיין `mavash.net` (הוסף רק TXT/CNAME ש-Resend נותן; **אל תיגע ב-MX של Google**)
3. צור API key
4. שמור:
   - `RESEND_API_KEY=re_...`
   - `EMAIL_FROM=OpenReply <noreply@mavash.net>`

אם יש לך SMTP משלך, אפשר `EMAIL_SERVER` במקום Resend — ראה `.env.example`.

---

## 2. Railway (קודם, כי Vercel צריך את כתובות ה-DB)

1. חשבון + New Project
2. New → Database → PostgreSQL
3. New → Database → Redis
4. New → GitHub Repo → הריפו הזה
5. ב-Settings של שירות ה-worker:
   - **Root Directory:** `openreply`
   - Build / Start כבר מוגדרים ב-`railway.toml`:
     - Build: `npm run db:generate`
     - Start: `npm run worker`
6. Variables — כל המשתנים מ-[טבלת הסביבה](#משתני-סביבה). ל-worker השתמש ב-host הפנימי:
   - Postgres: `*.railway.internal`
   - Redis: `*.railway.internal`
7. `ENCRYPTION_KEY` זהה לזה שב-Vercel.

כתובות:

| משתנה ב-Railway | host | למי |
| --- | --- | --- |
| `DATABASE_URL` | `postgres.railway.internal` | worker בלבד |
| `DATABASE_PUBLIC_URL` | `*.proxy.rlwy.net` | Vercel + מיגרציות מהמחשב |
| `REDIS_URL` / `REDIS_PUBLIC_URL` | אותו עיקרון | worker מול Vercel |

אל תדביק `*.railway.internal` ב-Vercel — זה ייתקע.

מיגרציה חד-פעמית מהמחשב (URL ציבורי):

```bash
cd openreply
DATABASE_URL="postgresql://...proxy.rlwy.net.../railway" npm run db:migrate
```

---

## 3. Vercel (הדומיין הציבורי)

1. New Project ← הריפו הזה
2. **Root Directory:** `openreply`
3. Environment Variables — כל הטבלה, עם:
   - `NEXTAUTH_URL=https://openreply.mavash.net`
   - `DATABASE_URL` / `REDIS_URL` = ה-URL הציבורי מ-Railway
   - אותו `ENCRYPTION_KEY` כמו ב-worker
4. Deploy
5. Vercel → Domains → Add `openreply.mavash.net` → CNAME ב-DNS (פירוט ב-[domain-mavash.md](domain-mavash.md))
6. עדכן ב-Railway את `NEXTAUTH_URL` לאותו דומיין

**לא** שמים את OpenReply על `mavash.net` עצמו — זה אתר העסק החי. הסאב-דומיין `openreply.mavash.net` פנוי. `app.mavash.net` כבר תפוס על אותו שרת.

הדומיין הזה נכנס גם ל-OAuth וגם ל-webhook של Meta. עד שה-CNAME חי, אפשר להתחיל את האפליקציה ב-Meta בלי App Domains, ואז למלא.

---

## 4. אפליקציית Meta (Instagram Graph API)

זה החלק האיטי. הקוד עובד; בלי ההגדרות האלה אין webhook ואין התחברות.

### 4.1 דרישות מקדימות

- חשבון Facebook
- אינסטגרם **Business או Creator** (לא אישי). באינסטגרם: Settings → Account type
- כתובת ליצירת קשר: `bitreuven@gmail.com`

### 4.2 התחבר עם Facebook

1. פתח [developers.facebook.com](https://developers.facebook.com/)
2. התחבר עם חשבון Facebook

### 4.3 צור App חדש

1. **My Apps** → **Create App**
2. כששואלים use case: סנן ל-**All**, בחר **Manage messaging and content on Instagram**
   - **אל תבחר** "Authenticate with Facebook Login"
   - **אל תבחר** "Create and manage ads with Marketing API"
   - OpenReply משתמש ב-**Instagram Login**. בחירה ב-Facebook Login שוברת את ה-OAuth אחר כך (`client` לא תואם)
3. App Name: `OpenReply`
4. Contact Email: `bitreuven@gmail.com`
5. **Create App**

אם הקונסול הישן מציע רק "Business" → Next, אפשר להמשיך, ואז **חובה** להוסיף את מוצר Instagram עם **API setup with Instagram login** (לא Facebook login).

### 4.4 הוסף Instagram product

1. בדף ה-App → **Add Products** (אם עדיין לא נוסף)
2. Instagram → **Set Up**
3. בחר **Instagram Graph API** / **API setup with Instagram login**

### 4.5 הגדרות Basic

1. Settings → **Basic**
2. App Domains: `openreply.mavash.net` (בלי `https://`)
3. Privacy Policy URL: `https://openreply.mavash.net/privacy` (לפני Publish; בינתיים אפשר לדלג)
4. Terms of Service URL: `https://openreply.mavash.net/terms`
5. Data deletion: `https://openreply.mavash.net/data-deletion`
6. App Icon: אפשר לדלג
7. **Save Changes**

### 4.6 שלושת הסודות (לא רק App ID אחד)

יש **שני מזהים** ו**שני secrets**. זה המקום שכולם מתבלבלים.

| משתנה ב-.env | איפה בקונסול |
| --- | --- |
| `INSTAGRAM_APP_ID` | Instagram → API setup with Instagram login. מספר כמו `2036...` |
| `INSTAGRAM_APP_SECRET` | אותו מסך, **Show** |
| `FACEBOOK_APP_SECRET` | Settings → Basic → App secret, **Show** |

`INSTAGRAM_APP_ID` **אינו** ה-App ID מדף Basic. OpenReply מאמת חתימות webhook מול שני ה-secrets — תמלא את שניהם.

רשום אצלך (אל תעלה ל-git):

```
INSTAGRAM_APP_ID=
INSTAGRAM_APP_SECRET=
FACEBOOK_APP_SECRET=
```

ה-App ID מדף Basic (Facebook) נשמר לידיעה בלבד; הוא לא מחליף את `INSTAGRAM_APP_ID`.

### 4.7 Tester — בלי זה תקבל "Insufficient Developer Role"

חצי 1, ב-Meta: App roles → Roles (או Instagram → Generate access tokens) → Instagram testers → הוסף את **שם המשתמש המדויק** באינסטגרם → שלח הזמנה.

חצי 2, באינסטגרם (הטלפון הכי קל):

1. פרופיל → תפריט → Settings and activity
2. Apps and websites
3. Tester invites
4. אשר את ההזמנה מהאפליקציה

עד האישור באינסטגרם החשבון **לא** tester.

### 4.8 OAuth redirect

Instagram → Set up Instagram business login → Business login settings.

OAuth redirect URIs — בדיוק, בלי slash בסוף:

```
https://openreply.mavash.net/api/instagram/callback
```

אין צורך ב-Embed URL של Meta. החיבור נעשה מדשבורד OpenReply: Settings → Connect Instagram.

### 4.9 Webhook

Callback URL:

```
https://openreply.mavash.net/api/webhook
```

Verify token: הערך של `WEBHOOK_VERIFY_TOKEN`.

Verify and save. אם הכפתור אפור — הדבק שוב את הטוקן.

Subscribe לשדה **`comments`**. לסטוריז / DM triggers גם **`messages`**.

בדיקה: Test ליד `comments` → **Send to My Server** (שני לחיצות). אמורה להופיע שורה בטבלת `WebhookEvent`.

### 4.10 Publish

Webhooks אמיתיים מגיעים רק כשהאפליקציה **Live**. במצב Development רק כפתור Test שולח.

Publish → מלא Privacy / Terms / Data deletion בכתובות מ-4.5 → Publish.

לחשבון שלך בלבד (tester) לרוב אין צורך ב-App Review. לחשבונות זרים — כן. ראה `META_APP_REVIEW.md`.

---

## משתני סביבה

| משתנה | מה זה |
| --- | --- |
| `NEXTAUTH_URL` | `https://openreply.mavash.net` |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `CRON_SECRET` | מגן על cron של רענון טוקנים |
| `ENCRYPTION_KEY` | 64 תווי hex. זהה ב-web וב-worker |
| `DATABASE_URL` | Postgres (ציבורי ב-Vercel, פנימי ב-worker) |
| `REDIS_URL` | Redis TCP (לא HTTP-only) |
| `RESEND_API_KEY` | מפתח Resend |
| `EMAIL_FROM` | `OpenReply <noreply@mavash.net>` אחרי אימות Resend |
| `META_GRAPH_API_VERSION` | למשל `v25.0` |
| `INSTAGRAM_APP_ID` | ממוצר Instagram Login |
| `INSTAGRAM_APP_SECRET` | ממוצר Instagram Login |
| `FACEBOOK_APP_SECRET` | מ-Settings → Basic |
| `WEBHOOK_VERIFY_TOKEN` | אותו ערך ב-Meta webhook |

---

## בדיקה מקצה לקצה

1. האפליקציה Live, והחשבון אישר tester invite
2. OpenReply → Settings → Connect Instagram (מסך הסכמה, לא שגיאת Developer Role)
3. קמפיין על פוסט עם מילת מפתח `TEST`
4. מחשבון אינסטגרם **אחר** תגובה `TEST` (המערכת מתעלמת מהתגובות שלך)
5. בדוק DM + דף DM Logs + `/api/health`

`/api/health` חייב `worker.healthy: true`. אם false — ה-worker לא רץ או לא מגיע ל-Redis, וה-DM לא יישלח גם אם ה-webhook הגיע.

---

## הרצה מקומית (אופציונלי)

צריך Docker ל-Postgres + Redis:

```bash
cd openreply
cp .env.example .env   # או ./scripts/generate-secrets.sh
docker compose up -d
npm install
npm run db:generate
npm run db:migrate
npm run dev            # טרמינל 1
npm run worker         # טרמינל 2
```

ל-webhook מקומי: `ngrok http 3000` ואותו URL ב-Meta וב-`NEXTAUTH_URL`.

---

## מה לשלוח לי בהודעה הבאה כדי להמשיך

אחרי שתסיים שלב, הדבק **רק** את מה שחסר (בלי secrets מיותרים אם אפשר):

1. אישור שה-CNAME של `openreply.mavash.net` מחובר ל-Vercel
2. אישור ש-Railway worker רץ
3. `INSTAGRAM_APP_ID` (המספר הציבורי בסדר) — את ה-secrets שמור ב-Vercel/Railway
4. צילום מסך אם מסך Meta לא תואם למדריך

סובב כל secret שהודבק בצ'אט לפני שימוש אמיתי.
