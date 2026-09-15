#!/usr/bin/env python3
"""Measure a job's graphic zones from its own footage.

Zones are NOT a style constant. styles/<style>/style.json carries a set of boxes
measured on one job, and on 2026-09-07 job1 proved they do not transfer: same
person, same room, same lighting, but a tight close-up instead of a wide shot,
and all three stored zones measured as sitting on his face. The shipped verdict
card crosses his mouth because the plan trusted that table.

Two signals per cell, both needed:
  detail  mean within-frame stdev. Separates face from wall unambiguously:
          clean wall reads under 10, a face reads 60+. Luma cannot: it called
          the face-covering boxes 128 and the clean wall 178, which reads as a
          difference of degree rather than the difference between a wall and a
          man's head.
  motion  stdev of the cell mean ACROSS frames. Catches the speaker moving, and
          catches busy-but-static dressing (a picture, a lamp) when paired with
          detail.

Usage:
  python3 styles/measure_zones.py <video> --out <zones.json> [--exclude A-B ...]
"""
import argparse, json, statistics, subprocess, sys, tempfile, os
from PIL import Image

GW, GH = 32, 18            # grid cells across the canvas
DRIFT_WARN = 2.0           # stdev of the frame-wide mean, in luma units.
                           # A locked camera in a steady room reads under 1.
CANVAS_W, CANVAS_H = 1920, 1080

def sample_times(dur, n, excl):
    out, step = [], dur / (n + 1)
    for i in range(1, n + 1):
        t = step * i
        if not any(a <= t <= b for a, b in excl):
            out.append(round(t, 2))
    return out

def grab(video, t, tmp, w=384, h=216):
    p = os.path.join(tmp, f"z{t}.png")
    subprocess.run(["ffmpeg", "-v", "error", "-ss", str(t), "-i", video, "-frames:v", "1",
                    "-vf", f"scale={w}:{h}", "-y", p], check=True)
    return Image.open(p).convert("L")

def measure(video, times, tmp):
    """detail, motionRaw, motion (exposure-normalised), luma, drift.

    motion is measured on cell means with each FRAME's global mean subtracted.
    Lights that drift, or a camera left on auto exposure or auto ISO, move every
    cell at once; without that subtraction the drift lands in every cell's motion
    figure and the entire frame reads as subject. On 2026-09-15 that turned a
    framing with a real 600x1020 clear zone into "NO CLEAR ZONE FOUND" on four
    consecutive takes, which would have sent every card beat to a full-frame
    takeover for no reason. Raw motion is kept so the drift can be reported
    rather than silently absorbed: a pulsing picture is still a finding.
    """
    ims = [grab(video, t, tmp) for t in times]
    w, h = ims[0].size
    cw, ch = w // GW, h // GH
    cell   = [[[0.0] * GW for _ in range(GH)] for _ in ims]
    detail = [[0.0] * GW for _ in range(GH)]
    luma   = [[0.0] * GW for _ in range(GH)]
    for gy in range(GH):
        for gx in range(GW):
            box = (gx * cw, gy * ch, (gx + 1) * cw, (gy + 1) * ch)
            means, sds = [], []
            for i, im in enumerate(ims):
                d = list(im.crop(box).get_flattened_data())
                m = statistics.mean(d)
                means.append(m); sds.append(statistics.pstdev(d))
                cell[i][gy][gx] = m
            detail[gy][gx] = statistics.mean(sds)
            luma[gy][gx]   = statistics.mean(means)
    fmean = [statistics.mean(c for row in f for c in row) for f in cell]
    drift = {"frameMeanMin": round(min(fmean), 1),
             "frameMeanMax": round(max(fmean), 1),
             "range":        round(max(fmean) - min(fmean), 1),
             "stdev":        round(statistics.pstdev(fmean), 2)}
    n = len(ims)
    motion_raw = [[statistics.pstdev([cell[i][gy][gx] for i in range(n)])
                   for gx in range(GW)] for gy in range(GH)]
    motion     = [[statistics.pstdev([cell[i][gy][gx] - fmean[i] for i in range(n)])
                   for gx in range(GW)] for gy in range(GH)]
    return detail, motion_raw, motion, luma, drift

def largest_rect(clear):
    """Largest all-clear axis-aligned rectangle. Classic histogram method."""
    best = (0, None)
    heights = [0] * GW
    for gy in range(GH):
        for gx in range(GW):
            heights[gx] = heights[gx] + 1 if clear[gy][gx] else 0
        stack = []
        for gx in range(GW + 1):
            cur = heights[gx] if gx < GW else 0
            start = gx
            while stack and stack[-1][1] > cur:
                i, hgt = stack.pop()
                area = hgt * (gx - i)
                if area > best[0]:
                    best = (area, (i, gy - hgt + 1, gx - 1, gy))
                start = i
            stack.append((start, cur))
    return best[1]

