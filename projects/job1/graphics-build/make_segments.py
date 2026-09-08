#!/usr/bin/env python3
"""Build the two segments that carry FOOTAGE, before the composite pass.

A segment replaces the frame for its window, so it renders with its own slice of
the base baked in. Both of these are pure geometry and never enter a browser:
minutes of footage round-tripped through a headless render costs ~3% of luma on
every frame, which shows up as the face dipping at every seam.

  g011  demo   -- screen recording full frame, face inset bottom right
  g015  panel  -- face reframed into the PiP box, the strike-list beside it.
                  This is the ONE picture-in-picture entry in the video.

Inputs are taken as arguments and every one is gated against the cut sheet before
any work happens: a hardcoded path is a landmine that arms itself the first time
the cut changes.
"""
import json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(os.path.join(HERE, '..'))
plan = json.load(open('graphics-build/cutsheet.json'))
FPS = eval(plan['fps'])
W, H = plan['deliver']
BG = None
for line in open('../../brand.md'):
    if '`bg`' in line and '#' in line:
        BG = line.split('`')[3]
assert BG, 'brand.md carries no bg token'

ONLY = sys.argv[sys.argv.index('--only') + 1] if '--only' in sys.argv else None
def wanted(pid): return ONLY is None or ONLY == pid

def part(pid):
    return next(p for p in plan['parts'] if p['id'] == pid)

def probe(path, key='duration'):
    return subprocess.run(['ffprobe','-v','error','-show_entries',f'format={key}',
                           '-of','csv=p=0',path], capture_output=True, text=True).stdout.strip()

def run(cmd, label):
    print(f"  {label} ...", flush=True)
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        print(r.stderr[-2500:]); sys.exit(f"FAILED: {label}")

# ---------------------------------------------------------------- gates
base = 'outputs/base-cut.mp4'
bframes = int(subprocess.run(['ffprobe','-v','error','-select_streams','v:0',
    '-show_entries','stream=nb_frames','-of','csv=p=0', base],
    capture_output=True, text=True).stdout.strip())
assert bframes == plan['runtimeFrames'], \
    f"base is {bframes} frames, cut sheet says {plan['runtimeFrames']}. Refusing to build"

# ---------------------------------------------------------------- g015 panel
p15 = part('g015')
p11 = part('g011')
dur15 = p15['end'] - p15['start']
dur11 = p11['end'] - p11['start']
if wanted('g015'):
    gfx15 = 'graphics-build/renders/g015.mov'
    assert os.path.exists(gfx15), f'{gfx15} missing. Render the parts first'
    # PiP geometry from style.json, doubled for 4K delivery.
    style = json.load(open('../../styles/editorial/style.json'))
    pip = style['graphics']['pip']['longForm']
    PX, PY, PW, PH = pip['left']*2, pip['top']*2, pip['width']*2, pip['height']*2
    # Square crop on the subject, measured on this footage (the demo inset uses the
    # same crop and it was signed off on the shipped video).
    CROP = 'crop=2160:2160:470:0'
    run(['ffmpeg','-nostdin','-hide_banner','-v','error','-y',
         '-ss', f"{p15['start']:.6f}", '-t', f"{dur15:.6f}", '-i', base,
         '-i', gfx15,
         '-f','lavfi','-t',f"{dur15:.6f}",'-i', f'color=c={BG}:s={W}x{H}:r={FPS}',
         '-filter_complex',
           f"[0:v]{CROP},scale={PW}:{PH}:flags=lanczos,setsar=1[face];"
           f"[2:v][face]overlay=x={PX}:y={PY}[plate];"
           f"[plate]drawbox=x={PX-2}:y={PY-2}:w={PW+4}:h={PH+4}:color=#DCD6CC@1:t=3[framed];"
           f"[framed][1:v]overlay=0:0:eof_action=pass:repeatlast=0[out]",
         '-map','[out]','-an','-r',str(FPS),
         '-c:v','libx264','-crf','16','-preset','medium','-pix_fmt','yuv420p',
         'graphics-build/renders/g015_seg.mp4'], 'g015 panel (PiP reframe + list)')

