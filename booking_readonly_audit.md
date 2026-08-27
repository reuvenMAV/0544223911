# בדיקת read-only: `booking.mavash.net`

תאריך בדיקה: 2026-08-27 (UTC).  
יעד עתידי **לתיעוד בלבד** (לא הוזן לאתר): אשקלון, נווה הדרים; טלפון `054-808-0140`. WhatsApp לא אומת.

**read-only בלבד; לא בוצעו שינויים ולא נשלחו פעולות עם side effect.**

לא בוצע: POST ל־`/api/appointments` / `/api/availability` / `/api/complete`, שליחת טופס, בחירת תור, WhatsApp, email, webhook, restart, deploy, commit לפרודקשן, שינוי DNS/Nginx/env.

קובץ ההוראות `/home/ubuntu/cursor_booking_readonly_audit_he.md` **לא נמצא** על הסוכן וגם לא ב־`$HOME` של Oracle. הבדיקה בוצעה לפי הודעת המשתמש וההוראה שבתור.

---

## 1. מקור האתר והתשתית

| שדה | ערך |
| --- | --- |
| DNS/IP | A `booking.mavash.net` → `129.159.138.4` (TTL 300). אין AAAA/CNAME |
| Certificate | Let’s Encrypt, CN/SAN=`booking.mavash.net`, 27 Aug 2026 → 25 Nov 2026 |
| HTTP | `:80` → 301 HTTPS |
| Hosting/provider | Oracle nginx (reverse proxy) + **Vercel** origin `forever-booking.vercel.app` (`x-vercel-cache`, `x-vercel-id` fra1) |
| Nginx | `/etc/nginx/sites-enabled/booking.mavash.net` — `proxy_pass https://forever-booking.vercel.app`, Host header ל־Vercel |
| Repository/path | **לא נמצא** git מקומי של הפרויקט ב־Oracle או בריפו `0544223911`. קוד הלקוח החי הוא סטטי+JS ב־Vercel. עותק ישן: `/home/ubuntu/client-booking.html` (לא בהכרח הגרסה החיה) |
| Framework | HTML סטטי + JS ונילה (`/js/booking-app.js`) + Bootstrap 5.3.3. תמונות: ibb.co + `/images/logo.png` |
| Deployment | Vercel (frontend+serverless `/api/*`). Oracle רק TLS/proxy. `last-modified` HTML ~13:33 UTC; JS ~15:06 UTC ביום הבדיקה |
| Backend | Vercel serverless: `/api/slots`, `/api/appointments`, `/api/availability`, `/api/complete`, `/api/marketing`, `/api/config` |
| Database | לא חשוף בצד לקוח. שגיאת slots: `Requested entity was not found` — אופייני ל־**Google Calendar / Google Sheets** עם מזהה חסר. אדמין מנהל זמינות דרך `/api/availability` |
| Storage | לוגו ב־Vercel `/images/logo.png`; הירו/גלריה ב־imgbb |
| Auth | דף ציבורי ללא התחברות. דף `/admin` דורש `?key=` שנשלח כ־`X-Admin-Key`. GET לרשימת תורים מחזיר 401 בלי מפתח |
| Current version | ETag HTML `e449ebbfb3b5b6515eecce596e9f5770`. אין source map (`booking-app.js.map` 404) |

סוג האתר: **דף נחיתה + טופס תורים + API serverless**, לא SPA מלא ולא מערכת מקומית על Oracle.

**בעלות תוכן:** המותג החי הוא **פדיקור & מניקור Forever / שלהבת חיה, פתח תקווה** — אתר לקוח (או תבנית שעדיין נושאת פרטי לקוח). התשתית (דומיין mavash, Oracle, Vercel `forever-booking`) בשליטת Mavash.

---

## 2. מבנה מערכת התורים

