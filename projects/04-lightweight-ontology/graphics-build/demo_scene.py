#!/usr/bin/env python3
"""Build the demo scene: screen full frame + face inset + punch-ins, all in FFmpeg.

style.md: minutes of footage round-tripped through a headless render costs ~3%
luma per frame, so this is pure FFmpeg geometry, never a browser segment.

Changes from 03-project-context, 2026-09-22:
  * The inset ENTERS and LEAVES (style.md transitions): after the cut it scales
    in from 0.92 with opacity 0->1 over enterSeconds, 0.3s late; before the demo
    ends it scales out and fades over exitSeconds; around each hiddenDuring window
    it fades out and back in with the same mechanic instead of popping. One
    envelope A(t) in [0,1] drives both opacity and scale. It is rendered as a tiny
    grey clip (geq on 16x16, cheap) and multiplied into the mask's alpha, because
    FFmpeg's fade filter cannot express several out/in pairs on one stream.
  * The mask and border PNGs are LOOPED inputs. As single-frame inputs next to
    eof_action=pass they could drop after frame 1; looped, they are infinite, so
    the output is CAPPED at the span's exact frame count (-frames:v). Without the
    cap an infinite input is how a 142GB file got written on job1.
  * The sidebar blur is not here: base-screen.mp4 is already blurred in source
    space by splice_screen.py.

Punch-in boxes come from screen-ocr.json (see demo-spec.json). zoompan's x/y are
SOURCE coordinates capped at iw-iw/zoom; zoomed-space values silently clamp to
the bottom-right corner.
"""
import argparse, json, subprocess, sys

