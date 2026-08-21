#!/usr/bin/env python3
"""Verify the finishing mix by measurement - the render cannot be heard.

Three traps this avoids, all of which produced false alarms on a previous job:
  - measure an effect across its FULL span; a narrow window catches a woosh's quiet
    onset and reads as missing;
  - never null-test two lossy encodes - different priming delay means they never null
    and the residual looks like signal. Compare RMS envelopes in PCM instead;
  - watch the channel count - mono against stereo shows a ~3 dB difference that is
    conversion, not content.
"""
import json, subprocess, struct, math, sys

PLAN = json.load(open("outputs/audio-plan.json"))
BEFORE = sys.argv[1] if len(sys.argv) > 1 else "outputs/graphics-pass.mov"
AFTER = sys.argv[2] if len(sys.argv) > 2 else "outputs/finished.mov"

def pcm(path, t, dur):
    """Both sides are forced to the SAME channel layout before measuring.

    The mix is stereo and the graphics pass is mono. ffmpeg's mono->stereo upmix puts
    -3 dB in each channel to preserve total power, so downmixing the stereo mix back to
    mono and comparing it against the mono source shows a ~3 dB drop that is channel
    conversion, not level loss - it appears uniformly on every effect AND on spans where
    nothing was added, which is the tell. LUFS agrees the loudness is unchanged.
    """
    o = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.4f}", "-t", f"{dur:.4f}",
        "-i", path, "-map", "0:a", "-ac", "2", "-ar", "48000", "-f", "s16le", "-"],
        capture_output=True).stdout
    return struct.unpack(f"<{len(o)//2}h", o)

def rms_db(v):
    if not v: return -120.0
    m = sum(float(x) * x for x in v) / len(v)
    return 20 * math.log10(math.sqrt(m) / 32768) if m > 0 else -120.0

# An effect sitting 10 dB under the voice only lifts the sum by ~0.4 dB, so a delta
# threshold is the wrong test. Recover the ADDED energy instead: for two uncorrelated
# signals the powers sum, so added = 10*log10(10^(after/10) - 10^(before/10)).
print(f"{'effect':16s} {'span':>14s} {'voice':>9s} {'mixed':>9s} {'added':>9s}   verdict")
print("-" * 80)
ok = True
for h in PLAN["sfx"]["hits"]:
    t, d = h["at"], h["dur"]                       # the effect's REAL span, not a window
    b, a = rms_db(pcm(BEFORE, t, d)), rms_db(pcm(AFTER, t, d))
    pb, pa = 10 ** (b / 10), 10 ** (a / 10)
    added = 10 * math.log10(pa - pb) if pa > pb else None
    exp = h.get("measured", {}).get("srcLufs")
    good = added is not None and added > -55
    ok &= good
    astr = f"{added:8.1f}dB" if added is not None else "     n/a"
    print(f"{h['id']:16s} {f'{t:.1f}+{d:.1f}s':>14s} {b:8.1f}dB {a:8.1f}dB {astr}   "
          f"{'present' if good else 'NOT DETECTED'}")

print()
for bed in PLAN["music"]["beds"]:
    mid = bed["start"] + (bed["end"] - bed["start"]) / 2
    b, a = rms_db(pcm(BEFORE, mid, 8)), rms_db(pcm(AFTER, mid, 8))
    pb, pa = 10 ** (b / 10), 10 ** (a / 10)
    added = 10 * math.log10(pa - pb) if pa > pb else None
    astr = f"{added:8.1f}dB" if added is not None else "     n/a"
    print(f"{bed['id']:16s} {f'@{mid:.0f}s':>14s} {b:8.1f}dB {a:8.1f}dB {astr}   "
          f"(a bed shifts the MEAN only a few tenths - that is what a bed IS; the added energy is the real test)")

# the real bed test: bed LUFS against voice LUFS, 15-16 dB down is right
def lufs(path, t, d):
    o = subprocess.run(["ffmpeg", "-v", "info", "-ss", f"{t:.4f}", "-t", f"{d:.4f}", "-i", path,
        "-map", "0:a", "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    import re
    m = re.findall(r"I:\s+(-?[\d.]+) LUFS", o)
    return float(m[-1]) if m else None

vt = lufs(AFTER, 300, 60)          # deep in the demo: voice only, no bed
bt = lufs(AFTER, 1860, 30)         # under the outro bed
print(f"\n  voice-only stretch (300s)  : {vt} LUFS")
print(f"  under the outro bed (1860s): {bt} LUFS")
print(f"  channels: {subprocess.run(['ffprobe','-v','error','-select_streams','a:0','-show_entries','stream=channels','-of','csv=p=0',AFTER],capture_output=True,text=True).stdout.strip()}")
sys.exit(0 if ok else 1)
