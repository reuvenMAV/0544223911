# ⚠️ מיקום קבצים - חשוב!
כל ה-ZIPים, ה-JSON של n8n, ה-SQL, ה-bot.ts - נמצאים ב- `~/Downloads/` על המק של ראובן.
אם חסר לך קובץ - תשאל את ראובן "חסר לי X" והוא ייתן לך.
אל תנחש ואל תמציא - רק מה שיש בהורדות.

# 🎯 הוראות CURSOR - דירת נופש אשקלון - Checklist מסודר
## שיטה: לא מתקדמים למשימה הבאה עד שאתה כותב ✅ בוצע

> Cursor מחובר ל-n8n + Airtable + Oracle. האתר הראשון כבר עלה.

---

### PHASE 0 - וידוא מה קיים (15 דק')
**מטרה:** להבין מה Cursor העלה מה-ZIP הראשון

- [ ] **0.1** הרץ `npm run dev` וודא שהאתר עולה ב-localhost:3000
- [ ] **0.2** בדוק שיש תיקיות: `/app/api/booking` (ה-stub הישן), `/app/(site)`, `/lib`
- [ ] **0.3** בדוק Vercel - `ashkelon-site.vercel.app` עובד?
- [ ] **0.4** בדוק n8n - `https://n8n.mavash.net` - כמה Workflows קיימים? צלם מסך

**✅ אישור:** כתוב לי "Phase 0 בוצע - יש X workflows ב-n8n"

---

### PHASE 1 - CORE MONEY - Supabase + PayPlus (הכי קריטי - 2 שעות)
**מטרה:** להחליף stub שמחזיר success:true בסליקה אמיתית

- [ ] **1.1 Supabase Schema**
  - קובץ: `/mnt/data/supabase_schema_ashkelon.sql` (ב-ZIP)
  - הרץ ב-Supabase SQL Editor
  - טבלאות שצריכות להיווצר: bookings, blocked_dates, pricing_rules, guests, cleaning_tasks
  - בדיקה: `SELECT * FROM bookings LIMIT 1` - לא שגיאה

