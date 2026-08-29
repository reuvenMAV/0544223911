# מורה אישי לאנגלית — Web MVP

אפליקציית צ'אט ללימוד אנגלית אמריקאית מותאמת אישית לדוברי עברית.

## מה כלול ב-MVP

- `/` מסך פתיחה
- `/chat` צ'אט עם כפתורי בחירה + «אחר / הערות»
- `/recap/[sessionId]` סיכום שיעור
- learnerId אנונימי ב-cookie (+ תמיכה ב-`?learner=` לקישור אישי)
- onboarding → placement → planning → שיעור 1 → recap
- API מאובטח ל-n8n (`/api/chat`)
- מנוע מקומי (`COACH_BACKEND=local`) להרצה בלי n8n
- schema של Supabase + seed של COCA

## הרצה מקומית

```bash
cd english-coach-web
cp .env.example .env.local
npm install
npm run dev
```

פתחו http://localhost:3000

ברירת מחדל: `COACH_BACKEND=local` — הזרימה המלאה עובדת בלי Supabase/n8n (progress בזיכרון השרת).

## סקריפטים

```bash
npm run lint
npm run typecheck
npm test
npm run test:watch
npm run test:coverage
npm run test:e2e
npm run build
```

## בדיקות (Testing)

### Vitest — Unit / Component / API

- **Unit**: `tests/unit/` — learner/session IDs, validation, progress merge, mock coach phases, n8n client
- **Component**: `tests/component/` — landing, messages, choices, other input, loading/error/retry
- **API contract**: `tests/api/` — `/api/chat`, `/api/recap/[sessionId]`, 4xx/5xx, rate limit
- **Security**: `tests/security/` — אין secrets בצד לקוח, sanitization, בידוד recap בין לומדים
- **Accessibility (RTL)**: `tests/accessibility/` — keyboard, labels, focus, mobile targets

```bash
npm test
npm run test:coverage
```

כיסוי מינימלי **80%** מוגדר עבור:
- `src/lib/schemas/coach-api.ts`
- `src/lib/validation.ts`
- `src/lib/learner-session.ts`
- `src/lib/progress-merge.ts`
- `src/app/api/chat/route.ts`
- `src/app/api/recap/**/route.ts`

### Playwright — E2E

```bash
npm run build
npm run test:e2e
```

תרחישים:
1. `e2e/new-learner.spec.ts` — לומד חדש + כפתורי בחירה
2. `e2e/placement-to-recap.spec.ts` — placement → שיעור → recap
3. `e2e/progress-persistence.spec.ts` — המשכיות אחרי refresh
4. `e2e/accessibility.spec.ts` — axe על landing + chat (מובייל)

הבדיקות **לא** פונות ל-n8n, Supabase או Xiaomi MiMo אמיתיים.

### Fixtures ו-Mocks

| נתיב | תפקיד |
|---|---|
| `tests/fixtures/coach-payloads.ts` | בקשות/תשובות API תקינות |
| `tests/fixtures/progress.ts` | progress ו-recap לדוגמה |
| `tests/mocks/n8n.ts` | mock ל-fetch של webhook |
| `tests/mocks/mimo.ts` | תשובות JSON של MiMo |
| `tests/mocks/supabase.ts` | עזרי env ל-Supabase |

Schemas משותפים: `src/lib/schemas/coach-api.ts` (Zod + sanitization).

## משתני סביבה

ראו `.env.example`:

| משתנה | חובה | תיאור |
|---|---|---|
| `COACH_BACKEND` | לא | `local` או `n8n` |
| `N8N_WEBHOOK_URL` | ל-n8n | כתובת webhook |
| `N8N_WEBHOOK_SECRET` | ל-n8n | סוד משותף ב-header `x-webhook-secret` |
| `SUPABASE_URL` | מומלץ לפרודקשן | פרויקט Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | מומלץ לפרודקשן | מפתח שרת בלבד |

מפתח Xiaomi MiMo **לא** נשמר ב-Next.js — רק ב-n8n (credential בשם `Xiaomi MiMo`, מודל `mimo-v2.5-pro`).

## פריסה ל-Vercel

1. חברו את הריפו ל-Vercel.
2. Root Directory: `english-coach-web`
3. הגדירו env vars לפי `.env.example`
4. Deploy

## Supabase

הריצו את `supabase/migrations/001_init.sql` ב-SQL editor.

## n8n

הוראות מלאות: [`n8n/SETUP.md`](./n8n/SETUP.md)  
Workflow לייבוא: [`n8n/english-coach-chat.workflow.json`](./n8n/english-coach-chat.workflow.json)

## מה מוגדר כאן ומה נשאר חיצוני

### מוגדר ב-Next.js
- UI, cookies, validation, rate limit
- מנוע לימוד מקומי ל-MVP
- proxy ל-n8n
- שכבת progress (memory או Supabase)
- תשתית בדיקות מלאה

### צריך להגדיר מחוץ לקוד
- Instance של n8n + credential Xiaomi MiMo
- פרויקט Supabase + הרצת migration
- ערכי הסודות ב-Vercel

## COCA 5000

`src/data/coca-seed.json` הוא seed לפיתוח.  
להחלפה בנתונים מלאים: השתמשו ב-`../english-learning/references/coca-5000.csv` (או מקור מורשה) וסננו מדגם לפי CEFR/עניין ב-`src/lib/coca.ts`.

## מגבלות V2

- דיבור/הקלטה
- Auth מלא (אימייל/Google)
- טלגרם
- היסטוריית צ'אט מלאה
- fallback NVIDIA/Groq
- חשבונות הורה/ילד
