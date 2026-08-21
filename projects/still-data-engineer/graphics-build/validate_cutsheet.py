#!/usr/bin/env python3
"""Gate the plan before the build step ever sees it. Exits non-zero on any violation."""
import json, sys
KINDS = {"stat","card","screenshot","takeover","zoom","diagram","broll-slot"}
CLASSES = {"overlay","segment"}
d = json.load(open(sys.argv[1] if len(sys.argv)>1 else "graphics-build/cutsheet.json"))
parts, errs = d["parts"], []
for p in parts:
    for f in ("id","start","end","kind","class","direction"):
        if f not in p: errs.append(f"{p.get('id','?')}: missing {f}")
    if p.get("kind") not in KINDS: errs.append(f"{p['id']}: bad kind {p.get('kind')!r}")
    if p.get("class") not in CLASSES: errs.append(f"{p['id']}: bad class {p.get('class')!r}")
    if p["start"] >= p["end"]: errs.append(f"{p['id']}: start >= end")
for a,b in zip(parts, parts[1:]):
    if b["start"] < a["start"]: errs.append(f"{b['id']}: not sorted ascending")
    if b["start"] < a["end"]:   errs.append(f"{a['id']}->{b['id']}: OVERLAP")
    else:
        gap = b["start"] - a["end"]
        # a few tenths means the plan meant to abut and did not - it flashes raw
        # un-graphiced footage for a fraction of a second during the composite
        if 0 < gap <= 1.0:
            errs.append(f"{a['id']}->{b['id']}: gap {gap:.3f}s - must abut exactly or exceed 1.0s")
dur = json.load(open("outputs/transcript-cut.json"))["duration"]
for p in parts:
    if p["end"] > dur + 0.001: errs.append(f"{p['id']}: ends {p['end']:.2f} past the {dur:.2f}s cut")
if errs:
    print("FAIL"); [print("  -",e) for e in errs]; sys.exit(1)
print(f"OK - {len(parts)} parts, none overlapping, every gap abuts or exceeds 1.0s, all inside {dur:.2f}s")
