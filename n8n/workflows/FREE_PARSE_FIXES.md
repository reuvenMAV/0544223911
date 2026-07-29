# Free Parse — תיקונים

קובץ לייבוא: `free-parse-fixed.json`

## מה תוקן

1. **חיבור כפול בסוכן** — יציאת הצלחה של `ИИ-агент (Steel)` הלכה גם ל־`Ошибка агента`, ולכן כל תשובה מוצלחת שלחה גם הודעת שגיאה. עכשיו: הצלחה → `Сообщение (агент)` בלבד; שגיאה → `Ошибка агента` בלבד.
2. **מודלים** — Kimi K2.6 כמודל עיקרי, OpenAI `gpt-4o-mini` כ־fallback. NVIDIA/OpenRouter נשארו בקנבס אבל מנותקים (מודל VL חינמי חלש לכלי-סוכן).
3. **חילוץ מחיר** — תומך גם ב־₪ / $ / € / ₽ (לא רק רובל).

## איך לייבא ב־n8n

1. ב־n8n: Workflows → ⋮ על ה־workflow הקיים → **Download** (גיבוי).
2. אופציה א׳ (מומלץ): פתח את ה־workflow הקיים → ⋮ → **Import from File** / הדבק JSON ועדכן על הקיים אם נתמך.
3. אופציה ב׳: Import כ־workflow חדש בשם `Free Parse (fixed)`, חבר מחדש credentials אם צריך, כבה את הישן והפעל את החדש (webhook של Telegram).

## Credentials שצריכים להיות תקינים

- Telegram: `מבשב דפדפן`
- Moonshot / Kimi: `Moonshot account`
- OpenAI (fallback): `open ruter`
- Docker DNS: `steel:3000`, `steel:8931` (Playwright MCP)

## בדיקה מהירה

1. שלח בטלגרם: `מזג אוויר תל אביב` → אמור להחזיר עד 5 קישורים (בלי AI).
2. שלח: `סוכן מה הכותרת ב־https://example.com` → תשובה אחת בלבד (בלי הודעת שגיאה כפולה).
3. אם MCP נופל: הרץ `restart-agent` ואז `סוכן תמשיך`.
