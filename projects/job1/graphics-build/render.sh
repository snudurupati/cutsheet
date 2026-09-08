#!/bin/bash
# Render every emitted part at the base video's exact frame rate. Pinned to 0.8.3.
#
# Which parts need ALPHA is read FROM THE CUT SHEET, never from a list in this
# file. A hardcoded list is a landmine that arms itself the first time the plan
# changes: it omitted g018, so the end card rendered opaque and would have
# composited a solid page over the closing shot.
#
# --format mov|webm|png-sequence REJECTS --resolution, so 4K comes from the static
# 2x stage scale in the CSS, never from an output preset. --format webm gives
# yuv420p with no alpha at all, so overlays are always mov (ProRes 4444).
set -uo pipefail
cd "$(dirname "$0")"
mkdir -p renders
FPS=$(python3 -c "import json;print(int(eval(json.load(open('cutsheet.json'))['fps'])))")
ALPHA=$(python3 -c "
import json
p=json.load(open('cutsheet.json'))['parts']
print(' '.join(x['id'] for x in p if x['class']=='overlay' or x.get('alpha')))")
echo "fps=$FPS  alpha parts: $ALPHA"
FAIL=0
for d in parts/*/; do
  id=$(basename "$d")
  fmt=mp4; ext=mp4
  case " $ALPHA " in *" $id "*) fmt=mov; ext=mov;; esac
  # Reuse a render ONLY if it is newer than the composition it came from. A bare
  # existence check let 2.7GB of parts from a previous build satisfy this loop.
  if [ -f "renders/$id.$ext" ] && [ "renders/$id.$ext" -nt "$d/index.html" ]; then
    echo "skip $id (up to date)"; continue
  fi
  rm -f "renders/$id.$ext"
  if ! npx hyperframes@0.8.3 lint "$d" >/dev/null 2>&1; then
    echo "LINT FAIL $id"; FAIL=1; continue
  fi
  npx hyperframes@0.8.3 render "$d" --format "$fmt" --fps "$FPS" --quality high \
      --video-frame-format png -o "$(pwd)/renders/$id.$ext" >/dev/null 2>&1
  if [ ! -f "renders/$id.$ext" ]; then echo "RENDER FAIL $id"; FAIL=1; continue; fi
  if [ "$fmt" = "mov" ]; then
    pf=$(ffprobe -v error -select_streams v:0 -show_entries stream=pix_fmt -of csv=p=0 "renders/$id.$ext")
    case "$pf" in
      yuva*) ;;
      *) echo "NO ALPHA $id ($pf)"; FAIL=1 ;;
    esac
  fi
  printf "  %-6s %-4s %s\n" "$id" "$ext" \
    "$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height,nb_frames,pix_fmt -of csv=p=0 "renders/$id.$ext")"
done
echo "render done, fail=$FAIL"
exit $FAIL
