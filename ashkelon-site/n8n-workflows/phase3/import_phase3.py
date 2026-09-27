#!/usr/bin/env python3
"""Import Ashkelon Phase 3 critical n8n workflows."""
from __future__ import annotations

import copy
import json
import os
import pathlib
import urllib.request
from pathlib import Path

N8N = os.environ["N8N_BASE_URL"].rstrip("/")
KEY = os.environ["N8N_API_KEY"]
TG_CRED = {
    "telegramApi": {"id": "8K4uLUGikVrC2jmD", "name": "מעקב מסחר Telegram"}
}
TG_CHAT = "8503731042"
AIR_CRED = {
    "airtableTokenApi": {
        "id": "8V0JrT9oUrPlDQul",
        "name": "Airtable Personal Access bitreuven",
    }
}
SB_URL = open("/tmp/supabase-ashkelon-url.txt").read().strip()
env: dict[str, str] = {}
for line in Path("/workspace/ashkelon-site/.env.local").read_text().splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        env[k] = v.strip()
SR = env["SUPABASE_SERVICE_ROLE_KEY"]
BASE = "appSP419jrkoX3u3x"
TBL_BLOCK = "tblrEehaTbBzD4izM"
OUT = pathlib.Path("/workspace/ashkelon-site/n8n-workflows/phase3")
OUT.mkdir(parents=True, exist_ok=True)


