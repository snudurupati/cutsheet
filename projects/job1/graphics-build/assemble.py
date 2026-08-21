#!/usr/bin/env python3
"""Composite the demo inset + every overlay part onto the base cut in ONE pass.

Rules from .claude/skills/graphics (composite traps):
  - every overlay gets eof_action=pass, never repeat. Chaining short overlays
    over a long base with the default makes the frame scheduler duplicate output
    frames on a periodic cadence — dead-even CFR that every tool reads as fine
    while the content only changes ~18 times a second in a 60fps costume.
    repeatlast=0 as well, or an overlay's final frame is held forever.
  - the base cut is never re-rendered. This reads it and writes a new file, so
    editing one graphic means re-rendering one part and re-running this pass.
  - ONE pass, not two: every extra full-frame pass is another 4K generation loss.
  - the base must be the MAIN input of the chain. Looped stills (mask, shadow,
    border) are infinite; if one of them heads the chain the output never ends —
    that mistake wrote a 142GB file before it was caught.

The demo inset is pure geometry and never enters a browser: minutes of footage
round-tripped through a headless render costs ~3% luma on every frame of it.

Usage: assemble.py [--head SECONDS]   (--head renders only the first N seconds)
"""
import json, os, subprocess, sys

os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')
plan = json.load(open('graphics-build/cutsheet.json'))
overlays = [p for p in plan['parts'] if p['class'] == 'overlay']
demo = next(p for p in plan['parts'] if p['class'] == 'segment')

head = None
if '--head' in sys.argv:
    head = float(sys.argv[sys.argv.index('--head') + 1])

# canvas 1368,528 + 80px art padding, all doubled for 3840x2160 delivery
FACE_X, FACE_Y = 2736, 1056
SHADOW_X, SHADOW_Y = FACE_X - 80, FACE_Y - 80
IN_AT = demo['start'] + 0.30          # inset enters once, 0.3s after the cut
OUT_AT = demo['end'] - 0.35           # and leaves once
WIN = f"between(t,{demo['start']:.3f},{demo['end']:.3f})"
FADES = (f"fade=t=in:st={IN_AT:.3f}:d=0.50:alpha=1,"
         f"fade=t=out:st={OUT_AT:.3f}:d=0.35:alpha=1")

cmd = ['ffmpeg', '-nostdin', '-hide_banner', '-v', 'error', '-y',
       '-i', 'outputs/base-cut.mp4',
       '-itsoffset', f"{demo['start']:.3f}", '-i', 'outputs/face/face-strip.mov',
       '-loop', '1', '-framerate', '60', '-i', 'graphics-build/art/inset-mask.png',
       '-loop', '1', '-framerate', '60', '-i', 'graphics-build/art/inset-shadow.png',
       '-loop', '1', '-framerate', '60', '-i', 'graphics-build/art/inset-border.png']

for p in overlays:
    cmd += ['-itsoffset', f"{p['start']:.3f}", '-i', f"graphics-build/renders/{p['id']}.mov"]

g = [
    "[1:v]format=yuva444p[fv]",
    "[2:v]format=gray[mk]",
    f"[fv][mk]alphamerge,{FADES}[face]",
    f"[3:v]format=rgba,{FADES}[sh]",
    f"[4:v]format=rgba,{FADES}[bd]",
    f"[0:v][sh]overlay=x={SHADOW_X}:y={SHADOW_Y}:eof_action=pass:repeatlast=0:enable='{WIN}'[b1]",
    f"[b1][face]overlay=x={FACE_X}:y={FACE_Y}:eof_action=pass:repeatlast=0:enable='{WIN}'[b2]",
    f"[b2][bd]overlay=x={FACE_X}:y={FACE_Y}:eof_action=pass:repeatlast=0:enable='{WIN}'[b3]",
]
last = 'b3'
for idx, p in enumerate(overlays, start=5):
    tag = f'o{idx}'
    # +0.5s tail on the enable window: assets outlast their window, so a slightly
    # late composite boundary never exposes a missing asset.
    g.append(f"[{last}][{idx}:v]overlay=x=0:y=0:eof_action=pass:repeatlast=0:"
             f"enable='between(t,{p['start']:.3f},{p['end'] + 0.5:.3f})'[{tag}]")
    last = tag

out = 'outputs/graphics-head.mp4' if head else 'outputs/graphics-pass.mp4'
cmd += ['-filter_complex', ';'.join(g), '-map', f'[{last}]', '-map', '0:a']
if head:
    cmd += ['-t', f'{head:.3f}']
cmd += ['-c:v', 'h264_videotoolbox', '-b:v', '50M', '-profile:v', 'high',
        '-pix_fmt', 'yuv420p', '-video_track_timescale', '60000',
        '-c:a', 'copy', out]

print(f"compositing demo inset + {len(overlays)} overlays -> {out}")
sys.stdout.flush()
sys.exit(subprocess.run(cmd).returncode)
