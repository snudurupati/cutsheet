#!/usr/bin/env python3
"""Merge both camera parts into the durable transcript, applying the mishear pass.

Only single-word whole-word swaps are auto-applied; anything that would change the
word count is recorded as a flag and left in the text.
"""
import json, re

PARTS = [
    {"id": "p1", "camera": "raw/Camera-2026-08-19 20-36-07.mov",
     "screen": "raw/Screen-2026-08-19 20-36-07.mov",
     "wx": "transcript/work/wx/camera-20-36-07.json",
     "cameraFrames": 102833, "screenFrames": 102834},
    {"id": "p2", "camera": "raw/Camera-2026-08-19 22-01-29.mov",
     "screen": "raw/Screen-2026-08-19 22-01-29.mov",
     "wx": "transcript/work/wx/camera-22-01-29.json",
     "cameraFrames": 38263, "screenFrames": 38261},
]

# brand.md auto entries that are single-word whole-word swaps
AUTO = {"dbd": "dbt", "clod": "Claude", "claud": "Claude", "cloude": "Claude",
        "anthropics": "Anthropic", "anthropik": "Anthropic",
        "oppus": "Opus", "opis": "Opus", "agenic": "agentic",
        "kubernetis": "Kubernetes", "postgress": "Postgres"}

# "cloud" is flagged in brand.md because it is a real word. Judged per instance
# by reading context; these six are the genuine English word and stay.
REAL_CLOUD = {("p1", 239.8), ("p1", 283.8), ("p1", 1347.1),
              ("p2", 687.4), ("p2", 707.7), ("p2", 711.7)}

def is_real_cloud(pid, t):
    return any(p == pid and abs(t - s) < 0.6 for p, s in REAL_CLOUD)

flags = []
out_segments = []

for part in PARTS:
    d = json.load(open(part["wx"]))
    for seg in d["segments"]:
        words = []
        for w in seg.get("words", []):
            raw = w["word"]
            bare = re.sub(r"[^A-Za-z]", "", raw).lower()
            new = raw
            if bare == "cloud":
                if is_real_cloud(part["id"], w.get("start", 0)):
                    flags.append({"part": part["id"], "start": w.get("start"),
                                  "heard": raw, "kept": "cloud",
                                  "why": "genuine English word in context"})
                else:
                    new = re.sub(r"[Cc]loud", "Claude", raw)
            elif bare in AUTO:
                repl = AUTO[bare]
                new = re.sub(re.escape(re.sub(r"[^A-Za-z]", "", raw)), repl, raw, count=1)
            elif bare == "opusfi":
                flags.append({"part": part["id"], "start": w.get("start"),
                              "heard": raw, "correct": "Opus 5",
                              "why": "one word into two - would break every timestamp downstream; "
                                     "left in the transcript, corrected in authored graphics copy"})
            words.append({"word": new, "start": w.get("start"), "end": w.get("end"),
                          "score": w.get("score")})
        text = " ".join(x["word"] for x in words)
        out_segments.append({"part": part["id"], "start": seg["start"], "end": seg["end"],
                             "text": text, "words": words,
                             "avg_logprob": seg.get("avg_logprob")})

doc = {
    "video": "still-data-engineer",
    "note": "Two sequential recording sessions of ONE video, split by a camera shutdown. "
            "Timestamps are relative to each part's own camera clip; see parts[] and the part "
            "field on every segment. Voice is on the camera clips only - both screen clips are "
            "digital silence.",
    "fps": 30,
    "parts": [{k: v for k, v in p.items() if k != "wx"} for p in PARTS],
    "clipAlignment": {
        "method": "tail",
        "p1": {"trim": "screen", "frames": 1, "why": "screen clip is 1 frame longer"},
        "p2": {"trim": "camera", "frames": 2, "why": "camera clip is 2 frames longer"},
    },
    "segments": out_segments,
}

json.dump(doc, open("transcript/transcript.json", "w"), indent=1)
json.dump({"flags": flags,
           "autoApplied": {"dbd -> dbt": "6 occurrences",
                           "cloud -> Claude": "29 of 35 occurrences, judged in context"}},
          open("transcript/misheard-local.json", "w"), indent=1)

nw = sum(len(s["words"]) for s in out_segments)
print(f"transcript.json: {len(out_segments)} segments, {nw} words")
print(f"misheard-local.json: {len(flags)} flags")
