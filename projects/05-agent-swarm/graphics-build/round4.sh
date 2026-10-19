#!/bin/bash
# Round 4 (human review 2026-09-30): plan -> demo spec -> build -> pixel-snap every screen mark ->
# strict build (a mark without a snap fails) -> the round-3 render/composite/audio chain.
set -euo pipefail
cd "$(dirname "$0")"
echo "== plan + demo spec"
python3 make_plan.py --cut-transcript ../outputs/transcript-cut.json --edit-cutsheet ../transcript/cutsheet.json --out cutsheet.json --plan-md PLAN.md | tail -2
python3 make_demo_spec.py --edit-cutsheet ../transcript/cutsheet.json --plan cutsheet.json --ocr screen-ocr.json --out demo-spec.json --scene-out demo-scene.json | tail -2
echo "== build, snap marks to pixels, strict build"
rm -f mark-requests.json
node build.mjs | grep -E "wrote|Error" || true
python3 snap_marks.py --requests mark-requests.json --screen ../outputs/base-screen.mp4 --scene demo-scene.json --out mark-snap.json --cache /tmp/snap-marks-frames | head -40
MARKS_STRICT=1 node build.mjs > build-strict.log 2>&1 || { grep -v "^    at" build-strict.log | head; exit 1; }
grep -E "wrote" build-strict.log || true
J=..
echo "== demo scene + part renders + pushes (parallel)"
python3 demo_scene.py --spec demo-spec.json --base $J/outputs/base-cut.mov --screen $J/outputs/base-screen.mp4 \
  --mask inset-mask.png --border inset-border.png --out $J/outputs/demo-scene.mp4 > $J/outputs/demo-scene.log 2>&1 & DEMO=$!
python3 push.py --cutsheet cutsheet.json --base $J/outputs/base-cut.mov --renders renders > renders-push.log 2>&1 & PUSH=$!
RENDER_JOBS=4 ./render.sh > renders-round3.log 2>&1 || { grep -E "✗|FAIL" renders-round3.log | head -20; exit 1; }
wait $DEMO || { echo "demo scene FAILED"; tail -5 $J/outputs/demo-scene.log; exit 1; }
wait $PUSH || { echo "push FAILED"; cat renders-push.log; exit 1; }
want=$(python3 -c "import json;d=json.load(open('demo-scene.json'));print(d['leaves']['frame']-d['enters']['frame'])")
got=$(ffprobe -v error -select_streams v:0 -show_entries stream=nb_frames -of csv=p=0 $J/outputs/demo-scene.mp4)
[ "$got" = "$want" ] || { echo "demo scene has $got frames, want $want"; exit 1; }
echo "   renders OK, demo scene $got frames, pushes: $(tail -2 renders-push.log | tr '\n' ' ')"
echo "== part checks"
python3 check_parts.py --cutsheet cutsheet.json --renders renders | tail -12
echo "== composite"
python3 assemble.py --cutsheet cutsheet.json --base $J/outputs/base-cut.mov --renders renders \
  --demo-scene $J/outputs/demo-scene.mp4 --demo-spec demo-spec.json --demo-scene-json demo-scene.json \
  --out $J/outputs/graphics-pass.mov > $J/outputs/assemble.log 2>&1
echo "== composite gates"
python3 verify_composite.py --render $J/outputs/graphics-pass.mov --base $J/outputs/base-cut.mov --cutsheet cutsheet.json \
  --renders renders --demo-scene $J/outputs/demo-scene.mp4 --demo-spec demo-spec.json | tail -4
ffmpeg -nostdin -v error -hwaccel videotoolbox -i $J/outputs/graphics-pass.mov -map 0:v:0 -vf scale=960:-2 -f framemd5 - \
  | python3 -c "
import sys
prev=None; dup=tot=0
for l in sys.stdin:
    if l.startswith('#'): continue
    h=l.rsplit(',',1)[-1].strip(); tot+=1; dup+=(h==prev); prev=h
print(f'duplicate frames {dup}/{tot} = {100*dup/tot:.2f}%'); sys.exit(1 if dup/tot>0.08 else 0)"
echo "== video gates PASS"
echo "== audio plan + mix + audio content gate"
( cd $J && python3 graphics-build/plan_audio.py --render outputs/graphics-pass.mov --job . --style ../../styles/editorial/style.json \
    --cutsheet graphics-build/cutsheet.json --demo graphics-build/demo-scene.json --out outputs/audio-plan.json | tail -7 \
  && python3 graphics-build/mix_audio.py --plan outputs/audio-plan.json --input outputs/graphics-pass.mov --out outputs/finished.mov \
    --job . --cutsheet graphics-build/cutsheet.json 2>&1 | tr '\r' '\n' | grep -v "size=" | tail -4 \
  && python3 graphics-build/verify_cut.py --render outputs/finished.mov --cutsheet transcript/cutsheet.json \
    --cut-transcript outputs/transcript-cut.json --halves audio \
    --audio-windows 0,300,575,900,1240 | grep -E "%|RESULT" )
echo "== ROUND 3 COMPLETE"
