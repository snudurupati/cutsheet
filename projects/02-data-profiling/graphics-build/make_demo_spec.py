#!/usr/bin/env python3.14
"""Write demo-spec.json and demo-scene.json for 02-data-profiling.

Everything here is MEASURED:
  * span       the demo's first and last frame on the cut (transcript/cutsheet.json)
  * scrolls    the speaker scrolls the notebook inside most punch-ins. A framing never spans a scroll
               (composition review 2026-10-28: gZ3's marks struck through "# uv run" and "C. Frame
               timing" for 20s after a scroll; gZ2's boxes floated over the wrong rows for 10s). Each
               stop's PLATEAU (fully zoomed) lies between scrolls measured on base-screen.mp4 (vertical
               shift of the whole notebook between consecutive frames). A split at a scroll chains the
               two framings by a pan that runs exactly over the scroll's moving frames, so the zoom
               moves with the page; marks leave before the first moving frame and the next stop's
               marks are placed on the text's new position. The build FAILS if any plateau contains a
               scroll (scroll_gate), so a re-cut that moves a scroll into a stop cannot pass silently.
  * boxes      each stop's box is the union of the OCR runs matching its pattern at every OCR sample
               inside its plateau (screen-ocr.json); text that moves more than MOVE_TOL px inside a
               plateau fails. Rerun's labels are too small for OCR, so its image panel is measured on a
               frame (BOX_FROM_FRAME) and the scroll gate skips it (the robot view is always moving).
  * zoom       fits the box with margins, clamped to [ZMIN, ZMAX], unless a stop names its zoom
  * placement  `at` puts the box centre at a point of the 1920x1080 output (zoompan's clamp applies,
               and lib.mapZoom mirrors it), so a target can sit clear of the face inset
  * inset      per stop, from the zoomed box: clear of the bottom-right inset -> it stays; clear of the
               top-right -> it moves top-right (style.json demoInset.mayReposition); else it hides.
               Hides (and moves) closer than 20s merge.

Times are CUT seconds on transcript/cutsheet.json, gated on its totalFrames (hard rule 12): they were
measured on that cut, and a re-cut must re-measure them (the scroll gate will fail first anyway).
"""
import argparse, json, re, subprocess, sys

FPS = 30
MOVE_TOL = 30
ZMIN, ZMAX = 1.4, 2.6
MARGIN = (0.88, 0.80)
MEASURED_ON_FRAMES = 58605            # transcript/cutsheet.json totalFrames these times were measured on. 58635 -> 58605 on 2026-10-28: a 30-frame trim of the closing tail only; the demo section and every segment before s306 are identical (diffed), so no stop moved
RAMP = 36                             # demo_scene.py's default punch-in ease (1.2s)

# Rerun's observation.image panel, measured on base-screen.mp4 at 850.0 and 890.0 (PushT episodes 184
# and 174): the image area, source px. Rerun's labels are 10-14px, too small for OCR.
BOX_FROM_FRAME = {"RERUN_IMAGE": [1424, 966, 2280, 1820],
                  # added 2026-10-28 (finished-cut review gaps), each measured on a frame of its plateau:
                  # the S-curve plot's white panel at 692.0, the percentile plot's panel plus its three
                  # printed percentile lines at 720.0, and ALOHA's observation.images.top view (grey image
                  # 656-1464 x 1140-1644, the arms reaching 488-1636) at 1544.0
                  "PLOT_SCURVE": [908, 791, 2142, 1725],
                  "PLOT_PCTL": [880, 730, 2142, 1816],
                  "RERUN_ALOHA": [480, 1130, 1650, 1660]}

