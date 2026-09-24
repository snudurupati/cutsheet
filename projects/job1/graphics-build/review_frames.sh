#!/bin/bash
# Pull frames around every part boundary so seams can be JUDGED, not assumed.
# CLAUDE.md rule 6: Claude cannot see video. Any claim about how a render looks
# has to come from actual frames.
#
# Three frames per boundary -- just before, just after, and mid-part -- because the
# failure modes live at the seams: dead air between parts, a footage jump where a
# segment was cut at the wrong time, and the ~3% luma dip a browser round-trip
# leaves at every segment edge.
set -uo pipefail
cd "$(dirname "$0")/.."
REND=${1:-outputs/graphics-pass.mp4}
OUT=${2:-outputs/review}
mkdir -p "$OUT"; rm -f "$OUT"/*.jpg
python3 - "$REND" "$OUT" <<'PY'
import json, subprocess, sys
rend, out = sys.argv[1], sys.argv[2]
plan = json.load(open('graphics-build/cutsheet.json'))
shots = []
for p in plan['parts']:
    s, e = p['start'], p['end']
    shots += [(max(0, s - 0.25), f"{p['id']}_pre"),
              (s + 0.35,          f"{p['id']}_in"),
              (s + (e - s) / 2,   f"{p['id']}_mid"),
              (max(0, e - 0.30),  f"{p['id']}_out"),
              (e + 0.25,          f"{p['id']}_post")]
for t, name in shots:
    if t >= plan['runtime']: continue
    subprocess.run(['ffmpeg','-v','error','-ss',f'{t:.3f}','-i',rend,'-frames:v','1',
                    '-vf','scale=640:-1','-q:v','3','-y',f'{out}/{name}-t{t:.2f}.jpg'])
print(f'{len(shots)} frames -> {out}')
PY
# Luma at every seam: a browser round-trip costs ~3% and the face visibly dips.
python3 - "$REND" <<'PY'
import json, re, subprocess, sys, statistics
rend = sys.argv[1]
plan = json.load(open('graphics-build/cutsheet.json'))
def y(t):
    r = subprocess.run(['ffmpeg','-v','error','-ss',f'{t:.3f}','-i',rend,'-frames:v','1',
        '-vf','signalstats,metadata=print','-f','null','-'], capture_output=True, text=True).stderr
    m = re.search(r'signalstats\.YAVG=([\d.]+)', r)
    return float(m.group(1)) if m else float('nan')
print('\nSEAM LUMA (a dip at a boundary means a browser round-trip on footage)')
worst = 0
for p in plan['parts']:
    for label, t0, t1 in (('in', p['start'] - 0.2, p['start'] + 0.2),
                          ('out', p['end'] - 0.2, p['end'] + 0.2)):
        a, b = y(t0), y(t1)
        if a != a or b != b or max(a, b) == 0: continue
        d = abs(a - b) / max(a, b) * 100
        # A drawn takeover legitimately changes the whole frame; only footage-to-
        # footage seams are meaningful here.
        if p['class'] == 'segment': continue
        flag = 'DIP' if d > 3 else ''
        worst = max(worst, d) if not flag else worst
        if flag: print(f'  {p["id"]} {label}: {a:.1f} -> {b:.1f}  {d:.1f}%  {flag}')
print(f'  worst overlay seam change: {worst:.1f}%')
PY
