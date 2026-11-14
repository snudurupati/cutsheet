#!/usr/bin/env python3
"""The graphics checkpoint's preview clips (CLAUDE.md hard rule 13).

One file PER graphic, never one long reel (the human rewatched single graphics
over and over; the back-to-back reel made that impossible, 2026-10-17):

    previews/<id>__<start>-<end>.mp4   THE REAL FOOTAGE WINDOW the graphic sits
                                       over, from the base cut at 3840x2160
                                       30fps, [start,end] with 1.5s of context
                                       each side clamped to [0,totalSeconds],
                                       with the rendered transparent MOV
                                       composited on top at exactly its start
                                       (frame-aligned PTS offset, overlay scaled
                                       to full frame). H.264 yuv420p, CRF 20,
                                       faststart.
    previews/<id>__<start>-<end>.jpg   the contact sheet: the middle frame of
                                       that clip, so the whole checkpoint pack
                                       is scannable without opening players.

Rule 12 gates, all before any work:
  * base duration from ffprobe == cutsheet totalSeconds +/- 0.1s (fail loudly);
  * base is 3840x2160 @ the cutsheet's fps;
  * every rendered MOV used has frame count == round((end-start)*fps) from the
    cutsheet. A render that is MISSING is skipped with a printed WARN listing
    them (renders/ absent at all = warn about every part and exit 0 with no
    files: that is the legitimate pre-build state).

Usage:
    python3 make_previews.py --base ../outputs/base-cut-v9.mov \
        --cutsheet cutsheet.json --renders renders --out previews \
        [--only g01,g03] [--jobs 4]
"""
import argparse
import json
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

PAD = 1.5
CRF = "20"


def run(cmd, what):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        sys.exit(f"FAILED: {what}\n{' '.join(cmd[:14])} ...\n{r.stderr[-2000:]}")
    return r.stdout


def ffprobe_value(path, entries):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", entries, "-of", "csv=p=0", path],
        capture_output=True, text=True)
    if out.returncode:
        sys.exit(f"ffprobe failed on {path}:\n{out.stderr[-800:]}")
    return out.stdout.strip()


def num(v):
    """'30/1' or '30.0' -> float."""
    return float(v.split("/")[0]) / float(v.split("/")[1]) if "/" in v else float(v)