| רכיב | ממצא |
| --- | --- |
| שירותים (HTML) | פדיקור; מניקור; מיני פדיקור; לק גל; פדיקור + מניקור |
| משכי תורים | בצד לקוח: קומבו «פדיקור + מניקור» דורש **חלון 3 שעות ורק יום שני** (`serviceRestricted`). שאר השירותים — משך לא מוצג ב־HTML |
| ימים סגורים | הודעות UI: שישי–שבת סגורים בסלון; אפשר גם `availability.status === 'closed'` מאדמין |
| Timezone | `Asia/Jerusalem` (`toLocaleDateString('en-CA')`). `min` של התאריך = היום בישראל |
| זמינות | `GET /api/slots?date=&service=` — בזמן הבדיקה **500**, `slots: []`, שגיאה `Requested entity was not found`. לא הוצגו שעות חיות |
| ביטולים / שינוי תור | אין UI ללקוח. באדמין: `/admin` עם POST ל־appointments/availability/complete |
| No-show | לא מתועד בצד לקוח. יש `/api/complete` באדמין (סימון סיום) |
| Double booking | אמור להיות בשרת דרך סינון slots. **לא ניתן לאמת** כי slots נכשל; לא נוצר תור |
| נתונים חיים / דמו | מותג אמיתי של לקוח; ה־API של השעות **שבור** (ישות Google חסרה). לא נטענו רשומות לקוחות |
| ניווט | Header CTA לקביעת תור → טופס: שם, טלפון, שירות, תאריך, שעה (כפתורי slots), שליחה. הצלחה: overlay עם כתובת פ"ת מקודדת |

אין לבחור שעה בפועל — לא בוצע.

---

## 3. טפסים ו-endpoints (בלי שליחה)

טופס `#booking-form` — `preventDefault`, אין `action` HTML. JS שולח JSON:

`POST /api/appointments`  
Headers: `Content-Type: application/json`  
Payload: `{ name, phone, date, time, service, createdBy: "booking", source }`  
`source` = query `?source=` (עד 60 תווים), לשימוש שיווקי.

ולידציית טלפון בצד לקוח: `05X` באורך 10 או קווי `0[2-489]`.

| Method | Path | Auth | תוצאה שנצפתה | הערה |
| --- | --- | --- | --- | --- |
| GET | `/api/slots?date&service` | אין | 500 + `slots:[]` | קריאת זמינות בלבד |
| POST | `/api/appointments` | אין (ציבורי) | **לא נשלח** | יוצר תור |
| GET | `/api/appointments` | `X-Admin-Key` | 401 | רשימת תורים |
| GET/POST | `/api/availability` | מפתח אדמין | GET 401; POST לא נשלח | שעות פתיחה/סגירה |
| POST | `/api/complete` | אדמין | לא נשלח | |
| GET | `/api/marketing` | אדמין | לא נקרא (דורש מפתח) | |
| GET | `/api/config` | אין | 200 | תמונות + לינקים `?source=` |
| OPTIONS | `/api/*` | CORS | 204 | `Access-Control-Allow-Origin: *`, headers כולל `X-Admin-Key` |

אין `/privacy`, `/terms`, `/robots.txt` (404).

---

## 4. Database / storage והרשאות (schema בלבד)

| שכבה | ממצא |
| --- | --- |
| Frontend | אין DB. אין secrets ב־`booking-app.js` |
| Vercel API | מקור הפונקציות **לא נמצא** במכונה. שגיאת slots מצביעה על משאב Google חסר (יומן/גיליון) |
| Admin payload (שדות UI) | שם לקוחה, טלפון, תאריך, שעה, שירות, טווח שעות ליום |
| Appointments (מוסק מ־POST) | name, phone, date, time, service, createdBy, source |
| קבצים | imgbb (ציבורי), `/images/logo.png` |

### n8n — מערכת מקבילה, לא מחוברת לטופס החי

ב־`prod-workflows.json` (קובץ ייצוא, לא שינוי ב־n8n החי):

