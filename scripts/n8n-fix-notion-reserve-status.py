#!/usr/bin/env python3
"""Fix Notion topic workflow qzdNnmEvRGSPVJSX — property keys + Content Topics DB."""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

WORKFLOW_ID = os.environ.get("N8N_WORKFLOW_ID", "qzdNnmEvRGSPVJSX")
BASE = os.environ.get("N8N_BASE_URL", "https://n8n.mavash.net").rstrip("/")
API_KEY = os.environ.get("N8N_API_KEY", "")
NOTION_DB = os.environ.get("NOTION_TOPICS_DB_ID", "3ce419e7-2f11-8156-8943-e4e0223bb488")
NOTION_CRED = os.environ.get("NOTION_N8N_CRED_ID", "KHzmMLLA6MK3IB8X")
NOTION_CRED_NAME = os.environ.get("NOTION_N8N_CRED_NAME", "Notion agent API")


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
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as exc:
        raise SystemExit(f"{method} {path} -> HTTP {exc.code}: {exc.read().decode()[:500]}") from exc


def patch_nodes(wf: dict) -> None:
    db_ref = {
        "__rl": True,
        "value": NOTION_DB,
        "mode": "list",
        "cachedResultName": "Content Topics",
        "cachedResultUrl": f"https://www.notion.so/{NOTION_DB.replace('-', '')}",
    }
    cred = {"notionApi": {"id": NOTION_CRED, "name": NOTION_CRED_NAME}}

    for node in wf.get("nodes", []):
        name = node.get("name", "")
        if name == "NEW — Notion Get Topics":
            node["parameters"]["databaseId"] = db_ref
            node["credentials"] = cred
        elif name == "NEW — Notion Reserve Topic":
            node["credentials"] = cred
            node["parameters"]["propertiesUi"]["propertyValues"] = [
                {"key": "Status|status", "statusValue": "Reserved"},
                {
                    "key": "Reserved At|date",
                    "date": "={{ $json.reservedAt }}",
                    "includeTime": True,
                    "range": False,
                },
            ]
        elif name == "NEW — Notion Mark Used":
            node["credentials"] = cred
            node["parameters"]["propertiesUi"]["propertyValues"] = [
                {"key": "Status|status", "statusValue": "Used"},
                {
                    "key": "Last Used|date",
                    "date": "={{ $now.toISO() }}",
                    "includeTime": True,
                    "range": False,
                },
                {
                    "key": "Times Used|number",
                    "numberValue": "={{($json.timesUsed || 0) + 1}}",
                },
            ]


def main() -> None:
    wf = api("GET", f"/workflows/{WORKFLOW_ID}")
    patch_nodes(wf)
    api(
        "PUT",
        f"/workflows/{WORKFLOW_ID}",
        {
            "name": wf["name"],
            "nodes": wf["nodes"],
            "connections": wf["connections"],
            "settings": {"executionOrder": "v1"},
        },
    )
    print("OK: workflow patched (Content Topics DB + Status|status keys)")


if __name__ == "__main__":
    main()
