#!/usr/bin/env python3
"""Find joins that cut through the middle of a thought.

Every existing gate in this pipeline measures frames, samples, words and pixels.
None of them can see that a sentence was left unfinished, because an unfinished
sentence is frame-exact, sample-exact and word-accurate. On 2026-09-08 the human
found two of these by watching, after every gate passed.

For each join this reports:
  OUT   the last words before the cut
  GONE  the source words that were removed at that point
  IN    the first words after the cut

and flags the join when the outgoing side does not look like a finished thought:

  no-terminal   last kept word carries no . ? ! and the removed text continues
                the same sentence
  dangling      last kept word is a conjunction, preposition, article or
                auxiliary, so the clause is left hanging
  mid-sentence  the incoming side starts lowercase, i.e. it is a continuation
                of a different sentence

GONE is the important column. A join can end on a clean full stop and still cut a
thought in half if the removed words were the second half of the argument, so the
flags rank the joins but the removed text is what has to be read.
"""
import argparse, json, re, sys

DANGLING = {
    "and", "but", "or", "so", "because", "since", "that", "which", "who", "if",
    "when", "while", "as", "to", "of", "in", "on", "at", "for", "with", "from",
    "the", "a", "an", "is", "are", "was", "were", "it", "its", "this", "these",
    "then", "just", "not", "no", "do", "does", "did", "we", "i", "you", "they",
    "he", "she", "my", "your", "our", "their", "there", "here", "also", "very",
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cutsheet", required=True)
    ap.add_argument("--transcript", required=True, help="source transcript.json")
    ap.add_argument("--cut-transcript", required=True)
    ap.add_argument("--context", type=int, default=9)
    ap.add_argument("--gone", type=int, default=14)
    ap.add_argument("--only-flagged", action="store_true")
    ap.add_argument("--only-words-removed", action="store_true",
                    help="only joins where SPEECH was removed, not just silence. "
                         "This is the list that matters: a silence-only join keeps "
                         "the sentence continuous in audio, whereas a join with "
                         "words in the hole may have taken half a thought with it, "
                         "and it can still end on a clean full stop while doing so.")
    a = ap.parse_args()

    cs = json.load(open(a.cutsheet))
    cut = json.load(open(a.cut_transcript))
    src = [w for w in json.load(open(a.transcript))["word_segments"] if "start" in w]
    src.sort(key=lambda w: w["start"])
    if cut.get("totalFrames") != cs["totalFrames"]:
        sys.exit("cut transcript and cutsheet disagree; stale artefact")

    words = cut["words"]
    segs = [s for s in cs["segments"] if s.get("keep", True)]
    by_seg = {}
    for w in words:
        by_seg.setdefault(w["segment"], []).append(w)

    flagged = 0
    for x, y in zip(segs, segs[1:]):
        out = by_seg.get(x["id"], [])
        inc = by_seg.get(y["id"], [])
        if not out or not inc:
            continue
        last, first = out[-1], inc[0]

        # the source words that fell in the hole
        gone = [w for w in src if last["sourceStart"] < w["start"] < first["sourceStart"]]
        gone_txt = " ".join(w["word"] for w in gone[: a.gone])
        if len(gone) > a.gone:
            gone_txt += f" ... (+{len(gone)-a.gone} more)"

        lw = last["word"]
        bare = re.sub(r"[^A-Za-z']", "", lw).lower()
        flags = []
        if not re.search(r"[.?!]$", lw.strip()):
            # only a problem if the removed text kept the sentence going
            if gone and not re.match(r"^[A-Z]", gone[0]["word"]):
                flags.append("no-terminal")
            elif not gone:
                flags.append("no-terminal")
        if bare in DANGLING:
            flags.append("dangling")
        fw = first["word"].strip()
        if fw and fw[0].islower() and fw not in ("i",):
            flags.append("mid-sentence")

        if a.only_flagged and not flags:
            continue
        if a.only_words_removed and not gone:
            continue
        if flags:
            flagged += 1
        t = last["end"]
        print(f"[{x['id']} -> {y['id']}]  cut {int(t)//60}:{int(t)%60:04.1f}"
              f"   removed {first['sourceStart']-last['sourceStart']:.1f}s"
              f"{'   ** ' + ', '.join(flags) + ' **' if flags else ''}")
        print(f"   OUT  ... {' '.join(w['word'] for w in out[-a.context:])}")
        print(f"   GONE     {gone_txt if gone_txt else '(silence only)'}")
        print(f"   IN   ... {' '.join(w['word'] for w in inc[:a.context])}")
        print()

    print(f"joins: {len(segs)-1}   flagged: {flagged}")


main()
