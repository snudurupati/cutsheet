#!/usr/bin/env python3
"""Sample the mean luma of the base render inside each part's box across its window,
then pick the panel treatment from style.json panelContrast.

Do not choose by eye or by memory of how the room looked - a key light turned to face
the speaker instead of the wall moved one room's negative space from 173 to 145, which
crosses a threshold with nothing else changed.
"""
import json, subprocess, re

STYLE = json.load(open("../../styles/editorial/style.json"))
PC = STYLE["graphics"]["panelContrast"]
CANVAS_W, CANVAS_H = STYLE["canvas"]["width"], STYLE["canvas"]["height"]
SCALE = 3840 // CANVAS_W                      # 2x for 4K delivery

# Canvas-space box per part, from the plan's stated placement.
Z = STYLE["graphics"]["zones"]
LEFT   = (96, 100, 524, 880)                  # left column, x96-620
LOWER  = (96, 690, 1204, 290)                 # lower band, clipped to x96-1300 (clears the PiP)
LOWER_W= (96, 690, 1728, 290)                 # full-width lower band (no PiP under it)
TOP    = (96, 60, 1104, 220)
PANELR = (816, 100, 1008, 880)                # panel content column

# Each part's ACTUAL box, not the generic zone. Where a card only occupies part of a
# zone, the zone average is the wrong number - the end card measured 147.5 across the
# whole left column and 150.9 across the rows it really covers, which is a different
# treatment.
LOWER3 = (96, 700, 524, 200)                  # lower third: low in the left column
STACK  = (96, 240, 584, 600)                  # left-column stacked card
ENDC   = (96, 300, 584, 500)                  # end card, rows accumulating downward
HERO_L = (96, 230, 744, 620)                  # hero type in the left column (g001, g014)
LEFTC  = (96, 260, 744, 560)                  # left-column card, new x840 bound
LOWERD = (96, 690, 1204, 290)                 # lower band clear of the demo inset
CORR   = (700, 762, 340, 150)                 # correction chip, right of the lower third
BOX = {
 "g001": HERO_L,  "g002": LOWER3, "g003": PANELR, "g004": LOWER,
 "g005": LOWER,   "g006": LOWER,  "g007": LOWER,  "g008": LOWER,
 "g009": LOWER,   "g010": LOWER,  "g011": LOWER,  "g012": LOWER,
 "g013": STACK,   "g014": HERO_L, "g015": PANELR, "g016": ENDC,
 "g017": LOWERD,  "g018": LOWERD, "g019": LOWERD, "g020": LOWERD,
 "g021": LEFTC,  "g022": CORR,  "g023": LOWERD, "g024": LEFTC,
}

def luma(t, box):
    x, y, w, h = [v * SCALE for v in box]
    o = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.4f}", "-i", "outputs/.cache/base-cut-pcm.mov",
        "-frames:v", "1", "-vf", f"crop={w}:{h}:{x}:{y},signalstats,metadata=print:file=-",
        "-f", "null", "-"], capture_output=True, text=True).stdout
    m = re.search(r"YAVG=([\d.]+)", o)
    return float(m.group(1)) if m else None

def treat(l):
    if l < PC["light"]["maxLuma"]:              return "light"
    if l < PC["lightReinforced"]["maxLuma"]:    return "lightReinforced"
    return "inverted"

# A part sitting over a screen recording goes opaque - see panelContrast._screenBacked.
# Derived here rather than set by hand, so a new part cannot miss it.
_tc = json.load(open("outputs/transcript-cut.json"))
_demo = [(x["start"], x["end"]) for x in _tc["segments"] if x["scene"] == "demo"]

d = json.load(open("graphics-build/cutsheet.json"))
print(f"{'part':6s} {'box':16s} {'samples':28s} {'mean':>7s}  treatment")
print("-" * 84)
for p in d["parts"]:
    box = BOX[p["id"]]
    a, b = p["start"], p["end"]
    ts = [a + (b - a) * f for f in (0.1, 0.35, 0.6, 0.85)]
    vals = [v for v in (luma(t, box) for t in ts) if v is not None]
    mean = sum(vals) / len(vals)
    tr = treat(mean)
    # When a part's own window crosses a threshold, take the MORE ROBUST treatment
    # rather than the mean's. The thresholds exist so the panel edge survives; a beat
    # that straddles one would otherwise be legible for part of its run and marginal
    # for the rest, as the speaker moves and the wall behind them changes value.
    ORDER = ["light", "lightReinforced", "inverted"]
    seen = {treat(v) for v in vals}
    if len(seen) > 1:
        tr = max(seen, key=ORDER.index)
    # a part that crosses a threshold inside its own window is worth knowing about
    spread = max(vals) - min(vals)
    warn = f"  <- window spans a threshold, took the more robust" if len({treat(v) for v in vals}) > 1 else ""
    p["screenBacked"] = any(a < p["end"] and p["start"] < b for a, b in _demo)
    p["panel"] = {"box": box, "meanLuma": round(mean, 1),
                  "samples": [round(v, 1) for v in vals], "treatment": tr,
                  "fill": PC[tr].get("fill"), "opacity": PC[tr].get("opacity"),
                  "borderPx": PC[tr].get("borderPx"), "text": PC[tr].get("text"),
                  "shadow": PC[tr].get("shadow", False)}
    name = {LEFT:"leftColumn", LOWER:"lowerBand", LOWER_W:"lowerBand(wide)",
            TOP:"topBand", PANELR:"contentColumn", LOWER3:"lowerThird",
            STACK:"leftStack", ENDC:"endCard", HERO_L:"heroLeft",
            LEFTC:"leftCard", LOWERD:"lowerBand(demo)", CORR:"correction"}[box]
    sb = "  over-screen -> opaque" if p["screenBacked"] else ""
    print(f"{p['id']:6s} {name:16s} {str([round(v) for v in vals]):28s} {mean:7.1f}  {tr}{sb}{warn}")
# g001 and g014 are built as a matched callback pair - same box, same position, same
# rule. Splitting their treatment over a 1.6-luma difference makes one sit lifted off the
# frame and the other flat, side by side. Take the more robust of the two for both.
ORDER = ["light", "lightReinforced", "inverted"]
pair = [x for x in d["parts"] if x["id"] in ("g001", "g014")]
if len(pair) == 2:
    win = max((x["panel"]["treatment"] for x in pair), key=ORDER.index)
    for x in pair:
        if x["panel"]["treatment"] != win:
            print(f"  pair override: {x['id']} {x['panel']['treatment']} -> {win} (matches its callback partner)")
        x["panel"]["treatment"] = win
        for k, v in PC[win].items():
            if k in ("fill", "opacity", "borderPx", "text"):
                x["panel"][k] = v
        x["panel"]["shadow"] = PC[win].get("shadow", False)

json.dump(d, open("graphics-build/cutsheet.json", "w"), indent=1)
print(f"\nthresholds: light <{PC['light']['maxLuma']} | lightReinforced <{PC['lightReinforced']['maxLuma']} | inverted >=")