# A stop: id, part, pat (OCR regex, or a BOX_FROM_FRAME key), xclip, ymin, note, and optionally
#   start / end      the zoom's first and last frame (cut s); default the part's edges
#   pIn / pOut       the plateau (cut s); default start + 1.2s / end - 1.2s
#   scrollAfter      (first moving frame, last moving frame) of the scroll that ends this stop; the
#                    next stop of the same part starts its pan there (chained, see module doc)
#   zoom, at         zoom factor and output point (1080 space) of the box centre
#   inset            force "hide" / "topRight" / "stay" (default: measured)
STOPS = [
    dict(id="gZ0", part="gZ0", pat=r"(^Check$|^Question$|Overview|What does the dataset|Outcomes|built-in quality signal)",
         xclip=[850, 1950], ymin=500, start=474.500, pOut=482.067, zoom=3.16, at=(946, 540),
         note="the notebook's nine-checks table, Check and Question columns complete, centred; at 3.16 the "
              "window's left edge is the editor's (x 785), so no file tree. The push starts at 474.50, after his "
              "scroll onto the table settles (474.00-474.13); the plateau ends on the next scroll at 482.10"),
    dict(id="gZ1", part="gZ1", pat=r"(total_episodes\|total_frames|^25650|^206\||motor_0|action_names|state_names|\[2\])",
         xclip=[880, 2700], ymin=1380, start=580.600, pIn=581.800, pOut=603.567, at=(960, 670),
         note="the overview row (206, 25650, 1, 10, motors, [2], action names) at 62% height, clear of the "
              "inset top-right; the push starts at 580.60, after the scroll at 580.13 settles; scroll at 603.60 ends it"),
    dict(id="gZ2a", part="gZ2", pat=r"(min_ep_length|avg_ep_length|total_episodes|^206|^25650|^49|^246|124\.51|^2061|^I 2061)",
         xclip=[880, 2100], ymin=1200, scrollAfter=(662.467, 662.633), zoom=2.1, at=(685, 540),
         note="both stats tables (metadata 206 / 25650 / 49 / 246 / 124.5, data 206 / 25650) left of the "
              "bottom-right inset; ends on the 162px scroll at 662.47"),
    dict(id="gZ2b", part="gZ2", pat=r"(min_ep_length|avg_ep_length|total_episodes|^206|^25650|^49|^246|124\.51|^2061|^I 2061)",
         xclip=[880, 2100], ymin=1050, pOut=671.533, zoom=2.1, at=(685, 540),
         note="the same two tables on their new position after the scroll; scroll at 671.57 ends it"),
    dict(id="gZ3a", part="gZ3", start=757.400, pIn=757.700, scrollAfter=(772.167, 773.467),
         pat=r"(^99 148 49|^25\.5 221\.5|lower = q1|upper = q3|\.filter\(|^q1 = |^iqr = )", xclip=[860, 1760], ymin=1000, zoom=2.2, at=(560, 540),
         note="the IQR output (99 148 49) down to the fences (25.5 221.5); a quick 0.3s push that starts once "
              "the scroll at 757.07-757.33 has settled (round 3: no push across a scroll); the scroll at 772.17 ends it"),
    dict(id="gZ3b", part="gZ3", scrollAfter=(783.300, 783.500),
         pat=r"(^25\.5 221\.5|episode_index\|length|^184\||^174 ?\||^229\||^246 ?\|)", xclip=[860, 1760], ymin=0, zoom=2.2, at=(560, 540),
         note="the IQR output, the fences and the outlier table after the re-run; scroll at 783.30 ends it"),
    dict(id="gZ3c", part="gZ3", scrollAfter=(786.200, 786.367),
         pat=r"(^25\.5 221\.5|episode_index\|length|^184\||^174 ?\||^229\||^246 ?\|)", xclip=[860, 1760], ymin=0, zoom=2.4, at=(560, 540),
         note="fences and outlier table ('we do have two episodes'); 41px scroll at 786.20 ends it"),
    dict(id="gZ3d", part="gZ3", pOut=791.833,
         pat=r"(^25\.5 221\.5|episode_index\|length|^184\||^174 ?\||^229\||^246 ?\|)", xclip=[860, 1760], ymin=0, zoom=2.4, at=(560, 540),
         note="fences and outlier table, episodes 184 and 174 named; scroll at 791.87 ends it"),
    dict(id="gZ8a", part="gZ8", pat="PLOT_SCURVE", xclip=None, ymin=0, pIn=687.45, pOut=697.6, end=698.0, zoom=1.7, at=(790, 540),
         note="the sorted episode-length S-curve; starts after the re-run and scroll at 684.27-685.90, ends before "
              "the re-run at 698.13 (scrolls measured with make_demo_spec's detector, 2026-10-28)"),
    dict(id="gZ8b", part="gZ8", pat="PLOT_PCTL", xclip=None, ymin=0, start=711.6, pIn=712.4, zoom=1.6, at=(780, 540),
         note="the percentile plot and its printed 25th/50th/75th lines; the push starts 711.60, 0.3s after the plot settles "
              "(review 2026-10-28: at 710.70 it ramped while the page still drifted ~40px), lands 712.40, "
              "the zoom-out ends with the part (734.33), before the 16px scroll at 734.67"),
    dict(id="gZ9", part="gZ9", pat="RERUN_ALOHA", xclip=None, ymin=0, zoom=2.0, at=(720, 540), pOut=1549.9, end=1550.55,
         note="Rerun's observation.images.top panel, ALOHA's two arms (Rerun on screen from 1507.53, steady to the part's end); "
              "the zoom-out runs 1549.90-1550.55 so the accent on 'inserts' holds >= 1.5s first (review 2026-10-28)"),
    dict(id="gZ5", part="gZ5", pat="RERUN_IMAGE", xclip=None, ymin=0, at=(900, 540),
         note="Rerun's observation.image panel, PushT episode 184 playing"),
    dict(id="gZ6", part="gZ6", pat="RERUN_IMAGE", xclip=None, ymin=0, at=(900, 540),
         note="Rerun's observation.image panel, PushT episode 174 playing"),
    dict(id="gZ7a", part="gZ7", scrollAfter=(1467.500, 1467.600),
         pat=r"(least movement|most movement|episode_index\||tail_motion\||head_motion\||^47\||^5 ?\||^19 ?\||^3 ?\||^30 ?\||^44 ?\|)", xclip=[880, 1760], ymin=600, ymax=1320, at=(640, 540),
         note="the least- and most-movement tables (rows 47 5 19, 3 30 44); 63px scroll at 1467.50 ends it"),
    dict(id="gZ7b", part="gZ7", scrollAfter=(1481.767, 1483.467),
         pat=r"(least movement|most movement|episode_index\||tail_motion\||head_motion\||^47\||^5 ?\||^19 ?\||^3 ?\||^30 ?\||^44 ?\|)", xclip=[880, 1760], ymin=560, ymax=1260, at=(640, 540),
         note="the same two tables after the scroll; scrolls at 1481.77 and 1483.10 end it"),
    dict(id="gZ7c", part="gZ7",
         pat=r"(episode_index\||tail_motion\||head_motion\||^46\||^40\||^34\|)", xclip=[880, 1760], ymin=1300, ymax=1520, at=(640, 540),
         note="the median-rows table (46 40 34) under its code"),
    dict(id="gZ4", part="gZ4", pat=r"(^dataset aloha|^pusht$|^fps$|^episodes$|^frames$|action_size|state_size|^cameras$|video_codec|timing_mismatches|video_window_mismatches|idle_episodes|dead_joints|success_episodes)",
         xclip=[880, 1950], ymin=1090, zoom=2.2, at=(640, 540), end=1809.200, pOut=1808.000,
         note="the notebook's comparison table, ALOHA beside PushT, left of the bottom-right inset; the "
              "zoom-out ends at 1809.20, before the inset's exit dissolve at the demo's end (1809.25)"),
]

