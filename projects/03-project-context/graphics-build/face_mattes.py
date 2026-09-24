#!/usr/bin/env python3
"""Cut a subject matte for every overlay that would otherwise land ON the speaker.

This framing is centred, so the clear left column is narrower than 02-first-agent's
and the cards reach him. Rather than shrink every card, the composite goes

    base footage  ->  the card  ->  the SUBJECT MATTE on top

so he occludes the card instead of the card covering him. Requested by the human
2026-09-08 and verified on a real frame before committing: the card runs behind
his shoulder with no halo at the edge.

Run it only over the spans where a card actually overlaps him. Background removal
is ~2.1 fps at 4K, so the whole video would be ~80 minutes and ~35GB for no gain:
the demo-window parts sit over the screen recording and never touch him.
"""
import argparse, json, os, subprocess, sys

# canvas x where the subject's silhouette begins, measured into zones.json.
# A card whose box reaches past this is a candidate.
SUBJECT_X = 780


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cutsheet", required=True)
    ap.add_argument("--demo", required=True)
    ap.add_argument("--base", required=True)
    ap.add_argument("--outdir", required=True)
    ap.add_argument("--pad", type=float, default=0.30)
    ap.add_argument("--only", default="")
    ap.add_argument("--plan-only", action="store_true")
    a = ap.parse_args()

    demo = json.load(open(a.demo))
    d0, d1 = demo["enters"]["cutSeconds"], demo["leaves"]["cutSeconds"]
    parts = json.load(open(a.cutsheet))["parts"]
    os.makedirs(a.outdir, exist_ok=True)

    todo = []
    for p in parts:
        if p["class"] != "overlay":
            continue
        # over the screen recording? then it never touches him
        if not (p["end"] <= d0 or p["start"] >= d1):
            continue
        # the card geometry lives in the build script; the ones that reach the
        # subject are every left-column card at the full 724 width. g030's end
        # card is 584 wide and stops at x680, clear of him.
        width = 584 if p["id"] == "g030" else 724
        if 96 + width <= SUBJECT_X:
            continue
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
                            span, "-o", matte], capture_output=True, text=True)
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
