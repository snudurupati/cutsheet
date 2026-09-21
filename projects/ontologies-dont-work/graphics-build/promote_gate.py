#!/usr/bin/env python3
"""Gate the promotion on CONTENT, for a piece with a CONTINUOUS music bed.

export.py's own gate takes the 10th-percentile short-window RMS inside a music
placement and in a MUSIC-FREE window and requires a >=4 dB lift. That works when
music is placed in spans with gaps between them. This bed runs the full 49s, so
there is no music-free window and that gate returns a vacuous pass - it reports
success because it found nothing to measure, which is the failure mode this
pipeline has been bitten by repeatedly.

So the same question is asked in the form this piece can answer:
  1. the bed's quiet floor, in several windows, against digital silence
  2. every effect against its OWN local neighbourhood, never a fixed wide window
  3. the promoted picture is bit-identical to the graphics pass
Rule 12: inputs are arguments and each is checked against the plan first.
"""
import argparse, json, math, os, struct, subprocess, sys


def pcm(path, start, dur):
    raw = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-ss", f"{start:.3f}",
                          "-t", f"{dur:.3f}", "-i", path, "-ac", "1", "-ar", "8000",
                          "-f", "f32le", "-"], capture_output=True).stdout
    return struct.unpack(f"<{len(raw)//4}f", raw[:len(raw)//4*4])


def rms_db(path, start, dur):
    x = pcm(path, start, dur)
    if not x:
        return -99.0
    return 20 * math.log10(max(math.sqrt(sum(v*v for v in x) / len(x)), 1e-12))


def floor_db(path, start, dur, win=0.10):
    v = sorted(rms_db(path, t, win) for t in
               [start + i * win for i in range(int(dur / win))])
    return v[len(v) // 10] if v else -99.0


def vmd5(path):
    return subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-map", "0:v:0",
                           "-f", "md5", "-"], capture_output=True, text=True).stdout.strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--plan", required=True)
    ap.add_argument("--job", required=True)
    ap.add_argument("--picture-source", required=True,
                    help="the render the promoted file must be picture-identical to")
    ap.add_argument("--min-bed-above-silence", type=float, default=40.0)
    ap.add_argument("--min-sfx-lift", type=float, default=3.0)
    a = ap.parse_args()

    plan = json.load(open(a.plan))
    src = os.path.join(a.job, plan["output"])
    for p in (src, a.picture_source):
        if not os.path.exists(p):
            sys.exit(f"ERROR {p} does not exist")

    fails = []
    print(f"deliverable: {plan['output']}  ({os.path.getsize(src)/1e6:.1f} MB)")
    print(f"integrated:  {plan['finalIntegratedLufs']} LUFS\n")

    print("1. bed quiet floor, 10th-percentile 100ms RMS (digital silence is -99)")
    for s, d in [(5, 6), (15, 6), (25, 6), (36, 6), (43, 4)]:
        f = floor_db(src, s, d)
        ok = f > -99 + a.min_bed_above_silence
        print(f"   {s:2d}-{s+d:2d}s   {f:7.2f} dBFS   {'ok' if ok else 'FAIL'}")
        if not ok:
            fails.append(f"bed floor at {s}s is {f:.1f} dBFS: the bed is not there")

    print("\n2. each effect against its OWN local neighbourhood")
    for e in plan["sfx"]:
        b = e["fileStart"]
        bed = rms_db(src, max(0, b - 1.2), 0.9)
        eff = max(rms_db(src, b + e["peakOffset"] - 0.1, w) for w in (0.2, 0.4, 0.8))
        lift = eff - bed
        ok = lift >= a.min_sfx_lift
        print(f"   {os.path.basename(e['file'])[:44]:44} @{e['beat']:5.2f}s  "
              f"bed {bed:7.2f}  effect {eff:7.2f}  lift {lift:+6.2f} dB  {'ok' if ok else 'FAIL'}")
        if not ok:
            fails.append(f"{os.path.basename(e['file'])} lifts only {lift:.1f} dB")

    print("\n3. picture is bit-identical to the graphics pass")
    a1, a2 = vmd5(src), vmd5(a.picture_source)
    ok = a1 == a2
    print(f"   {a1}  {plan['output']}")
    print(f"   {a2}  {os.path.basename(a.picture_source)}   {'identical' if ok else 'DIFFERENT'}")
    if not ok:
        fails.append("the mix re-encoded the picture; it must be -c:v copy")

    if fails:
        print("\nPROMOTE GATE: FAIL")
        for f in fails:
            print("  " + f)
        sys.exit(1)
    print("\nPROMOTE GATE: PASS")


main()
