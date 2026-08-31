#!/usr/bin/env python3
"""Build a sidecar .srt from the cut-aligned transcript.

Inputs are ARGUMENTS, never literals, and the timings are gated against the
render they are meant to sit on top of, per hard rule 12. A caption file that is
silently built from a stale transcript looks completely correct in a text editor.

Usage: make_captions.py <transcript-cut.json> <render> <out.srt>
"""
import json, sys, subprocess, re

# Heard -> correct. Everything here was mangled by WhisperX on THIS video and
# checked against what is actually said. Phrase-level, applied to assembled cue
# text after the timings are fixed, so a replacement that changes the word count
# cannot move a timestamp.
VOCAB = [
    (r'\bwipe coding\b',            'vibe coding'),
    (r'\bei agent\b',               'AI agent'),
    (r'\bXRUS\b',                   'across'),
    (r'\bdbdcore\b',                'dbt-core'),
    (r'\bduckdbt\b',                'dbt-duckdb'),
    # lookbehind: the dbt-duckdb rule above has already run, and a bare
    # duckdb rule with IGNORECASE happily recapitalises the tail of it.
    (r'(?<!dbt-)\bduckdb\b',        'DuckDB'),
    (r'\bdbt\b',                    'dbt'),
    (r'\bchat gbd\b',               'ChatGPT'),
    (r'\bchat gpt\b',               'ChatGPT'),
    (r'\bChatGpt\b',                'ChatGPT'),
    (r'\bchatgpt\b',                'ChatGPT'),
    (r'\bChat GPT\b',               'ChatGPT'),
    (r'\bthe green\b',              'the grain'),
    (r'\bPython 312\b',             'Python 3.12'),
    (r'\bSTG underscore POS,? Sundress Cross Transactions\b', 'stg_pos_transactions'),
    (r'\bSundress Cross Transactions\b', 'stg_pos_transactions'),
    (r'\bagents\.md\b',             'AGENTS.md'),
    (r'\bq and a\b',                'Q&A'),
    (r'\bcloud code\b',             'Claude Code'),
    (r'\bgithub\b',                 'GitHub'),
    (r'\blinkedin\b',               'LinkedIn'),
    (r'\byoutube\b',                'YouTube'),
    (r'\bcodex\b',                  'Codex'),
    (r'\bai\b',                     'AI'),
    (r'\byaml\b',                   'YAML'),
    (r'\bmcp\b',                    'MCP'),
    (r'\bgit\b',                    'git'),
    (r'\braspberry pi\b',           'Raspberry Pi'),
    (r'\bstaging\.yaml\b',          'staging.yml'),
    (r'\btwitter\b',                'Twitter'),
    (r'\breddit\b',                 'Reddit'),
    (r'\bchat bot\b',               'chatbot'),
    (r'\bcode transactions\b',      'stg_transactions'),
]

MAX_CHARS_PER_LINE = 42
MAX_LINES = 2
MAX_CUE_SEC = 6.5
MIN_CUE_SEC = 1.0
GAP_BREAK = 0.45          # a pause this long is a phrase boundary


def probe_duration(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                          '-of', 'csv=p=0', path], capture_output=True).stdout
    return float(out or 0)


