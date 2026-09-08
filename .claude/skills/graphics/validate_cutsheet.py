#!/usr/bin/env python3
"""Validate the graphics plan before the build step ever sees it.

Reference implementation. Copy into a job's graphics-build/ at plan time.

Rule 12: every input is an argument. The per-job copy this replaces carried the
cut duration as the literal 784.4, which is correct for exactly one video and
silently wrong for the next one, reporting a plausible coverage percentage
against the wrong denominator.

Usage:
    validate_cutsheet.py <cutsheet.json> --transcript <transcript-cut.json>
                         [--style styles/editorial/style.json]
"""
import argparse, json, sys

KINDS = {"stat", "card", "screenshot", "takeover", "zoom", "diagram", "broll-slot"}
CLASSES = {"overlay", "segment"}

# The five scenes that carry ideas rather than layout. A part is non-typographic
# when its scene is one of these, whatever its kind says.
DRAWN_SCENES = {"analogy", "contrast", "loop", "strike-list", "self-demonstrating"}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cutsheet")
    ap.add_argument("--transcript", required=True,
                    help="outputs/transcript-cut.json, the authority on the cut's duration")
    ap.add_argument("--style", default="styles/editorial/style.json")
    ap.add_argument("--concepts", help="graphics-build/concepts.json from scan_concepts.py")
    a = ap.parse_args()

    parts = json.load(open(a.cutsheet))["parts"]
    tr = json.load(open(a.transcript))
    style = json.load(open(a.style))

    # Gate on something the cutsheet cannot fake: the transcript's own duration.
    cut_seconds = tr.get("totalSeconds")
    if cut_seconds is None:
        cut_seconds = round(max((w.get("end") or 0) for w in tr.get("words", [])), 2)
    errs = []
    if parts and parts[-1]["end"] > cut_seconds + 0.5:
        errs.append(f"last part ends at {parts[-1]['end']:.2f}s but the cut runs {cut_seconds:.2f}s. "
                    "The cutsheet and the transcript are not describing the same edit.")

    for p in parts:
        for f in ("id", "start", "end", "kind", "class", "direction"):
            if f not in p:
                errs.append(f"{p.get('id','?')}: missing {f}")
        if p.get("kind") not in KINDS:
            errs.append(f"{p.get('id')}: bad kind {p.get('kind')!r}")
        if p.get("class") not in CLASSES:
            errs.append(f"{p.get('id')}: bad class {p.get('class')!r}")
        if p.get("start", 0) >= p.get("end", 0):
            errs.append(f"{p.get('id')}: start >= end")

    for x, y in zip(parts, parts[1:]):
        if y["start"] < x["start"]:
            errs.append(f"{y['id']}: not sorted ascending")
        if y["start"] < x["end"]:
            errs.append(f"{x['id']}/{y['id']}: overlap")
        gap = y["start"] - x["end"]
        if 0 < gap <= 1.0:
            errs.append(f"{x['id']}/{y['id']}: gap {gap:.3f}s. Abut exactly or exceed 1.0s, "
                        "or the composite flashes raw footage.")

    # The mix gate. Without it nothing notices a video of nothing but type.
    floor_cfg = style.get("graphics", {}).get("nonTypographicMinimum", {})
    floor = floor_cfg.get("floorPerVideo", 0)
    drawn = [p for p in parts if p.get("scene") in DRAWN_SCENES]
    if floor and len(drawn) < floor:
        errs.append(
            f"non-typographic floor: {len(drawn)} drawn scene(s), style requires {floor}. "
            f"Every part here is type on a panel. job1 shipped 18 parts and 18 type cards and "
            f"nothing noticed, because nothing was counting. Accepted concept-scan candidates "
            f"resolve to one of {sorted(DRAWN_SCENES)}; a declined one is closed with a reason.")

    if a.concepts:
        cands = json.load(open(a.concepts)).get("candidates", [])
        unaddressed = []
        for c in cands:
            hit = any(p["start"] - 2.0 <= c["start"] <= p["end"] + 2.0 for p in parts)
            declined = any(c["start"] == d.get("conceptStart") for d in parts if d.get("declined"))
            if not hit and not declined:
                unaddressed.append(c)
        if unaddressed:
            errs.append(f"{len(unaddressed)} concept-scan candidate(s) neither used nor declined: "
                        + ", ".join(f"{c['start']:.1f}s ({c['cue']})" for c in unaddressed[:6]))

    total = sum(p["end"] - p["start"] for p in parts)
    print(f"{len(parts)} parts, {total:.1f}s of graphics over a {cut_seconds:.1f}s cut "
          f"({total / cut_seconds * 100:.0f}% covered)")
    print(f"{len(drawn)} drawn scene(s) of {len(parts)}: "
          + (", ".join(f"{p['id']}={p['scene']}" for p in drawn) or "none"))

    if errs:
        print("\nFAIL")
        for e in errs:
            print("  " + e)
        sys.exit(1)
    print("PASS: fields, kinds, classes, ordering, overlaps, gap rule, "
          "duration match, non-typographic floor")


if __name__ == "__main__":
    main()
