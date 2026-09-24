#!/usr/bin/env python3
"""Gate the graphics plan before the build step sees it.
Rules from .claude/skills/graphics: required fields, allowed kinds, start<end,
sorted, no overlaps, and consecutive beats either abut exactly or leave a gap of
more than one second — a gap of a few tenths flashes raw un-graphiced footage for
a fraction of a second and almost always means the plan meant to abut.

Reads the thresholds it can from styles/<style>/style.json rather than hardcoding
them, so a correction written back into the style file (hard rule 9) actually
reaches this gate."""
import json, sys, os

KINDS = {"stat", "card", "screenshot", "takeover", "zoom", "diagram", "broll-slot"}
CLASSES = {"overlay", "segment"}
REQUIRED = ("id", "start", "end", "kind", "class", "scene", "direction")
DRAWN = {"analogy", "contrast", "loop", "strike-list", "self-demonstrating"}

os.chdir(os.path.dirname(os.path.abspath(__file__)))
plan = json.load(open('cutsheet.json'))
parts = plan['parts']
root = os.path.join('..', '..', '..')
style = json.load(open(os.path.join(root, plan['style'], 'style.json')))
gcfg = style['graphics']
scenes = set(gcfg['sceneTypes'])
floor = gcfg['nonTypographicMinimum']['floorPerVideo']
fps = eval(plan['fps']) if '/' in str(plan['fps']) else float(plan['fps'])

# Per-job measured zones are authoritative; style.json zones are a fallback.
zonefile = gcfg['zones'].get('measuredZonesFile', 'graphics-build/zones.json')
zonecfg = json.load(open(os.path.basename(zonefile))) if os.path.exists(os.path.basename(zonefile)) else None
if gcfg['zones'].get('measurePerJob') and zonecfg is None:
    errs.append(f"style.json requires per-job zones but {zonefile} is missing. "
                f"run styles/measure_zones.py")
errs, warns = [], []


for p in parts:
    for f in REQUIRED:
        if f not in p:
            errs.append(f"{p.get('id','?')}: missing field '{f}'")
    if p.get('kind') not in KINDS:
        errs.append(f"{p['id']}: kind '{p.get('kind')}' not in {sorted(KINDS)}")
    if p.get('class') not in CLASSES:
        errs.append(f"{p['id']}: class '{p.get('class')}' not in {sorted(CLASSES)}")
    if p.get('scene') not in scenes:
        errs.append(f"{p['id']}: scene '{p.get('scene')}' not in style.json graphics.sceneTypes")
    if p['start'] >= p['end']:
        errs.append(f"{p['id']}: start {p['start']} not before end {p['end']}")
    if p['end'] > plan['runtime'] + 1e-6:
        errs.append(f"{p['id']}: end {p['end']} past runtime {plan['runtime']}")

    # style.json render.cutsheetStoresFrames: frames are authoritative, seconds derived.
    # Rounding a frame-snapped time to 3 decimals silently un-snaps it.
    if style['render'].get('cutsheetStoresFrames'):
        for a, b in (('startFrame', 'start'), ('endFrame', 'end')):
            if a not in p:
                errs.append(f"{p['id']}: missing '{a}' (style.json render.cutsheetStoresFrames)")
            elif abs(p[a] / fps - p[b]) > 1e-6:
                errs.append(f"{p['id']}: {b} {p[b]} does not derive from {a} {p[a]} at {fps}fps")

    # Hero type lives in the style's heroTypeZone, never centred or in the full-width
    # lower band: the band runs under the chin. (style.json 2026-08-30)
    # Overlays only: a segment is a full-frame drawn page with no footage beneath it,
    # so there is no subject to land on and no zone to honour.
    if p.get('hero') and p['class'] == 'overlay':
        want = zonecfg.get('heroTypeZone') if zonecfg else gcfg['heroTypeZone']
        if want is None:
            errs.append(f"{p['id']}: hero type as an OVERLAY, but {zonefile} found no region "
                        f"big enough to hold it. Make it a takeover or a reframe.")
        elif p.get('zone') not in (want, 'measured'):
            errs.append(f"{p['id']}: hero type in zone '{p.get('zone')}', "
                        f"measured heroTypeZone is '{want}'")

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

segs = sorted([p for p in parts if p['class'] == 'segment'], key=lambda p: p['start'])
for a, b in zip(segs, segs[1:]):
    if b['start'] - a['end'] < -1e-6:
        errs.append(f"{a['id']} -> {b['id']}: segments overlap by {a['end']-b['start']:.3f}s")

# THE FLOOR. A cut sheet whose every part is type on a panel is a decision someone
# made, or it is the default nobody noticed. job1 shipped 18 parts and 18 type cards
# and nothing caught it, because nothing was counting.
drawn = [p for p in parts if p.get('scene') in DRAWN]
if len(drawn) < floor:
    errs.append(f"non-typographic floor: {len(drawn)} drawn scene(s), style.json requires {floor}. "
                f"Scenes present: {sorted({p.get('scene') for p in parts})}")

# Every concept-scan candidate is either used or CLOSED WITH A REASON. The floor is
# not a quota: a declined candidate is a decision on the record, not a padded part.
if os.path.exists('concepts.json'):
    cand = json.load(open('concepts.json'))
    cand = cand.get('candidates', cand) if isinstance(cand, dict) else cand
    logged = {round(c['at'], 2) for c in plan.get('conceptCandidates', [])}
    for c in cand:
        at = round(float(c.get('at', c.get('start', -1))), 2)
        if at not in logged:
            errs.append(f"concept candidate at {at}s is neither accepted nor declined "
                        f"with a reason in cutsheet.conceptCandidates")
    for c in plan.get('conceptCandidates', []):
        if c['status'] == 'declined' and not c.get('why'):
            errs.append(f"declined candidate at {c['at']}s has no reason")
        if c['status'] == 'accepted' and c.get('part') not in {p['id'] for p in parts}:
            errs.append(f"accepted candidate at {c['at']}s points at missing part {c.get('part')}")

for p in parts:
    if p['end'] - p['start'] >= gcfg['continuousMotionAboveSeconds'] \
            and 'continuous' not in p['direction'].lower() \
            and 'drift' not in p['direction'].lower() and p['class'] != 'segment':
        warns.append(f"{p['id']}: {p['end']-p['start']:.1f}s beat with no continuous motion named")

print(f"{len(parts)} parts ({len(overlays)} overlay, {len(parts)-len(overlays)} segment)")
print(f"non-typographic: {len(drawn)}/{floor} required: "
      f"{', '.join(f'{p['id']} {p['scene']}' for p in drawn) or 'none'}")
for w in warns:
    print("  WARN ", w)
for e in errs:
    print("  ERROR", e)
print("PLAN VALID" if not errs else f"PLAN INVALID — {len(errs)} error(s)")
sys.exit(1 if errs else 0)
