#!/usr/bin/env python3
"""Write a psql script that inserts the unpublished Yael workflow."""
from __future__ import annotations

import json
import uuid
from pathlib import Path

wf_path = Path("/tmp/yael-n8n-incoming/n8n/yael-mavashev-booking-lifecycle.workflow.json")
wf = json.loads(wf_path.read_text(encoding="utf-8"))
if wf.get("active") is not False:
    raise SystemExit("refusing to import an active workflow")

payload = {
    "id": "YaelBookLifeCycle01",
    "name": wf["name"],
    "nodes": wf["nodes"],
    "connections": wf["connections"],
    "settings": wf.get("settings") or {},
    "pinData": wf.get("pinData") or {},
    "versionId": str(uuid.uuid4()),
    "meta": wf.get("meta") or {},
}


def dollar(tag: str, obj) -> str:
    text = json.dumps(obj, ensure_ascii=False)
    return f"${tag}${text}${tag}$"


sql = f"""
BEGIN;
INSERT INTO workflow_entity (
  id, name, active, nodes, connections, settings, "pinData", "versionId",
  "triggerCount", meta, "isArchived", "versionCounter", "nodeGroups"
) VALUES (
  '{payload["id"]}',
  '{payload["name"].replace("'", "''")}',
  false,
  {dollar("nodes", payload["nodes"])}::json,
  {dollar("conn", payload["connections"])}::json,
  {dollar("set", payload["settings"])}::json,
  {dollar("pin", payload["pinData"])}::json,
  '{payload["versionId"]}',
  0,
  {dollar("meta", payload["meta"])}::json,
  false,
  1,
  '[]'::json
);
INSERT INTO shared_workflow ("workflowId", "projectId", role)
VALUES ('{payload["id"]}', 'F6DVGGIHLjlfI0CU', 'workflow:owner');
COMMIT;
"""
out = Path("/tmp/yael-wf-insert.sql")
out.write_text(sql, encoding="utf-8")
print(f"wrote {out} bytes={out.stat().st_size} id={payload['id']} active=false")
