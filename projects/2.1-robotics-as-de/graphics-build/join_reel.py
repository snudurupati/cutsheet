#!/usr/bin/env python3
"""The base-cut gate, half 4: the reel the human LISTENS to before signing off (CLAUDE.md hard rule 15).

Every join in the cut, with CONTEXT seconds either side, back to back. Each clip carries a slate:
join number, cut time, the last word before and first word after, the measured pause and the audit
verdict, and a red bar flashes at the exact join. Small picture, full audio: this is for ears.

    python3 join_reel.py --cut ../outputs/base-cut.mov --cutsheet ../transcript/cutsheet.json \
        --audit ../transcript/audit-v3.json --transcript-cut ../outputs/transcript-cut.json --out ../outputs/join-reel.mp4
Refuses to run if the render does not have the cutsheet's frame count (a stale render).
"""
import argparse, json, os, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFont

CONTEXT, W, H = 2.0, 640, 360
FONT = os.path.join(os.path.dirname(__file__), "../../../assets/fonts/satoshi/Satoshi-Bold.otf")


def mmss(t):
    return f"{int(t)//60}:{t%60:04.1f}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cut", required=True); ap.add_argument("--cutsheet", required=True)
    ap.add_argument("--audit", required=True); ap.add_argument("--transcript-cut", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--only-flagged", action="store_true")
    a = ap.parse_args()
    cs = json.load(open(a.cutsheet)); au = json.load(open(a.audit))
    n = int(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets",
                            "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", a.cut],
                           capture_output=True, text=True, check=True).stdout.strip())
    if n != cs["totalFrames"]:
        sys.exit(f"{a.cut} has {n} frames, the cutsheet {cs['totalFrames']}: stale render, refusing")
    words = json.load(open(a.transcript_cut))["words"]
    dur = n / cs["fps"]
    flagged_at = {round(f["cut"][0], 2) for f in au["flags"] if f["kind"] != "PAUSE"}
    joins = au["joins"]
    tmp = tempfile.mkdtemp(); font = ImageFont.truetype(FONT, 17); small = ImageFont.truetype(FONT, 14)
    clips = []
    for k, j in enumerate(joins, 1):
        t = j["cut"]
        near = any(abs(t - x) < CONTEXT for x in flagged_at)
        if a.only_flagged and j["ok"] and not near:
            continue
        before = " ".join(w["word"] for w in words if t - 1.2 <= w["start"] < t)[-40:]
        after = " ".join(w["word"] for w in words if t <= w["start"] < t + 1.2)[:40]
        verdict = "ok" if j["ok"] else "PAUSE FLAG"
        img = Image.new("RGBA", (W, 74), (16, 16, 16, 225)); d = ImageDraw.Draw(img)
        d.text((12, 8), f"JOIN {k}/{len(joins)}   {mmss(t)}   pause {j['pause']:.2f}s   {verdict}"
               + ("   + audit flag nearby" if near else ""), font=font, fill=(255, 210, 90) if (not j["ok"] or near) else (235, 235, 235))
        d.text((12, 38), f"...{before}  |  {after}...", font=small, fill=(200, 200, 200))
        slate = os.path.join(tmp, f"s{k:03d}.png"); img.save(slate)
        t0 = max(0.0, t - CONTEXT); t1 = min(dur, t + CONTEXT); mark = t - t0
        clip = os.path.join(tmp, f"c{k:03d}.mp4")
        graph = (f"[0:v]scale={W}:{H},setsar=1[v];[v][1:v]overlay=0:0[v2];"
                 f"color=c=red:s={W}x8:d={t1 - t0:.3f}[bar];"
                 f"[v2][bar]overlay=0:{H - 8}:enable='between(t,{mark - 0.08:.3f},{mark + 0.08:.3f})',fps=30[vo];"
                 f"[0:a]aresample=48000,apad=whole_dur={t1 - t0 + 0.4:.3f}[ao];[vo]tpad=stop_mode=clone:stop_duration=0.4[vp]")
        subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-ss", f"{t0:.3f}", "-t", f"{t1 - t0:.3f}", "-i", a.cut,
                        "-loop", "1", "-i", slate, "-filter_complex", graph, "-map", "[vp]", "-map", "[ao]",
                        "-t", f"{t1 - t0 + 0.4:.3f}", "-c:v", "libx264", "-preset", "veryfast", "-b:v", "300k",
                        "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k", "-ar", "48000", "-ac", "2", clip], check=True)
        clips.append(clip)
    lst = os.path.join(tmp, "list.txt")
    open(lst, "w").write("".join(f"file '{c}'\n" for c in clips))
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy",
                    "-movflags", "+faststart", a.out], check=True)
    print(f"{a.out}: {len(clips)} joins, {os.path.getsize(a.out) / 1e6:.1f} MB")


main()
