#!/usr/bin/env python3
"""Composite every part onto the base cut in ONE pass, then gate the result.

Rules from .claude/skills/graphics (the composite traps):
  - the base is the MAIN input of the chain. Looped stills are infinite; if one
    heads the chain the output never ends -- that mistake once wrote a 142GB file.
  - overlays are aligned with -itsoffset, NEVER input-side -ss. Seeking an overlay
    input desynchronises its PTS from the base, eof_action=pass then passes the
    bare footage through, and the overlay silently never appears. It looks correct
    only for a part starting at 00:00, so a spot check on the first graphic passes
    while every later one is missing.
  - every overlay gets eof_action=pass (never repeat) and repeatlast=0. Chaining
    short overlays over a long base with the default makes the frame scheduler
    duplicate output frames on a periodic cadence: dead-even CFR that every tool
    reads as fine while the content only changes ~18 times a second in a 60fps
    costume. Detected below by frame hash, and failed above 8%.
  - ONE pass, not two. Every extra full-frame pass is another 4K generation loss.
  - the base rough cut is never re-rendered; this reads it and writes a new file.

Every input is gated against the cut sheet before any work starts.
Usage: assemble.py [--head SECONDS]
"""
import json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(os.path.join(HERE, '..'))
plan = json.load(open('graphics-build/cutsheet.json'))
FPS = eval(plan['fps'])
BASE = 'outputs/base-cut.mp4'
OUT = 'outputs/graphics-pass.mp4'
head = float(sys.argv[sys.argv.index('--head') + 1]) if '--head' in sys.argv else None

def sprobe(path, entries):
    return subprocess.run(['ffprobe','-v','error','-select_streams','v:0','-show_entries',
        f'stream={entries}','-of','csv=p=0',path], capture_output=True, text=True).stdout.strip()

# ---------------------------------------------------------------- gates
bw, bh, bfr, bn = sprobe(BASE, 'width,height,r_frame_rate,nb_frames').split(',')
assert int(bn) == plan['runtimeFrames'], f'base {bn} frames vs cut sheet {plan["runtimeFrames"]}'
assert eval(bfr) == FPS, f'base is {bfr}, cut sheet says {plan["fps"]}'
print(f'base {bw}x{bh} {bfr} {bn} frames')

layers = []            # (path, start, end, kind)
for p in plan['parts']:
    if p['id'] == 'g011':
        f = 'graphics-build/renders/g011_seg.mp4'; kind = 'seg'
    elif p['id'] == 'g015':
        f = 'graphics-build/renders/g015_seg.mp4'; kind = 'seg'
    elif p['class'] == 'overlay':
        f = f"graphics-build/renders/{p['id']}.mov"; kind = 'ovl'
    else:
        f = f"graphics-build/renders/{p['id']}.mp4"; kind = 'seg'
    if not os.path.exists(f):
        sys.exit(f'missing {f} for {p["id"]}')
    # Each part must match the base frame rate EXACTLY -- mixed rates drift.
    fr = sprobe(f, 'r_frame_rate')
    if eval(fr) != FPS: sys.exit(f'{f} is {fr}, base is {bfr}')
    # An overlay without alpha composites as a black rectangle over the footage.
    if kind == 'ovl':
        pf = sprobe(f, 'pix_fmt')
        if not pf.startswith('yuva'): sys.exit(f'{f} has no alpha ({pf})')
    # And its length must match the window the cut sheet gives it.
    n = int(sprobe(f, 'nb_frames')); exp = p['endFrame'] - p['startFrame']
    if abs(n - exp) > 1: sys.exit(f'{f}: {n} frames, cut sheet window is {exp}')
    layers.append((f, p['start'], p['end'], kind, p['id']))

# Segments replace the frame, so they go down first; overlays ride on top of them.
layers.sort(key=lambda l: (l[3] != 'seg', l[1]))
print(f'{len(layers)} layers: {sum(1 for l in layers if l[3]=="seg")} segment, '
      f'{sum(1 for l in layers if l[3]=="ovl")} overlay')

cmd = ['ffmpeg','-nostdin','-hide_banner','-v','error','-y','-i', BASE]
for f, s, e, kind, pid in layers:
    cmd += ['-itsoffset', f'{s:.6f}', '-i', f]

g, prev = [], '[0:v]'
for i, (f, s, e, kind, pid) in enumerate(layers, start=1):
    tag = f'[b{i}]'
    g.append(f"{prev}[{i}:v]overlay=0:0:eof_action=pass:repeatlast=0:"
             f"enable='between(t,{s:.6f},{e:.6f})'{tag}")
    prev = tag
g[-1] = g[-1].rsplit('[b', 1)[0] + '[v]'

cmd += ['-filter_complex', ';'.join(g), '-map', '[v]', '-map', '0:a']
if head: cmd += ['-t', str(head)]
cmd += ['-c:v','libx264','-crf','16','-preset','medium','-pix_fmt','yuv420p',
        '-r', str(FPS), '-c:a','copy', OUT]

print('compositing (one pass) ...', flush=True)
r = subprocess.run(cmd, capture_output=True, text=True)
if r.returncode:
    print(r.stderr[-3000:]); sys.exit('composite failed')

w, h, fr, n = sprobe(OUT, 'width,height,r_frame_rate,nb_frames').split(',')
print(f'wrote {OUT}: {w}x{h} {fr} {n} frames')
if not head and int(n) != plan['runtimeFrames']:
    sys.exit(f'output is {n} frames, expected {plan["runtimeFrames"]}')

# ---- duplicate-frame gate, by FRAME HASH (mpdecimate cannot see this bug).
print('duplicate-frame check ...', flush=True)
# -y and a per-run path: without -y ffmpeg REFUSES to overwrite, prints a prompt
# nobody reads, exits, and the loop below then measures the PREVIOUS run's hashes
# and reports a clean pass. A gate that reads a stale artefact is worse than none.
import tempfile
md5 = tempfile.NamedTemporaryFile(suffix='.md5', delete=False).name
r = subprocess.run(['ffmpeg','-v','error','-y','-i',OUT,'-map','0:v:0','-f','framemd5', md5],
                   capture_output=True, text=True)
if r.returncode or not os.path.getsize(md5):
    print(r.stderr[-1500:]); sys.exit('framemd5 failed - duplicate gate could not run')
prev_h, dup, tot = None, 0, 0
for line in open(md5):
    if line.startswith('#'): continue
    hsh = line.rsplit(',', 1)[-1].strip(); tot += 1
    if hsh == prev_h: dup += 1
    prev_h = hsh
os.unlink(md5)
assert tot == plan['runtimeFrames'], f'hashed {tot} frames, expected {plan["runtimeFrames"]}'
pct = 100 * dup / tot
print(f'  duplicates {dup}/{tot} = {pct:.2f}%  (clean <3%, the scheduler bug ~25%, fail >8%)')
if pct > 8: sys.exit('duplicate-frame gate FAILED')
print('composite OK')
