#!/bin/bash
# Pull one frame from the middle of every graphic's window, plus both demo seams,
# for the technical-QA pass. Frames land in outputs/review/.
set -euo pipefail
cd "$(dirname "$0")/.."
IN=${1:-outputs/graphics-pass.mp4}
OUTDIR=outputs/review
mkdir -p "$OUTDIR"
rm -f "$OUTDIR"/*.jpg

python3 - "$IN" "$OUTDIR" <<'PY'
import json, subprocess, sys
src, outdir = sys.argv[1], sys.argv[2]
plan = json.load(open('graphics-build/cutsheet.json'))
shots = []
for p in plan['parts']:
    if p['class'] == 'overlay':
        # middle of the window: entrances have landed, exits have not started
        shots.append((p['id'], p['start'] + (p['end'] - p['start']) * 0.55))
    else:
        shots.append((p['id'] + '-in',  p['start'] + 1.2))
        shots.append((p['id'] + '-mid', (p['start'] + p['end']) / 2))
        shots.append((p['id'] + '-out', p['end'] - 1.0))
for name, t in sorted(shots, key=lambda s: s[1]):
    subprocess.run(['ffmpeg', '-nostdin', '-hide_banner', '-v', 'error',
                    '-ss', f'{t:.3f}', '-i', src, '-frames:v', '1',
                    '-vf', 'scale=960:-2', '-y', f'{outdir}/{name}-t{t:.1f}.jpg'],
                   check=True)
    print(f"{name:12s} t={t:8.2f}")
PY
ls "$OUTDIR" | wc -l
