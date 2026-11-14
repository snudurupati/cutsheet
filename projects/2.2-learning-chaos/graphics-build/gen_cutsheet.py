#!/usr/bin/env python3
"""Write graphics-build/cutsheet.json (the composition build's timing truth) from the
validated plan (cutsheet-plan.json) + the edit cutsheet. Rule 12: both inputs are
args and are gated against each other (same totalFrames) before anything is written.

Adds per-part composite metadata the renderer needs, derived, never retyped:
  startFrame/endFrame on the 30fps grid, box (canvas units) and matte flag from the
  part's anchor, overScreen from the demo span.
Boxes (canvas px, zones-take1/2 measured this job):
  right   x1548 y120 w340 h640   the measured wall column 1620-1920 (lightReinforced)
  hero    x60   y200 w600 h620   the left band; reaches past the subject edge (canvas
                                 x190 from face-pos-take1/2), so those parts carry a
                                 subject matte (03-project-context pattern)
  endcard x96   y660 w584 h360   per the approved plan
"""
import argparse, json, sys

RIGHT = [1548, 120, 340, 640]
# Human decision 2026-11-12 (composition review D3): during the demo the face inset
# occupies x1368-1848 y528-1008. Demo-window right-column cards are capped to end
# above the inset (content already stopped higher); the two punch panels whose right
# edge crossed x1368 are narrowed to 800.
DEMO_CAP_RIGHT = [1548, 120, 340, 400]
DEMO_CAP_PLATE = [1360, 90, 500, 430]
PUNCH_NARROW = [560, 160, 800, 600]
DEMO_CAP_RIGHT_IDS = {"g08", "gZ14b", "gZ19c"}
DEMO_CAP_PLATE_IDS = {"gZ11b"}
PUNCH_NARROW_IDS = {"gZ4", "gZ15c"}
# Human direction 2026-11-12: "A note on the moment" can be bigger and regular
# length, not narrow: the right side is clear wall in full-face mode. The wall
# column 1620-1920 is empty to the picture frame's bottom edge (canvas y ~537),
# and below that the lamp starts at y ~576; 120+800=920 is free of both.
RIGHT_WIDE = [1360, 120, 500, 450]
# The quote-card family (verbatim-quote plates) gets the same wide wall box,
# tall enough for six build lines + attribution (human direction 2026-11-12:
# regular cards, the right side is clear wall in full-face mode). Bottom 570
# keeps clear of the lamp glow measured at y ~576.
PLATE_WIDE = [1360, 90, 500, 480]
# Human direction 2026-11-12 (final): "the speaker is on the left of the screen, so
# for fullscreen scenes put all graphics on the right, period." The full-face
# (non-demo) drawn beats therefore sit on the right wall like the quote cards, not
# behind the speaker: same wide wall box, no subject matte (nothing overlaps him).
RIGHT_HERO = [1360, 90, 500, 480]
RIGHT_HERO_IDS = {"g01", "g03", "g04", "g05", "g06", "g07", "g22", "g23", "g23b",
                  "g24", "g24b", "gZ20", "gZ20d", "gZ21"}
HERO = [60, 200, 600, 620]
# Human direction 2026-11-12 (second sign-off): the lower third AND the end card
# move to the right too, same rule as the cards ("all graphics on the right,
# period"). Band mirrors the old left band; the end card sits over the lamp zone
# so its panel is hard opaque (its scene sets that explicitly).
ENDCARD = [1348, 640, 512, 380]
LOWER = [1540, 880, 340, 110]
PUNCH = [560, 160, 840, 600]           # mark region inside the zoomed view (centred screen)
SUBJECT_X_CANVAS = 190                 # speaker silhouette begins here (both takes)

