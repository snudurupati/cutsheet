#!/bin/bash
# Render every part. HyperFrames is PINNED at 0.8.3, never @latest.
#
# Overlays render to MOV (ProRes 4444, real alpha). --format webm reported
# yuv420p with no alpha channel at all, so the pix_fmt is verified after every
# render and a part that comes back without yuva is a failure, not a warning.
#
# Reuse is gated on the render being NEWER THAN the composition that produced it.
# A cache keyed on existence alone let 2.7GB of parts from an already-shipped cut
# sheet satisfy the render loop on job1, and six of them would have composited the
# OLD graphics into the new video with every count-based gate downstream passing.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p renders
ONLY="${1:-}"
fail=0
for d in parts/g*/; do
  id=$(basename "$d")
  [ -n "$ONLY" ] && [ "$ONLY" != "$id" ] && continue
  # segments replace the frame, so they render OPAQUE mp4. Overlays render MOV
  # (ProRes 4444) for real alpha: --format webm came back yuv420p with none.
  cls=$(python3 -c "
import json,sys
p=[x for x in json.load(open('cutsheet.json'))['parts'] if x['id']=='$id']
print(p[0]['class'] if p else 'overlay')")
  if [ "$cls" = "segment" ]; then ext=mp4; fmt=mp4; else ext=mov; fmt=mov; fi
  out="renders/$id.$ext"
  if [ -f "$out" ] && [ "$out" -nt "$d/index.html" ]; then
    echo "  $id  up to date, skipping"
    continue
  fi
  echo "--- $id"
  npx --yes hyperframes@0.8.3 render "$d" --format "$fmt" -f 30 -q high \
      --video-frame-format png --strict -o "$out" --quiet >/dev/null 2>&1
  pf=$(ffprobe -v error -select_streams v:0 -show_entries stream=pix_fmt -of csv=p=0 "$out")
  fr=$(ffprobe -v error -select_streams v:0 -show_entries stream=nb_frames -of csv=p=0 "$out")
  want=$(python3 -c "
import re,sys
h=open('$d/index.html').read()
d=float(re.search(r'data-duration=\"([\d.]+)\"',h).group(1))
print(round(d*30))")
  if [ "$cls" != "segment" ] && [[ "$pf" != yuva* ]]; then
    echo "    FAIL $id pix_fmt=$pf, no alpha"; fail=1; fi
  if [ "$fr" != "$want" ]; then echo "    FAIL $id frames=$fr want=$want"; fail=1; fi
  echo "    $id  $pf  ${fr}f"
done
echo "---"
[ $fail -eq 0 ] && echo "ALL RENDERS OK" || { echo "RENDER FAILURES ABOVE"; exit 1; }
