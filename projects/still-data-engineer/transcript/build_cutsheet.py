#!/usr/bin/env python3
"""Build cutsheet.json from the durable transcript.

Cut depth differs by section: talking-head sections take the tight treatment,
screen sections take only the long dead air, because cutting inside a screen
recording makes the screen jump. Every boundary snaps to the frame grid.
"""
import json, re

FPS = 30
# Snap starts DOWN and ends UP. Rounding to the nearest frame can land inside the
# first or last word and clip it - that is how "Can AI really replace my job?"
# became "AI really replace my job?".
import math
floor_f = lambda t: math.floor(t * FPS)
ceil_f  = lambda t: math.ceil(t * FPS)

# Sections. gap = silence longer than this gets closed.
# scene = which clip is on screen for this stretch.
SECTIONS = [
    # part, start,  end,    id,               scene,  gap,  label
    ("p1",   12.79, 101.00, "intro",          "head", 0.7,  "Hook, credentials, the tweet, the question"),
    # The deck does not come up until 99s - the screen still shows the desktop before
    # that - so the demo scene opens on "So here's a setup, right?" at 101.45, not on
    # "what do I plan to show you?" at 96.1. Measured, not assumed.
    ("p1",  101.00, 357.60, "setup",          "demo", 2.5,  "The setup: business, four source systems, the stack"),
    ("p1",  357.60, 392.40, "KILL-housekeep", None,   0,    "'take a pause, cut' + 'demo starting in one two three'"),
    ("p1",  392.40,2020.00, "demo-sources",   "demo", 2.5,  "Environment, prompt 1, sources + 40 tests, freshness check"),
    ("p1", 2020.00,3407.00, "demo-staging",   "demo", 2.5,  "Staging: 8 models, 119 tests, incremental, POS refunds"),
    ("p2",   14.30,  19.90, "shutdown",       "head", 0.7,  "The camera overheated beat - kept deliberately"),
    ("p2",   19.90, 924.00, "demo-voids",     "demo", 2.5,  "Voids, the hallucination catch, the file-count problem"),
    ("p2",  924.00,1174.60, "verdict",        "head", 0.7,  "Am I still a data engineer - yes. The threefold pattern"),
    ("p2", 1174.60,1270.50, "outro",          "head", 0.7,  "The tweet callback, the channels, thank you"),
]

tr = json.load(open("transcript/transcript.json"))
words = {"p1": [], "p2": []}
for seg in tr["segments"]:
    for w in seg["words"]:
        if w.get("start") is not None:
            words[seg["part"]].append(w)
for k in words:
    words[k].sort(key=lambda w: w["start"])

PAD_IN, PAD_OUT = 0.12, 0.28   # breathe before the first word, let the last ring out
HARD_GAP  = 1.5   # a pause this long is always worth closing, clause or not
ORPHAN    = 1.2   # a run shorter than this is a fragment, not a segment - merge it back

def ends_clause(w):
    return w["word"].strip().endswith((".", "?", "!", ",", ";", ":"))

