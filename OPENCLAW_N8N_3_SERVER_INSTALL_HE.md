# OpenClaw + n8n

מדריך התקנה מלא ל-3 שרתים  
Google Workspace | Browser | Database | HA

**גרסה:** v2.1 — אפריל 2026  
**מבוסס על:** docs.openclaw.ai + GitHub

---

## 0) ארכיטקטורה — מבט על

### העיקרון המרכזי

- **OpenClaw** = חשיבה, ניתוח, routing, החלטות
- **n8n** = ביצוע בפועל: API calls, Google, DB, Browser, Credentials
- **עיקרון בידוד:** OpenClaw לא צריך להחזיק credentials של אינטגרציות חיצוניות.  
  בפועל OpenClaw מפעיל webhooks פנימיים, והסודות מנוהלים ב-n8n.

### חלוקת 3 השרתים

| שרת | תפקיד ורכיבים |
|---|---|
| **Machine 1 — PRIMARY** | OpenClaw Gateway + Router Agent + Research Agent + n8n (main) + Redis |
| **Machine 2 — WORKERS** | Coder Agent + Data Agent + Docker + Browser (Camoufox/Nodriver) + n8n workers |
| **Machine 3 — STANDBY** | Rescue Gateway + n8n backup — מופעל רק בכשל של M1 |

### תרשים זרימה

```text
USER (WhatsApp / Telegram / Web)
  │
  ▼
OpenClaw Gateway (loopback:18789)
  │
  ├─► Router Agent (Groq llama-3.3-70b)
  │     │  מזהה intent → בונה JSON payload → בוחר webhook
  │     │
  │     ├──► n8n webhook: openclaw-google         → Google Sheets/Drive/Gmail
  │     ├──► n8n webhook: openclaw-db-read        → Postgres/MySQL (read only)
  │     ├──► n8n webhook: openclaw-db-write       → Write + Approval Gate
  │     └──► n8n webhook: openclaw-browser-stealth→ Nodriver/Camoufox
  │
  └─► Research Agent (Gemini Flash) — web search ישיר

n8n (internal:5678) — retries, logging, credentials מוצפנים
  │
  └─► JSON response → OpenClaw → User
```

---

## 1) דרישות מקדימות — כל השרתים

### ⚠️ CVE-2026-25253 — קריטי

- תמיד `gateway.bind: loopback` בלבד (לא `0.0.0.0`).
- תמיד עדכן גרסה:

```bash
npm install -g openclaw@latest
```

### הכנת מערכת הפעלה

```bash
# Ubuntu 24.04 LTS — על כל שרת
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git htop ufw rsync openssl

# משתמש ייעודי (לא להריץ OpenClaw כ-root)
sudo useradd -m -s /bin/bash openclaw
sudo usermod -aG sudo openclaw
su - openclaw

# Node.js 24
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # חייב להיות 24.x

# Firewall
sudo ufw allow ssh
sudo ufw deny 18789  # OpenClaw Gateway
sudo ufw deny 5678   # n8n
sudo ufw enable
```

### Tailscale VPN בין השרתים

```bash
# התקנה על כל שרת
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up

# M1: חשיפת gateway רק דרך Tailscale
sudo tailscale serve --bg https:18789 http://127.0.0.1:18789

# בדיקה
tailscale status
tailscale ping <M2_TAILSCALE_IP>
```

---

## 2) Machine 1 — Primary Gateway + n8n Main

### מה רץ על M1

- OpenClaw Gateway (`loopback:18789`)
- Router Agent — Groq `llama-3.3-70b`
- Research Agent — Gemini Flash
- n8n main (queue mode + Redis)
- Redis לתור העבודה של n8n

### 2.1 התקנת OpenClaw

```bash
su - openclaw
npm install -g openclaw@latest

openclaw onboard --install-daemon
# QuickStart: Enter
# Bind: loopback  (קריטי)
# Warning confirmation: Yes

chmod 700 ~/.openclaw
chmod 600 ~/.openclaw/openclaw.json

openclaw agents add router researcher
```

### 2.2 קובץ `.env` — מפתחות וסודות

**מיקום:** `~/.openclaw/.env`  
**חשוב:** לעולם לא להכניס ל-git.

