#!/bin/bash
# Round 2 continuation (2026-09-29): part checks passed after check_parts learned about
# paper marks; renders, demo scene and pushes are already built. Composite and gates only.
set -euo pipefail
cd "$(dirname "$0")"
J=..
python3 check_parts.py --cutsheet cutsheet.json --renders renders | tail -3
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
echo "== ROUND 2 COMPLETE"
