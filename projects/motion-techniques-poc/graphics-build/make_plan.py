#!/usr/bin/env python3
"""Write the POC cut sheet. Times are cut-timeline seconds snapped to the 30fps grid.

Reused parts keep the exact windows they shipped with in 01-robotics-as-de (read from that
job's cutsheet, passed in, never hardcoded), so their renders drop in unchanged.
"""
import argparse, json, sys

ap = argparse.ArgumentParser()
ap.add_argument("--source-cutsheet", required=True)
ap.add_argument("--cut-transcript", required=True)
ap.add_argument("--out", required=True)
a = ap.parse_args()

src = {p["id"]: p for p in json.load(open(a.source_cutsheet))["parts"]}
cut = json.load(open(a.cut_transcript))
FPS = cut["fps"]
words = cut["words"]

def cue(word, near):
    """Start time of the spoken word closest to `near`. Fails loudly if it is not there."""
    c = [w for w in words if w["word"].strip(".,?!").lower() == word.lower() and abs(w["start"] - near) < 1.5]
    if not c:
        sys.exit(f"cue {word!r} near {near} not in transcript")
    return round(min(c, key=lambda w: abs(w["start"] - near))["start"], 3)

f = lambda t: int(round(t * FPS))
parts = []

def add(pid, start, end, kind, cls, direction, cues=None, track="main", builtBy="hyperframes", reuse=None):
    sf, ef = f(start), f(end)
    p = {"id": pid, "start": round(sf / FPS, 6), "end": round(ef / FPS, 6), "startFrame": sf, "endFrame": ef,
         "kind": kind, "class": cls, "track": track, "builtBy": builtBy, "direction": direction, "cues": cues or {}}
    if reuse:
        p["reuse"] = reuse
    parts.append(p)

def reuse(pid, end_override=None, note=""):
    s = src[pid]
    end = end_override if end_override is not None else s["end"]
    add(pid, s["start"], end, s["kind"], s["class"],
        f"REUSED unchanged from 01-robotics-as-de ({pid}). {note}{s['direction']}",
        s.get("cues"), builtBy=s.get("builtBy", "hyperframes"),
        track="push" if s.get("builtBy") == "push" else "main", reuse="01-robotics-as-de")

# Opening restored exactly as shipped (human 2026-10-25, after the composition review: the montage
# with the humanoid lifting a cup is the channel's benchmark; the map's first visit moved to 2:34).
for pid in ("gP1", "g01", "g01b"):
    reuse(pid)

for pid in ("g03", "g04", "g05", "g06"):
    reuse(pid)

add("d1", src["g07"]["start"], cue("big", 150.24) + 1.2, "stat", "overlay",   # 1.2s past "big data"; 3s of face before m2 (composition review N4)
    "TECHNIQUE 5 (counting with dots); replaces g07. Card in the same box. '80,000' counts up in display 900 and finishes "
    "ON 'eighty thousand', label 'LeRobot datasets on Hugging Face'. Under it a dot field, one dot per 100 datasets: "
    "800 dots in a 40x20 grid sweep in left to right just after the number lands. On '1,100' all but 11 dots drop to "
    "$rule and the 11 hold in $accent with '2024: 1,100' beside them; on '2024' the field re-lights left to right so "
    "the gap is seen, not stated. On 'million' the field compresses up and '1M+ trajectories' lands below; on "
    "'robots' a 10x10 grid of 100 small robot dots appears, each emitting a short motif line rightward. On 'teleop', "
    "'fleet', 'metadata' three labelled stream lines join the flow. The streams never stop to the end of the part. "
    "Figures as spoken, not verified by the pipeline.",
    {"n80": cue("80,000", 120.51), "n1100": cue("1,100", 126.06), "y2024": cue("2024", 126.95),
     "million": cue("million", 133.59), "robots": cue("robots", 137.07), "teleop": cue("teleoperation", 139.82),
     "fleet": cue("fleet", 141.46), "metadata": cue("metadata", 143.74), "big": cue("big", 150.24)})

