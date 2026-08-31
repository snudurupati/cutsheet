#!/usr/bin/env python3
"""Composite the graphics pass. Inputs are arguments, gated on the cutsheet (hard rule 12)."""
import argparse, json, os, subprocess, sys
FPS=30.0
def frames(p):
    return int(subprocess.run(["ffprobe","-v","error","-select_streams","v:0","-count_frames",
        "-show_entries","stream=nb_read_frames","-of","default=nw=1:nk=1",p],
        capture_output=True,text=True,check=True).stdout.strip())

def main():
    ap=argparse.ArgumentParser()
    for f in ("cutsheet","demo","base","demoscene","renders","out"): ap.add_argument("--"+f,required=True)
    ap.add_argument("--audio-source",default=None,
                    help="the authoritative spliced audio; the base's track is checked against it")
    ap.add_argument("--trim-tail-frames",type=int,default=0,
                    help="drop N frames from the end; the hold after the last word ran long")
    a=ap.parse_args()
    cs=json.load(open(a.cutsheet)); ds=json.load(open(a.demo))
    S,E=ds["span"]["start"], ds["span"]["end"]

    # HARD RULE 12: the base's audio is an artefact an earlier step wrote, and a later step can
    # change it. This shipped once: the voice EQ went into base-audio.wav while the assembler kept
    # taking audio from base-cut.mov, which had been muxed before the EQ existed.
    if a.audio_source and os.path.exists(a.audio_source):
        def fp(src, mapa):
            # NOT -v error: astats prints at INFO level, so -v error hides the numbers
            # and the check silently has nothing to compare.
            out=subprocess.run(["ffmpeg","-nostdin","-hide_banner","-nostats","-ss","305","-t","6",
                                "-i",src,"-map",mapa,"-af","astats=metadata=1:reset=0",
                                "-f","null","-"],capture_output=True,text=True).stderr
            import re as _re
            return [round(float(x),2) for x in _re.findall(r"RMS level dB:\s*(-?[\d.]+)",out)[:1]]
        # compare the base's track against the authoritative splice, allowing for the mux-time gain
        b=fp(a.base,"0:a:0"); w=fp(a.audio_source,"0:a:0")
        if not b or not w: sys.exit("could not fingerprint the audio")
        delta=b[0]-w[0]
        print(f"audio staleness check: base {b[0]} dB vs splice {w[0]} dB, delta {delta:+.2f} dB")
        if not (1.0 <= delta <= 3.0):
            sys.exit(f"base audio does not look like {a.audio_source} plus the mux gain "
                     f"(expected +2.0 dB, got {delta:+.2f}). Re-mux the base before assembling.")

    base_f=frames(a.base); demo_f=frames(a.demoscene)
    # Frame-exact, not seconds: trim's end is exclusive, so a seconds-based concat lands
    # one frame short and the output no longer matches the base.
    head_end=int(round(S*FPS))                 # frames taken from the head of the base
    tail_start=base_f-(base_f-head_end-demo_f) # so head + demo + tail == base exactly
    tail_n=base_f-tail_start
    print(f"base {base_f}f = head {head_end}f + demo {demo_f}f + tail {tail_n}f "
          f"= {head_end+demo_f+tail_n}f")
    if head_end+demo_f+tail_n != base_f:
        sys.exit("footage layer would not match the base frame count")

    inputs=["-i",a.base,"-i",a.demoscene]
    parts=[]
    for p in cs["parts"]:
        ext="mp4" if p["class"]=="segment" else "mov"
        f=os.path.join(a.renders,f"{p['id']}.{ext}")
        if not os.path.exists(f): sys.exit(f"missing render {f}")
        inputs += ["-i",f]; parts.append(p)

    # footage layer: base[0,S] + demo scene + base[E,end]
    fc=(f"[0:v]trim=start_frame=0:end_frame={head_end},setpts=PTS-STARTPTS[a0];"
        f"[1:v]trim=start_frame=0,setpts=PTS-STARTPTS[a1];"
        f"[0:v]trim=start_frame={tail_start},setpts=PTS-STARTPTS[a2];"
        f"[a0][a1][a2]concat=n=3:v=1:a=0[foot];")
    cur="foot"
    for i,p in enumerate(parts):
        idx=i+2; lab=f"v{i}"
        # trim/setpts + PTS shift to the part's place on the timeline.
        # input-side -ss here would silently drop the overlay (PTS desync).
        fc+=(f"[{idx}:v]trim=start=0,setpts=PTS-STARTPTS+{p['start']:.3f}/TB[o{i}];"
             f"[{cur}][o{i}]overlay=0:0:eof_action=pass:shortest=0[{lab}];")
        cur=lab
    fc=fc.rstrip(";")

    keep = base_f - a.trim_tail_frames
    extra=[]
    if a.trim_tail_frames:
        # trim video and audio together so the sample count stays exactly frames*1600
        fc+=f";[0:a]atrim=end_sample={keep*1600},asetpts=N/SR/TB[aout]"
        amap="[aout]"; extra=["-frames:v",str(keep)]
        print(f"trimming {a.trim_tail_frames} frames off the tail -> {keep}f")
    else:
        amap="0:a:0"
    cmd=["ffmpeg","-nostdin","-y","-v","error","-stats",*inputs,
         "-filter_complex",fc,"-map",f"[{cur}]","-map",amap,*extra,
         "-c:v","hevc_videotoolbox","-b:v","60M","-tag:v","hvc1","-pix_fmt","yuv420p",
         "-fps_mode","cfr","-r","30","-c:a","pcm_s24le","-movflags","+faststart",a.out]
    print(f"compositing {len(parts)} parts over the footage layer -> {a.out}")
    r=subprocess.run(cmd)
    if r.returncode: sys.exit(r.returncode)
    got=frames(a.out)
    want=base_f - a.trim_tail_frames
    print(f"output {got}f (expected {want}f) {'PASS' if got==want else 'FAIL'}")
    sys.exit(0 if got==want else 1)

if __name__=="__main__": main()
