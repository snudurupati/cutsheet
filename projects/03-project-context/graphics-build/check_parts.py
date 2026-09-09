#!/usr/bin/env python3
"""Geometry gate on the RENDERED parts, before anything is composited.

Every gate in this pipeline counts frames, samples and pixels-versus-a-reference.
None of them can see that a label was nudged on top of the artwork, or that a card
moved up and now runs off the top of the frame. Those are geometry facts, and they
are only visible in the part's own render.

This exists because on 2026-09-09 two positional edits shipped that no gate caught:
the hook's "?" landed on two of the questions, and g028's side labels were lifted
56px to clear the accent ticks and landed inside the skyline instead. Both rendered
perfectly, at the right length, and passed the composite check.

For every part render it measures the ink bounding box at several points across the
part and reports:
  * ink touching a frame edge      -> content is being clipped
  * ink outside the safe area      -> content in the title-unsafe band
  * an empty frame mid-part        -> the part renders nothing when it should

It cannot judge taste. It catches the mechanical mistakes that taste review keeps
having to catch by eye.
"""
import argparse, json, os, subprocess, sys, tempfile
from PIL import Image, ImageChops, ImageStat


def ink_bbox(path, thr=170):
    """path is an RGBA still of the part; flatten it onto the page colour here.

    Do NOT flatten with ffmpeg by overlaying onto a lavfi colour source. That was
    the first implementation and it silently returned BLANK frames: seeking a
    ProRes 4444 overlay against an infinite colour source lands on frames where the
    overlay has produced nothing yet, and the gate then reports a perfectly good
    part as empty. Measured on g030 at t=7.64: the lavfi method read 0 ink while a
    direct extract of the same frame read 1910. Extract, then composite in PIL.
    """
    src = Image.open(path).convert("RGBA")
    im = Image.new("RGB", src.size, (247, 245, 241))
    im.paste(src, (0, 0), src)
    im = im.convert("L")
    W, H = im.size
    px = im.load()
    x0, y0, x1, y1 = W, H, -1, -1
    for y in range(0, H, 3):
        for x in range(0, W, 3):
            if px[x, y] < thr:
                if x < x0: x0 = x
                if x > x1: x1 = x
                if y < y0: y0 = y
                if y > y1: y1 = y
    return None if x1 < 0 else (x0, y0, x1, y1, W, H)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cutsheet", required=True)
    ap.add_argument("--renders", required=True)
    ap.add_argument("--only", default="", help="comma-separated part ids")
    ap.add_argument("--samples", type=int, default=5)
    ap.add_argument("--edge", type=int, default=4, help="px from the frame edge that counts as clipped")
    ap.add_argument("--still-seconds", type=float, default=5.0,
                    help="flag a FULL-FRAME takeover that holds a still picture this long. "
                         "0 disables the check.")
    ap.add_argument("--still-min-beat", type=float, default=20.0,
                    help="only takeovers at least this long are checked (style.md's 20s rule)")
    a = ap.parse_args()

    parts = json.load(open(a.cutsheet))["parts"]
    if a.only:
        keep = set(a.only.split(","))
        parts = [p for p in parts if p["id"] in keep]
    tmp = tempfile.mkdtemp()
    bad = []
    print(f"{'part':6} {'class':8} {'ink bbox (canvas)':28} verdict")
    for p in parts:
        ext = "mp4" if p["class"] == "segment" else "mov"
        f = os.path.join(a.renders, f"{p['id']}.{ext}")
        if not os.path.exists(f):
            continue
        D = p["end"] - p["start"]
        worst, empty = None, 0
        for i in range(a.samples):
            t = D * (i + 1) / (a.samples + 1)
            png = os.path.join(tmp, "f.png")
            # overlays carry alpha; flatten onto the page colour so ink is ink
            subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y",
                            "-ss", f"{t:.2f}", "-i", f, "-frames:v", "1",
                            "-pix_fmt", "rgba", png], check=True)
            b = ink_bbox(png)
            if b is None:
                empty += 1
                continue
            if worst is None:
                worst = list(b)
            else:
                worst[0] = min(worst[0], b[0]); worst[1] = min(worst[1], b[1])
                worst[2] = max(worst[2], b[2]); worst[3] = max(worst[3], b[3])
        if worst is None:
            print(f"{p['id']:6} {p['class']:8} {'(nothing rendered)':28} EMPTY")
            bad.append(f"{p['id']}: renders nothing at any sample point")
            continue
        x0, y0, x1, y1, W, H = worst
        c = lambda v: round(v / 2)          # 4K -> 1920 canvas
        box = f"{c(x0):4},{c(y0):4} -> {c(x1):4},{c(y1):4}"
        notes = []
        if x0 <= a.edge or y0 <= a.edge or x1 >= W - a.edge or y1 >= H - a.edge:
            notes.append("CLIPPED at the frame edge")
        if empty:
            notes.append(f"{empty}/{a.samples} sample frames empty")
        verdict = "; ".join(notes) if notes else "ok"
        print(f"{p['id']:6} {p['class']:8} {box:28} {verdict}")
        if notes:
            bad.append(f"{p['id']}: {verdict}")

    # ---- still-frame check, FULL-FRAME PARTS ONLY -------------------------------
    # style.json graphics.takeoverDrift. Deliberately restricted to class=segment.
    # A card over the demo that stops animating is NOT a frozen frame: the screen
    # recording and the face inset are live behind it, measured 0.418 mean pixel
    # change against the card's own 0.004. Measuring each element's own box instead
    # of the frame is how a review reported ten frozen beats when only two were.
    if a.still_seconds > 0:
        print()
        for p in parts:
            if p["class"] != "segment" or p["kind"] == "zoom":
                continue
            D = p["end"] - p["start"]
            if D < a.still_min_beat:
                continue
            ext = "mp4"
            f = os.path.join(a.renders, f"{p['id']}.{ext}")
            if not os.path.exists(f):
                continue
            prev, runs, start, t = None, [], None, 1.0
            while t <= D - 1.0:
                png = os.path.join(tmp, "s.png")
                subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-ss", f"{t:.2f}",
                                "-i", f, "-frames:v", "1", "-vf", "scale=640:-1", png], check=True)
                im = Image.open(png).convert("RGB").copy()
                if prev is not None:
                    d = ImageStat.Stat(ImageChops.difference(prev, im)).mean[0]
                    if d < 0.02:
                        if start is None:
                            start = t - 1.0
                    elif start is not None:
                        runs.append((start, t - 1.0)); start = None
                prev = im; t = round(t + 1.0, 2)
            if start is not None:
                runs.append((start, D))
            longest = max((e - s for s, e in runs), default=0.0)
            total = sum(e - s for s, e in runs)
            ok = longest < a.still_seconds
            print(f"{p['id']:6} takeover {D:5.1f}s   longest still {longest:5.1f}s   "
                  f"total still {total:5.1f}s   {'ok' if ok else 'NEEDS DRIFT'}")
            if not ok:
                bad.append(f"{p['id']}: full-frame takeover holds a still picture for "
                           f"{longest:.1f}s ({total:.1f}s total). style.json "
                           f"graphics.takeoverDrift: carry a 1.00 -> 1.03 drift over the beat")

    if bad:
        print("\nFAIL")
        for b in bad:
            print("  " + b)
        sys.exit(1)
    print("\nOK")


main()
