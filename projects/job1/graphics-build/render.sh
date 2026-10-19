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
#
# Only what changed is rendered, and in parallel (the 04-lightweight-ontology
# rebuild work, 2026-09-23): a part is stale when ANY file in its folder is newer
# than its render, and stale parts render RENDER_JOBS at a time (default 4). Each
# part's log is kept whole in renders/.log/<id>.log and printed in order after.
set -uo pipefail
cd "$(dirname "$0")"
mkdir -p renders renders/.log
FPS=$(python3 -c "import json;print(int(eval(json.load(open('cutsheet.json'))['fps'])))")
ALPHA=$(python3 -c "
import json
p=json.load(open('cutsheet.json'))['parts']
print(' '.join(x['id'] for x in p if x['class']=='overlay' or x.get('alpha')))")
echo "fps=$FPS  alpha parts: $ALPHA"
export FPS ALPHA

render_one() {
  id="$1"; d="parts/$id/"
  fmt=mp4; ext=mp4
  case " $ALPHA " in *" $id "*) fmt=mov; ext=mov;; esac
  st="renders/.log/$id.status"
  {
  rm -f "renders/$id.$ext"
  if ! npx hyperframes@0.8.3 lint "$d" >/dev/null 2>&1; then
    echo "LINT FAIL $id"; echo fail >"$st"; return; fi
  npx hyperframes@0.8.3 render "$d" --format "$fmt" --fps "$FPS" --quality high \
      --video-frame-format png -o "$(pwd)/renders/$id.$ext" >/dev/null 2>&1
  if [ ! -f "renders/$id.$ext" ]; then echo "RENDER FAIL $id"; echo fail >"$st"; return; fi
  if [ "$fmt" = "mov" ]; then
    pf=$(ffprobe -v error -select_streams v:0 -show_entries stream=pix_fmt -of csv=p=0 "renders/$id.$ext")
    case "$pf" in
      yuva*) ;;
      *) echo "NO ALPHA $id ($pf)"; echo fail >"$st"; return ;;
    esac
  fi
  printf "  %-6s %-4s %s\n" "$id" "$ext" \
    "$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height,nb_frames,pix_fmt -of csv=p=0 "renders/$id.$ext")"
  echo ok >"$st"
  } >"renders/.log/$id.log" 2>&1
}
export -f render_one

FAIL=0
stale=()
for d in parts/*/; do
  id=$(basename "$d")
  ext=mp4; case " $ALPHA " in *" $id "*) ext=mov;; esac
  # stale when ANY file in the part is newer than its render, not only index.html
  if [ -f "renders/$id.$ext" ] && [ -z "$(find "$d" -type f -newer "renders/$id.$ext" -print -quit)" ]; then
    echo "skip $id (up to date)"; continue
  fi
  rm -f "renders/.log/$id.status"; stale+=("$id")
done
if [ ${#stale[@]} -gt 0 ]; then
  echo "rendering ${#stale[@]} part(s), ${RENDER_JOBS:-4} at a time: ${stale[*]}"
  printf '%s\n' "${stale[@]}" | xargs -P "${RENDER_JOBS:-4}" -I{} bash -c 'render_one "$@"' _ {}
  for id in "${stale[@]}"; do
    cat "renders/.log/$id.log"
    [ "$(cat renders/.log/$id.status 2>/dev/null)" = ok ] || FAIL=1
  done
fi
echo "render done, fail=$FAIL"
exit $FAIL
