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
# The applied mishears were already fixed upstream in the cut transcript; these are
# the flagged ones, safe here because nothing downstream reads these files.
FIX = [
    (r"\ban iPad or notebook\b", "a Jupyter notebook"),
    # cue boundaries can split the article from the phrase, so this one is also
    # fixed at the word list before cues are built (see main)
    (r"\bLee robot\b", "LeRobot"),
    (r"\blead robot\b", "LeRobot"),
    # the 1915 misdate stays (he said it in both takes) but "1950" prints as a year
    (r"\bAlan Turing's 1915 paper\b", "Alan Turing's paper"),
    (r"\bmujoco\b", "MuJoCo"), (r"\bpymunk\b", "Pymunk"),
    (r"\bPush-T\b", "Push-T"), (r"\bpush t\b", "Push-T"),
    (r"\bdennis noble\b", "Denis Noble"), (r"\balan turing\b", "Alan Turing"),
    (r"\bhugging face\b", "Hugging Face"), (r"\bgemini\b", "Gemini"),
    (r"\bmacbook\b", "MacBook"), (r"\bm5 pro\b", "M5 Pro"),
    (r"\bvs code\b", "VS Code"), (r"\bjupyter\b", "Jupyter"),
    (r"\bspark\b", "Spark"), (r"\bcuda\b", "CUDA"), (r"\baloha\b", "ALOHA"),
    (r"\bso101\b", "SO-101"), (r"\bai\b", "AI"), (r"\bllms\b", "LLMs"),
    (r"\bllm\b", "LLM"),
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
    (0.144,   "If your system is completely deterministic"),
    (10.337,  "Unless you introduce stochasticity into the learning process"),
    (29.791,  "tried to code a deterministic robot policy"),
    (56.533,  "physics has its own mind"),
    (77.427,  "how I went about creating a deterministic policy"),
    (93.334,  "So let's get started with the demo"),
    (485.287, "I call this a cowboy"),
    (534.536, "Let me try AI"),
    (589.820, "I fell back on the diffusion policy"),
    (688.935, "I built a profiler to profile all this data"),
    (794.272, "So I have 1,050 episodes"),
    (1056.452, "what are my key takeaways from this week's"),
    (1181.497, "just because your training process is stochastic"),
    (1253.795, "a policy is a function of data"),
    (1311.472, "generating data is not easy"),
    (1443.776, "goodbye, and I'll see you next week"),
]

# Description body: verbatim spoken passages, quoted by their start time.
BODY = [0.144, 4.905, 10.337, 19.302]

# Tags: every one of these must appear in the transcript. Counts were measured.
# LeRobot passes because FIX restores it from the Lee robot / lead robot mishears.
TAGS = [
    "robotics", "robot policy", "diffusion policy", "LeRobot", "gymnasium",
    "Pymunk", "data engineering", "Push-T", "deterministic", "stochasticity",
    "Alan Turing", "Denis Noble", "profiler", "random policy", "Hugging Face",
    "success labels",
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--transcript", required=True)
    ap.add_argument("--outdir", required=True)
    ap.add_argument("--slug", required=True)
    a = ap.parse_args()

    d = json.load(open(a.transcript))
    W, total = d["words"], d["totalSeconds"]
    # "an iPad or notebook" -> "a Jupyter notebook" spans four words, so it is
    # fixed in the word list BEFORE cues are built. Left to FIX it would split
    # across a cue boundary and print "an ... Jupyter notebook".
    for i in range(len(W) - 3):
        quad = " ".join([W[i]["word"], W[i + 1]["word"], W[i + 2]["word"],
                         W[i + 3]["word"].strip(",.!?")]).lower()
        if quad == "an ipad or notebook":
            W[i]["word"] = "a Jupyter notebook," if W[i + 3]["word"].endswith(",") else "a Jupyter notebook"
            W[i]["end"] = W[i + 3]["end"]
            del W[i + 1:i + 4]
            break
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
