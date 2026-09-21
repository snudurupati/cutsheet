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
    if copy["parts"]["g008"].get("cta") != copy["cta"]:
        sys.exit("ERROR the end card's CTA does not match the CTA constant. The "
                 "single-editable-constant guarantee is broken.")

    words, cards = [], []
    for pid in sorted(parts):
        p, c = parts[pid], copy["parts"][pid]
        stmts = [" ".join(st) for st in c["stmts"]]
        if c.get("cta"):
            stmts.append(c["cta"])
        lo, hi = p["start"] + 0.05, p["end"]
        span = (hi - lo) / max(1, len(stmts))
        for li, line in enumerate(stmts):
            s0 = lo + li * span
            toks = line.split()
            step = span / max(1, len(toks))
            # The readable interval runs to the END of the beat for the last
            # statement, because copy stays on screen until the cut.
            cards.append({"part": pid, "line": line, "words": len(toks),
                          "start": round(s0, 3), "end": round(s0 + span, 3),
                          "wordsPerSecond": round(len(toks) / span, 2)})
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
