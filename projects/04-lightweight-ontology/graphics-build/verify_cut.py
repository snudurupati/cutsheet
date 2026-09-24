#!/usr/bin/env python3
"""Content gate for an assembled render. Hard rule 11: two halves, both required.

  AUDIO half  transcribe windows of the RENDER and compare against
              outputs/transcript-cut.json. Fails below ~70% word match.

  VIDEO half  map cut timestamps through the cutsheet to their SOURCE frames and
              compare pixels against the raw camera clip. This is the half that
              is not circular: transcript-cut.json is generated from the cutsheet
              so it agrees with anything else generated from the cutsheet, and on
              2026-08-30 a render with video in source order and audio in play
              order scored 98% on the audio half alone.

The first two seconds are always sampled. When a segment is lifted to the front
the two orderings re-converge after it, so every later window passes under both.

04-lightweight-ontology: two sessions, so a cut time maps to (session camera,
frame), never to one global clip, and marks are added either side of the A->B
join. The base cut is deflickered per frame, so the reference frame pulled from
the raw clip gets the SAME per-frame correction (splice.eq_params on that source
frame's swell from exposure.json) before comparison.

The base cut is graded, so the reference frame pulled from the raw clip has the
same grade applied before comparison. Without that every frame reads as a
mismatch and the gate is useless.
"""
import argparse, json, os, re, subprocess, sys, tempfile


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


def frame_png(src, t, out, grade=None, w=480):
    vf = f"scale={w}:-2" if not grade else f"{grade},scale={w}:-2"
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-ss", f"{t:.6f}",
                    "-i", src, "-frames:v", "1", "-vf", vf, "-y", out], check=True)


def mean_abs_diff(a, b):
    r = run(["ffmpeg", "-nostdin", "-hide_banner", "-nostats", "-i", a, "-i", b,
             "-filter_complex", "blend=all_mode=difference,signalstats,"
             "metadata=print:key=lavfi.signalstats.YAVG", "-f", "null", "-"])
    m = re.search(r"YAVG=([\d.]+)", r.stdout + r.stderr)
    return float(m.group(1)) if m else None


def cut_to_source(cs, t):
    """Map a time on the edited timeline to (camera clip, seconds on it, segment)."""
    fps = cs["fps"]; acc = 0
    for s in cs["segments"]:
        n = s["endFrame"] - s["startFrame"]
        if acc / fps <= t < (acc + n) / fps:
            return (s["startFrame"] + round((t - acc / fps) * fps)) / fps, s["id"], s
        acc += n
    return None, None, None


