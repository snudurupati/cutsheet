#!/usr/bin/env python3
"""Write demo-spec.json and demo-scene.json for 2.2-learning-chaos.

Adapted from 2.1-robotics-as-de. Everything here is MEASURED:
  * span       the demo's first and last frame on the cut (transcript/cutsheet-v9.json);
               gated against the plan's _demoScene before anything is written (rule 12)
  * punch-ins  each stop's box is the union of the OCR runs matching its pattern at every
               OCR sample inside the stop (screen-ocr.json). If the text moves more than
               MOVE_TOL px during a stop the build FAILS (a framing from one moment zooms on
               empty page at another). 2.2 has no Rerun panels, so every box is OCR-derived.
  * zoom       fits the box with margins, clamped to [ZMIN, ZMAX]
  * inset      crop from the face positions' 4K columns (x 230-3230 put the head inside
               this crop); corner from the text under each corner (see _repositionWhy)
  * hidden     the inset steps aside for every punch-in (style.json demoInset.mayHide);
               windows under 20s apart merge

Punch-in times are part times from graphics-build/cutsheet.json, never retyped. The two
literal times on gZ15c narrow its stop to before the cell scroll that starts at 786.6.
"""
import argparse, json, re, sys

FPS = 30
MOVE_TOL = 30
ZMIN, ZMAX = 1.4, 2.6
MARGIN = (0.88, 0.80)

# Per-stop movement tolerance, for stops whose target legitimately breathes a little
# (OCR line-box height wobbles by a few px as the page settles). gZ15c's SQL result
# rows measured a constant y0 (1796) with bottom edges 1829-1835, inside 30; the 45 is
# a guard so a re-run with noisier OCR does not hard-fail on a 6px line-box wobble.
MOVE_TOL_OVERRIDE = {"gZ15c": 45}

# (stop id, part, start or None, end or None, pattern, x clip, target)
# start/end None = take the part's own time from the plan.
STOPS = [
    ("gZ1",   "gZ1",   None,  None,  r'env = gym\.make', [700, 2600],
     "env = gym.make(gym_pusht/PushT-v0, obs_type=state): the import line he reads"),
    ("gZ2",   "gZ2",   None,  None,  r'env = gym\.make', [700, 2600],
     "same line: PushT-v0 and obs_type=state underlined"),
    ("gZ3",   "gZ3",   None,  None,  r'\[0\. 0\.', [700, 2000],
     "action space print [0. 0.] [512. 512.]"),
    ("gZ5",   "gZ5",   None,  None,  r'def run_policy\(make_action', [700, 2600],
     "def run_policy(make_action, n_episodes=100)"),
    ("gZ7",   "gZ7",   None,  None,  r'while not done and n < 300', [700, 2200],
     "the loop ceiling while not done and n < 300"),
    ("gZ15b", "gZ15b", None,  None,  r'ds\.add_frame', [700, 2200],
     "ds.add_frame call in the collection loop"),
    # narrowed window: the cell scrolls before 786.6, so the stop reads only the settled frames
    ("gZ15c", "gZ15c", 786.6, 790.45,
     r"features\.'observation\.state'\.names AS state_names", [700, 2600],
     "the SQL schema query lines (state_names AS); narrowed window: the cell scrolls before 786.6"),
]

# gZ1 and gZ2 read the same gym.make line 9s apart (132.9-135.5 / 144.4-148.1). They are
# NOT adjacent in time, so the PAN cross-ramp below (which only fires when x.end == y.start)
# deliberately does not apply; each ramps on its own.

