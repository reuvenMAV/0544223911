#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="${HOME}/.cursor/skills-cursor/personalized-english-coach"

mkdir -p "${TARGET_DIR}"
cp -R "${SCRIPT_DIR}/." "${TARGET_DIR}/"
rm -f "${TARGET_DIR}/install-global.sh"

if [[ ! -f "${TARGET_DIR}/learner-progress.md" ]]; then
  cp "${SCRIPT_DIR}/learner-progress.md" "${TARGET_DIR}/learner-progress.md"
fi

cat <<'EOF'

English coach installed globally.

Use it from any Cursor project:
  1. Open any folder or project in Cursor
  2. Start a chat and write: היי / I want to learn English
  3. Progress is saved to:
     ~/.cursor/skills-cursor/personalized-english-coach/learner-progress.md

Optional: add this to Cursor Settings > Rules > User Rules:

When I ask to learn, practice, or continue English, use the personalized-english-coach skill. Read and update progress at ~/.cursor/skills-cursor/personalized-english-coach/learner-progress.md from any workspace.

EOF
