#!/usr/bin/env python3
"""Gate the graphics plan before the build step sees it.
Rules from .claude/skills/graphics: required fields, allowed kinds, start<end,
sorted, no overlaps, and consecutive beats either abut exactly or leave a gap of
more than one second — a gap of a few tenths flashes raw un-graphiced footage for
a fraction of a second and almost always means the plan meant to abut."""
import json, sys, os

KINDS = {"stat", "card", "screenshot", "takeover", "zoom", "diagram", "broll-slot"}
CLASSES = {"overlay", "segment"}
REQUIRED = ("id", "start", "end", "kind", "class", "direction")

os.chdir(os.path.dirname(os.path.abspath(__file__)))
plan = json.load(open('cutsheet.json'))
parts = plan['parts']
errs, warns = [], []

for p in parts:
    for f in REQUIRED:
        if f not in p:
            errs.append(f"{p.get('id','?')}: missing field '{f}'")
    if p.get('kind') not in KINDS:
        errs.append(f"{p['id']}: kind '{p.get('kind')}' not in {sorted(KINDS)}")
    if p.get('class') not in CLASSES:
        errs.append(f"{p['id']}: class '{p.get('class')}' not in {sorted(CLASSES)}")
    if p['start'] >= p['end']:
        errs.append(f"{p['id']}: start {p['start']} not before end {p['end']}")
    if p['end'] > plan['runtime'] + 1e-6:
        errs.append(f"{p['id']}: end {p['end']} past runtime {plan['runtime']}")

overlays = [p for p in parts if p['class'] == 'overlay']
if [p['start'] for p in overlays] != sorted(p['start'] for p in overlays):
    errs.append("overlay parts are not sorted ascending by start")

for a, b in zip(overlays, overlays[1:]):
    gap = b['start'] - a['end']
    if gap < -1e-6:
        errs.append(f"{a['id']} -> {b['id']}: overlap of {-gap:.3f}s")
    elif abs(gap) > 1e-6 and gap <= 1.0:
        errs.append(f"{a['id']} -> {b['id']}: gap of {gap:.3f}s — must abut exactly "
                    f"or leave more than 1s (this flashes raw footage)")

for p in parts:
    if p['end'] - p['start'] >= 20 and 'continuous' not in p['direction'].lower() \
            and 'drift' not in p['direction'].lower() and p['class'] != 'segment':
        warns.append(f"{p['id']}: {p['end']-p['start']:.1f}s beat with no continuous motion named")

print(f"{len(parts)} parts ({len(overlays)} overlay, {len(parts)-len(overlays)} segment)")
for w in warns:
    print("  WARN ", w)
for e in errs:
    print("  ERROR", e)
print("PLAN VALID" if not errs else f"PLAN INVALID — {len(errs)} error(s)")
sys.exit(1 if errs else 0)
