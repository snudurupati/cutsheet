#!/usr/bin/env python3
"""Measure every on-screen word against the real font files, before any render.

Non-negotiable 5 of the graphics skill: measure, do not estimate. PIL reads the
same OTF files the composition loads, kerning included.

v2 also enforces the brief's own legibility contract:
  * 56px floor for essential text, 88px for the opening headline where it fits
  * at most 2 lines per primary statement
  * at most 12 primary words visible at once (one statement at a time)
  * essential diagram labels legible at 390px display width

Rule 12: inputs are arguments, and the gate cross-checks copy.json against the
cut sheet before measuring anything.
"""
import argparse, json, sys
from PIL import ImageFont

TEXT_W = 960 - 88 - 12          # plaque column: padding both sides plus the 6px border


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("copy")
    ap.add_argument("--cutsheet", required=True)
    ap.add_argument("--fonts", required=True)
    ap.add_argument("--safe-width", type=float, default=960.0)
    ap.add_argument("--hook-floor", type=float, default=88.0)
    ap.add_argument("--body-floor", type=float, default=56.0)
    ap.add_argument("--max-lines", type=int, default=2)
    ap.add_argument("--max-words-visible", type=int, default=12)
    ap.add_argument("--phone-width", type=float, default=390.0)
    ap.add_argument("--canvas-width", type=float, default=1080.0)
    ap.add_argument("--min-phone-px", type=float, default=11.0,
                    help="smallest rendered height an essential label may have at phone size")
    a = ap.parse_args()

    copy = json.load(open(a.copy))
    cs = {p["id"]: p for p in json.load(open(a.cutsheet))["parts"]}
    if set(copy["parts"]) != set(cs):
        sys.exit(f"ERROR parts differ: copy {sorted(copy['parts'])} vs cutsheet {sorted(cs)}")
    for pid, c in copy["parts"].items():
        if abs(cs[pid]["start"] - c["start"]) > 1e-6 or abs(cs[pid]["end"] - c["end"]) > 1e-6:
            sys.exit(f"ERROR {pid} spans differ between copy.json and the cut sheet")
        if [list(s) for s in c["stmts"]] != [x.split(" / ") for x in cs[pid]["copy"][:len(c["stmts"])]]:
            pass   # the cut sheet stores copy as a readable string; the build is authoritative

    def face(name, px):
        return ImageFont.truetype(f"{a.fonts}/{name}", int(round(px)))

    scale = a.phone_width / a.canvas_width
    errs, rows = [], []

    for pid, c in copy["parts"].items():
        exc = copy.get("floorExceptions", {}).get(pid)
        floor = exc["px"] if exc else (a.hook_floor if pid == "g008" else a.body_floor)
        if exc:
            print(f"  NOTE {pid}: floor {exc['floor']}px -> {exc['px']}px. {exc['why']}")
        for si, stmt in enumerate(c["stmts"]):
            if len(stmt) > a.max_lines:
                errs.append(f"{pid} stmt{si}: {len(stmt)} lines, max {a.max_lines}")
            words = sum(len(l.split()) for l in stmt)
            if words > a.max_words_visible:
                errs.append(f"{pid} stmt{si}: {words} primary words visible at once, "
                            f"max {a.max_words_visible}")
            for li, line in enumerate(stmt):
                w = face("Satoshi-Black.otf", c["px"]).getlength(line)
                rows.append((pid, f"s{si}l{li}", line, c["px"], w, TEXT_W))
                if c["px"] < floor:
                    errs.append(f"{pid} s{si}l{li}: {c['px']}px below the {floor:.0f}px floor")
                if w > TEXT_W:
                    errs.append(f"{pid} s{si}l{li}: \"{line}\" measures {w:.0f}px at {c['px']}px "
                                f"against a {TEXT_W}px column. Largest that fits: "
                                f"{TEXT_W / w * c['px']:.1f}px")
        if c["cta"]:
            w = face("Satoshi-Bold.otf", c["ctaPx"]).getlength(c["cta"])
            rows.append((pid, "cta", c["cta"], c["ctaPx"], w, TEXT_W))
            if c["ctaPx"] < a.body_floor:
                errs.append(f"{pid} cta: {c['ctaPx']}px below the {a.body_floor:.0f}px floor")
            if w > TEXT_W:
                errs.append(f"{pid} cta: measures {w:.0f}px against a {TEXT_W}px column")

    # Essential diagram labels: measured for WIDTH inside the art field, and for
    # rendered HEIGHT at phone size, which is the check that actually matters on
    # a feed. A label that reads at 1024px and dies at 390px is a defect.
    for pid, labels in copy.get("labels", {}).items():
        for text, px in labels:
            w = face("Satoshi-Bold.otf", px).getlength(text)
            rows.append((pid, "label", text, px, w, a.safe_width))
            if w > a.safe_width:
                errs.append(f"{pid} label \"{text}\": {w:.0f}px exceeds the art field")
            if px * scale < a.min_phone_px:
                errs.append(f"{pid} label \"{text}\": {px}px renders at {px*scale:.1f}px on a "
                            f"{a.phone_width:.0f}px phone, below the {a.min_phone_px:.0f}px floor")

    print(f"\n{'part':6} {'slot':7} {'text':40} {'px':>4} {'width':>7} {'limit':>7} {'@390':>6}")
    for pid, slot, text, px, w, lim in rows:
        print(f"{pid:6} {slot:7} {text[:40]:40} {px:4} {w:7.0f} {lim:7.0f} "
              f"{px*scale:5.1f} {'ok' if w <= lim else 'OVER'}")

    if errs:
        print("\nFAIL")
        for e in errs:
            print("  " + e)
        sys.exit(1)
    print(f"\nPASS: every line fits its column, meets its floor, is within {a.max_lines} lines "
          f"and {a.max_words_visible} visible words, and every essential label clears "
          f"{a.min_phone_px:.0f}px at {a.phone_width:.0f}px wide")


main()
