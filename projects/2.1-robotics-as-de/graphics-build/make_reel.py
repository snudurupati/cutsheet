#!/usr/bin/env python3
"""The graphics checkpoint's preview clips (CLAUDE.md hard rule 13; graphics skill).

Every part over its REAL footage window at 1080p, one second of context either side, each with a
small part-id + timestamp slate, with the cut's own audio so cue timing can be judged by ear.
ONE FILE PER PART in previews/clips/, named to sort in story order (`07-g06-1m40s.mp4`), plus
previews/clips/index.txt. Human decision 2026-10-17: a single long reel made it hard to rewatch one
graphic several times. --reel also writes the old back-to-back reel.
Also the single-part preview for iteration (hard rule 14):
    python3 make_reel.py --only g07          -> previews/clips/NN-g07-....mp4, about a minute

Footage per part:
  * face parts      outputs/base-cut.mov (g01 carries its push: 1.00 -> 1.04 from frame 1)
  * demo parts      demo_scene.py rendered for just that window (screen, punch-ins, face inset),
                    the same script and spec the full build uses
  * segments (g18)  the part's own opaque render replaces the footage for its window
Overlays come from previews/parts/<id>.mov (capture.mjs, 1080p alpha).

Every input is gated against the cutsheet: a part whose capture has the wrong frame count is
refused rather than composited (hard rule 12).
"""
import argparse, json, os, subprocess, sys

FPS = 30
SLATE_FONT = "fonts/Satoshi-Bold.otf"


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        sys.exit(f"failed: {' '.join(cmd[:12])}\n{r.stderr[-1500:]}")
    return r.stdout


def frames(p):
    return int(run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=nb_frames",
                    "-of", "csv=p=0", p]).strip())


def mmss(t):
    return f"{int(t)//60}:{t%60:04.1f}"


