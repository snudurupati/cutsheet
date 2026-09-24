#!/usr/bin/env python3
"""Write outputs/transcript-cut.json: every word remapped onto the edited timeline.

Every downstream skill reads this file and nothing re-transcribes, ever. Cue
times for graphics are derived from it at build time and range-checked against
the part that owns them, so this has to be exactly right.

A word is kept only if it lies wholly inside a kept segment. A word straddling a
cut boundary is dropped rather than half-mapped: a cue landing on a word whose
other half was removed points at a moment that no longer exists.
"""
import argparse, json, sys


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--transcript", required=True)
    ap.add_argument("--cutsheet", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    cs = json.load(open(a.cutsheet))
    fps = cs["fps"]
    segs = [s for s in cs["segments"] if s.get("keep", True)]
    tr = json.load(open(a.transcript))

    # cut-timeline offset of each segment, in frames
    offs, acc = [], 0
    for s in segs:
        offs.append(acc)
        acc += s["endFrame"] - s["startFrame"]
    total_frames = acc
    if total_frames != cs["totalFrames"]:
        sys.exit(f"cutsheet totalFrames {cs['totalFrames']} disagrees with the "
                 f"segments ({total_frames}); refusing to remap against a stale file")

    words_in = [w for w in tr["word_segments"] if "start" in w and "end" in w]
    out_words, dropped, straddled = [], 0, 0
    for w in words_in:
        placed = False
        for s, off in zip(segs, offs):
            ss, se = s["startFrame"] / fps, s["endFrame"] / fps
            if w["start"] >= ss and w["end"] <= se:
                out_words.append({
                    "word": w["word"],
                    "start": round(off / fps + (w["start"] - ss), 3),
                    "end":   round(off / fps + (w["end"] - ss), 3),
                    "score": w.get("score"),
                    "sourceStart": round(w["start"], 3),
                    "segment": s["id"],
                })
                placed = True
                break
            if w["start"] < se and w["end"] > ss:      # overlaps the edge
                straddled += 1
                placed = True
                break
        if not placed:
            dropped += 1

    out_words.sort(key=lambda w: w["start"])
    for x, y in zip(out_words, out_words[1:]):
        assert x["start"] <= y["start"], "remapped words are not monotonic"
    if out_words and out_words[-1]["end"] > total_frames / fps + 0.5:
        sys.exit("a remapped word lands past the end of the cut")

    doc = {
        "video": "outputs/base-cut.mov",
        "fps": fps,
        "totalFrames": total_frames,
        "totalSeconds": round(total_frames / fps, 3),
        "cutsheet": a.cutsheet,
        "_note": "word timings are on the EDITED timeline. sourceStart is the "
                 "original camera-clip time, kept so a cue can be traced back.",
        "words": out_words,
    }
    json.dump(doc, open(a.out, "w"), indent=1)
    print(f"words in transcript {len(words_in)}")
    print(f"words on the cut    {len(out_words)}")
    print(f"dropped (cut out)   {dropped}")
    print(f"straddled a join    {straddled}")
    print(f"cut length          {total_frames/fps/60:.2f} min")
    print(f"wrote {a.out}")


main()
