#!/bin/bash
# Render every part. HyperFrames is PINNED at 0.8.3, never @latest.
#
# Every part of this piece is class=segment - it replaces the frame rather than
# floating over footage - so everything renders as an OPAQUE mp4 and no part
# needs alpha. The pix_fmt/alpha gate that guards overlay renders is therefore
# replaced by a resolution gate, which is the thing that can silently go wrong
# here: a composition-resolution render instead of the 2x stage.
#
# Reuse is gated on the render being NEWER THAN the composition that produced
# it. A cache keyed on existence alone let 2.7GB of parts from an already-shipped
# cut sheet satisfy the render loop on a previous job.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p renders
ONLY="${1:-}"
# Geometry gate BEFORE anything expensive: a card that cannot hold its own text
# is cheaper to catch here than after eight renders.
python3 check_boxes.py --cutsheet cutsheet.json --parts parts --charw charw.json >/dev/null || {
  echo "check_boxes.py FAILED; run it directly for the list"; exit 1; }
W=$(python3 -c "import json;print(json.load(open('cutsheet.json'))['render'][0])")
H=$(python3 -c "import json;print(json.load(open('cutsheet.json'))['render'][1])")
FPS=$(python3 -c "import json;print(json.load(open('cutsheet.json'))['fps'])")
fail=0
for d in parts/g*/; do
  id=$(basename "$d")
  [ -n "$ONLY" ] && [[ ",$ONLY," != *",$id,"* ]] && continue
  cls=$(python3 -c "
import json
p=[x for x in json.load(open('cutsheet.json'))['parts'] if x['id']=='$id']
print(p[0]['class'] if p else 'overlay')")
  [ "$cls" != "segment" ] && { echo "  $id is class=$cls, this job has none"; fail=1; continue; }
  out="renders/$id.mp4"
  if [ -f "$out" ] && [ "$out" -nt "$d/index.html" ]; then
    echo "  $id  up to date, skipping"; continue
  fi
  echo "--- $id"
  npx --yes hyperframes@0.8.3 render "$d" --format mp4 -f "$FPS" -q high \
      --video-frame-format png --strict -o "$out" --quiet >/dev/null 2>&1
  read -r pf fr rw rh < <(ffprobe -v error -select_streams v:0 \
      -show_entries stream=pix_fmt,nb_frames,width,height -of csv=p=0 "$out" \
      | awk -F, '{print $3, $4, $1, $2}')
  want=$(python3 -c "
import re
h=open('$d/index.html').read()
print(round(float(re.search(r'data-duration=\"([\d.]+)\"',h).group(1))*$FPS))")
  [ "$rw" != "$W" ] || [ "$rh" != "$H" ] && { echo "    FAIL $id ${rw}x${rh}, want ${W}x${H}"; fail=1; }
  [ "$fr" != "$want" ] && { echo "    FAIL $id frames=$fr want=$want"; fail=1; }
  echo "    $id  ${rw}x${rh}  $pf  ${fr}f"
done
echo "---"
[ $fail -eq 0 ] && echo "ALL RENDERS OK" || { echo "RENDER FAILURES ABOVE"; exit 1; }