```dotenv
# PRIMARY KEYS
ANTHROPIC_API_KEY=sk-ant-api03-...PRIMARY...
OPENROUTER_API_KEY=sk-or-v1-...PRIMARY...
GOOGLE_API_KEY=AIzaSy...PRIMARY...
GROQ_API_KEY=gsk_...PRIMARY...
CEREBRAS_API_KEY=csk-...PRIMARY...

# BACKUP KEYS
ANTHROPIC_API_KEY_BACKUP=sk-ant-api03-...BACKUP...
OPENROUTER_API_KEY_BACKUP=sk-or-v1-...BACKUP...

# SERVICES
TELEGRAM_BOT_TOKEN=...
DISCORD_BOT_TOKEN=...

# n8n Integration
N8N_WEBHOOK_BASE=http://127.0.0.1:5678/webhook/openclaw-
N8N_WEBHOOK_SECRET=your-strong-secret-here
```

```bash
chmod 600 ~/.openclaw/.env
```

### 2.3 `openclaw.json` — קונפיג מלא עם SecretRef

```json
{
  "gateway": {
    "bind": "loopback",
    "port": 18789,
    "auth": { "mode": "token" }
  },
  "secrets": {
    "providers": {
      "envvars": {
        "source": "env",
        "allowlist": ["ANTHROPIC_*", "OPENROUTER_*", "GOOGLE_*", "GROQ_*", "CEREBRAS_*"]
      }
    },
    "defaults": { "env": "envvars" }
  },
  "models": {
    "providers": {
      "groq": {
        "baseUrl": "https://api.groq.com/openai/v1",
        "apiKeyRef": { "ref": "envvars", "id": "GROQ_API_KEY" },
        "api": "openai-completions"
      },
      "google": {
        "baseUrl": "https://generativelanguage.googleapis.com/v1beta/openai",
        "apiKeyRef": { "ref": "envvars", "id": "GOOGLE_API_KEY" },
        "api": "openai-completions"
      },
      "anthropic": {
        "baseUrl": "https://api.anthropic.com/v1",
        "apiKeyRef": { "ref": "envvars", "id": "ANTHROPIC_API_KEY" },
        "api": "anthropic"
      },
      "cerebras": {
        "baseUrl": "https://api.cerebras.ai/v1",
        "apiKeyRef": { "ref": "envvars", "id": "CEREBRAS_API_KEY" },
        "api": "openai-completions"
      }
    }
  },
  "agents": {
    "list": [
      {
        "id": "router",
        "default": true,
        "workspace": "~/.openclaw/workspace-router",
        "agentDir": "~/.openclaw/agents/router/agent",
        "model": {
          "primary": "groq/llama-3.3-70b-versatile",
          "fallback": "google/gemini-2.5-flash"
        },
        "skills": ["gog", "api-credits-lite", "eridian"],
        "tools": { "allow": ["read", "web_fetch", "web_search"], "deny": ["exec", "write"] }
      },
      {
        "id": "researcher",
        "workspace": "~/.openclaw/workspace-researcher",
        "agentDir": "~/.openclaw/agents/researcher/agent",
        "model": {
          "primary": "google/gemini-2.5-flash-lite",
          "fallback": "cerebras/llama-3.3-70b"
        }
      }
    ]
  },
  "n8n": {
    "webhookBase": "http://127.0.0.1:5678/webhook/openclaw-"
  }
}
```

### 2.4 `SOUL.md` — Router Agent

```markdown
## Who You Are
You are ROUTER — the central dispatcher.
Your ONLY job: understand intent → build JSON → call n8n webhook.
Never answer questions yourself. Always delegate to n8n or sub-agents.

## n8n Routing Rules
- Google Workspace (Gmail/Drive/Sheets/Calendar) → webhook: openclaw-google
- Database READ (SELECT only) → webhook: openclaw-db-read
- Database WRITE (INSERT/UPDATE/DELETE) → webhook: openclaw-db-write
  NOTE: db-write has approval gate — warn user it needs manual approval
- Browser / web scraping → webhook: openclaw-browser-stealth
- Web search / research → @researcher agent

## Webhook Auth
Always include header: X-OpenClaw-Secret: ${N8N_WEBHOOK_SECRET}

## JSON Output Format (always)
{
  "action": "webhook",
  "webhook": "openclaw-google",
  "payload": { ...params... },
  "intent": "human readable description"
}

## Hard Limits
- NEVER store API keys or credentials
- NEVER execute shell commands directly
- NEVER write to filesystem without user confirmation
- For db-write: always warn user about approval gate first
```

