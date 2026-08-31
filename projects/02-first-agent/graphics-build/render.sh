#!/bin/bash
# Render every part. HyperFrames is PINNED at 0.8.3, never @latest.
# Overlays -> MOV (ProRes 4444, real alpha). WebM reported yuv420p with no alpha channel.
# Compositions declare 3840x2160 with a scale(2) stage, because alpha renders reject --resolution.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p renders
ONLY="${1:-}"
for f in parts/g*.html; do
  id=$(basename "$f" .html)
  [ -n "$ONLY" ] && [ "$ONLY" != "$id" ] && continue
  opaque=$(grep -c 'class="tex"' "$f" || true)
  if [ "$opaque" -gt 0 ]; then fmt=mp4; ext=mp4; else fmt=mov; ext=mov; fi
  echo "--- $id ($fmt)"
  npx --yes hyperframes@0.8.3 render . -c "$f" --format "$fmt" -f 30 -q high \
      -o "renders/$id.$ext" --quiet 2>&1 | tail -2
done
