#!/bin/bash
# Render every part to a transparent ProRes 4444 track at delivery resolution.
# Pinned to hyperframes@0.8.3 - never @latest.
#   --format mov          transparent ProRes 4444
#   --fps 30              matches the base exactly; mixed rates drift on composite
#   --video-frame-format png   source frames as PNG, halves the browser luma dip
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="$PWD/outputs/.cache/parts"
mkdir -p "$OUT"
ONLY="${ONLY:-}"
for d in graphics-build/parts/g*/; do
  id=$(basename "$d")
  [ -n "$ONLY" ] && [[ ",$ONLY," != *",$id,"* ]] && continue
  [ -s "$OUT/$id.mov" ] && { echo "  $id  cached"; continue; }
  printf "  %s  rendering... " "$id"
  npx hyperframes@0.8.3 render "$d" --format mov --fps 30 --quality high \
      --video-frame-format png --output "$OUT/$id.mov" --quiet >/dev/null 2>&1
  ffprobe -v error -show_entries stream=width,height,nb_frames,pix_fmt -of csv=p=0 "$OUT/$id.mov"
done
echo "all parts rendered"