| Workflow | active | תפקיד |
| --- | --- | --- |
| Part 1 – New Appointment Handler | **false** | Webhook `POST new-appointment` → Airtable create בטבלת «פגישות» |
| Part 2 - Email Confirmation | **true** | Gmail, מופעל מ־executeWorkflow |
| Part 3 - Daily Reminders | **false** | cron + Airtable search + Gmail |
| Part 4 - Confirm and Reschedule | **false** | webhooks + Airtable update + Gmail |

שמות עמודות Airtable (schema בלבד): שם מלא, טלפון, אימייל, הערות, תאריך פגישה, שעת פגישה, מזהה רשומה, התחלה/סיום ISO, תזכורת נשלחה.

**הטופס ב־booking.mavash.net קורא רק ל־`/api/*` ב־Vercel.** אין `fetch` ל־n8n/newsite בקוד הלקוח. לא ניתן לאשר שפונקציות Vercel קוראות ל־n8n בלי קוד השרת. Part 1 כבוי.

הרשאות frontend: יצירת תור בלי auth. קריאת רשימת תורים דורשת מפתח אדמין. CORS `*` מאפשר קריאה חוצת-אתרים ל־API הציבורי.

---

## 5. אוטומציות והתראות

| Trigger | פעולה | מערכת יעד | שדות מידע | סטטוס |
| --- | --- | --- | --- | --- |
| בחירת תאריך/שירות בטופס | GET slots | Vercel → (כנראה Google) | date, service | **שבור** (entity not found) |
| שליחת טופס | POST appointment | Vercel API | name, phone, date, time, service, source | לא הופעל בבדיקה |
| הצלחה ב־UI | טקסט overlay מקודד | דפדפן בלבד | שם + כתובת פ"ת | אין email/WA מהדפדפן |
| אדמין | GET/POST availability, appointments, complete, marketing | Vercel | תורים/שעות/UTM | דורש `?key=` |
| n8n Part 1 | webhook new-appointment | Airtable | ראה schema | **inactive**, לא נקרא מהדף |
| n8n Part 2 | Gmail אישור | Gmail | לא נפתח תוכן מייל | active אבל תלוי Part 1 |
| n8n Part 3 | תזכורות יומיות | Gmail | — | inactive |
| WhatsApp / SMS / Telegram / Slack | — | — | — | **אין** ב־HTML/JS הציבורי. `links.whatsapp` ב־config הוא URL של האתר עם `?source=whatsapp`, לא `wa.me` |
| Calendar ללקוח | — | — | — | לא בצד לקוח; ייתכן יומן בשרת (לא אומת) |

אין cron על Oracle הקשור ל־booking.

---

## 6. פרטיות ואבטחה

| נושא | ממצא |
| --- | --- |
| Privacy / Terms / cookies | אין. אין Set-Cookie |
| Consent | אין |
| שדות רגישים | שם + טלפון חובה; אין שדה email בטופס הציבורי |
| CAPTCHA / rate limit | לא נראה בצד לקוח |
| Admin | מפתח ב־query string `?key=` → `X-Admin-Key`. דליפה אפשרית דרך Referer/לוגים/היסטוריה |
| CORS | `*` + הרשאת כותרת האדמין |
| CSP / X-Frame-Options / X-Content-Type-Options | חסרים. יש HSTS |
| Source maps | אין |
| Client secrets | לא נמצאו ב־JS הציבורי |
| Guessable IDs | לא נבדק בכוח; GET בלי מפתח לא מחזיר רשימת לקוחות |
| Logs | לא נקראו |

אין penetration test.

---

## 7. פרטי קשר קיימים

