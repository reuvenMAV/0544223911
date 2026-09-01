#!/usr/bin/env python3
"""Fix Notion Status fields on workflow qzdNnmEvRGSPVJSX.

n8n requires property keys in the form `Name|type` (e.g. Status|status).
Without the type suffix, mapProperties sends an empty object and Notion rejects the update.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

WORKFLOW_ID = os.environ.get("N8N_WORKFLOW_ID", "qzdNnmEvRGSPVJSX")
BASE = os.environ.get("N8N_BASE_URL", "https://n8n.mavash.net").rstrip("/")
API_KEY = os.environ.get("N8N_API_KEY", "")

SIMP_MAP_SNIPPET = """  const simpMap = {
    Name: 'property_name', Status: 'property_status', Category: 'property_category',
    Channel: 'property_channel', 'Last Used': 'property_last_used',
    'Times Used': 'property_times_used', Angle: 'property_angle', Notes: 'property_notes',
  };
"""


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


def patch_select_diverse_topic(code: str) -> str:
    if "property_status" in code:
        return code
    code = code.replace(
        "function val(item, wanted) {\n  const props = item.json.properties || item.json;",
        "function val(item, wanted) {\n  const props = item.json.properties || item.json;\n" + SIMP_MAP_SNIPPET,
    )
    return code.replace(
        "  if (!key) return '';\n  return extract(props[key]);",
        "  if (!key && simpMap[wanted] && item.json[simpMap[wanted]] !== undefined) {\n"
        "    return item.json[simpMap[wanted]];\n"
        "  }\n"
        "  if (!key) return '';\n"
        "  return extract(props[key]);",
    )


def patch_nodes(wf: dict) -> None:
    for node in wf.get("nodes", []):
        name = node.get("name", "")
        if name == "NEW — Notion Reserve Topic":
            node["parameters"]["propertiesUi"]["propertyValues"] = [
                {"key": "Status|status", "statusValue": "Reserved"},
            ]
        elif name == "NEW — Notion Mark Used":
            node["parameters"]["propertiesUi"]["propertyValues"] = [
                {"key": "Status|status", "statusValue": "Used"},
            ]
        elif name == "NEW — Select Diverse Topic":
            node["parameters"]["jsCode"] = patch_select_diverse_topic(
                node["parameters"].get("jsCode", "")
            )


def put_workflow(wf: dict) -> dict:
    return api(
        "PUT",
        f"/workflows/{WORKFLOW_ID}",
        {
            "name": wf["name"],
            "nodes": wf["nodes"],
            "connections": wf["connections"],
            "settings": {"executionOrder": "v1"},
        },
    )


def main() -> None:
    wf = api("GET", f"/workflows/{WORKFLOW_ID}")
    patch_nodes(wf)
    put_workflow(wf)
    print("OK: patched Notion property keys (Status|status) and simplified field mapping")


if __name__ == "__main__":
    main()
