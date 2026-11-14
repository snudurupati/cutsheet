#!/usr/bin/env python3
"""Cut a subject matte for every overlay whose card reaches the speaker.

2.2 framing puts him centre-left in the raw take; the hero cards start at x60 and
reach x660, so the composite goes

    base footage  ->  the card  ->  the SUBJECT MATTE on top

and he occludes the card instead of the card covering him (03-project-context
pattern; the 2.2 plan approved hero cards that the speaker sits ON TOP of).

The cutsheet's `matte` flag is the single source of truth (gen_cutsheet.py sets it
from HERO x-extent vs subjectXCanvas, cleared for over-screen parts), so this
script never re-derives the geometry.

Only parts entirely OUTSIDE the demo window can touch him: everything over the
screen recording has no speaker in frame. Background removal is ~2.1 fps at 4K;
over the 14 flagged parts (~176s padded) that is ~42 minutes, run once.
"""
import argparse, json, os, subprocess, sys


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cutsheet", required=True)
    ap.add_argument("--demo", required=True, help="cutsheet _demoScene block JSON or the cutsheet itself")
    ap.add_argument("--base", required=True)
    ap.add_argument("--outdir", required=True)
    ap.add_argument("--pad", type=float, default=0.30)
    ap.add_argument("--only", default="")
    ap.add_argument("--plan-only", action="store_true")
    a = ap.parse_args()

    src = json.load(open(a.demo))
    demo = src.get("_demoScene", src)
    d0, d1 = demo["enters"]["cutSeconds"], demo["leaves"]["cutSeconds"]
    parts = json.load(open(a.cutsheet))["parts"]
    os.makedirs(a.outdir, exist_ok=True)

    todo = []
    for p in parts:
        if p["class"] != "overlay" or not p.get("matte"):
            continue
        if not (p["end"] <= d0 + 0.01 or p["start"] >= d1 - 0.01):
            sys.exit(f"{p['id']} is flagged matte but overlaps the demo window {d0:.1f}-{d1:.1f}: fix the cutsheet")
        todo.append(p)

    if a.only:
        keep = set(a.only.split(","))
        todo = [p for p in todo if p["id"] in keep]

    total = sum(p["end"] - p["start"] + 2 * a.pad for p in todo)
    print(f"{len(todo)} part(s) need a subject matte, {total:.0f}s of footage")
    print(f"at ~2.1 fps that is about {total * 30 / 2.1 / 60:.0f} minutes\n")
    for p in todo:
        print(f"  {p['id']}  {p['start']:8.2f}-{p['end']:8.2f}")
    if a.plan_only:
        return

    # npx uses the project-local npm cache: the user cache is root-owned (EPERM)
    env = dict(os.environ, npm_config_cache=os.environ.get("npm_config_cache", os.path.join(os.path.dirname(os.path.abspath(__file__)), ".npm-cache")))
    for p in todo:
        s = max(0.0, p["start"] - a.pad)
        dur = (p["end"] + a.pad) - s
        span = os.path.join(a.outdir, f"{p['id']}-span.mp4")
        matte = os.path.join(a.outdir, f"{p['id']}-matte.mov")
        if os.path.exists(matte) and os.path.getmtime(matte) > os.path.getmtime(a.base):
            print(f"  {p['id']}  matte is current, skipping")
            continue
        subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-ss", f"{s:.3f}",
                        "-t", f"{dur:.3f}", "-i", a.base, "-an",
                        "-c:v", "h264_videotoolbox", "-b:v", "50M",
                        "-pix_fmt", "yuv420p", span], check=True)
        print(f"  {p['id']}  cutting matte for {dur:.1f}s ...", flush=True)
        r = subprocess.run(["npx", "--yes", "hyperframes@0.8.3", "remove-background",
                            span, "-o", matte], capture_output=True, text=True, env=env)
        if r.returncode != 0 or not os.path.exists(matte):
            sys.exit(f"{p['id']}: background removal failed\n{r.stderr[-800:]}")
        pf = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0",
                             "-show_entries", "stream=pix_fmt", "-of", "default=nw=1:nk=1",
                             matte], capture_output=True, text=True).stdout.strip()
        if not pf.startswith("yuva"):
            sys.exit(f"{p['id']}: matte came back {pf}, with no alpha to composite through")
        os.remove(span)
        print(f"  {p['id']}  {pf}  ok", flush=True)

    json.dump({p["id"]: {"start": p["start"], "end": p["end"],
                         "matte": f"{p['id']}-matte.mov",
                         "spanStart": max(0.0, p["start"] - a.pad)} for p in todo},
              open(os.path.join(a.outdir, "mattes.json"), "w"), indent=1)
    print(f"\nwrote {os.path.join(a.outdir, 'mattes.json')}")


main()
