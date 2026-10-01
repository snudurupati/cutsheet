#!/usr/bin/env python3
"""Assemble the base cut (camera + voice) from transcript/cutsheet.json.

Adapted from 04-lightweight-ontology for this job:

  * NO DEFLICKER. Frame-wide drift measured stdev 0.75 (A) and 1.1 (B), under
    the 2.0 guard, so the conditional correction does not run.
  * WHITE BALANCE MATCH, session B onto A. AWB was on auto (human, 2026-09-29)
    and re-settled when the overheated camera restarted: B is cooler. Measured
    on 12 frames per session across four static regions (two wall patches, the
    top wall, the picture frame) at different levels, the A/B ratio is the same
    multiplicative gain everywhere: R 1.037-1.052, G 0.983-0.999, B 0.948-0.960.
    A constant gain at every level is a white balance shift, not exposure.
  * SPEED SEGMENTS (kind ff / compress, human direction 2026-09-29). Video
    keeps source frame startFrame + ceil(i*speed) as output frame i, exactly
    outFrames of them. Compress audio is
    time-compressed with atempo so typing stays in sync with the keys; ff audio
    is muted, the fast-forward sample goes under it in finishing.

Kept from 04, all of which ship silently otherwise:
  * `select` cannot reorder frames: video is assembled per segment and joined
    with the concat demuxer, which respects order.
  * `-c copy` desyncs on arbitrary cut points: every segment is re-encoded.
  * Audio is never encoded per segment; it rides through lossless and is
    polished once, later, on the assembled track.
  * -nostdin everywhere. Frames are authoritative; 1 frame = 1600 samples.

Every path is an argument and everything read is gated against the cutsheet
(hard rule 12).
"""
import argparse, json, os, subprocess, sys

SAMPLES_PER_FRAME = 1600
WB = {"b": (1.047, 0.995, 0.955)}     # per-session RGB gains onto session A


def sh(cmd):
    r = subprocess.run(cmd)
    if r.returncode:
        sys.exit(f"failed: {' '.join(cmd[:10])} ...")


def probe(path, entries, stream=None):
    cmd = ["ffprobe", "-v", "error"]
    if stream:
        cmd += ["-select_streams", stream]
    cmd += ["-show_entries", entries, "-of", "default=noprint_wrappers=1:nokey=1", path]
    return subprocess.run(cmd, capture_output=True, text=True).stdout.split()


def vfilter(s, fps):
    f = []
    if s["kind"] != "speech":
        # output frame i is source frame startFrame + ceil(i*speed), exactly. The
        # first version used setpts+fps, whose resampling phase landed 0.5-1.2 cut
        # frames off that mapping (verify_cut, 2026-09-29): content right, mapping
        # not deterministic, and the fast-forward clocks are timed against it.
        k = s["speed"]
        f.append(f"select='eq(n\\,0)+gt(floor(n/{k:.6f})\\,floor((n-1)/{k:.6f}))',"
                 f"setpts=N/({fps:g}*TB)")
    g = WB.get(s["session"])
    if g:
        f.append(f"colorchannelmixer=rr={g[0]}:gg={g[1]}:bb={g[2]}")
    return ",".join(f) or "null"


