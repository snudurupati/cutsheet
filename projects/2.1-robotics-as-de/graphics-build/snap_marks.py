#!/usr/bin/env python3
"""Snap every screen mark (box / underline) to the words actually on screen.

A mark's horizontal extent comes from OCR as a character-count estimate: OCR gives one box per
line, and a sub-phrase's position inside it is proportional to character index. That drifts
whenever OCR drops or adds a space, so boxes cut through the last letters of a word ("crm",
"marts" on 05-agent-swarm, human 2026-09-30). This looks at the real screen frame at the time the
mark is shown and moves each edge to the true end of the word it falls in.

Inputs are gated on the demo scene: the screen frame for cut time T is round(T*30) - enters.frame,
and the screen file's frame count must equal the demo scene's length.
"""
import argparse, json, os, subprocess, sys
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("--requests", required=True)
ap.add_argument("--screen", required=True)
ap.add_argument("--scene", required=True, help="demo-scene.json")
ap.add_argument("--out", required=True)
ap.add_argument("--cache", default="/tmp/snap-marks-frames")
a = ap.parse_args()

scene = json.load(open(a.scene))
f0, f1 = scene["enters"]["frame"], scene["leaves"]["frame"]
n = int(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries",
                        "stream=nb_read_packets", "-of", "csv=p=0", a.screen], capture_output=True, text=True).stdout.strip())
if n != f1 - f0:
    sys.exit(f"screen has {n} frames, demo scene spans {f1 - f0}: wrong screen file")
os.makedirs(a.cache, exist_ok=True)
reqs = json.load(open(a.requests))
out, log = {}, []

def frame(i):
    p = os.path.join(a.cache, f"s{i:06d}.png")
    if not os.path.exists(p):
        # frame-exact seek: (i - 0.25) / 30 lands inside frame i's display interval
        subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-ss", f"{(i - 0.25) / 30:.4f}", "-i", a.screen,
                        "-frames:v", "1", p], check=True)
    return Image.open(p).convert("L")

for key, r in sorted(reqs.items()):
    i = round(r["t"] * 30) - f0
    if not (0 <= i < n):
        log.append(f"{key}: t={r['t']} outside the demo scene, not snapped"); continue
    im = frame(i)
    x0, y0, x1, y1 = r["box"]
    H = y1 - y0
    # rows: the middle 70% of the line, so neighbouring lines' ascenders/descenders do not count
    ya, yb = int(y0 + 0.15 * H), int(y1 - 0.15 * H)
    xa, xb = max(0, int(x0 - 600)), min(im.width, int(x1 + 600))
    crop = im.crop((xa, ya, xb, yb))
    px = crop.load(); W, Hc = crop.size
    vals = sorted(crop.getdata()); bg = vals[len(vals) // 2]
    ink = [any(abs(px[x, y] - bg) > 45 for y in range(Hc)) for x in range(W)]
    cw = max(8.0, H * 0.5)                         # a character's width, roughly, at this line height
    gap = int(cw * 0.7)                            # a space between words is wider than this
    words, x, cur = [], 0, None
    while x < W:
        if ink[x]:
            if cur is None: cur = [x, x]
            else: cur[1] = x
            x += 1; continue
        if cur is not None:
            j = x
            while j < W and not ink[j] and j - cur[1] <= gap: j += 1
            if j < W and ink[j] and j - cur[1] <= gap: x = j; continue
            words.append(cur); cur = None
        x += 1
    if cur is not None: words.append(cur)
    words = [(w0 + xa, w1 + xa) for w0, w1 in words]
    def left_edge(v):
        for w0, w1 in words:
            if w0 - 1 <= v <= w1 + 1: return w0
        nxt = [w for w in words if w[0] > v]
        return nxt[0][0] if nxt else v
    def right_edge(v):
        for w0, w1 in words:
            if w0 - 1 <= v <= w1 + 1: return w1 + 1
        prv = [w for w in words if w[1] < v]
        return prv[-1][1] + 1 if prv else v
    nx0, nx1 = left_edge(x0), right_edge(x1)
    # A phrase ending in a letter stops at that letter, not at the word's trailing "." or ",":
    # a narrow blob of dots is punctuation.
    phrase = (key.split("|")[2] or key.split("|")[1]).rstrip("$\\s*+?)")
    if phrase[-1:].isalnum():
        full = im.crop((0, int(y0), im.width, int(y1))); fp = full.load(); Hf = full.size[1]
        rows = lambda x: [y for y in range(Hf) if abs(fp[x, y] - bg) > 45]
        e = int(nx1) - 1
        b = e
        while b > 0 and rows(b - 1): b -= 1
        blob = [y for x in range(b, e + 1) for y in rows(x)]
        # dots only ("." "," ":" ";"): no vertical stroke taller than 40% of the line (a comma's tail is ~35%)
        runs_y = [len(list(g)) for kk, g in __import__("itertools").groupby(range(Hf), lambda y: any(abs(fp[x, y] - bg) > 45 for x in range(b, e + 1))) if kk]
        if blob and e - b + 1 < 0.45 * cw and max(runs_y) < 0.4 * Hf:
            k = b - 1
            while k > 0 and not rows(k): k -= 1
            log.append(f"{key.split('|')[0]}: trimmed trailing punctuation ({nx1} -> {k + 1})")
            nx1 = k + 1
    ok0, ok1 = abs(nx0 - x0) <= 3 * cw, abs(nx1 - x1) <= 3 * cw
    # An edge inside a run with no space ("headers.source_order_date") snaps to the run's end, far
    # from the estimate. OCR drift is a translation, so that edge moves by the good edge's delta.
    def glyph_edge(v, start):
        # the nearest glyph start (or end) within half a character of a shifted edge
        # skipping punctuation-width blobs, so "headers.source" snaps to the "s", not the "."
        runs, x = [], 0
        while x < W:
            if ink[x]:
                b = x
                while x < W and ink[x]: x += 1
                runs.append((b, x))
            else: x += 1
        c = [(b if start else e) + xa for b, e in runs if e - b >= 0.45 * cw]
        c = [x for x in c if abs(x - v) <= 0.5 * cw]
        return min(c, key=lambda x: abs(x - v)) if c else v
    if ok1 and not ok0: nx0 = glyph_edge(x0 + (nx1 - x1), True)
    elif ok0 and not ok1: nx1 = glyph_edge(x1 + (nx0 - x0), False)
    if nx1 <= nx0 or not (ok0 or ok1):
        log.append(f"{key}: snap looked wrong ({x0:.0f}-{x1:.0f} -> {nx0}-{nx1}), kept the estimate")
        nx0, nx1 = x0, x1
    elif not (ok0 and ok1):
        log.append(f"{key}: one edge in a run with no space; shifted it by the other edge's snap")
    out[key] = {"box": [nx0, y0, nx1, y1], "from": [x0, x1], "frame": i}
    if abs(nx0 - x0) > 1 or abs(nx1 - x1) > 1:
        log.append(f"{key.split('|')[0]}: {x0:.0f}-{x1:.0f} -> {nx0}-{nx1}")

json.dump(out, open(a.out, "w"), indent=1)
print(f"snapped {len(out)} marks"); print("\n".join(log))
