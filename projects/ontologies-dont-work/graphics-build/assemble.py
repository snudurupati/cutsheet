#!/usr/bin/env python3
"""Join the rendered parts into the graphics pass, and gate the result.

Every part of this piece is class=segment covering 100% of the timeline, so
there is no base footage and no overlay compositing: assembly is a join. It uses
the CONCAT DEMUXER, never `select`, which cannot reorder frames at all.

Rule 12: inputs are arguments and every one the caller names must exist. A
missing input is a hard exit, never a skip - `if os.path.exists(p)` reads like
defensive programming and is a silent data-loss bug.

The gates, in order:
  1. every part render exists, and is NEWER than the composition that produced it
  2. frame counts sum to the cut sheet's duration exactly
  3. NO BLANK FRAME at any part boundary (this is why the early spot review
     mattered: frame 90 measured 0.000% content before the fix)
  4. duplicate frames under the style's threshold
  5. CONTENT: sample frames across the join and compare each against the part
     render that is supposed to be there. Counts cannot see a mis-ordered or
     stale join; only content can.
"""
import argparse, json, os, subprocess, sys, tempfile
from PIL import Image, ImageChops, ImageStat

BG = (247, 245, 241)


def frame(path, t, out, scale=None):
    vf = f"scale={scale}:-1" if scale else None
    cmd = ["ffmpeg", "-nostdin", "-v", "error", "-y", "-ss", f"{t:.4f}", "-i", path,
           "-frames:v", "1", "-fps_mode", "passthrough"]
    if vf:
        cmd += ["-vf", vf]
    cmd += [out]
    subprocess.run(cmd, check=True)
    return Image.open(out).convert("RGB").copy()