def api(method: str, path: str, body=None):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(
        f"{N8N}{path}",
        data=data,
        method=method,
        headers={"X-N8N-API-KEY": KEY, "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req) as r:
            return json.load(r)
    except Exception as e:
        err = e.read().decode() if hasattr(e, "read") else str(e)
        raise RuntimeError(f"{method} {path}: {err}") from e


def find(name: str):
    return next(
        (
            w
            for w in api("GET", "/api/v1/workflows?limit=250").get("data", [])
            if w["name"] == name
        ),
        None,
    )


def upsert(wf: dict, activate: bool = True) -> str:
    existing = find(wf["name"])
    payload = {
        "name": wf["name"],
        "nodes": wf["nodes"],
        "connections": wf["connections"],
        "settings": wf.get("settings") or {"executionOrder": "v1"},
    }
    if existing:
        wid = existing["id"]
        try:
            api("POST", f"/api/v1/workflows/{wid}/deactivate", {})
        except Exception:
            pass
        api("PUT", f"/api/v1/workflows/{wid}", payload)
    else:
        wid = api("POST", "/api/v1/workflows", payload)["id"]
    if activate:
        try:
            api("POST", f"/api/v1/workflows/{wid}/activate", {})
            print("OK", wf["name"], wid)
        except Exception as e:
            print("ACT FAIL", wf["name"], e)
    else:
        print("SAVED", wf["name"], wid)

    safe = copy.deepcopy(payload)
    for n in safe["nodes"]:
        hp = (n.get("parameters") or {}).get("headerParameters", {})
        if isinstance(hp, dict):
            for p in hp.get("parameters", []):
                if p.get("name") in ("apikey", "Authorization"):
                    p["value"] = "***"
    OUT.joinpath(wf["name"].replace(" ", "_") + ".json").write_text(
        json.dumps(safe, ensure_ascii=False, indent=2)
    )
    return wid


def sb_headers():
    return {
        "parameters": [
            {"name": "apikey", "value": SR},
            {"name": "Authorization", "value": f"Bearer {SR}"},
            {"name": "Content-Type", "value": "application/json"},
            {"name": "Prefer", "value": "return=representation"},
        ]
    }


def update_ask02_keyboard():
    wid = "GdnT5EH6TJlTlZZA"
    wf = api("GET", f"/api/v1/workflows/{wid}")
    for n in wf["nodes"]:
        if n["name"] == "Telegram Reuven":
            n["parameters"]["additionalFields"] = {
                "appendAttribution": False,
                "parse_mode": "HTML",
                "replyMarkup": "inlineKeyboard",
                "inlineKeyboard": {
                    "rows": [
                        {
                            "row": [
                                {
                                    "text": "✅ אשר",
                                    "additionalFields": {"callback_data": "approve"},
                                },
                                {
                                    "text": "🔑 שלח קוד",
                                    "additionalFields": {"callback_data": "send_code"},
                                },
                                {
                                    "text": "📄 Wallet",
                                    "additionalFields": {
                                        "url": "={{ $json.wallet_url }}"
                                    },
                                },
                            ]
                        }
                    ]
                },
            }
    api(
        "PUT",
        f"/api/v1/workflows/{wid}",
        {
            "name": wf["name"],
            "nodes": wf["nodes"],
            "connections": wf["connections"],
            "settings": wf.get("settings") or {"executionOrder": "v1"},
        },
    )
    api("POST", f"/api/v1/workflows/{wid}/activate", {})
    print("ASK-02 keyboard updated")


def build_ask10():
    status_url = (
        SB_URL
        + "/rest/v1/bookings?status=eq.paid&select=guest_name,phone,checkin,checkout,status"
        + "&checkin=lte.{{$json.today}}&checkout=gt.{{$json.today}}&order=checkin.asc&limit=5"
    )
    today_url = (
        SB_URL
        + "/rest/v1/bookings?select=guest_name,phone,checkin,checkout,status"
        + "&or=(checkin.eq.{{$json.today}},checkout.eq.{{$json.today}})&order=checkin.asc"
    )

    return {
        "name": "ASK-10 ניהול מטלגרם",
        "nodes": [
            {
                "id": "tgtrig",
                "name": "Telegram Trigger",
                "type": "n8n-nodes-base.telegramTrigger",
                "typeVersion": 1.1,
                "position": [0, 0],
                "credentials": TG_CRED,
                "parameters": {"updates": ["message"], "additionalFields": {}},
            },
            {
                "id": "parse",
                "name": "Parse Command",
                "type": "n8n-nodes-base.code",
                "typeVersion": 2,
                "position": [240, 0],
                "parameters": {
                    "jsCode": r"""
const msg = $input.first().json.message || $input.first().json;
const text = (msg.text || '').trim();
const chatId = msg.chat?.id || msg.chatId;
const parts = text.split(/\s+/);
const cmd = (parts[0] || '').split('@')[0].toLowerCase();
let action = 'help';
let payload = {};
if (cmd === '/block' || cmd === '/blockdates') {
  action = 'block';
  const arg = parts.slice(1).join(' ');
  payload = { raw: arg };
  const iso = arg.match(/(\d{4}-\d{2}-\d{2}).*?(\d{4}-\d{2}-\d{2})/);
  if (iso) { payload.start = iso[1]; payload.end = iso[2]; }
  else {
    const m = arg.match(/(\d{1,2})-(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?/);
    if (m) {
      const y = m[4] || String(new Date().getFullYear());
      const mm = m[3].padStart(2,'0');
      payload.start = `${y}-${mm}-${m[1].padStart(2,'0')}`;
      payload.endInclusive = `${y}-${mm}-${m[2].padStart(2,'0')}`;
    }
  }
} else if (cmd === '/status') action = 'status';
else if (cmd === '/today') action = 'today';
else if (cmd === '/price') { action = 'price'; payload = { raw: parts.slice(1).join(' ') }; }
else if (cmd === '/start' || cmd === '/help') action = 'help';
return [{ json: { chatId, text, cmd, action, payload, message: msg } }];
"""
                },
            },
            {
                "id": "switch",
                "name": "Switch Action",
                "type": "n8n-nodes-base.switch",
                "typeVersion": 3,
                "position": [480, 0],
                "parameters": {
                    "rules": {
                        "values": [
                            {
                                "conditions": {
                                    "conditions": [
                                        {
                                            "leftValue": "={{ $json.action }}",
                                            "rightValue": "block",
                                            "operator": {
                                                "type": "string",
                                                "operation": "equals",
                                            },
                                        }
                                    ]
                                },
                                "renameOutput": True,
                                "outputKey": "block",
                            },
                            {
                                "conditions": {
                                    "conditions": [
                                        {
                                            "leftValue": "={{ $json.action }}",
                                            "rightValue": "status",
                                            "operator": {
                                                "type": "string",
                                                "operation": "equals",
                                            },
                                        }
                                    ]
                                },
                                "renameOutput": True,
                                "outputKey": "status",
                            },
                            {
                                "conditions": {
                                    "conditions": [
                                        {
                                            "leftValue": "={{ $json.action }}",
                                            "rightValue": "today",
                                            "operator": {
                                                "type": "string",
                                                "operation": "equals",
                                            },
                                        }
                                    ]
                                },
                                "renameOutput": True,
                                "outputKey": "today",
                            },
                        ]
                    },
                    "options": {"fallbackOutput": "extra"},
                },
            },
            {
                "id": "blockdates",
                "name": "Build Block Dates",
                "type": "n8n-nodes-base.code",
                "typeVersion": 2,
                "position": [720, -200],
                "parameters": {
                    "jsCode": r"""
const j = $input.first().json;
let start = j.payload.start;
let endInc = j.payload.endInclusive || j.payload.end;
if (!start || !endInc) {
  return [{ json: { ...j, ok: false, reply: 'שימוש: /block 10-12.10 או /block 2026-10-10 2026-10-12' } }];
}
let endExclusive;
if (j.payload.end && !j.payload.endInclusive) {
  endExclusive = j.payload.end;
} else {
  const d = new Date(endInc + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  endExclusive = d.toISOString().slice(0,10);
}
const dates = [];
let cur = new Date(start + 'T00:00:00Z');
const end = new Date(endExclusive + 'T00:00:00Z');
while (cur < end) {
  dates.push(cur.toISOString().slice(0,10));
  cur.setUTCDate(cur.getUTCDate() + 1);
}
return [{ json: { ...j, ok: true, dates, start, endExclusive } }];
"""
                },
            },
            {
                "id": "ifblock",
                "name": "IF Block OK",
                "type": "n8n-nodes-base.if",
                "typeVersion": 2.2,
                "position": [940, -200],
                "parameters": {
                    "conditions": {
                        "options": {"typeValidation": "loose"},
                        "conditions": [
                            {
                                "id": "1",
                                "leftValue": "={{ $json.ok }}",
                                "rightValue": True,
                                "operator": {
                                    "type": "boolean",
                                    "operation": "true",
                                    "singleValue": True,
                                },
                            }
                        ],
                        "combinator": "and",
                    }
                },
            },
            {
                "id": "split",
                "name": "Split Dates",
                "type": "n8n-nodes-base.code",
                "typeVersion": 2,
                "position": [1160, -260],
                "parameters": {
                    "jsCode": "const j=$input.first().json; return j.dates.map(d=>({json:{date:d, chatId:j.chatId}}));"
                },
            },
            {
                "id": "airblock",
                "name": "Airtable Block",
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.2,
                "position": [1380, -320],
                "credentials": AIR_CRED,
                "parameters": {
                    "method": "POST",
                    "url": f"https://api.airtable.com/v0/{BASE}/{TBL_BLOCK}",
                    "authentication": "predefinedCredentialType",
                    "nodeCredentialType": "airtableTokenApi",
                    "sendBody": True,
                    "specifyBody": "json",
                    "jsonBody": "={{ JSON.stringify({ fields: { Date: $json.date, Source: 'manual', Reason: 'telegram-/block' } }) }}",
                    "options": {},
                },
                "continueOnFail": True,
            },
            {
                "id": "sbblock",
                "name": "Supabase Block",
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.2,
                "position": [1380, -160],
                "parameters": {
                    "method": "POST",
                    "url": f"{SB_URL}/rest/v1/blocked_dates",
                    "sendHeaders": True,
                    "headerParameters": sb_headers(),
                    "sendBody": True,
                    "specifyBody": "json",
                    "jsonBody": "={{ JSON.stringify({ date: $json.date, source: 'manual', reason: 'telegram-/block' }) }}",
                    "options": {},
                },
                "continueOnFail": True,
            },
            {
                "id": "agg",
                "name": "Agg Blocks",
                "type": "n8n-nodes-base.aggregate",
                "typeVersion": 1,
                "position": [1600, -320],
                "parameters": {"aggregate": "aggregateAllItemData", "options": {}},
            },
            {
                "id": "replyblock",
                "name": "Reply Block Done",
                "type": "n8n-nodes-base.telegram",
                "typeVersion": 1.2,
                "position": [1820, -260],
                "credentials": TG_CRED,
                "parameters": {
                    "resource": "message",
                    "operation": "sendMessage",
                    "chatId": "={{ $('Build Block Dates').item.json.chatId }}",
                    "text": "={{ '✅ נחסמו ' + ($('Build Block Dates').item.json.dates||[]).length + ' תאריכים ב-Airtable+Supabase: ' + ($('Build Block Dates').item.json.dates||[]).join(', ') }}",
                    "additionalFields": {
                        "appendAttribution": False,
                        "parse_mode": "HTML",
                    },
                },
            },
            {
                "id": "replybad",
                "name": "Reply Block Usage",
                "type": "n8n-nodes-base.telegram",
                "typeVersion": 1.2,
                "position": [1160, -80],
                "credentials": TG_CRED,
                "parameters": {
                    "resource": "message",
                    "operation": "sendMessage",
                    "chatId": "={{ $json.chatId }}",
                    "text": "={{ $json.reply }}",
                    "additionalFields": {"appendAttribution": False},
                },
            },
            {
                "id": "statusprep",
                "name": "Status Prep",
                "type": "n8n-nodes-base.code",
                "typeVersion": 2,
                "position": [720, 40],
                "parameters": {
                    "jsCode": "const j=$input.first().json; const today=new Date().toISOString().slice(0,10); return [{json:{...j, today}}];"
                },
            },
            {
                "id": "statusq",
                "name": "Query Status",
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.2,
                "position": [940, 40],
                "parameters": {
                    "method": "GET",
                    "url": "=" + status_url,
                    "sendHeaders": True,
                    "headerParameters": {
                        "parameters": [
                            {"name": "apikey", "value": SR},
                            {"name": "Authorization", "value": f"Bearer {SR}"},
                        ]
                    },
                    "options": {},
                },
                "continueOnFail": True,
            },
            {
                "id": "replystatus",
                "name": "Reply Status",
                "type": "n8n-nodes-base.telegram",
                "typeVersion": 1.2,
                "position": [1160, 40],
                "credentials": TG_CRED,
                "parameters": {
                    "resource": "message",
                    "operation": "sendMessage",
                    "chatId": "={{ $('Parse Command').item.json.chatId }}",
                    "text": "={{ (() => { const rows = Array.isArray($json) ? $json : []; if (!rows.length) return 'הדירה פנויה כרגע (אין הזמנה paid היום)'; return 'מי בדירה עכשיו:\\n' + rows.map(r => `${r.guest_name} | ${r.phone}\\n${r.checkin} עד ${r.checkout} | ${r.status}`).join('\\n\\n'); })() }}",
                    "additionalFields": {"appendAttribution": False},
                },
            },
            {
                "id": "todayprep",
                "name": "Today Prep",
                "type": "n8n-nodes-base.code",
                "typeVersion": 2,
                "position": [720, 160],
                "parameters": {
                    "jsCode": "const j=$input.first().json; const today=new Date().toISOString().slice(0,10); return [{json:{...j, today}}];"
                },
            },
            {
                "id": "todayq",
                "name": "Query Today",
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.2,
                "position": [940, 160],
                "parameters": {
                    "method": "GET",
                    "url": "=" + today_url,
                    "sendHeaders": True,
                    "headerParameters": {
                        "parameters": [
                            {"name": "apikey", "value": SR},
                            {"name": "Authorization", "value": f"Bearer {SR}"},
                        ]
                    },
                    "options": {},
                },
                "continueOnFail": True,
            },
            {
                "id": "replytoday",
                "name": "Reply Today",
                "type": "n8n-nodes-base.telegram",
                "typeVersion": 1.2,
                "position": [1160, 160],
                "credentials": TG_CRED,
                "parameters": {
                    "resource": "message",
                    "operation": "sendMessage",
                    "chatId": "={{ $('Parse Command').item.json.chatId }}",
                    "text": "={{ (() => { const rows = Array.isArray($json) ? $json : []; const t=$('Today Prep').item.json.today; if (!rows.length) return 'אין כניסות/יציאות היום'; const cin=rows.filter(r=>r.checkin===t); const cout=rows.filter(r=>r.checkout===t); return 'היום:\\nכניסות: '+(cin.map(r=>r.guest_name).join(', ')||'-')+'\\nיציאות: '+(cout.map(r=>r.guest_name).join(', ')||'-'); })() }}",
                    "additionalFields": {"appendAttribution": False},
                },
            },
            {
                "id": "replyhelp",
                "name": "Reply Help",
                "type": "n8n-nodes-base.telegram",
                "typeVersion": 1.2,
                "position": [720, 280],
                "credentials": TG_CRED,
                "parameters": {
                    "resource": "message",
                    "operation": "sendMessage",
                    "chatId": "={{ $json.chatId }}",
                    "text": "פקודות Ashkelon:\n/status - מי בדירה\n/today - כניסות/יציאות היום\n/block 10-12.10 - חסימת תאריכים\n/price - בקרוב",
                    "additionalFields": {"appendAttribution": False},
                },
            },
        ],
        "connections": {
            "Telegram Trigger": {
                "main": [[{"node": "Parse Command", "type": "main", "index": 0}]]
            },
            "Parse Command": {
                "main": [[{"node": "Switch Action", "type": "main", "index": 0}]]
            },
            "Switch Action": {
                "main": [
                    [{"node": "Build Block Dates", "type": "main", "index": 0}],
                    [{"node": "Status Prep", "type": "main", "index": 0}],
                    [{"node": "Today Prep", "type": "main", "index": 0}],
                    [{"node": "Reply Help", "type": "main", "index": 0}],
                ]
            },
            "Build Block Dates": {
                "main": [[{"node": "IF Block OK", "type": "main", "index": 0}]]
            },
            "IF Block OK": {
                "main": [
                    [{"node": "Split Dates", "type": "main", "index": 0}],
                    [{"node": "Reply Block Usage", "type": "main", "index": 0}],
                ]
            },
            "Split Dates": {
                "main": [
                    [
                        {"node": "Airtable Block", "type": "main", "index": 0},
                        {"node": "Supabase Block", "type": "main", "index": 0},
                    ]
                ]
            },
            "Airtable Block": {
                "main": [[{"node": "Agg Blocks", "type": "main", "index": 0}]]
            },
            "Agg Blocks": {
                "main": [[{"node": "Reply Block Done", "type": "main", "index": 0}]]
            },
            "Status Prep": {
                "main": [[{"node": "Query Status", "type": "main", "index": 0}]]
            },
            "Query Status": {
                "main": [[{"node": "Reply Status", "type": "main", "index": 0}]]
            },
            "Today Prep": {
                "main": [[{"node": "Query Today", "type": "main", "index": 0}]]
            },
            "Query Today": {
                "main": [[{"node": "Reply Today", "type": "main", "index": 0}]]
            },
        },
        "settings": {"executionOrder": "v1"},
    }


def build_cron_workflow(
    name: str,
    cron: str,
    text: str,
    hour: str | None = None,
    minute: str = "0",
):
    """Simple cron -> telegram report workflows for Phase 3 placeholders that are importable+active."""
    trigger_params = {
        "rule": {
            "interval": [
                {
                    "field": "cronExpression",
                    "expression": cron,
                }
            ]
        }
    }
    return {
        "name": name,
        "nodes": [
            {
                "id": "cron",
                "name": "Cron",
                "type": "n8n-nodes-base.scheduleTrigger",
                "typeVersion": 1.2,
                "position": [0, 0],
                "parameters": trigger_params,
            },
            {
                "id": "code",
                "name": "Build Message",
                "type": "n8n-nodes-base.code",
                "typeVersion": 2,
                "position": [240, 0],
                "parameters": {
                    "jsCode": f"return [{{ json: {{ chatId: '{TG_CHAT}', text: `{text}` }} }}];"
                },
            },
            {
                "id": "tg",
                "name": "Telegram",
                "type": "n8n-nodes-base.telegram",
                "typeVersion": 1.2,
                "position": [480, 0],
                "credentials": TG_CRED,
                "parameters": {
                    "resource": "message",
                    "operation": "sendMessage",
                    "chatId": "={{ $json.chatId }}",
                    "text": "={{ $json.text }}",
                    "additionalFields": {
                        "appendAttribution": False,
                        "parse_mode": "HTML",
                    },
                },
            },
        ],
        "connections": {
            "Cron": {"main": [[{"node": "Build Message", "type": "main", "index": 0}]]},
            "Build Message": {
                "main": [[{"node": "Telegram", "type": "main", "index": 0}]]
            },
        },
        "settings": {"executionOrder": "v1"},
    }


def build_ical():
    """Hourly iCal sync — URLs configurable via workflow static note; supports manual ICS webhook too."""
    # Placeholder public empty calendar won't work; use webhook + cron that fetches configured URLs from Supabase settings if present.
    # For now: cron fetches env-like hardcoded placeholders; also expose webhook ashkelon-ical-sync for manual test.
    airbnb = env.get("AIRBNB_ICAL_URL", "")
    booking = env.get("BOOKING_ICAL_URL", "")
    return {
        "name": "ASK-04 סנכרון iCal",
        "nodes": [
            {
                "id": "cron",
                "name": "Cron 1h",
                "type": "n8n-nodes-base.scheduleTrigger",
                "typeVersion": 1.2,
                "position": [0, 0],
                "parameters": {
                    "rule": {
                        "interval": [{"field": "hours", "hoursInterval": 1}]
                    }
                },
            },
            {
                "id": "wh",
                "name": "Manual Sync Webhook",
                "type": "n8n-nodes-base.webhook",
                "typeVersion": 2,
                "position": [0, 200],
                "webhookId": "ashkelon-ical-sync",
                "parameters": {
                    "httpMethod": "POST",
                    "path": "ashkelon-ical-sync",
                    "responseMode": "lastNode",
                    "options": {},
                },
            },
            {
                "id": "urls",
                "name": "Resolve URLs",
                "type": "n8n-nodes-base.code",
                "typeVersion": 2,
                "position": [240, 80],
                "parameters": {
                    "jsCode": f"""
const body = ($input.first().json.body || $input.first().json) || {{}};
const urls = [];
const airbnb = body.airbnb_ical || '{airbnb}' || '';
const booking = body.booking_ical || '{booking}' || '';
if (airbnb) urls.push({{ source: 'airbnb', url: airbnb }});
if (booking) urls.push({{ source: 'booking.com', url: booking }});
if (body.ics_text) return [{{ json: {{ source: body.source || 'manual', ics_text: body.ics_text, mode: 'text' }} }}];
if (!urls.length) return [{{ json: {{ error: 'no_ical_urls', message: 'Set AIRBNB_ICAL_URL / BOOKING_ICAL_URL or POST ics_text' }} }}];
return urls.map(u => ({{ json: {{ ...u, mode: 'url' }} }}));
"""
                },
            },
            {
                "id": "fetch",
                "name": "Fetch ICS",
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.2,
                "position": [480, 0],
                "parameters": {
                    "method": "GET",
                    "url": "={{ $json.url }}",
                    "options": {"response": {"response": {"responseFormat": "text"}}},
                },
                "continueOnFail": True,
            },
            {
                "id": "parse",
                "name": "Parse ICS",
                "type": "n8n-nodes-base.code",
                "typeVersion": 2,
                "position": [720, 80],
                "parameters": {
                    "jsCode": r"""
const item = $input.first().json;
if (item.error) return [{ json: item }];
const source = item.source || 'airbnb';
let text = item.ics_text || item.data || item.body || '';
if (typeof text !== 'string') text = JSON.stringify(text);
// n8n http text may be in item itself when responseFormat text
if (!item.ics_text && !item.url) {}
if (item.url && typeof item === 'object') {
  // when coming from Fetch, raw body often in item if neverError wrapper — try common keys
  text = item.data || item.body || item.text || Object
}
// Prefer paired item from Fetch node
try {
  const fetchJson = $input.first().json;
  if (typeof fetchJson === 'string') text = fetchJson;
} catch (e) {}

// Better: read all input strings
const raw = $input.all().map(i => i.json);
let ics = '';
let src = source;
for (const r of raw) {
  if (r.error) return [{ json: r }];
  if (r.mode === 'text' && r.ics_text) { ics = r.ics_text; src = r.source; }
}
if (!ics) {
  // Fetch node puts body as string json sometimes
  const f = raw.find(r => typeof r === 'string') || raw[0];
  if (typeof f === 'string') ics = f;
  else if (f && typeof f.data === 'string') ics = f.data;
  else if (f && f.url) {
    // empty fetch
    ics = '';
    src = f.source || src;
  }
}
if (!ics) return [{ json: { error: 'empty_ics', source: src } }];

const events = [];
const parts = ics.split('BEGIN:VEVENT');
for (const part of parts.slice(1)) {
  const get = (k) => {
    const re = new RegExp('^' + k + '[^:]*:(.+)$', 'mi');
    const m = part.match(re);
    return m ? m[1].trim() : '';
  };
  const dtstart = get('DTSTART').replace(/T.*/, '').replace(/-/g,'').slice(0,8);
  const dtend = get('DTEND').replace(/T.*/, '').replace(/-/g,'').slice(0,8);
  if (dtstart.length !== 8) continue;
  const toIso = (s) => `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
  let cur = new Date(toIso(dtstart) + 'T00:00:00Z');
  const end = dtend.length === 8 ? new Date(toIso(dtend) + 'T00:00:00Z') : new Date(cur);
  while (cur < end) {
    events.push({ date: cur.toISOString().slice(0,10), source: src, reason: 'ical-sync' });
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
}
if (!events.length) return [{ json: { error: 'no_events', source: src } }];
return events.map(e => ({ json: e }));
"""
                },
            },
            {
                "id": "air",
                "name": "Airtable Upsert Date",
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.2,
                "position": [960, 40],
                "credentials": AIR_CRED,
                "parameters": {
                    "method": "POST",
                    "url": f"https://api.airtable.com/v0/{BASE}/{TBL_BLOCK}",
                    "authentication": "predefinedCredentialType",
                    "nodeCredentialType": "airtableTokenApi",
                    "sendBody": True,
                    "specifyBody": "json",
                    "jsonBody": "={{ JSON.stringify({ fields: { Date: $json.date, Source: $json.source, Reason: $json.reason } }) }}",
                    "options": {},
                },
                "continueOnFail": True,
            },
            {
                "id": "sb",
                "name": "Supabase Upsert Date",
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.2,
                "position": [960, 200],
                "parameters": {
                    "method": "POST",
                    "url": f"{SB_URL}/rest/v1/blocked_dates",
                    "sendHeaders": True,
                    "headerParameters": sb_headers(),
                    "sendBody": True,
                    "specifyBody": "json",
                    "jsonBody": "={{ JSON.stringify({ date: $json.date, source: $json.source, reason: $json.reason }) }}",
                    "options": {},
                },
                "continueOnFail": True,
            },
        ],
        "connections": {
            "Cron 1h": {"main": [[{"node": "Resolve URLs", "type": "main", "index": 0}]]},
            "Manual Sync Webhook": {
                "main": [[{"node": "Resolve URLs", "type": "main", "index": 0}]]
            },
            "Resolve URLs": {
                "main": [[{"node": "Fetch ICS", "type": "main", "index": 0}]]
            },
            "Fetch ICS": {"main": [[{"node": "Parse ICS", "type": "main", "index": 0}]]},
            "Parse ICS": {
                "main": [
                    [
                        {"node": "Airtable Upsert Date", "type": "main", "index": 0},
                        {"node": "Supabase Upsert Date", "type": "main", "index": 0},
                    ]
                ]
            },
        },
        "settings": {"executionOrder": "v1"},
    }


def build_pre_arrival():
    return {
        "name": "ASK-05 Pre-Arrival",
        "nodes": [
            {
                "id": "cron",
                "name": "Cron Hourly",
                "type": "n8n-nodes-base.scheduleTrigger",
                "typeVersion": 1.2,
                "position": [0, 0],
                "parameters": {
                    "rule": {"interval": [{"field": "hours", "hoursInterval": 1}]}
                },
            },
            {
                "id": "code",
                "name": "Find Upcoming",
                "type": "n8n-nodes-base.code",
                "typeVersion": 2,
                "position": [220, 0],
                "parameters": {
                    "jsCode": "const today=new Date(); const d24=new Date(today); d24.setDate(d24.getDate()+1); const d72=new Date(today); d72.setDate(d72.getDate()+3); const iso=d=>d.toISOString().slice(0,10); return [{json:{d24:iso(d24), d72:iso(d72)}}];"
                },
            },
            {
                "id": "q",
                "name": "Query Bookings",
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.2,
                "position": [440, 0],
                "parameters": {
                    "method": "GET",
                    "url": "="
                    + SB_URL
                    + "/rest/v1/bookings?select=*&status=eq.paid&or=(checkin.eq.{{$json.d24}},checkin.eq.{{$json.d72}})",
                    "sendHeaders": True,
                    "headerParameters": {
                        "parameters": [
                            {"name": "apikey", "value": SR},
                            {"name": "Authorization", "value": f"Bearer {SR}"},
                        ]
                    },
                    "options": {},
                },
                "continueOnFail": True,
            },
            {
                "id": "fmt",
                "name": "Format Alerts",
                "type": "n8n-nodes-base.code",
                "typeVersion": 2,
                "position": [660, 0],
                "parameters": {
                    "jsCode": r"""
const rows = Array.isArray($json) ? $json : [];
if (!rows.length) return [];
return rows.map(r => ({
  json: {
    chatId: '8503731042',
    text: `Pre-Arrival\n${r.guest_name} | ${r.phone}\nCheckin: ${r.checkin}\nWallet: https://ashkelon-site.vercel.app/w/${r.wallet_token || ''}\n(Nuki code: pending Phase 5)`
  }
}));
"""
                },
            },
            {
                "id": "tg",
                "name": "Telegram",
                "type": "n8n-nodes-base.telegram",
                "typeVersion": 1.2,
                "position": [880, 0],
                "credentials": TG_CRED,
                "parameters": {
                    "resource": "message",
                    "operation": "sendMessage",
                    "chatId": "={{ $json.chatId }}",
                    "text": "={{ $json.text }}",
                    "additionalFields": {"appendAttribution": False},
                },
            },
        ],
        "connections": {
            "Cron Hourly": {
                "main": [[{"node": "Find Upcoming", "type": "main", "index": 0}]]
            },
            "Find Upcoming": {
                "main": [[{"node": "Query Bookings", "type": "main", "index": 0}]]
            },
            "Query Bookings": {
                "main": [[{"node": "Format Alerts", "type": "main", "index": 0}]]
            },
            "Format Alerts": {
                "main": [[{"node": "Telegram", "type": "main", "index": 0}]]
            },
        },
        "settings": {"executionOrder": "v1"},
    }


def build_post_stay():
    return {
        "name": "ASK-07 Post-Stay ביקורת",
        "nodes": [
            {
                "id": "cron",
                "name": "Cron Daily 10:00",
                "type": "n8n-nodes-base.scheduleTrigger",
                "typeVersion": 1.2,
                "position": [0, 0],
                "parameters": {
                    "rule": {
                        "interval": [
                            {
                                "field": "cronExpression",
                                "expression": "0 10 * * *",
                            }
                        ]
                    }
                },
            },
            {
                "id": "code",
                "name": "Yesterday",
                "type": "n8n-nodes-base.code",
                "typeVersion": 2,
                "position": [220, 0],
                "parameters": {
                    "jsCode": "const d=new Date(); d.setDate(d.getDate()-1); return [{json:{yesterday:d.toISOString().slice(0,10)}}];"
                },
            },
            {
                "id": "q",
                "name": "Query Checkouts",
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.2,
                "position": [440, 0],
                "parameters": {
                    "method": "GET",
                    "url": "="
                    + SB_URL
                    + "/rest/v1/bookings?select=*&status=eq.paid&checkout=eq.{{$json.yesterday}}",
                    "sendHeaders": True,
                    "headerParameters": {
                        "parameters": [
                            {"name": "apikey", "value": SR},
                            {"name": "Authorization", "value": f"Bearer {SR}"},
                        ]
                    },
                    "options": {},
                },
                "continueOnFail": True,
            },
            {
                "id": "fmt",
                "name": "Format Review",
                "type": "n8n-nodes-base.code",
                "typeVersion": 2,
                "position": [660, 0],
                "parameters": {
                    "jsCode": r"""
const rows = Array.isArray($json) ? $json : [];
if (!rows.length) return [];
return rows.map(r => ({
  json: {
    chatId: '8503731042',
    text: `Post-Stay ביקורת\n${r.guest_name} | ${r.phone}\nCheckout: ${r.checkout}\nשלח לינק לביקורת Google (Phase 5 WA)`
  }
}));
"""
                },
            },
            {
                "id": "tg",
                "name": "Telegram",
                "type": "n8n-nodes-base.telegram",
                "typeVersion": 1.2,
                "position": [880, 0],
                "credentials": TG_CRED,
                "parameters": {
                    "resource": "message",
                    "operation": "sendMessage",
                    "chatId": "={{ $json.chatId }}",
                    "text": "={{ $json.text }}",
                    "additionalFields": {"appendAttribution": False},
                },
            },
        ],
        "connections": {
            "Cron Daily 10:00": {
                "main": [[{"node": "Yesterday", "type": "main", "index": 0}]]
            },
            "Yesterday": {
                "main": [[{"node": "Query Checkouts", "type": "main", "index": 0}]]
            },
            "Query Checkouts": {
                "main": [[{"node": "Format Review", "type": "main", "index": 0}]]
            },
            "Format Review": {
                "main": [[{"node": "Telegram", "type": "main", "index": 0}]]
            },
        },
        "settings": {"executionOrder": "v1"},
    }


def main():
    update_ask02_keyboard()
    upsert(build_ask10(), activate=True)
    upsert(build_ical(), activate=True)
    upsert(build_pre_arrival(), activate=True)
    upsert(build_post_stay(), activate=True)
    upsert(
        build_cron_workflow(
            "ASK-09 דוח יומי",
            "0 9 * * *",
            "דוח יומי Ashkelon — ראה /today ו-/status בבוט",
        ),
        activate=True,
    )
    upsert(
        build_cron_workflow(
            "ASK-13 תפעול ניקיון",
            "0 11 * * *",
            "תפעול ניקיון — בדוק Cleaning Kanban ב-Airtable (To Clean)",
        ),
        activate=True,
    )
    upsert(
        build_cron_workflow(
            "ASK-14 גיבוי והתראות",
            "0 2 * * *",
            "גיבוי יומי 02:00 — ודא Drive backup (Phase 3 scaffold)",
        ),
        activate=True,
    )
    # Sheets MASTER - webhook after booking
    sheets = {
        "name": "ASK-11 Sheets MASTER",
        "nodes": [
            {
                "id": "wh",
                "name": "Webhook",
                "type": "n8n-nodes-base.webhook",
                "typeVersion": 2,
                "position": [0, 0],
                "webhookId": "ashkelon-sheets-sync",
                "parameters": {
                    "httpMethod": "POST",
                    "path": "ashkelon-sheets-sync",
                    "responseMode": "lastNode",
                    "options": {},
                },
            },
            {
                "id": "tg",
                "name": "Telegram Ack",
                "type": "n8n-nodes-base.telegram",
                "typeVersion": 1.2,
                "position": [260, 0],
                "credentials": TG_CRED,
                "parameters": {
                    "resource": "message",
                    "operation": "sendMessage",
                    "chatId": TG_CHAT,
                    "text": "={{ 'Sheets MASTER stub: booking ' + (($json.body||$json).booking_id || '') }}",
                    "additionalFields": {"appendAttribution": False},
                },
                "continueOnFail": True,
            },
        ],
        "connections": {
            "Webhook": {"main": [[{"node": "Telegram Ack", "type": "main", "index": 0}]]}
        },
        "settings": {"executionOrder": "v1"},
    }
    upsert(sheets, activate=True)


if __name__ == "__main__":
    main()
