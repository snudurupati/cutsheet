#!/usr/bin/env python3
"""Find the beats where the speaker handed you a picture, and say what to draw.

The plan step already scans a transcript for showable nouns and numbers. That is
why every graphic comes out as a layout of the words being spoken. This scans for
the other thing: the places where the language itself is figurative, structural or
comparative, and a drawn object is available.

On 02-first-agent the phrase "a brain sitting in a jar" sat in the transcript at
373.19 and the pipeline read straight past it. The graphic that came out of that
beat was the best in the video and the human had to ask for it. Nothing was
missing except a step that looks.

This does not invent the object. It finds the beat, names what kind of beat it is,
and proposes the scene type the style file has anatomy for. The human picks.

Usage:
    scan_concepts.py <transcript-cut.json> [--json out.json] [--min-gap SECONDS]
                     [--expect-seconds N] [--expect-fps N]

Rule 12: the transcript path is an argument, never a literal. --expect-seconds and
--expect-fps assert that the file read is the one the caller meant, because a
scanner pointed at a stale transcript produces a plausible, wrong, silent answer.
"""
import argparse, json, re, sys
from collections import Counter

# ---------------------------------------------------------------------------
# The cue taxonomy. Each entry: what to look for, what it means, what to draw.
#
# Markers are STRUCTURAL, never topical. "brain" would have found the jar on
# 02-first-agent and found nothing on any other video; "imagine" finds the shape
# of the sentence, which is what generalises. Adding a topic word here is how this
# script quietly becomes a keyword list for one video.
# ---------------------------------------------------------------------------
CUES = [
    ("analogy", r"\banalog(?:y|ous)\b|\bimagine\b|\bthink of (?:it|this|an?)\b"
                r"|\bpicture (?:it|this)\b|\bit'?s (?:basically|essentially) an?\b",
     "analogy", "One drawn object, line art, built in movements on the spoken cues."),

    ("simile", r"\b(?:is|are|was|were|acts?|works?|behaves?) (?:just )?like an?\b"
               r"|\bas if\b|\bkind of like\b|\bsort of an?\b",
     "analogy", "The compared object, drawn. The comparison is the frame."),

    ("contrast", r"\bthe difference between\b|\binstead of\b|\bwhereas\b"
                 r"|\bon the other hand\b|\bversus\b|\brather than\b"
                 r"|\bnot .{2,40}?,? but\b",
     "contrast", "Split frame. Two states side by side, both visible at the end."),

    ("before-after", r"\bused to\b|\bback then\b|\bthese days\b|\bnowadays\b"
                     r"|\bit used to be\b|\bnow it(?:'s| is)\b",
     "contrast", "One object, two states, morph between them. Never two cards."),

    ("enumeration", r"\b(?:two|three|four|five|couple of|handful of) (?:things|reasons|ways|steps|problems|kinds)\b"
                    r"|\bfirst(?:ly)?,\b|\bsecond(?:ly)?,\b|\bthird(?:ly)?,\b",
     "strike-list", "Counted build. Rows land on their own cues, never all at once."),

    ("causal-chain", r"\bwhich means (?:that )?\b|\bleads? to\b|\bresults? in\b"
                     r"|\bwhich is why\b|\bcause[sd]? the\b|\bknock-on\b"
                     r"|\bso the whole\b|\bends? up (?:breaking|wrong|stale)\b",
     "loop", "Flow with drawn connectors. The arrow is the content."),

    ("branch", r"\bif you .{2,50}?,? (?:then |you'?ll |it'?ll |you get|you end up)\b"
               r"|\bunless\b|\botherwise\b|\beither way\b|\bin that case\b"
               r"|\btwo (?:paths|options|choices|routes)\b",
     "loop", "Fork. Two paths from one node, the taken one in accent."),

    ("cycle", r"\bover and over\b|\bevery time\b|\bkeeps? (?:happening|doing)\b"
              r"|\bagain and again\b|\bin a loop\b|\bround and round\b|\bback and forth\b",
     "loop", "Closed ring. Travelling dot so a long beat is never still."),

    ("magnitude", r"\b\d+(?:\.\d+)?\s*(?:x|times|percent|%|hours?|minutes?|seconds?|days?|weeks?)\b"
                  r"|\bhalf of\b|\bmost of\b|\btwice as\b|\border of magnitude\b",
     "stat", "Count-up or proportion bar. Lands ON the number being said."),

    ("absence", r"\bcan'?t see\b|\bdoesn'?t know\b|\bhas no idea\b|\bno access to\b"
                r"|\bnothing about\b|\bcan'?t read\b|\bnever sees?\b|\bblind to\b",
     "strike-list", "Strike-through, redaction or an empty slot. Show the hole."),

    ("containment", r"\binside (?:of )?(?:the|it|that)\b|\bon top of\b|\bunderneath\b"
                    r"|\bwraps? around\b|\bsits? (?:in|on|inside)\b|\bunder the hood\b"
                    r"|\bnested\b|\bone layer (?:up|down|below|above)\b",
     "analogy", "Nested boxes or a cross-section. Depth is the point."),

    ("duration", r"\btook me\b|\bovernight\b|\bin (?:about )?(?:a few|five|ten|twenty|thirty)\b"
                 r"|\ball (?:day|night|weekend)\b|\bin under\b",
     "stat", "Timeline bar or clock. Compare against the alternative duration."),

    ("quotation", r"\bsomeone said\b|\bthe docs? says?\b|\bi saw (?:on|a)\b"
                  r"|\bthey call it\b|\bpeople say\b|\bi read\b",
     "card", "Quote card, tweet mock or the real screenshot. Attribute it."),

    ("failure", r"\bit broke\b|\bthrew an? error\b|\bfailed\b|\bblew up\b"
                r"|\bdidn'?t work\b|\bcrashed\b|\bwent wrong\b",
     "screenshot", "The real terminal, the real error, the real diff. Not a recreation."),

    ("physical-verb", r"\bwire(?:d|s)? (?:it )?up\b|\bplug(?:s|ged)? (?:it )?in\b"
                      r"|\bspin(?:s|ning)? up\b|\btears? down\b|\bpull(?:s|ed)? (?:it )?(?:in|from)\b"
                      r"|\broutes?\b|\bhands? (?:it )?off\b",
     "loop", "Animate the literal motion the verb describes."),

    ("uncertainty", r"\broughly\b|\bgive or take\b|\bsomewhere around\b|\bballpark\b"
                    r"|\bmore or less\b|\bi think it'?s about\b",
     "stat", "Fuzzy range or error bar. Do not draw a precise number."),

    ("superlative", r"\bthe single (?:most|biggest|worst|best)\b|\bthe most important\b"
                    r"|\bthe biggest\b|\bthe whole point\b|\bthe one thing\b",
     "card", "Typographic hit. Scale jump, not another row."),

    ("deixis", r"\bright here\b|\bthis (?:thing )?(?:right )?here\b|\bon screen\b"
               r"|\bwhat you'?re seeing\b|\bthis one\b",
     "self-demonstrating", "Annotation anchored to the real thing. Measure the point."),

    ("open-question", r"\bhow do you\b|\bwhy does\b|\bwhat happens (?:if|when)\b"
                      r"|\bhow does it\b|\bthe question is\b",
     "card", "Ask it on screen now, answer it later. Open loop."),

    ("constraint", r"\bit can only\b|\bnot allowed to\b|\bthe scope is\b|\bbounded\b"
                   r"|\brestricted to\b|\bcan'?t go beyond\b|\bwithin the\b",
     "analogy", "Boundary box or fence. Draw the edge, not the rule text."),

    ("journey", r"\bwent from\b|\bended up\b|\ball the way (?:to|from)\b"
                r"|\bstarted (?:out|with)\b.{0,40}\bnow\b",
     "loop", "Path draw from A to B. The route is the graphic."),
]

