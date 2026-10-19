#!/usr/bin/env python3
"""Write the cutsheet as readable text: the whole edit checkable without watching.

Adapted from 04-lightweight-ontology: segments carry outFrames (their length on
the cut), and fast-forward / compressed segments print their speed.
"""
import argparse, json, textwrap

ap = argparse.ArgumentParser()
ap.add_argument("--cutsheet", required=True)
ap.add_argument("--out", required=True)
a = ap.parse_args()
cs = json.load(open(a.cutsheet)); fps = cs["fps"]
mm = lambda t: f"{int(t)//60:2d}:{t%60:04.1f}"
src = sum(s["camFrames"] for s in cs["sessions"]) / fps
L = [f"cutsheet: {cs['totalSeconds']/60:.2f} min cut from {src/60:.1f} min of source, "
     f"{len(cs['segments'])} segments, session A then session B.",
     "columns: CUT time | SOURCE session time | what is said",
     ">> = fast-forward (one SFX length, voice muted, inset slides out)   >  = compressed 4x", "",
     "KILLED (editorial, beyond automatic silence removal):"]
L += [f"  {k['session'].upper()} {mm(k['start'])}-{mm(k['end'])}  {k['why']}" for k in cs["kills"]]
L.append("")
acc, prev = 0, None
for s in cs["segments"]:
    if (s["session"], s["section"]) != prev:
        L.append(f"==== session {s['session'].upper()}  /  {s['section'].upper()} ====")
        prev = (s["session"], s["section"])
    mark = {"ff": ">>", "compress": "> "}.get(s["kind"], "  ")
    head = f"{mm(acc/fps)} | {s['session'].upper()} {mm(s['start'])} {mark}| "
    text = s["text"]
    if s["kind"] != "speech":
        text += f"  {s['speed']:.1f}x, {s['outFrames']/fps:.1f}s on the cut"
    body = textwrap.wrap(text, 96)
    L.append(head + body[0]); L += [" " * len(head) + b for b in body[1:]]
    acc += s["outFrames"]
L.append(f"\nend {mm(acc/fps)}" + ("  (last segment holds after 'thank you' for the end card)"
                                  if cs["segments"][-1].get("tailHold") else ""))
open(a.out, "w").write("\n".join(L) + "\n")
print(f"wrote {a.out}")
