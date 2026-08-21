#!/usr/bin/env python3
"""Write outputs/transcript-cut.json - every word remapped onto the edited timeline.

Nothing downstream re-transcribes. Segment offsets come from the frame counts, so a
word's edited time is exact rather than accumulated from rounded durations.
"""
import json

FPS = 30
cs = json.load(open("transcript/cutsheet.json"))
tr = json.load(open("transcript/transcript.json"))

words = {"p1": [], "p2": []}
for seg in tr["segments"]:
    for w in seg["words"]:
        if w.get("start") is not None:
            words[seg["part"]].append(w)
for k in words:
    words[k].sort(key=lambda w: w["start"])

out_words, out_segs = [], []
cursor = 0                      # frames into the edited timeline
for s in cs["segments"]:
    a, b = s["startFrame"], s["endFrame"]
    ws = [w for w in words[s["part"]] if w["end"] > a / FPS and w["start"] < b / FPS]
    seg_words = []
    for w in ws:
        st = max(w["start"], a / FPS) - a / FPS + cursor / FPS
        en = min(w["end"], b / FPS) - a / FPS + cursor / FPS
        rec = {"word": w["word"], "start": round(st, 3), "end": round(en, 3),
               "score": w.get("score"), "seg": s["id"]}
        seg_words.append(rec)
        out_words.append(rec)
    out_segs.append({"id": s["id"], "section": s["section"], "scene": s["scene"],
                     "part": s["part"],
                     "start": cursor / FPS, "end": (cursor + s["frames"]) / FPS,
                     "startFrame": cursor, "endFrame": cursor + s["frames"],
                     "srcStart": s["start"], "srcEnd": s["end"],
                     "text": " ".join(w["word"] for w in seg_words)})
    cursor += s["frames"]

json.dump({"video": "still-data-engineer", "fps": FPS,
           "durationFrames": cursor, "duration": cursor / FPS,
           "note": "Edited-timeline times. Source times are on each segment as srcStart/srcEnd.",
           "segments": out_segs, "words": out_words},
          open("outputs/transcript-cut.json", "w"), indent=1)

print(f"{len(out_words)} words remapped over {cursor/FPS/60:.2f} min ({cursor} frames)")
mono = all(a["start"] <= b["start"] for a, b in zip(out_words, out_words[1:]))
print("monotonic:", mono)
print("first:", out_words[0]["word"], out_words[0]["start"], "| last:", out_words[-1]["word"], out_words[-1]["end"])
