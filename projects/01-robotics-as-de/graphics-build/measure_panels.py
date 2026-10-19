#!/usr/bin/env python3
"""Measure the base cut's luma inside each part's box, across its whole window.

style.json panelContrast keys on MEAN LUMA, and the thresholds are light <110,
lightReinforced 110-150, inverted >=150. Two rules from the style file that are
easy to get wrong:

  * when a part's own window CROSSES a threshold, take the MORE ROBUST treatment
    (light < lightReinforced < inverted), never the mean's. This room's left wall
    reads 147-156 and straddles 150, so a beat that spans it is otherwise legible
    for part of its run and marginal for the rest as the speaker moves.
  * a part sitting over a SCREEN RECORDING goes opaque regardless of measured
    luma. Mean luma cannot see detail density: a dark terminal full of bright
    syntax-coloured text measures the same as a dark shirt and wants the opposite
    treatment.

Boxes are given in 1920x1080 CANVAS units and doubled for the 4K base.
"""
import argparse, json, re, subprocess, sys

ORDER = ["light", "lightReinforced", "inverted"]


def treat(luma):
    if luma >= 150: return "inverted"
    if luma >= 110: return "lightReinforced"
    return "light"


def sample(video, t, box):
    x, y, w, h = [v * 2 for v in box]          # canvas -> 4K
    r = subprocess.run(
        ["ffmpeg", "-nostdin", "-hide_banner", "-nostats", "-ss", f"{t:.3f}",
         "-t", "0.5", "-i", video, "-an",
         "-vf", f"crop={w}:{h}:{x}:{y},signalstats,metadata=print:key=lavfi.signalstats.YAVG",
         "-f", "null", "-"], capture_output=True, text=True)
    vals = [float(m) for m in re.findall(r"YAVG=([\d.]+)", r.stdout + r.stderr)]
    return sum(vals) / len(vals) if vals else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", required=True)
    ap.add_argument("--cutsheet", required=True)
    ap.add_argument("--demo", required=True)
    ap.add_argument("--box", default="96,300,724,640",
                    help="canvas x,y,w,h of the left column where these parts sit")
    ap.add_argument("--samples", type=int, default=5)
    ap.add_argument("--only", default="")
    ap.add_argument("--out", default="")
    a = ap.parse_args()

    box = [int(v) for v in a.box.split(",")]
    demo = json.load(open(a.demo))
    d0, d1 = demo["enters"]["cutSeconds"], demo["leaves"]["cutSeconds"]
    parts = json.load(open(a.cutsheet))["parts"]
    if a.only:
        keep = set(a.only.split(","))
        parts = [p for p in parts if p["id"] in keep]

    out = {}
    for p in parts:
        s, e = p["start"], p["end"]
        ts = [s + (e - s) * i / (a.samples - 1) for i in range(a.samples)]
        ts = [min(max(t, s + 0.2), e - 0.2) for t in ts]
        vals = [v for v in (sample(a.base, t, box) for t in ts) if v is not None]
        if not vals:
            sys.exit(f"{p['id']}: could not sample the base")
        over_screen = not (e <= d0 or s >= d1)
        picks = [treat(v) for v in vals]
        robust = max(picks, key=lambda k: ORDER.index(k))
        chosen = "opaque" if over_screen else robust
        spans = len(set(picks)) > 1
        out[p["id"]] = {"min": round(min(vals), 1), "max": round(max(vals), 1),
                        "mean": round(sum(vals) / len(vals), 1),
                        "meanTreatment": treat(sum(vals) / len(vals)),
                        "spansThreshold": spans, "overScreen": over_screen,
                        "treatment": chosen}
        flag = "  SPANS A THRESHOLD -> took the more robust" if spans else ""
        scr = "  OVER SCREEN -> opaque" if over_screen else ""
        print(f"  {p['id']}  luma {min(vals):6.1f}-{max(vals):6.1f} "
              f"(mean {sum(vals)/len(vals):6.1f})  -> {chosen}{flag}{scr}")
    if a.out:
        json.dump(out, open(a.out, "w"), indent=1)
        print(f"\nwrote {a.out}")


main()