def secs(v):
    """Compact second value for filenames: 0.133333, 10.333333, 42.6."""
    s = f"{v:.6f}".rstrip("0").rstrip(".")
    return s if s else "0"


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--base", required=True, help="the signed-off base cut (3840x2160 30fps)")
    ap.add_argument("--cutsheet", default="cutsheet.json")
    ap.add_argument("--renders", default="renders")
    ap.add_argument("--mattes", default="mattes", help="dir with <id>-matte.mov + mattes.json (subject over hero cards)")
    ap.add_argument("--out", default="previews")
    ap.add_argument("--only", default="", help="comma-separated part ids")
    ap.add_argument("--jobs", type=int, default=4, help="parallel ffmpeg encodes")
    a = ap.parse_args()

    cs = json.load(open(a.cutsheet))
    fps = float(cs.get("fps", 30)) or 30.0
    total = float(cs["totalSeconds"])
    parts = cs["parts"]
    if a.only:
        keep = {x.strip() for x in a.only.split(",") if x.strip()}
        have = {p["id"] for p in parts}
        for x in sorted(keep - have):
            print(f"WARN --only {x}: not a part in {a.cutsheet}, ignored")
        parts = [p for p in parts if p["id"] in keep]

    # ---- rule 12 gate: the base is the base the cut sheet was built for ----
    dur = float(ffprobe_value(a.base, "format=duration").splitlines()[0])
    if abs(dur - total) > 0.1:
        sys.exit(f"GATE FAIL: {a.base} is {dur:.3f}s, cutsheet totalSeconds is {total:.3f} "
                 f"(off {abs(dur-total):.3f}s > 0.1s): stale base or stale cutsheet, refusing")
    w, h, fr = (ffprobe_value(a.base, f"stream=width,height,r_frame_rate").split(","))
    w, h, fr = int(w), int(h), num(fr)
    if (w, h) != (3840, 2160) or abs(fr - fps) > 0.01:
        sys.exit(f"GATE FAIL: {a.base} is {w}x{h}@{fr}fps, the checkpoint contract says "
                 f"3840x2160@{fps}fps: wrong base, refusing")
    print(f"base ok: {a.base} {w}x{h}@{fr:g} {dur:.3f}s == cutsheet {total:.3f}s")

    # ---- rule 12 gate: every used render has the cutsheet's frame count ----
    want = {}
    missing = []
    for p in parts:
        n = round((p["end"] - p["start"]) * fps)
        if p["endFrame"] - p["startFrame"] != n:
            sys.exit(f"GATE FAIL: cutsheet part {p['id']} is self-inconsistent: "
                     f"endFrame-startFrame {p['endFrame']-p['startFrame']} != round((end-start)*fps) {n}")
        ext = "mp4" if p["class"] == "segment" else "mov"
        f = os.path.join(a.renders, f"{p['id']}.{ext}")
        if not os.path.exists(f):
            missing.append(f"{p['id']} ({f})")
            continue
        got = int(ffprobe_value(f, "stream=nb_frames").splitlines()[0])
        if got != n:
            sys.exit(f"GATE FAIL: {f} has {got} frames, cutsheet says {n} "
                     f"(round(({p['end']}-{p['start']})*{fps:g})): re-render it with render.sh")
        want[p["id"]] = (p, f, ext)

    os.makedirs(a.out, exist_ok=True)
    if not a.only:
        # one current preview per part, never a stale twin from an earlier cut
        # (only on a full sweep; an --only run must not delete its siblings)
        have = {p["id"] for p in cs["parts"]}
        for fn in os.listdir(a.out):
            stem = fn.split("__")[0]
            if "__" in fn and stem not in have:
                os.remove(os.path.join(a.out, fn))

    jobs = []
    for p in parts:
        if p["id"] not in want:
            continue
        p, mov, _ext = want[p["id"]]
        s, e = float(p["start"]), float(p["end"])
        w0 = max(0.0, s - PAD)
        w1 = min(total, e + PAD)
        f0, f1 = round(w0 * fps), round(w1 * fps)          # the window on the frame grid too
        n = f1 - f0
        # frame-aligned overlay offset from the cutsheet's integer frames
        sf = p["startFrame"]
        composited = min(p["endFrame"], f1) - max(sf, f0)   # overlay frames inside this window
        if composited < 1:
            sys.exit(f"GATE FAIL: {p['id']} [{p['startFrame']},{p['endFrame']}) does not "
                     f"intersect its own footage window [{f0},{f1}) on the base: cutsheet broken")
        nov = composited
        if sf < f0:
            # an overlay that began before this window is trimmed to it BY FRAME
            # COUNT (a negative timestamp offset loses its last frame, 2.1 g19->g20)
            skip = f0 - sf
            ov_chain = f"[1:v]scale=3840:2160,trim=start_frame={skip},setpts=PTS-STARTPTS[o0]"
            off = 0.0
        else:
            off = (sf - f0) / fps
            ov_chain = f"[1:v]scale=3840:2160,setpts=PTS-STARTPTS+{off:.6f}/TB[o0]"
        graph = (
            f"[0:v]setpts=PTS-STARTPTS[b];{ov_chain};"
            f"[b][o0]overlay=0:0:eof_action=pass:"
            f"enable='between(t,{off - 0.5/fps:.6f},{off + (nov - 0.5)/fps:.6f})'[v]"
        )
        # hero cards: the SUBJECT MATTE goes ON TOP (the speaker occludes the
        # card, not the other way round). Same frame-exact alignment as the card.
        inputs = ["-i", mov]
        mfile = os.path.join(a.mattes, f"{p['id']}-matte.mov")
        if p.get("matte") and os.path.exists(mfile):
            mrec = {}
            mj = os.path.join(a.mattes, "mattes.json")
            if os.path.exists(mj):
                mrec = json.load(open(mj)).get(p["id"], {})
            span_start = mrec.get("spanStart")
            if span_start is None:
                span_start = s - 0.30
            sfm = round(span_start * fps)
            novm = min(p["endFrame"] + round(0.30 * fps), f1) - max(sfm, f0)
            if sfm < f0:
                skipm = f0 - sfm
                m_chain = f"[{len(inputs)}:v]scale=3840:2160,trim=start_frame={skipm},setpts=PTS-STARTPTS[o1]"
                offm = 0.0
            else:
                offm = (sfm - f0) / fps
                m_chain = f"[{len(inputs)}:v]scale=3840:2160,setpts=PTS-STARTPTS+{offm:.6f}/TB[o1]"
            graph = graph.replace("[v]", "[b1];" + m_chain + f";[b1][o1]overlay=0:0:eof_action=pass:enable='between(t,{offm - 0.5/fps:.6f},{offm + (novm - 0.5)/fps:.6f})'[v]")
            inputs += ["-i", mfile]
        elif p.get("matte"):
            print(f"  WARN  {p['id']}: matte flagged, {mfile} missing: preview shows the card OVER him")
        name = f"{p['id']}__{secs(s)}-{secs(e)}"
        mp4 = os.path.join(a.out, f"{name}.mp4")
        jpg = os.path.join(a.out, f"{name}.jpg")
        for old in (mp4, jpg):
            if os.path.exists(old):
                os.remove(old)
        enc = ["ffmpeg", "-nostdin", "-v", "error", "-y",
               "-ss", f"{f0 / fps:.6f}", "-to", f"{f1 / fps:.6f}", "-i", a.base,
               *inputs,
               "-filter_complex", graph,
               "-map", "[v]", "-frames:v", str(n),
               "-c:v", "libx264", "-crf", CRF, "-preset", "medium",
               "-pix_fmt", "yuv420p", "-r", "30", "-movflags", "+faststart", mp4]
        jobs.append((p["id"], name, mp4, jpg, enc, n, composited))

    def build(j):
        pid, name, mp4, jpg, enc, n, composited = j
        run(enc, f"encode preview {pid}")
        mid = max(0.0, (n / fps) / 2.0)
        run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-ss", f"{mid:.3f}", "-i", mp4,
             "-frames:v", "1", "-q:v", "2", jpg], f"contact sheet {pid}")
        return (pid, name, mp4, jpg, n, composited)

    rows = []
    if jobs:
        with ThreadPoolExecutor(max_workers=max(1, a.jobs)) as ex:
            rows = list(ex.map(build, jobs))

    if missing:
        print(f"WARN: {len(missing)} part(s) have no render in {a.renders}/, skipped "
              f"(run render.sh):")
        for m in missing:
            print(f"  WARN  {m}")
    if not rows:
        print("no previews written (nothing rendered yet, or --only matched nothing)")
        sys.exit(0)

    print()
    print(f"{'id':8} {'preview':52} frames composited")
    for pid, name, mp4, jpg, n, composited in sorted(rows):
        print(f"{pid:8} {mp4:52} {composited}f of clip {n}f")
    print(f"\nwrote {len(rows)} previews + {len(rows)} contact sheets to {a.out}/")


main()
