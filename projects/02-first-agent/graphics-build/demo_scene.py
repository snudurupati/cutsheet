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
    chain=[f"[0:v]trim=start={S:.3f}:end={E:.3f},setpts=PTS-STARTPTS[scr0]"]
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
    # corner changes jump on existing cut boundaries, so the move lands on a cut
    LEFTX = 3840 - ins["left"] - ins["width"]
    if rep:
        cond="+".join(f"between(t,{r['start']-S:.3f},{r['end']-S:.3f})" for r in rep)
        xexpr=f"if({cond},{LEFTX},{ins['left']})"
    else:
        xexpr=str(ins["left"])
    chain.append(f"[scr][face]overlay=x='{xexpr}':y={ins['top']}:eof_action=pass[withface]")
    chain.append(f"[withface][3:v]overlay=x='{xexpr}':y={ins['top']}:eof_action=pass[out]")
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