| מיקום | ערך נוכחי | ערך מוצע (עתיד) | דורש שינוי? |
| --- | --- | --- | --- |
| `<title>` | קביעת תור - פדיקור & מניקור Forever | לפי המותג החדש אם יאושר | כן, אם מחליפים מותג |
| H1 hero | פדיקור & מניקור Forever | לפי אישור | כן |
| Tagline hero | **שלהבת חיה · הנביאים 45, פתח תקווה** | אשקלון, נווה הדרים | **כן** |
| טקסט מעל הטופס | «שלהבת מחכה לך בסטודיו» | לפי שם העסק החדש | כן |
| Overlay הצלחה (JS) | «אצל שלהבת חיה… הנביאים 45, פתח תקווה» | כתובת אשקלון + טלפון אם יידרש בטקסט | **כן** |
| Footer שם | פדיקור & מניקור Forever / **שלהבת חיה** | לפי אישור | **כן** |
| Footer כתובת | **הנביאים 45, פתח תקווה** | אשקלון, נווה הדרים | **כן** |
| Footer `tel:` | **`tel:0552618740` / 055-261-8740** | `054-808-0140` רק אחרי אישור | **כן** |
| WhatsApp | אין `wa.me` | להוסיף רק אחרי אימות שהמספר על WA | לא לגעת עכשיו |
| Email | אין | — | אופציונלי בעתיד |
| Waze | לינק לפתח תקווה (`place=4248.45`) | נווה הדרים / אשקלון | **כן** |
| JSON-LD LocalBusiness | אין | מומלץ בעתיד | חדש |
| Open Graph | אין מעבר ל־title | כן אם משנים מותג | כן |
| `/api/config` links | URL של forever-booking עם UTM | לעדכן דומיין/UTM אם צריך | אולי |
| `/admin` כותרת | ניהול תורים Forever | אם המותג משתנה | כן |
| n8n/Airtable/Gmail | מערכת אחרת | לא לעדכן במסגרת החלפת כתובת בדף | לא לערבב בלי אישור |

אין Instagram/Facebook/LinkedIn ב־HTML הציבורי (רק גנרטור UTM באדמין).

---

## 8. מיפוי עדכון עתידי (אשקלון / נווה הדרים / `054-808-0140`)

אם יאושר בהמשך, קבצים/מקומות ב־Vercel (לא לגעת עכשיו):

1. `index.html` — title, H1, tagline, פסקה, footer, `tel:`.
2. `js/booking-app.js` — מחרוזת ההצלחה (שלהבת + הנביאים 45).
3. לינק Waze — קואורדינטות/כתובת אשקלון.
4. אופציונלי: JSON-LD, meta description, OG.
5. `admin.html` — כותרות מותג.
6. `/api/config` אם כתובות מקודדות בשרת.
7. **יומן Google / ישות ה־slots** — חייב תיקון נפרד לפני שמערכת התורים חיה במקום החדש.
8. WhatsApp: לא להוסיף `wa.me/972548080140` בלי אימות שהמספר מחובר.

לא להעתיק את `055-261-8740` לאתרים אחרים ולא להחליף אותו לפני אישור מפורש.

שים לב: `054-808-0140` **שונה** מפרופיל התמיכה `054-806-0140`.

---

## 9. סיכונים

