#!/usr/bin/env python3
"""Verify the deflicker on RENDERED segments, not on a model of them.

Takes segments already encoded by splice.py (--only), and for each one traces
several regions of the source and of the render at full frame rate:

  wall-L   the reference the swell was measured on (so it SHOULD flatten)
  wall-R   an independent wall patch on the far side of the frame
  picture  the framed print behind him: textured, mid-tone
  shirt    the darkest large surface

Reports each region's swing (p95 - p5 over the segment) before and after. The
correction passes when the independent regions flatten too, which proves the
curve corrects the picture and not just the patch it was measured on. A region
whose swing GROWS fails the gate.

Also checks tonal range inside the face (grade-on-range memory, 2026-09-08): the
correction must not compress YHIGH - YLOW on the face.
"""
import argparse, json, re, subprocess, sys

REGIONS = {"wall-L": "600:800:200:200", "wall-R": "300:500:3500:200",
           "picture": "400:300:2300:200", "shirt": "300:200:1300:1900"}
FACE = "500:560:1760:760"


def trace(src, crop, ss=None, n=None):
    cmd = ["ffmpeg", "-nostdin", "-hwaccel", "videotoolbox"]
    if ss is not None:
        cmd += ["-ss", f"{ss:.6f}"]
    cmd += ["-i", src]
    if n:
        cmd += ["-frames:v", str(n)]
    cmd += ["-vf", f"crop={crop},scale=64:-2,signalstats,metadata=print:file=-",
            "-an", "-f", "null", "-"]
    o = subprocess.run(cmd, capture_output=True, text=True).stdout
    g = lambda k: [float(x) for x in re.findall(k + r"=([\d.]+)", o)]
    return g("YAVG"), g("YLOW"), g("YHIGH")


def spread(v):
    s = sorted(v)
    return s[int(0.95 * (len(s) - 1))] - s[int(0.05 * (len(s) - 1))]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cutsheet", required=True)
    ap.add_argument("--workdir", required=True, help="splice.py workdir")
    ap.add_argument("--segments", required=True)
    a = ap.parse_args()
    cs = json.load(open(a.cutsheet)); fps = cs["fps"]
    segs = {s["id"]: s for s in cs["segments"]}
    ok = True
    for sid in a.segments.split(","):
        s = segs[sid]; n = s["endFrame"] - s["startFrame"]
        part = f"{a.workdir}/{sid}.mov"
        print(f"== {sid}  session {s['session']}  {n} frames")
        for name, crop in REGIONS.items():
            src = trace(s["cam"], crop, s["startFrame"] / fps, n)[0]
            out = trace(part, crop)[0]
            if len(out) != n:
                sys.exit(f"{sid}: render has {len(out)} frames, expected {n}")
            b, a2 = spread(src), spread(out)
            bad = a2 > b + 0.5
            ok &= not bad
            print(f"   {name:8s} swing {b:5.1f} -> {a2:5.1f}"
                  f"   mean {sum(src)/n:6.1f} -> {sum(out)/n:6.1f}{'   <-- GREW' if bad else ''}")
        _, lo0, hi0 = trace(s["cam"], FACE, s["startFrame"] / fps, n)
        _, lo1, hi1 = trace(part, FACE)
        r0 = sum(h - l for h, l in zip(hi0, lo0)) / n
        r1 = sum(h - l for h, l in zip(hi1, lo1)) / n
        print(f"   face tonal range (YHIGH-YLOW, mean) {r0:5.1f} -> {r1:5.1f}")
    print("\nRESULT:", "PASS" if ok else "FAIL")
    sys.exit(0 if ok else 1)


main()
