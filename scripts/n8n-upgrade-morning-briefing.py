#!/usr/bin/env python3
"""Deploy upgraded Morning Briefing workflow (weather + FX + Ynet + Notion tasks → WhatsApp)."""

from __future__ import annotations

import json
import os
import sys
import uuid
import urllib.error
import urllib.request

WORKFLOW_ID = os.environ.get("N8N_WORKFLOW_ID", "")
BASE = os.environ.get("N8N_BASE_URL", "https://n8n.mavash.net").rstrip("/")
API_KEY = os.environ.get("N8N_API_KEY", "")
ACTIVATE = os.environ.get("N8N_ACTIVATE", "true").lower() in ("1", "true", "yes")

NOTION_CRED_ID = os.environ.get(
    "NOTION_N8N_CRED_ID",
    "KfWZ3dSGOqfFZ3kA" if "dev.n8n" in BASE else "zngixlj5fHQOsAjz",
)
NOTION_CRED_NAME = os.environ.get(
    "NOTION_N8N_CRED_NAME",
    "Notion mavash (briefing)" if "dev.n8n" in BASE else "Notion mavash",
)
TASKS_DB_ID = os.environ.get(
    "NOTION_TASKS_DB_ID",
    "347b9262-5f3c-4989-b3b2-4d6aa8cb77d5" if "dev.n8n" in BASE else "e40707d9-b4e5-490b-93dd-008b852ef677",
)
TASKS_DB_NAME = os.environ.get(
    "NOTION_TASKS_DB_NAME",
    "🎯 מעקב תזכורות יומיות" if "dev.n8n" in BASE else "✅ Tasks",
)

GREEN_CRED_ID = os.environ.get(
    "GREEN_API_CRED_ID",
    "ZYnIsxwkzHrXXOC1" if "dev.n8n" in BASE else "aIiNaPP9DgTw0xyx",
)
GREEN_CRED_NAME = os.environ.get(
    "GREEN_API_CRED_NAME",
    "Green-API account" if "dev.n8n" in BASE else "Green 140",
)
# prod: greenApi | dev green-api plugin: greenApiAuthApi
GREEN_CRED_KEY = os.environ.get(
    "GREEN_API_CRED_KEY",
    "greenApiAuthApi" if "dev.n8n" in BASE else "greenApi",
)
WHATSAPP_CHAT_ID = os.environ.get("WHATSAPP_CHAT_ID", "972544223911@c.us")

# prod: n8n-nodes-whatsapp-green-api.greenApi | dev: @green-api/n8n-nodes-whatsapp-greenapi.greenapi
WHATSAPP_NODE_TYPE = os.environ.get(
    "WHATSAPP_NODE_TYPE",
    "n8n-nodes-whatsapp-green-api.greenApi"
    if "dev.n8n" not in BASE
    else "@green-api/n8n-nodes-whatsapp-greenapi.greenapi",
)

