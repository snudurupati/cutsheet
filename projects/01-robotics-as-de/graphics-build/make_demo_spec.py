#!/usr/bin/env python3
"""Write demo-spec.json and demo-scene.json for 01-robotics-as-de.

Adapted from 05-agent-swarm. Everything here is MEASURED:
  * span       the demo's first and last frame on the cut (transcript/cutsheet.json)
  * punch-ins  each stop's box is the union of the OCR runs matching its pattern at every
               OCR sample inside the stop (screen-ocr.json). If the text moves more than
               MOVE_TOL px during a stop the build FAILS (a framing from one moment zooms on
               empty page at another). Rerun's labels are too small for OCR (10-14px), so its
               panel boxes are measured on a frame instead and say so (BOX_FROM_FRAME).
  * zoom       fits the box with margins, clamped to [ZMIN, ZMAX]
  * inset      crop chosen by a frame-verifier on a contact sheet of six crops x six points
               across the demo (2026-10-16); corner from the text under each corner
  * hidden     the inset steps aside for every punch-in (style.json demoInset.mayHide);
               windows under 20s apart merge

Punch-in times are part times from graphics-build/cutsheet.json, never retyped.
"""
import argparse, json, re, sys

FPS = 30
MOVE_TOL = 30
ZMIN, ZMAX = 1.4, 2.6
MARGIN = (0.88, 0.80)

# Rerun panel boxes, source px, measured on the screen frame at cut 545.2 (s055): six
# panels in a 3x2 grid over x 272-3420, the selection sidebar to the right. Re-checked
# on the preview reel, never trusted blind.
BOX_FROM_FRAME = {
    "rerun-image":  [1344, 928, 2280, 1812],
    "rerun-state":  [272, 48, 1320, 928],
    "rerun-action": [1332, 48, 2380, 928],
    "rerun-both":   [272, 48, 2380, 928],
}

# (stop id, part, start or None, end or None, pattern or BOX_FROM_FRAME key, x clip, target)
STOPS = [
    ("gZ1",  "gZ1",  None,  None,  r"(physical-ai-data-architect /|snudurupati / physical)", [0, 1300],
     "the repo name and the breadcrumb physical-ai-data-architect / weeks / week-01"),
    ("gZ2",  "gZ2",  None,  None,  r"(Cloned repo|Using --frozen|Ran 2 commands|The environment is set up|Clone: the repo|week 1 folder|Environment: I ran|the lockfile\. That|No changes to the repo)", [1400, 3000],
     "Claude Code's reply: cloned to ~/Projects/paida-wk01, lerobot 0.4.4 imports"),
    ("gZ3",  "gZ3",  None,  None,  "rerun-image", None,
     "Rerun's observation.image panel: the blue dot pushing the T"),
    ("gZ4a", "gZ4",  None,  471.3, "rerun-state", None, "the state panel (x, y of the pusher)"),
    ("gZ4b", "gZ4",  471.3, 492.9, "rerun-action", None, "the action panel"),
    ("gZ4c", "gZ4",  492.9, None,  "rerun-both", None, "state and action side by side: almost identical, slightly apart"),
    ("gZ5a", "gZ5",  None,  683.0, r'(robot_type|total_episodes|total_frames|total_tasks|chunks_size|"\W?fps|codebase_ver)', [700, 2000],
     "info.json: robot_type unknown, 206 episodes, 25650 frames, fps 10"),
    ("gZ5c", "gZ5",  683.0, None,  r"(data_path|video_path)", [700, 2800],
     "info.json after it scrolls: data_path and video_path"),
    ("gZ5b", "gZ5b", None,  None,  r'(data_path|video_path|"features"|observation\.image": )', [700, 2800],
     "the top of the features block"),
    ("gZ6",  "gZ6",  760.0, 787.9, r"(DESCRIBE SELECT|observation\.state|^action$|episode_index|frame_index|^timestamp|next\.|task_index|^index$)", [700, 1600],
     "DESCRIBE: the ten columns, no observation.image among them"),
    ("gZ7",  "gZ7",  792.4, None,  r"(^first_ts|Tirst_ts|^last_ts$|^frames$|^episode_index$|^0\.O$|^0\.0$|^16\.0$|^11\.7$|^14\.0$|^15\.8$|^161$|^118$|^141$|^159$)", [800, 1900],
     "the frames query result: first_ts 0.0 for every episode"),
    ("gZ8",  "gZ8",  833.0, None,  r"(video_position|^16\.\d{4,}|^16\.1$|^0\.[0-4]$|JOIN|WHERE|FROM|d\.frame_index|d\.timestamp|parquet)", [940, 2200],
     "the join result: video_position = 16.1, 16.2, 16.3 ... for episode 1"),
]
# A row-filter: gZ7/gZ8 results sit below their queries; keep runs under this y only
Y_MIN = {"gZ6": 1300, "gZ7": 1600, "gZ8": 1240}

