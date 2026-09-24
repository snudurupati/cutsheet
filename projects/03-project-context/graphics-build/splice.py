#!/usr/bin/env python3
"""Assemble the base cut from transcript/cutsheet.json.

Every path is an argument and everything read is gated against the cutsheet
(hard rule 12). The gotchas this is built around, all of which ship silently:

  * `select` cannot reorder frames. It emits in source decode order, so a
    cutsheet that lifts a segment forward is honoured by the audio and ignored
    by the picture. Video is assembled PER SEGMENT and joined with the concat
    demuxer, which respects order.
  * `-c copy` desyncs on arbitrary cut points. Every segment is re-encoded.
  * Audio is never encoded per segment; it rides through lossless and is
    polished once, later, on the assembled track.
  * ffmpeg eats stdin and will swallow a job list. -nostdin everywhere.
  * Frames are authoritative. At 30fps/48kHz one frame is exactly 1600 samples,
    so a frame-exact cut is sample-exact and drift is zero by construction.
"""
import argparse, json, os, subprocess, sys

SAMPLES_PER_FRAME = 1600          # 48000 / 30, exact


def sh(cmd, **kw):
    r = subprocess.run(cmd, **kw)
    if r.returncode:
        sys.exit(f"failed: {' '.join(cmd[:6])} ...")
    return r


def probe(path, entries, stream=None):
    cmd = ["ffprobe", "-v", "error"]
    if stream:
        cmd += ["-select_streams", stream]
    cmd += ["-show_entries", entries, "-of", "default=noprint_wrappers=1:nokey=1", path]
    return subprocess.run(cmd, capture_output=True, text=True).stdout.split()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cutsheet", required=True)
    ap.add_argument("--workdir", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--out-audio", required=True)
    ap.add_argument("--grade", default="", help="video filterchain applied to every segment")
    ap.add_argument("--bitrate", default="60M")
    ap.add_argument("--seam-fade", type=float, default=0.004)
    ap.add_argument("--drift-fail-ms", type=float, default=40.0)
    a = ap.parse_args()

    cs = json.load(open(a.cutsheet))
    fps = cs["fps"]
    segs = [s for s in cs["segments"] if s.get("keep", True)]
    cam = cs["source"]["cam"]
    if not os.path.exists(cam):
        sys.exit(f"camera clip from the cutsheet is missing: {cam}")

    # gate what we read against the cutsheet before doing any work
    cam_frames = int(probe(cam, "stream=nb_frames", "v:0")[0])
    if segs[-1]["endFrame"] > cam_frames:
        sys.exit(f"cutsheet ends at frame {segs[-1]['endFrame']} but {cam} has {cam_frames}")
    for x, y in zip(segs, segs[1:]):
        if x["endFrame"] >= y["startFrame"]:
            sys.exit(f"overlapping segments {x['id']}/{y['id']}: an overlap duplicates "
                     "audio while video emits the frame once")

    os.makedirs(a.workdir, exist_ok=True)
    expect_frames = sum(s["endFrame"] - s["startFrame"] for s in segs)

    # ---------------------------------------------------------------- video ---
    vf = a.grade if a.grade else "null"
    listfile = os.path.join(a.workdir, "concat.txt")
    with open(listfile, "w") as lf:
        for i, s in enumerate(segs):
            part = os.path.join(a.workdir, f"v{i:04d}.mov")
            n = s["endFrame"] - s["startFrame"]
            if not (os.path.exists(part) and
                    probe(part, "stream=nb_frames", "v:0")[:1] == [str(n)]):
                sh(["ffmpeg", "-nostdin", "-v", "error", "-y",
                    "-ss", f"{s['startFrame']/fps:.6f}", "-i", cam,
                    "-frames:v", str(n), "-an", "-map_chapters", "-1",
                    "-vf", vf,
                    "-c:v", "h264_videotoolbox", "-b:v", a.bitrate,
                    "-profile:v", "high", "-pix_fmt", "yuv420p",
                    "-r", f"{fps:g}", part])
            got = int(probe(part, "stream=nb_frames", "v:0")[0])
            if got != n:
                sys.exit(f"{s['id']}: wanted {n} frames, encoded {got}")
            lf.write(f"file '{os.path.abspath(part)}'\n")
            print(f"  {s['id']}  {n:6d} frames", flush=True)

    vout = os.path.join(a.workdir, "video-only.mov")
    sh(["ffmpeg", "-nostdin", "-v", "error", "-y", "-f", "concat", "-safe", "0",
        "-i", listfile, "-c", "copy", "-map_chapters", "-1", vout])

    # ---------------------------------------------------------------- audio ---
    # one pass, lossless, with a 4ms micro-fade at every join. A butt-join leaves
    # a step wherever the two sides sit at different values, even in room tone.
    parts, labels = [], []
    for i, s in enumerate(segs):
        st, en = s["startFrame"] / fps, s["endFrame"] / fps
        d = en - st
        f = min(a.seam_fade, d / 4)
        parts.append(f"[0:a]atrim=start={st:.6f}:end={en:.6f},asetpts=PTS-STARTPTS,"
                     f"afade=t=in:st=0:d={f:.4f},"
                     f"afade=t=out:st={d-f:.4f}:d={f:.4f}[a{i}]")
        labels.append(f"[a{i}]")
    graph = ";".join(parts) + ";" + "".join(labels) + f"concat=n={len(segs)}:v=0:a=1[out]"
    gf = os.path.join(a.workdir, "audio_graph.txt")
    open(gf, "w").write(graph)
    # ffmpeg 9 removed -filter_complex_script; -/filter_complex reads it from a file
    sh(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", cam,
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
    print(f"\nwrote {a.out}")
    print(f"wrote {a.out_audio}")


main()