add("m2", cue("robotics", 154.66) - 0.15, 214.5, "diagram", "overlay",   # enters on "robotics" (N2, N4)
    "TECHNIQUES 3, 4 and 7: the map's FIRST visit, a lens opens, a card builds. ROBOTICS lands in $accent on "
    "'robotics'. On 'enterprise', 'web text', 'industrial IoT' each node lifts in turn with a small '≠' tag on the edge "
    "back to ROBOTICS. On 'Physical telemetry' the ROBOTICS node grows into a circular LENS (about 440px) centred in the "
    "card; the rest of the map stays visible, dimmed, around it (focus plus context). Inside the lens, building card "
    "(technique 7): on 'single moment' a frame tile with 't = 12.400 s'; then chips land under it on their words: "
    "camera frames, joints, commands, timestamp (the one $accent). On 'sensors' the chips unspool into five motif "
    "lines, each ticking at its own rate. On 'downsampling' the two camera lines thin out. On 'streams' all five lock to "
    "one rate and keep scrolling; on 'drift' the joints line slips half a tick and turns $accent; on 'crashes' a muted "
    "'no errors' lands beside it. On 'frontier' the lens collapses back into the ROBOTICS node and the map holds. Ticks never stop.",
    {"robotics": cue("robotics", 154.66), "enterprise": cue("enterprise", 160.6), "web": cue("web", 162.72), "iot": cue("industrial", 167.17),
     "telemetry": cue("Physical", 168.67), "moment": cue("single", 173.95), "camera": cue("camera", 177.77),
     "joints": cue("joints", 180.98), "commands": cue("commands", 182.44), "timestamp": cue("timestamp", 185.19),
     "sensors": cue("sensors", 189.22), "downsampling": cue("downsampling", 196.36), "drift": cue("drift", 198.6),
     "crashes": cue("crashes", 202.19), "quietly": cue("quietly", 208.66), "frontier": cue("frontier", 212.28)})

add("s1", cue("So", 221.34) - 0.01, src["g11"]["start"], "diagram", "overlay",
    "TECHNIQUES 6 and 2: the map's second visit, with a drawn 'you' pin on it; replaces g10. Same map. On '13' a motif line draws "
    "from ENTERPRISE to ROBOTICS with 13 ticks, week 1 lit $accent and pulsing. On 'not a robot' a chip under ROBOTICS "
    "reads 'a robot', struck through (strike measured from the text), and 'the engine behind it' rises in on 'engine'. "
    "Segments of the path light with what the series covers on 'concepts', 'modern', 'applied'. On 'no background' an "
    "ink pin labelled 'you' drops onto ENTERPRISE; on 'either' it travels onto the week-1 tick and sits on it. "
    "Exits with a wipe (g11's card enters 1.2s into its window).",
    {"n13": cue("13", 222.14), "public": cue("public", 225.96), "notrobot": cue("Not", 226.88),
     "engine": cue("engine", 228.0), "concepts": cue("concepts", 231.25), "modern": cue("modern", 233.67),
     "applied": cue("applied", 235.69), "background": cue("background", 242.1), "either": cue("either", 251.66)})

for pid in ("g11", "g11b", "g12", "g13"):
    reuse(pid)

add("l1", cue("the", 321.51), cut["totalSeconds"], "diagram", "overlay",
    "TECHNIQUE 2 payoff, shortened (human 2026-10-25: the face holds full frame from 5:19.1). Enters on 'the data is' "
    "with m2's frame tile at its head and the five streams visibly half a tick out of step; on 'dissect the data' they "
    "snap together, the joints row the one that visibly snaps, and an $accent playhead draws top to bottom. Ticks run "
    "to the end.",
    {"data": cue("data", 321.63), "dissect": cue("data", 325.58)})

# Trimmed (human 2026-10-25, after the composition review): only over the NEW graphics, one line held per
# section, keyword lit in $ink (not $accent), never on takeovers or on cards that label themselves.
RAIL_ON = ["d1", "m2", "s1", "l1"]
for host in RAIL_ON:
    h = next(p for p in parts if p["id"] == host)
    add("r" + host, h["start"], h["end"], "card", "overlay",
        f"TECHNIQUE 1 (the running headline) over {host}, on the rail track. Tracked caps, display 700 at 20px, "
        "letter-spacing 0.18em, $muted on a slim lightReinforced pill (6px white border, card shadow) at x 48, y 16, "
        "inside the measured clear wall. One line held for the section; it only accumulates (middle dot). The "
        "keyword lights to $ink with an ink underline on its spoken cue (no accent: one accent per scene). Copy and cues: RAIL in build.mjs, table in PLAN.md.",
        track="rail")

# compositing order: the push segment (opaque face) first, then cards, then the headline on top
parts.sort(key=lambda p: (p["start"], {"push": 0, "main": 1, "rail": 2}[p["track"]]))
json.dump({"video": "outputs/base-cut.mov", "fps": FPS, "totalSeconds": cut["totalSeconds"],
           "_demoScene": {"in": cut["totalSeconds"], "out": cut["totalSeconds"],
                          "direction": "No demo in the POC window: the screen demo starts after 327.2s."},
           "_note": "POC of seven reference techniques over the first 327.2s of 01-robotics-as-de. Tracks: main (no "
                    "overlaps), push (face push segment), rail (running headline).",
           "parts": parts}, open(a.out, "w"), indent=1)
for p in parts:
    print(f"{p['id']:5} {p['track']:5} {p['start']:8.3f}-{p['end']:8.3f} {p['kind']:9} {'reuse' if p.get('reuse') else 'NEW'}")
