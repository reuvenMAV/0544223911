#!/usr/bin/env python3
"""Write a psql script that updates the unpublished Yael workflow in place."""
from __future__ import annotations

import json
import uuid
from pathlib import Path

wf_path = Path("/tmp/yael-n8n-incoming/n8n/yael-mavashev-booking-lifecycle.workflow.json")
wf = json.loads(wf_path.read_text(encoding="utf-8"))
if wf.get("active") is not False:
    raise SystemExit("refusing to update from an active workflow JSON")

wf_id = "YaelBookLifeCycle01"


def dollar(tag: str, obj) -> str:
    return f"${tag}${json.dumps(obj, ensure_ascii=False)}${tag}$"


sql = f"""
BEGIN;
UPDATE workflow_entity
SET
  name = '{wf["name"].replace("'", "''")}',
  nodes = {dollar("nodes", wf["nodes"])}::json,
  connections = {dollar("conn", wf["connections"])}::json,
  settings = {dollar("set", wf.get("settings") or {})}::json,
  "pinData" = {dollar("pin", wf.get("pinData") or {})}::json,
  "versionId" = '{uuid.uuid4()}',
  meta = {dollar("meta", wf.get("meta") or {})}::json,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE id = '{wf_id}' AND active = false;
COMMIT;
"""
out = Path("/tmp/yael-wf-update.sql")
out.write_text(sql, encoding="utf-8")
print(f"wrote {out} bytes={out.stat().st_size} id={wf_id} active=false")