PARSE_CODE = r"""// ☀️ Morning Briefing — pretty WhatsApp edition
const WMO = {0:'בהיר',1:'מעונן קל',2:'מעונן קל',3:'מעונן',45:'ערפילי',48:'ערפילי',51:'טפטוף',53:'טפטוף',55:'גשם קל',61:'גשם',63:'גשם',65:'גשם כבד',71:'שלג',73:'שלג',75:'שלג כבד',80:'ממטרים',81:'ממטרים',82:'ממטרים חזקים',95:'סופת רעמים'};
const WMO_EMOJI = {0:'☀️',1:'🌤',2:'⛅',3:'☁️',45:'🌫',48:'🌫',51:'🌦',53:'🌦',55:'🌧',61:'🌧',63:'🌧',65:'🌧',71:'❄️',73:'❄️',75:'❄️',80:'🌦',81:'🌦',82:'⛈',95:'⛈'};
const DONE = new Set(['done','blocked','cancelled','completed','הושלם','סיום','בוטל','נשלח']);
const CAT_EMOJI = {English:'🎧',Meditation:'🧘',Fitness:'🏃',Reading:'📖',Business:'💼',Health:'💚'};
const GREET = ['בוקר טוב! היום נעשה את זה 🚀','בוקר אור! קדימה ליום מדהים ✨','קום וזרח — היום שלך 💫','בוקר טוב, המנועים מתחממים 🔥','יום חדש, הזדמנויות חדשות 🌅'];
const CLOSERS = ['יום מושלם מחכה לך 🌟','תזיז את ההרים היום ⛰️','קפה, מחשבה, ופעולה ☕','אתה על זה. בהצלחה! 💪','בהצלחה — אני איתך 🤝'];

function notionVal(item, ...names) {
  const j = item.json || {};
  for (const wanted of names) {
    const simpKey = `property_${wanted.toLowerCase().replace(/ /g, '_')}`;
    if (j[simpKey] !== undefined && j[simpKey] !== null && j[simpKey] !== '') {
      const v = j[simpKey];
      if (typeof v === 'object' && v?.start) return v.start;
      return String(v);
    }
  }
  const props = j.properties || j;
  for (const wanted of names) {
    const key = Object.keys(props).find((k) => k.toLowerCase() === wanted.toLowerCase());
    if (!key) continue;
    const v = props[key];
    if (v?.title) return v.title.map((t) => t.plain_text || t.text?.content || '').join('');
    if (v?.rich_text) return v.rich_text.map((t) => t.plain_text || t.text?.content || '').join('');
    if (v?.select) return v.select.name || '';
    if (v?.status) return v.status.name || '';
    if (v?.date) return v.date.start || '';
  }
  if (names.includes('Name') || names.includes('name')) return j.name || '';
  return '';
}

function clip(s, n = 70) {
  const t = String(s || '').replace(/\\"/g, '"').replace(/\s+/g, ' ').trim();
  return t.length <= n ? t : `${t.slice(0, n - 1)}…`;
}

function notionLine(item) {
  const notes = notionVal(item, 'Notes', 'notes');
  const tip = notes.match(/💡\s*טיפ היום:\s*(.+)/)?.[1]?.trim();
  const fact = notes.match(/🎯\s*עובדה מהירה:\s*([^\n]+)/)?.[1]?.trim();
  const title = notionVal(item, 'name', 'Name', 'title') || fact || tip || notes.split('\n')[0] || '';
  const cat = notionVal(item, 'Type', 'type', 'Category', 'category') || '';
  const emoji = CAT_EMOJI[cat] || '✨';
  const text = clip(tip || fact?.replace(/^עובדה מהירה:\s*/i, '') || title.replace(/^🎯\s*/, ''), 65);
  return { text, cat, emoji };
}

function cleanCdata(s) {
  return String(s || '').replace(/<!\[CDATA\[|\]\]>/g, '').trim();
}

function rssField(block, tag) {
  const m = block.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`));
  return cleanCdata(m?.[1] || '');
}

const now = new Date();
const ilTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));
const dayMap = {0:'ראשון',1:'שני',2:'שלישי',3:'רביעי',4:'חמישי',5:'שישי',6:'שבת'};
const dayName = dayMap[ilTime.getDay()];
const datePretty = ilTime.toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem', day: 'numeric', month: 'long' });
const timeStr = ilTime.toLocaleTimeString('he-IL', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit' });
const todayIso = ilTime.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
const greet = GREET[Math.floor(Math.random() * GREET.length)];
const closer = CLOSERS[Math.floor(Math.random() * CLOSERS.length)];

// ── Weather ──
let weatherBlock = '🌡 לא הצלחתי לשלוף מזג אוויר';
try {
  const w = $('Open-Meteo').first().json;
  const c = w.current, d = w.daily;
  const code = c.weather_code;
  const emoji = WMO_EMOJI[code] || '🌡';
  const desc = WMO[code] || 'לא ידוע';
  const temp = Math.round(c.temperature_2m);
  const feels = Math.round(c.apparent_temperature);
  const tMin = Math.round(d.temperature_2m_min[0]);
  const tMax = Math.round(d.temperature_2m_max[0]);
  const rise = d.sunrise?.[0]?.slice(11, 16) || '?';
  const set = d.sunset?.[0]?.slice(11, 16) || '?';
  const wind = Math.round(c.wind_speed_10m);
  const humid = c.relative_humidity_2m;
  let vibe = temp >= 32 ? 'חם — שתה מים 🥤' : temp <= 14 ? 'קריר — שכבה נוספת 🧥' : 'מזג מעולה ליום פרודוקטיבי 👌';
  weatherBlock = `${emoji} *${desc}* · ${temp}° (מרגיש ${feels}°)\n`
    + `📊 ${tMin}°–${tMax}°  ·  🌅 ${rise}  ·  🌇 ${set}  ·  💨 ${wind}  ·  💧 ${humid}%\n`
    + `_${vibe}_`;
} catch (e) { /* keep fallback */ }

// ── FX ──
let fxLine = '💶 שער לא זמין';
try {
  const r = $('EUR/ILS').first().json;
  const eur = (1 / r.rates.EUR).toFixed(2);
  fxLine = `💶 *יורו:* ${eur} ₪`;
} catch (e) { /* keep fallback */ }

// ── News ──
let newsBlock = '📰 אין כותרות כרגע';
try {
  const raw = $('Ynet RSS').first().data || $('Ynet RSS').first().json;
  const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
  const items = text.match(/<item>[\s\S]*?<\/item>/g) || [];
  const lines = [];
  for (let i = 0; i < Math.min(3, items.length); i++) {
    const title = clip(rssField(items[i], 'title'), 85);
    if (title) lines.push(`▸ ${title}`);
  }
  if (lines.length) newsBlock = lines.join('\n');
} catch (e) { /* keep fallback */ }

// ── Tasks ──
let tasksBlock = '✅ _אין משימות פתוחות — יום נקי!_ 🎉';
try {
  const notionItems = $('Notion Tasks Today').all();
  const tasks = notionItems.map((item) => {
    const line = notionLine(item);
    const status = (notionVal(item, 'Status', 'status') || '').toLowerCase();
    const due = (notionVal(item, 'Due Date', 'due_date', 'Date', 'date') || '').slice(0, 10);
    return { ...line, status, due };
  }).filter((t) => {
    if (!t.text) return false;
    if (DONE.has(t.status) || t.status === 'done') return false;
    if (!t.due) return true;
    return t.due <= todayIso;
  }).slice(0, 5);

  if (tasks.length) {
    tasksBlock = tasks.map((t, i) => {
      const late = t.due && t.due < todayIso ? ' ⏰' : '';
      const tag = t.cat ? ` _${t.cat}_` : '';
      return `${i + 1}. ${t.emoji} ${t.text}${tag}${late}`;
    }).join('\n');
  }
} catch (e) {
  tasksBlock = '📋 לא הצלחתי לטעון משימות';
}

// ── Quote / Joke / Word (random each run) ──
let quoteBlock = '';
try {
  const raw = $('Daily Quote').first().json;
  const item = Array.isArray(raw) ? raw[0] : raw;
  if (item?.q) quoteBlock = `💭 *ציטוט היום*\n_"${clip(item.q, 120)}"_\n— _${item.a}_`;
} catch (e) { /* optional */ }

let jokeBlock = '';
try {
  const j = $('Daily Joke').first().json;
  if (j?.setup && j?.delivery) jokeBlock = `😄 *בדיחה*\n${j.setup}\n👉 ${j.delivery}`;
  else if (j?.joke) jokeBlock = `😄 *בדיחה*\n${j.joke}`;
} catch (e) { /* optional */ }

let wordBlock = '';
try {
  const w = $('Random Word').first().json;
  if (w?.word) {
    wordBlock = `📚 *מילה באנגלית:* ${w.word}`
      + (w.pos ? ` _(${w.pos})_` : '')
      + `\n🇮🇱 ${w.he || ''}`
      + (w.example ? `\n✏️ _${w.example}_` : '');
  }
} catch (e) { /* optional */ }

const bonus = [quoteBlock, jokeBlock, wordBlock].filter(Boolean);
for (let i = bonus.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [bonus[i], bonus[j]] = [bonus[j], bonus[i]];
}
const bonusSection = bonus.length ? `\n\n✨ *רגע של השראה*\n${bonus.join('\n\n')}` : '';

const msg = `☀️ *${greet}*\n`
  + `_${dayName} · ${datePretty} · ${timeStr}_\n\n`
  + `━━━━━━━━━━━━━━\n`
  + `🌤 *תל אביב היום*\n${weatherBlock}\n\n`
  + `${fxLine}\n\n`
  + `📰 *מה קורה בעולם*\n${newsBlock}\n\n`
  + `🎯 *הפוקוס שלך היום*\n${tasksBlock}`
  + `${bonusSection}\n\n`
  + `━━━━━━━━━━━━━━\n`
  + `${closer}`;

const truncated = msg.length > 3500 ? `${msg.substring(0, 3480)}…` : msg;
return [{ json: { message: truncated, msgLen: truncated.length } }];
"""

