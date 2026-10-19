#!/usr/bin/env python3
"""Write demo-spec.json and demo-scene.json for 05-agent-swarm.

Everything here is MEASURED:
  * span          the demo's first and last frame on the cut (transcript/cutsheet.json)
  * punch-ins     each stop's box is the union of the OCR runs matching its pattern at
                  every OCR sample inside the stop (screen-ocr.json). If the text moves
                  more than MOVE_TOL px during a stop the build FAILS: a framing taken
                  from one moment zooms on empty page at another (04 lesson, the prompt
                  that jumped from the input box into the chat).
  * zoom          fits the box with margins, clamped to [ZMIN, ZMAX]
  * inset         crop chosen on a contact sheet of four crops x five points across both
                  sessions; corner from the text under each corner (see REPOSITION)
  * hidden        the inset steps aside for every punch-in and every fast-forward
                  (style.json demoInset.mayHide; human 2026-09-29 for the fast-forwards);
                  windows under 2s apart are merged so it does not fidget

Punch-in times are part times from graphics-build/cutsheet.json, never retyped.
"""
import argparse, json, sys

FPS = 30
MOVE_TOL = 30          # px of vertical drift allowed inside one stop
ZMIN, ZMAX = 1.4, 2.6
MARGIN = (0.88, 0.80)  # fraction of the frame the box may fill, w and h

# g16: board.log scrolls at 813.3-815.4 (measured by the move gate), so the zoom
# steps out over the scroll and back in on line 23 rather than panning across it.
# (id, part, start override, end override, pattern, x clip [x0, x1] or None, target note)
# start/end None = the part's own start/end. Several stops in one part chain by a pan.
STOPS = [
    ("g05",  "g05",  None,  None,  r"^(CONVENTIONS|REQUIREMENTS|STANDARDS)\.md", [280, 1930],
     "the directory listing's four markdown files; CONVENTIONS, STANDARDS, REQUIREMENTS named"),
    ("gZ1",  "gZ1",  None,  None,  r"(git branch|ep05-demo|git status)", [0, 1500],
     "the git lines: branch ep05-demo, git status --short empty"),
    ("gZ2",  "gZ2",  None,  None,  r"(tools/board\.py|[Ww]atching /Users)", None,
     "board.py watching ~/.claude/teams and tasks, Log: board.log (empty)"),
    ("g06",  "g06",  None,  None,  r"EXPERIMENTAL_AGENT_TEAMS", None,
     "the launch command: CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 claude --teammate-mode tmux"),
    ("g08a", "g08",  300.5, 326.2, r"^(Read |Inspect|Build this|Deliver|Use an agent|Plan the|Write the plan|Put each|State which|Spawn|Name each|The marts|Each teammate|Two teammates|The lead owns|When a teammate)", None,
     "the prompt's instructions, read aloud: context files, agent team, plan, task list, messages"),
    ("g08b", "g08",  326.2, None,  r"^(Finish with a report|State the|Include the final|List every business)", None,
     "the prompt's reporting block after it scrolls: 'what it could not infer'"),
    ("g10a", "g10",  None,  None,  r"^(team-lead\s*>|ecom\s*>|erp\s*>)", [0, 1900],
     "board log: team-lead > each teammate, then ecom > crm and erp > pos (left part of each line)"),
    ("gZ3",  "gZ3",  None,  None,  r"^Messages that changed a", [0, 1900],
     "the lead's summary: 'Messages that changed a teammate's work' and the messages under it", 360),
    ("gZ4",  "gZ4",  None,  None,  r"^(# Team plan|Build the warehouse|'landing/' through)", [760, 2200],
     "TEAM_PLAN.md: 'Build the warehouse from landing/ through to the three reports'"),
    ("g14a", "g14",  None,  700.4, r"^(## The team|Staging for|\| Intermediate)", None,
     "TEAM_PLAN.md 'The team' table as 'four plus two ... six agents' lands"),
    ("g14b", "g14",  700.4, None,  r"^(## File ownership|One owner per file|lead$|crm'?$|erp$|models/staging)", [680, 2000],
     "TEAM_PLAN.md 'File ownership' on 'file ownership'"),
    ("gZ5",  "gZ5",  None,  None,  r"^(## Task list|\| ID \| Task|\| T0\d)", [760, 2400],
     "TEAM_PLAN.md '## Task list', the T01... rows on 'divided into 10 tasks'"),
    ("g16a", "g16",  None,  813.4, r"ecom\s*[>-]+\s*crm.*[Pp]ropos", [760, 2400],
     "board.log line 9: ecom proposes full-dump staging details, points 1-5"),
    ("g16b", "g16",  815.6, 830.7, r"crm\s*>\s*ecom.*agree", [1000, 2900],
     "board.log line 23: crm agrees to 1, 3, 4, 5 and 6, pushes back on 2"),
    ("g16c", "g16",  830.7, None,  r"(ecom|efom)\s*.{0,3}\s*crm.*matches your point 2", [760, 2400],
     "board.log line 39: ecom concedes point 2"),
    ("g17",  "g17",  None,  None,  r"team-lead\s*>\s*marts.*source_order_date", [760, 2600],
     "board.log line 53: the lead relays erp's new source_order_date column"),
    ("g17b", "g17b", None,  None,  r"(POS: the we.site is the ERP branch with no city|branch_id)", [760, 2400],
     "BUILD_REPORT.md: the website is the ERP branch with no city"),
    ("g18",  "g18",  None,  None,  r"^(2187780|\(2\.19 million\))", [0, 1600],
     "DuckDB: 2187780.17 (2.19 million) from the files, then the mart total"),
]