segments, sid = [], 0
report = []
for part, s0, s1, sec_id, scene, gap, label in SECTIONS:
    if scene is None:
        report.append((sec_id, s1 - s0, 0.0, 0, label))
        continue
    ws = [w for w in words[part] if w["start"] >= s0 and w["end"] <= s1]
    if not ws:
        continue
    runs, cur, prev = [], [ws[0]["start"], ws[0]["end"]], ws[0]
    for w in ws[1:]:
        g = w["start"] - cur[1]
        # Close a pause only at a real boundary. Cutting inside a clause reads
        # perfectly on the page and sounds robotic in the room.
        if g > HARD_GAP or (g > gap and ends_clause(prev)):
            runs.append(tuple(cur)); cur = [w["start"], w["end"]]
        else:
            cur[1] = w["end"]
        prev = w
    runs.append(tuple(cur))

    # fold orphan fragments back into the run before them
    merged = []
    for r in runs:
        if merged and (r[1] - r[0]) < ORPHAN:
            merged[-1] = (merged[-1][0], r[1])
        else:
            merged.append(r)
    runs = merged

    for a, b in runs:
        fa = floor_f(max(s0 - PAD_IN, a - PAD_IN))
        fb = ceil_f(min(s1 + PAD_OUT, b + PAD_OUT))
        a, b = fa / FPS, fb / FPS
        if b - a < 0.4:            # too short to survive as a segment
            continue
        # overlap test, so a word straddling the boundary is still counted
        text = " ".join(w["word"] for w in ws if w["end"] > a and w["start"] < b)
        sid += 1
        # Frame numbers are authoritative. Rounding a time to 3 decimals throws
        # frame-exactness away at 30fps, because 1/30 has no finite decimal form -
        # which is exactly the drift hard rule 5 exists to stop.
        segments.append({
            "id": f"s{sid:03d}", "section": sec_id, "part": part, "scene": scene,
            "srcCamera": tr["parts"][0 if part == "p1" else 1]["camera"],
            "srcScreen": tr["parts"][0 if part == "p1" else 1]["screen"],
            "startFrame": fa, "endFrame": fb, "frames": fb - fa,
            "start": fa / FPS, "end": fb / FPS, "dur": (fb - fa) / FPS,
            "text": text, "keep": True,
        })
    kept = sum(x[1] - x[0] for x in runs)
    report.append((sec_id, s1 - s0, kept, len(runs), label))

total_src = sum(r[1] for r in report)
total_out = sum(s["dur"] for s in segments)
# Trim retake seams. When a pause was a restart, the phrase before the pause
# repeats after it; keeping both reads as a stutter. Take the last one, always,
# and pull the earlier segment's out point back in front of the repeat.
def norm(t):
    return [w for w in re.sub(r"[^a-z ]", "", t.lower()).split() if w]

DANGLING = {"so", "and", "but", "then", "because", "which", "that", "uh"}


def trim_seam(a, b):
    """Pull a's out point back off a repeated phrase or a dangling conjunction."""
    ta, tb = norm(a["text"]), norm(b["text"])
    rep = 0
    for n in range(6, 1, -1):
        if len(ta) >= n and len(tb) >= n and ta[-n:] == tb[:n]:
            rep = n
            break
    drop = rep if rep else (1 if ta and ta[-1] in DANGLING else 0)
    if not drop:
        return False
    aw = [w for w in words[a["part"]]
          if w["start"] >= a["start"] and w["end"] <= a["end"] and norm(w["word"])]
    if len(aw) <= drop:
        return False
    nf = floor_f(aw[-drop]["start"] + 0.06)   # let the previous word ring out a little
    if nf <= a["startFrame"]:
        return False
    a["endFrame"] = nf
    a["frames"] = nf - a["startFrame"]
    a["end"] = nf / FPS
    a["dur"] = a["frames"] / FPS
    a["text"] = " ".join(w["word"] for w in aw[:-drop])
    a["seamFade"] = 0.12                      # fade out so the kept word does not clip
    return True


# Trimming one seam can expose another underneath it, so iterate to a fixed point.
for _ in range(4):
    changed = False
    for part in ("p1", "p2"):
        ps = [x for x in segments if x["part"] == part]
        for a, b in zip(ps, ps[1:]):
            changed |= trim_seam(a, b)
    if not changed:
        break

# A restart the seam-trimmer could not see: it only compares across segment JOINS, and
# this repeat sits inside one run with the spoken word "cut" between the two takes.
# "So in this case, | I choose the modern data stack | cut. | I choose the modern data
# stack." Keep the last one, always.
KILL_INSIDE = [
    ("p1", 259.90, 265.38),   # source seconds: the first take plus the word "cut"
]
for part, ka, kb in KILL_INSIDE:
    out = []
    for x in segments:
        if x["part"] != part or x["end"] <= ka or x["start"] >= kb:
            out.append(x); continue
        if x["start"] < ka:                       # trim this segment's tail back
            nf = floor_f(ka)
            if nf > x["startFrame"]:
                x["endFrame"] = nf; x["frames"] = nf - x["startFrame"]
                x["end"] = nf / FPS; x["dur"] = x["frames"] / FPS
                x["seamFade"] = 0.12
                out.append(x)
        elif x["end"] > kb:                       # push this segment's head forward
            nf = ceil_f(kb)
            if nf < x["endFrame"]:
                x["startFrame"] = nf; x["frames"] = x["endFrame"] - nf
                x["start"] = nf / FPS; x["dur"] = x["frames"] / FPS
                out.append(x)
    segments = out

