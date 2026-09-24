#!/usr/bin/env python3
"""Trace the room's light swell per frame, for the deflicker in splice.py.

The key lights in this room swell irregularly: on session B the wall goes 108 ->
131 luma over ~3s and back, every region moving together (wall/wall/picture
correlate 0.99-1.00). ISO is locked (noise test, 2026-09-22: sensor noise does
not rise as the signal falls). So this is the lights, and the skill says
deflicker runs by default on this rig.

The reference is a clear wall patch at the far left of the frame: never
occupied by the speaker, so his movement cannot leak into the trace, which is
what a whole-frame average (ffmpeg's own deflicker) would do.

Output, per session: the wall luma of every frame, and the SWELL, i.e. how far
that frame sits above the settled level. The settled level is a rolling low
percentile, because the room rests at its trough and swells upward from it.
"""
import argparse, json, re, subprocess, sys

WALL = "600:800:200:200"        # w:h:x:y in 3840x2160 source. Clear on both sessions
BASE_WINDOW_S = 20.0            # rolling window for the settled level
BASE_PCTL = 0.15                # the trough state, not the mean
SMOOTH_F = 5                    # frames; removes codec noise, keeps a 3s swell


def first_pts(cam):
    o = subprocess.run(["ffmpeg", "-nostdin", "-hwaccel", "videotoolbox", "-i", cam,
                        "-frames:v", "1", "-vf", "showinfo", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
    return int(re.search(r"n:\s*0\s+pts:\s*(\d+)", o).group(1))


def trace(cam):
    p = subprocess.run(["ffmpeg", "-nostdin", "-hwaccel", "videotoolbox", "-i", cam,
                        "-vf", f"crop={WALL},scale=60:80,signalstats,"
                               "metadata=print:key=lavfi.signalstats.YAVG:file=-",
                        "-an", "-f", "null", "-"], capture_output=True, text=True)
    return [float(x) for x in re.findall(r"YAVG=([\d.]+)", p.stdout)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cutsheet", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    cs = json.load(open(a.cutsheet))
    fps = cs["fps"]
    out = {"wallCrop": WALL, "baseWindowSeconds": BASE_WINDOW_S,
           "basePercentile": BASE_PCTL, "smoothFrames": SMOOTH_F, "sessions": {}}
    for s in cs["sessions"]:
        y = trace(s["cam"])
        # gate: one value per frame of THIS camera clip, or the trace is misaligned.
        # Session A's decoder emits 64990 of 64991 packets: decoding starts at pts 0
        # and it is the LAST frame (2166.367s, in the black tail) that never comes
        # out. A short tail is tolerated only when the head is proven aligned and
        # the cutsheet never reads the missing frames; anything else fails.
        short = s["camFrames"] - len(y)
        used = max(x["endFrame"] for x in cs["segments"] if x["session"] == s["id"])
        if short:
            if not (0 < short <= 2 and first_pts(s["cam"]) == 0 and used <= len(y)):
                sys.exit(f"{s['id']}: traced {len(y)} frames, clip has "
                         f"{s['camFrames']}, cut reads to frame {used}")
            print(f"{s['id']}: decoder drops the last {short} frame(s); head aligned "
                  f"at pts 0 and the cut ends at frame {used}, so the tail is padded")
            y += [y[-1]] * short
        h = SMOOTH_F // 2
        sm = [sum(y[max(0, i-h):i+h+1]) / len(y[max(0, i-h):i+h+1]) for i in range(len(y))]
        W = int(BASE_WINDOW_S * fps) // 2
        step = 15                      # evaluate the percentile every half second
        anchors = {}
        for i in range(0, len(sm), step):
            win = sorted(sm[max(0, i-W):i+W+1])
            anchors[i] = win[int(BASE_PCTL * (len(win)-1))]
        keys = sorted(anchors)
        base = []
        for i in range(len(sm)):
            k0 = (i // step) * step
            k1 = min(k0 + step, keys[-1])
            v0, v1 = anchors[k0], anchors[k1]
            base.append(v0 + (v1 - v0) * ((i - k0) / step if k1 > k0 else 0))
        swell = [max(0.0, v - b) for v, b in zip(sm, base)]
        out["sessions"][s["id"]] = {"cam": s["cam"], "frames": len(y),
                                    "wall": [round(v, 2) for v in sm],
                                    "swell": [round(v, 2) for v in swell]}
        big = sum(1 for v in swell if v > 5)
        print(f"{s['id']}: {len(y)} frames, wall {min(sm):.1f}-{max(sm):.1f}, "
              f"swell max {max(swell):.1f}, frames swelling >5 luma: {big} "
              f"({100*big/len(y):.1f}%)")
    json.dump(out, open(a.out, "w"))
    print(f"wrote {a.out}")


main()