REPOSITION = []        # bottom-right is the cleanest corner in the measured windows
INSET_CROP = {"w": 2000, "h": 2000, "x": 0, "y": 60}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--edit-cutsheet", required=True)
    ap.add_argument("--plan", required=True)
    ap.add_argument("--ocr", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--scene-out", required=True)
    ap.add_argument("--screen", default="raw/Screen-2026-11-11 10-56-42.mov",
                    help="majority demo screen clip; per-segment mapping lives in the edit cutsheet")
    a = ap.parse_args()

    cs = json.load(open(a.edit_cutsheet)); plan = json.load(open(a.plan)); ocr = json.load(open(a.ocr))
    parts = {p["id"]: p for p in plan["parts"]}
    acc, demo = 0, []
    for s in cs["segments"]:
        if s["section"] == "demo":
            demo.append((acc, acc + s["outFrames"]))
        acc += s["outFrames"]
    SF, EF = demo[0][0], demo[-1][1]; S, E = SF / FPS, EF / FPS
    if abs(S - plan["_demoScene"]["enters"]["cutSeconds"]) > 0.02 \
            or abs(E - plan["_demoScene"]["leaves"]["cutSeconds"]) > 0.02:
        sys.exit("plan's _demoScene disagrees with the edit cutsheet; regenerate the plan")

    items, err = [], []
    for sid, pid, s0, e0, pat, xclip, note in STOPS:
        p = parts[pid]
        st = p["start"] if s0 is None else s0
        en = p["end"] if e0 is None else e0
        rx = re.compile(pat); boxes, ys, hits_per = [], [], []
        for d in ocr:
            if not (st <= d["t"] <= en):
                continue
            hit = [r for r in d["runs"] if rx.search(r[4])]
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
        # movement is judged on samples that see the SAME lines: an OCR dropout of one line
        # moves the box top without the screen moving at all
        full = max(len(hk) for hk in hits_per)
        ys = [y for y, hk in zip(ys, hits_per) if len(hk) == full]
        tol = MOVE_TOL_OVERRIDE.get(sid, MOVE_TOL)
        if max(ys) - min(ys) > tol:
            err.append(f"{sid}: target moves {max(ys)-min(ys)}px inside the stop "
                       f"({[(round(b[0],1), b[2]) for b in boxes]}); split it")
        x0 = min(b[1] for b in boxes); y0 = min(b[2] for b in boxes)
        x1 = max(b[3] for b in boxes); y1 = max(b[4] for b in boxes)
        n = len(boxes)
        pad = 24
        x0, y0, x1, y1 = max(0, x0 - pad), max(0, y0 - pad), min(3840, x1 + pad), min(2160, y1 + pad)
        w, h = x1 - x0, y1 - y0
        z = max(ZMIN, min(ZMAX, 3840 * MARGIN[0] / w, 2160 * MARGIN[1] / h))
        item = {"id": sid, "part": pid, "start": round(st, 3), "end": round(en, 3),
                "cx": round((x0 + x1) / 2), "cy": round((y0 + y1) / 2), "zoom": round(z, 2),
                "box": [x0, y0, x1, y1], "framing": "full", "target": note,
                "_boxFrom": "ocr", "_ocrSamples": n}
        if sid in MOVE_TOL_OVERRIDE:
            item["_moveTol"] = MOVE_TOL_OVERRIDE[sid]
        items.append(item)
    if err:
        sys.exit("demo spec FAILED:\n  " + "\n  ".join(err))

    # NO drift on punch-ins (human, 2.1: slow 1.00 -> 1.03 pushes read as a shake; the 2.2
    # notebook is static while held, so a still frame is the right call). zoompan rounds its
    # crop to whole pixels every frame, so any slow push is a shake.
    for i in items:
        if i["id"] == "gZ7":                 # his line speaks into the last second: zoom out fast
            i["rampOut"] = 12
    PAN = 18
    for x, y in zip(items, items[1:]):
        if x["part"] == y["part"] and abs(x["end"] - y["start"]) < 0.05:
            x["rampOut"] = PAN; y["rampIn"] = PAN
            x["end"] = round(y["start"] + PAN / FPS, 3)

    # Every punch-in hides the inset (style.json demoInset.mayHide): at these zooms the
    # bottom-right always lands on something in the zoomed page.
    win = sorted((i["start"] - 0.2, i["end"] + 0.2) for i in items)
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
        "span": {"start": round(S, 3), "end": round(E, 3), "_why": "derived from the edit cutsheet's demo section"},
        "base": "../outputs/base-cut-v9.mov", "screen": a.screen,
        "_screenWhy": "the demo's 153 segments split across two screen recordings in the edit cutsheet: "
                      "s010-s106 carry screen 'raw/Screen-2026-11-11 10-56-42.mov' (97 segments, the "
                      "majority, and what this field records) and s107-s162 carry "
                      "'raw/Screen-2026-11-11 11-14-09.mov' (56 segments). demo_scene.py takes --screen on "
                      "its CLI; the per-segment mapping lives in transcript/cutsheet-v9.json, which the "
                      "screen splice reads, so this field is documentation of the render input, not the input.",
        "inset": {
            "sourceCrop": INSET_CROP,
            "_sourceCropWhy": "human review 2026-11-13 finding 4: the old crop (x 1330-3330) put "
                              "the left half of the face under the inset's left edge. The face head "
                              "spans 4K x ~230-1620 (measured, skin chroma over the demo span, "
                              "face_position.py); 2000x2000 at (0, 60) keeps the whole face with "
                              "headroom and shoulders square for the 960x960 delivery.",
            "_delivery": {"width": 960, "height": 960, "left": 2736, "top": 1056, "radius": 48,
                          "repositionSeconds": 0.6, "enterSeconds": 0.5, "exitSeconds": 0.35},
            "reposition": REPOSITION,
            "_repositionWhy": "bottom-right throughout, measured on screen-ocr.json over every "
                              "inset-visible window. CODE never enters the footprint (x 2736-3696, "
                              "y 1056-2016): code stops at x 3400 and the Python/kernel chips sit at "
                              "x 3583-3793 above y 250, over the notebook gutter and status bar, above "
                              "the inset's top. Long markdown prose lines (bulleted cells, 'Phase A:', "
                              "'Goal:') do graze the footprint's left edge by up to ~960px while they "
                              "scroll, but they are transient background reading, never the read-along "
                              "content the punch-ins target (all punch-in boxes sit at x < 2100), and "
                              "the inset is hidden during every punch-in anyway. No corner is "
                              "measurably cleaner: bottom-left is worse in every window (8-76 Mpx^2 "
                              "versus bottom-right's max 9.3), and top-right is worse during the "
                              "339-746 markdown scroll (18.2 versus 9.3 Mpx^2).",
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
        print(f"  {i['id']:6s} {i['start']:7.1f}-{i['end']:7.1f}  zoom {i['zoom']:.2f}  "
              f"c({i['cx']},{i['cy']})  box {i['box']}  ocr n={i['_ocrSamples']}"
              + (f"  _moveTol={i['_moveTol']}" if "_moveTol" in i else ""))
    print(f"hidden ({len(hidden)}): {hidden}")
    print(f"scene: enters {scene['enters']} leaves {scene['leaves']}")
    print(f"wrote {a.out}, {a.scene_out}")


main()