# Any segment whose bounds moved needs its text re-derived, or the cutsheet describes a
# line that is no longer in the cut.
for x in segments:
    ws = [w for w in words[x["part"]]
          if w["end"] > x["start"] and w["start"] < x["end"]]
    x["text"] = " ".join(w["word"] for w in ws)

# The shutdown line is kept as a beat by request, but as a demo beat, not a head
# beat: a head beat here would take the picture-in-picture out and put it back six
# seconds later, and style.md calls that bounce the most amateur-looking move an
# editor can make. The screen hard-cuts from part 1 to part 2 underneath it anyway.
for x in segments:
    if x["section"] == "shutdown":
        x["scene"] = "demo"

# Adjacent sections share a boundary, so out-padding from one and in-padding from
# the next can meet and overlap. Trim the earlier segment back; the overlap only
# ever falls in a pause, so nothing spoken is lost.
for part in ("p1", "p2"):
    ps = [x for x in segments if x["part"] == part]
    for a, b in zip(ps, ps[1:]):
        if b["startFrame"] < a["endFrame"]:
            a["endFrame"] = b["startFrame"]
            a["frames"] = a["endFrame"] - a["startFrame"]
            a["end"] = a["endFrame"] / FPS
            a["dur"] = a["frames"] / FPS
segments = [x for x in segments if x["frames"] > 0]

runs, cur = [], None
for x in segments:
    if x["scene"] == "demo":
        cur = [x["id"], x["id"]] if cur is None else [cur[0], x["id"]]
    elif cur:
        runs.append(tuple(cur)); cur = None
if cur:
    runs.append(tuple(cur))
if segments:
    for a, b in runs:
        next(x for x in segments if x["id"] == a)["insetEnter"] = True
        next(x for x in segments if x["id"] == b)["insetExit"] = True

json.dump({"video": "still-data-engineer", "fps": FPS, "cutDepth": "medium",
           "note": "startFrame/endFrame are authoritative; start/end are derived.",
           "demoRuns": [{"from": a, "to": b} for a, b in runs],
           "segments": segments},
          open("transcript/cutsheet.json", "w"), indent=1)

# Regenerating segments wipes every derived flag. The browser/bookmark-blur flags are a
# PRIVACY control, not a cosmetic one, so they are re-derived here rather than left to a
# separate script somebody has to remember to re-run. On 2026-08-20 exactly that was
# forgotten and a render shipped with the speaker's 401K and HSA bookmarks readable.
import subprocess as _sp
print("re-deriving screen flags (browser / bookmark blur)...")
_r = _sp.run(["python3", "transcript/classify_screen.py"], capture_output=True, text=True)
if _r.returncode != 0:
    raise SystemExit("classify_screen.py failed:\n" + _r.stderr[-800:])
print("  " + [l for l in _r.stdout.strip().split("\n") if "demo segments show" in l][0].strip())

print(f"{'section':16s} {'source':>9s} {'kept':>9s} {'cut':>9s}  {'segs':>4s}  label")
print("-" * 105)
for sec, src, kept, n, label in report:
    print(f"{sec:16s} {src/60:8.1f}m {kept/60:8.1f}m {(src-kept)/60:8.1f}m  {n:4d}  {label}")
print("-" * 105)
print(f"{'TOTAL':16s} {total_src/60:8.1f}m {total_out/60:8.1f}m {(total_src-total_out)/60:8.1f}m  {len(segments):4d}")
