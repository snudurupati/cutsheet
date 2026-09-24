#!/usr/bin/env python3
"""Measure every on-screen line against the real font files, before any render.

Non-negotiable 5 of the graphics skill: measure, do not estimate. A line sized
from a character count is how Satoshi came out as "DATA ENGI NEER" on a previous
job, and how a strike rule sized from character count came out visibly ragged.
PIL reads the same OTF files the composition loads, kerning included.

Rule 12: every input is an argument, and the gate cross-checks what it read
against the cut sheet before doing any work.

Usage:
    check_copy.py copy.json --cutsheet cutsheet.json --fonts fonts \\
                  --safe-width 960 --hook-floor 88 --body-floor 56
"""
import argparse, json, sys
from PIL import ImageFont

# Plaque padding is 44px a side, inside a 960px plaque: the real text width.
TEXT_W = 960 - 88 - 12          # padding both sides, plus the 6px border both sides


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("copy")
    ap.add_argument("--cutsheet", required=True)
    ap.add_argument("--fonts", required=True)
    ap.add_argument("--safe-width", type=float, default=960.0)
    ap.add_argument("--hook-floor", type=float, default=88.0)
    ap.add_argument("--body-floor", type=float, default=56.0)
    ap.add_argument("--max-words", type=int, default=8)
    ap.add_argument("--max-lines", type=int, default=2)
    a = ap.parse_args()

    copy = json.load(open(a.copy))
    cs = {p["id"]: p for p in json.load(open(a.cutsheet))["parts"]}

    # Prove the two files describe the same edit before measuring anything.
    for pid, c in copy["parts"].items():
        if pid not in cs:
            sys.exit(f"ERROR {pid} is in copy.json but not in the cut sheet")
        if abs(cs[pid]["start"] - c["start"]) > 1e-6 or abs(cs[pid]["end"] - c["end"]) > 1e-6:
            sys.exit(f"ERROR {pid} spans differ: copy {c['start']}-{c['end']} "
                     f"vs cutsheet {cs[pid]['start']}-{cs[pid]['end']}")
    if set(copy["parts"]) != set(cs):
        sys.exit(f"ERROR parts differ: copy {sorted(copy['parts'])} vs cutsheet {sorted(cs)}")

    def face(name, px):
        return ImageFont.truetype(f"{a.fonts}/{name}", int(round(px)))

    errs, rows = [], []
    HOOKS = {"g001", "g007"}

    for pid, c in copy["parts"].items():
        floor = a.hook_floor if pid in HOOKS else a.body_floor
        # A floor may be missed only where the copy PHYSICALLY cannot reach it,
        # and only with the measurement on the record in copy.json.
        exc = copy.get("floorExceptions", {}).get(pid)
        if exc:
            floor = exc["px"]
            print(f"  NOTE {pid}: floor {exc['floor']}px -> {exc['px']}px. {exc['why']}")
        if len(c["lines"]) > a.max_lines:
            errs.append(f"{pid}: {len(c['lines'])} headline lines, max {a.max_lines}")
        for i, line in enumerate(c["lines"]):
            px = c["px"]
            w = face("Satoshi-Black.otf", px).getlength(line)
            words = len(line.split())
            rows.append((pid, f"hl{i}", line, px, w, words))
            if px < floor:
                errs.append(f"{pid} hl{i}: {px}px is below the {floor:.0f}px floor")
            if w > TEXT_W:
                errs.append(f"{pid} hl{i}: \"{line}\" measures {w:.0f}px at {px}px, "
                            f"and the plaque's text column is {TEXT_W}px. "
                            f"Largest size that fits: {TEXT_W / w * px:.1f}px")
            if words > a.max_words:
                errs.append(f"{pid} hl{i}: {words} words, max {a.max_words}")
        if c["support"]:
            px = c["supportPx"]
            w = face("Satoshi-Medium.otf", px).getlength(c["support"])
            rows.append((pid, "sup", c["support"], px, w, len(c["support"].split())))
            if px < a.body_floor:
                errs.append(f"{pid} support: {px}px is below the {a.body_floor:.0f}px floor")
            if w > TEXT_W:
                errs.append(f"{pid} support: measures {w:.0f}px, column is {TEXT_W}px")
        if c["eyebrow"]:
            px = c["eyebrowPx"]
            # letter-spacing .16em, uppercased by CSS
            w = face("Satoshi-Bold.otf", px).getlength(c["eyebrow"].upper()) + px * .16 * len(c["eyebrow"])
            rows.append((pid, "eyebrow", c["eyebrow"], px, w, len(c["eyebrow"].split())))
            if w > TEXT_W:
                errs.append(f"{pid} eyebrow: measures {w:.0f}px, column is {TEXT_W}px")
        if c["plaqueBottom"] > c["plaqueMax"]:
            errs.append(f"{pid}: plaque bottom {c['plaqueBottom']}px exceeds {c['plaqueMax']}px "
                        f"and would run into the player's control band")

    # Art-field labels, measured in the same pass so nothing on screen is unmeasured.
    for pid, labels in copy.get("labels", {}).items():
        for text, px in labels:
            w = face("Satoshi-Bold.otf", px).getlength(text)
            rows.append((pid, "label", text, px, w, len(text.split())))
            if w > a.safe_width:
                errs.append(f"{pid} label \"{text}\": {w:.0f}px exceeds the {a.safe_width:.0f}px safe width")

    print(f"{'part':6} {'slot':8} {'text':38} {'px':>5} {'width':>7} {'fits':>6}")
    for pid, slot, text, px, w, words in rows:
        lim = TEXT_W if slot in ("hl0", "hl1", "sup", "eyebrow") else a.safe_width
        print(f"{pid:6} {slot:8} {text[:38]:38} {px:5} {w:7.0f} {'ok' if w <= lim else 'OVER':>6}")

    if errs:
        print("\nFAIL")
        for e in errs:
            print("  " + e)
        sys.exit(1)
    print(f"\nPASS: every line fits its column, meets its size floor, and is within "
          f"{a.max_words} words and {a.max_lines} lines")


main()
