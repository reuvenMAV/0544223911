#!/usr/bin/env python3
"""Write SQL that updates the published Yael workflow in place."""
from __future__ import annotations

import json
import uuid
from pathlib import Path

wf_path = Path("/tmp/yael-mavashev-booking-lifecycle.workflow.json")
if not wf_path.exists():
    wf_path = Path("/tmp/yael-n8n-incoming/n8n/yael-mavashev-booking-lifecycle.workflow.json")
wf = json.loads(wf_path.read_text(encoding="utf-8"))
if wf.get("id") != "YaelBookLifeCycle01":
    raise SystemExit("unexpected workflow id")

version_id = str(uuid.uuid4())


def dollar(tag: str, obj) -> str:
    return f"${tag}${json.dumps(obj, ensure_ascii=False)}${tag}$"


sql = f"""
BEGIN;
INSERT INTO workflow_history (
  "versionId", "workflowId", authors, nodes, connections, name, autosaved, "nodeGroups"
) VALUES (
  '{version_id}',
  'YaelBookLifeCycle01',
  'reuven MAV',
  {dollar("nodes", wf["nodes"])}::json,
  {dollar("conn", wf["connections"])}::json,
  '{wf["name"].replace("'", "''")}',
  false,
  '[]'::json
);

UPDATE workflow_entity
SET
  nodes = {dollar("enodes", wf["nodes"])}::json,
  connections = {dollar("econn", wf["connections"])}::json,
  "versionId" = '{version_id}',
  "activeVersionId" = '{version_id}',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE id = 'YaelBookLifeCycle01' AND active = true;

COMMIT;
"""
out = Path("/tmp/yael-wf-active-update.sql")
out.write_text(sql, encoding="utf-8")
print(f"wrote {out} bytes={out.stat().st_size} version={version_id}")