- [ ] **1.2 ENV**
  - קובץ: `.env.local` - תעתיק מ-`.env.example`
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=...
  PAYPLUS_API_KEY=...
  PAYPLUS_SECRET=...
  PAYPLUS_PAYMENT_PAGE_UID=...
  N8N_WEBHOOK_BASE=https://n8n.mavash.net/webhook
  N8N_API_KEY=...
  TELEGRAM_BOT_TOKEN=...
  TELEGRAM_CHAT_ID_REUVEN=...
  TELEGRAM_CHAT_ID_CLEANER=...
  ```
  - בדיקה: `echo $NEXT_PUBLIC_SUPABASE_URL` לא ריק

- [ ] **1.3 החלף /api/booking הישן ב-/api/new-booking אמיתי**
  - מחק: `app/api/booking/route.ts` (ה-stub)
  - צור: `app/api/new-booking/route.ts` - העתק מ-`/mnt/data/ashkelon-project/nextjs-app/app/api/new-booking/route.ts`
  - צור: `app/api/check-availability/route.ts`
  - צור: `app/api/webhook/payplus/route.ts`
  - צור: `lib/supabase.ts`, `lib/n8n.ts`, `lib/payplus.ts`
  - בדיקה: `curl -X POST localhost:3000/api/check-availability -d '{"checkin":"2026-10-01","checkout":"2026-10-03"}'` -> מחזיר available:true + pricing

- [ ] **1.4 דפי /w/ + /book אמיתיים**
  - צור: `app/w/[token]/page.tsx`
  - צור: `app/verify/page.tsx`
  - עדכן: `app/book/page.tsx` - העתק מהקובץ החדש (עם Apple Pay שחור)
  - בדיקה: כנס ל-/book, בחר תאריכים, לחץ הזמן - נוצרת רשומה ב-Supabase bookings עם status=pending

- [ ] **1.5 בדיקת קצה לקצה**
  - צור הזמנה דרך האתר -> בדוק ב-Supabase שיש רשומה + ב-blocked_dates יש 2 תאריכים חסומים
  - בדיקה: `SELECT * FROM blocked_dates WHERE date='2026-10-01'` - יש רשומה

**✅ אישור:** "Phase 1 בוצע - הזמנה נוצרת ב-Supabase + חסימת תאריכים עובדת"

---

### PHASE 2 - AIRTABLE MASTER (1 שעה)
**מטרה:** כל הזמנה נכנסת ל-Airtable ב-4 טבלאות

- [ ] **2.1 צור Base ב-Airtable**
  - קובץ: `airtable/airtable-base-schema.json` - יש שם 6 טבלאות
  - צור Base חדש: "Ashkelon Sea View"
  - צור טבלאות: 🏠 Properties, 📅 Bookings, 🚫 Blocked Dates, 👥 Guests CRM, 🧹 Cleaning, 💵 Pricing Rules
  - העתק שדות לפי ה-JSON
  - צור Views: Calendar, Kanban Cleaning, Today Checkin/Checkout

- [ ] **2.2 חבר n8n ל-Airtable**
  - ב-n8n: Credentials -> Airtable -> PAT + Base ID `appXXXXXXXX`
  - ייבא Workflow: `airtable/n8n-airtable-sync-workflow.json` (ASK-11)
  - עדכן ב-Workflow את ה-Base ID
  - הפעל Workflow
  - בדיקה: צור הזמנה חדשה -> נוצרו 4 רשומות ב-Airtable (Booking + 2 Blocked + Guest + Cleaning)

**✅ אישור:** "Phase 2 בוצע - Airtable מקבל הזמנות + Kanban ניקיון"

---

### PHASE 3 - n8n 16 WORKFLOWS (2 שעות)
**מטרה:** להדליק את כל האוטומציות

סדר ייבוא - אל תייבא הכל בבת אחת:

- [ ] **3.1 Core (חובה)**
  - ייבא: `n8n-workflows/workflow-02-Core_Booking_ASK-1029.json`
  - עדכן: Supabase creds + Telegram + WhatsApp
  - בדיקה: הזמנה חדשה -> מקבל Telegram עם כפתורים [אשר] [שלח קוד]

- [ ] **3.2 Anti Double Booking**
  - ייבא: `workflow-04-סנכרון_iCal.json`
  - שים ב-Cron 1h, שים iCal URLs של Airbnb/Booking
  - בדיקה: חסימה ב-Airbnb מופיעה ב-blocked_dates

- [ ] **3.3 Pre/Post Stay**
  - ייבא: `workflow-05-Pre-Arrival`, `07-Post-Stay`
  - בדיקה: T-72h שולח WhatsApp עם הוראות + /w/

- [ ] **3.4 תפעול**
  - ייבא: `workflow-09-דוח_יומי`, `10-ניהול_מטלגרם`, `11-Sheets`, `13-ניקיון`, `14-גיבוי`
  - בדיקה: /block 10-12.09 בטלגרם -> חוסם ב-Airtable

**✅ אישור:** "Phase 3 בוצע - 8 Workflows קריטיים פעילים, Telegram מגיב ל-/block"

---

### PHASE 4 - TELEGRAM BOT על ORACLE (1.5 שעות)
**מטרה:** בוט רץ 24/7 על Oracle Cloud, לא על Vercel

- [ ] **4.1 Oracle VM**
  - התחבר ל-Oracle: `ssh opc@oracle-ip`
  - `git clone` הפרויקט
  - `cd telegram-bot && npm install`

- [ ] **4.2 ENV על Oracle**
  - צור `/home/opc/.env`:
  ```
  TELEGRAM_BOT_TOKEN=xxx
  TELEGRAM_CHAT_ID_REUVEN=xxx
  TELEGRAM_CHAT_ID_CLEANER=xxx
  NEXT_PUBLIC_SUPABASE_URL=...
  SUPABASE_SERVICE_ROLE_KEY=...
  AIRTABLE_API_KEY=patXXX
  AIRTABLE_BASE_ID=appXXX
  ```

- [ ] **4.3 הרצת בוט עם PM2**
  - `npm install -g pm2 tsx`
  - `pm2 start bot.ts --name ashkelon-bot --interpreter tsx`
  - `pm2 save && pm2 startup`
  - בדיקה: שלח /start לבוט בטלגרם -> מקבל תפריט עם 8 כפתורים

- [ ] **4.4 Cleaning Kanban Integration**
  - העתק: `cleaning-integration.ts` לתוך `telegram-bot/`
  - עדכן `bot.ts`: `import { registerCleaningHandlers, sendCleaningTask } from './cleaning-integration'`
  - `pm2 restart ashkelon-bot`
  - בדיקה: צור הזמנה עם checkout היום -> מנקה מקבלת הודעה עם [התחלתי] [סיימתי]

**✅ אישור:** "Phase 4 בוצע - בוט רץ על Oracle, /start עובד, ניקיון עם כפתורים"

---

### PHASE 5 - NUKI + WALLET + VERIFY (1 שעה)

- [ ] **5.1 Nuki**
  - קבל NUKI_API_TOKEN + SMARTLOCK_ID
  - הוסף ל-ENV
  - בדיקה: `/code ASK-1029` בטלגרם -> מחזיר קוד זמני

- [ ] **5.2 Apple Wallet**
  - צור קובץ `.well-known/apple-developer-merchantid-domain-association`
  - בדיקה: /w/AB12CD34 -> כפתור "הוסף ל-Wallet"

- [ ] **5.3 /verify**
  - בדיקה: /verify מעלה ת.ז + חתימה -> נשמר ב-Supabase

**✅ אישור:** "Phase 5 בוצע"

---

### PHASE 6 - דומיין + GO LIVE (30 דק')

- [ ] **6.1 חבר דומיין**
  - Vercel -> Settings -> Domains -> `booking.mavash.net`
  - Cloudflare DNS -> CNAME
  - בדיקה: booking.mavash.net עובד

- [ ] **6.2 בדיקת קצה לקצה מלאה**
  - לקוח מזמין ב-booking.mavash.net -> PayPlus -> Supabase paid -> Airtable 4 רשומות -> Telegram לך + מנקה -> T-24h קוד Nuki + /w/ -> Checkout -> ניקיון Kanban -> Post-Stay ביקורת

**✅ אישור סופי:** "כל הפרויקט חי - תפוסה 73%"

---

## הוראות ל-Cursor - תעתיק בדיוק:

```
אתה מפתח Full Stack. יש לך חיבור ל-n8n + Airtable + Oracle.
אל תתקדם למשימה הבאה עד שהמשתמש כותב "✅ בוצע".
עבוד לפי הקובץ CURSOR_CHECKLIST.md שלב אחרי שלב.
בכל שלב: תראה לי את הקבצים שיצרת + תריץ בדיקה + תבקש אישור.
```