### 2.5 התקנת n8n + Redis על M1

```bash
# Redis
sudo apt install -y redis-server
sudo systemctl enable --now redis
redis-cli ping  # PONG

# Docker
sudo apt install -y docker.io
sudo usermod -aG docker openclaw
newgrp docker

# n8n
docker run -d \
  --name n8n \
  --restart always \
  -p 127.0.0.1:5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  -e N8N_HOST=0.0.0.0 \
  -e WEBHOOK_URL=http://127.0.0.1:5678/ \
  -e EXECUTIONS_MODE=queue \
  -e QUEUE_BULL_REDIS_HOST=172.17.0.1 \
  -e QUEUE_BULL_REDIS_PORT=6379 \
  -e QUEUE_HEALTH_CHECK_ACTIVE=true \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD=CHANGE_ME_STRONG_PASSWORD \
  n8nio/n8n

curl -s http://127.0.0.1:5678/healthz && echo "n8n OK"
```

### 2.6 systemd Service — OpenClaw

`/etc/systemd/system/openclaw.service`:

```ini
[Unit]
Description=OpenClaw Gateway
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=/usr/local/bin/openclaw gateway
Restart=always
RestartSec=10
StartLimitIntervalSec=0
EnvironmentFile=/home/openclaw/.openclaw/.env
User=openclaw
WorkingDirectory=/home/openclaw

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now openclaw
sudo systemctl status openclaw
```

---

## 3) n8n — ארבעה Workflows מרכזיים

### עיקרון Credential Isolation

- Credentials נשמרים ב-n8n בלבד.
- OpenClaw מכיר webhooks פנימיים ולא סודות אינטגרציה.
- לאחר בניית workflow: הפעילו governance/lock כדי למנוע שינוי לא מבוקר.

### 3.1 Webhook: `openclaw-google` — Google Workspace

| Node | הגדרה |
|---|---|
| 1. Webhook | `POST` \| Path: `openclaw-google` \| Auth: Header (`X-OpenClaw-Secret`) |
| 2. Switch | ניתוב לפי `payload.intent`: `sheets-read` / `sheets-write` / `gmail-send` / `drive-list` |
| 3a. Google Sheets | Credential: Google OAuth2 \| Operation לפי intent |
| 3b. Gmail | Credential: Gmail OAuth2 \| Send/Read |
| 3c. Google Drive | Credential: Google Drive OAuth2 \| List/Upload/Download |
| 4. Respond | JSON: `{ "success": true, "data": ..., "error": null }` |

הוספת credentials:

1. `Settings → Credentials → Add Credential → Google OAuth2`
2. הזנת Client ID/Secret מ-Google Cloud Console
3. Scopes: `sheets`, `drive`, `gmail`, `calendar`
4. מומלץ להשתמש בחשבון ייעודי נפרד מחשבון אישי

### 3.2 Webhook: `openclaw-db-read` — Read Only

| Node | הגדרה |
|---|---|
| 1. Webhook | `POST` \| Path: `openclaw-db-read` |
| 2. Postgres/MySQL | Credential: DB Read-Only User \| Execute Query |
| 3. Limit rows | עד 1000 שורות |
| 4. Respond | JSON עם תוצאות |

```sql
CREATE USER openclaw_readonly WITH PASSWORD 'strong_pass';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO openclaw_readonly;
```

### 3.3 Webhook: `openclaw-db-write` — Write + Approval

| Node | הגדרה |
|---|---|
| 1. Webhook | `POST` \| Path: `openclaw-db-write` |
| 2. IF Sensitive | אם יש `DELETE`/`TRUNCATE` → אישור ידני |
| 3. Wait (Approval) | Telegram/Email לאישור, המתנה לתגובה |
| 4. DB Execute | ביצוע רק לאחר אישור |
| 5. Log | שמירה ל-`audit_log` |
| 6. Respond | JSON עם תוצאה |

### 3.4 Webhook: `openclaw-browser-stealth` — Browser Automation

| Node | הגדרה |
|---|---|
| 1. Webhook | `POST` \| Path: `openclaw-browser-stealth` |
| 2. HTTP Request | פניה ל-Nodriver/Camoufox ב-M2 (port 9222) |
| 3. Process | Screenshot / DOM extraction / form fill |
| 4. DB Log | שמירת screenshot + metadata |
| 5. Respond | JSON עם תוצאה + screenshot base64 |