# Scene types the style file must carry anatomy for. Kept here so a cue that maps
# to a scene the style does not define fails loudly instead of proposing vapour.
SCENE_TYPES = {"analogy", "contrast", "loop", "strike-list", "self-demonstrating",
               "stat", "card", "screenshot"}

STOPWORDS = {"this", "that", "they", "them", "then", "there", "these", "those",
             "what", "when", "with", "your", "youre", "have", "just", "like",
             "know", "going", "gonna", "really", "actually", "thing", "things",
             "some", "will", "would", "could", "about", "which", "because"}

FUNCTION_WORDS = {"and", "the", "a", "an", "to", "of", "in", "is", "it", "so", "but",
                  "or", "for", "on", "at", "as", "if", "we", "i", "you", "that", "this",
                  "was", "are", "be", "my", "me", "he", "she", "they", "then", "there"}

LONG_PAUSE = 1.50      # seconds of silence before a word. A landing pause, not a breath.
                       # 0.65 produced 104 signals on a 10-minute cut and 1.00 produced 50,
                       # nearly all of them mid-clause hesitations before 'and' or 'the'.
                       # A signal that fires on every third sentence is the same as no signal.
STILL_BEAT = 20.0      # style.json continuousMotionAboveSeconds


def utterances(words):
    """Group the word list into speech units. Both transcript shapes carry a
    per-word 'segment' id; that is the only field this relies on."""
    out, cur = [], None
    for w in words:
        seg = w.get("segment")
        tok = w.get("word", "")
        if cur is None or seg != cur["segment"]:
            if cur:
                out.append(cur)
            cur = {"segment": seg, "start": w.get("start"), "end": w.get("end"),
                   "words": [tok], "section": w.get("section")}
        else:
            cur["words"].append(tok)
            cur["end"] = w.get("end")
    if cur:
        out.append(cur)
    for u in out:
        u["text"] = " ".join(u["words"]).strip()
    return out