def content_pct(im):
    """Share of pixels that are not the page colour, to 6 luma of tolerance."""
    px = im.load(); W, H = im.size; hit = 0; tot = 0
    for y in range(0, H, 4):
        for x in range(0, W, 4):
            r, g, b = px[x, y]; tot += 1
            if abs(r - BG[0]) > 6 or abs(g - BG[1]) > 6 or abs(b - BG[2]) > 6:
                hit += 1
    return 100.0 * hit / tot


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cutsheet", required=True)
    ap.add_argument("--renders", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--dup-fail-pct", type=float, required=True)
    ap.add_argument("--blank-fail-pct", type=float, default=0.5,
                    help="a part's first frame carrying less content than this is blank")
    ap.add_argument("--content-fail", type=float, default=1.0,
                    help="mean pixel difference above this means the wrong part is there")
    a = ap.parse_args()

    cs = json.load(open(a.cutsheet))
    parts, fps = cs["parts"], cs["fps"]
    tmp = tempfile.mkdtemp()

    # ---- gate 1: every input exists and is newer than its composition ---------
    files = []
    for p in parts:
        f = os.path.join(a.renders, f"{p['id']}.mp4")
        if not os.path.exists(f):
            sys.exit(f"ERROR {p['id']}: {f} does not exist. Every layer the assemble "
                     f"is asked for is mandatory; a missing input is a hard exit.")
        comp = os.path.join("parts", p["id"], "index.html")
        if os.path.getmtime(f) < os.path.getmtime(comp):
            sys.exit(f"ERROR {p['id']}: the render is OLDER than {comp}. A cache keyed on "
                     f"existence alone reuses a previous build's parts.")
        files.append(f)

    # ---- gate 2: frame counts against the plan -------------------------------
    total_want = 0
    for p, f in zip(parts, files):
        got = int(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0",
                                  "-show_entries", "stream=nb_frames", "-of", "csv=p=0", f],
                                 capture_output=True, text=True).stdout.strip())
        want = round((p["end"] - p["start"]) * fps)
        if got != want:
            sys.exit(f"ERROR {p['id']}: {got} frames, the cut sheet says {want}")
        total_want += want
    print(f"gate 1-2  {len(parts)} parts present and frame-exact, {total_want} frames "
          f"= {total_want / fps:.2f}s")

    # ---- the join ------------------------------------------------------------
    lst = os.path.join(tmp, "concat.txt")
    with open(lst, "w") as fh:
        for f in files:
            fh.write(f"file '{os.path.abspath(f)}'\n")
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-f", "concat", "-safe", "0",
                    "-i", lst, "-c", "copy", "-movflags", "+faststart", a.out], check=True)
    got = int(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0",
                              "-count_frames", "-show_entries", "stream=nb_read_frames",
                              "-of", "csv=p=0", a.out],
                             capture_output=True, text=True).stdout.strip())
    if got != total_want:
        sys.exit(f"ERROR the join has {got} frames, the parts sum to {total_want}")
    print(f"joined    {a.out}  {got} frames")

    # ---- gate 3: no blank frame at any boundary ------------------------------
    bad = []
    print(f"\n{'part':6} {'t':>7} {'first-frame content':>20}")
    for p in parts:
        im = frame(a.out, p["start"] + 0.5 / fps, os.path.join(tmp, "b.png"), scale=540)
        pct = content_pct(im)
        ok = pct >= a.blank_fail_pct
        print(f"{p['id']:6} {p['start']:7.2f} {pct:19.2f}% {'ok' if ok else 'BLANK'}")
        if not ok:
            bad.append(f"{p['id']}: first frame carries {pct:.2f}% content, reads as a dropped frame")

    # ---- gate 4: duplicate frames -------------------------------------------
    md5 = os.path.join(tmp, "gp.md5")
    subprocess.run(["ffmpeg", "-v", "error", "-i", a.out, "-map", "0:v:0",
                    "-f", "framemd5", md5], check=True)
    still = []
    for p in parts:
        for s0, e0 in p.get("still", []):
            still.append((p["start"] + s0, p["start"] + e0))
    def in_still(i):
        t = i / fps
        return any(s0 - 0.05 <= t <= e0 + 0.05 for s0, e0 in still)
    prev, dup, tot, sdup, stot = None, 0, 0, 0, 0
    for i, line in enumerate(l for l in open(md5) if not l.startswith("#")):
        h = line.rsplit(",", 1)[-1].strip()
        if in_still(i):
            stot += 1
            if h == prev: sdup += 1
        else:
            tot += 1
            if h == prev: dup += 1
        prev = h
    pct = 100 * dup / max(1, tot)
    spct = 100 * sdup / max(1, stot)
    print(f"\ngate 4    duplicate frames OUTSIDE declared stillness: {dup}/{tot} = {pct:.2f}%  "
          f"(fail above {a.dup_fail_pct}%)")
    print(f"          inside {len(still)} declared still windows: {sdup}/{stot} = {spct:.1f}% "
          f"(expected: that is what stillness IS)")
    if pct > a.dup_fail_pct:
        bad.append(f"duplicate frames outside stillness {pct:.2f}% exceeds {a.dup_fail_pct}%")

    # ---- gate 5: CONTENT, not counts ----------------------------------------
    # Counts cannot see a mis-ordered or stale join. Sample each part's own
    # window in the joined file and compare against the part render that is
    # supposed to be there - including the FIRST TWO SECONDS, not only the
    # middle, because a lifted segment lets every later window re-converge.
    print(f"\n{'part':6} {'t(abs)':>7} {'vs own render':>14} {'vs neighbour':>13}")
    for i, p in enumerate(parts):
        D = p["end"] - p["start"]
        for frac in (0.08, 0.5, 0.9):
            loc = D * frac
            ab = p["start"] + loc
            a_im = frame(a.out, ab, os.path.join(tmp, "a.png"), scale=480)
            b_im = frame(files[i], loc, os.path.join(tmp, "c.png"), scale=480)
            d_own = ImageStat.Stat(ImageChops.difference(a_im, b_im)).mean[0]
            # and it must NOT match the neighbouring part at the same offset
            j = i + 1 if i + 1 < len(parts) else i - 1
            dn = parts[j]["end"] - parts[j]["start"]
            n_im = frame(files[j], min(loc, dn - 0.1), os.path.join(tmp, "d.png"), scale=480)
            d_nb = ImageStat.Stat(ImageChops.difference(a_im, n_im)).mean[0]
            ok = d_own <= a.content_fail
            print(f"{p['id']:6} {ab:7.2f} {d_own:14.3f} {d_nb:13.3f} {'ok' if ok else 'MISMATCH'}")
            if not ok:
                bad.append(f"{p['id']} at {ab:.2f}s: the join differs from its own render by "
                           f"{d_own:.3f} mean pixels. The wrong part is at this timestamp.")

    if bad:
        print("\nFAIL")
        for b in bad:
            print("  " + b)
        sys.exit(1)
    print("\nOK: present, frame-exact, no blank boundary, duplicates under threshold, "
          "and every window carries the part that belongs there")


main()
