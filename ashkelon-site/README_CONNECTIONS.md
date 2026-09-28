
# דירת נופש אשקלון - חיבורים מלאים v1.1
## מבנה דרייב מומלץ: /Drive/Ashkelon-Project/

### 1. ENV - כל המפתחות במקום אחד
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# PayPlus
PAYPLUS_API_KEY=...
PAYPLUS_SECRET=...
PAYPLUS_PAYMENT_PAGE_UID=...

# Nuki / TTLock
NUKI_API_TOKEN=...
NUKI_SMARTLOCK_ID=...

# n8n
N8N_WEBHOOK_BASE=https://n8n.mavash.net/webhook
N8N_API_KEY=...

# Telegram
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID_REUVEN=...
TELEGRAM_CHAT_ID_CLEANER=...

# WhatsApp - wa_llm / Green API
WA_LLM_API_URL=https://api.mavash.net/wa_llm
WA_LLM_BOT_ID=apt_ashkelon_bar_kochva
GREEN_API_ID=...
GREEN_API_TOKEN=...

# Google
GOOGLE_CALENDAR_ID=...
GOOGLE_SHEETS_ID=...
GOOGLE_DRIVE_BACKUP_FOLDER_ID=...

# Site
NEXT_PUBLIC_SITE_URL=https://booking.mavash.net
NEXT_PUBLIC_WA_NUMBER=9725XXXXXXXX
```

### 2. חיבורים - טבלת Webhooks
| # | שם | Trigger URL | נכנס ל | יוצא ל |
|---|---|---|---|---|
|1|Lead Capture|/webhook/lead|אתר /check-availability|Sheets, Telegram, wa_llm|
|2|Core Booking|/webhook/new-booking|/api/new-booking (payload ASK-1029)|Google Calendar, Moringa Invoice, WhatsApp Green, Telegram, Sheets|
|3|נטישת עגלה|Cron 30m|Supabase bookings=pending|WhatsApp + קופון|
|4|סנכרון iCal|Cron 1h|Airbnb iCal + Booking.com iCal|blocked_dates + Google Calendar|
|5|Pre-Arrival|Trigger checkin T-72h, T-24h|Supabase|WhatsApp (הוראות + קוד Nuki), Email, /w/ page|
|6|During Stay|Telegram /extend /code|Telegram|Supabase + PayPlus charge|
|7|Post-Stay|Trigger checkout T+24h|Supabase|Google Review Link, WhatsApp|
|8|תשלום נכשל|PayPlus Webhook|PayPlus|WhatsApp לינק חלופי + Telegram|
|9|דוח יומי|Cron 09:00|Supabase|Telegram דוח|
|10|ניהול מטלגרם|Telegram Trigger|/block 10-12.09|blocked_dates|
|11|Sheets MASTER|After booking|Supabase|Google Sheets 3 טאבים|
|12|אימות וחוזה|POST /verify|/book|SignNow + Supabase|
|13|תפעול ניקיון|checkout event|Supabase|Telegram מנקה + בקשת תמונות|
|14|גיבוי|Cron 02:00|Supabase|Google Drive + התראת תפוסה|
|15|Chatbot Lead|Webhook /chatbot-lead|Chat Widget|AI Summary -> Telegram|
|16|Chat to WA|Webhook /chat-to-wa|Chat Widget phone regex|WhatsApp + booking_link|

### 3. PayPlus חיבור
- יצירת Payment Page עם Tokenization ל-500ש פקדון
- Apple Pay: לאמת דומיין ב-Stripe Dashboard + קובץ .well-known
- Webhook IPN: https://booking.mavash.net/api/webhook/payplus -> שולח ל-n8n /payment-status

### 4. Nuki
- GET /smartlock/{id}/auth -> קוד זמני לפי checkin/out
- נוצר ב-Workflow 5 T-24h

### 5. Google Drive מבנה
```
/Ashkelon-Project/
  /01-website/ (Next.js build)
  /02-n8n-workflows/ (16 JSON)
  /03-db-backups/ (daily)
  /04-invoices/
  /05-cleaning-photos/
```

כל Workflow ב-n8n מתחיל ב-Respond to Webhook (200 תוך 2 שניות) ואז ממשיך.
