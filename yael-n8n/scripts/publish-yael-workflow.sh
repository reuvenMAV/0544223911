#!/usr/bin/env bash
# Publish the Yael booking lifecycle workflow on n8n-newsite.
# Run ON the Oracle host. Restarts only n8n-newsite.
set -euo pipefail

SQL_FILE=${1:-}
if [[ -z "${SQL_FILE}" || ! -f "${SQL_FILE}" ]]; then
  echo "usage: publish-yael-workflow.sh /path/to/publish-yael-workflow.sql" >&2
  exit 2
fi

echo "applying guarded publish SQL to n8n_newsite"
docker exec -i evolution_postgres psql -U postgres -d n8n_newsite -v ON_ERROR_STOP=1 < "${SQL_FILE}"

echo "restarting n8n-newsite only"
docker restart n8n-newsite >/dev/null

echo "waiting for n8n-newsite health"
for i in $(seq 1 90); do
  if docker exec n8n-newsite node -e 'fetch("http://127.0.0.1:5678/healthz").then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))' >/dev/null 2>&1; then
    echo "n8n-newsite healthz ok after ${i}s"
    break
  fi
  if [[ "${i}" -eq 90 ]]; then
    echo "n8n-newsite healthz timeout" >&2
    exit 1
  fi
  sleep 1
done

docker exec evolution_postgres psql -U postgres -d n8n_newsite -c \
  "SELECT id, name, active, \"activeVersionId\" IS NOT NULL AS has_active_version, \"triggerCount\" FROM workflow_entity WHERE id='YaelBookLifeCycle01';"
docker exec evolution_postgres psql -U postgres -d n8n_newsite -c \
  "SELECT \"webhookPath\", method, node, \"workflowId\" FROM webhook_entity WHERE \"workflowId\"='YaelBookLifeCycle01';"
