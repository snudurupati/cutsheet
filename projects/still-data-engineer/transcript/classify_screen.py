#!/usr/bin/env python3
"""Mark which demo segments show the browser, so the bookmark blur is applied
only where there are bookmarks - blurring a strip of terminal would destroy text."""
import json, subprocess, re

SCREEN = {"p1": "raw/Screen-2026-08-19 20-36-07.mov",
          "p2": "raw/Screen-2026-08-19 22-01-29.mov"}
OFFSET = {"p1": 1, "p2": -2}          # screen frame = camera frame + offset
FPS = 30

def top_luma(src, t):
    out = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-ss", f"{t:.4f}", "-i", src,
         "-frames:v", "1", "-vf", "crop=3840:208:0:0,signalstats,metadata=print:file=-",
         "-f", "null", "-"], capture_output=True, text=True).stdout
    m = re.search(r"YAVG=([\d.]+)", out)
    return float(m.group(1)) if m else None

cs = json.load(open("transcript/cutsheet.json"))
segs = [s for s in cs["segments"] if s["scene"] == "demo"]
print(f"probing {len(segs)} demo segments (3 samples each)\n")
n_browser = 0
for s in segs:
    src = SCREEN[s["part"]]
    a = (s["startFrame"] + OFFSET[s["part"]]) / FPS
    b = (s["endFrame"] + OFFSET[s["part"]]) / FPS
    samples = [top_luma(src, a + (b - a) * f) for f in (0.15, 0.5, 0.85)]
    samples = [x for x in samples if x is not None]
    light = sum(1 for x in samples if x > 150)
    s["screenTopLuma"] = round(sum(samples) / len(samples), 1) if samples else None
    s["browser"] = light >= 2          # majority of samples show light chrome
    if s["browser"]:
        n_browser += 1
    print(f"  {s['id']} {s['section']:13s} top-luma {s['screenTopLuma']:6.1f}  "
          f"{'BROWSER -> blur' if s['browser'] else 'dark (terminal/slides)'}")

# The blur must stop when the browser does, or terminal text gets smeared. Find the
# exact switch for any segment that is only partly browser.
for s in segs:
    if not s["browser"]:
        continue
    src = SCREEN[s["part"]]
    a = (s["startFrame"] + OFFSET[s["part"]]) / FPS
    b = (s["endFrame"] + OFFSET[s["part"]]) / FPS
    t, last_light = a, None
    while t < b:
        v = top_luma(src, t)
        if v is not None and v > 150:
            last_light = t
        elif last_light is not None:
            break
        t += 0.5
    if last_light is not None and last_light < b - 0.75:
        lo, hi = last_light, min(last_light + 0.5, b)
        for _ in range(5):
            mid = (lo + hi) / 2
            v = top_luma(src, mid)
            if v is not None and v > 150: lo = mid
            else: hi = mid
        s["blurUntil"] = round(lo - a, 2)
        print(f"  {s['id']} leaves the browser {s['blurUntil']}s in - blur stops there")
    else:
        s["blurUntil"] = None

json.dump(cs, open("transcript/cutsheet.json", "w"), indent=1)
print(f"\n{n_browser} of {len(segs)} demo segments show the browser and get the bookmark blur")
