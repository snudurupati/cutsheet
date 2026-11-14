#!/usr/bin/env python3
"""Snap every punch-in mark to the INK of its line, measured on the real screen frame.

OCR boxes do not sit on the glyphs: on this recording Vision's runs are 33-65px tall on a 47px
terminal pitch, offset by varying amounts, so marks derived from them landed through the text or on
the next line (composition and technical reviews 2026-10-17, three rounds). style.md says marks snap
to the pixels; this does it. For each target: take its OCR box at the given cut time, pull that
frame from outputs/base-screen.mp4 (which starts at the demo's first cut frame), and inside a band
around the box find the rows and columns that hold dark ink (the terminal records light cream with
dark text). The ink box is the contiguous run of inked rows that overlaps the OCR box's middle.

    python3 snap_ink.py --out ink.json
Writes {key: [x0, y0, x1, y1]} in 3840x2160 source px. build.mjs reads ink.json and FAILS if a
mark's key is missing, so a mark can never fall back to the OCR guess silently.
"""
import argparse, json, re, subprocess
from PIL import Image

FPS = 30
# key: (cut seconds, regex, x range of the run, optional char-trim to a leading identifier)
TARGETS = {
    "gZ5/robot_type":     (649.4, r"robot_type", (700, 2000), "nopunct"),
    "gZ5/total_episodes": (665.4, r"total_episodes", (700, 2000), "nopunct"),
    "gZ5/total_frames":   (665.4, r"total_frames", (700, 2000), "nopunct"),
    "gZ5/fps":            (665.4, r'"\W?fps', (700, 2000), "nopunct"),
    "gZ5/data_path":      (686.4, r"data_path", (700, 3000), True),
    "gZ5/video_path":     (686.4, r"video_path", (700, 3000), True),
    "gZ6/observation.state": (776.4, r"^observation\.state", (700, 1700), True),
    "gZ6/action":         (776.4, r"^action$", (700, 1700), True),
    "gZ6/episode_index":  (776.4, r"^episode_index", (700, 1700), True),
    "gZ6/frame_index":    (776.4, r"^frame_index", (700, 1700), True),
    "gZ6/timestamp":      (776.4, r"^timestamp", (700, 1700), True),
    "gZ6/task_index":     (776.4, r"^task_index", (700, 1700), True),
    "gZ7/first_ts":       (800.4, r"^(first_ts|Tirst_ts)$", (1100, 1400), False),
    "gZ7/zeros":          (800.4, r"^(I )?(0\.O|0\.0|O\.O)$", (1180, 1400), False),
    "gZ8/video_position": (840.0, r"^video_position$", (1700, 2200), False),
    "gZ8/values":         (840.0, r"^16\.\d", (1700, 2200), False, 1700),
}


def frame(screen, t, demo_in, path):
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-ss", f"{t - demo_in:.3f}", "-i", screen,
                    "-frames:v", "1", path], check=True)
    return Image.open(path).convert("L")


