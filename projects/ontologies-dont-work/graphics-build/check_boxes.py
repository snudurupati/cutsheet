#!/usr/bin/env python3
"""Audit every piece of SVG text against the box that is supposed to contain it.

The reported defect was "boxes don't fit the text and misaligned things", and
contact sheets at phone size were not catching it. Every gate in this pipeline so
far measures frames, pixels, durations or the ink bounding box of a WHOLE part.
None of them can see that one label is 6px wider than its card, or that a badge
and a field row are touching.

So this parses the emitted composition, computes the real bounding box of every
<text> from the same per-character advances the build uses, and reports:

  SPILL   text wider or taller than the rect that encloses its anchor
  COLLIDE two text boxes overlapping
  TOUCH   a text box closer than --pad to another text box
  EDGE    text closer than --inset to its enclosing rect's border

Rule 12: paths and thresholds are arguments, and the part list comes from the cut
sheet rather than a glob, so a part that failed to emit is an error, not a skip.
"""
import argparse, json, os, re, sys

TEXT = re.compile(r'<text\b([^>]*)>(.*?)</text>', re.S)
RECT = re.compile(r'<rect\b([^>]*?)/>', re.S)
GOPEN = re.compile(r'<g\b([^>]*?)>')
ATTR = re.compile(r'([\w:-]+)\s*=\s*"([^"]*)"')


def attrs(s):
    return {k: v for k, v in ATTR.findall(s)}


def fnum(d, k, default=0.0):
    try:
        return float(d.get(k, default))
    except (TypeError, ValueError):
        return default


def text_width(s, px, face, tracking, CW):
    return sum(CW[face].get(c, 0.55) for c in s) * px + tracking * max(0, len(s))


