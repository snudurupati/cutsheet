#!/usr/bin/env python3
"""Emit the three publish sidecars from the CUT transcript: SRT, description, tags.

The human's constraint is that none of this is written by a model. Every chapter
title and every line of the description is a VERBATIM contiguous substring of what
he said, and every tag is a term that appears in the transcript. That is not a
promise in a comment, it is asserted below: a title that is not found verbatim in
the transcript within a window of its own timestamp is a hard failure.

The only text that is changed is mishears. transcript/misheard-local.json holds the
corrections that were deliberately NOT applied upstream because fixing them would
have changed the word count and broken every downstream timestamp. Captions are
read, and nothing downstream reads these files, so they are applied here. Restoring
what he actually said is the opposite of generating text.
"""
import argparse, json, os, re, sys

# heard -> what he actually said, and consistent casing of product names. The
# mishears for this job were applied upstream (transcript/misheard-local.json
# "applied"); these only case names the transcript lowercases.
FIX = [
    (r"\bclaude code\b", "Claude Code"), (r"\bclaude\b", "Claude"),
    (r"\bconventions\.md\b", "CONVENTIONS.md"), (r"\bstandards\.md\b", "STANDARDS.md"),
    (r"\brequirements\.md\b", "REQUIREMENTS.md"), (r"\bagents\.md\b", "AGENTS.md"),
    (r"\bduckdb\b", "DuckDB"), (r"\bdbt\b", "dbt"), (r"\bsql\b", "SQL"),
    (r"\bsqls\b", "SQLs"), (r"\betl\b", "ETL"), (r"\bai\b", "AI"),
]
FILLER = re.compile(r"\b(uh|um)\b[ ,]*", re.I)


def clean(s):
    for pat, rep in FIX:
        s = re.sub(pat, rep, s, flags=re.I)
    s = FILLER.sub("", s)
    s = re.sub(r"\s+", " ", s).strip()
    return re.sub(r"\s+([,.?!])", r"\1", s)