REPOSITION = []        # bottom-right is clear in every app here (see _repositionWhy)
INSET_CROP = {"w": 2000, "h": 2000, "x": 1330, "y": 60}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--edit-cutsheet", required=True)
    ap.add_argument("--plan", required=True)
    ap.add_argument("--ocr", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--scene-out", required=True)
    ap.add_argument("--screen", default="../outputs/base-screen.mp4", help="for measuring scrolls at split points")
    ap.add_argument("--planned-on", default="", help="the cutsheet STOPS' literal times were written on "
                    "(transcript/cutsheet-v1.json); they are carried through the source onto this cut")
    a = ap.parse_args()

    cs = json.load(open(a.edit_cutsheet)); plan = json.load(open(a.plan)); ocr = json.load(open(a.ocr))
    parts = {p["id"]: p for p in plan["parts"]}
    acc, demo = 0, []
    for s in cs["segments"]:
        if s["section"] == "demo":
            demo.append((acc, acc + s["outFrames"]))
        acc += s["outFrames"]
    SF, EF = demo[0][0], demo[-1][1]; S, E = SF / FPS, EF / FPS
    if abs(S - plan["_demoScene"]["in"]) > 0.02 or abs(E - plan["_demoScene"]["out"]) > 0.02:
        sys.exit("plan's _demoScene disagrees with the edit cutsheet; regenerate the plan")

    # STOPS' split times were measured on the 17:03.4 cut; carry each through the SOURCE (as make_plan does)
    def segmap(doc):
        acc_, out = 0, []
        for g in doc["segments"]:
            if not g.get("keep", True): continue
            out.append((acc_ / FPS, (acc_ + g["outFrames"]) / FPS, g["session"], g["startFrame"] / FPS, g["endFrame"] / FPS, g["kind"]))
            acc_ += g["outFrames"]
        return out
    NEW = segmap(cs); OLD = segmap(json.load(open(a.planned_on))) if a.planned_on else None
    if OLD is not None and abs(OLD[-1][1] - 1023.367) > 0.05:
        sys.exit("--planned-on is not the 17:03.4 cut STOPS were measured on")
    def carry(t):
        if t is None or OLD is None:
            return t
        c0, c1, sid_, s0_, s1_, kind = min(OLD, key=lambda g: 0 if g[0] <= t < g[1] else min(abs(t - g[0]), abs(t - g[1])))
        src = s0_ + min(max(t - c0, 0), s1_ - s0_) if kind == "speech" else s0_
        best = min(NEW, key=lambda g: (g[2] != sid_, 0 if g[3] <= src < g[4] else min(abs(src - g[3]), abs(src - g[4]))))
        return round(best[0] + min(max(src - best[3], 0), best[1] - best[0]) if best[5] == "speech" else best[0], 2)

    # A split between two stops of one part marks a SCROLL. A carried split can land a second off (a
    # retake came out right before gZ5's scroll on 2026-10-17), and marks leave at their stop's end, so
    # the split is snapped to the scroll measured on the screen track: the earlier stop ends on the
    # first moving frame, the later one reads its OCR only once the motion has settled.
    import subprocess
    def motion(t_lo, t_hi):
        raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t_lo - S:.3f}", "-t", f"{t_hi - t_lo:.3f}", "-i", a.screen,
                              "-vf", "scale=192:108,format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout
        n = 192 * 108; fr = [raw[i:i + n] for i in range(0, len(raw) - n + 1, n)]
        mv = [t_lo + i / FPS for i in range(1, len(fr)) if sum(abs(x - y) for x, y in zip(fr[i], fr[i - 1])) / n > 0.5]
        return (mv[0] - 1 / FPS, mv[-1]) if mv else None
    splits, err = {}, []
    for x, y in zip(STOPS, STOPS[1:]):
        # terminal stops only: a Rerun panel (BOX_FROM_FRAME) is always moving, so its splits are spoken cues
        if x[1] == y[1] and x[3] is not None and x[3] == y[2] and x[4] not in BOX_FROM_FRAME and y[4] not in BOX_FROM_FRAME:
            c = carry(x[3]); m = motion(c - 1.5, c + 1.5)
            if not m:
                err.append(f"{x[0]}/{y[0]}: no scroll within 1.5s of the split {c:.2f}"); continue
            splits[x[3]] = m

    items = []
    for sid, pid, s0, e0, pat, xclip, note in STOPS:
        ocr_from = None
        if s0 in splits: s0, ocr_from = round(splits[s0][0], 3), splits[s0][1] + 0.05
        elif s0 is not None: s0 = carry(s0)
        if e0 in splits: e0 = round(splits[e0][0], 3)
        elif e0 is not None: e0 = carry(e0)
        p = parts[pid]
        st = p["start"] if s0 is None else s0
        en = p["end"] if e0 is None else e0
        if pat in BOX_FROM_FRAME:
            x0, y0, x1, y1 = BOX_FROM_FRAME[pat]; n = 0; src = f"frame-measured ({pat})"
        else:
            rx = re.compile(pat); boxes, ys, hits_per = [], [], []
            for d in ocr:
                if not ((ocr_from or st) <= d["t"] <= en):
                    continue
                hit = [r for r in d["runs"] if rx.search(r[4]) and r[1] >= Y_MIN.get(sid, 0)]
                if xclip:
                    hit = [r for r in hit if r[0] < xclip[1] and r[0] + r[2] > xclip[0]]
                if not hit:
                    continue
                bx = (min(r[0] for r in hit), min(r[1] for r in hit),
                      max(r[0] + r[2] for r in hit), max(r[1] + r[3] for r in hit))
                if xclip:
                    bx = (max(bx[0], xclip[0]), bx[1], min(bx[2], xclip[1]), bx[3])
                boxes.append((d["t"],) + bx); ys.append(bx[1]); hits_per.append({r[4][-12:] for r in hit})
            if not boxes:
                err.append(f"{sid}: /{pat}/ never on screen between {st} and {en}"); continue
            # movement is judged on samples that see the SAME lines: an OCR dropout of one line (gZ5b
            # lost data_path at one sample) moves the box top without the screen moving at all
            full = max(len(hk) for hk in hits_per)
            ys = [y for y, hk in zip(ys, hits_per) if len(hk) == full]
            if max(ys) - min(ys) > MOVE_TOL:
                err.append(f"{sid}: target moves {max(ys)-min(ys)}px inside the stop "
                           f"({[(round(b[0],1), b[2]) for b in boxes]}); split it")
            x0 = min(b[1] for b in boxes); y0 = min(b[2] for b in boxes)
            x1 = max(b[3] for b in boxes); y1 = max(b[4] for b in boxes)
            n = len(boxes); src = "ocr"
        pad = 24
        x0, y0, x1, y1 = max(0, x0 - pad), max(0, y0 - pad), min(3840, x1 + pad), min(2160, y1 + pad)
        w, h = x1 - x0, y1 - y0
        z = max(ZMIN, min(ZMAX, 3840 * MARGIN[0] / w, 2160 * MARGIN[1] / h))
        items.append({"id": sid, "part": pid, "start": round(st, 3), "end": round(en, 3),
                      "cx": round((x0 + x1) / 2), "cy": round((y0 + y1) / 2), "zoom": round(z, 2),
                      "box": [x0, y0, x1, y1], "framing": "full", "target": note,
                      "_boxFrom": src, "_ocrSamples": n})
    if err:
        sys.exit("demo spec FAILED:\n  " + "\n  ".join(err))

    # NO drift on punch-ins (human 2026-10-17: "gZ1 is shaky when zoomed, gZ2 starts shaking"): zoompan
    # rounds its crop to whole pixels every frame, so a slow 1.00 -> 1.03 push reads as a shake. The
    # still-frame rule is for full-frame takeovers of 20s+; these holds are shorter, or sit on Rerun,
    # which is always moving.
    for i in items:                       # gZ7's mark speaks to the last second: zoom out quickly
        if i["id"] == "gZ7":
            i["rampOut"] = 12
        if i["id"] == "gZ5c":                 # data_path / video_path are said in its last 3s
            i["rampOut"] = 9
        if i["id"] == "gZ5a":                 # "robot type unknown" is said 0.5s into the part
            i["rampIn"] = 12
    PAN = 18
    for x, y in zip(items, items[1:]):
        if x["part"] == y["part"] and abs(x["end"] - y["start"]) < 0.05:
            x["rampOut"] = PAN; y["rampIn"] = PAN
            x["end"] = round(y["start"] + PAN / FPS, 3)

    # Every punch-in hides the inset (technical review 2026-10-17): at these zooms the bottom-right
    # always lands on something, e.g. gZ1's commit line and gZ4a's action legend.
    def reaches_inset(i):
        return True
    def _reaches_inset_geometric(i):
        Z = i["zoom"]; w, h = 3840 / Z, 2160 / Z
        sx = min(max(i["cx"] - w / 2, 0), 3840 - w); sy = min(max(i["cy"] - h / 2, 0), 2160 - h)
        x0, y0, x1, y1 = [(v - o) * Z for v, o in zip(i["box"], (sx, sy, sx, sy))]
        return x0 < 3696 and x1 > 2736 and y1 > 1056 and y0 < 2016
    win = sorted((i["start"] - 0.2, i["end"] + 0.2) for i in items if reaches_inset(i))
    merged = []
    for lo, hi in win:
        if merged and lo - merged[-1][1] < 20.0:
            merged[-1][1] = max(merged[-1][1], hi)
        else:
            merged.append([lo, hi])
    hidden = [{"start": round(lo, 3), "end": round(hi, 3),
               "why": "a punch-in's zoomed target reaches the inset corner (style.json demoInset.mayHide)"}
              for lo, hi in merged]

    spec = {
        "span": {"start": round(S, 3), "end": round(E, 3), "_why": "derived from transcript/cutsheet.json"},
        "base": "outputs/base-cut.mov", "screen": "outputs/base-screen.mp4",
        "_screenWhy": "demo segments only, cut per segment from session B's screen clip; the Claude app "
                      "sidebar, account line and left strip blurred in source space (leak.json)",
        "inset": {
            "sourceCrop": INSET_CROP,
            "_sourceCropWhy": "six crops at six points across the demo (30, 180, 330, 520, 700 lean, 950 "
                              "profile), frame-verifier 2026-10-16. 2000@1330,60 is the only crop with "
                              "headroom, chin clear of the mic, shoulders, and nothing cut on the lean or "
                              "the profile; 1400-1760 crops clip hair or chin (the 35mm framing makes the "
                              "head large in frame).",
            "_delivery": {"width": 960, "height": 960, "left": 2736, "top": 1056, "radius": 48,
                          "repositionSeconds": 0.6, "enterSeconds": 0.5, "exitSeconds": 0.35},
            "reposition": REPOSITION,
            "_repositionWhy": "from screen-ocr.json: terminal and DuckDB text never passes x 2200; the "
                              "Claude chat column ends at x 2900 and holds nothing below y 1060; Rerun's "
                              "bottom-right panel is next.done, a flat line. Bottom-right throughout.",
            "hiddenDuring": hidden,
        },
        "punchIns": {"items": items},
    }
    json.dump(spec, open(a.out, "w"), indent=1)
    scene = {"enters": {"cutSeconds": round(S, 3), "frame": SF},
             "leaves": {"cutSeconds": round(E, 3), "frame": EF},
             "_why": "derived from the cutsheet's demo section"}
    json.dump(scene, open(a.scene_out, "w"), indent=1)
    for i in items:
        print(f"  {i['id']:5s} {i['start']:7.1f}-{i['end']:7.1f}  zoom {i['zoom']:.2f}  c({i['cx']},{i['cy']})  {i['_boxFrom']} n={i['_ocrSamples']}")
    print(f"hidden: {hidden}")
    print(f"wrote {a.out}, {a.scene_out}")


main()
