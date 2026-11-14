#!/bin/bash
# The full chain after the graphics checkpoint, INCREMENTAL (CLAUDE.md hard rule 14; graphics skill
# "Rebuild time: only redo what changed"). Every step is a gated script; this sequences them and stops
# on the FIRST failure (pipefail + set -e: a failed step piped through grep must never pass).
#
#   1 demo scene    keyed: hash(demo spec, script, masks, base + screen identity); skipped on a match
#                   with the right frame count. Part renders run alongside (render.sh: stale-only, parallel)
#   2 pushes        keyed (push.py)
#   3 composite     assemble.py: incremental by default, re-composites only changed layers' windows and
#                   splices them in by stream copy (packet-verified); FULL=1 forces a whole pass
#   4 gates         verify_composite + duplicate-frame check on the re-composited WINDOWS only; the cheap
#                   whole-file checks (frame count, a/v drift) every time
#   5 audio         keyed on the audio plan's inputs: unchanged -> re-mux the existing mix onto the new
#                   picture (-c:v copy); changed -> plan_audio + mix_audio. verify_cut (rule 11) always.
#
#   ./rebuild.sh            incremental        FULL=1 ./rebuild.sh   whole composite
set -euo pipefail
cd "$(dirname "$0")"
J=..; T0=$(date +%s); L=$(mktemp -d)
step() { echo "== $1  (+$(( $(date +%s) - T0 ))s)"; }
key() { python3 - "$@" <<'PY'
import hashlib, os, sys
h = hashlib.sha1()
for f in sys.argv[1:]:
    st = os.stat(f); h.update(f"{f}:{st.st_size}:{st.st_mtime_ns}".encode())
    if os.path.getsize(f) < 5_000_000: h.update(open(f, "rb").read())
print(h.hexdigest())
PY
}
frames() { ffprobe -v error -select_streams v:0 -count_packets -show_entries stream=nb_read_packets -of csv=p=0 "$1"; }

step "1/5 demo scene + part renders"
DK=$(key demo-spec.json demo_scene.py inset-mask.png inset-border.png $J/outputs/base-screen.mp4 $J/outputs/base-cut.mov)
want=$(python3 -c "import json;d=json.load(open('demo-scene.json'));print(d['leaves']['frame']-d['enters']['frame'])")
if [ -f $J/outputs/demo-scene.mp4 ] && [ "$(cat $J/outputs/demo-scene.mp4.key 2>/dev/null)" = "$DK" ] && [ "$(frames $J/outputs/demo-scene.mp4)" = "$want" ]; then
  echo "   demo scene key matches, reusing"; (exit 0) & DEMO=$!
else
  ( python3 demo_scene.py --spec demo-spec.json --base $J/outputs/base-cut.mov --screen $J/outputs/base-screen.mp4 \
      --mask inset-mask.png --border inset-border.png --out $J/outputs/demo-scene.mp4 >$L/demo 2>&1 \
    && echo "$DK" > $J/outputs/demo-scene.mp4.key ) & DEMO=$!
fi
./render.sh 2>&1 | grep -E "^--- |FAIL|OK|yuv|rendering|up to date" || { echo "part renders failed"; kill $DEMO 2>/dev/null || true; exit 1; }
wait $DEMO || { echo "demo scene failed:"; tail -5 $L/demo; exit 1; }
got=$(frames $J/outputs/demo-scene.mp4); [ "$got" = "$want" ] || { echo "demo scene has $got frames, want $want"; exit 1; }
echo "   demo scene $got frames OK"

step "2/5 pushes"
python3 push.py --cutsheet cutsheet.json --base $J/outputs/base-cut.mov --renders renders

step "3/5 composite"
python3 assemble.py --cutsheet cutsheet.json --base $J/outputs/base-cut.mov --renders renders \
  --demo-scene $J/outputs/demo-scene.mp4 --demo-spec demo-spec.json --demo-scene-json demo-scene.json \
  --out $J/outputs/graphics-pass.mov ${FULL:+--full} | tee $L/asm
