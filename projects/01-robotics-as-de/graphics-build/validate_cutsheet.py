#!/usr/bin/env python3
"""Validate the graphics cut sheet before a single composition is written.

Exits non-zero on any violation. Checks the skill's list plus the style file's
non-typographic floor, which exists because job1 shipped eighteen parts and
eighteen type cards and nothing was counting.
"""
import argparse, json, os, sys

ALLOWED_KIND = {"stat", "card", "screenshot", "takeover", "zoom", "diagram", "broll-slot",
                "analogy", "contrast", "loop", "strike-list", "self-demonstrating"}
NONTYPO = {"analogy", "contrast", "loop", "strike-list", "self-demonstrating",
           "diagram", "screenshot"}
ALLOWED_CLASS = {"overlay", "segment"}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cutsheet")
    ap.add_argument("--style", required=True)
    ap.add_argument("--cut-transcript", required=True)
    ap.add_argument("--edit-cutsheet", required=True,
                    help="transcript/cutsheet.json. Passed in, never derived from "
                         "another path: deriving it broke the moment this ran from a "
                         "different working directory (hard rule 12)")
    ap.add_argument("--demo-scene", default="")
    a = ap.parse_args()

    cs = json.load(open(a.cutsheet))
    style = json.load(open(a.style))
    cut = json.load(open(a.cut_transcript))
    parts = cs["parts"]
    err = []

    if cs.get("totalSeconds") != cut.get("totalSeconds"):
        err.append(f"cut sheet totalSeconds {cs.get('totalSeconds')} != transcript "
                   f"{cut.get('totalSeconds')}; one of them is stale")

    for p in parts:
        for k in ("id", "start", "end", "kind", "class", "direction"):
            if k not in p or p[k] in (None, ""):
                err.append(f"{p.get('id','?')}: missing {k}")
        if p.get("kind") not in ALLOWED_KIND:
            err.append(f"{p['id']}: kind {p.get('kind')!r} not allowed")
        if p.get("class") not in ALLOWED_CLASS:
            err.append(f"{p['id']}: class {p.get('class')!r} not allowed")
        if p.get("start", 0) >= p.get("end", 0):
            err.append(f"{p['id']}: start >= end")
        if p.get("end", 0) > cut["totalSeconds"] + 0.01:
            err.append(f"{p['id']}: ends past the cut")
        if len(p.get("direction", "")) < 40:
            err.append(f"{p['id']}: direction is not concrete enough to build from")

    for x, y in zip(parts, parts[1:]):
        if y["start"] < x["start"]:
            err.append(f"{x['id']}/{y['id']}: not sorted ascending")
        if y["start"] < x["end"] - 1e-6:
            err.append(f"{x['id']}/{y['id']}: overlap")
        gap = y["start"] - x["end"]
        # abut exactly, or leave more than a second. anything between flashes raw
        # footage for a fraction of a second during the composite.
        if 1e-6 < gap <= 1.0:
            err.append(f"{x['id']}/{y['id']}: gap of {gap:.3f}s. Abut exactly or "
                       "leave more than 1s")

    # demo-scene.json's enters/leaves are DERIVED from the cutsheet's demo section
    # and must be re-derived whenever the cut changes. They sat at 209.0/1396.0 from
    # a 26:38 cut while the cut had become 26:15: a 44-second error on the exit that
    # would have run the demo scene 44s into the talking-head closing, and that also
    # mislabelled which parts sit over the screen and therefore need opaque panels.
    if a.demo_scene and os.path.exists(a.demo_scene):
        demo = json.load(open(a.demo_scene))
        acc, lo, hi = 0, None, None
        cs_full = json.load(open(a.edit_cutsheet))
        for s in cs_full["segments"]:
            n = s["endFrame"] - s["startFrame"]
            if s.get("section") == "demo":
                if lo is None:
                    lo = acc / cs_full["fps"]
                hi = (acc + n) / cs_full["fps"]
            acc += n
        for key, want in (("enters", lo), ("leaves", hi)):
            got = demo[key]["cutSeconds"]
            if want is None or abs(got - want) > 1.0:
                err.append(f"demo-scene.json {key} is {got} but the cutsheet's demo "
                           f"section gives {want}. Re-derive it; a stale value here "
                           "misplaces the demo scene and mislabels panel treatments")

    # panels.json is DERIVED: which parts sit over the screen depends on where they
    # are, so moving a part invalidates it. g029 was moved into the demo window and
    # kept its lightReinforced panel, which style.json forbids over a screen
    # recording, and the composite shipped a 92% card over a bright UI before this
    # check existed. Third stale-derived-file bug on this job, same shape each time.
    panels_path = os.path.join(os.path.dirname(a.cutsheet) or ".", "panels.json")
    if a.demo_scene and os.path.exists(panels_path) and os.path.exists(a.demo_scene):
        pj = json.load(open(panels_path))
        dj = json.load(open(a.demo_scene))
        lo, hi = dj["enters"]["cutSeconds"], dj["leaves"]["cutSeconds"]
        for p in parts:
            if p["class"] != "overlay":
                continue
            over = not (p["end"] <= lo or p["start"] >= hi)
            rec = pj.get(p["id"])
            if rec is None:
                err.append(f"{p['id']}: no entry in panels.json; re-run measure_panels.py")
            elif rec.get("overScreen") != over:
                err.append(f"{p['id']}: panels.json says overScreen={rec.get('overScreen')} "
                           f"but it now sits {p['start']}-{p['end']} against a demo window of "
                           f"{lo}-{hi}. Re-run measure_panels.py and rebuild the part")

    floor = (style["graphics"]["nonTypographicMinimum"]["floorPerVideo"])
    nt = sum(1 for p in parts if p["kind"] in NONTYPO)
    if nt < floor:
        err.append(f"only {nt} non-typographic scenes, style floor is {floor}")

    # hard rule 10: a long stretch with no graphic at all is the thing that got
    # shipped once and had to be asked about
    prev, longest = 0.0, (0.0, 0.0)
    for p in parts:
        if p["start"] - prev > longest[1] - longest[0]:
            longest = (prev, p["start"])
        prev = max(prev, p["end"])
    if cut["totalSeconds"] - prev > longest[1] - longest[0]:
        longest = (prev, cut["totalSeconds"])
    span = longest[1] - longest[0]

    print(f"parts                 {len(parts)}")
    print(f"non-typographic       {nt}  (floor {floor})")
    print(f"longest plain stretch {span:.0f}s "
          f"({int(longest[0])//60}:{int(longest[0])%60:02d} - "
          f"{int(longest[1])//60}:{int(longest[1])%60:02d})")
    if span > 300:
        err.append(f"longest plain stretch is {span:.0f}s. Hard rule 10: a video "
                   "with a long graphic-free run is a finding, not a default")

    if err:
        print("\nFAIL")
        for e in err:
            print("  " + e)
        sys.exit(1)
    print("\nOK")


main()
