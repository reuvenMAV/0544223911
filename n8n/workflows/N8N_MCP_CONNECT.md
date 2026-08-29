# חיבור n8n MCP

## למה Cloud Agent לא מתחבר

`http://localhost:5678` מתייחס למחשב **שלך**.  
Cloud Agent רץ על שרת מרוחק — שם אין n8n, ולכן החיבור נכשל.

## אופציה A — Cursor Desktop (הכי פשוט)

1. ודא ש־n8n רץ אצלך על `localhost:5678`.
2. ב־Cursor Desktop: Settings → MCP → הוסף:

```json
{
  "mcpServers": {
    "n8n-mcp": {
      "type": "http",
      "url": "http://localhost:5678/mcp-server/http",
      "headers": {
        "Authorization": "Bearer <TOKEN>"
      }
    }
  }
}
```

3. החלף `<TOKEN>` בטוקן MCP (aud=`mcp-server-api`).
4. Restart / Refresh MCP.
5. פתח Agent **מקומי** (לא Cloud) ושם תוכל לנהל workflows.

## אופציה B — Cloud Agent (צריך Tunnel)

1. הרץ:
   ```bash
   cloudflared tunnel --url http://localhost:5678
   ```
2. קח את ה־URL (למשל `https://xxxx.trycloudflare.com`).
3. שלח לסוכן Cloud הגדרה כזו:

```json
{
  "mcpServers": {
    "n8n-mcp": {
      "type": "http",
      "url": "https://xxxx.trycloudflare.com/mcp-server/http",
      "headers": {
        "Authorization": "Bearer <TOKEN>"
      }
    }
  }
}
```

בלי החלפת `localhost` ב־URL ציבורי — Cloud לא יכול להתחבר.

## אבטחה

אל תדחוף טוקנים אמיתיים ל־GitHub. השתמש בדוגמה `/.cursor/mcp.n8n.example.json` והדבק את הטוקן רק בהגדרות המקומיות של Cursor.