# ---------------------------------------------------------------- g011 demo
# Composited straight from the face strip and the inset art -- NOT via an
# intermediate ProRes 4444 file. That intermediate reached 45GB for 260s before it
# was killed; it buys nothing, because this pass has to read the layers anyway.
if wanted('g011'):
    strip = 'outputs/face/face-strip.mov'
    if not os.path.exists(strip):
        sys.exit('outputs/face/face-strip.mov missing -- run graphics-build/pip.sh first')
    sn = int(subprocess.run(['ffprobe','-v','error','-select_streams','v:0','-show_entries',
        'stream=nb_frames','-of','csv=p=0', strip], capture_output=True, text=True).stdout.strip())
    exp11 = p11['endFrame'] - p11['startFrame']
    assert abs(sn - exp11) <= 1, f'face strip is {sn} frames, demo window is {exp11}'

    # style.json demoInset, in canvas units, doubled for 4K delivery.
    di = style['graphics']['pip']['demoInset']
    FACE_X, FACE_Y = di['left'] * 2, di['top'] * 2          # 2736, 1056
    SHADOW_PAD = 80                                          # the shadow art's padding
    FADES = (f"fade=t=in:st=0.30:d=0.50:alpha=1,"
             f"fade=t=out:st={dur11 - 0.35:.3f}:d=0.35:alpha=1")
    run(['ffmpeg','-nostdin','-hide_banner','-v','error','-y',
         '-ss', f"{p11['start']:.6f}", '-t', f"{dur11:.6f}", '-i', base,
         '-i', strip,
         '-loop','1','-framerate',str(FPS),'-i','graphics-build/art/inset-mask.png',
         '-loop','1','-framerate',str(FPS),'-i','graphics-build/art/inset-shadow.png',
         '-loop','1','-framerate',str(FPS),'-i','graphics-build/art/inset-border.png',
         '-filter_complex',
           "[1:v]format=yuva444p[fv];"
           "[2:v]format=gray[mk];"
           f"[fv][mk]alphamerge,{FADES}[face];"
           f"[3:v]format=rgba,trim=duration={dur11:.6f},setpts=PTS-STARTPTS,{FADES}[sh];"
           f"[4:v]format=rgba,trim=duration={dur11:.6f},setpts=PTS-STARTPTS,{FADES}[bd];"
           # The BASE heads the chain. The three looped stills are infinite; if one of
           # them led, the output would never end -- that mistake once wrote 142GB.
           f"[0:v][sh]overlay=x={FACE_X-SHADOW_PAD}:y={FACE_Y-SHADOW_PAD}:eof_action=pass:repeatlast=0[a1];"
           f"[a1][face]overlay=x={FACE_X}:y={FACE_Y}:eof_action=pass:repeatlast=0[a2];"
           f"[a2][bd]overlay=x={FACE_X}:y={FACE_Y}:eof_action=pass:repeatlast=0[out]",
         '-map','[out]','-an','-r',str(FPS),
         '-c:v','libx264','-crf','16','-preset','medium','-pix_fmt','yuv420p',
         'graphics-build/renders/g011_seg.mp4'], 'g011 demo (screen + face inset)')

for pid, want in [(a, b) for a, b in (('g015_seg', dur15), ('g011_seg', dur11))
                  if wanted(a.replace('_seg', ''))]:
    f = f'graphics-build/renders/{pid}.mp4'
    got = float(probe(f))
    n = int(subprocess.run(['ffprobe','-v','error','-select_streams','v:0','-show_entries',
        'stream=nb_frames','-of','csv=p=0', f], capture_output=True, text=True).stdout.strip())
    exp = round(want * FPS)
    ok = abs(n - exp) <= 1
    print(f"  {pid}: {n} frames (expected {exp}) {'OK' if ok else 'MISMATCH'}")
    if not ok: sys.exit(1)
print('segments built')
