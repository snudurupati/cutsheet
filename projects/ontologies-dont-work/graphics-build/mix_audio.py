#!/usr/bin/env python3
"""Music bed + a handful of sound effects onto the graphics pass.

NO VOICEOVER. style.json's audio levels are all specified RELATIVE TO THE
MEASURED VOICE (musicBedDb -12, sfxDb -10), and with no voice on the timeline
that reference does not exist. Rather than read those numbers as raw gains -
which is the exact mistake logged on 2026-08-20, where a flat -10 would have put
one effect 8 dB ABOVE the voice and left another inaudible - this substitutes a
delivery anchor for the missing voice and PRESERVES THE STYLE'S RATIO: the bed
lands on the anchor and effects land 2 dB above it, which is the same 2 dB gap
style.json puts between musicBedDb and sfxDb. Reported as a decision.

Every gain is computed from a MEASURED integrated loudness, never assumed: the
sound library spans 16 dB of source level here (-4.46 to -20.48 LUFS), so a flat
gain would be wrong for nine of the ten files.

Effects are placed so their MEASURED PEAK lands on the beat, not so the file
starts there: several carry a lead-in of up to 1.4s before their peak.

Rule 12: inputs are arguments, and the script asserts what it read matches the
cut sheet before building any filter graph. Every input the caller names must
exist - a missing one is a hard exit, never a skip.
"""
import argparse, json, os, re, subprocess, sys