def atempo_chain(speed):
    """atempo takes 0.5..100 per stage; split into stages of at most 2 for quality"""
    out, r = [], speed
    while r > 2.0:
        out.append("atempo=2.0"); r /= 2.0
    out.append(f"atempo={r:.6f}")
    return ",".join(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cutsheet", required=True)
    ap.add_argument("--workdir", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--out-audio", required=True)
    ap.add_argument("--bitrate", default="60M")
    ap.add_argument("--seam-fade", type=float, default=0.004)
    ap.add_argument("--drift-fail-ms", type=float, default=40.0)
    a = ap.parse_args()

    cs = json.load(open(a.cutsheet))
    fps = cs["fps"]
    segs = [s for s in cs["segments"] if s.get("keep", True)]
    sess = {s["id"]: s for s in cs["sessions"]}

    for sid, s in sess.items():
        if not os.path.exists(s["cam"]):
            sys.exit(f"{sid}: camera clip from the cutsheet is missing: {s['cam']}")
        got = int(probe(s["cam"], "stream=nb_frames", "v:0")[0])
        if got != s["camFrames"]:
            sys.exit(f"{sid}: {s['cam']} has {got} frames, cutsheet says {s['camFrames']}")
    for x, y in zip(segs, segs[1:]):
        if x["session"] == y["session"] and x["endFrame"] > y["startFrame"]:
            sys.exit(f"overlapping segments {x['id']}/{y['id']}")
        if x["cam"] != sess[x["session"]]["cam"]:
            sys.exit(f"{x['id']}: cam disagrees with its session")
    for s in segs:
        want = s["endFrame"] - s["startFrame"] if s["kind"] == "speech" else s["outFrames"]
        if s["outFrames"] != want:
            sys.exit(f"{s['id']}: 1x segment whose outFrames disagrees with its range")
    if sum(s["outFrames"] for s in segs) != cs["totalFrames"]:
        sys.exit("cutsheet totalFrames disagrees with its segments; stale file")

    os.makedirs(a.workdir, exist_ok=True)
    expect_frames = cs["totalFrames"]

    # ---------------------------------------------------------------- video ---
    listfile = os.path.join(a.workdir, "concat.txt")
    with open(listfile, "w") as lf:
        for s in segs:
            part = os.path.join(a.workdir, f"{s['id']}.mov")
            n = s["outFrames"]
            vf = vfilter(s, fps)
            keyf = part + ".key"
            key = json.dumps([s["cam"], s["startFrame"], s["endFrame"], n, vf], sort_keys=True)
            fresh = (os.path.exists(part) and os.path.exists(keyf)
                     and open(keyf).read() == key
                     and probe(part, "stream=nb_frames", "v:0")[:1] == [str(n)])
            if not fresh:
                sh(["ffmpeg", "-nostdin", "-v", "error", "-y",
                    "-ss", f"{s['startFrame']/fps:.6f}", "-i", s["cam"],
                    "-frames:v", str(n), "-an", "-map_chapters", "-1", "-vf", vf,
                    "-c:v", "h264_videotoolbox", "-b:v", a.bitrate,
                    "-profile:v", "high", "-pix_fmt", "yuv420p",
                    "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
                    "-r", f"{fps:g}", part])
            got = int(probe(part, "stream=nb_frames", "v:0")[0])
            if got != n:
                sys.exit(f"{s['id']}: wanted {n} frames, encoded {got}")
            if not fresh:
                open(keyf, "w").write(key)
            lf.write(f"file '{os.path.abspath(part)}'\n")
            speed = "" if s["kind"] == "speech" else f"  ({s['speed']:.1f}x)"
            print(f"  {s['id']} {s['session']} {s['kind']:8s} {n:6d} frames{speed}", flush=True)

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
        nsamp = s["outFrames"] * SAMPLES_PER_FRAME
        d = s["outFrames"] / fps
        f = min(a.seam_fade, d / 4)
        if s["kind"] == "speech":
            body = f"atrim=start={st:.6f}:end={en:.6f},asetpts=PTS-STARTPTS"
        elif s["kind"] == "compress":
            body = (f"atrim=start={st:.6f}:end={en:.6f},asetpts=PTS-STARTPTS,"
                    f"{atempo_chain(s['speed'])},apad,atrim=end_sample={nsamp},asetpts=PTS-STARTPTS")
        else:   # ff: muted; the fast-forward sample is laid under it in finishing
            body = (f"atrim=start={st:.6f}:end={st + d:.6f},asetpts=PTS-STARTPTS,volume=0,"
                    f"apad,atrim=end_sample={nsamp}")
        parts.append(f"[{k}:a:0]{body},aresample=48000,"
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
    drift_ms = abs(vframes / fps - asamples / 48000.0) * 1000
    print(f"a/v drift     {drift_ms:.4f} ms  (gate {a.drift_fail_ms} ms)")
    if drift_ms > a.drift_fail_ms:
        sys.exit("drift gate failed")
    if asamples != expect_frames * SAMPLES_PER_FRAME:
        sys.exit("audio sample count does not match the cutsheet")
    sh(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", vout, "-i", a.out_audio,
        "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "pcm_s24le",
        "-map_chapters", "-1", a.out])
    print(f"\nwrote {a.out}\nwrote {a.out_audio}")


main()
