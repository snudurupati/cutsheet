#!/bin/bash
# Rebuild everything downstream of the base cut, in order, stopping on the FIRST
# failure. Every step is a gated script; this only sequences them.
#
# Written 2026-09-22 after a chained command piped a failed screen re-splice
# through grep, which swallowed the exit code, so the demo scene re-rendered from
# the stale, unblurred screen track and "succeeded". pipefail + set -e make that
# impossible here.
#
#   ./rebuild.sh <proxy-dir>     proxy-dir: where the 1080p review proxy is written
set -euo pipefail
cd "$(dirname "$0")"
PROXY_DIR="${1:?usage: rebuild.sh <proxy-dir>}"
J=..
echo "== 1/6 demo scene + part renders (parallel)"
# the demo scene is skipped only when it is newer than EVERY input it is made from
fresh=1
for f in demo-spec.json demo_scene.py inset-mask.png inset-border.png $J/outputs/base-screen.mp4 $J/outputs/base-cut.mov; do
  [ $J/outputs/demo-scene.mp4 -nt "$f" ] || fresh=0
done
if [ $fresh = 1 ]; then
  echo "   demo scene newer than all its inputs, reusing"; (exit 0) & DEMO=$!
else
  python3 demo_scene.py --spec demo-spec.json --base $J/outputs/base-cut.mov --screen $J/outputs/base-screen.mp4 \
    --mask inset-mask.png --border inset-border.png --out $J/outputs/demo-scene.mp4 >/tmp/demo_scene.$$.log 2>&1 &
  DEMO=$!
fi
./render.sh | grep -E "^--- |FAIL|OK|yuv" || { echo "part renders failed"; kill $DEMO 2>/dev/null; exit 1; }
wait $DEMO || { echo "demo scene failed:"; tail -5 /tmp/demo_scene.$$.log; exit 1; }
want=$(python3 -c "import json;d=json.load(open('demo-scene.json'));print(d['leaves']['frame']-d['enters']['frame'])")
got=$(ffprobe -v error -select_streams v:0 -show_entries stream=nb_frames -of csv=p=0 $J/outputs/demo-scene.mp4)
[ "$got" = "$want" ] || { echo "demo scene has $got frames, want $want"; exit 1; }
echo "   demo scene $got frames OK"
echo "== 2/6 pushes"
python3 push.py --cutsheet cutsheet.json --base $J/outputs/base-cut.mov --renders renders
echo "== 3/6 composite"
python3 assemble.py --cutsheet cutsheet.json --base $J/outputs/base-cut.mov --renders renders \
  --demo-scene $J/outputs/demo-scene.mp4 --demo-spec demo-spec.json --demo-scene-json demo-scene.json \
  --out $J/outputs/graphics-pass.mov 2>&1 | tr '\r' '\n' | grep -v "^frame=" | tail -2
echo "== 4/6 composite gates"
python3 verify_composite.py --render $J/outputs/graphics-pass.mov --base $J/outputs/base-cut.mov --cutsheet cutsheet.json \
  --renders renders --demo-scene $J/outputs/demo-scene.mp4 --demo-spec demo-spec.json | tail -20
ffmpeg -nostdin -v error -hwaccel videotoolbox -i $J/outputs/graphics-pass.mov -map 0:v:0 -vf scale=960:-2 -f framemd5 - \
  | python3 -c "
import sys
prev=None; dup=tot=0
for l in sys.stdin:
    if l.startswith('#'): continue
    h=l.rsplit(',',1)[-1].strip(); tot+=1; dup+=(h==prev); prev=h
print(f'duplicate frames {dup}/{tot} = {100*dup/tot:.2f}%'); sys.exit(1 if dup/tot>0.08 else 0)"
echo "== 5/6 review proxy"
ffmpeg -nostdin -v error -y -hwaccel videotoolbox -i $J/outputs/graphics-pass.mov -vf scale=1920:-2 \
  -c:v h264_videotoolbox -b:v 12M -c:a aac -b:a 192k "$PROXY_DIR/review-full.mp4"
echo "== 6/6 audio plan + mix + audio content gate"
( cd $J && python3 graphics-build/plan_audio.py --render outputs/graphics-pass.mov --job . --style ../../styles/editorial/style.json \
    --cutsheet graphics-build/cutsheet.json --demo graphics-build/demo-scene.json --out outputs/audio-plan.json | tail -3 \
  && python3 graphics-build/mix_audio.py --plan outputs/audio-plan.json --input outputs/graphics-pass.mov --out outputs/finished.mov \
    --job . --cutsheet graphics-build/cutsheet.json 2>&1 | tr '\r' '\n' | grep -v "size=" | tail -5 \
  && python3 graphics-build/verify_cut.py --render outputs/finished.mov --cutsheet transcript/cutsheet.json \
    --cut-transcript outputs/transcript-cut.json --exposure graphics-build/exposure.json --halves audio \
    --audio-windows 0,400,700,1100,1300 | grep -E "%|RESULT" )
echo "== REBUILD COMPLETE"
