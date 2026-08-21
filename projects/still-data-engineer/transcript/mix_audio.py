#!/usr/bin/env python3
"""Build and run the finishing audio mix from outputs/audio-plan.json.

Pure audio: the video stream is copied, never re-encoded. Re-encoding here would
throw away the graphics pass for nothing.
"""
import json, re, subprocess, sys, os

plan = json.load(open("outputs/audio-plan.json"))


def lufs(path, extra=()):
    """Integrated loudness, measured - never assumed from a file's nominal level."""
    o = subprocess.run(["ffmpeg", "-v", "info", "-i", path, *extra,
                        "-map", "0:a", "-af", "ebur128", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
    m = re.findall(r"I:\s+(-?[\d.]+) LUFS", o)
    return float(m[-1]) if m else None
SRC = sys.argv[1] if len(sys.argv) > 1 else "outputs/graphics-pass.mov"
OUT = sys.argv[2] if len(sys.argv) > 2 else "outputs/finished.mov"

# musicBedDb is the bed's level RELATIVE TO THE VOICE, not a raw gain on the file.
# This track is mastered at -10.2 LUFS; -18 dB of raw gain would put the bed 5.9 dB
# under the voice, which fights the speech for the whole intro and outro. Measured
# against the voice it lands ~18 dB down, which matches the finishing skill's own
# check that a bed belongs 15-16 dB below the voice.
voice_lufs = lufs(SRC)
track_lufs = lufs(plan["music"]["track"])
bed_gain = round(voice_lufs + plan["music"]["levelDb"] - track_lufs, 2)
print(f"  voice {voice_lufs} LUFS | track {track_lufs} LUFS "
      f"| bed target {voice_lufs + plan['music']['levelDb']:.1f} LUFS -> gain {bed_gain:+.2f} dB")
plan["music"]["measured"] = {"voiceLufs": voice_lufs, "trackLufs": track_lufs,
                             "bedGainDb": bed_gain,
                             "bedTargetLufs": round(voice_lufs + plan["music"]["levelDb"], 2)}
json.dump(plan, open("outputs/audio-plan.json", "w"), indent=1)

inputs, fc, mix = ["-i", SRC], [], []

# voice: mono -> stereo, so mixing against stereo beds is not a channel conversion
fc.append("[0:a]aformat=channel_layouts=stereo,volume=0dB[voice];")
mix.append("[voice]")

idx = 1
for b in plan["music"]["beds"]:
    dur = b["end"] - b["start"]
    inputs += ["-stream_loop", "-1", "-i", plan["music"]["track"]]
    fo = plan["music"]["fadeOutSeconds"]
    # no fade-in: style.json audio.musicFadeIn is false
    fc.append(f'[{idx}:a]atrim=0:{dur:.4f},asetpts=PTS-STARTPTS,'
              f'aformat=channel_layouts=stereo,'
              f'volume={bed_gain}dB,'
              f'afade=t=out:st={dur-fo:.4f}:d={fo},'
              f'adelay={int(b["start"]*1000)}|{int(b["start"]*1000)}[m{idx}];')
    mix.append(f"[m{idx}]")
    idx += 1

# sfxDb is likewise relative to the voice. These samples span 14 dB of source level
# (-4.4 to -18.6 LUFS), so a flat gain would put one effect 8 dB ABOVE the voice and
# leave another inaudible. Each is measured and placed at the same level.
for h in plan["sfx"]["hits"]:
    src_lufs = lufs(h["file"])
    g = round(voice_lufs + plan["sfx"]["levelDb"] - src_lufs, 2)
    h["measured"] = {"srcLufs": src_lufs, "gainDb": g}
    print(f"  {h['id']:14s} {src_lufs:7.1f} LUFS -> gain {g:+6.2f} dB")
    inputs += ["-i", h["file"]]
    fc.append(f'[{idx}:a]aformat=channel_layouts=stereo,'
              f'volume={g}dB,'
              f'adelay={int(h["at"]*1000)}|{int(h["at"]*1000)}[s{idx}];')
    mix.append(f"[s{idx}]")
    idx += 1
json.dump(plan, open("outputs/audio-plan.json", "w"), indent=1)

# normalize=0: amix otherwise divides by the input count and drops the voice ~8 dB
# No limiter here. The voice peaks at -1.0 dBFS and the bed and effects sit 18 and 10
# dB below it, so the sum lands near -0.9 dBFS on its own. alimiter's `level` option
# defaults to auto-levelling the OUTPUT, which pulled the whole programme down ~1.7 dB
# uniformly - visible as every effect AND both beds reading -1.7 dB against the
# voice-only reference, including spans where nothing was added. A uniform shift
# everywhere is a gain stage, not a missing effect.
# Delivery loudness is set once, on the deliverable, where a true-peak limiter belongs.
fc.append("".join(mix) + f"amix=inputs={len(mix)}:normalize=0:dropout_transition=0,"
          f"atrim=0:{plan['duration']:.4f}[aout]")

cmd = (["ffmpeg", "-nostdin", "-hide_banner", "-stats", "-y"] + inputs +
       ["-filter_complex", "".join(fc), "-map", "0:v", "-c:v", "copy",
        "-map", "[aout]", "-c:a", "pcm_s16le", "-map_chapters", "-1", OUT])
print(" ".join(cmd[:6]), "...", f"({len(mix)} sources -> {OUT})")
sys.exit(subprocess.run(cmd).returncode)
