#!/usr/bin/env python3
"""Write ff-clock.json: the wall-clock values each fast-forward's clock counts between.

Human 2026-09-29: show API and wall time honestly, and the fast-forward clocks count
WALL time from the same origin as the /usage panel, so the last clock and the panel
agree. The origin is measured, not assumed: the first OCR sample showing "Total
duration (wall): Xm Ys", mapped through the cutsheet to its session-A source time,
minus that duration. Checked 2026-09-29: origin 7:29.9 on the A camera, when he
launched Claude Code ("this fired up Claude Code" 7:33).
"""
import argparse, json, math, re, sys

ap = argparse.ArgumentParser()
ap.add_argument("--edit-cutsheet", required=True); ap.add_argument("--ocr", required=True)
ap.add_argument("--out", required=True)
a = ap.parse_args()
cs = json.load(open(a.edit_cutsheet)); ocr = json.load(open(a.ocr))

def cut2src(t):
    acc = 0
    for s in cs["segments"]:
        n = s["outFrames"]
        if acc <= round(t * 30) < acc + n:
            i = round(t * 30) - acc
            j = i if s["kind"] == "speech" else math.ceil(i * s["speed"] - 1e-9)
            return s["session"], (s["startFrame"] + j) / 30
        acc += n
    sys.exit(f"cut time {t} is past the cut")

seen = None
for d in ocr:
    for r in d["runs"]:
        m = re.search(r"Total duration \(wa[l1I]{2}\):\s*(\d+)m\s*(\d+)s", r[4])
        if m and not seen:
            seen = (d["t"], int(m.group(1)) * 60 + int(m.group(2)))
if not seen:
    sys.exit("no 'Total duration (wall)' on screen; cannot anchor the clocks")
sess, src = cut2src(seen[0])
if sess != "a":
    sys.exit("the /usage panel should be in session A")
origin = src - seen[1]
out, acc = [], 0
for s in cs["segments"]:
    if s["kind"] == "ff":
        out.append({"segment": s["id"], "cutStart": round(acc / 30, 3),
                    "cutEnd": round((acc + s["outFrames"]) / 30, 3),
                    "wallStart": round(s["startFrame"] / 30 - origin, 1),
                    "wallEnd": round(s["endFrame"] / 30 - origin, 1), "speed": s["speed"]})
    acc += s["outFrames"]
json.dump({"originSourceSeconds": round(origin, 2), "usageWallSeconds": seen[1],
           "usageSeenAtCut": seen[0], "fastForwards": out}, open(a.out, "w"), indent=1)
for f in out:
    print(f"  {f['segment']}  wall {int(f['wallStart'])//60}:{int(f['wallStart'])%60:02d} -> "
          f"{int(f['wallEnd'])//60}:{int(f['wallEnd'])%60:02d}  ({f['speed']:.1f}x)")
print(f"wrote {a.out}")
