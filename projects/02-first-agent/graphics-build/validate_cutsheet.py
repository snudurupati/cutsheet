#!/usr/bin/env python3
"""Validate the graphics plan before the build step ever sees it."""
import json, sys
KINDS={"stat","card","screenshot","takeover","zoom","diagram","broll-slot"}
CLASSES={"overlay","segment"}

def main():
    path=sys.argv[1] if len(sys.argv)>1 else "graphics-build/cutsheet.json"
    parts=json.load(open(path))["parts"]
    errs=[]
    for p in parts:
        for f in ("id","start","end","kind","class","direction"):
            if f not in p: errs.append(f"{p.get('id','?')}: missing {f}")
        if p.get("kind") not in KINDS:  errs.append(f"{p['id']}: bad kind {p.get('kind')!r}")
        if p.get("class") not in CLASSES: errs.append(f"{p['id']}: bad class {p.get('class')!r}")
        if p.get("start",0) >= p.get("end",0): errs.append(f"{p['id']}: start >= end")
    for a,b in zip(parts,parts[1:]):
        if b["start"] < a["start"]: errs.append(f"{b['id']}: not sorted ascending")
        if b["start"] < a["end"]:   errs.append(f"{a['id']}/{b['id']}: overlap")
        gap=b["start"]-a["end"]
        # abut exactly, or leave more than a second; anything between flashes raw footage
        if 0 < gap <= 1.0:
            errs.append(f"{a['id']}/{b['id']}: gap {gap:.3f}s -- must abut exactly or exceed 1.0s")
    total=sum(p["end"]-p["start"] for p in parts)
    print(f"{len(parts)} parts, {total:.1f}s of graphics over a 784.4s cut ({total/784.4*100:.0f}% covered)")
    if errs:
        print("\nFAIL"); [print("  "+e) for e in errs]; sys.exit(1)
    print("PASS: fields, kinds, classes, ordering, overlaps, gap rule")

if __name__=="__main__": main()
