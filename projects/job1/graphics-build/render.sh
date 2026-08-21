#!/bin/bash
# Render every overlay part to a transparent MOV at the base video's exact frame
# rate (60), pinned to hyperframes 0.8.3. Lint + check are the gate: a part that
# fails either is not rendered.
set -uo pipefail
cd "$(dirname "$0")"
mkdir -p renders
FAIL=0
for d in parts/*/; do
  id=$(basename "$d")
  if [ -f "renders/$id.mov" ]; then echo "skip $id (already rendered)"; continue; fi
  echo "--- $id"
  if ! npx hyperframes@0.8.3 lint "$d" --json > "renders/$id.lint.json" 2>&1; then
    echo "LINT FAILED $id"; FAIL=1; continue
  fi
  npx hyperframes@0.8.3 render "$d" \
      --format mov --fps 60 --quality high \
      --video-frame-format png \
      -o "$(pwd)/renders/$id.mov" --quiet 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | tail -3
  if [ ! -f "renders/$id.mov" ]; then echo "RENDER FAILED $id"; FAIL=1; fi
done
echo "done, fail=$FAIL"
ls -la renders/*.mov 2>/dev/null | wc -l
