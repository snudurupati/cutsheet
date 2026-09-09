#!/usr/bin/env python3
"""Cut the SCREEN clip with the same segments as the base cut, for the demo span.

The cutsheet already carries screenStartFrame/screenEndFrame per segment, derived
once from the measured 1-frame head trim (tails align, the screen clip is a frame
longer, so its head carries the offset). Nothing is recomputed here: reading those
fields is the whole point of storing them.

Only the demo-section segments are cut, because the screen is not on camera
anywhere else. The output therefore starts at the demo span's start, and
demo_scene.py is given --screen-offset so its trims line up with the cut timeline.

Video only. The screen clip's audio is silent (-70 LUFS, measured) and the voice
comes from the camera.
"""
import argparse, json, os, subprocess, sys


def probe(path, entries, stream="v:0"):
    return subprocess.run(["ffprobe", "-v", "error", "-select_streams", stream,
                           "-show_entries", entries, "-of", "default=nw=1:nk=1", path],
                          capture_output=True, text=True).stdout.split()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cutsheet", required=True)
    ap.add_argument("--workdir", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--section", default="demo")
    ap.add_argument("--bitrate", default="55M")
    a = ap.parse_args()

    cs = json.load(open(a.cutsheet))
    fps = cs["fps"]
    screen = cs["source"]["screen"]
    if not os.path.exists(screen):
        sys.exit(f"screen clip from the cutsheet is missing: {screen}")
    scr_frames = int(probe(screen, "stream=nb_frames")[0])

    segs = [s for s in cs["segments"] if s.get("keep", True) and s["section"] == a.section]
    if not segs:
        sys.exit(f"no {a.section} segments in the cutsheet")
    for s in segs:
        if s["screenEndFrame"] > scr_frames:
            sys.exit(f"{s['id']}: screenEndFrame {s['screenEndFrame']} past the clip "
                     f"({scr_frames}); the cutsheet and this footage disagree")

    os.makedirs(a.workdir, exist_ok=True)
    expect = sum(s["endFrame"] - s["startFrame"] for s in segs)
    listfile = os.path.join(a.workdir, "screen_concat.txt")
    with open(listfile, "w") as lf:
        for i, s in enumerate(segs):
            part = os.path.join(a.workdir, f"s{i:04d}.mov")
            n = s["endFrame"] - s["startFrame"]          # camera frames are authoritative
            if not (os.path.exists(part) and probe(part, "stream=nb_frames")[:1] == [str(n)]):
                subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y",
                                "-ss", f"{s['screenStartFrame']/fps:.6f}", "-i", screen,
                                "-frames:v", str(n), "-an", "-map_chapters", "-1",
                                "-c:v", "hevc_videotoolbox", "-b:v", a.bitrate,
                                "-tag:v", "hvc1", "-pix_fmt", "yuv420p",
                                "-r", f"{fps:g}", part], check=True)
            got = int(probe(part, "stream=nb_frames")[0])
            if got != n:
                sys.exit(f"{s['id']}: wanted {n} frames, encoded {got}")
            lf.write(f"file '{os.path.abspath(part)}'\n")
            print(f"  {s['id']}  {n:6d} frames", flush=True)

    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-f", "concat", "-safe", "0",
                    "-i", listfile, "-c", "copy", "-map_chapters", "-1", a.out], check=True)
    got = int(probe(a.out, "stream=nb_frames")[0])
    print(f"\nscreen cut frames {got}  (expected {expect})")
    if got != expect:
        sys.exit("screen cut frame count does not match the demo segments")
    print(f"wrote {a.out}")


main()
