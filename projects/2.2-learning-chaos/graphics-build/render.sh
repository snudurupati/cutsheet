#!/bin/bash
# Render every part. HyperFrames is PINNED at 0.8.3, never @latest.
#
# Overlays render to MOV (ProRes 4444, real alpha). --format webm reported
# yuv420p with no alpha channel at all, so the pix_fmt is verified after every
# render and a part that comes back without yuva is a failure, not a warning.
#
# The cut sheet is an ARGUMENT (--cutsheet, default ./cutsheet.json, hard rule
# 12) and the part ids come from ITS parts[] list, never from a glob of parts/:
# a stale directory of old parts must not drive the render loop.
#
# Reuse is gated on the render being NEWER THAN EVERY FILE in the part dir
# (composition, assets, fonts). A cache keyed on existence alone let 2.7GB of
# parts from an already-shipped cut sheet satisfy the render loop on job1, and
# six of them would have composited the OLD graphics into the new video with
# every count-based gate downstream passing.
set -euo pipefail

CUTSHEET="./cutsheet.json"
ONLY=""
while [ $# -gt 0 ]; do
  case "$1" in
    --cutsheet) [ $# -ge 2 ] || { echo "usage: render.sh [--cutsheet PATH] [PART_ID]" >&2; exit 2; }
                CUTSHEET="$2"; shift 2 ;;
    --cutsheet=*) CUTSHEET="${1#*=}"; shift ;;
    -h|--help) echo "usage: render.sh [--cutsheet PATH] [PART_ID]"; echo "  renders parts/<id>/ -> renders/<id>.mov (mp4 for class=segment)"; exit 0 ;;
    *) [ -z "$ONLY" ] || { echo "usage: render.sh [--cutsheet PATH] [PART_ID]" >&2; exit 2; }
       ONLY="$1"; shift ;;
  esac
done
# resolve BEFORE cd so a relative --cutsheet keeps meaning the caller's cwd
CUTSHEET=$(python3 -c 'import os,sys; print(os.path.abspath(sys.argv[1]))' "$CUTSHEET")
[ -f "$CUTSHEET" ] || { echo "no cut sheet at $CUTSHEET" >&2; exit 1; }
cd "$(dirname "$0")"
# The user npm cache is root-owned on this machine (pre-existing npm bug, EPERM on
# every npx). Default npx to a project-local cache unless the caller set one.
export npm_config_cache="${npm_config_cache:-$PWD/.npm-cache}"
export CUTSHEET
mkdir -p renders
fail=0
# Every composition's length must equal the frame count its PART's [start,end]
# implies in the cut sheet (round((end-start)*fps)), checked before anything
# renders or is skipped as up to date. On 2026-09-23 the cut sheet moved g21's
# start 2.2s earlier after its composition was built; the render matched the
# stale composition exactly, so the frame check below (then composition-relative)
# passed, and the poll landed 2.2s ahead of the words and left 2.2s early.
python3 - <<'PY' || { echo "STALE COMPOSITIONS: run node build.mjs first"; exit 1; }
import json, re, os, sys
cs = json.load(open(os.environ["CUTSHEET"]))
fps = float(cs.get("fps", 30)) or 30.0
bad = 0
for p in cs["parts"]:
    want = round((p["end"] - p["start"]) * fps)
    if p["endFrame"] - p["startFrame"] != want:
        print(f"    FAIL {p['id']}: cut sheet frame span {p['endFrame']-p['startFrame']}f != round((end-start)*fps) {want}f; cut sheet self-inconsistent, rebuild it")
        bad = 1
    f = f"parts/{p['id']}/index.html"
    if not os.path.exists(f):
        continue
    got = round(float(re.search(r'data-duration="([\d.]+)"', open(f).read()).group(1)) * fps)
    if got != want:
        print(f"    FAIL {p['id']}: composition {got}f, cut sheet part {want}f")
        bad = 1
