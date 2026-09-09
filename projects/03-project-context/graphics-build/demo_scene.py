#!/usr/bin/env python3
"""Build the demo scene: screen full-frame + face inset + punch-ins, all in FFmpeg.

style.md: minutes of footage round-tripped through a headless render costs ~3% luma per
frame, so this is pure FFmpeg geometry, never a browser segment.

Punch-in boxes are MEASURED from real frames (non-negotiable 5). The ease is a smoothstep
so the push settles rather than arriving linearly.
"""
import argparse, json, subprocess, sys

FPS=30.0
def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--spec",required=True); ap.add_argument("--base",required=True)
    ap.add_argument("--screen",required=True); ap.add_argument("--out",required=True)
    ap.add_argument("--mask",required=True); ap.add_argument("--border",required=True)
    ap.add_argument("--start",type=float); ap.add_argument("--end",type=float)
    ap.add_argument("--screen-offset",type=float,default=0.0,
        help="the screen clip covers the demo section only, so it starts at the span "
             "start rather than at 0. Its trims are shifted by this; the base is not, "
             "because the base cut runs the whole video.")
    ap.add_argument("--print-only",action="store_true")
    a=ap.parse_args()

    spec=json.load(open(a.spec))
    S=a.start if a.start is not None else spec["span"]["start"]
    E=a.end   if a.end   is not None else spec["span"]["end"]
    ins=spec["inset"]["_delivery"]
    zooms=spec["punchIns"]["items"]
    RAMP=36  # 1.2s ease at 30fps

    # piecewise smoothstep over output frame number, one term per punch-in
    terms=[]
    for z in zooms:
        if z["end"]<=S or z["start"]>=E: continue
        s0=int(round((z["start"]-S)*FPS)); e0=int(round((z["end"]-S)*FPS))
        f=(f"if(between(on,{s0},{s0+RAMP}),(on-{s0})/{RAMP},"
           f"if(between(on,{s0+RAMP},{e0-RAMP}),1,"
           f"if(between(on,{e0-RAMP},{e0}),({e0}-on)/{RAMP},0)))")
        terms.append((f,z))
    # s = smoothstep of the active ramp; only one can be non-zero (punch-ins never overlap)
    ssum="+".join(f"({t})" for t,_ in terms) or "0"
    smooth=f"({ssum})*({ssum})*(3-2*({ssum}))"
    zexpr="1"; cxe="(iw/2)"; cye="(ih/2)"
    for t,z in terms:
        sm=f"(({t})*({t})*(3-2*({t})))"
        zexpr+=f"+{sm}*{z['zoom']-1:.4f}"
        cxe+=f"+{sm}*({z['cx']}-iw/2)"
        cye+=f"+{sm}*({z['cy']}-ih/2)"

    ins_src=spec["inset"].get("sourceCrop",{"w":1760,"h":1760,"x":1120,"y":400})
    pm=spec.get("privacyMasks")
    rep=spec["inset"].get("reposition",[])

    # 1) screen slice, 2) privacy blur in SOURCE space (so it scales with any punch-in),
    # 3) punch-ins, 4) face inset with optional corner change, 5) border.
    SO=a.screen_offset
    chain=[f"[0:v]trim=start={S-SO:.3f}:end={E-SO:.3f},setpts=PTS-STARTPTS[scr0]"]
    spans=[m for m in (pm or {}).get("spans",[]) if m["end"]>S and m["start"]<E]
    if spans:
        # each span carries its OWN region: the sidebar and a modal file picker are
        # different shapes in different places.
        cur="scr0"
        for i,m in enumerate(spans):
            nxt=f"pm{i}"
            chain.append(f"[{cur}]split[k{i}][b{i}]")
            chain.append(f"[b{i}]crop={m['w']}:{m['h']}:{m['x']}:{m['y']},boxblur=26:2[bl{i}]")
            chain.append(f"[k{i}][bl{i}]overlay={m['x']}:{m['y']}:"
                         f"enable='between(t,{m['start']-S:.3f},{m['end']-S:.3f})'[{nxt}]")
            cur=nxt
        chain.append(f"[{cur}]null[scr1]")
    else:
        chain.append("[scr0]null[scr1]")
    # zoompan's x/y are in SOURCE coordinates with a max of iw - iw/zoom, NOT in the
    # zoomed image's space. Feeding zoomed-space values silently CLAMPS to the bottom-right
    # corner, which is why an earlier pass punched in on blank page instead of the code.
    chain.append(f"[scr1]zoompan=z='{zexpr}':x='({cxe})-(iw/({zexpr}))/2':"
                 f"y='({cye})-(ih/({zexpr}))/2':d=1:s=3840x2160:fps=30[scr]")
    chain.append(f"[1:v]trim=start={S:.3f}:end={E:.3f},setpts=PTS-STARTPTS,"
                 f"crop={ins_src['w']}:{ins_src['h']}:{ins_src['x']}:{ins_src['y']},"
                 f"scale={ins['width']}:{ins['height']}[facesrc]")
    chain.append("[2:v]format=gray[mk]")
    chain.append("[facesrc][mk]alphamerge[face]")
    # The inset SLIDES between corners instead of teleporting. It used to be
    # if(between(...), LEFTX, RIGHTX), which cut the inset from one side of the
    # frame to the other on a single frame and read as a glitch rather than a move.
    #
    # Build a "leftness" factor f(t) in [0,1]: for every reposition window it ramps
    # 0 -> 1 over SLIDE seconds at the window's start and back down at its end, then
    # smoothstep it (f*f*(3-2f)) so the move eases in and out instead of running at
    # constant speed. x is then a straight interpolation between the two corners.
    # Windows never overlap, so the terms sum without ever exceeding 1.
    LEFTX = 3840 - ins["left"] - ins["width"]
    RIGHTX = ins["left"]
    SLIDE = float(ins.get("slideSeconds", 0.6))
    if rep:
        terms=[]
        for r in rep:
            # NOT `a` -- that is the argparse namespace in this function
            lo, hi = r["start"]-S, r["end"]-S
            terms.append(f"(clip((t-{lo:.3f})/{SLIDE:.3f},0,1)"
                         f"-clip((t-{hi:.3f})/{SLIDE:.3f},0,1))")
        f="+".join(terms)
        ease=f"(({f})*({f})*(3-2*({f})))"
        xexpr=f"{RIGHTX}+({LEFTX}-{RIGHTX})*{ease}"
    else:
        xexpr=str(RIGHTX)
    # style.json pip.demoInset.mayHide. The inset is hidden for spans where it would
    # sit on the very thing a punch-in exists to make readable: during g010 it landed
    # on the billing columns and during g017 on the Staging row that names audit
    # columns. Hiding it there is not the full-frame/PiP bounce the one-entry rule
    # forbids; the FRAME never reframes, the inset simply is not drawn.
    hid=[h for h in spec["inset"].get("hiddenDuring",[]) if h["end"]>S and h["start"]<E]
    if hid:
        vis="*".join(f"(1-between(t,{h['start']-S:.3f},{h['end']-S:.3f}))" for h in hid)
        shown=f"gt({vis},0)"
    else:
        shown="1"
    chain.append(f"[scr][face]overlay=x='{xexpr}':y={ins['top']}:eof_action=pass:"
                 f"enable='{shown}'[withface]")
    chain.append(f"[withface][3:v]overlay=x='{xexpr}':y={ins['top']}:eof_action=pass:"
                 f"enable='{shown}'[out]")
    fc=";".join(chain)

    cmd=["ffmpeg","-nostdin","-y","-v","error","-stats",
         "-i",a.screen,"-i",a.base,"-i",a.mask,"-i",a.border,
         "-filter_complex",fc,"-map","[out]","-an",
         "-c:v","hevc_videotoolbox","-b:v","55M","-tag:v","hvc1","-pix_fmt","yuv420p",
         "-fps_mode","cfr","-r","30",a.out]
    if a.print_only:
        print(fc); return
    print(f"demo scene {S:.2f}-{E:.2f}s ({(E-S):.1f}s, {int((E-S)*FPS)} frames), "
          f"{len(terms)} punch-in(s)")
    r=subprocess.run(cmd)
    sys.exit(r.returncode)

if __name__=="__main__": main()