# The inset moves to bottom-LEFT where the word-wrapped board.log puts text under
# bottom-right: measured 2026-09-29 from screen-ocr.json, ~1000-1500 characters under
# BR vs ~500 under BL (the file tree, not being read) from 12:37 to 15:25 on the cut.
# 12:37-16:04 the inset goes TOP-RIGHT and never hides (human 2026-09-29: "don't hide the
# face at all, I have some good genuine expressions when I am amazed at the agents"). Both
# bottom corners covered the word-wrapped board.log; top-right is Cursor's tab chrome.
REPOSITION = [(757.0, 964.0, "topRight")]

# g09 labels the four teammate panes and the bottom-right inset sat on the POS pane
# (composition review 2026-09-29, finding 10)
EXTRA_HIDE = [(371.3, 392.9, "g09 labels the tmux panes; bottom-right is the live pos pane")]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--edit-cutsheet", required=True)
    ap.add_argument("--plan", required=True, help="graphics-build/cutsheet.json")
    ap.add_argument("--ocr", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--scene-out", required=True)
    a = ap.parse_args()
    import re

    cs = json.load(open(a.edit_cutsheet))
    plan = json.load(open(a.plan))
    ocr = json.load(open(a.ocr))
    parts = {p["id"]: p for p in plan["parts"]}

    acc, demo, ffs = 0, [], []
    for s in cs["segments"]:
        if s["section"] == "demo":
            demo.append((acc, acc + s["outFrames"]))
        if s["kind"] == "ff":
            ffs.append((acc / FPS, (acc + s["outFrames"]) / FPS))
        acc += s["outFrames"]
    SF, EF = demo[0][0], demo[-1][1]
    S, E = SF / FPS, EF / FPS
    if abs(S - plan["_demoScene"]["in"]) > 0.02 or abs(E - plan["_demoScene"]["out"]) > 0.02:
        sys.exit("plan's _demoScene disagrees with the edit cutsheet; regenerate the plan")

    items, err = [], []
    for stop in STOPS:
        sid, pid, s0, e0, pat, xclip, note = stop[:7]
        follow = stop[7] if len(stop) > 7 else 0
        p = parts[pid]
        st = p["start"] if s0 is None else s0
        en = p["end"] if e0 is None else e0
        rx = re.compile(pat, re.I)
        boxes, ys = [], []
        for d in ocr:
            if not (st <= d["t"] <= en):
                continue
            hit = [r for r in d["runs"] if rx.search(r[4])]
            if xclip:
                hit = [r for r in hit if r[0] < xclip[1] and r[0] + r[2] > xclip[0]]
            if not hit:
                continue
            x0 = min(r[0] for r in hit); y0 = min(r[1] for r in hit)
            x1 = max(r[0] + r[2] for r in hit); y1 = max(r[1] + r[3] for r in hit)
            if follow:
                y1 = y0 + follow
                x1 = max([x1] + [r[0] + r[2] for r in d["runs"] if y0 <= r[1] <= y1 and r[0] < 1900])
            if xclip:
                x0, x1 = max(x0, xclip[0]), min(x1, xclip[1])
            boxes.append((d["t"], x0, y0, x1, y1)); ys.append(y0)
        if not boxes:
            err.append(f"{sid}: /{pat}/ never on screen between {st} and {en}"); continue
        if max(ys) - min(ys) > MOVE_TOL:
            err.append(f"{sid}: target moves {max(ys)-min(ys)}px inside the stop "
                       f"({[(round(b[0],1), b[2]) for b in boxes]}); split it")
        x0 = min(b[1] for b in boxes); y0 = min(b[2] for b in boxes)
        x1 = max(b[3] for b in boxes); y1 = max(b[4] for b in boxes)
        pad = 24
        x0, y0, x1, y1 = max(0, x0 - pad), max(0, y0 - pad), min(3840, x1 + pad), min(2160, y1 + pad)
        w, h = x1 - x0, y1 - y0
        z = max(ZMIN, min(ZMAX, 3840 * MARGIN[0] / w, 2160 * MARGIN[1] / h))
        items.append({"id": sid, "part": pid, "start": round(st, 3), "end": round(en, 3),
                      "cx": round((x0 + x1) / 2), "cy": round((y0 + y1) / 2), "zoom": round(z, 2),
                      "box": [x0, y0, x1, y1], "framing": "full", "target": note,
                      "_ocrSamples": len(boxes)})
    # While the inset is top-right (REPOSITION) a centred target line runs under it: the inset
    # reaches y=552 on the 1080 canvas and a zoomed line centred at 540 starts ~475. QA round 2
    # (2026-09-29) caught g17b's box and sentence cut off behind the face. Frame those targets
    # 108px (1080 canvas) lower, i.e. at 60% height; the marks map through the same window.
    for it in items:
        for r0, r1, corner in REPOSITION:
            if corner == "topRight" and it["start"] < r1 and it["end"] > r0:
                it["cy"] = round(it["cy"] - 216 / it["zoom"]); it["_framedBelowInset"] = True
    if err:
        sys.exit("demo spec FAILED:\n  " + "\n  ".join(err))

    # g18 ends on the demo's last frame; a 0.4s zoom-out gives the third check (the web-sales
    # result, composition review finding 2) a real hold before the cut to the push
    for i in items:
        if i["id"] == "g18":
            i["rampOut"] = 12
    # chained stops inside one part pan into each other: the outgoing rampOut equals the
    # incoming rampIn and they overlap by exactly that many frames (demo_scene.py)
    PAN = 18
    for x, y in zip(items, items[1:]):
        if x["part"] == y["part"] and abs(x["end"] - y["start"]) < 0.05:
            x["rampOut"] = PAN; y["rampIn"] = PAN
            x["end"] = round(y["start"] + PAN / FPS, 3)

    # The inset steps aside only for a punch-in whose ZOOMED target reaches its corner, for
    # every fast-forward, and for EXTRA_HIDE; hides under 20s apart merge into one. It used
    # to hide for every punch-in with 2s merging: 12 hides, some 15-20s apart, which the
    # composition review called a fidget (2026-09-29, finding 8).
    def reaches_inset(i):
        Z = i["zoom"]; w, h = 3840 / Z, 2160 / Z
        sx = min(max(i["cx"] - w / 2, 0), 3840 - w); sy = min(max(i["cy"] - h / 2, 0), 2160 - h)
        x0, y0, x1, y1 = [(v - o) * Z for v, o in zip(i["box"], (sx, sy, sx, sy))]
        if any(lo <= i["start"] < hi for lo, hi, _ in REPOSITION):
            return False                      # never hidden in the top-right span (human)
        return x0 < 3696 and x1 > 2736 and y1 > 1056 and y0 < 2016
    win = sorted([(i["start"] - 0.2, i["end"] + 0.2, "punch-in over its corner") for i in items if reaches_inset(i)] +
                 [(f0, f1, "fast-forward") for f0, f1 in ffs] +
                 [(lo, hi, why) for lo, hi, why in EXTRA_HIDE])
    merged = []
    for lo, hi, why in win:
        if merged and lo - merged[-1][1] < 20.0:
            merged[-1][1] = max(merged[-1][1], hi); merged[-1][2].add(why)
        else:
            merged.append([lo, hi, {why}])
    hidden = [{"start": round(lo, 3), "end": round(hi, 3),
               "why": " + ".join(sorted(w)) + ": the inset steps aside (style.json demoInset.mayHide)"}
              for lo, hi, w in merged]

    spec = {
        "span": {"start": round(S, 3), "end": round(E, 3), "_why": "derived from transcript/cutsheet.json"},
        "base": "outputs/base-cut.mov", "screen": "outputs/base-screen.mp4",
        "_screenWhy": "demo segments only, cut per segment from each session's own screen clip with "
                      "the same speed select as the camera; leak scan found nothing to blur",
        "inset": {
            "sourceCrop": {"w": 1760, "h": 1760, "x": 1480, "y": 300},
            "_sourceCropWhy": "four crops compared at five points across both sessions (1760@1480,300 / "
                              "1600@1560,420 / 1900@1400,260 / 1500@1640,480), 2026-09-29. 1760@1480,300 "
                              "keeps the head centred with headroom and the chin clear of the mic at all "
                              "five; 1600 and 1500 crop hair or crowd the chin, 1900 wastes wall.",
            "_delivery": {"width": 960, "height": 960, "left": 2736, "top": 1056, "radius": 48,
                          "repositionSeconds": 0.6, "enterSeconds": 0.5, "exitSeconds": 0.35},
            "reposition": [{"start": lo, "end": hi, "corner": c} for lo, hi, c in REPOSITION],
            "_repositionWhy": "measured from screen-ocr.json: text under the bottom-right inset box vs "
                              "its bottom-left mirror. Session A: BR clear or near-clear throughout. "
                              "Session B 12:37-16:04: the word-wrapped board.log sits under both bottom "
                              "corners, so the inset goes TOP-RIGHT (Cursor's tab chrome) and never "
                              "hides (human 2026-09-29, style.json mayReposition topRight). Slides per "
                              "style.json, never jumps.",
            "hiddenDuring": hidden,
        },
        "punchIns": {"items": items},
        "screenFlatten": [[48, 49, 48]],
        "_screenFlattenWhy": "the raw screen recording's dark terminal background alternates luma 48/49 in a "
                             "ghost pattern (hairlines every ~192px, text echoes, periodic repaints) from "
                             "2:10 to 3:26 cut time; measured in the raw file, not introduced by the edit. "
                             "Chroma is flat (U 134, V 125). Mapping 49 -> 48 removes it and moves nothing "
                             "else by more than one level.",
        "screenMask": [{"x": 3816, "y": 2, "w": 22, "h": 20,
                        "why": "macOS camera-in-use indicator (green, measured at x 3824-3831, y 8-15 on "
                               "this recording 2026-09-29, same as 04). Brand has no green; filled "
                               "from its surroundings with delogo."}],
    }
    json.dump(spec, open(a.out, "w"), indent=1)
    json.dump({"enters": {"cutSeconds": round(S, 3), "frame": SF},
               "leaves": {"cutSeconds": round(E, 3), "frame": EF},
               "_why": "DERIVED from transcript/cutsheet.json (first and last demo-section frame on "
                       "the cut). Never hand-edited."}, open(a.scene_out, "w"), indent=1)
    for i in items:
        print(f"  {i['id']:5s} {i['start']:8.2f}-{i['end']:8.2f}  zoom {i['zoom']:.2f}  box {i['box']}  "
              f"({i['_ocrSamples']} samples)")
    print(f"  inset hidden in {len(hidden)} windows, {len(REPOSITION)} corner move(s)")
    for lo, hi, _ in REPOSITION:
        for h in hidden:
            if h["start"] < hi and h["end"] > lo:
                sys.exit(f"inset hidden {h['start']}-{h['end']} inside the top-right span {lo}-{hi}")
    print(f"wrote {a.out}\nwrote {a.scene_out}")


main()