def parse(html, CW):
    """Return (texts, rects) in the SVG's own user space, applying g transforms."""
    body = html[html.index("<svg"):html.rindex("</svg>")]
    texts, rects, stack = [], [], [(0.0, 0.0, 1.0)]
    pos = 0
    tok = re.compile(r'<g\b([^>]*?)>|</g>|<text\b([^>]*)>(.*?)</text>|'
                     r'<rect\b([^>]*?)/>|<path\b([^>]*?)/>', re.S)
    hidden = [False]
    for m in tok.finditer(body):
        tx, ty, sc = stack[-1]
        if m.group(0).startswith("</g"):
            if len(stack) > 1:
                stack.pop()
            if len(hidden) > 1:
                hidden.pop()
            continue
        if m.group(0).startswith("<g"):
            a = attrs(m.group(1) or "")
            t = a.get("transform", "")
            dx = dy = 0.0
            s = 1.0
            mt = re.search(r'translate\(\s*([-\d.]+)[ ,]+([-\d.]+)\s*\)', t)
            ms = re.search(r'scale\(\s*([-\d.]+)\s*\)', t)
            if mt:
                dx, dy = float(mt.group(1)), float(mt.group(2))
            if ms:
                s = float(ms.group(1))
            stack.append((tx + dx * sc, ty + dy * sc, sc * s))
            # An element stacked for a timed swap is authored opacity="0"; it is
            # not on screen at the same moment as the one it replaces.
            hidden.append(hidden[-1] or a.get("opacity", "") == "0")
            continue
        if m.group(0).startswith("<text"):
            a = attrs(m.group(2) or "")
            raw = re.sub(r'<[^>]+>', '', m.group(3) or '').strip()
            if not raw:
                continue
            px = fnum(a, "font-size", 30) * sc
            face = "black" if "Black" in a.get("font-family", "") else "bold"
            trk = fnum(a, "letter-spacing", 0) * sc
            w = text_width(raw, px, face, trk, CW)
            x = tx + fnum(a, "x") * sc
            y = ty + fnum(a, "y") * sc
            anchor = a.get("text-anchor", "start")
            x0 = x - w / 2 if anchor == "middle" else (x - w if anchor == "end" else x)
            # Satoshi cap height ~0.72em, descender ~0.21em, measured off the baseline.
            texts.append({"t": raw, "x0": x0, "x1": x0 + w, "w": round(w, 1),
                          "y0": y - px * 0.74, "y1": y + px * 0.22,
                          "px": round(px, 1), "hidden": hidden[-1]})
            continue
        if m.group(4) is not None:
            a = attrs(m.group(4))
            rects.append({"x0": tx + fnum(a, "x") * sc, "y0": ty + fnum(a, "y") * sc,
                          "x1": tx + (fnum(a, "x") + fnum(a, "width")) * sc,
                          "y1": ty + (fnum(a, "y") + fnum(a, "height")) * sc,
                          "solid": True})
            continue
        # A card body or a document drawn as a path: take its coordinate extent.
        a = attrs(m.group(5) or "")
        nums = [float(v) for v in re.findall(r'-?\d+\.?\d*', a.get("d", ""))]
        if len(nums) >= 6:
            xs, ys = nums[0::2], nums[1::2]
            rects.append({"x0": tx + min(xs) * sc, "y0": ty + min(ys) * sc,
                          "x1": tx + max(xs) * sc, "y1": ty + max(ys) * sc,
                          "solid": a.get("fill", "none") != "none"})
    return texts, rects


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cutsheet", required=True)
    ap.add_argument("--parts", required=True)
    ap.add_argument("--charw", required=True)
    ap.add_argument("--inset", type=float, default=8.0,
                    help="min gap between text and the border of the rect containing it")
    ap.add_argument("--align", type=float, default=10.0,
                    help="two edges closer than this, but not equal, read as a misalignment")
    ap.add_argument("--pad", type=float, default=6.0,
                    help="min gap between two text boxes")
    a = ap.parse_args()

    CW = json.load(open(a.charw))
    parts = [p["id"] for p in json.load(open(a.cutsheet))["parts"]]
    bad = []
    for pid in parts:
        f = os.path.join(a.parts, pid, "index.html")
        if not os.path.exists(f):
            sys.exit(f"ERROR {pid}: {f} does not exist")
        texts, rects = parse(open(f).read(), CW)
        print(f"\n{pid}: {len(texts)} text runs, {len(rects)} rects")
        for t in texts:
            # the smallest rect that contains the text's own anchor point
            cand = [r for r in rects
                    if r["x0"] - 2 <= t["x0"] <= r["x1"] + 2
                    and r["y0"] - 2 <= (t["y0"] + t["y1"]) / 2 <= r["y1"] + 2
                    and (r["y1"] - r["y0"]) >= (t["y1"] - t["y0"]) * 1.15
                    and (r["x1"] - r["x0"]) * (r["y1"] - r["y0"])
                        >= (t["x1"] - t["x0"]) * (t["y1"] - t["y0"])]
            if cand:
                r = min(cand, key=lambda r: (r["x1"] - r["x0"]) * (r["y1"] - r["y0"]))
                over_r = t["x1"] - (r["x1"] - a.inset)
                over_l = (r["x0"] + a.inset) - t["x0"]
                over_b = t["y1"] - (r["y1"] - 2)
                over_t = (r["y0"] + 2) - t["y0"]
                if over_r > 0 or over_l > 0 or over_b > 0 or over_t > 0:
                    worst = max(over_r, over_l, over_b, over_t)
                    side = ("right" if worst == over_r else "left" if worst == over_l
                            else "bottom" if worst == over_b else "top")
                    bad.append(f'{pid} SPILL  "{t["t"]}" {t["px"]}px measures {t["w"]:.0f}px and '
                               f'passes its {r["x1"]-r["x0"]:.0f}x{r["y1"]-r["y0"]:.0f} box\'s '
                               f'{side} edge by {worst:.0f}px')
        for i in range(len(texts)):
            for j in range(i + 1, len(texts)):
                p, q = texts[i], texts[j]
                if p["hidden"] or q["hidden"]:
                    continue
                gx = max(p["x0"], q["x0"]) - min(p["x1"], q["x1"])
                gy = max(p["y0"], q["y0"]) - min(p["y1"], q["y1"])
                if gx < 0 and gy < 0:
                    bad.append(f'{pid} COLLIDE "{p["t"]}" and "{q["t"]}" overlap by '
                               f'{-gx:.0f}x{-gy:.0f}px')
                elif gx < a.pad and gy < a.pad and gx < 0:
                    bad.append(f'{pid} TOUCH  "{p["t"]}" and "{q["t"]}" are {-gy:.0f}px apart '
                               f'vertically (min {a.pad:.0f})')
        # NEAR-MISS ALIGNMENT. Two edges that are meant to line up and are a few
        # pixels apart read as a mistake, where a deliberate offset does not.
        # Anything within --align of another edge but not equal to it is suspect.
        big = [r for r in rects
               if r.get("solid", True)
               and (r["x1"] - r["x0"]) >= 120 and (r["y1"] - r["y0"]) >= 60]
        def name(r):
            return (f'[{r["x0"]:.0f},{r["y0"]:.0f} {r["x1"]-r["x0"]:.0f}x'
                    f'{r["y1"]-r["y0"]:.0f}]')
        for k, get in (("left", lambda r: r["x0"]), ("right", lambda r: r["x1"]),
                       ("top", lambda r: r["y0"]), ("bottom", lambda r: r["y1"])):
            for i in range(len(big)):
                for j in range(i + 1, len(big)):
                    d = abs(get(big[i]) - get(big[j]))
                    if 0 < d <= a.align:
                        bad.append(f"{pid} ALIGN  {k} edges {d:.0f}px apart: "
                                   f"{name(big[i])} vs {name(big[j])}")

    if bad:
        print(f"\nFAIL: {len(bad)} geometry problems")
        for b in bad:
            print("  " + b)
        sys.exit(1)
    print("\nPASS: every text fits the box that contains it, and no two texts collide")


main()