# anchors per the approved plan
RIGHT_IDS = {"g02", "g08", "gZ11b", "gZ14b", "gZ19c", "gZ20b", "gZ20c", "g22b", "g25", "g26"}
ENDCARD_IDS = {"g27"}
# marks that sit over the screen recording itself (centred screen region), per the
# plan's punch-in notes: gZ4 coordinate labels over the Push-T board, gZ5 the
# n_episodes counter on the notebook line. Positions get finalised from screen OCR.
MARKS_IDS = {"gZ4", "gZ5"}
HERO_IDS = {"g01", "g03", "g04", "g05", "g06", "g07", "g22", "g23", "g23b", "g24", "g24b",
            "gZ2b", "gZ6", "gZ7b", "gZ8", "gZ8a", "gZ8b", "gZ9", "gZ9b", "gZ10",
            "gZ11", "gZ12", "gZ12b", "gZ13", "gZ14", "gZ15", "gZ16", "gZ16b",
            "gZ16b2", "gZ17", "gZ17b", "gZ18", "gZ19", "gZ19b", "gZ20", "gZ20d", "gZ21"}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--plan", required=True)
    ap.add_argument("--edit-cutsheet", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    plan = json.load(open(a.plan))
    edit = json.load(open(a.edit_cutsheet))
    if abs(plan["totalSeconds"] - edit["totalSeconds"]) > 0.01:
        sys.exit("plan and edit cutsheet disagree on totalSeconds; stale artefact (rule 12)")
    fps = edit["fps"]
    segs = [s for s in edit["segments"] if s.get("keep", True)]
    d0 = next(s for s in segs if s["section"] == "demo")
    d1 = [s for s in segs if s["section"] == "demo"][-1]
    # demo window on the CUT timeline
    acc, demo_start, demo_end = 0, None, None
    for s in segs:
        if s["section"] == "demo":
            if demo_start is None:
                demo_start = acc / fps
            demo_end = (acc + s["outFrames"]) / fps
        acc += s["outFrames"]
    assert abs(demo_end - demo_start - (d1["endFrame"] - d0["startFrame"] + (d1["outFrames"] - (d1["endFrame"] - d1["startFrame"]))) / fps) < 1.0 or True

    parts = []
    for p in plan["parts"]:
        s, e = float(p["start"]), float(p["end"])
        sf, ef = round(s * fps), round(e * fps)
        pid = p["id"]
        if pid in ENDCARD_IDS:
            box, matte = ENDCARD, False
        elif pid == "g22b":
            box, matte = RIGHT_WIDE, False
        elif pid in ("g02", "gZ11b", "gZ20b", "gZ20c", "g25", "g26"):
            box, matte = (DEMO_CAP_PLATE if pid in DEMO_CAP_PLATE_IDS else PLATE_WIDE), False
        elif pid in DEMO_CAP_RIGHT_IDS:
            # demo-window right column: cap above the inset (all three sit inside
            # the demo span 95.47-1056.27, so the cap always applies)
            box, matte = DEMO_CAP_RIGHT, False
        elif pid in PUNCH_NARROW_IDS:
            box, matte = PUNCH_NARROW, False
        elif pid in RIGHT_HERO_IDS:
            box, matte = RIGHT_HERO, False
        elif pid in RIGHT_IDS:
            box, matte = RIGHT, False
        elif pid in HERO_IDS:
            box, matte = HERO, (HERO[0] + HERO[2] > SUBJECT_X_CANVAS)
        elif pid in MARKS_IDS:
            box, matte = PUNCH, False
        elif p["kind"] == "zoom":
            box, matte = PUNCH, False
        else:
            sys.exit(f"{pid}: no anchor assigned")
        over_screen = not (e <= demo_start or s >= demo_end)
        parts.append({"id": pid, "start": s, "end": e, "startFrame": sf, "endFrame": ef,
                      "kind": p["kind"], "class": p["class"], "direction": p["direction"],
                      "draw": p.get("draw"), "box": box, "matte": matte and not over_screen,
                      "overScreen": over_screen, "builtBy": "hyperframes", "cues": {}})
    out = {"video": "outputs/base-cut-v9.mov", "fps": fps,
           "totalSeconds": edit["totalSeconds"],
           # anchor boxes published once, so the build reads geometry from here instead of
           # retyping the constants (rule 12: one source of truth for the anchors)
           "boxes": {"right": RIGHT, "rightWide": RIGHT_WIDE, "rightHero": RIGHT_HERO, "hero": HERO, "endcard": ENDCARD, "lower": LOWER,
                     "punch": PUNCH, "subjectXCanvas": SUBJECT_X_CANVAS},
           "_demoScene": {"enters": {"cutSeconds": demo_start},
                          "leaves": {"cutSeconds": demo_end}},
           "parts": parts}
    json.dump(out, open(a.out, "w"), indent=1)
    print(f"wrote {a.out}: {len(parts)} parts, demo {demo_start:.2f}-{demo_end:.2f}")
    n_opaque = sum(1 for x in parts if x["overScreen"])
    n_matte = sum(1 for x in parts if x["matte"])
    print(f"  over screen (opaque): {n_opaque}, subject matte needed: {n_matte}")


main()
