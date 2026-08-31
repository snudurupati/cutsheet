#!/usr/bin/env python3
"""Every cue must fall inside the part that owns it.

style.json _cueTimesWhy: a cue outside its own part renders nothing and errors nowhere.
Cues are declared as absolute times in cues.json and re-derived here at build time.
"""
import json, sys
cs=json.load(open(sys.argv[1])); cues=json.load(open(sys.argv[2]))
parts={p["id"]:p for p in cs["parts"]}
ok=True
for pid, items in cues.items():
    p=parts.get(pid)
    if not p: print(f"  {pid}: no such part"); ok=False; continue
    for label,t in items.items():
        inside = p["start"] <= t <= p["end"]
        if not inside: ok=False
        print(f"  {pid:5} {label:<28} abs {t:8.2f}  rel {t-p['start']:6.2f}  "
              + ("OK" if inside else "OUTSIDE [%.2f,%.2f]" % (p["start"], p["end"])))
print("\nCUE GATE:", "PASS" if ok else "FAIL")
sys.exit(0 if ok else 1)
