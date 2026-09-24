#!/usr/bin/env python3
"""Build outputs/transcript-cut.json from the on-screen copy.

There is no voiceover on this piece. The ON-SCREEN TEXT IS the caption track, so
the durable word-level record every downstream stage expects is generated from
the copy rather than from WhisperX. Hard rule 1 ("transcribe once per video") is
satisfied trivially: there is no speech to transcribe.

Rule 12: inputs are arguments and the script asserts what it read matches the cut
sheet before doing any work. copy.json is emitted by build.mjs, so the end card's
single END_TEXT constant reaches the caption track without being retyped.

Usage:
    make_text_track.py --copy copy.json --cutsheet cutsheet.json \\
                       --out ../outputs/transcript-cut.json --fps 30
"""
import argparse, json, os, sys


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--copy", required=True)
    ap.add_argument("--cutsheet", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--fps", type=float, required=True)
    a = ap.parse_args()

    copy = json.load(open(a.copy))
    cs = json.load(open(a.cutsheet))
    parts = {p["id"]: p for p in cs["parts"]}

    # Gate before any work: the two files must describe the same edit.
    if set(parts) != set(copy["parts"]):
        sys.exit(f"ERROR parts differ: cutsheet {sorted(parts)} vs copy {sorted(copy['parts'])}")
    if abs(cs["fps"] - a.fps) > 1e-6:
        sys.exit(f"ERROR fps mismatch: cutsheet says {cs['fps']}, caller expected {a.fps}")
    total = cs["parts"][-1]["end"]
    if abs(cs["totalSeconds"] - total) > 1e-6:
        sys.exit(f"ERROR cutsheet totalSeconds {cs['totalSeconds']} != last part end {total}")
    if copy["parts"]["g007"]["lines"] != copy["endText"]:
        sys.exit("ERROR the end card's lines do not match END_TEXT. The single-constant "
                 "guarantee is broken, so a one-line edit would no longer reach the caption track.")

    words, cards = [], []
    for pid in sorted(parts):
        p, c = parts[pid], copy["parts"][pid]
        # Each line occupies an equal share of the part, after a 0.2s lead-in and
        # before a 0.4s tail, which is where the build actually wipes them in.
        lines = ([c["eyebrow"]] if c["eyebrow"] else []) + list(c["lines"]) \
              + ([c["support"]] if c["support"] else [])
        lo, hi = p["start"] + 0.20, p["end"] - 0.40
        span = (hi - lo) / max(1, len(lines))
        for li, line in enumerate(lines):
            s0 = lo + li * span
            toks = line.split()
            step = span / max(1, len(toks))
            cards.append({"part": pid, "line": line,
                          "start": round(s0, 3), "end": round(s0 + span, 3)})
            for wi, w in enumerate(toks):
                ws = s0 + wi * step
                words.append({"word": w, "start": round(ws, 3),
                              "end": round(ws + step * 0.92, 3), "part": pid})

    doc = {
        "source": "on-screen text (no voiceover; the text IS the caption track)",
        "job": cs["job"], "fps": cs["fps"], "totalSeconds": total,
        "canvas": cs["canvas"], "render": cs["render"],
        "_why": "Generated from copy.json, which build.mjs emits from its own copy "
                "constants, so the end card's END_TEXT reaches this file without "
                "being retyped anywhere.",
        "cards": cards, "words": words,
    }
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    json.dump(doc, open(a.out, "w"), indent=1)
    print(f"wrote {a.out}: {len(words)} words, {len(cards)} lines, {total}s at {cs['fps']}fps")


main()
