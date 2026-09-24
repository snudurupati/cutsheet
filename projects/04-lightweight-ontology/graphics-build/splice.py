#!/usr/bin/env python3
"""Assemble the base cut from transcript/cutsheet.json.

Adapted from 03-project-context for a two-session job: every segment reads ITS
OWN camera (cutsheet segment["cam"]), and the audio graph takes one input per
session and trims each segment from the right one. Frames are local to that cam.

Every path is an argument and everything read is gated against the cutsheet
(hard rule 12). The gotchas this is built around, all of which ship silently:

  * `select` cannot reorder frames. Video is assembled PER SEGMENT and joined
    with the concat demuxer, which respects order.
  * `-c copy` desyncs on arbitrary cut points. Every segment is re-encoded.
  * Audio is never encoded per segment; it rides through lossless and is
    polished once, later, on the assembled track.
  * ffmpeg eats stdin and will swallow a job list. -nostdin everywhere.
  * Frames are authoritative. At 30fps/48kHz one frame is exactly 1600 samples.

DEFLICKER (tech-video-editor: runs by default on this rig). The room's lights
swell; graphics-build/exposure.json holds each frame's swell above the settled
level, traced on a clear wall patch. The swell is a tone-curve lift, not a flat
offset or a gain: on session B between a trough (331s) and a peak (337.2s) the
shirt rises x1.27, the walls x1.17-1.21 and the lamp x1.10, and clipped white
stays clipped. So the correction is a curve, eq's contrast + brightness + gamma,
FITTED AGAINST REAL FFMPEG OUTPUT (a pure-Python simulation of eq disagreed with
ffmpeg by ~3 luma, because eq takes an integer path when gamma is 1). At the
calibration swell of 22.8 luma the fit brings the peak frame to 0.70 rms of the
trough across every level from shadow to highlight, from 22.2 uncorrected.
Chroma barely moves in a swell (U +0.1, V -0.65), so saturation stays 1.0.
Each parameter scales linearly with the frame's own swell; verify_deflicker.py
checks that on frames at partial swell before anything is rendered.
"""
import argparse, json, os, subprocess, sys

SAMPLES_PER_FRAME = 1600
CAL_SWELL = 22.8                          # the swell the curve was fitted at
CAL_C, CAL_B, CAL_G = 0.8325, 0.0475, 0.675
SWELL_CAP = 30.0                          # never extrapolate far past calibration


def eq_params(s):
    k = min(max(s, 0.0), SWELL_CAP) / CAL_SWELL
    return (1.0 + (CAL_C - 1.0) * k, CAL_B * k, 1.0 + (CAL_G - 1.0) * k)


def sh(cmd, **kw):
    r = subprocess.run(cmd, **kw)
    if r.returncode:
        sys.exit(f"failed: {' '.join(cmd[:8])} ...")
    return r


def probe(path, entries, stream=None):
    cmd = ["ffprobe", "-v", "error"]
    if stream:
        cmd += ["-select_streams", stream]
    cmd += ["-show_entries", entries, "-of", "default=noprint_wrappers=1:nokey=1", path]
    return subprocess.run(cmd, capture_output=True, text=True).stdout.split()


