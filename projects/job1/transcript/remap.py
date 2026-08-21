#!/usr/bin/env python3
"""Write outputs/transcript-cut.json — every word remapped onto the EDITED
timeline. Required by .claude/skills/rough-cut step 5: every downstream skill
reads this file and nothing re-transcribes, ever."""
import json, os

os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')
cut = json.load(open('transcript/cutsheet.json'))
src = json.load(open('transcript/transcript.json'))
W = [w for w in src['word_segments'] if 'start' in w and 'end' in w]

spans, out_t = [], 0.0
for s in cut['segments']:
    spans.append((s['start'], s['end'], out_t, s['section'], s['id']))
    out_t += s['end'] - s['start']

words = []
for w in W:
    for s0, s1, o0, section, sid in spans:
        if w['start'] >= s0 and w['end'] <= s1:
            words.append(dict(word=w['word'],
                              start=round(w['start'] - s0 + o0, 3),
                              end=round(w['end'] - s0 + o0, 3),
                              srcStart=round(w['start'], 3),
                              section=section, segment=sid))
            break

json.dump(dict(runtime=round(out_t, 3), fps=60, words=words),
          open('outputs/transcript-cut.json', 'w'), indent=1)
print(f"remapped {len(words)} of {len(W)} words onto a {out_t:.2f}s timeline "
      f"({len(W)-len(words)} fell inside cuts)")
