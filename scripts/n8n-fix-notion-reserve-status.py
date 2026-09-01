#!/usr/bin/env python3
"""Fix Notion Status fields on workflow qzdNnmEvRGSPVJSX (status vs select type)."""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

WORKFLOW_ID = os.environ.get("N8N_WORKFLOW_ID", "qzdNnmEvRGSPVJSX")
BASE = os.environ.get("N8N_BASE_URL", "https://n8n.mavash.net").rstrip("/")
API_KEY = os.environ.get("N8N_API_KEY", "")


def api(method: str, path: str, body: dict | None = None) -> dict:
    if not API_KEY:
        raise SystemExit("Set N8N_API_KEY (Settings → API in n8n)")
    url = f"{BASE}/api/v1{path}"
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "X-N8N-API-KEY": API_KEY,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"{method} {path} -> HTTP {exc.code}: {detail[:500]}") from exc


def put_workflow(wf: dict) -> dict:
    settings = wf.get("settings") or {}
    allowed = {k: settings[k] for k in ("executionOrder",) if k in settings}
    payload = {
        "name": wf["name"],
        "nodes": wf["nodes"],
        "connections": wf["connections"],
        "settings": allowed or {"executionOrder": "v1"},
    }
    return api("PUT", f"/workflows/{WORKFLOW_ID}", payload)


def patch_nodes(wf: dict) -> None:
    for node in wf.get("nodes", []):
        name = node.get("name", "")
        props = node.get("parameters", {}).get("propertiesUi", {}).get("propertyValues")
        if not isinstance(props, list):
            continue
        if name == "NEW — Notion Reserve Topic":
            node["parameters"]["propertiesUi"]["propertyValues"] = [
                {"key": "Status", "statusValue": "Reserved"},
                {"key": "Reserved At", "dateValue": "={{ $json.reservedAt }}"},
            ]
        elif name == "NEW — Notion Mark Used":
            node["parameters"]["propertiesUi"]["propertyValues"] = [
                {"key": "Status", "statusValue": "Used"},
                {"key": "Last Used", "dateValue": "={{ $now.toISO() }}"},
                {
                    "key": "Times Used",
                    "numberValue": "={{($json.timesUsed || 0) + 1}}",
                },
            ]


def main() -> None:
    wf = api("GET", f"/workflows/{WORKFLOW_ID}")
    patch_nodes(wf)
    put_workflow(wf)
    print("OK: patched NEW — Notion Reserve Topic + NEW — Notion Mark Used")
    print(f"Workflow: {BASE}/workflow/{WORKFLOW_ID}")


if __name__ == "__main__":
    main()