---

## 4) Machine 2 — Specialist Agents + Browser

### מה רץ על M2

- Coder Agent — Claude Sonnet 4.6
- Data Agent — Gemini 2.5 Pro
- Browser Service — Nodriver + Camoufox (headless)
- n8n Worker מול Redis של M1

### 4.1 התקנה בסיסית + תוספות

```bash
# כמו M1 (Node24 + OpenClaw + .env + Tailscale), ועוד:
sudo apt install -y docker.io
sudo usermod -aG docker openclaw

sudo apt install -y chromium-browser xvfb python3-pip
pip3 install nodriver camoufox --break-system-packages

Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99
```

ל-systemd service של OpenClaw על M2:

```ini
Environment=DISPLAY=:99
```

n8n worker:

```bash
docker run -d \
  --name n8n-worker \
  --restart always \
  -e EXECUTIONS_MODE=queue \
  -e QUEUE_BULL_REDIS_HOST=<M1_TAILSCALE_IP> \
  -e QUEUE_BULL_REDIS_PORT=6379 \
  n8nio/n8n worker
```

### 4.2 הוספת Agents

```bash
openclaw agents add coder data
```

קטע `agents.list` לדוגמה:

```json
{
  "id": "coder",
  "workspace": "~/.openclaw/workspace-coder",
  "agentDir": "~/.openclaw/agents/coder/agent",
  "model": {
    "primary": "anthropic/claude-sonnet-4-6",
    "fallback": "openrouter/qwen/qwen3-coder-480b:free"
  },
  "skills": ["sql-toolkit", "docker", "github", "eridian"],
  "sandbox": { "mode": "all", "scope": "agent" }
}
```

```json
{
  "id": "data",
  "workspace": "~/.openclaw/workspace-data",
  "agentDir": "~/.openclaw/agents/data/agent",
  "model": {
    "primary": "google/gemini-2.5-pro",
    "fallback": "cerebras/llama-3.3-70b"
  },
  "tools": { "allow": ["read"], "deny": ["write", "exec", "apply_patch"] }
}
```

### 4.3 SOUL.md — Coder

```markdown
## Who You Are
You are CODER — senior software engineer.
Specialties: Python, Node.js, SQL, Docker, Linux.

## Capabilities
- Write, review, debug code
- GitHub: read/write repos
- SQL: READ-ONLY for first 2 weeks, then request write permission
- Docker: sandboxed execution only

## Hard Limits
- NO production DB writes without explicit user approval
- NO npm install from unverified sources
- Always run tests before confirming task complete
- Always report what you did, not just that it worked
```

### 4.4 SOUL.md — Data

```markdown
## Who You Are
You are DATA — data analyst and database specialist.
Models: read-only queries, reports, analytics.

## Capabilities
- SQL SELECT queries only
- Data visualization descriptions
- Report generation
- Anomaly detection in datasets

## Hard Limits
- ONLY read operations (SELECT)
- NO INSERT, UPDATE, DELETE, DROP, TRUNCATE ever
- Max 1000 rows per query — no full table dumps
- Always explain what query you ran and why
```

---

## 5) Skills — סדר התקנה מומלץ

### 5.1 Security first

```bash
npx clawhub install eridian
npx clawhub install antivirus
npx clawhub install error-recovery-automation
```

### 5.2 Google Workspace (GOG)

```bash
npx clawhub install openclaw/gog
openclaw agents send router "list my Google Drive files"
```

### 5.3 Database

```bash
npx clawhub install openclaw/sql-toolkit
```

PostgreSQL user read-only:

```sql
CREATE USER openclaw_readonly WITH PASSWORD 'strong_pass';
GRANT CONNECT ON DATABASE yourdb TO openclaw_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO openclaw_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO openclaw_readonly;
```

### 5.4 Browser + Docker + GitHub

```bash
npx clawhub install openclaw/docker
npx clawhub install openclaw/github
```

דוגמת wrapper בסיסית ל-Nodriver:

```python
from nodriver import Browser
from flask import Flask, request, jsonify
import base64

app = Flask(__name__)

@app.route("/browse", methods=["POST"])
def browse():
    url = request.json.get("url")
    # TODO: browse logic
    return jsonify({"url": url, "screenshot": "<base64>", "html": "<html>...</html>"})

app.run(host="127.0.0.1", port=9222)
```