RANDOM_JOKE_CODE = r"""const jokes = [
  { setup: 'למה המחשב הלך לרופא?', delivery: 'כי יש לו וירוס 🦠' },
  { setup: 'מה הענן אמר לענן השני?', delivery: 'בוא נעשה גשם ונעוף מפה ☁️' },
  { setup: 'איך קוראים לדג שמנגן גיטרה?', delivery: 'סלמון אלוויס 🎸' },
  { setup: 'למה לא משחקים קלפים בג\'ונגל?', delivery: 'יותר מדי נמרים 🐯' },
  { setup: 'מה הקפה אמר לסוכר?', delivery: 'אתה ממתיק לי את הבוקר ☕' },
  { setup: 'Why did the developer go broke?', delivery: 'Because he used up all his cache 💸' },
  { setup: 'Why do programmers prefer dark mode?', delivery: 'Because light attracts bugs 🐛' },
  { setup: 'What do you call a fake noodle?', delivery: 'An impasta 🍝' },
  { setup: 'Why did the scarecrow win an award?', delivery: 'He was outstanding in his field 🌾' },
  { setup: 'למה הספר דק?', delivery: 'כי יש לו הרבה דפים חסרים 📖' },
  { setup: 'מה אמר הזמן לשעון?', delivery: 'תפסיק ללחוץ עליי ⏰' },
  { setup: 'איך קוראים לדוב שיודע קראטה?', delivery: 'דוב קאטה 🥋' },
];
const j = jokes[Math.floor(Math.random() * jokes.length)];
return [{ json: j }];
"""

