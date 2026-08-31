#!/usr/bin/env python3
"""Apply outputs/audio-plan.json to a render. Pure audio: the video stream is COPIED.

Levels in the plan are dB relative to the measured voice, already resolved to gains.
"""
import argparse, json, os, subprocess, sys

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--plan",required=True); ap.add_argument("--input",required=True)
    ap.add_argument("--out",required=True);  ap.add_argument("--job",required=True)
    a=ap.parse_args()
    p=json.load(open(a.plan))

    music=os.path.join(a.job,p["music"]["track"])
    if not os.path.exists(music): sys.exit(f"missing music: {music}")
    inputs=["-i",a.input]
    parts=[]; labels=[]
    # voice, promoted to stereo so the bed and effects keep their image
    parts.append("[0:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[v]")
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
    fc+=";[mix]alimiter=limit=0.891:level=disabled:attack=5:release=60[aout]"

    cmd=["ffmpeg","-nostdin","-y","-v","error","-stats",*inputs,"-filter_complex",fc,
         "-map","0:v:0","-map","[aout]","-c:v","copy","-c:a","pcm_s24le",
         "-movflags","+faststart",a.out]
    print(f"mixing {len(p['music']['placements'])} music placements + {len(p['sfx']['placements'])} effects")
    r=subprocess.run(cmd)
    sys.exit(r.returncode)

if __name__=="__main__": main()