```bash
pip3 install flask nodriver --break-system-packages
python3 ~/nodriver-server.py
```

---

## 6) Machine 3 — Standby / Rescue Gateway

### עיקרון

- M3 לא מפעיל Gateway באופן קבוע.
- פרופיל נפרד לחלוטין (workspace/state שונים מ-M1).
- אין שיתוף state ישיר בין M1 ל-M3 מעבר לסנכרון מבוקר.

### 6.1 הכנה

```bash
# כמו M1, אבל לא לבצע:
# systemctl enable openclaw
```

סנכרון כל 5 דקות (על M1):

```cron
*/5 * * * * rsync -az --exclude='*.log' --exclude='sessions/' ~/.openclaw/ openclaw@<M3_TAILSCALE_IP>:~/.openclaw/
```

### 6.2 Watchdog — 3 שכבות

`/home/openclaw/readiness-check.sh` (על M3):

```bash
#!/bin/bash
PRIMARY_IP="100.x.x.x"
FAIL_FILE="/tmp/oc_fail_count"
THRESHOLD=2

# Layer 1: liveness
if ! ssh openclaw@$PRIMARY_IP 'openclaw gateway status' 2>/dev/null | rg -q 'running'; then
  FAILS=$(( $(cat $FAIL_FILE 2>/dev/null || echo 0) + 1 ))
  echo $FAILS > $FAIL_FILE

  # Layer 2: readiness
  READY=$(ssh openclaw@$PRIMARY_IP 'openclaw channels status --probe && openclaw health --json' 2>/dev/null)

  if [ -z "$READY" ] && [ "$FAILS" -ge "$THRESHOLD" ]; then
    # Layer 3: failover
    systemctl --user start openclaw
    curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d "chat_id=${CHAT_ID}&text=FAILOVER: M3 gateway activated"
    echo 0 > $FAIL_FILE
  fi
else
  echo 0 > $FAIL_FILE
fi
```

```bash
chmod +x /home/openclaw/readiness-check.sh
crontab -e
# */3 * * * * /home/openclaw/readiness-check.sh
```

---

## 7) Checklist התקנה — לפי סדר

### Machine 1 — Primary Gateway

- [ ] Ubuntu 24.04 + user `openclaw`
- [ ] Node.js 24 (NodeSource)
- [ ] `npm install -g openclaw@latest`
- [ ] `openclaw onboard --install-daemon` עם `loopback`
- [ ] הרשאות: `chmod 700 ~/.openclaw` + `chmod 600 ~/.openclaw/.env`
- [ ] `openclaw.json` עם SecretRef + agents
- [ ] SOUL.md ל-Router + Researcher
- [ ] Redis פעיל
- [ ] n8n Docker על `127.0.0.1:5678`
- [ ] 4 webhooks ב-n8n: google / db-read / db-write / browser
- [ ] Google OAuth2 + DB read-only credentials
- [ ] systemd עם `Restart=always`
- [ ] Tailscale מחובר + serve
- [ ] UFW חוסם `18789` ו-`5678` מבחוץ
- [ ] התקנת security skills
- [ ] `openclaw doctor` ירוק
- [ ] `openclaw health --verbose` תקין

### Machine 2 — Workers

- [ ] כמו M1 + docker/chromium/xvfb
- [ ] `openclaw agents add coder data`
- [ ] SOUL.md ל-Coder + Data
- [ ] n8n worker מול Redis ב-M1
- [ ] Nodriver service על `9222`
- [ ] התקנת `sql-toolkit`, `docker`, `github`
- [ ] DB read-only credentials מוגדרים
- [ ] `sandbox: mode: all` ל-Coder Agent

### Machine 3 — Standby

- [ ] התקנה מלאה כמו M1 ללא gateway פעיל
- [ ] Profile נפרד
- [ ] readiness-check ב-cron כל 3 דקות
- [ ] SSH key מ-M3 ל-M1
- [ ] rsync מ-M1 כל 5 דקות
- [ ] בדיקת failover: M1 down → M3 up תוך כ-6 דקות

---

## 8) Smoke Tests — לאחר התקנה

### 8.1 OpenClaw

