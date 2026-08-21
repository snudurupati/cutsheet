#!/usr/bin/env python3
"""Rough cut: turn word-level transcript into cutsheet.json.
Policy per CLAUDE.md + styles/editorial. Silences compressed, never snapped to
silence detection; boundaries come from word alignment only."""
import json, re

FPS = 60.0
def snap(t):
    """Snap to the 60fps frame grid. Unaligned cuts make each segment's video
    round up to a whole frame while its audio stays sample-exact; across 92
    joins that accumulated 733ms of a/v drift. On the grid, 1 frame = 800 audio
    samples at 48kHz exactly, so both streams land together."""
    return round(round(t * FPS) / FPS, 6)

TH = "raw/talkinghead-2026-08-18 21-09-42.mov"
SC = "raw/screencast-2026-08-18 21-09-42.mov"

SECTIONS = [  # name, src, start, end, gap_threshold, gap_keep
    ("intro", TH, 8.690, 278.740, 0.70, 0.25),
    ("demo",  SC, 281.960, 649.880, 2.50, 1.00),
    ("outro", TH, 651.280, 811.480, 0.70, 0.25),
]

# Explicit kills — retakes and false starts. "Take the last one, always."
KILLS = [
    (359.32, 379.88, "retake: first 'fire up Claude Code' + 'can you see my screen' + font housekeeping; the redo at 379.88 is the keeper"),
    (391.91, 400.49, "false start: 'how much / how many / how many' before landing on 'what is the state of the project'"),
]

# Mishear fixes, applied to cutsheet TEXT only (no captions in long form, so no
# timestamp risk). 'cloud'->'Claude' is mode:flag in brand.md — applied here
# deliberately after checking every occurrence in context, not silently.
FIXES = [(r'\bcloud\b', 'Claude'), (r'\bClaude code\b', 'Claude Code'),
         (r'\bdbd\b', 'dbt'), (r'\bdocdb\b', 'DuckDB'),
         (r'\bpairs transactions\b', 'POS transactions')]

def fix(t):
    for pat, rep in FIXES:
        t = re.sub(pat, rep, t, flags=re.I)
    return re.sub(r'\s+', ' ', t).strip()

d = json.load(open('projects/job1/transcript/transcript.json'))
W = [w for w in d['word_segments'] if 'start' in w and 'end' in w]

def killed(t):
    return any(a <= t < b for a, b, _ in KILLS)

segs, sid = [], 0
for name, src, s, e, thr, keep in SECTIONS:
    ws = [w for w in W if w['start'] >= s - 0.25 and w['end'] <= e + 1e-6 and not killed(w['start'])]
    if not ws:
        continue
    cur_start, cur_words = snap(ws[0]['start'] - 0.18), []   # pre-roll: never clip the first phoneme
    for a, b in zip(ws, ws[1:]):
        cur_words.append(a['word'])
        gap = b['start'] - a['end']
        broken = any(a['end'] <= k0 <= b['start'] or (k0 <= a['end'] and b['start'] <= k1) for k0, k1, _ in KILLS)
        if gap >= thr or broken:
            sid += 1
            segs.append(dict(id=f"s{sid:03d}", section=name, src=src,
                             start=snap(cur_start), end=snap(a['end'] + keep / 2),
                             text=fix(' '.join(cur_words))))
            cur_start = snap(b['start'] - keep / 2)
            cur_words = []
    cur_words.append(ws[-1]['word'])
    sid += 1
    segs.append(dict(id=f"s{sid:03d}", section=name, src=src,
                     start=snap(cur_start), end=snap(min(ws[-1]['end'] + 0.60, e + 0.60)),
                     text=fix(' '.join(cur_words))))

out = dict(job="job1", fps="60/1", frame=[3840, 2160], canvas=[1920, 1080],
           audioSource=f"{TH} (stream a:0)",
           kills=[dict(start=a, end=b, why=w) for a, b, w in KILLS] +
                 [dict(start=0.0, end=8.69, why="slate: 'Ready? One, two, three. Start.'"),
                  dict(start=278.74, end=281.96, why="section boundary silence, intro->demo"),
                  dict(start=649.88, end=651.28, why="section boundary silence, demo->outro")],
           segments=segs)
json.dump(out, open('projects/job1/transcript/cutsheet.json', 'w'), indent=2)

tot = sum(s['end'] - s['start'] for s in segs)
print(f"segments {len(segs)}  runtime {tot:.1f}s ({tot/60:.2f} min) from 811.5s")
for name in ('intro', 'demo', 'outro'):
    ss = [s for s in segs if s['section'] == name]
    print(f"  {name:6s} {len(ss):3d} segments  {sum(s['end']-s['start'] for s in ss):7.1f}s")