RANDOM_WORD_CODE = r"""const words = [
  { word: 'resilient', pos: 'adj', he: 'גמיש, חזק מבפנים', example: 'Stay resilient when plans change.' },
  { word: 'clarity', pos: 'noun', he: 'בהירות', example: 'Morning clarity helps better decisions.' },
  { word: 'thrive', pos: 'verb', he: 'לשגשג', example: 'Small habits help you thrive.' },
  { word: 'curious', pos: 'adj', he: 'סקרן', example: 'Stay curious and keep learning.' },
  { word: 'momentum', pos: 'noun', he: 'תנע', example: 'One win creates momentum.' },
  { word: 'grateful', pos: 'adj', he: 'אסיר תודה', example: 'I am grateful for today.' },
  { word: 'focus', pos: 'noun', he: 'מיקוד', example: 'Protect your focus in the morning.' },
  { word: 'patient', pos: 'adj', he: 'סבלני', example: 'Be patient with your progress.' },
  { word: 'bold', pos: 'adj', he: 'נועז', example: 'Take one bold step today.' },
  { word: 'spark', pos: 'noun', he: 'ניצוץ', example: 'A small spark can start a fire.' },
  { word: 'calm', pos: 'adj', he: 'רגוע', example: 'A calm mind solves hard problems.' },
  { word: 'effort', pos: 'noun', he: 'מאמץ', example: 'Consistent effort beats talent.' },
  { word: 'bridge', pos: 'noun', he: 'גשר', example: 'Good communication builds bridges.' },
  { word: 'shine', pos: 'verb', he: 'לזרוח', example: 'You shine when you show up.' },
  { word: 'worthwhile', pos: 'adj', he: 'כדאי', example: 'This challenge is worthwhile.' },
];
const w = words[Math.floor(Math.random() * words.length)];
return [{ json: w }];
"""


def nid() -> str:
    return str(uuid.uuid4())


