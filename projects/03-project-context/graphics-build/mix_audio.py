#!/usr/bin/env python3
"""Apply outputs/audio-plan.json to a render. Pure audio: the video stream is COPIED.

Levels in the plan are dB relative to the measured voice, already resolved to gains.
"""
import argparse, json, os, re, subprocess, sys

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--plan",required=True); ap.add_argument("--input",required=True)
    ap.add_argument("--out",required=True);  ap.add_argument("--job",required=True)
    ap.add_argument("--cutsheet",required=True,
                    help="graphics-build/cutsheet.json. This script writes the FINAL "
                         "audio, so it is the last place a mismatched picture can be "
                         "caught (hard rule 11 / 12)")
    a=ap.parse_args()
    p=json.load(open(a.plan))

    # The plan's levels are relative to the voice measured on ONE specific render.
    # Point this at a different render and every gain is wrong while the output is
    # still a valid, correct-length file. So: the input must be the file the plan
    # was measured from, and that file must agree with the cut sheet.
    cs=json.load(open(a.cutsheet))
    want=round(cs["totalSeconds"]*cs.get("fps",30))
    frames=int(subprocess.run(["ffprobe","-v","error","-select_streams","v:0",
                               "-show_entries","stream=nb_frames",
                               "-of","csv=p=0",a.input],
                              capture_output=True,text=True).stdout.strip())
    if frames!=want:
        sys.exit(f"{a.input} has {frames} frames, the cut sheet gives {want}")
    ma=p.get("measuredAgainst")
    if ma and ma.get("frames")!=frames:
        sys.exit(f"the plan was measured against a {ma['frames']}-frame render "
                 f"({ma['render']}), but {a.input} has {frames}. Re-run plan_audio.py")

    music=os.path.join(a.job,p["music"]["track"])
    if not os.path.exists(music): sys.exit(f"missing music: {music}")
    inputs=["-i",a.input]
    parts=[]; labels=[]
    # voice, promoted to stereo so the bed and effects keep their image
    # style.json audio._voiceEq, chosen BY EAR for this speaker in this room on a
    # previous job: 140Hz +1, 280Hz -3 (Q1.1), 3400Hz +4.0 (Q2.0), then a de-esser.
    # The presence bell must stay NARROW. A first attempt at 3.8kHz Q0.9 lifted the
    # 5-9kHz sibilance band with the consonants and read as harsh.
    eq=("equalizer=f=140:t=q:w=1.0:g=1,"
        "equalizer=f=280:t=q:w=1.1:g=-3,"
        "equalizer=f=3400:t=q:w=2.0:g=4,"
        "deesser=i=0.4:m=0.5:f=0.5")
    parts.append(f"[0:a]{eq},aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[v]")
    labels.append("[v]")
    n=1
    for m in p["music"]["placements"]:
        inputs+=["-i",music]
        t0,t1=m["trim"]; f=m["fadeOut"]
        parts.append(f"[{n}:a]atrim={t0}:{t1},asetpts=N/SR/TB,volume={p['music']['gainDb']}dB,"
                     f"afade=t=out:st={f['at']}:d={f['dur']},"
                     f"aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,"
                     f"adelay={int(m['start']*1000)}|{int(m['start']*1000)}[{m['id']}]")
        labels.append(f"[{m['id']}]"); n+=1
    for s in p["sfx"]["placements"]:
        f=os.path.join(a.job,"audio/sound-effects",s["file"]+".mp3")
        if not os.path.exists(f): sys.exit(f"missing sfx: {f}")
        inputs+=["-i",f]
        parts.append(f"[{n}:a]volume={s['gainDb']}dB,"
                     f"aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,"
                     f"adelay={int(s['at']*1000)}|{int(s['at']*1000)}[{s['id']}]")
        labels.append(f"[{s['id']}]"); n+=1
    # normalize=0: amix otherwise divides by the input count and buries the voice
    fc=";".join(parts)+";"+"".join(labels)+f"amix=inputs={len(labels)}:normalize=0:duration=first[mix]"
    tgt=p.get("deliveryTarget",{"lufs":-14.0,"truePeakDb":-1.5})
    # loudnorm scales the whole mix together, so the music and sfx levels stay
    # exactly where the plan put them relative to the voice.
    # TWO-PASS loudnorm. Single pass is an estimator and lands about a dB out: this
    # mix measured -15.0 LUFS against a -14.0 target, which is the entire number the
    # deliveryTarget exists to hit (platforms attenuate content above their
    # normalisation point and leave quieter content alone, so undershooting is not
    # corrected on upload, it just plays quiet). Pass 1 measures the finished mix,
    # pass 2 applies a linear gain computed from that measurement.
    #
    # loudnorm RUNS AT 192kHz INTERNALLY and emits at 192kHz. Without the resample
    # below, finished.mov came out 192kHz/24-bit stereo: 4x the audio payload, and
    # it silently breaks this pipeline's core invariant that one 30fps frame is
    # exactly 1600 samples at 48kHz, which is what makes frame-exact cuts also
    # sample-exact. Everything still played, so nothing but a probe could see it.
    # Resample BEFORE the limiter, not after, so the true-peak ceiling is enforced
    # at the delivery rate rather than being re-created by the downsample.
    LN = f"loudnorm=I={tgt['lufs']}:TP={tgt['truePeakDb']}:LRA=11"
    # pass 1: measure the assembled mix, audio only, decoding to nowhere
    m1 = subprocess.run(["ffmpeg","-nostdin","-hide_banner","-nostats",*inputs,
                         "-filter_complex", fc+f";[mix]{LN}:print_format=json[a]",
                         "-map","[a]","-vn","-f","null","-"],
                        capture_output=True, text=True)
    blob = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", m1.stdout + m1.stderr, re.S)
    if not blob:
        sys.exit("loudnorm pass 1 produced no measurement; refusing to guess a gain")
    M = json.loads(blob.group(0))
    print(f"measured mix: I={M['input_i']} TP={M['input_tp']} LRA={M['input_lra']}")
    LN2 = (f"{LN}:measured_I={M['input_i']}:measured_TP={M['input_tp']}"
           f":measured_LRA={M['input_lra']}:measured_thresh={M['input_thresh']}"
           f":offset={M['target_offset']}:linear=true")
    fc+=(f";[mix]{LN2}[lnr]"
         ";[lnr]aresample=48000[ln]"   # plain swresample: this ffmpeg has no libsoxr,
                                      # and resampler=soxr fails the audio
                                      # encoder with -22 rather than warning
         ";[ln]alimiter=limit=0.891:level=disabled:attack=5:release=60[aout]")

    cmd=["ffmpeg","-nostdin","-y","-v","error","-stats",*inputs,"-filter_complex",fc,
         "-map","0:v:0","-map","[aout]","-c:v","copy","-c:a","pcm_s24le","-ar","48000",
         "-movflags","+faststart",a.out]
    print(f"mixing {len(p['music']['placements'])} music placements + {len(p['sfx']['placements'])} effects")
    r=subprocess.run(cmd)
    if r.returncode:
        sys.exit(r.returncode)

    # Measure what was actually written. loudnorm treats the true-peak ceiling as
    # hard and the loudness target as soft, so on peaky material it lands UNDER the
    # target and says nothing. Report which constraint bound, rather than printing a
    # target and letting the reader assume it was hit.
    e=subprocess.run(["ffmpeg","-nostdin","-hide_banner","-nostats","-i",a.out,
                      "-map","0:a:0","-vn","-af","ebur128=peak=true","-f","null","-"],
                     capture_output=True,text=True).stderr
    def last(pat):
        m=re.findall(pat,e)
        return float(m[-1]) if m else None
    I,TP=last(r"I:\s+(-?[\d.]+) LUFS"),last(r"Peak:\s+(-?[\d.]+) dBFS")
    sr=subprocess.run(["ffprobe","-v","error","-select_streams","a:0","-show_entries",
                       "stream=sample_rate","-of","csv=p=0",a.out],
                      capture_output=True,text=True).stdout.strip()
    print(f"\nwrote {a.out}\n  integrated {I} LUFS (target {tgt['lufs']})"
          f"\n  true peak  {TP} dBFS (ceiling {tgt['truePeakDb']})\n  sample rate {sr}")
    if sr != "48000":
        sys.exit(f"output is {sr}Hz, not 48000: one frame is no longer 1600 samples")
    if I is not None and abs(I-tgt["lufs"])>0.3:
        near_tp = TP is not None and abs(TP-tgt["truePeakDb"])<=0.2
        print(f"  NOTE: {abs(I-tgt['lufs']):.1f} dB under target because the TRUE PEAK "
              f"ceiling bound first." if near_tp else
              f"  WARNING: {abs(I-tgt['lufs']):.1f} dB off target and the true peak is "
              f"NOT the reason. Investigate.")
        if near_tp:
            print("  Reaching the target would need compression on the voice, which is a "
                  "taste decision, not a mix fix. Raise truePeakDb or accept this.")
    sys.exit(0)

if __name__=="__main__": main()
