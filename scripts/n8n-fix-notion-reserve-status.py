#!/usr/bin/env python3
"""Fix n8n workflow qzdNnmEvRGSPVJSX — set Status on NEW — Notion Reserve Topic."""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

WORKFLOW_ID = os.environ.get("N8N_WORKFLOW_ID", "qzdNnmEvRGSPVJSX")
NODE_NAME = os.environ.get("N8N_NOTION_NODE_NAME", "NEW — Notion Reserve Topic")
STATUS_VALUE = os.environ.get("NOTION_STATUS_VALUE", "Reserved")
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


def patch_status_property(props: list[dict]) -> list[dict]:
    """Ensure Status property has statusValue set (Notion v2 node)."""
    updated = False
    for prop in props:
        key = str(prop.get("key", ""))
        if key == "Status" or key.endswith("|status") or key.lower().endswith("status"):
            prop["statusValue"] = STATUS_VALUE
            updated = True
    if not updated:
        props.append({"key": "Status|status", "statusValue": STATUS_VALUE})
    return props


def main() -> None:
    wf = api("GET", f"/workflows/{WORKFLOW_ID}")
    nodes = wf.get("nodes", [])
    target = next((n for n in nodes if n.get("name") == NODE_NAME), None)
    if not target:
        names = [n.get("name") for n in nodes]
        raise SystemExit(f"Node not found: {NODE_NAME!r}. Available: {names}")

    params = target.setdefault("parameters", {})
    props = params.get("propertiesUi", {}).get("propertyValues", [])
    if not isinstance(props, list):
        props = []
    params.setdefault("propertiesUi", {})["propertyValues"] = patch_status_property(props)

    # n8n public API accepts a subset of workflow fields on PUT
    payload = {
        "name": wf["name"],
        "nodes": wf["nodes"],
        "connections": wf["connections"],
        "settings": wf.get("settings", {}),
    }
    if wf.get("staticData") is not None:
        payload["staticData"] = wf["staticData"]

    api("PUT", f"/workflows/{WORKFLOW_ID}", payload)
    print(f"OK: {NODE_NAME} -> Status = {STATUS_VALUE!r}")
    print(f"Workflow: {BASE}/workflow/{WORKFLOW_ID}")


if __name__ == "__main__":
    main()