WIN=$(grep '^WINDOWS ' $L/asm | tail -1 | cut -d' ' -f2)

step "4/5 composite gates"
if [ "$WIN" != "-" ]; then
  GW=""; [ "$(grep -c 'full composite' $L/asm)" = 0 ] && GW="--windows $WIN"
  ( python3 verify_composite.py --render $J/outputs/graphics-pass.mov --base $J/outputs/base-cut.mov --cutsheet cutsheet.json \
      --renders renders --demo-scene $J/outputs/demo-scene.mp4 --demo-spec demo-spec.json $GW | tail -24 ) >$L/comp 2>&1 & G1=$!
  ( python3 - "$J/outputs/graphics-pass.mov" "$WIN" <<'PY'
import subprocess, sys
f, win = sys.argv[1], sys.argv[2]
dup = tot = 0
for w in win.split(","):
    lo, hi = map(float, w.split(":"))
    out = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-hwaccel", "videotoolbox", "-ss", f"{lo:.3f}", "-to", f"{hi:.3f}",
                          "-i", f, "-map", "0:v:0", "-vf", "scale=960:-2", "-f", "framemd5", "-"], capture_output=True, text=True).stdout
    prev = None
    for l in out.splitlines():
        if l.startswith("#"): continue
        h = l.rsplit(",", 1)[-1].strip(); tot += 1; dup += (h == prev); prev = h
print(f"duplicate frames in the gated window(s): {dup}/{tot} = {100 * dup / max(tot, 1):.2f}%")
sys.exit(1 if dup / max(tot, 1) > 0.08 else 0)
PY
  ) >$L/dup 2>&1 & G2=$!
  g1=0; g2=0; wait $G1 || g1=$?; wait $G2 || g2=$?
  cat $L/comp $L/dup
  [ $g1 = 0 ] && [ $g2 = 0 ] || { echo "composite gates FAILED"; exit 1; }
else
  echo "   graphics pass unchanged; gates carried from the last run"
fi

step "5/5 audio"
AK=$(key cutsheet.json demo-scene.json ../../../styles/editorial/style.json plan_audio.py mix_audio.py $J/outputs/base-audio.wav $J/audio/soundtracks/* $J/audio/sound-effects/*)
if [ -f $J/outputs/finished.mov ] && [ "$(cat $J/outputs/finished.mov.key 2>/dev/null)" = "$AK" ]; then
  echo "   audio plan inputs unchanged: re-muxing the existing mix onto the new picture"
  ffmpeg -nostdin -v error -y -i $J/outputs/graphics-pass.mov -i $J/outputs/finished.mov -map 0:v -map 1:a -c copy $J/outputs/finished.tmp.mov
  mv $J/outputs/finished.tmp.mov $J/outputs/finished.mov
else
  ( cd $J && python3 graphics-build/plan_audio.py --render outputs/graphics-pass.mov --job . --style ../../styles/editorial/style.json \
      --cutsheet graphics-build/cutsheet.json --demo graphics-build/demo-scene.json --out outputs/audio-plan.json | tail -12 \
    && python3 graphics-build/mix_audio.py --plan outputs/audio-plan.json --input outputs/graphics-pass.mov --out outputs/finished.mov \
      --job . --cutsheet graphics-build/cutsheet.json 2>&1 | tr '\r' '\n' | grep -v "size=" | tail -6 )
  echo "$AK" > $J/outputs/finished.mov.key
fi
[ "$(frames $J/outputs/finished.mov)" = "$(frames $J/outputs/base-cut.mov)" ] || { echo "finished.mov frame count differs from the base"; exit 1; }
( cd $J && python3 graphics-build/verify_cut.py --render outputs/finished.mov --cutsheet transcript/cutsheet.json \
    --cut-transcript outputs/transcript-cut.json --halves audio --audio-windows 0,300,600,900 | grep -E "%|RESULT" )
echo "== REBUILD COMPLETE in $(( $(date +%s) - T0 ))s"