# the splice's own correction, so the reference is corrected exactly as the render
CAL_SWELL, CAL_C, CAL_B, CAL_G, SWELL_CAP = 22.8, 0.8325, 0.0475, 0.675, 30.0
def dfl(swell):
    k = min(max(swell, 0.0), SWELL_CAP) / CAL_SWELL
    return (f"eq=contrast={1+(CAL_C-1)*k:.4f}:brightness={CAL_B*k:.4f}:"
            f"gamma={1+(CAL_G-1)*k:.4f}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--render", required=True)
    ap.add_argument("--cutsheet", required=True)
    ap.add_argument("--cut-transcript", required=True)
    ap.add_argument("--exposure", required=True, help="graphics-build/exposure.json")
    ap.add_argument("--audio-windows", default="0,900,1600")
    ap.add_argument("--audio-window-len", type=float, default=30.0)
    ap.add_argument("--whisper-model", default="base")
    ap.add_argument("--match-fail", type=float, default=0.70)
    ap.add_argument("--pixel-fail", type=float, default=1.5)
    ap.add_argument("--halves", default="both", choices=["both", "video", "audio"],
                    help="The VIDEO half compares the render against the raw CAMERA, so "
                         "it is only meaningful on a pure talking-head cut. Point it at a "
                         "graphics pass and every mark inside the screen recording or a "
                         "full-frame takeover reads as misplaced, because the camera is "
                         "deliberately not what is on screen there. Use --halves video on "
                         "the base cut, --halves audio on the finished render (which is "
                         "where a mix can shift the audio), and verify_composite.py for "
                         "the layers in between")
    a = ap.parse_args()

    cs = json.load(open(a.cutsheet))
    cut = json.load(open(a.cut_transcript))
    ex = json.load(open(a.exposure))

    # gate the inputs against the cutsheet before trusting anything
    if cut.get("totalFrames") != cs["totalFrames"]:
        sys.exit("cut transcript and cutsheet disagree on length; stale artefact")
    rf = int(run(["ffprobe", "-v", "error", "-select_streams", "v:0",
                  "-show_entries", "stream=nb_frames", "-of",
                  "default=nw=1:nk=1", a.render]).stdout.strip())
    print(f"render frames {rf}  cutsheet {cs['totalFrames']}"
          f"  {'OK' if rf == cs['totalFrames'] else 'MISMATCH'}\n")

    tmp = tempfile.mkdtemp()
    ok = True

    # ------------------------------------------------------------ VIDEO half ---
    fps = cs["fps"]
    if a.halves == "audio":
        print("VIDEO half skipped (--halves audio)\n")
    if a.halves != "audio":
        dur = cs["totalFrames"] / fps
        marks = [0.5, 1.0, 1.5, 2.0] + [round(dur * f, 2) for f in
                                        (.08, .16, .25, .34, .45, .56, .67, .78, .9, .97)]
        acc = 0                                  # either side of the session join
        for x, y in zip(cs["segments"], cs["segments"][1:]):
            acc += x["endFrame"] - x["startFrame"]
            if x["session"] != y["session"]:
                marks += [round(acc / fps - 1.0, 2), round(acc / fps + 1.0, 2)]
        marks.sort()
        print("VIDEO half: render vs RAW footage, mapped through the cutsheet")
        print("gate: the mapped source frame must be the CLOSEST match in its own")
        print("neighbourhood, and a far frame must be clearly worse. The neighbourhood")
        print("test is used because it needs no calibration, but WATCH THE FLOOR: a")
        print("faithful re-encode matches its source at ~0.1 mean difference with")
        print("far-frame ratios of 20-90x. On 2026-09-08 this gate read a 1.6 floor")
        print("with 2-3x ratios and that was rationalised as encoder noise. It was not.")
        print("It was a corrective grade destroying facial contrast, which the human")
        print("spotted before the pipeline did. A floor an order of magnitude above 0.1")
        print("means something is altering the picture. Investigate it, do not explain it.\n")
        print(f"{'cut t':>9} {'source t':>10} {'seg':>6} {'best@':>6} {'min':>7} {'far':>7} {'ratio':>6}")
        W = 3                                     # neighbours either side
        for t in marks:
            st, sid, seg = cut_to_source(cs, t)
            if st is None:
                continue
            n0 = round(st * fps)
            cam = seg["cam"]
            grade = dfl(ex["sessions"][seg["session"]]["swell"][n0])
            A = os.path.join(tmp, "a.png")
            frame_png(a.render, t, A)
            # one decode pass gives genuinely consecutive frames; per-frame seeking
            # rounds and silently hands back a neighbour
            pat = os.path.join(tmp, "ref_%02d.png")
            for f in os.listdir(tmp):
                if f.startswith("ref_"):
                    os.remove(os.path.join(tmp, f))
            vf = f"{grade},"
            subprocess.run(["ffmpeg", "-nostdin", "-v", "error",
                            "-ss", f"{(n0-W)/fps:.6f}", "-i", cam,
                            "-frames:v", str(2*W+1), "-fps_mode", "passthrough",
                            "-vf", f"{vf}scale=480:-2", "-y", pat], check=True)
            ds = []
            for i in range(1, 2*W+2):
                p = os.path.join(tmp, f"ref_{i:02d}.png")
                ds.append(mean_abs_diff(A, p) if os.path.exists(p) else 99.0)
            best = min(range(len(ds)), key=lambda i: ds[i])
            # a frame far away, as the contrast case
            F = os.path.join(tmp, "far.png")
            frame_png(cam, st + 3.0, F, grade=grade)
            far = mean_abs_diff(A, F) or 99.0
            ratio = far / ds[best] if ds[best] else 0
            good = abs(best - W) <= 1 and ratio >= 1.25
            print(f"{t:9.2f} {seg['session'].upper()}{st:9.2f} {sid:>6} {best-W:+6d} {ds[best]:7.3f} "
                  f"{far:7.3f} {ratio:6.2f}{'' if good else '   <-- MISPLACED'}")
            if not good:
                ok = False
        print()

    # ------------------------------------------------------------ AUDIO half ---
    if a.halves == "video":
        print("AUDIO half skipped (--halves video)")
        print("\nRESULT:", "PASS" if ok else "FAIL")
        sys.exit(0 if ok else 1)
    words = cut["words"]
    print("AUDIO half: transcribe the render, compare against the cut transcript")
    for w0 in [float(x) for x in a.audio_windows.split(",")]:
        w1 = w0 + a.audio_window_len
        wav = os.path.join(tmp, f"w{int(w0)}.wav")
        subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-ss", str(w0),
                        "-t", str(a.audio_window_len), "-i", a.render,
                        "-vn", "-ac", "1", "-ar", "16000", "-y", wav], check=True)
        r = run(["whisperx", wav, "--model", a.whisper_model, "--language", "en",
                 "--device", "cpu", "--compute_type", "int8", "--no_align",
                 "--output_format", "json", "--output_dir", tmp])
        jf = os.path.join(tmp, os.path.basename(wav).replace(".wav", ".json"))
        if not os.path.exists(jf):
            print(f"  {w0:7.0f}s  whisper produced nothing"); ok = False; continue
        heard = re.findall(r"[a-z0-9']+",
                           " ".join(s["text"] for s in json.load(open(jf))["segments"]).lower())
        expect = re.findall(r"[a-z0-9']+",
                            " ".join(x["word"] for x in words
                                     if w0 <= x["start"] < w1).lower())
        lead = expect[:40]
        hit = 0; pool = list(heard)
        for t in lead:
            if t in pool:
                pool.remove(t); hit += 1
        score = hit / len(lead) if lead else 0
        print(f"  {w0:7.0f}s  {hit}/{len(lead)} leading words matched  = {score:.0%}"
              f"{'' if score >= a.match_fail else '   <-- FAIL'}")
        if score < a.match_fail:
            ok = False

    print("\nRESULT:", "PASS" if ok else "FAIL")
    sys.exit(0 if ok else 1)


main()