```bash
openclaw doctor
openclaw agents list --bindings
openclaw channels status --probe
openclaw gateway status
curl -sf http://127.0.0.1:18789/health && echo "Gateway OK"
openclaw health --verbose
openclaw health --json | jq '.channels'
```

### 8.2 n8n Webhooks

```bash
curl -X POST http://127.0.0.1:5678/webhook/openclaw-google \
  -H 'Content-Type: application/json' \
  -H 'X-OpenClaw-Secret: your-secret' \
  -d '{"intent":"sheets-list","params":{}}'

curl -X POST http://127.0.0.1:5678/webhook/openclaw-db-read \
  -H 'Content-Type: application/json' \
  -d '{"query":"SELECT 1 as test"}'

curl -X POST http://127.0.0.1:5678/webhook/openclaw-browser-stealth \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com","action":"screenshot"}'
```

### 8.3 End-to-End דרך OpenClaw

```bash
openclaw agents send router "list files in my Google Drive"
openclaw agents send router "show me the last 5 records from users table"
openclaw agents send router "take a screenshot of https://example.com"
openclaw agents send researcher "what is the latest news about AI today"
```

---

## 9) Monitoring — SLI/SLO

| מדד (SLI) | יעד (SLO) | Alert |
|---|---|---|
| Gateway liveness | > 99.9% uptime | 3+ כשלות ברצף |
| Channel connectivity | > 95% healthy | channel down > 5 דקות |
| First-token latency | < 3 שניות p95 | latency > 10 שניות |
| n8n workflow success | > 98% | failure rate > 5% |
| Fallback rate (LLM) | < 10% | fallback > 30% בשעה |
| Rate limit hits | < 5% | 429 > 50 לשעה |

פקודות monitoring:

```bash
docker logs n8n --tail=50 -f
openclaw health --json | jq '{uptime, channels, last_error}'
redis-cli info stats | rg 'total_commands|connected_clients'
```

---

## 10) Troubleshooting — בעיות נפוצות

| בעיה | פתרון |
|---|---|
| Google לא מגיב | בדיקת OAuth2 ב-n8n, תוקף token, scopes |
| webhook מחזיר 404 | לבדוק שה-workflow Active ו-path מדויק |
| DB connection failed | firewall + הרשאות read-only user |
| Browser timeout | לוודא Nodriver רץ ו-`DISPLAY=:99` |
| Router לא מנתב ל-n8n | לבדוק SOUL.md ו-`N8N_WEBHOOK_BASE` |
| Gateway לא עולה | Node 24+, `openclaw doctor`, קיום `.env` |
| 429 Rate limit | מפתחות backup, הורדת RPM, backoff |
| M3 לא עולה בכשל | SSH keys, cron של readiness-check |

סקריפט בדיקה לכל הרכיבים:

```bash
#!/bin/bash
echo "=== OpenClaw ==="
openclaw gateway status
openclaw channels status --probe
echo
echo "=== n8n ==="
curl -sf http://127.0.0.1:5678/healthz && echo "n8n OK" || echo "n8n FAIL"
echo
echo "=== Redis ==="
redis-cli ping
echo
echo "=== Tailscale ==="
tailscale status | sed -n '1,5p'
```

---

## 11) Roadmap — שלבי הטמעה

| שלב | מה מטמיעים | ערך |
|---|---|---|
| שלב 1 | M1 + Router + Research + n8n + Google webhook | Google Workspace עובד |
| שלב 2 | M2 + Coder + Data + DB read-only webhook | סוכנים מתמחים + DB |
| שלב 3 | Browser webhook + M3 standby + watchdog | Browser automation + HA |
| שלב 4 | DB write + approval gates + monitoring | Full production |
| המשך | SecretRef file mode, Grafana, Active Memory | Production-grade |
| המשך מתקדם | SecretRef exec/Vault, local fallback (Ollama) | Enterprise-grade |

---

## סיכום

- OpenClaw = חשיבה + routing
- n8n = ביצוע + credentials + retries + logging
- Gateway יחיד ב-M1 עם agents side-by-side
- Health checks ב-3 שכבות (לא רק `/health`)
- Credentials מנוהלים ב-n8n (עקרון least exposure)
- Skills security-first: `eridian` + `antivirus` לפני התקנות אחרות
- מומלץ לעקוב אחרי `docs.openclaw.ai` לעדכונים שוטפים