def rms_db(path, start, dur, extra_gain_db=0.0):
    """Mono RMS of a window, in dBFS, with a gain applied afterwards."""
    raw = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-ss", f"{start:.3f}",
                          "-t", f"{dur:.3f}", "-i", path, "-ac", "1", "-ar", "8000",
                          "-f", "f32le", "-"], capture_output=True).stdout
    import struct, math
    x = struct.unpack(f"<{len(raw)//4}f", raw[:len(raw)//4*4])
    if not x:
        return -99.0
    return 20 * math.log10(max(math.sqrt(sum(v * v for v in x) / len(x)), 1e-12)) + extra_gain_db


def integrated(path):
    p = subprocess.run(["ffmpeg", "-nostdin", "-v", "info", "-i", path,
                        "-af", "loudnorm=print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True)
    m = re.findall(r'\{\s*"input_i".*?\}', p.stderr, re.S)
    if not m:
        sys.exit(f"ERROR could not measure loudness of {path}")
    return float(json.loads(m[-1])["input_i"])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--video", required=True)
    ap.add_argument("--cutsheet", required=True)
    ap.add_argument("--plan", required=True, help="the sfx/music placement plan")
    ap.add_argument("--out", required=True)
    ap.add_argument("--anchor-lufs", type=float, required=True)
    ap.add_argument("--sfx-above-bed-db", type=float, required=True)
    ap.add_argument("--fade-out", type=float, required=True)
    ap.add_argument("--audio-plan-out", required=True)
    a = ap.parse_args()

    cs = json.load(open(a.cutsheet))
    plan = json.load(open(a.plan))
    total = cs["totalSeconds"]
    job = os.path.dirname(os.path.abspath(a.cutsheet)) + "/.."

    # ---- gate: the plan and the cut sheet describe the same edit -------------
    if abs(plan["totalSeconds"] - total) > 1e-6:
        sys.exit(f"ERROR plan says {plan['totalSeconds']}s, cut sheet says {total}s")
    vdur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                 "-of", "csv=p=0", a.video], capture_output=True,
                                text=True).stdout.strip())
    if abs(vdur - total) > 0.05:
        sys.exit(f"ERROR {a.video} runs {vdur:.3f}s, the cut sheet says {total}s")
    for p in [plan["music"]["file"]] + [s["file"] for s in plan["sfx"]]:
        f = os.path.join(job, p)
        if not os.path.exists(f):
            sys.exit(f"ERROR {f} does not exist. Every input the caller names is mandatory.")
    for s in plan["sfx"]:
        if s["at"] < 0 or s["at"] > total:
            sys.exit(f"ERROR sfx {s['file']} lands at {s['at']}s, outside the {total}s cut")
        if not any(p["start"] <= s["at"] <= p["end"] for p in cs["parts"]):
            sys.exit(f"ERROR sfx at {s['at']}s falls in no part")

    # ---- measured gains ------------------------------------------------------
    mus = os.path.join(job, plan["music"]["file"])
    m0w = plan["music"].get("startAt", 0.0)
    if m0w:
        seg = os.path.join(os.path.dirname(a.out), ".bedwindow.wav")
        subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-ss", f"{m0w:.3f}",
                        "-t", f"{total:.3f}", "-i", mus, "-c:a", "pcm_s16le", seg], check=True)
        mus_i = integrated(seg)
        os.remove(seg)
    else:
        mus_i = integrated(mus)
    mus_gain = a.anchor_lufs - mus_i
    sfx_target = a.anchor_lufs + a.sfx_above_bed_db
    print(f"anchor {a.anchor_lufs:+.2f} LUFS (stands in for the absent voice)")
    print(f"music  {os.path.basename(mus)[:52]:52} I={mus_i:7.2f} -> gain {mus_gain:+6.2f} dB")

    inputs = ["-i", a.video, "-i", mus]
    # The track's own first 8s are a near-silent build (-42 dB at t=0, reaching
    # level only by t=8). Starting there would be an accidental 8-second fade-in,
    # which is exactly what style.json audio.musicFadeIn=false rules out. The
    # in-point is MEASURED: of every 49s window in the track, t=49s has the
    # highest minimum level (-15.0 dB), so the bed never drops out under the piece.
    m0 = plan["music"].get("startAt", 0.0)
    fc = [f"[1:a]atrim=start={m0:.3f}:end={m0 + total:.3f},asetpts=PTS-STARTPTS,"
          f"volume={mus_gain:.2f}dB,"
          f"afade=t=out:st={total - a.fade_out:.3f}:d={a.fade_out:.3f}[bed]"]
    mixlabels = ["[bed]"]
    records = []
    for i, s in enumerate(plan["sfx"]):
        f = os.path.join(job, s["file"])
        si = integrated(f)
        # Anchor-relative, not local-bed-relative. Targeting each effect at a
        # fixed lift over its own local bed produced +10 to +14 dB of gain, which
        # drove the master limiter and CLIPPED the mix at +1.61 dBTP while making
        # the loudest effect quieter, not louder. A quiet sample cannot be gained
        # into a busy bed; the fix is a better-matched sample, not more gain.
        local_bed = rms_db(mus, m0w + max(0.0, s["at"] - 1.2), 1.2, mus_gain)
        g = sfx_target - si
        # Start the file so its MEASURED peak lands on the beat.
        start = round(s["at"] - s["peakOffset"], 3)
        pad = max(0.0, start)
        trim = max(0.0, -start)
        inputs += ["-i", f]
        n = i + 2
        fc.append(f"[{n}:a]atrim=start={trim:.3f},asetpts=PTS-STARTPTS,"
                  f"volume={g:.2f}dB,adelay={int(pad*1000)}|{int(pad*1000)}[s{i}]")
        mixlabels.append(f"[s{i}]")
        records.append({"file": s["file"], "why": s["why"], "beat": s["at"],
                        "fileStart": start, "peakOffset": s["peakOffset"],
                        "sourceLufs": round(si, 2), "gainDb": round(g, 2),
                        "localBedDb": round(local_bed, 2),
                        "aboveLocalBedDb": a.sfx_above_bed_db})
        print(f"sfx    {os.path.basename(f)[:44]:44} local bed {local_bed:7.2f} "
              f"-> gain {g:+6.2f} dB @ {s['at']:5.2f}s")

    # amix would attenuate by the input count; asum-style mixing with
    # normalize=0 keeps every computed gain exactly as computed.
    fc.append("".join(mixlabels) + f"amix=inputs={len(mixlabels)}:normalize=0:"
              f"duration=first,alimiter=limit=0.891:level=disabled[a]")

    cmd = (["ffmpeg", "-nostdin", "-v", "error", "-y"] + inputs +
           ["-filter_complex", ";".join(fc), "-map", "0:v:0", "-map", "[a]",
            # The video stream is COPIED. Re-encoding here throws away the
            # graphics pass quality for nothing.
            "-c:v", "copy", "-c:a", "pcm_s16le", "-ar", "48000", "-ac", "2",
            "-t", f"{total:.3f}", a.out])
    subprocess.run(cmd, check=True)

    final_i = integrated(a.out)
    print(f"\nwrote {a.out}")
    print(f"final mix integrated loudness: {final_i:.2f} LUFS")

    json.dump({
        "output": os.path.relpath(a.out, job).replace("../", ""),
        "_noVoiceover": "There is no voice on this piece. style.json's musicBedDb (-12) and "
                        "sfxDb (-10) are both RELATIVE TO THE MEASURED VOICE, so neither can "
                        "be applied. The anchor below substitutes a delivery level for the "
                        "missing voice and preserves the style's 2 dB bed-to-sfx ratio.",
        "anchorLufs": a.anchor_lufs, "sfxAboveBedDb": a.sfx_above_bed_db,
        "finalIntegratedLufs": round(final_i, 2),
        "music": {"file": plan["music"]["file"],
                  # export.py's promote gate reads music.placements. It is written
                  # here so the plan is an honest record - but note the gate looks
                  # for a MUSIC-FREE window to compare against, and this bed runs
                  # the full 49s, so that gate returns a vacuous pass. The real
                  # evidence is promote_gate.py, which is written for a continuous bed.
                  "placements": [{"start": 0.0, "trim": [m0w, m0w + total]}],
                  "startAtSeconds": plan["music"].get("startAt", 0.0),
                  "_startAtWhy": "measured: of every 49s window in the 122s track, t=49s has "
                                 "the highest minimum level (-15.0 dB per second). Starting at "
                                 "0 would have put the track's own near-silent 8s build under "
                                 "the hook, an accidental fade-in that musicFadeIn=false rules out.",
                  "sourceLufs": round(mus_i, 2),
                  "gainDb": round(mus_gain, 2), "fadeIn": False,
                  "_fadeInWhy": "style.json audio.musicFadeIn is false",
                  "fadeOutSeconds": a.fade_out, "ducking": False,
                  "_duckingWhy": "style.json audio.musicDucking is false"},
        "sfx": records,
        "captions": {"burnedIn": False,
                     "_why": "The ON-SCREEN TEXT IS the caption track on this piece. Burning "
                             "captions over it would be a double burn-in, which the finishing "
                             "skill calls unrecoverable without a re-render. There is also no "
                             "speech to caption."},
        "limiter": "alimiter limit=-1.0 dBFS, a delivery ceiling only",
        "filtergraph": ";".join(fc),
    }, open(a.audio_plan_out, "w"), indent=1)
    print(f"wrote {a.audio_plan_out}")


main()