| חומרה | ממצא | השפעה | המלצה | שינוי בוצע? |
| --- | --- | --- | --- | --- |
| גבוה | `GET /api/slots` 500 — ישות Google לא נמצאה | אי אפשר לקבוע תור | לתקן מזהה יומן/גיליון ב־Vercel env אחרי אישור | לא |
| גבוה | דף לקוח (שלהבת/פ"ת) על `booking.mavash.net` | בלבול מותג; עדכון לאשקלון ישכתב לקוח | להחליט: אתר חדש / שכפול פרויקט / החלפת תוכן | לא |
| בינוני | מפתח אדמין ב־`?key=` + CORS `*` | דליפת מפתח, קריאות אדמין מדומיין זר | Header בלבד, לא query; לצמצם CORS | לא |
| בינוני | POST תור בלי CAPTCHA | ספאם/תורים מזויפים כשה־API יחזור לחיות | rate limit + CAPTCHA | לא |
| נמוך | אין Privacy/Terms | איסוף טלפון בלי מדיניות | עמוד פרטיות | לא |
| נמוך | n8n Appointments כבוי/לא מחובר לדף | כפילות מערכות | לא לגעת ב־n8n בלי משימה ייעודית | לא |
| מידע | אין קוד Vercel בריפו הזה | קשה ל-rollback מדויק | לשמור את פרויקט `forever-booking` בגיט | לא |

---

## 10. Rollback עתידי (רק אחרי שינוי מאושר)

- **תוכן Vercel:** שחזור deployment קודם ב־Vercel Dashboard (לא `compose down`).
- **Nginx Oracle:** עותק קיים תחת `/home/ubuntu/backups/nginx_ssl_fix_20260827_180755/sites-enabled/booking.mavash.net` — לשחזר רק אם שינו proxy; אז `nginx -t` ו־`reload`.
- **DNS:** הרשומה A תקינה; לא למחוק.
- **נתוני תורים:** אם יועברו ליומן/גיליון חדש — לשמור את הישן לקריאה בלבד.
- לא לבצע restart גורף ל־Docker.

---

## 11. מצב האתר — סיכום קצר

1. מאחורי הקלעים: Oracle TLS → Vercel `forever-booking` + serverless APIs; כנראה Google Calendar/Sheets לזמינות; אדמין ב־`/admin`.
2. זה **אתר לקוח Forever/שלהבת** על דומיין Mavash, לא אתר אשקלון.
3. התורים: טופס → POST `/api/appointments`; שעות מ־GET `/api/slots` (**לא עובד כרגע**).
4. אוטומציות בדפדפן: אין WA/email. n8n «Appointments» קיים ב־n8n-prod כחבילה נפרדת וכבויה ברובה.
5. נשמרים (כשיעבוד): שם+טלפון+שירות+זמן. לא נמשכו רשומות לקוחות.
6. פרטי קשר ישנים: שלהבת חיה, הנביאים 45 פ"ת, `055-261-8740`, Waze לפ"ת, טקסט הצלחה ב־JS.
7. לעתיד אשקלון: HTML+JS+Waze+tel, בלי לגעת ב־n8n/OpenReply; לתקן קודם את ה־Google entity.

---

## קבצים שנקראו

- `https://booking.mavash.net/` (`index.html`)
- `https://booking.mavash.net/js/booking-app.js`
- `https://booking.mavash.net/admin` (מבנה/API בלבד; מפתח לא הוזן)
- `https://booking.mavash.net/api/config`
- תשובות שגיאה: `/api/slots`, `/api/appointments` GET, `/api/availability` GET
- Oracle: `/etc/nginx/sites-enabled/booking.mavash.net` (בלי מפתח התעודה)
- `/home/ubuntu/config/prod-workflows.json` — שמות/סוגי nodes של workflows Appointments בלבד
- חיפוש נתיבים: `/home/ubuntu/client-booking.html`, backups nginx booking

## פקודות read-only

`dig`, `curl -sSI/-sS` GET/HEAD/OPTIONS, `openssl x509 -noout`, `ssh` + `nginx` config read, `python` parse, `grep` לקבצים.  
לא: POST appointments, `nginx reload`, docker, n8n UI, certbot, עריכת קבצים בשרת.

## מגבלות

- אין קוד מקור של פונקציות Vercel במכונה.
- `/home/ubuntu/cursor_booking_readonly_audit_he.md` חסר.
- slots 500 — לא נראתה רשימת שעות אמיתית.
- לא נכנסנו ל־Vercel dashboard / Google Calendar.
- n8n החי לא נפתח; רק ייצוא JSON. OpenReply / newsite / Evolution / Portainer לא ננגעו.

**read-only בלבד; לא בוצעו שינויים ולא נשלחו פעולות עם side effect.**
