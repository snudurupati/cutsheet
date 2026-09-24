#!/usr/bin/env python3
"""Hard rule 11: verify CONTENT, not counts, and verify it against the RAW FOOTAGE.

Every gate in this pipeline measures frames, samples and durations, and a stale or
mismatched source can satisfy all of them exactly. This gate has two halves and
both are required:

  AUDIO  transcribe a window of the render and compare it against the cut
         transcript. Fail below ~70% word match on the leading words.

  VIDEO  map a dozen render timestamps through transcript/cutsheet.json to their
         SOURCE frames and compare pixels. That check alone is what the audio half
         cannot do: transcript-cut.json is generated from the cutsheet, so it
         agrees with anything else generated from the cutsheet. On 2026-08-30 a
         graphics pass shipped with video in source order and audio in play order
         and scored 98% on the audio half alone.

Samples the FIRST TWO SECONDS as well as the middle: when a segment is lifted to
the front the two orderings re-converge after it, so every later window passes
under both.

Windows covered by a full-frame drawn segment are skipped for the VIDEO half --
there is no footage under them to compare. They are listed so the coverage is
visible rather than silently narrowed.

Usage: verify.py <render.mp4>
"""
import json, os, subprocess, sys, statistics, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(os.path.join(HERE, '..'))
REND = sys.argv[1] if len(sys.argv) > 1 else 'outputs/graphics-pass.mp4'
plan = json.load(open('graphics-build/cutsheet.json'))
cs   = json.load(open('transcript/cutsheet.json'))
FPS  = eval(plan['fps'])

# ---- map output time -> (source file, source time), through the play-order cutsheet
spans, t = [], 0.0
for s in cs['segments']:
    d = s['end'] - s['start']
    spans.append((t, t + d, s['src'], s['start']))
    t += d
def to_source(ot):
    for a, b, src, ss in spans:
        if a <= ot < b: return src, ss + (ot - a)
    return None, None

covered = [(p['start'], p['end']) for p in plan['parts'] if p['class'] == 'segment']
def is_covered(ot): return any(a <= ot < b for a, b in covered)

def frame(path, ts, out, w=320):
    subprocess.run(['ffmpeg','-v','error','-ss',f'{ts:.6f}','-i',path,'-frames:v','1',
                    '-vf',f'scale={w}:-1','-y',out], check=True)

def meandiff(a, b):
    from PIL import Image, ImageChops
    ia, ib = Image.open(a).convert('L'), Image.open(b).convert('L')
    if ia.size != ib.size: ib = ib.resize(ia.size)
    d = ImageChops.difference(ia, ib)
    return statistics.mean(list(d.get_flattened_data()))

# ------------------------------------------------------------------ VIDEO half
print('VIDEO: render vs RAW FOOTAGE, mapped through the cutsheet')
cands = [0.3, 0.9, 1.5, 1.9, 30.0, 55.0, 100.0, 110.0, 185.0, 250.0, 330.0, 430.0,
         470.0, 476.0, 575.0, 590.0, 600.0]
ok = bad = skipped = 0
with tempfile.TemporaryDirectory() as tmp:
    for ot in cands:
        if is_covered(ot):
            print(f'  t={ot:7.2f}  under a drawn segment, no footage to compare, skipped')
            skipped += 1; continue
        src, st = to_source(ot)
        if src is None: continue
        a, b = f'{tmp}/r.png', f'{tmp}/s.png'
        frame(REND, ot, a); frame(src, st, b)
        d = meandiff(a, b)
        verdict = 'MATCH' if d < 1.2 else 'MISPLACED'
        print(f'  t={ot:7.2f} -> {os.path.basename(src)[:14]} @{st:8.2f}  diff {d:5.2f}  {verdict}')
        ok += d < 1.2; bad += d >= 1.2
print(f'  {ok} matched, {bad} misplaced, {skipped} skipped')

# ------------------------------------------------------------------ AUDIO half
print('\nAUDIO: render vs outputs/transcript-cut.json')
tc = json.load(open('outputs/transcript-cut.json'))
words = tc['words']
def expected(a, b):
    return [w['word'].lower().strip('.,?!') for w in words if a <= w['start'] < b]

WIN = (0.0, 25.0)
with tempfile.TemporaryDirectory() as tmp:
    wav = f'{tmp}/w.wav'
    subprocess.run(['ffmpeg','-v','error','-ss',str(WIN[0]),'-t',str(WIN[1]-WIN[0]),
                    '-i',REND,'-vn','-ac','1','-ar','16000','-y',wav], check=True)
    r = subprocess.run(['whisperx',wav,'--model','base','--output_dir',tmp,
                        '--output_format','json','--language','en','--compute_type','int8'],
                       capture_output=True, text=True)
    js = [f for f in os.listdir(tmp) if f.endswith('.json')]
    if not js:
        print('  whisperx produced no output:'); print(r.stderr[-800:]); sys.exit(1)
    got = json.load(open(os.path.join(tmp, js[0])))
    heard = ' '.join(s['text'] for s in got['segments']).lower()
    heard_w = [w.strip('.,?!') for w in heard.split()]

exp = expected(*WIN)
lead = exp[:40]
hit = sum(1 for w in lead if w in heard_w)
pct = 100 * hit / max(1, len(lead))
print(f'  expected lead: {" ".join(lead[:14])} ...')
print(f'  heard:         {" ".join(heard_w[:14])} ...')
print(f'  word match on leading {len(lead)}: {pct:.1f}%  (fail below 70%)')

fail = (bad > 0) or (pct < 70)
print('\nVERIFY ' + ('FAILED' if fail else 'PASSED'))
sys.exit(1 if fail else 0)
