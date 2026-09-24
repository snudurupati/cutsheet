#!/usr/bin/env python3
"""OCR the demo screen once a second into screen-ocr.json, for punch-in timing.

Punch-ins were first timed to the speech. On this recording the speech runs AHEAD
of the screen: he says the line, then types the query, so a zoom timed to the
words landed on half-typed input (found 2026-09-22 on g08/g10 before any render).
A punch-in's window has to come from when its target text is actually on screen,
and its crop from where that text actually is: the terminal scrolls, so the same
result sits at different y positions over time.

Reads the UNBLURRED raw screen clips through the cutsheet mapping (the blur only
touches the sidebar, never a punch-in target) and runs ocr.swift (macOS Vision).
Output: [{"t": cut seconds, "seg": id, "runs": [[x, y, w, h, text], ...]}, ...]
with boxes in 3840x2160 source pixels.
"""
import argparse, json, os, subprocess, sys, tempfile
from concurrent.futures import ThreadPoolExecutor


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cutsheet", required=True)
    ap.add_argument("--ocr-bin", required=True, help="compiled ocr.swift")
    ap.add_argument("--out", required=True)
    ap.add_argument("--step", type=float, default=1.0)
    a = ap.parse_args()
    cs = json.load(open(a.cutsheet)); fps = cs["fps"]
    pts, acc = [], 0
    for s in cs["segments"]:
        n = s["endFrame"] - s["startFrame"]
        if s["section"] == "demo":
            i = 0
            while i < n:
                pts.append(((acc + i) / fps, s["id"], s["screen"], (s["screenStartFrame"] + i) / fps))
                i += int(a.step * fps)
        acc += n
    tmp = tempfile.mkdtemp()

    def grab(p):
        t, sid, src, st = p
        out = os.path.join(tmp, f"{t:09.3f}.png")
        subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-ss", f"{st:.4f}", "-i", src,
                        "-frames:v", "1", out], check=True)
        return out

    with ThreadPoolExecutor(6) as ex:
        files = list(ex.map(grab, pts))
    res = {}
    for k in range(0, len(files), 40):          # batch images per OCR process
        o = subprocess.run([a.ocr_bin, *files[k:k + 40]], capture_output=True, text=True).stdout
        cur = None
        for line in o.splitlines():
            if line.startswith("## "):
                cur = line[3:]; res[cur] = []
            elif "\t" in line and cur:
                geo, txt = line.split("\t", 1)
                res[cur].append([*map(int, geo.split()), txt])
        print(f"  {min(k + 40, len(files))}/{len(files)}", flush=True)
    doc = [{"t": round(t, 3), "seg": sid, "runs": res.get(f, [])}
           for (t, sid, _, _), f in zip(pts, files)]
    empty = sum(1 for d in doc if not d["runs"])
    if empty > len(doc) * 0.05:
        sys.exit(f"{empty} of {len(doc)} frames returned no text; OCR is not working")
    json.dump(doc, open(a.out, "w"))
    print(f"wrote {a.out}: {len(doc)} frames, {sum(len(d['runs']) for d in doc)} text runs")


main()