def to_canvas(r):
    x0, y0, x1, y1 = r
    return {"x": [round(x0 * CANVAS_W / GW), round((x1 + 1) * CANVAS_W / GW)],
            "y": [round(y0 * CANVAS_H / GH), round((y1 + 1) * CANVAS_H / GH)]}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--out", required=True)
    ap.add_argument("--frames", type=int, default=14)
    ap.add_argument("--exclude", action="append", default=[],
                    help="A-B seconds to skip, e.g. a demo takeover")
    ap.add_argument("--detail-max", type=float, default=18.0)
    ap.add_argument("--motion-max", type=float, default=4.5)
    a = ap.parse_args()

    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                "-of", "csv=p=0", a.video], capture_output=True,
                               text=True).stdout.strip())
    excl = []
    for e in a.exclude:
        lo, hi = e.split("-"); excl.append((float(lo), float(hi)))
    times = sample_times(dur, a.frames, excl)
    with tempfile.TemporaryDirectory() as tmp:
        detail, motion_raw, motion, luma, drift = measure(a.video, times, tmp)

    if drift["stdev"] > DRIFT_WARN:
        over = lambda m: sum(1 for y in range(GH) for x in range(GW) if m[y][x] > a.motion_max)
        print(f"!! GLOBAL EXPOSURE DRIFT. The frame-wide mean moves {drift['range']} luma units "
              f"(stdev {drift['stdev']}, threshold {DRIFT_WARN}).\n"
              f"   Every cell shifts together, so measured raw this disqualifies "
              f"{over(motion_raw)}/{GW * GH} cells\n"
              f"   against {over(motion)}/{GW * GH} once the drift is removed. The zones below "
              f"ARE measured with it\n"
              f"   removed and are correct. The FOOTAGE still pulses: that is the lights or the "
              f"camera,\n"
              f"   never the framing. Check ISO is not on auto, and deflicker before editing.\n",
              file=sys.stderr)

    clear = [[detail[y][x] <= a.detail_max and motion[y][x] <= a.motion_max
              for x in range(GW)] for y in range(GH)]
    print("CLEAR MAP  ('.' = clear wall, '#' = subject or dressing)")
    for y in range(GH):
        print("   " + "".join("." if clear[y][x] else "#" for x in range(GW)))

    zones, used = {}, [row[:] for row in clear]
    for name in ("primary", "secondary", "tertiary"):
        r = largest_rect(used)
        if not r: break
        x0, y0, x1, y1 = r
        if (x1 - x0 + 1) * (y1 - y0 + 1) < 6: break
        cells = [(detail[y][x], motion[y][x], luma[y][x])
                 for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)]
        z = to_canvas(r)
        z.update({"detail": round(statistics.mean(c[0] for c in cells), 1),
                  "motion": round(statistics.mean(c[1] for c in cells), 2),
                  "luma":   round(statistics.mean(c[2] for c in cells), 1)})
        z["panelTreatment"] = ("inverted" if z["luma"] >= 150 else
                               "lightReinforced" if z["luma"] >= 110 else "light")
        zones[name] = z
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1): used[y][x] = False

    if not zones:
        print("NO CLEAR ZONE FOUND. This framing cannot carry an overlay. Use takeovers "
              "or a reframe.", file=sys.stderr)
    order = sorted(zones, key=lambda k: -(zones[k]["x"][1] - zones[k]["x"][0]) *
                                         (zones[k]["y"][1] - zones[k]["y"][0]))
    # Hero type is ranked by WIDTH, not area. A 240x840 sliver has the largest area
    # here and cannot hold a headline at any readable size; ranking by area picked it.
    HERO_MIN_W, HERO_MIN_H = 500, 260
    hero = [k for k in order
            if zones[k]["x"][1] - zones[k]["x"][0] >= HERO_MIN_W
            and zones[k]["y"][1] - zones[k]["y"][0] >= HERO_MIN_H]
    hero = max(hero, key=lambda k: zones[k]["x"][1] - zones[k]["x"][0]) if hero else None
    out = {"video": a.video, "measuredFrames": times, "canvas": [CANVAS_W, CANVAS_H],
           "thresholds": {"detailMax": a.detail_max, "motionMax": a.motion_max,
                          "driftWarn": DRIFT_WARN},
           "globalExposureDrift": drift,
           "motionExposureNormalised": True,
           "zones": zones,
           "heroTypeZone": hero,
           "heroTypeZoneMinimum": {"widthPx": HERO_MIN_W, "heightPx": HERO_MIN_H},
           "heroTypeAsOverlayPossible": hero is not None,
           "_note": "Authoritative for this job. style.json zones are a fallback and a shape "
                    "reference only. Re-run if the cut changes."}
    json.dump(out, open(a.out, "w"), indent=2)
    print()
    for k in order:
        z = zones[k]
        print(f"  {k:10s} x{z['x'][0]:5d}-{z['x'][1]:<5d} y{z['y'][0]:5d}-{z['y'][1]:<5d}"
              f"  luma {z['luma']:6.1f}  detail {z['detail']:5.1f}  -> {z['panelTreatment']}")
    if hero:
        print(f"\n  heroTypeZone -> {hero}")
    else:
        print(f"\n  heroTypeZone -> NONE. No clear region reaches {HERO_MIN_W}x{HERO_MIN_H}, so this\n"
              "  framing CANNOT carry hero type as an overlay on the footage. Hero beats must be\n"
              "  takeovers or reframes; putting a headline anywhere here lands it on the subject.")
    print(f"wrote {a.out}")

main()
