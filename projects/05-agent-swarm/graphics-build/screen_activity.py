#!/usr/bin/env python3
"""Trace per-second screen activity on each session's screen clip.

Used by build_cutsheet.py to decide, for every silent stretch in session A's
demo, whether the screen is doing something (compress or fast-forward it, human
direction 2026-09-29: "don't cut the silence bits ... the demo screen shows
important stuff") or is frozen (cut it, there is nothing to show).

Signal: ffmpeg's scene score between consecutive 1fps samples at 640px wide. A
score above ACTIVE counts that second as changing. Written with the clip's frame
count so the builder can refuse a trace made from a different file.

Usage:
  python3 screen_activity.py --session a=<screen.mov> --session b=<screen.mov> --out screen-activity.json
"""
import argparse, json, re, subprocess

ACTIVE = 0.003


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--session", action="append", required=True, help="id=screen.mov")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    doc = {"active": ACTIVE, "sessions": {}}
    for spec in a.session:
        sid, clip = spec.split("=", 1)
        frames = int(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0",
                                     "-show_entries", "stream=nb_frames", "-of", "csv=p=0", clip],
                                    capture_output=True, text=True).stdout.strip())
        out = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-hwaccel", "videotoolbox",
                              "-i", clip, "-an", "-vf",
                              "fps=1,scale=640:-2,select='gte(scene,0)',"
                              "metadata=print:key=lavfi.scene_score:file=-",
                              "-f", "null", "-"], capture_output=True, text=True).stdout
        scores = [round(float(x), 5) for x in re.findall(r"scene_score=([\d.]+)", out)]
        doc["sessions"][sid] = {"screen": clip, "frames": frames, "scores": scores}
        print(f"{sid}: {len(scores)} seconds, {sum(s > ACTIVE for s in scores)} changing")
    json.dump(doc, open(a.out, "w"))
    print(f"wrote {a.out}")


main()
