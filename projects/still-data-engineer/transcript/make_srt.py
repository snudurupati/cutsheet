#!/usr/bin/env python3
"""Build outputs/still-data-engineer.srt for YouTube CC.

Captions are READ, so the mishears the transcript deliberately kept - because fixing them
would have changed the word count and broken every downstream timestamp - are corrected
here. The timings are untouched; only the displayed text changes.
"""
import json, re

# heard -> correct. Multi-word fixes are safe now: nothing downstream reads this file.
FIX = [
    (r"\bClaude OpusFi\b", "Claude Opus 5"), (r"\bOpusFi\b", "Opus 5"),
    (r"I'm a cellular data engineer\.", "am I still a data engineer?"),
    (r"I'm a cellular data engineer", "am I still a data engineer"),
    (r"\bdbt core 112\b", "dbt-core 1.12"), (r"\bdbt\.db plugin\b", "dbt-DUCKDBPKG plugin"),
    (r"\bneurons\b", "new rows"), (r"\bneuros\b", "new rows"),
    (r"\bthe green\b", "the grain"), (r"\bof green\b", "of grain"),
    (r"\bit's a wide\b", "it's a void"), (r"\bthe wider transaction\b", "the void transaction"),
    (r"\bopen ai\b", "OpenAI"), (r"\bgemini\b", "Gemini"),
    (r"\bduckdb\b", "DuckDB"), (r"\bduckdb's\b", "DuckDB's"),
    (r"\bblob leader reader\b", "blob reader"),
    (r"\bcodecs\b", "Codex"), (r"\bcodex\b", "Codex"),
    (r"\bhive kind of partitioning\b", "Hive-style partitioning"),
    (r"DUCKDBPKG", "duckdb"),
    (r"\bparquet\b", "Parquet"), (r"\bpython 312\b", "Python 3.12"),
    (r"\bcloud storage\b", "cloud storage"),
]
FILLER = re.compile(r"\b(uh|um)\b[ ,]*", re.I)

def clean(s):
    for pat, rep in FIX:
        s = re.sub(pat, rep, s, flags=re.I if pat.islower() else 0)
    s = FILLER.sub("", s)
    s = re.sub(r"\s+", " ", s).strip()
    s = re.sub(r"\s+([,.?!])", r"\1", s)
    return s

MAXCHARS, MAXLINES, MAXDUR, MINGAP = 42, 2, 6.0, 0.55
d = json.load(open("outputs/transcript-cut.json"))
words = d["words"]

# Group into cues. Break on a sentence end or a REAL pause - a 0.3s threshold shattered
# lines into "I've been a" / "data engineer," which is unreadable as a caption.
cues, cur = [], []
for i, w in enumerate(words):
    cur.append(w)
    nxt = words[i + 1] if i + 1 < len(words) else None
    gap = (nxt["start"] - w["end"]) if nxt else 99
    if (w["word"].strip().endswith((".", "?", "!")) or gap > MINGAP
            or (w["end"] - cur[0]["start"]) > MAXDUR or nxt is None):
        cues.append(cur); cur = []

def wrap(s):
    out, line = [], ""
    for word in s.split():
        if line and len(line) + 1 + len(word) > MAXCHARS:
            out.append(line); line = word
        else:
            line = f"{line} {word}".strip()
    if line: out.append(line)
    return out

# A cue that needs more than two lines is split by GREEDILY PACKING words up to the
# two-line budget, not by word count. Splitting on an equal-word split produced breaks
# like "I've been a / data" | "engineer, an ETL engineer" - mid-phrase and unreadable.
MINDUR = 0.70
final = []
for c in cues:
    if not clean(" ".join(w["word"] for w in c)):
        continue
    part = []
    for w in c:
        trial = part + [w]
        if part and len(wrap(clean(" ".join(x["word"] for x in trial)))) > MAXLINES:
            final.append((part[0]["start"], part[-1]["end"],
                          clean(" ".join(x["word"] for x in part))))
            part = [w]
        else:
            part = trial
    if part:
        final.append((part[0]["start"], part[-1]["end"],
                      clean(" ".join(x["word"] for x in part))))

# a cue too brief to read gets extended into the gap that follows it
final = [list(x) for x in final]
for i, cue in enumerate(final):
    if cue[1] - cue[0] < MINDUR:
        room = (final[i + 1][0] - 0.05) if i + 1 < len(final) else d["duration"]
        cue[1] = min(max(cue[1], cue[0] + MINDUR), room)

def ts(t):
    h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return f"{h:02d}:{m:02d}:{s:06.3f}".replace(".", ",")

lines, n = [], 0
prev_end = 0.0
for a, b, txt in final:
    n += 1
    b = min(b + 0.20, d["duration"])
    a = max(a, prev_end + 0.001)          # cues must never overlap
    prev_end = b
    lines.append(f"{n}\n{ts(a)} --> {ts(b)}\n" + "\n".join(wrap(txt)) + "\n")
open("outputs/still-data-engineer.srt", "w").write("\n".join(lines))
mx = max(len(l) for _, _, t in final for l in wrap(t))
dur = [b - a for a, b, _ in final]
print(f"{n} cues")
print(f"longest line   : {mx} chars (limit {MAXCHARS})")
print(f"cue duration   : min {min(dur):.2f}s  median {sorted(dur)[len(dur)//2]:.2f}s  max {max(dur):.2f}s")
print(f"lines per cue  : max {max(len(wrap(t)) for _,_,t in final)}")
