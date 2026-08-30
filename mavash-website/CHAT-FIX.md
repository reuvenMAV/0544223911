# תיקון צ'אט mavash.net

## מה היה שבור

האתר (`ChatWidget`) שלח POST ישירות ל-n8n production webhook — זה תקין.
אבל אחרי `fetch` הקוד עשה **רק** `response.json()`.

n8n Chat Trigger עם `responseMode: responseNode` מחזיר **טקסט רגיל** (לא JSON), למשל:

```
היי! האם משימות ידניות גוזלות לך זמן?
```

`response.json()` נכשל → נכנס ל-`catch` → המשתמש רואה "אופס, משהו השתבש".

## מה תוקן

1. **`/api/chat`** — proxy בצד השרת (Vercel) ל-n8n
2. **`n8n-chat.ts`** — פרסור JSON **או** טקסט לפי `Content-Type`
3. **`ChatWidget.tsx`** — קורא ל-`/api/chat` במקום ישירות ל-n8n
4. **`.env`** — `N8N_CHAT_WEBHOOK_URL` (production URL, לא webhook-test)

## פריסה

1. העתק/החלף את הקבצים ב-repo של mavash.net
2. ב-Vercel → Environment Variables:
   ```
   N8N_CHAT_WEBHOOK_URL=https://newsite.mavash.net/webhook/c7e8f9a0-b1c2-4d3e-8f5a-6b7c8d9e0f1a/chat
   ```
3. Deploy
4. בדיקה: `curl -X POST https://mavash.net/api/chat -H 'Content-Type: application/json' -d '{"sessionId":"t1","chatInput":"שלום"}'`

## CORS

אחרי המעבר ל-`/api/chat`, CORS כבר לא רלוונטי לדפדפן (same-origin).
אם תישאר קריאה ישירה ל-n8n — CORS כרגע **תקין** ל-`https://mavash.net`.
