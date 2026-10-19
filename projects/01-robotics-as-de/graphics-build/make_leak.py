#!/usr/bin/env python3
"""Write graphics-build/leak.json: where the demo screen shows things not meant to publish.

Detected from screen-ocr.json, not read off a player (tech-video-editor skill). On this
recording the Claude desktop app shows, in two layouts:
  sidebar  the full session list: cutsheet, 'Tech video editor agent swarm', 'Lighting,
           camera, and mic setup', 'Lightweight ontology', 'Episode 05 environment setup',
           video-editor (unreleased topics and the editing pipeline itself)
  account  'Sreeram · Max' under it (name and plan)
  strip    the narrow left strip once the terminal opens: 'cutsheet', 'Choose environment',
           'Import 28 Claude Code CLI sessions'
  popup    the same environment list as a popup mid-screen, about 5:37-5:49 (found by the
           technical review 2026-10-17, not by the first scan)
Each layout's window is the span of cut seconds whose OCR samples show its marker text,
padded half a sample either side, then mapped onto each demo segment's local frames.
Boxes are source pixels, measured as the union of the OCR boxes plus a margin.
Left alone: the GitHub page and its avatars (the presenter's own), the terminal prompt
snudurupati@Yantra (his public handle).
"""
import argparse, json, re

LAYOUTS = {
    "sidebar": (r"Tech video editor|Lighting, camera|Lightweight ontology|Episode 05", [0, 420, 560, 975]),
    "account": (r"Sreeram", [0, 2085, 330, 2150]),
    "strip":   (r"Import 28 Claude Code|Choose environment", [100, 870, 766, 1260]),
    "popup":   (r"Choose environment|Import 28 Claude Code", [1890, 840, 2420, 1230]),
}
# a layout matches only runs inside its own box: the popup and the strip carry the same words
XMIN = {"strip": 0, "popup": 1800}
PAD = 0.6

ap = argparse.ArgumentParser()
ap.add_argument("--cutsheet", required=True)
ap.add_argument("--ocr", required=True)
ap.add_argument("--out", required=True)
a = ap.parse_args()
cs = json.load(open(a.cutsheet)); ocr = json.load(open(a.ocr)); fps = cs["fps"]
win = {}
for k, (pat, box) in LAYOUTS.items():
    inbox = lambda r: r[0] >= XMIN.get(k, 0) and (k != "strip" or r[0] < 800)
    ts = [f["t"] for f in ocr if any(re.search(pat, r[4]) and inbox(r) for r in f["runs"])]
    # check every hit sits inside the declared box
    for f in ocr:
        for x, y, w, h, t in f["runs"]:
            if re.search(pat, t) and (x < box[0] - 4 or y < box[1] - 4 or (x + w) > box[2] + 4 or (y + h) > box[3] + 4):
                if k != "strip" or x < 800:      # strip runs merge with terminal text to the right; that part is terminal
                    print(f"  note {k}: run outside box at {f['t']}: {x},{y},{w},{h} {t[:40]!r}")
    # runs, not min..max (composition review 2026-10-17: the strip blur stayed on through two
    # minutes of full-screen Rerun and smeared the state graph)
    runs = []
    for t in sorted(ts):
        if runs and t - runs[-1][1] <= 2.5: runs[-1][1] = t
        else: runs.append([t, t])
    # each run reaches to the neighbouring samples that DON'T show the layout (exclusive), never a fixed
    # pad: OCR samples once a second, and a fixed 0.6s left the demo's last 0.9s (lengthened by the
    # 1.5s section beat, 2026-10-17) unblurred. Past the last sample it runs on to the end of the demo.
    ts_all = sorted(f["t"] for f in ocr)
    def widen(a_, b_):
        prev = [t for t in ts_all if t < a_]; nxt = [t for t in ts_all if t > b_]
        return (min(a_ - PAD, prev[-1] + 0.01) if prev else -1e9, max(b_ + PAD, nxt[0] - 0.01) if nxt else 1e9)
    win[k] = [widen(a_, b_) for a_, b_ in runs]
    print(f"{k:8s} {box}  " + ", ".join(f"{max(a_, 0):.1f}-{min(b_, 9999):.1f}" for a_, b_ in win[k]) + f"  ({len(ts)} samples)")
acc, segs = 0, {}
for s in cs["segments"]:
    n = s["outFrames"]
    if s["section"] == "demo":
        spans = []
        for k, ws in win.items():
            for w in ws:
                lo = max(0, round(w[0] * fps) - acc); hi = min(n - 1, round(w[1] * fps) - acc)
                if lo <= hi: spans.append({"layout": k, "start": lo, "end": hi})
        segs[s["id"]] = spans
    acc += n
json.dump({"_why": __doc__.strip(), "layouts": {k: {"list": b} for k, (p, b) in LAYOUTS.items()},
           "segments": segs}, open(a.out, "w"), indent=1)
print(f"wrote {a.out}: {sum(len(v) for v in segs.values())} spans over {len(segs)} demo segments")
