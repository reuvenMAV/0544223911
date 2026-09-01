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

NOTION_CRED_ID = os.environ.get("NOTION_N8N_CRED_ID", "zngixlj5fHQOsAjz")
NOTION_CRED_NAME = os.environ.get("NOTION_N8N_CRED_NAME", "Notion mavash")
TASKS_DB_ID = os.environ.get("NOTION_TASKS_DB_ID", "e40707d9-b4e5-490b-93dd-008b852ef677")
TASKS_DB_NAME = os.environ.get("NOTION_TASKS_DB_NAME", "✅ Tasks")

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

PARSE_CODE = r"""// Parse all sources and build morning briefing
const WMO = {0:'בהיר',1:'בהיר חלקית',2:'בהיר חלקית',3:'בהיר חלקית',45:'ערפל',48:'ערפל',51:'טפטוף',53:'טפטוף',55:'טפטוף',61:'גשם',63:'גשם',65:'גשם',71:'שלג',73:'שלג',75:'שלג',80:'גשם לפרקים',81:'גשם לפרקים',82:'גשם לפרקים',95:'סופה'};
const DONE = new Set(['done', 'blocked', 'cancelled', 'הושלם', 'סיום', 'בוטל']);

function notionVal(item, ...names) {
  const j = item.json || {};
  const props = j.properties || j;
  for (const wanted of names) {
    const key = Object.keys(props).find((k) => k.toLowerCase() === wanted.toLowerCase());
    if (key) {
      const v = props[key];
      if (v?.title) return v.title.map((t) => t.plain_text || t.text?.content || '').join('');
      if (v?.rich_text) return v.rich_text.map((t) => t.plain_text || t.text?.content || '').join('');
      if (v?.select) return v.select.name || '';
      if (v?.status) return v.status.name || '';
      if (v?.date) return v.date.start || '';
    }
    const simp = j[`property_${wanted.toLowerCase().replace(/ /g, '_')}`];
    if (simp !== undefined && simp !== null) return String(simp);
  }
  return j.name || '';
}

const now = new Date();
const ilTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));
const dayMap = { 0: 'ראשון', 1: 'שני', 2: 'שלישי', 3: 'רביעי', 4: 'חמישי', 5: 'שישי', 6: 'שבת' };
const dayName = dayMap[ilTime.getDay()];
const dateStr = ilTime.toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' });
const timeStr = ilTime.toLocaleTimeString('he-IL', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit' });
const todayIso = ilTime.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });

let wSection = 'מקור Open-Meteo לא זמין';
try {
  const w = $('Open-Meteo').first().json;
  const c = w.current;
  const d = w.daily;
  const desc = WMO[c.weather_code] || `קוד ${c.weather_code}`;
  const rise = d.sunrise?.[0]?.slice(-5) || '?';
  const set = d.sunset?.[0]?.slice(-5) || '?';
  wSection = `מצב: ${desc} | ${c.temperature_2m.toFixed(0)}°C (מרגיש ${c.apparent_temperature.toFixed(0)}°C)\n`
    + `טווח: ${d.temperature_2m_min[0].toFixed(0)}–${d.temperature_2m_max[0].toFixed(0)}°C | לחות: ${c.relative_humidity_2m}%\n`
    + `רוח: ${c.wind_speed_10m.toFixed(0)} קמש | שמש: ${rise}–${set}\n`
    + `עדכון: ${c.time} (Open-Meteo)`;
} catch (e) {
  wSection = 'שגיאה בקריאת מזג אוויר';
}

let cSection = 'מקור frankfurter.app לא זמין';
try {
  const r = $('EUR/ILS').first().json;
  const eurIls = (1 / r.rates.EUR).toFixed(2);
  cSection = `1 EUR = ${eurIls} שקלים\nנתון: ${r.date} (frankfurter.app)`;
} catch (e) {
  cSection = 'שגיאה בקריאת שער חליפין';
}

let nSection = 'מקור Ynet RSS לא זמין';
try {
  const raw = $('Ynet RSS').first().data || $('Ynet RSS').first().json;
  const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
  const items = text.match(/<item>[\s\S]*?<\/item>/g) || [];
  const lines = [];
  for (let i = 0; i < Math.min(3, items.length); i++) {
    const title = items[i].match(/<title><!\[CDATA\[(.+?)\]\]><\/title>/)?.[1]
      || items[i].match(/<title>(.+?)<\/title>/)?.[1] || '?';
    const link = items[i].match(/<link>(.+?)<\/link>/)?.[1] || '?';
    const pub = items[i].match(/<pubDate>(.+?)<\/pubDate>/)?.[1] || '?';
    lines.push(`${i + 1}. ${title}\n   ${link}\n   שעת פרסום: ${pub}`);
  }
  nSection = lines.join('\n') || 'אין כותרות זמינות';
} catch (e) {
  nSection = 'שגיאה בקריאת RSS';
}

let noSection = 'לא הוגדר חיבור Notion בתצורה';
try {
  const notionItems = $('Notion Tasks Today').all();
  if (!notionItems.length) {
    noSection = 'אין משימות במסד Notion';
  } else {
    const tasks = notionItems.map((item) => {
      const title = notionVal(item, 'Name', 'Task name', 'title') || '?';
      const status = (notionVal(item, 'Status', 'status') || '').trim();
      const dueRaw = notionVal(item, 'Due Date', 'Due date', 'due') || '';
      const due = dueRaw.slice(0, 10);
      const priority = notionVal(item, 'Priority', 'priority');
      return { title, status, due, priority };
    }).filter((t) => {
      if (!t.due) return false;
      if (t.due > todayIso) return false;
      const s = t.status.toLowerCase();
      return !DONE.has(s) && s !== 'done';
    }).slice(0, 8);

    if (!tasks.length) {
      noSection = 'אין משימות פתוחות להיום 🎉';
    } else {
      noSection = tasks.map((t, i) => {
        const pri = t.priority ? ` [${t.priority}]` : '';
        const late = t.due < todayIso ? ' ⚠️ באיחור' : '';
        return `${i + 1}. ${t.title}${pri}${late}`;
      }).join('\n');
    }
  }
} catch (e) {
  noSection = 'שגיאה בקריאת משימות Notion';
}

const msg = `☀️ מבזק בוקר — ${dayName} ${dateStr} ${timeStr}\n\n`
  + `🌡 מזג אוויר — תל אביב\n${wSection}\n\n`
  + `💱 שער חליפין\n${cSection}\n\n`
  + `📰 חדשות אחרונות\n${nSection}\n\n`
  + `📋 משימות להיום (Notion)\n${noSection}\n\n`
  + `————————————————\n`
  + `המבזק נוצר ב-${timeStr} (שעון ישראל)\n`
  + `נתונים מאותה הרצה בלבד`;

const truncated = msg.length > 3500 ? `${msg.substring(0, 3490)}...` : msg;
return [{ json: { message: truncated, msgLen: truncated.length } }];
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
            "credentials": {
                "notionApi": {"id": NOTION_CRED_ID, "name": NOTION_CRED_NAME}
            },
        },
        {
            "parameters": {
                "mode": "combine",
                "combineBy": "combineByPosition",
                "numberInputs": 4,
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
            ]]
        },
        "Open-Meteo": {"main": [[{"node": "Merge All", "type": "main", "index": 0}]]},
        "EUR/ILS": {"main": [[{"node": "Merge All", "type": "main", "index": 1}]]},
        "Ynet RSS": {"main": [[{"node": "Merge All", "type": "main", "index": 2}]]},
        "Notion Tasks Today": {"main": [[{"node": "Merge All", "type": "main", "index": 3}]]},
        "Merge All": {"main": [[{"node": "Parse & Build", "type": "main", "index": 0}]]},
        "Parse & Build": {"main": [[{"node": "WhatsApp Send", "type": "main", "index": 0}]]},
    }

    return {
        "name": "☀️ מבזק בוקר IL — v2 (Notion + WhatsApp)",
        "nodes": nodes,
        "connections": connections,
        "settings": {"executionOrder": "v1", "timezone": "Asia/Jerusalem"},
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
        elif node["name"] == "Parse & Build":
            node["parameters"]["jsCode"] = PARSE_CODE
        elif node["name"] == "WhatsApp Send":
            node["parameters"]["chatId"] = WHATSAPP_CHAT_ID
            node["credentials"] = green
            node["type"] = WHATSAPP_NODE_TYPE


def main() -> None:
    if WORKFLOW_ID:
        existing = api("GET", f"/workflows/{WORKFLOW_ID}")
        names = {n["name"] for n in existing.get("nodes", [])}
        if "Notion Tasks Today" in names and "Merge All" in names:
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
