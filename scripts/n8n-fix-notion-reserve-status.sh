#!/usr/bin/env bash
# Fix Status on "NEW — Notion Reserve Topic" in workflow qzdNnmEvRGSPVJSX
# Usage:
#   export N8N_API_KEY='...'
#   export NOTION_STATUS_VALUE='Reserved'   # must match Notion option name exactly
#   bash scripts/n8n-fix-notion-reserve-status.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec python3 "$ROOT/scripts/n8n-fix-notion-reserve-status.py"