def scan(words, min_gap):
    utts = utterances(words)
    hits = []
    for u in utts:
        low = u["text"].lower()
        for name, rx, scene, draw in CUES:
            m = re.search(rx, low)
            if not m:
                continue
            hits.append({
                "start": round(u["start"], 2) if u["start"] is not None else None,
                "end": round(u["end"], 2) if u["end"] is not None else None,
                "cue": name, "scene": scene, "marker": m.group(0).strip(),
                "draw": draw, "section": u.get("section"), "text": u["text"],
            })
            break  # first-wins, ordered most-specific-first, same as brand cues

    # Non-lexical signals. These need no vocabulary at all.
    signals = []
    for a, b in zip(words, words[1:]):
        gap = (b.get("start") or 0) - (a.get("end") or 0)
        nxt = (b.get("word", "") or "").lower().strip(".,!?'\"")
        if gap >= LONG_PAUSE and nxt not in FUNCTION_WORDS:
            signals.append({"kind": "long-pause", "at": round(b.get("start", 0), 2),
                            "seconds": round(gap, 2),
                            "why": f"{gap:.2f}s of silence before '{b.get('word','')}'. "
                                   "He is landing something."})
    for u in utts:
        if u["start"] is None or u["end"] is None:
            continue
        dur = u["end"] - u["start"]
        if dur >= STILL_BEAT:
            signals.append({"kind": "long-beat", "at": round(u["start"], 2),
                            "seconds": round(dur, 2),
                            "why": f"{dur:.1f}s in one breath group. Above the style's "
                                   f"{STILL_BEAT:.0f}s continuous-motion floor, so whatever "
                                   "goes here must keep moving for its whole run."})
        toks = [t.lower().strip(".,!?") for t in u["words"]
                if len(t) > 3 and t.lower().strip(".,!?") not in STOPWORDS]
        for word, n in Counter(toks).items():
            if n >= 3:
                signals.append({"kind": "repeated-word", "at": round(u["start"], 2),
                                "seconds": round(dur, 2),
                                "why": f"'{word}' said {n} times in one breath group. "
                                       "That word is the concept. Promote it to type "
                                       "and drop the rest."})

    # Collapse hits that sit on top of each other: one beat, one graphic.
    hits.sort(key=lambda h: (h["start"] is None, h["start"]))
    merged = []
    for h in hits:
        if merged and h["start"] is not None and merged[-1]["end"] is not None \
                and h["start"] - merged[-1]["end"] < min_gap \
                and h["scene"] == merged[-1]["scene"]:
            merged[-1]["end"] = h["end"]
            merged[-1]["text"] += " " + h["text"]
            merged[-1]["marker"] += ", " + h["marker"]
            continue
        merged.append(dict(h))
    return merged, signals, len(utts)


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("transcript", help="path to outputs/transcript-cut.json")
    ap.add_argument("--json", help="write candidates here as JSON")
    ap.add_argument("--min-gap", type=float, default=6.0,
                    help="merge same-scene hits closer than this (default 6s)")
    ap.add_argument("--expect-seconds", type=float,
                    help="assert the transcript's totalSeconds, +/- 1s")
    ap.add_argument("--expect-fps", type=float, help="assert the transcript's fps")
    a = ap.parse_args()

    try:
        doc = json.load(open(a.transcript))
    except Exception as e:
        sys.exit(f"ERROR cannot read {a.transcript}: {e}")

    words = doc.get("words") or []
    if not words:
        sys.exit(f"ERROR {a.transcript} has no word list. This needs a cut-aligned "
                 "transcript with per-word timings, not a plain text transcript.")

    # Rule 12: prove the file read is the one the caller meant, before any work.
    fps, total = doc.get("fps"), doc.get("totalSeconds")
    if total is None:
        total = round(max((w.get("end") or 0) for w in words), 2)
    if a.expect_fps is not None and fps is not None and abs(fps - a.expect_fps) > 0.01:
        sys.exit(f"ERROR fps mismatch: transcript says {fps}, caller expected {a.expect_fps}. "
                 "Refusing to scan a transcript that is not the one being edited.")
    if a.expect_seconds is not None and abs(total - a.expect_seconds) > 1.0:
        sys.exit(f"ERROR duration mismatch: transcript runs {total}s, caller expected "
                 f"{a.expect_seconds}s. Refusing to scan a stale transcript.")

    hits, signals, n_utts = scan(words, a.min_gap)

    print(f"{a.transcript}")
    print(f"  {len(words)} words, {n_utts} speech units, {total}s at {fps or '?'}fps")
    print(f"  {len(hits)} concept-beat candidates, {len(signals)} non-lexical signals\n")

    if hits:
        print("CONCEPT BEATS  (the human picks; the pipeline does not decide these)")
        print("-" * 100)
        for h in hits:
            ts = f"{int(h['start'] // 60)}:{h['start'] % 60:05.2f}" if h["start"] is not None else "?"
            print(f"  {ts:>9}  [{h['cue']:<14}] -> scene: {h['scene']}")
            print(f"             marker: \"{h['marker']}\"")
            print(f"             draw:   {h['draw']}")
            print(f"             said:   {h['text'][:150]}")
            print()

    if signals:
        print("NON-LEXICAL SIGNALS  (no vocabulary needed, measured from timings)")
        print("-" * 100)
        seen = set()
        for s in sorted(signals, key=lambda s: s["at"]):
            key = (s["kind"], s["at"])
            if key in seen:
                continue
            seen.add(key)
            ts = f"{int(s['at'] // 60)}:{s['at'] % 60:05.2f}"
            print(f"  {ts:>9}  [{s['kind']:<14}] {s['why']}")

    unknown = {h["scene"] for h in hits} - SCENE_TYPES
    if unknown:
        sys.exit(f"\nERROR cue table proposes scene types the style cannot build: {unknown}")

    if a.json:
        json.dump({"source": a.transcript, "fps": fps, "totalSeconds": total,
                   "candidates": hits, "signals": signals},
                  open(a.json, "w"), indent=2)
        print(f"\nwrote {a.json}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
