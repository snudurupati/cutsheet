#!/usr/bin/env python3
"""Cut the SCREEN clips with the same segments as the base cut, for the demo span.

Adapted from 03-project-context for a two-session job: each segment reads ITS OWN
screen clip (segment["screen"]) at its own screenStartFrame, derived once in the
cutsheet from that session's measured head trim. Nothing is recomputed here.

The sidebar blur (human decision 2026-09-22) is applied HERE, in source space,
before any punch-in, so the mask scales with the content. Spans and boxes come
from leak.json (detect_leak.py), in segment-local frames, and the filter enables
on the frame number n, which restarts at 0 for every segment encode.

Only demo segments are cut; the output starts at the demo's start on the cut
timeline. Video only: the screen audio is digital silence (measured).
"""
import argparse, json, os, subprocess, sys

BLUR = "boxblur=24:2"


def probe(path, entries, stream="v:0"):
    return subprocess.run(["ffprobe", "-v", "error", "-select_streams", stream,
                           "-show_entries", entries, "-of", "default=nw=1:nk=1", path],
                          capture_output=True, text=True).stdout.split()


def blur_chain(spans, layouts):
    """[in] -> blurred list box on the frames each layout is on screen -> [out]"""
    if not spans:
        return "null"
    by = {}
    for sp in spans:
        by.setdefault(sp["layout"], []).append(sp)
    parts, cur = [], "[0:v]"
    for i, (k, sps) in enumerate(by.items()):
        x0, y0, x1, y1 = layouts[k]["list"]
        en = "+".join(f"between(n,{sp['start']},{sp['end']})" for sp in sps)
        # boxblur's radius must fit the (chroma-subsampled) box: a 24px radius on the
        # 52px menu-bar strip failed outright (2026-09-22). Scale it to the box.
        r = max(2, min(24, (min(x1 - x0, y1 - y0) // 4) - 1))
        parts.append(f"{cur}split[m{i}][c{i}];[c{i}]crop={x1-x0}:{y1-y0}:{x0}:{y0},boxblur={r}:2[b{i}];"
                     f"[m{i}][b{i}]overlay={x0}:{y0}:enable='{en}'[o{i}]")
        cur = f"[o{i}]"
    return ";".join(parts), cur


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cutsheet", required=True)
    ap.add_argument("--leak", required=True, help="graphics-build/leak.json")
    ap.add_argument("--workdir", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--section", default="demo")
    ap.add_argument("--bitrate", default="55M")
    a = ap.parse_args()

    cs = json.load(open(a.cutsheet)); fps = cs["fps"]
    leak = json.load(open(a.leak))
    sess = {s["id"]: s for s in cs["sessions"]}
    segs = [s for s in cs["segments"] if s.get("keep", True) and s["section"] == a.section]
    if not segs:
        sys.exit(f"no {a.section} segments in the cutsheet")
    # gate: every input exists, matches the cutsheet, and leak.json covers THIS cut
    for sid, s in sess.items():
        if not os.path.exists(s["screen"]):
            sys.exit(f"{sid}: screen clip missing: {s['screen']}")
        if int(probe(s["screen"], "stream=nb_frames")[0]) != s["screenFrames"]:
            sys.exit(f"{sid}: screen clip frame count disagrees with the cutsheet")
    for s in segs:
        if s["id"] not in leak["segments"]:
            sys.exit(f"{s['id']}: not in leak.json; re-run detect_leak.py for this cut")
        n = s["endFrame"] - s["startFrame"]
        if any(sp["end"] > n for sp in leak["segments"][s["id"]]):
            sys.exit(f"{s['id']}: leak spans run past the segment; stale leak.json")
        if s["screen"] != sess[s["session"]]["screen"]:
            sys.exit(f"{s['id']}: screen disagrees with its session")

    os.makedirs(a.workdir, exist_ok=True)
    expect = sum(s["endFrame"] - s["startFrame"] for s in segs)
    listfile = os.path.join(a.workdir, "screen_concat.txt")
    with open(listfile, "w") as lf:
        for s in segs:
            part = os.path.join(a.workdir, f"scr-{s['id']}.mov")
            keyf = part + ".key"
            n = s["endFrame"] - s["startFrame"]
            spans = leak["segments"][s["id"]]
            key = json.dumps([s["screen"], s["screenStartFrame"], n, spans, BLUR, "r-adaptive"], sort_keys=True)
            fresh = (os.path.exists(part) and os.path.exists(keyf) and open(keyf).read() == key
                     and probe(part, "stream=nb_frames")[:1] == [str(n)])
            if not fresh:
                bc = blur_chain(spans, leak["layouts"])
                cmd = ["ffmpeg", "-nostdin", "-v", "error", "-y",
                       "-ss", f"{s['screenStartFrame']/fps:.6f}", "-i", s["screen"],
                       "-frames:v", str(n), "-an", "-map_chapters", "-1"]
                if bc == "null":
                    cmd += ["-map", "0:v:0"]
                else:
                    graph, last = bc
                    cmd += ["-filter_complex", graph, "-map", last]
                cmd += ["-c:v", "hevc_videotoolbox", "-b:v", a.bitrate, "-tag:v", "hvc1",
                        "-pix_fmt", "yuv420p", "-r", f"{fps:g}", part]
                subprocess.run(cmd, check=True)
            got = int(probe(part, "stream=nb_frames")[0])
            if got != n:
                sys.exit(f"{s['id']}: wanted {n} frames, encoded {got}")
            if not fresh:
                open(keyf, "w").write(key)
            lf.write(f"file '{os.path.abspath(part)}'\n")
            cov = sum(sp["end"] - sp["start"] for sp in spans)
            print(f"  {s['id']} {s['session']}  {n:6d} frames  blur {100*cov/n:5.1f}%", flush=True)

    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-f", "concat", "-safe", "0",
                    "-i", listfile, "-c", "copy", "-map_chapters", "-1", a.out], check=True)
    got = int(probe(a.out, "stream=nb_frames")[0])
    print(f"\nscreen cut frames {got}  (expected {expect})")
    if got != expect:
        sys.exit("screen cut frame count does not match the demo segments")
    print(f"wrote {a.out}")


main()