FPS = 30.0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--spec", required=True); ap.add_argument("--base", required=True)
    ap.add_argument("--screen", required=True); ap.add_argument("--out", required=True)
    ap.add_argument("--mask", required=True); ap.add_argument("--border", required=True)
    ap.add_argument("--start", type=float); ap.add_argument("--end", type=float)
    ap.add_argument("--print-only", action="store_true")
    a = ap.parse_args()

    spec = json.load(open(a.spec))
    S0, E0 = spec["span"]["start"], spec["span"]["end"]
    S = a.start if a.start is not None else S0
    E = a.end if a.end is not None else E0
    SO = S0                                    # base-screen.mp4 starts at the demo's start
    ins = spec["inset"]["_delivery"]
    zooms = spec["punchIns"]["items"]
    RAMP = 36                                  # 1.2s punch-in ease at 30fps
    N = int(round((E - S) * FPS))

    # ---- punch-ins: piecewise smoothstep over output frame number
    terms = []
    for z in zooms:
        if z["end"] <= S or z["start"] >= E:
            continue
        s0 = int(round((z["start"] - S) * FPS)); e0 = int(round((z["end"] - S) * FPS))
        # the item's own ramp when it has one, exactly as lib.plateau reads it: g10's 15f
        # ramp was ignored here, so it zoomed out 0.7s before its marks left and they
        # drifted onto the wrong lines (technical review 2026-09-23)
        r = min(z.get("ramp", RAMP), (e0 - s0) // 3)          # short windows keep a real hold
        # rampIn / rampOut (frames) override one end: a pan onto content that JUMPS must be
        # quick (g06p -> g06 at 4:51, 2026-09-23) without making the far end abrupt. A
        # chained pan needs the outgoing rampOut == the incoming rampIn and an overlap of
        # exactly that many frames, so the two smoothsteps sum to 1 through it.
        ri = min(z.get("rampIn", r), (e0 - s0) // 3); ro = min(z.get("rampOut", r), (e0 - s0) // 3)
        f = (f"if(between(on,{s0},{s0+ri}),(on-{s0})/{ri},"
             f"if(between(on,{s0+ri},{e0-ro}),1,"
             f"if(between(on,{e0-ro},{e0}),({e0}-on)/{ro},0)))")
        terms.append((f, z))
    # The zoom interpolates the visible WINDOW (left, top, width), not the centre and
    # the zoom factor separately. Centre + zoom interpolated apart let the window slide
    # past the target mid-ramp, cutting text at the left edge for 0.5-1s (g08, g12,
    # g07b; composition review 2026-09-23). A target inside both end windows is inside
    # every blend of them, so it can never leave the frame. The full-zoom window is
    # unchanged (zoompan's clamp, which lib.mapZoom mirrors), so marks still land.
    SW, SH = 3840, 2160
    wexpr = f"{SW}"; x0e = "0"; y0e = "0"
    for t, z in terms:
        sm = f"(({t})*({t})*(3-2*({t})))"
        Z = z["zoom"]; w = SW / Z; h = SH / Z
        X = min(max(z["cx"] - w / 2, 0), SW - w); Y = min(max(z["cy"] - h / 2, 0), SH - h)
        wexpr += f"+{sm}*({w - SW:.3f})"
        x0e += f"+{sm}*({X:.3f})"
        y0e += f"+{sm}*({Y:.3f})"
    zexpr = f"{SW}/({wexpr})"

    # ---- inset envelope A(t): enter, exit, and a dip around every hidden window
    ENT, EXT = ins["enterSeconds"], ins["exitSeconds"]
    D = E0 - S0
    env = [f"clip((T-0.3)/{ENT},0,1)", f"clip(({D:.3f}-T)/{EXT},0,1)"]
    for h in spec["inset"].get("hiddenDuring", []):
        h0, h1 = h["start"] - S0, h["end"] - S0
        env.append(f"(1-clip((T-({h0:.3f}-{EXT}))/{EXT},0,1)+clip((T-{h1:.3f})/{ENT},0,1))")
    Aexpr = "*".join(f"({x})" for x in env)
    off = S - S0                               # T is demo-relative even on a partial render
    A_t = Aexpr.replace("T", f"(t+{off:.3f})")      # scale / overlay: lowercase t
    A_g = Aexpr.replace("T", f"(T+{off:.3f})")      # geq names its time variable T

    # ---- inset x: slides between corners (style.json repositionSeconds, smoothstep)
    LEFTX = 3840 - ins["left"] - ins["width"]; RIGHTX = ins["left"]
    SLIDE = float(ins["repositionSeconds"])
    rep = spec["inset"].get("reposition", [])
    if rep:
        f = "+".join(f"(clip((t-{r['start']-S:.3f})/{SLIDE:.3f},0,1)-clip((t-{r['end']-S:.3f})/{SLIDE:.3f},0,1))"
                     for r in rep)
        xexpr = f"{RIGHTX}+({LEFTX}-{RIGHTX})*(({f})*({f})*(3-2*({f})))"
    else:
        xexpr = str(RIGHTX)
    W = ins["width"]
    # scale 0.92 -> 1 with the envelope; overlay re-centres on the shrinking inset
    scl = f"(0.92+0.08*({A_t}))"
    ins_src = spec["inset"]["sourceCrop"]
    chain = [
        f"[0:v]trim=start={S-SO:.3f}:end={E-SO:.3f},setpts=PTS-STARTPTS"
        + "".join(f",delogo=x={m['x']}:y={m['y']}:w={m['w']}:h={m['h']}" for m in spec.get("screenMask", []))
        + "[scr0]",
        f"[scr0]zoompan=z='{zexpr}':x='{x0e}':y='{y0e}':d=1:s=3840x2160:fps=30[scr]",
        f"[1:v]trim=start={S:.3f}:end={E:.3f},setpts=PTS-STARTPTS,"
        f"crop={ins_src['w']}:{ins_src['h']}:{ins_src['x']}:{ins_src['y']},scale={W}:{W}[facesrc]",
        # envelope as a grey clip, multiplied into the rounded mask
        f"color=c=black:s=16x16:r=30:d={E-S+1:.3f},format=gray,geq=lum='255*({A_g})',"
        f"scale={W}:{W}[env]",
        f"[2:v]format=gray,trim=end_frame={N+30}[mk0]",
        "[mk0][env]blend=all_mode=multiply[mk]",
        "[facesrc][mk]alphamerge,format=rgba[face0]",
        f"[face0]scale=w='{W}*{scl}':h='{W}*{scl}':eval=frame[face]",
        f"[3:v]format=rgba,trim=end_frame={N+30},split[bc][bx]",
        "[bx]alphaextract,format=gray[ba]",
        "[ba][env2]blend=all_mode=multiply[ba2]",
        "[bc][ba2]alphamerge[bord0]",
        f"[bord0]scale=w='{W}*{scl}':h='{W}*{scl}':eval=frame[bord]",
        f"[scr][face]overlay=x='{xexpr}+({W}-w)/2':y='{ins['top']}+({W}-h)/2':eof_action=pass[wf]",
        f"[wf][bord]overlay=x='{xexpr}+({W}-w)/2':y='{ins['top']}+({W}-h)/2':eof_action=pass[out]",
    ]
    # the envelope feeds two blends; split it
    chain[3] = chain[3].replace("[env]", "[envs]")
    chain.insert(4, "[envs]split[env][env2]")
    fc = ";".join(chain)
    if a.print_only:
        print(fc); return
    cmd = ["ffmpeg", "-nostdin", "-y", "-v", "error", "-stats",
           "-i", a.screen, "-i", a.base, "-loop", "1", "-i", a.mask, "-loop", "1", "-i", a.border,
           "-filter_complex", fc, "-map", "[out]", "-an", "-frames:v", str(N),
           "-c:v", "hevc_videotoolbox", "-b:v", "55M", "-tag:v", "hvc1", "-pix_fmt", "yuv420p",
           "-fps_mode", "cfr", "-r", "30", a.out]
    print(f"demo scene {S:.2f}-{E:.2f}s ({E-S:.1f}s, {N} frames), {len(terms)} punch-in(s), "
          f"{len(spec['inset'].get('hiddenDuring', []))} inset dips, {len(rep)} corner moves")
    r = subprocess.run(cmd)
    sys.exit(r.returncode)


if __name__ == "__main__":
    main()