def ink_box(im, box, thr=120, nopunct=False):
    x0, y0, x1, y1 = box
    mid = (y0 + y1) / 2
    band = im.crop((x0 - 6, int(y0 - 40), x1 + 6, int(y1 + 40)))
    W, H = band.size; px = band.load()
    rows = [sum(1 for x in range(W) if px[x, y] < thr) for y in range(H)]
    inked = [r > 1 for r in rows]
    # the contiguous inked run containing (or nearest) the OCR box's middle row
    m = int(mid - (y0 - 40))
    cand = [y for y in range(H) if inked[y]]
    if not cand:
        raise SystemExit(f"no ink near {box}")
    c = min(cand, key=lambda y: abs(y - m))
    a = c
    while a > 0 and (inked[a - 1] or (a > 1 and inked[a - 2])):   # bridge 1px gaps (dots, i)
        a -= 1
    b = c
    while b < H - 1 and (inked[b + 1] or (b < H - 2 and inked[b + 2])):
        b += 1
    cols = [x for x in range(W) if any(px[x, y] < thr for y in range(a, b + 1))]
    if nopunct and len(cols) > 2:
        # a trailing comma is a narrow blob after a gap: drop it (round 4: underlines ran under commas)
        runs = [[cols[0], cols[0]]]
        for x in cols[1:]:
            if x - runs[-1][1] <= 3: runs[-1][1] = x
            else: runs.append([x, x])
        if len(runs) > 1 and runs[-1][1] - runs[-1][0] <= 12 and runs[-1][0] - runs[-2][1] >= 4:
            cols = [x for x in cols if x <= runs[-2][1]]
    return [x0 - 6 + cols[0], int(y0 - 40) + a, x0 - 6 + cols[-1] + 1, int(y0 - 40) + b + 1]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ocr", default="screen-ocr.json")
    ap.add_argument("--plan", default="cutsheet.json")
    ap.add_argument("--screen", default="../outputs/base-screen.mp4")
    ap.add_argument("--out", default="ink.json")
    ap.add_argument("--work", default="/tmp")
    ap.add_argument("--edit-cutsheet", default="../transcript/cutsheet.json")
    ap.add_argument("--planned-on", default="", help="the cutsheet TARGETS' times were written on (cutsheet-v1.json)")
    a = ap.parse_args()
    plan = json.load(open(a.plan))
    ocr = json.load(open(a.ocr)); demo_in = plan["_demoScene"]["in"]
    parts = {p["id"]: p for p in plan["parts"]}
    # TARGETS' times were measured on the 17:03.4 cut: carried through the SOURCE onto this cut
    def segmap(doc):
        acc_, out_ = 0, []
        for g in doc["segments"]:
            if not g.get("keep", True): continue
            out_.append((acc_ / FPS, (acc_ + g["outFrames"]) / FPS, g["session"], g["startFrame"] / FPS, g["endFrame"] / FPS, g["kind"]))
            acc_ += g["outFrames"]
        return out_
    NEW = segmap(json.load(open(a.edit_cutsheet)))
    if abs(NEW[-1][1] - plan["totalSeconds"]) > 0.05:
        raise SystemExit("plan and edit cutsheet disagree: stale plan")
    OLD = segmap(json.load(open(a.planned_on))) if a.planned_on else None
    def carry(t):
        if OLD is None:
            return t
        c0, c1, sid_, s0_, s1_, kind = min(OLD, key=lambda g: 0 if g[0] <= t < g[1] else min(abs(t - g[0]), abs(t - g[1])))
        src = s0_ + min(max(t - c0, 0), s1_ - s0_) if kind == "speech" else s0_
        best = min(NEW, key=lambda g: (g[2] != sid_, 0 if g[3] <= src < g[4] else min(abs(src - g[3]), abs(src - g[4]))))
        return best[0] + min(max(src - best[3], 0), best[1] - best[0]) if best[5] == "speech" else best[0]
    out, frames = {}, {}
    for key, spec in TARGETS.items():
        t, pat, (xa, xb), trim = spec[:4]; ymin = spec[4] if len(spec) > 4 else 0
        t = carry(t); pr = parts[key.split("/")[0]]
        # the sample nearest the cue that SEES the line, inside the part (the screen holds still inside
        # a stop; OCR drops a line now and then: robot_type was read once in eight samples)
        match = lambda f: [r for r in f["runs"] if re.search(pat, r[4]) and xa <= r[0] <= xb and r[1] >= ymin]
        cands = [f for f in ocr if pr["start"] - 0.5 <= f["t"] <= pr["end"] and match(f)]
        if not cands:
            raise SystemExit(f"{key}: /{pat}/ not in OCR anywhere in {pr['id']} ({pr['start']:.1f}-{pr['end']:.1f})")
        d = min(cands, key=lambda f: abs(f["t"] - t)); runs = match(d)
        if d["t"] not in frames:
            frames[d["t"]] = frame(a.screen, d["t"], demo_in, f"{a.work}/ink_{d['t']:.2f}.png")
        im = frames[d["t"]]
        boxes = []
        for x, y, w, h, txt in runs:
            if trim == "nopunct":                       # key + value, stopping before a trailing comma
                w = w * len(txt.rstrip(' ,;:')) / len(txt)
            elif trim:                                  # the identifier only, not its type/value
                ident = re.match(r'^\W*[A-Za-z_.]+', txt).group(0)
                w = w * len(ident) / len(txt)
            boxes.append(ink_box(im, [x, y, x + w, y + h], nopunct=(trim == "nopunct")))
        out[key] = [min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes)]
        print(f"  {key:24s} t={d['t']:.1f}  ocr y {min(r[1] for r in runs)}-{max(r[1] + r[3] for r in runs)}  ->  ink {out[key]}")
    json.dump(out, open(a.out, "w"), indent=1)
    print(f"wrote {a.out}")


main()