def ts(t):
    if t < 0:
        t = 0.0
    h = int(t // 3600); m = int(t % 3600 // 60); s = int(t % 60)
    ms = int(round((t - int(t)) * 1000))
    if ms == 1000:
        ms = 0; s += 1
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def chunk(words):
    """Split the word stream into cues on phrase boundaries, never mid-clause.

    A cue never spans two segments. Segments are separate cuts lifted from
    different places in the recording, so a cue that straddles one runs two
    unrelated sentences together and sits across a splice.
    """
    cues, cur = [], []
    for i, w in enumerate(words):
        # predictive: break BEFORE the word that would push the cue past two
        # lines. Checking after appending lets a cue overshoot by one word, and
        # then no two-line wrap exists for it.
        if cur:
            projected = len(' '.join(x['word'] for x in cur)) + 1 + len(w['word'])
            if projected > MAX_CHARS_PER_LINE * MAX_LINES:
                cues.append(cur); cur = []
        cur.append(w)
        txt = ' '.join(x['word'] for x in cur)
        dur = cur[-1]['end'] - cur[0]['start']
        nxt = words[i + 1] if i + 1 < len(words) else None
        gap = (nxt['start'] - w['end']) if nxt else 999
        seg_ends = (nxt is None) or nxt['segment'] != w['segment']
        hard_stop = w['word'].endswith(('.', '?', '!'))
        soft_stop = w['word'].endswith((',', ';', ':'))
        too_long = len(txt) >= MAX_CHARS_PER_LINE * MAX_LINES or dur >= MAX_CUE_SEC
        if seg_ends or hard_stop or too_long or (gap >= GAP_BREAK and len(txt) > 18) \
           or (soft_stop and len(txt) > MAX_CHARS_PER_LINE):
            cues.append(cur); cur = []
    if cur:
        cues.append(cur)
    return cues


def wrap(text):
    """Balance into at most MAX_LINES, and never exceed MAX_CHARS_PER_LINE."""
    if len(text) <= MAX_CHARS_PER_LINE:
        return text
    words = text.split()
    best = None
    for split in range(1, len(words)):
        a = ' '.join(words[:split]); b = ' '.join(words[split:])
        if len(a) > MAX_CHARS_PER_LINE or len(b) > MAX_CHARS_PER_LINE:
            continue
        score = abs(len(a) - len(b))
        if best is None or score < best[0]:
            best = (score, a + '\n' + b)
    if best:
        return best[1]
    # cannot fit in two lines: greedy fill, longest line still wins the cap
    lines, cur = [], ''
    for w in words:
        if cur and len(cur) + 1 + len(w) > MAX_CHARS_PER_LINE:
            lines.append(cur); cur = w
        else:
            cur = f"{cur} {w}".strip()
    if cur:
        lines.append(cur)
    return '\n'.join(lines)


def clean(text, sentence_start):
    """Vocabulary fixes and casing.

    Only capitalise the opening when the PREVIOUS cue actually ended a sentence.
    Capitalising every cue turns a clause carried across two cards into "On my
    computer can be", which reads as a new sentence and is not what was said.
    """
    for pat, rep in VOCAB:
        text = re.sub(pat, rep, text, flags=re.IGNORECASE if rep[0].isupper() else 0)
    text = re.sub(r'\s+', ' ', text).strip()
    text = re.sub(r'\s+([,.;:?!])', r'\1', text)
    text = re.sub(r'\bi\b', 'I', text)
    text = re.sub(r'([.?!]\s+)([a-z])', lambda m: m.group(1) + m.group(2).upper(), text)
    if sentence_start and text:
        text = text[0].upper() + text[1:]
    return text


def main():
    if len(sys.argv) != 4:
        print(__doc__); return 2
    tpath, render, out = sys.argv[1:4]
    d = json.load(open(tpath))
    words = [w for w in d['words'] if w['word'].strip()]

    # --- gates -------------------------------------------------------------
    rdur = probe_duration(render)
    last = words[-1]['end']
    print(f"  render {rdur:.3f}s | last spoken word ends {last:.3f}s | "
          f"transcript nominal total {d['totalSeconds']:.3f}s")
    if last > rdur + 0.05:
        print(f"  FAIL: captions run {last - rdur:.3f}s past the end of the render. "
              f"Stale transcript for this cut.")
        return 1
    bad = [(a['word'], a['end'], b['start']) for a, b in zip(words, words[1:])
           if b['start'] < a['start'] - 1e-6]
    if bad:
        print(f"  FAIL: {len(bad)} words go backwards in time, e.g. {bad[0]}")
        return 1
    if abs(d['fps'] - 30.0) > 1e-6:
        print(f"  FAIL: unexpected fps {d['fps']}")
        return 1

    # a segment's last word carries no terminal punctuation in the transcript,
    # so the next cue would run straight on from it. Close the sentence.
    for a, b in zip(words, words[1:] + [None]):
        if b is None or b['segment'] != a['segment']:
            if not a['word'].endswith(('.', '?', '!', ',', ':', ';')):
                a['word'] = a['word'] + '.'

    groups = chunk(words)

    # The vocabulary fixes run after chunking and some of them are longer than
    # what they replace ("XRUS" -> "across"), so a group measured as two lines can
    # come out as three. Split any group that no longer fits, at a word boundary.
    def fits(g):
        return wrap(clean(' '.join(w['word'] for w in g), False)).count('\n') <= 1
    fixed, queue = [], list(groups)
    while queue:
        g = queue.pop(0)
        if len(g) > 1 and not fits(g):
            h = len(g) // 2
            queue.insert(0, g[h:]); queue.insert(0, g[:h])
        else:
            fixed.append(g)
    groups = fixed

    # A single short word left alone flashes past. Fold it into its neighbour when
    # they belong to the same segment and the pair still fits on two lines.
    merged = []
    for g in groups:
        dur = g[-1]['end'] - g[0]['start']
        if (merged and dur < 0.8 and len(' '.join(w['word'] for w in g)) < 22
                and merged[-1][-1]['segment'] == g[0]['segment']
                and fits(merged[-1] + g)
                and g[-1]['end'] - merged[-1][0]['start'] <= MAX_CUE_SEC):
            merged[-1] = merged[-1] + g
        else:
            merged.append(g)
    groups = merged

    built, sentence_start = [], True
    for c in groups:
        text = clean(' '.join(w['word'] for w in c), sentence_start)
        if not text:
            continue
        sentence_start = text.endswith(('.', '?', '!'))
        built.append([c[0]['start'], c[-1]['end'], text])

    # hold a short cue on screen longer for readability, but never into the next
    for i, cue in enumerate(built):
        ceiling = built[i + 1][0] - 0.04 if i + 1 < len(built) else rdur
        if cue[1] - cue[0] < MIN_CUE_SEC:
            cue[1] = max(cue[1], min(cue[0] + MIN_CUE_SEC, ceiling))
        cue[1] = min(cue[1], ceiling)
        if cue[1] <= cue[0]:
            cue[1] = cue[0] + 0.2

    lines = []
    for n, (st, en, text) in enumerate(built, 1):
        lines.append(f"{n}\n{ts(st)} --> {ts(en)}\n{wrap(text)}\n")
    n = len(built)
    # no cue may overlap the next
    open(out, 'w').write('\n'.join(lines))
    print(f"  wrote {out}: {n} cues, {len(words)} words, "
          f"{last/60:.1f} min of speech")
    return 0


if __name__ == '__main__':
    sys.exit(main())
