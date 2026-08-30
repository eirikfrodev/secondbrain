#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
required=(
  "AGENTS.md"
  "HANDOFF.md"
  "codex/INITIAL_TASK.md"
  "design/reference/README.md"
  "design/boards/1a.png"
  "design/boards/1h.png"
  "specs/schemas/item-document-v1.schema.json"
  "specs/fixtures/meeting-email.json"
)

for file in "${required[@]}"; do
  test -f "$root/$file" || { echo "Missing: $file" >&2; exit 1; }
done

python3 - <<'PY2' "$root"
from pathlib import Path
import json, sys
root = Path(sys.argv[1])
for path in root.glob('specs/**/*.json'):
    json.loads(path.read_text())
print('JSON specification files parse successfully.')
PY2

echo "Utsikt starter package structure is valid."