def slate(path, text):
    from PIL import Image, ImageDraw, ImageFont
    im = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    f = ImageFont.truetype(SLATE_FONT, 26)
    w = d.textlength(text, font=f)
    d.rounded_rectangle([1880 - w - 28, 24, 1896, 70], radius=8, fill=(20, 17, 14, 200))
    d.text((1880 - w - 14, 32), text, font=f, fill=(247, 245, 241, 255))
    im.save(path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--plan", default="cutsheet.json")
    ap.add_argument("--spec", default="demo-spec.json")
    ap.add_argument("--base", default="../outputs/base-cut.mov")
    ap.add_argument("--audio", default="../outputs/base-audio.wav")
    ap.add_argument("--screen", default="../outputs/base-screen.mp4")
    ap.add_argument("--work", default=os.path.expanduser("~/Library/Caches/cutsheet/01-robotics-as-de/reel"))
    ap.add_argument("--out", default="previews/reel.mp4")
    ap.add_argument("--only", default="")
    ap.add_argument("--clips-dir", default="previews/clips")
    ap.add_argument("--reel", action="store_true", help="also concatenate every clip into --out")
    a = ap.parse_args()
    plan = json.load(open(a.plan)); spec = json.load(open(a.spec))
    nb = frames(a.base)
    if nb != round(plan["totalSeconds"] * FPS):
        sys.exit(f"{a.base} has {nb} frames, the plan {round(plan['totalSeconds'] * FPS)}: stale base or plan, refusing")
    os.makedirs(a.clips_dir, exist_ok=True)
    order = {q["id"]: i + 1 for i, q in enumerate(sorted(plan["parts"], key=lambda q: (q["start"], q["id"])))}
    index = []
    D0, D1 = plan["_demoScene"]["in"], plan["_demoScene"]["out"]
    total = plan["totalSeconds"]
    os.makedirs(a.work, exist_ok=True)
    parts = [p for p in plan["parts"] if p.get("builtBy") != "push" and (not a.only or p["id"] in a.only.split(","))]
    clips = []
    for p in parts:
        pid, s, e = p["id"], p["start"], p["end"]
        in_demo = s >= D0 - 0.01 and e <= D1 + 0.01
        w0 = max(D0 if in_demo else 0.0, s - 1.0); w1 = min(D1 if in_demo else total, e + 1.0)
        if not in_demo:
            w0 = max(0.0, s - 1.0); w1 = min(total, e + 1.0)
            if w0 < D1 <= s: w0 = max(w0, D1)              # never pull demo footage into a face part
            if e <= D0 < w1: w1 = min(w1, D0)
        w0 = round(w0 * FPS) / FPS; w1 = round(w1 * FPS) / FPS     # the window on the frame grid too
        n = round((w1 - w0) * FPS)
        # every part whose span meets this window is overlaid, not only this one, so a hand-off
        # into or out of a neighbour reads as it will in the video (technical review 2026-10-17
        # flagged each abutting hand-off as a one-frame pop because the context second was bare)
        near = [q for q in plan["parts"] if q["start"] < w1 - 1e-3 and q["end"] > w0 + 1e-3
                and os.path.exists(f"parts/{q['id']}/index.html")]
        for q in near:
            ovq = f"previews/parts/{q['id']}.mov"
            if not os.path.exists(ovq):
                sys.exit(f"{q['id']}: no capture at {ovq}; run capture_all.sh")
            # a capture older than its composition is stale (review round 2 reviewed a reel built
            # before six parts were changed): refuse it
            src_html = f"parts/{q['id']}/index.html"
            if os.path.getmtime(ovq) < os.path.getmtime(src_html):
                sys.exit(f"{q['id']}: capture is older than {src_html}; recapture it")
            if frames(ovq) != q["endFrame"] - q["startFrame"]:
                sys.exit(f"{q['id']}: capture has {frames(ovq)} frames, cut sheet says {q['endFrame'] - q['startFrame']}")
        has_ov = any(q["id"] == pid for q in near)
        # footage
        foot = os.path.join(a.work, f"{pid}-foot.mp4")
        if in_demo:
            run(["python3", "demo_scene.py", "--spec", a.spec, "--base", a.base, "--screen", a.screen,
                 "--mask", "inset-mask.png", "--border", "inset-border.png", "--start", f"{w0:.3f}", "--end", f"{w1:.3f}",
                 "--out", foot])
            src = ["-i", foot]; vtrim = "[0:v]setpts=PTS-STARTPTS,scale=1920:1080"
        else:
            src = ["-i", a.base]; vtrim = f"[0:v]trim=start={w0:.3f}:end={w1:.3f},setpts=PTS-STARTPTS,scale=1920:1080"
            if pid == "g01":                                # the hook's push, from frame 1, eyes anchored
                nz = round((e - s) * FPS)
                vtrim = (f"[0:v]trim=start={w0:.3f}:end={w1:.3f},setpts=PTS-STARTPTS,scale=1920:1080,"
                         f"zoompan=z='1+0.04*min(on/{nz},1)':x='iw/2-(iw/zoom/2)+(1150-960)*(1-1/zoom)':"
                         f"y='ih/2-(ih/zoom/2)+(400-540)*(1-1/zoom)':d=1:s=1920x1080:fps=30")
        sl = os.path.join(a.work, f"{pid}-slate.png")
        slate(sl, f"{pid}   {mmss(s)} - {mmss(e)}   {p['kind']}")
        inputs = list(src)
        for q in near:
            inputs += ["-i", f"previews/parts/{q['id']}.mov"]
        k_sl = 1 + len(near); k_au = k_sl + 1
        inputs += ["-loop", "1", "-i", sl, "-i", a.audio]
        g = [vtrim + "[b]"]
        cur = "[b]"
        f0 = round(w0 * FPS)
        for j, q in enumerate(near):
            # frame-aligned offset from the cut sheet's integer frames (round 2: float offsets put a
            # bare frame between abutting parts)
            nq = q["endFrame"] - q["startFrame"]
            if q["startFrame"] < f0:
                # an overlay that began before this window is trimmed to it BY FRAME COUNT; shifting it
                # by a negative timestamp lost its last frame and showed a bare frame at hand-offs
                # (round 3, g19 -> g20)
                skip = f0 - q["startFrame"]
                g.append(f"[{1 + j}:v]trim=start_frame={skip},setpts=PTS-STARTPTS[o{j}]")
                o, nq = 0.0, nq - skip
            else:
                o = (q["startFrame"] - f0) / FPS
                g.append(f"[{1 + j}:v]setpts=PTS-STARTPTS+{o:.4f}/TB[o{j}]")
            g.append(f"{cur}[o{j}]overlay=0:0:eof_action=pass:enable='between(t,{o - 0.5 / FPS:.4f},{o + (nq - 0.5) / FPS:.4f})'[bo{j}]")
            cur = f"[bo{j}]"
        g.append(f"{cur}[{k_sl}:v]overlay=0:0:shortest=1[v]")
        g.append(f"[{k_au}:a]atrim=start={w0:.3f}:end={w1:.3f},asetpts=PTS-STARTPTS,afade=t=in:d=0.08,afade=t=out:st={w1-w0-0.12:.3f}:d=0.12[a]")
        clip = os.path.join(a.work, f"{pid}.mp4")
        run(["ffmpeg", "-nostdin", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(g),
             "-map", "[v]", "-map", "[a]", "-frames:v", str(n), "-c:v", "h264_videotoolbox", "-b:v", "14M",
             "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-r", "30", clip])
        clips.append(clip)
        name = f"{order[pid]:02d}-{pid}-{int(s)//60}m{int(s)%60:02d}s.mp4"
        for old_ in [f for f in os.listdir(a.clips_dir) if f.split("-")[1:2] == [pid]]:
            os.remove(os.path.join(a.clips_dir, old_))      # one current clip per part, never a stale twin
        run(["cp", clip, os.path.join(a.clips_dir, name)])
        index.append(f"{name}\t{pid}\t{mmss(s)}-{mmss(e)}\t{p['kind']}\t{p['direction'][:160]}")
        print(f"  {pid:5s} {mmss(w0)}-{mmss(w1)}  {'demo' if in_demo else 'face'}{'  +overlay' if has_ov else ''}", flush=True)
    if not a.only:
        open(os.path.join(a.clips_dir, "index.txt"), "w").write("file\tpart\ttime\tkind\twhat\n" + "\n".join(index) + "\n")
    print(f"wrote {len(clips)} clips to {a.clips_dir}/")
    if a.reel:
        lst = os.path.join(a.work, "concat.txt")
        open(lst, "w").write("".join(f"file '{c}'\n" for c in clips))
        run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", a.out])
        print(f"wrote {a.out}  ({len(clips)} parts)")


main()
