#!/usr/bin/env python3
"""Measure every rendered part's REAL bounding box and gate it against its zone.

Non-negotiable 5 says measure, do not estimate. This makes that mechanical: it reads the
alpha channel of each rendered overlay, takes the true bounding box (drop shadows included,
which hand-measurement always forgets), and fails if it leaves the zone the plan declared.

Zones are the ones MEASURED on this footage, not the stale values in style.json:
  chin varies y710-820 across the video, so hero type starts at y720, not y690.
  subject silhouette starts near x840, so left-column content ends at x700.
"""
import json, subprocess, sys, os
from PIL import Image

SAFE = {"top": 720, "bottom": 972, "left": 96, "right": 1824}
LEFTCOL = {"left": 96, "right": 700, "top": 100, "bottom": 980}

def bbox(mov, t, work):
    png = os.path.join(work, "m.png")
    subprocess.run(["ffmpeg","-nostdin","-y","-v","error","-ss",str(t),"-i",mov,"-frames:v","1",
                    "-vf","format=rgba,scale=1920:-2",png],check=True)
    im = Image.open(png).convert("RGBA")
    a = im.split()[3].point(lambda v: 255 if v > 8 else 0)
    return a.getbbox()

def main():
    cs = json.load(open(sys.argv[1])); rend = sys.argv[2]; work = sys.argv[3]
    os.makedirs(work, exist_ok=True)
    ok = True
    for p in cs["parts"]:
        mov = os.path.join(rend, p["id"] + ".mov")
        if not os.path.exists(mov):
            print(f"  {p['id']}  not rendered yet"); continue
        dur = p["end"] - p["start"]
        boxes = [bbox(mov, t, work) for t in (dur*0.35, dur*0.75) ]
        boxes = [b for b in boxes if b]
        if not boxes:
            print(f"  {p['id']}  FAIL: nothing visible"); ok = False; continue
        x0=min(b[0] for b in boxes); y0=min(b[1] for b in boxes)
        x1=max(b[2] for b in boxes); y1=max(b[3] for b in boxes)
        zone = p.get("zone","")
        lim = LEFTCOL if zone=="leftColumn" else SAFE
        bad=[]
        if y0 < lim["top"]:    bad.append(f"top {y0} < {lim['top']}")
        if y1 > lim["bottom"]: bad.append(f"bottom {y1} > {lim['bottom']}")
        if x0 < lim["left"]-24: bad.append(f"left {x0} < {lim['left']-24}")
        if x1 > lim["right"]:  bad.append(f"right {x1} > {lim['right']}")
        print(f"  {p['id']}  x{x0}-{x1} y{y0}-{y1}  {zone or 'safe'}  "
              f"{'PASS' if not bad else 'FAIL: ' + '; '.join(bad)}")
        ok = ok and not bad
    print("\nLAYOUT GATE:", "PASS" if ok else "FAIL")
    sys.exit(0 if ok else 1)

if __name__ == "__main__": main()
