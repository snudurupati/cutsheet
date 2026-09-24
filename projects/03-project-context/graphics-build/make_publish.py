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

# heard -> what he actually said. From transcript/misheard-local.json "flagged".
FIX = [
    (r"\bthe easily then for\b", "the isDeleted flag for"),
    (r"\btasks of knowledge\b", "tacit knowledge"),
    (r"\ba generated UAI model\b", "a generative AI model"),
    (r"\bBill and Mon\b", "Bill Inmon"),
    (r"\bRunB\b", "Run B"), (r"\bADAA\b", "ADA-A"), (r"\bADAB\b", "ADA-B"),
    # his two experiments are labels, not sentences: case them consistently
    (r"\brun a\b", "Run A"), (r"\brun b\b", "Run B"),
    (r"\bconventions\.md\b", "CONVENTIONS.md"), (r"\bstandards\.md\b", "STANDARDS.md"),
    (r"\bclaude code\b", "Claude Code"), (r"\bclaude\b", "Claude"),
    (r"\bdbt\b", "dbt"), (r"\bcrm\b", "CRM"), (r"\berp\b", "ERP"),
    (r"\bsql\b", "SQL"), (r"\byaml\b", "YAML"), (r"\bcsv\b", "CSV"),
    (r"\bgithub\b", "GitHub"), (r"\bai\b", "AI"),
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
    (0.06,    "Your AI demos look brilliant and your POCs work great"),
    (19.62,   "You are an architecture firm who builds buildings"),
    (88.55,   "And that's an agent for you"),
    (105.38,  "building a data pipeline requires a lot of tacit knowledge"),
    (205.47,  "So I have a GitHub repo here with two experiments, Run A and Run B"),
    (303.69,  "so let me fire up Claude Code"),
    (350.94,  "So let me verify Claude's work"),
    (570.66,  "Claude Code successfully cloned the second repo"),
    (691.18,  "so let's verify what exactly Claude Code did in this case"),
    (1064.57, "so I did two experiments, one with the bare bones"),
    (1350.19, "So what are my takeaways from this experiment?"),
    (1533.66, "But in the next episode, I'll run this"),
]

# Description body: verbatim spoken passages, quoted by their start time.
BODY = [0.06, 3.82, 7.54, 8.68, 120.85]

# Tags: every one of these must appear in the transcript. Counts were measured.
TAGS = [
    "Claude Code", "data engineering", "data engineer", "dbt", "CONVENTIONS.md",
    "STANDARDS.md", "tacit knowledge", "knowledge elicitation", "business rules",
    "design standards", "staging models", "surrogate key", "audit columns",
    "data pipeline", "AI model", "production data", "Kimball", "Inmon",
    "slowly changing dimensions", "CRM", "SQL", "YAML", "GitHub", "ETL",
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
        f.write(" ".join(sentence_at(t) for t in BODY) + "\n\n")
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
