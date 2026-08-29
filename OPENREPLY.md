# OpenReply — התחלה בעברית

OpenReply הוא ManyChat חינמי לתגובות באינסטגרם: מישהו כותב מילת מפתח (למשל `LINK`) על פוסט, ומקבל DM עם הלינק שלך דרך ה-API הרשמי של Meta.

הקוד נמצא בתיקייה [`openreply/`](openreply/). המדריך המלא: [`openreply/docs/setup-he.md`](openreply/docs/setup-he.md).

## מה כבר בוצע בריפו

- הועתק הקוד מ-[diwenne/openreply](https://github.com/diwenne/openreply) (MIT) ל-`openreply/`
- נוסף מדריך עברי צעד-אחר-צעד, כולל אפליקציית Meta
- נוסף סקריפט ליצירת סודות: `openreply/scripts/generate-secrets.sh`
- נוסף `openreply/railway.toml` ל-worker (Root Directory = `openreply`)

## מה רק אתה יכול לעשות (צריך התחברות)

אין לי גישה לחשבון Facebook / Instagram / Vercel / Railway / Resend שלך. בלי זה אי אפשר לקבל App ID ו-App Secret, לפרוס את האתר, או לחבר את האינסטגרם.

דומיין ציבורי: **`https://openreply.mavash.net`** על שרת Oracle `129.159.138.4` (לא Vercel). פירוט: [`openreply/docs/domain-mavash.md`](openreply/docs/domain-mavash.md).

סדר העבודה המומלץ:

1. גישת SSH לשרת (הוספת מפתח הסוכן) או הרצת `deploy/oracle/install.sh` על השרת
2. **Resend** — אימות `mavash.net` לשליחה (בלי לגעת ב-MX של Google)
3. **Meta Developer App** — Instagram Login + webhook
4. חיבור אינסטגרם בדשבורד ובדיקת תגובה מחשבון שני

אימייל ליצירת האפליקציה ב-Meta: `bitreuven@gmail.com`

המשך ב-[`openreply/docs/setup-he.md`](openreply/docs/setup-he.md).