INSET_CROP = {"w": 2000, "h": 2000, "x": 1060, "y": 60}     # 02: takes c and d centre the face at x ~2060 (4K); checked on frames
DELIV = {"width": 960, "height": 960, "left": 2736, "top": 1056, "radius": 48,
         "repositionSeconds": 0.6, "enterSeconds": 0.5, "exitSeconds": 0.35}
TOPY = 144                                                  # demo_scene.py's top-right corner


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--edit-cutsheet", required=True)
    ap.add_argument("--plan", required=True)
    ap.add_argument("--ocr", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--scene-out", required=True)
    ap.add_argument("--screen", default="../outputs/base-screen.mp4")
    a = ap.parse_args()

    cs = json.load(open(a.edit_cutsheet)); plan = json.load(open(a.plan)); ocr = json.load(open(a.ocr))
    if cs["totalFrames"] != MEASURED_ON_FRAMES:
        sys.exit(f"the cut is {cs['totalFrames']} frames; STOPS were measured on {MEASURED_ON_FRAMES}: re-measure the scrolls")
    parts = {p["id"]: p for p in plan["parts"]}
    acc, demo = 0, []
    for s in cs["segments"]:
        if s["section"] == "demo":
            demo.append((acc, acc + s["outFrames"]))
        acc += s["outFrames"]
    SF, EF = demo[0][0], demo[-1][1]; S, E = SF / FPS, EF / FPS
    if abs(S - plan["demo"]["start"]) > 0.05:
        sys.exit(f"plan's demo starts {plan['demo']['start']}, the cutsheet's demo section {S:.3f}; regenerate the plan")

    # ---- scroll detection on the screen track: per frame, the whole-notebook vertical shift
    W_, H_ = 240, 135
    def scrolls(t_lo, t_hi):
        raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t_lo - S:.3f}", "-t", f"{t_hi - t_lo:.3f}", "-i", a.screen,
                              "-vf", f"scale={W_}:{H_},format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout
        n = W_ * H_; fr = [raw[i:i + n] for i in range(0, len(raw) - n + 1, n)]
        out = []
        for i in range(1, len(fr)):
            p, q = fr[i - 1], fr[i]
            ch = sum(1 for j in range(0, n, 3) if abs(p[j] - q[j]) > 25)
            if ch < 400:                       # a cursor, a caret, a tooltip: not a scroll
                continue
            rp = [sum(p[y * W_:(y + 1) * W_]) for y in range(H_)]; rq = [sum(q[y * W_:(y + 1) * W_]) for y in range(H_)]
            best = min(range(-20, 21), key=lambda s: sum(abs(rq[y] - rp[y - s]) for y in range(25, H_ - 25)))
            if best:
                out.append((round(t_lo + i / FPS, 3), best * 16))
        return out

    # ---- resolve every stop's times
    for i, st in enumerate(STOPS):
        p = parts[st["part"]]
        prev = STOPS[i - 1] if i and STOPS[i - 1]["part"] == st["part"] and "scrollAfter" in STOPS[i - 1] else None
        if prev:                                # chained: the pan runs over the previous stop's scroll
            s0, s1 = prev["scrollAfter"]
            st["start"], st["pIn"] = round(s0 - 2 / FPS, 3), round(s1 + 2 / FPS, 3)
        st.setdefault("start", p["start"])
        if "scrollAfter" in st:
            s0, s1 = st["scrollAfter"]
            st["pOut"], st["end"] = round(s0 - 2 / FPS, 3), round(s1 + 2 / FPS, 3)
        st.setdefault("end", p["end"])
        st.setdefault("pIn", st["start"] + RAMP / FPS)
        st.setdefault("pOut", st["end"] - RAMP / FPS)
        if not (p["start"] - 0.01 <= st["start"] < st["pIn"] < st["pOut"] < st["end"] <= p["end"] + 0.01):
            sys.exit(f"{st['id']}: times out of order or outside part {p['id']} {p['start']}-{p['end']}: "
                     f"{st['start']} {st['pIn']} {st['pOut']} {st['end']}")

    items, err = [], []
    for st in STOPS:
        sid, pat = st["id"], st["pat"]
        if pat in BOX_FROM_FRAME:
            x0, y0, x1, y1 = BOX_FROM_FRAME[pat]; n = 0; src = f"frame-measured ({pat})"
        else:
            # the scroll gate: no scroll inside the plateau (a split puts the plateau's edges 2 frames
            # clear of the scroll's moving frames, so a one-frame seek error cannot hide one)
            sc = scrolls(st["pIn"], st["pOut"])
            if sc:
                err.append(f"{sid}: the page scrolls inside the plateau {st['pIn']}-{st['pOut']}: {sc[:6]}; split the stop there")
            rx = re.compile(pat); boxes, ys, hits_per = [], [], []
            for d in ocr:
                if not (st["pIn"] <= d["t"] <= st["pOut"]):
                    continue
                hit = [r for r in d["runs"] if rx.search(r[4]) and st["ymin"] <= r[1] <= st.get("ymax", 2160)]
                if st["xclip"]:
                    hit = [r for r in hit if r[0] < st["xclip"][1] and r[0] + r[2] > st["xclip"][0]]
                if not hit:
                    continue
                bx = (min(r[0] for r in hit), min(r[1] for r in hit), max(r[0] + r[2] for r in hit), max(r[1] + r[3] for r in hit))
                if st["xclip"]:
                    bx = (max(bx[0], st["xclip"][0]), bx[1], min(bx[2], st["xclip"][1]), bx[3])
                boxes.append((d["t"],) + bx); ys.append(bx[1]); hits_per.append({r[4][-12:] for r in hit})
            if not boxes:
                err.append(f"{sid}: /{pat}/ never on screen in the plateau {st['pIn']}-{st['pOut']}"); continue
            full = max(len(hk) for hk in hits_per)
            ys = [y for y, hk in zip(ys, hits_per) if len(hk) == full]
            if max(ys) - min(ys) > MOVE_TOL:
                err.append(f"{sid}: target moves {max(ys)-min(ys)}px inside the plateau ({[(round(b[0],1), b[2]) for b in boxes]})")
            x0 = min(b[1] for b in boxes); y0 = min(b[2] for b in boxes)
            x1 = max(b[3] for b in boxes); y1 = max(b[4] for b in boxes)
            n = len(boxes); src = "ocr"
        pad = 24
        x0, y0, x1, y1 = max(0, x0 - pad), max(0, y0 - pad), min(3840, x1 + pad), min(2160, y1 + pad)
        w, h = x1 - x0, y1 - y0
        z = st.get("zoom") or max(ZMIN, min(ZMAX, 3840 * MARGIN[0] / w, 2160 * MARGIN[1] / h))
        ox, oy = st.get("at", (960, 540))
        cx = (x0 + x1) / 2 - (ox - 960) * 2 / z; cy = (y0 + y1) / 2 - (oy - 540) * 2 / z
        # where the box lands at the plateau (zoompan's clamp, as lib.mapZoom), 4K output px
        ww, hh = 3840 / z, 2160 / z
        sx = min(max(cx - ww / 2, 0), 3840 - ww); sy = min(max(cy - hh / 2, 0), 2160 - hh)
        ob = [(x0 - sx) * z, (y0 - sy) * z, (x1 - sx) * z, (y1 - sy) * z]
        if ob[0] < 0 or ob[1] < 0 or ob[2] > 3840 or ob[3] > 2160:
            err.append(f"{sid}: the box leaves the frame at zoom {z:.2f} ({[round(v) for v in ob]})")
        it = {"id": sid, "part": st["part"], "start": round(st["start"], 3), "end": round(st["end"], 3),
              "cx": round(cx), "cy": round(cy), "zoom": round(z, 2), "box": [x0, y0, x1, y1], "framing": "full",
              "target": st["note"], "_boxFrom": src, "_ocrSamples": n,
              "_plateau": [round(st["pIn"], 3), round(st["pOut"], 3)], "_outBox4k": [round(v) for v in ob]}
        ri = round((st["pIn"] - st["start"]) * FPS); ro = round((st["end"] - st["pOut"]) * FPS)
        if ri != RAMP: it["rampIn"] = ri
        if ro != RAMP: it["rampOut"] = ro
        # demo_scene / lib.plateau clamp a ramp to a third of the window: never let that move a plateau
        f = round((st["end"] - st["start"]) * FPS)
        if ri > f // 3 or ro > f // 3:
            err.append(f"{sid}: a ramp ({ri}f in, {ro}f out) exceeds a third of its {f}f window and would be clamped")
        # the inset: stay, move top-right, or hide
        def hits(r, m=24):
            return ob[0] < r[2] + m and ob[2] > r[0] - m and ob[1] < r[3] + m and ob[3] > r[1] - m
        BR = [DELIV["left"], DELIV["top"], DELIV["left"] + DELIV["width"], DELIV["top"] + DELIV["height"]]
        TR = [DELIV["left"], TOPY, DELIV["left"] + DELIV["width"], TOPY + DELIV["height"]]
        it["_inset"] = st.get("inset") or ("stay" if not hits(BR) else "topRight" if not hits(TR) else "hide")
        items.append(it)
    if err:
        sys.exit("demo spec FAILED:\n  " + "\n  ".join(err))

    def merged(kind, pre):
        win = sorted((i["start"] - pre, i["end"] + 0.2) for i in items if i["_inset"] == kind)
        m = []
        for lo, hi in win:
            if m and lo - m[-1][1] < 20.0: m[-1][1] = max(m[-1][1], hi)
            else: m.append([lo, hi])
        return m
    hid = merged("hide", 0.2)
    # a move needs repositionSeconds to land before the zoom starts
    rep = [w for w in merged("topRight", 0.2 + DELIV["repositionSeconds"])
           if not any(h0 <= w[0] and w[1] <= h1 for h0, h1 in hid)]
    for w in rep:
        for h0, h1 in hid:
            if w[0] < h1 and h0 < w[1]:
                sys.exit(f"a top-right move {w} overlaps a hide {h0}-{h1}: split the stops or force one treatment")
    hidden = [{"start": round(lo, 3), "end": round(hi, 3),
               "why": "the zoomed target reaches both right-hand corners (style.json demoInset.mayHide)"} for lo, hi in hid]
    reposition = [{"start": round(lo, 3), "end": round(hi, 3), "corner": "topRight",
                   "why": "the zoomed target reaches the bottom-right corner but not the top-right (demoInset.mayReposition)"}
                  for lo, hi in rep]

    spec = {
        "span": {"start": round(S, 3), "end": round(E, 3), "_why": "derived from transcript/cutsheet.json"},
        "base": "outputs/base-cut.mov", "screen": "outputs/base-screen.mp4",
        "_screenWhy": "demo segments only (sessions c and d), cut per segment from each session's screen clip; "
                      "one 2.1s flash of the Obsidian vault and desktop held over with the last Rerun frame (leak.json holds)",
        "inset": {
            "sourceCrop": INSET_CROP,
            "_sourceCropWhy": "02: 01's 2000px square moved left to centre this framing's face (x ~2060 on takes c and d)",
            "_delivery": DELIV,
            "reposition": reposition,
            "_repositionWhy": "measured per punch-in from its zoomed box (make_demo_spec.py): a target clear of the "
                              "bottom-right keeps the face there; one that reaches only the bottom-right moves it "
                              "top-right; one that reaches both hides it",
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
        print(f"  {i['id']:5s} {i['start']:8.2f}-{i['end']:8.2f} plateau {i['_plateau'][0]:.2f}-{i['_plateau'][1]:.2f}  "
              f"zoom {i['zoom']:.2f}  c({i['cx']},{i['cy']})  inset {i['_inset']:8s} {i['_boxFrom']} n={i['_ocrSamples']}")
    print(f"hidden: {hidden}\nreposition: {reposition}")
    print(f"wrote {a.out}, {a.scene_out}")


main()