sys.exit(bad)
PY
# One part: check, render, verify. Runs in a subshell per part so up to RENDER_JOBS
# parts render at once (each headless Chrome uses a couple of the 18 cores; one at a
# time left the machine mostly idle, ~33 min for 28 parts on 2026-09-23). Its log goes
# to renders/.log/<id>.log and its verdict to renders/.log/<id>.status.
render_one() {
  id="$1"; d="parts/$id/"
  log="renders/.log/$id.log"; st="renders/.log/$id.status"
  # class and the frame count the CUT SHEET says this part spans, from
  # round((end-start)*fps), both read out of the cut sheet passed via --cutsheet
  cls=$(python3 -c "
import json,os
p=[x for x in json.load(open(os.environ['CUTSHEET']))['parts'] if x['id']=='$id']
print(p[0]['class'] if p else '')")
  want=$(python3 -c "
import json,os
p=[x for x in json.load(open(os.environ['CUTSHEET']))['parts'] if x['id']=='$id']
if not p: print(''); raise SystemExit
fps=float(json.load(open(os.environ['CUTSHEET'])).get('fps',30)) or 30.0
print(round((p[0]['end']-p[0]['start'])*fps))")
  {
  echo "--- $id"
  if [ -z "$cls" ]; then echo "    FAIL $id: not in the cut sheet ($CUTSHEET)"; echo fail >"$st"; return; fi
  # never render a part that fails the HyperFrames check (layout, seek, contrast):
  # on 2026-09-22 four parts rendered anyway because the caller ignored it
  if ! npx --yes hyperframes@0.8.3 check "$d" >"renders/.log/$id.check" 2>&1; then
    echo "    FAIL $id check:"; grep -E "✗" "renders/.log/$id.check" | head -5; echo fail >"$st"; return; fi
  if [ "$cls" = "segment" ]; then ext=mp4; fmt=mp4; else ext=mov; fmt=mov; fi
  out="renders/$id.$ext"
  npx --yes hyperframes@0.8.3 render "$d" --format "$fmt" -f 30 -q high \
      --video-frame-format png --strict -o "$out" --quiet >/dev/null 2>&1
  pf=$(ffprobe -v error -select_streams v:0 -show_entries stream=pix_fmt -of csv=p=0 "$out")
  fr=$(ffprobe -v error -select_streams v:0 -show_entries stream=nb_frames -of csv=p=0 "$out")
  ok=1
  # a checkpoint render is ProRes 4444 with real alpha (yuva*). A class
  # "segment" cannot satisfy that in mp4; if one ever appears here it is the
  # cut sheet contradicting this tool, and that must fail loudly, not silently.
  if [[ "$pf" != yuva* ]]; then echo "    FAIL $id pix_fmt=$pf, no alpha"; ok=0; fi
  if [ "$fr" != "$want" ]; then echo "    FAIL $id frames=$fr want=$want"; ok=0; fi
  echo "    $id  $pf  ${fr}f"
  [ $ok = 1 ] && echo ok >"$st" || echo fail >"$st"
  } >"$log" 2>&1
}
export -f render_one

mkdir -p renders/.log
stale=()
# ids come from the cut sheet's parts[], never from ls parts/
ids=$(python3 -c "import json,os;print(' '.join(p['id'] for p in json.load(open(os.environ['CUTSHEET']))['parts']))")
for id in $ids; do
  d="parts/$id/"
  [ -n "$ONLY" ] && [ "$ONLY" != "$id" ] && continue
  if [ ! -d "$d" ]; then echo "  $id  SKIP (no $d; run node build.mjs)"; continue; fi
  out=""; for e in mov mp4; do [ -f "renders/$id.$e" ] && out="renders/$id.$e"; done
  # stale when ANY file in the part (composition, assets, fonts) is newer than its
  # render, not only index.html: a changed asset used to leave a render "up to date"
  if [ -n "$out" ] && [ -z "$(find "$d" -type f -newer "$out" -print -quit)" ]; then
    echo "  $id  up to date, skipping"; continue
  fi
  rm -f "renders/.log/$id.status"; stale+=("$id")
done
if [ ${#stale[@]} -gt 0 ]; then
  echo "  rendering ${#stale[@]} part(s), ${RENDER_JOBS:-4} at a time: ${stale[*]}"
  printf '%s\n' "${stale[@]}" | xargs -P "${RENDER_JOBS:-4}" -I{} bash -c 'render_one "$@"' _ {}
  for id in "${stale[@]}"; do
    cat "renders/.log/$id.log"
    [ "$(cat renders/.log/$id.status 2>/dev/null)" = ok ] || fail=1
  done
fi
echo "---"
[ $fail -eq 0 ] && echo "ALL RENDERS OK" || { echo "RENDER FAILURES ABOVE"; exit 1; }