def write_cmds(path, swell, sf, n, fps):
    """One eq update per frame whose correction differs from the previous one."""
    lines, last = [], None
    for i in range(n):
        c, b, g = eq_params(swell[sf + i])
        key = (round(c, 4), round(b, 4), round(g, 4))
        if key == last:
            continue
        last = key
        t = max(0.0, i / fps - 0.0005)
        lines.append(f"{t:.4f} eq@dfl contrast {c:.4f}, eq@dfl brightness {b:.4f}, "
                     f"eq@dfl gamma {g:.4f};")
    open(path, "w").write("\n".join(lines) + "\n")
    return len(lines)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cutsheet", required=True)
    ap.add_argument("--exposure", required=True, help="graphics-build/exposure.json")
    ap.add_argument("--workdir", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--out-audio", required=True)
    ap.add_argument("--bitrate", default="60M")
    ap.add_argument("--seam-fade", type=float, default=0.004)
    ap.add_argument("--drift-fail-ms", type=float, default=40.0)
    ap.add_argument("--only", help="comma list of segment ids, for a test render")
    a = ap.parse_args()

    cs = json.load(open(a.cutsheet))
    ex = json.load(open(a.exposure))
    fps = cs["fps"]
    segs = [s for s in cs["segments"] if s.get("keep", True)]
    if a.only:
        want = set(a.only.split(","))
        segs = [s for s in segs if s["id"] in want]
    sess = {s["id"]: s for s in cs["sessions"]}

    # gate every input against the cutsheet before doing any work
    for sid, s in sess.items():
        if not os.path.exists(s["cam"]):
            sys.exit(f"{sid}: camera clip from the cutsheet is missing: {s['cam']}")
        got = int(probe(s["cam"], "stream=nb_frames", "v:0")[0])
        if got != s["camFrames"]:
            sys.exit(f"{sid}: {s['cam']} has {got} frames, cutsheet says {s['camFrames']}")
        e = ex["sessions"].get(sid)
        if not e or e["cam"] != s["cam"] or e["frames"] != got:
            sys.exit(f"{sid}: exposure trace is for a different clip or length")
    for x, y in zip(segs, segs[1:]):
        if x["session"] == y["session"] and x["endFrame"] >= y["startFrame"]:
            sys.exit(f"overlapping segments {x['id']}/{y['id']}")
        if x["cam"] != sess[x["session"]]["cam"]:
            sys.exit(f"{x['id']}: cam disagrees with its session")

    os.makedirs(a.workdir, exist_ok=True)
    expect_frames = sum(s["endFrame"] - s["startFrame"] for s in segs)

    # ---------------------------------------------------------------- video ---
    listfile = os.path.join(a.workdir, "concat.txt")
    with open(listfile, "w") as lf:
        for s in segs:
            part = os.path.join(a.workdir, f"{s['id']}.mov")
            n = s["endFrame"] - s["startFrame"]
            cmdf = os.path.join(a.workdir, f"{s['id']}.dfl.txt")
            ncmd = write_cmds(cmdf, ex["sessions"][s["session"]]["swell"],
                              s["startFrame"], n, fps)
            # Reuse an encoded segment only if it was made from exactly this
            # source range and correction. Keying on id + frame count alone reuses
            # a stale part whenever an edit shifts a segment but keeps its length.
            keyf = os.path.join(a.workdir, f"{s['id']}.key")
            key = json.dumps([s["cam"], s["startFrame"], s["endFrame"],
                              open(cmdf).read()], sort_keys=True)
            fresh = (os.path.exists(part) and os.path.exists(keyf)
                     and open(keyf).read() == key
                     and probe(part, "stream=nb_frames", "v:0")[:1] == [str(n)])
            if not fresh:
                sh(["ffmpeg", "-nostdin", "-v", "error", "-y",
                    "-ss", f"{s['startFrame']/fps:.6f}", "-i", s["cam"],
                    "-frames:v", str(n), "-an", "-map_chapters", "-1",
                    "-vf", f"sendcmd=f='{cmdf}',eq@dfl=contrast=1:brightness=0:gamma=1",
                    "-c:v", "h264_videotoolbox", "-b:v", a.bitrate,
                    "-profile:v", "high", "-pix_fmt", "yuv420p",
                    "-r", f"{fps:g}", part])
            got = int(probe(part, "stream=nb_frames", "v:0")[0])
            if got != n:
                sys.exit(f"{s['id']}: wanted {n} frames, encoded {got}")
            if not fresh:
                open(keyf, "w").write(key)
            lf.write(f"file '{os.path.abspath(part)}'\n")
            print(f"  {s['id']} {s['session']}  {n:6d} frames  {ncmd:5d} deflicker steps", flush=True)

    vout = os.path.join(a.workdir, "video-only.mov")
    sh(["ffmpeg", "-nostdin", "-v", "error", "-y", "-f", "concat", "-safe", "0",
        "-i", listfile, "-c", "copy", "-map_chapters", "-1", vout])

    # ---------------------------------------------------------------- audio ---
    order = [s["id"] for s in cs["sessions"]]
    inputs = []
    for sid in order:
        inputs += ["-i", sess[sid]["cam"]]
    parts, labels = [], []
    for i, s in enumerate(segs):
        k = order.index(s["session"])
        st, en = s["startFrame"] / fps, s["endFrame"] / fps
        d = en - st
        f = min(a.seam_fade, d / 4)
        parts.append(f"[{k}:a:0]atrim=start={st:.6f}:end={en:.6f},asetpts=PTS-STARTPTS,"
                     f"afade=t=in:st=0:d={f:.4f},afade=t=out:st={d-f:.4f}:d={f:.4f}[a{i}]")
        labels.append(f"[a{i}]")
    graph = ";".join(parts) + ";" + "".join(labels) + f"concat=n={len(segs)}:v=0:a=1[out]"
    gf = os.path.join(a.workdir, "audio_graph.txt")
    open(gf, "w").write(graph)
    sh(["ffmpeg", "-nostdin", "-v", "error", "-y", *inputs,
        "-/filter_complex", gf, "-map", "[out]",
        "-c:a", "pcm_s24le", "-ar", "48000", "-ac", "1", a.out_audio])

    # ------------------------------------------------------------ verify+mux ---
    vframes = int(probe(vout, "stream=nb_frames", "v:0")[0])
    asamples = int(probe(a.out_audio, "stream=duration_ts", "a:0")[0])
    print(f"\nvideo frames  {vframes}  (expected {expect_frames})")
    print(f"audio samples {asamples}  (expected {expect_frames*SAMPLES_PER_FRAME})")
    if vframes != expect_frames:
        sys.exit("video frame count does not match the cutsheet")
    if asamples != expect_frames * SAMPLES_PER_FRAME:
        sys.exit("audio sample count does not match the cutsheet")
    drift_ms = abs(vframes / fps - asamples / 48000.0) * 1000
    print(f"a/v drift     {drift_ms:.4f} ms  (gate {a.drift_fail_ms} ms)")
    if drift_ms > a.drift_fail_ms:
        sys.exit("drift gate failed")
    sh(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", vout, "-i", a.out_audio,
        "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "pcm_s24le",
        "-map_chapters", "-1", a.out])
    print(f"\nwrote {a.out}\nwrote {a.out_audio}")


main()
