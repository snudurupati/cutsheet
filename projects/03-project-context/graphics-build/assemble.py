#!/usr/bin/env python3
"""The composite pass: base cut -> demo scene -> segments -> overlays -> face mattes.

Layer order matters and is the whole point of the face-matte work:

    base footage
      demo scene            replaces the frame for its span
      full-frame segments   replace the frame for their spans
      overlay cards         composited on top
      subject matte         composited on top of the cards, so HE occludes THEM

Gotchas baked in, every one of which ships a broken video silently:

  * Overlays are aligned with trim/setpts, NEVER input-side -ss. Seeking the
    overlay input desynchronises its PTS from the base, eof_action=pass then lets
    the bare footage through, and the overlay never appears. It looks correct only
    for a part starting at 00:00, so a spot check on the first graphic passes while
    every later one is missing.
  * eof_action=pass on every overlay. With the default (repeat), chaining short
    overlays over a long base makes the frame scheduler duplicate output frames on
    a periodic cadence: dead-even constant frame rate, so every tool reads it as
    fine, while the content only changes ~18 times a second.
  * The base is the MAIN input. A looped still at the head of the chain never ends;
    that mistake wrote a 142GB file on an earlier job.
  * One pass, not two. Every extra full-frame pass is another generation loss at 4K.
"""
import argparse, json, os, subprocess, sys


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cutsheet", required=True)
    ap.add_argument("--base", required=True)
    ap.add_argument("--renders", required=True)
    ap.add_argument("--demo-scene", default="")
    ap.add_argument("--demo-spec", default="")
    ap.add_argument("--demo-scene-json", default="",
                    help="graphics-build/demo-scene.json, the DERIVED enters/leaves. "
                         "Cross-checked against --demo-spec's span so the two cannot "
                         "drift apart silently")
    ap.add_argument("--mattes", default="")
    ap.add_argument("--matte-feather", type=float, default=2.0,
                    help="Gaussian sigma applied to the matte ALPHA only. The keys come "
                         "back binary (0 or 255, no partial alpha), which reads as a "
                         "jagged cutout wherever the silhouette is smooth. 0 disables.")
    ap.add_argument("--out", required=True)
    ap.add_argument("--fps", type=float, default=30.0)
    ap.add_argument("--print-only", action="store_true")
    a = ap.parse_args()

    cs = json.load(open(a.cutsheet))
    parts = [p for p in cs["parts"]]
    inputs = ["-i", a.base]
    chain = []
    cur = "0:v"
    n = 1

    # 1) the demo scene replaces the frame for its span.
    # A missing file here used to be skipped SILENTLY. On 2026-09-09 a re-composite
    # was pointed at graphics-build/renders/demo-scene.mp4 instead of
    # outputs/demo-scene.mp4; the whole 19-minute screen recording was dropped and
    # replaced with the raw talking head. It still exited 0 and landed within 0.002%
    # of the correct file's size (12,044,577,388 vs 12,044,772,740 bytes), because
    # the base is the main input and its length is what sets the output length: the
    # frame and sample counts could not have caught this. It was found by pulling a
    # frame and LOOKING at it. The parts loop has always exited on a missing render;
    # this one did not.
    if a.demo_scene:
        if not os.path.exists(a.demo_scene):
            sys.exit(f"--demo-scene {a.demo_scene} does not exist. Refusing to composite "
                     "without it: the result would be a valid, correct-length video with "
                     "the entire demo missing")
        if not a.demo_spec or not os.path.exists(a.demo_spec):
            sys.exit(f"--demo-scene given but --demo-spec {a.demo_spec!r} is missing")
        spec = json.load(open(a.demo_spec))
        S, E = spec["span"]["start"], spec["span"]["end"]
        dj = json.load(open(a.demo_scene_json)) if a.demo_scene_json else None
        if dj and (abs(S - dj["enters"]["cutSeconds"]) > 0.01
                   or abs(E - dj["leaves"]["cutSeconds"]) > 0.01):
            sys.exit(f"demo-spec span {S}-{E} disagrees with demo-scene.json "
                     f"{dj['enters']['cutSeconds']}-{dj['leaves']['cutSeconds']}")
        if E > cs["totalSeconds"] + 0.01:
            sys.exit(f"demo scene ends at {E}s, past the {cs['totalSeconds']}s cut")
        inputs += ["-i", a.demo_scene]
        chain.append(f"[{n}:v]setpts=PTS-STARTPTS+{S:.3f}/TB[dm]")
        chain.append(f"[{cur}][dm]overlay=0:0:eof_action=pass:"
                     f"enable='between(t,{S:.3f},{E:.3f})'[v{n}]")
        cur = f"v{n}"; n += 1

    # 2) full-frame segments (the takeovers), then 3) the overlay cards
    for p in parts:
        ext = "mp4" if p["class"] == "segment" else "mov"
        f = os.path.join(a.renders, f"{p['id']}.{ext}")
        if not os.path.exists(f):
            if p["kind"] == "zoom":
                continue          # zooms live inside the demo scene, not here
            sys.exit(f"missing render for {p['id']}: {f}")
        inputs += ["-i", f]
        # setpts, never -ss. eof_action=pass, never repeat.
        chain.append(f"[{n}:v]setpts=PTS-STARTPTS+{p['start']:.3f}/TB[p{n}]")
        chain.append(f"[{cur}][p{n}]overlay=0:0:eof_action=pass:"
                     f"enable='between(t,{p['start']:.3f},{p['end']:.3f})'[v{n}]")
        cur = f"v{n}"; n += 1

    # 4) the subject matte goes on TOP of the cards, so he occludes them.
    # Fatal if named and missing, for the same reason as the demo scene above: a
    # skipped matte layer puts every left-column card back OVER his face, which is
    # the thing the whole face-forward pass exists to prevent, and the render is
    # still exactly the right length.
    if a.mattes:
        mj = os.path.join(a.mattes, "mattes.json")
        if not os.path.exists(mj):
            sys.exit(f"--mattes {a.mattes} has no mattes.json. Refusing to composite: "
                     "the cards would land on top of the speaker's face")
        mt = json.load(open(mj))
        if not mt:
            sys.exit(f"{mj} is empty; run face_mattes.py or drop the --mattes flag")
        for pid, m in sorted(mt.items()):
            f = os.path.join(a.mattes, m["matte"])
            if not os.path.exists(f):
                sys.exit(f"missing matte for {pid}: {f}")
            inputs += ["-i", f]
            # the matte was cut from spanStart, so it is delayed to that, not to
            # the part start, or the subject would lag his own footage.
            # FEATHER THE KEY. remove-background returns a fully BINARY alpha:
            # measured on g025 at 4K, the edge goes 0 -> 255 with exactly 0px of
            # partial alpha, so a smooth silhouette like a cheek renders as a
            # stair-stepped cutout and the whole shot reads like a cheap virtual
            # background. Blurring the alpha (and only the alpha) gives the key
            # ~11px of anti-aliasing at 4K, about 5px at 1080p.
            # Done here rather than by re-encoding the mattes: it is exact, and it
            # keeps 22GB of ProRes 4444 off the disk.
            chain.append(f"[{n}:v]setpts=PTS-STARTPTS+{m['spanStart']:.3f}/TB,"
                         f"format=rgba,split=2[mc{n}][mx{n}]")
            chain.append(f"[mx{n}]alphaextract,format=gray,gblur=sigma={a.matte_feather}[ma{n}]")
            chain.append(f"[mc{n}][ma{n}]alphamerge[m{n}]")
            chain.append(f"[{cur}][m{n}]overlay=0:0:eof_action=pass:"
                         f"enable='between(t,{m['start']:.3f},{m['end']:.3f})'[v{n}]")
            cur = f"v{n}"; n += 1

    fc = ";".join(chain)
    if a.print_only:
        print(fc)
        print(f"\n{len(inputs)//2} inputs, {len(chain)} filter steps")
        return

    cmd = ["ffmpeg", "-nostdin", "-y", "-v", "error", "-stats", *inputs,
           "-filter_complex", fc, "-map", f"[{cur}]", "-map", "0:a:0",
           "-c:v", "hevc_videotoolbox", "-b:v", "60M", "-tag:v", "hvc1",
           "-pix_fmt", "yuv420p", "-fps_mode", "cfr", "-r", f"{a.fps:g}",
           "-c:a", "pcm_s24le", "-map_chapters", "-1", a.out]
    print(f"compositing {len(inputs)//2} inputs into {a.out}", flush=True)
    r = subprocess.run(cmd)
    sys.exit(r.returncode)


main()