def api(method: str, path: str, body: dict | None = None) -> dict:
    if not API_KEY:
        raise SystemExit("Set N8N_API_KEY")
    req = urllib.request.Request(
        f"{BASE}/api/v1{path}",
        data=None if body is None else json.dumps(body).encode(),
        method=method,
        headers={"X-N8N-API-KEY": API_KEY, "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            raw = resp.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        raise SystemExit(f"{method} {path} -> HTTP {exc.code}: {exc.read().decode()[:800]}") from exc


def build_workflow() -> dict:
    tasks_db_ref = {
        "__rl": True,
        "value": TASKS_DB_ID,
        "mode": "list",
        "cachedResultName": TASKS_DB_NAME,
        "cachedResultUrl": f"https://www.notion.so/{TASKS_DB_ID.replace('-', '')}",
    }

    nodes = [
        {
            "parameters": {
                "rule": {
                    "interval": [{"triggerAtHour": 7}],
                    "timezone": "Asia/Jerusalem",
                }
            },
            "id": nid(),
            "name": "Schedule 07:00 IL",
            "type": "n8n-nodes-base.scheduleTrigger",
            "typeVersion": 1.2,
            "position": [0, 0],
        },
        {
            "parameters": {
                "url": "https://api.open-meteo.com/v1/forecast?latitude=32.08&longitude=34.78&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=Asia%2FJerusalem&forecast_days=1",
                "options": {"timeout": 10000},
            },
            "id": nid(),
            "name": "Open-Meteo",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [280, -120],
        },
        {
            "parameters": {
                "url": "https://api.frankfurter.app/latest?from=ILS&to=EUR",
                "options": {"timeout": 10000},
            },
            "id": nid(),
            "name": "EUR/ILS",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [280, 40],
        },
        {
            "parameters": {
                "url": "https://www.ynet.co.il/Integration/StoryRss2.xml",
                "options": {
                    "response": {"response": {"responseFormat": "text"}},
                    "timeout": 15000,
                },
            },
            "id": nid(),
            "name": "Ynet RSS",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [280, 200],
        },
        {
            "parameters": {
                "resource": "databasePage",
                "operation": "getAll",
                "databaseId": tasks_db_ref,
                "returnAll": True,
                "options": {},
            },
            "id": nid(),
            "name": "Notion Tasks Today",
            "type": "n8n-nodes-base.notion",
            "typeVersion": 2.2,
            "position": [280, 360],
            "onError": "continueRegularOutput",
            "credentials": {
                "notionApi": {"id": NOTION_CRED_ID, "name": NOTION_CRED_NAME}
            },
        },
        {
            "parameters": {
                "url": "https://zenquotes.io/api/random",
                "options": {
                    "timeout": 10000,
                    "response": {"response": {"responseFormat": "json"}},
                },
            },
            "id": nid(),
            "name": "Daily Quote",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [280, 520],
            "onError": "continueRegularOutput",
        },
        {
            "parameters": {"jsCode": RANDOM_JOKE_CODE},
            "id": nid(),
            "name": "Daily Joke",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [280, 680],
        },
        {
            "parameters": {"jsCode": RANDOM_WORD_CODE},
            "id": nid(),
            "name": "Random Word",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [280, 840],
        },
        {
            "parameters": {
                "mode": "combine",
                "combineBy": "combineByPosition",
                "numberInputs": 7,
                "options": {},
            },
            "id": nid(),
            "name": "Merge All",
            "type": "n8n-nodes-base.merge",
            "typeVersion": 3.2,
            "position": [560, 80],
        },
        {
            "parameters": {"jsCode": PARSE_CODE},
            "id": nid(),
            "name": "Parse & Build",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [820, 80],
        },
        {
            "parameters": {
                "chatId": WHATSAPP_CHAT_ID,
                "message": "={{ $json.message }}",
            },
            "id": nid(),
            "name": "WhatsApp Send",
            "type": WHATSAPP_NODE_TYPE,
            "typeVersion": 1,
            "position": [1080, 80],
            "credentials": {GREEN_CRED_KEY: {"id": GREEN_CRED_ID, "name": GREEN_CRED_NAME}},
        },
    ]

    connections = {
        "Schedule 07:00 IL": {
            "main": [[
                {"node": "Open-Meteo", "type": "main", "index": 0},
                {"node": "EUR/ILS", "type": "main", "index": 0},
                {"node": "Ynet RSS", "type": "main", "index": 0},
                {"node": "Notion Tasks Today", "type": "main", "index": 0},
                {"node": "Daily Quote", "type": "main", "index": 0},
                {"node": "Daily Joke", "type": "main", "index": 0},
                {"node": "Random Word", "type": "main", "index": 0},
            ]]
        },
        "Open-Meteo": {"main": [[{"node": "Merge All", "type": "main", "index": 0}]]},
        "EUR/ILS": {"main": [[{"node": "Merge All", "type": "main", "index": 1}]]},
        "Ynet RSS": {"main": [[{"node": "Merge All", "type": "main", "index": 2}]]},
        "Notion Tasks Today": {"main": [[{"node": "Merge All", "type": "main", "index": 3}]]},
        "Daily Quote": {"main": [[{"node": "Merge All", "type": "main", "index": 4}]]},
        "Daily Joke": {"main": [[{"node": "Merge All", "type": "main", "index": 5}]]},
        "Random Word": {"main": [[{"node": "Merge All", "type": "main", "index": 6}]]},
        "Merge All": {"main": [[{"node": "Parse & Build", "type": "main", "index": 0}]]},
        "Parse & Build": {"main": [[{"node": "WhatsApp Send", "type": "main", "index": 0}]]},
    }

    return {
        "name": "☀️ מבזק בוקר IL — v3 (Notion + השראה)",
        "nodes": nodes,
        "connections": connections,
        "settings": {"executionOrder": "v1", "timezone": "Asia/Jerusalem"},
    }


REQUIRED_NODES = {
    "Notion Tasks Today",
    "Merge All",
    "Daily Quote",
    "Daily Joke",
    "Random Word",
}


def patch_existing(wf: dict) -> None:
    tasks_db_ref = {
        "__rl": True,
        "value": TASKS_DB_ID,
        "mode": "list",
        "cachedResultName": TASKS_DB_NAME,
        "cachedResultUrl": f"https://www.notion.so/{TASKS_DB_ID.replace('-', '')}",
    }
    cred = {"notionApi": {"id": NOTION_CRED_ID, "name": NOTION_CRED_NAME}}
    green = {GREEN_CRED_KEY: {"id": GREEN_CRED_ID, "name": GREEN_CRED_NAME}}

    names = {n["name"] for n in wf.get("nodes", [])}
    if "Notion Tasks Today" not in names:
        return

    for node in wf["nodes"]:
        if node["name"] == "Notion Tasks Today":
            node["parameters"]["databaseId"] = tasks_db_ref
            node["credentials"] = cred
            node["onError"] = "continueRegularOutput"
        elif node["name"] == "Parse & Build":
            node["parameters"]["jsCode"] = PARSE_CODE
        elif node["name"] == "Daily Joke":
            node["parameters"]["jsCode"] = RANDOM_JOKE_CODE
        elif node["name"] == "Random Word":
            node["parameters"]["jsCode"] = RANDOM_WORD_CODE
        elif node["name"] == "Merge All":
            node["parameters"]["numberInputs"] = 7
        elif node["name"] == "WhatsApp Send":
            node["parameters"]["chatId"] = WHATSAPP_CHAT_ID
            node["credentials"] = green
            node["type"] = WHATSAPP_NODE_TYPE


def main() -> None:
    if WORKFLOW_ID:
        existing = api("GET", f"/workflows/{WORKFLOW_ID}")
        names = {n["name"] for n in existing.get("nodes", [])}
        if REQUIRED_NODES.issubset(names):
            wf = existing
            patch_existing(wf)
            payload = {
                "name": wf["name"],
                "nodes": wf["nodes"],
                "connections": wf["connections"],
                "settings": {"executionOrder": "v1", "timezone": "Asia/Jerusalem"},
            }
        else:
            wf = build_workflow()
            payload = {
                "name": wf["name"],
                "nodes": wf["nodes"],
                "connections": wf["connections"],
                "settings": wf["settings"],
            }
        api("PUT", f"/workflows/{WORKFLOW_ID}", payload)
        wf_id = WORKFLOW_ID
        action = "updated"
    else:
        wf = build_workflow()
        payload = {
            "name": wf["name"],
            "nodes": wf["nodes"],
            "connections": wf["connections"],
            "settings": wf["settings"],
        }
        created = api("POST", "/workflows", payload)
        wf_id = created["id"]
        action = "created"

    url = f"{BASE}/workflow/{wf_id}"
    print(f"OK: workflow {action} -> {url}")

    if ACTIVATE:
        try:
            api("POST", f"/workflows/{wf_id}/activate", {})
            print("OK: workflow activated")
        except SystemExit as exc:
            print(f"WARN: activate failed ({exc}); enable manually in n8n UI", file=sys.stderr)


if __name__ == "__main__":
    main()