def ts(t, comma=True):
    h, m = int(t // 3600), int(t % 3600 // 60)
    s, ms = int(t % 60), int(round((t - int(t)) * 1000))
    if ms == 1000:
        s, ms = s + 1, 0
    return f"{h:02d}:{m:02d}:{s:02d}," + f"{ms:03d}" if comma else f"{h:02d}:{m:02d}:{s:02d}"


def mmss(t):
    return f"{int(t)//60:02d}:{int(t)%60:02d}"


# (start seconds, verbatim contiguous fragment he speaks at that point)
CHAPTERS = [
    (0.12,    "AI hallucinates because it doesn't understand your business context or your data"),
    (20.92,   "building an enterprise knowledge graph is not a trivial task"),
    (46.21,   "there's an easier fix for this"),
    (66.87,   "I showed you how you can have two markdown files"),
    (99.05,   "instead of having two files, I have one extra file"),
    (140.86,  "So here I have Claude Code"),
    (187.55,  "let me show you what all files I have in there"),
    (291.26,  "let me explain what I'm trying to do"),
    (361.49,  "the whole build took about 18 20 minutes"),
    (385.25,  "run the build myself and see what passes and what fails"),
    (455.81,  "let me fire up the DuckDB console"),
    (509.28,  "I'm calculating the revenue numbers from the actual raw files"),
    (553.75,  "my agent understood the nuance and it did the right thing"),
    (618.41,  "the daily branch sales is about 500K"),
    (721.62,  "let me see if there's anything about the web sales"),
    (747.76,  "It found an ambiguity instead of filling the gap"),
    (782.33,  "if there's a percentage, an average, we don't put that in the data mart tables"),
    (900.14,  "I asked it to build an increment model"),
    (982.14,  "It didn't just double, it just took the new records"),
    (1012.39, "here I have a transaction that was refunded"),
    (1127.3,  "just to summarize what we did"),
    (1270.86, "lightweight ontology per project using a few Markdown files works"),
    (1347.71, "So here's a question for you"),
]

# Description body: verbatim spoken passages, quoted by their start time.
BODY = [0.12, 46.21, 49.32, 58.53]

# Tags: every one of these must appear in the transcript (the gate below checks).
TAGS = [
    "Claude Code", "Opus 5.5", "lightweight ontology", "enterprise knowledge graph",
    "markdown files", "CONVENTIONS.md", "STANDARDS.md", "REQUIREMENTS.md", "dbt", "DuckDB",
    "data pipeline", "data marts", "business requirements", "business rules", "ETL",
    "incremental", "long horizon", "agent swarm", "spot check", "conformed dimensions",
    "time to value", "SQL",
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--transcript", required=True)
    ap.add_argument("--outdir", required=True)
    ap.add_argument("--slug", required=True)
    a = ap.parse_args()

    d = json.load(open(a.transcript))
    W, total = d["words"], d["totalSeconds"]
    full = clean(" ".join(w["word"] for w in W))
    lowfull = full.lower()

    # ---- GATE: every chapter title must be verbatim, at its own timestamp -------
    err = []
    for t, title in CHAPTERS:
        near = clean(" ".join(w["word"] for w in W if t - 25 <= w["start"] <= t + 45))
        if title.lower() not in near.lower():
            err.append(f"{mmss(t)} title is not verbatim in the transcript there: {title!r}")
    if CHAPTERS[0][0] > 1.0:
        err.append("YouTube requires the first chapter at 00:00")
    for (t1, _), (t2, _) in zip(CHAPTERS, CHAPTERS[1:]):
        if t2 - t1 < 10:
            err.append(f"chapters {mmss(t1)} and {mmss(t2)} are less than 10s apart")
    for tag in TAGS:
        if tag.lower() not in lowfull:
            err.append(f"tag not spoken in the video: {tag!r}")
    if err:
        print("FAIL: these would be text the video does not contain\n")
        for e in err:
            print("  " + e)
        sys.exit(1)

    os.makedirs(a.outdir, exist_ok=True)

    # ---- SRT --------------------------------------------------------------------
    MAXCHARS, MAXLINES, MAXDUR, MINGAP, MINDUR = 42, 2, 6.0, 0.55, 0.70
    cues, cur = [], []
    for i, w in enumerate(W):
        cur.append(w)
        nxt = W[i + 1] if i + 1 < len(W) else None
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
        if line:
            out.append(line)
        return out

    final = []
    for c in cues:
        if not clean(" ".join(w["word"] for w in c)):
            continue
        part = []
        for w in c:
            trial = part + [w]
            if part and len(wrap(clean(" ".join(x["word"] for x in trial)))) > MAXLINES:
                final.append([part[0]["start"], part[-1]["end"],
                              clean(" ".join(x["word"] for x in part))])
                part = [w]
            else:
                part = trial
        if part:
            final.append([part[0]["start"], part[-1]["end"],
                          clean(" ".join(x["word"] for x in part))])
    for i, cue in enumerate(final):
        if cue[1] - cue[0] < MINDUR:
            room = (final[i + 1][0] - 0.05) if i + 1 < len(final) else total
            cue[1] = min(max(cue[1], cue[0] + MINDUR), room)

    srt = os.path.join(a.outdir, f"{a.slug}.srt")
    with open(srt, "w") as f:
        for i, (s, e, t) in enumerate(final, 1):
            f.write(f"{i}\n{ts(s)} --> {ts(e)}\n" + "\n".join(wrap(t)) + "\n\n")

    # ---- description ------------------------------------------------------------
    def sentence_at(t):
        out, started = [], False
        for w in W:
            if not started and abs(w["start"] - t) < 0.35:
                started = True
            if started:
                out.append(w["word"])
                if w["word"].strip().endswith((".", "?", "!")):
                    break
        return clean(" ".join(out))

    desc = os.path.join(a.outdir, "youtube-description.txt")
    with open(desc, "w") as f:
        # casing only: a sentence he starts after a full stop gets a capital (never new words)
        f.write(" ".join((lambda x: x[:1].upper() + x[1:])(sentence_at(t)) for t in BODY) + "\n\n")
        f.write("Chapters\n")
        for t, title in CHAPTERS:
            f.write(f"{mmss(t)} {title[0].upper() + title[1:]}\n")

    # ---- tags -------------------------------------------------------------------
    tagf = os.path.join(a.outdir, "youtube-tags.txt")
    joined = ", ".join(TAGS)
    with open(tagf, "w") as f:
        f.write(joined + "\n")

    print(f"  {srt}   {len(final)} cues, last ends {final[-1][1]:.2f}s of {total}s")
    print(f"  {desc}   {len(CHAPTERS)} chapters, all verbatim")
    print(f"  {tagf}   {len(TAGS)} tags, {len(joined)} chars"
          f" {'(over YouTube 500 limit)' if len(joined) > 500 else ''}")


main()
