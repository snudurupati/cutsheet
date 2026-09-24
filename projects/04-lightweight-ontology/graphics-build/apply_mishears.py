#!/usr/bin/env python3
"""Merge the per-session WhisperX transcripts, apply the mishear passes, and
write the durable transcript/transcript.json.

This job is TWO recording sessions (A 15:13, B 16:06), each a camera + screen
pair. B continues A: A ends opening the build report, B opens "When I verify the
build report...". Every word keeps its session id and its time LOCAL to its own
camera clip. There is deliberately no shared "virtual" timeline: a word at 5:00 in
B and a segment at 5:00 in A must never be able to match each other.

Mishear layers, in order (rough-cut skill):
  1. brand.md's fixed list, mode:auto, single-word only, applied everywhere.
  2. this job's reviewed swaps. Several are context-dependent ("brand" is
     "branch" in "daily brand sales" and genuinely "brand" in "brand new model";
     "wide" is "void" twice and genuinely "wide" in "enterprise wide"), so they
     are applied BY POSITION (session, start time), never as a global swap.

Only single-word, whole-word swaps are ever applied, so the word count and every
timestamp stay intact. Anything else is FLAGGED and left alone.
"""
import argparse, json, re, sys

# (session, word start seconds, heard core, correct) -- each read in context
REVIEWED_AT = [
    ("a",  164.779, "Sol's",   "source"),     # "data ingestion from source files"
    ("a",  231.723, "Cloud",   "Claude"),     # Claude Code
    ("a",  246.624, "cloud",   "Claude"),
    ("a",  420.315, "cloud",   "Claude"),
    ("a", 1478.157, "cloud",   "Claude"),
    ("b",  583.335, "Cloud",   "Claude"),     # "Opus Claude, Opus 5.5"
    ("b",  665.002, "cloud",   "Claude"),
    ("a",  367.977, "monster", "marts"),      # "what data marts needs"
    ("a",  449.175, "mark",    "mart"),       # data mart
    ("a", 1863.310, "mark",    "mart"),
    ("b",   99.453, "mark",    "mart"),
    ("b",  104.594, "mark",    "mart"),
    ("b",  678.160, "marked",  "mart"),       # "the mart table names"
    ("b",  684.504, "marked",  "mart"),
    ("a", 1855.926, "brand",   "branch"),     # fact_daily_branch_sales
    ("a", 1914.758, "brand",   "branch"),
    ("a", 1925.842, "brand",   "branch"),
    ("a", 1975.681, "brand",   "branch"),
    ("a", 1992.875, "brand",   "branch"),
    ("a", 1996.497, "brand",   "branch"),
    ("b",   22.408, "brand",   "branch"),
    ("b",  149.729, "brand",   "branch"),
    ("b",  533.413, "brand",   "branch"),
    ("b",    9.022, "bill",    "build"),      # "the build report"
    ("b",  364.850, "wide",    "void"),       # voided POS transaction
    ("b",  447.339, "wide",    "void"),
    ("b",  795.757, "ears",    "years"),      # "the years of debugging"
    ("b",  848.827, "ignition","ingestion"),
    ("b",  875.817, "agent's", "agent"),      # "using agent swarm": two single-word
    ("b",  876.137, "form",    "swarm"),      # swaps, word count unchanged
    ("a",  327.849, "agents.md", "AGENTS.md"),# brand.md table (not yet in its JSON)
    ("a",  331.032, "agents.md", "AGENTS.md"),
    ("a",  430.005, "agents.md", "AGENTS.md"),
    ("a", 1693.333, "duckdb",  "DuckDB"),     # brand.md table (not yet in its JSON)
    ("a", 1792.369, "Rookie",  "rookie"),     # common noun, not a name
]

# WhisperX sometimes stretches a word across the silence after it. Measured with
# silencedetect over that span only (rough-cut skill), never guessed. Fixed HERE,
# in the durable transcript, so the cutsheet, the remap and the audit all see the
# same word. When it lived only in the cutsheet builder, the remap still saw the
# stretched word and reported it straddling two segments.
WORD_END_FIX = [
    ("a", 288.688, "from.", 289.05),   # spanned 288.69-293.13; speech ends 289.05
]

# never applied: changes the word count, or genuinely ambiguous
FLAGGED = [
    ("a",  255.8, "Thursday, September 22nd", "(content) 2026-09-22 is a TUESDAY", "a factual slip on camera, not a mishear"),
    ("a", 1637.0, "requirements on MD", "requirements.md", "three words to two"),
    ("a", 1950.2, "tests audios have to", "tests, you'd also have to", "word count change"),
    ("a", 1939.4, "2.9 versus 500k", "2.19 versus 500k?", "he said 2.19 million at 29:24; check the screen, not the speech"),
    ("b",  320.2, "duck dbt sql console", "DuckDB SQL console", "two words to one"),
    ("b",  454.7, "a stream transaction ID", "unclear", "possibly 'a void transaction ID'; not changed"),
]


def load_brand_auto(brand_path):
    txt = open(brand_path).read()
    block = re.search(r"```json\s*(\{.*\})\s*```", txt, re.S)
    if not block:
        sys.exit("no machine-readable block in brand.md")
    auto = {}
    for row in json.loads(block.group(1)).get("misheard", []):
        if row.get("mode") == "auto":
            for h in row["heard"]:
                if " " not in h:
                    auto[h.lower()] = row["correct"]
    return auto


def split(tok):
    m = re.match(r"^(\W*)(.+?)(\W*)$", tok)
    return m.groups() if m else ("", tok, "")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--session", action="append", required=True,
                    help="id=whisperx.json=cam.mov=screen.mov, in PLAY order")
    ap.add_argument("--brand", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--flags-out", required=True)
    a = ap.parse_args()

    auto = load_brand_auto(a.brand)
    sessions, words, segments = [], [], []
    for spec in a.session:
        sid, js, cam, scr = spec.split("=")
        tr = json.load(open(js))
        sessions.append({"id": sid, "whisperx": js, "cam": cam, "screen": scr})
        for seg in tr["segments"]:
            seg["session"] = sid
            segments.append(seg)
        for w in tr["word_segments"]:
            w["session"] = sid
            words.append(w)

    applied, missing = {}, []
    # layer 2 first, by position, and assert each target is exactly where we said
    for sid, t, heard, correct in REVIEWED_AT:
        hit = [w for w in words if w["session"] == sid and "start" in w
               and abs(w["start"] - t) < 0.002]
        if len(hit) != 1 or split(hit[0]["word"])[1] != heard:
            missing.append((sid, t, heard, [h["word"] for h in hit]))
            continue
        pre, _, post = split(hit[0]["word"])
        hit[0]["word"] = pre + correct + post
        hit[0]["_was"] = heard
        applied[f"{heard} -> {correct}"] = applied.get(f"{heard} -> {correct}", 0) + 1
    if missing:
        sys.exit("reviewed swaps did not find their word (wrong transcript?):\n" +
                 "\n".join(map(str, missing)))

    for sid, t, word, end in WORD_END_FIX:
        hit = [w for w in words if w["session"] == sid and "start" in w
               and abs(w["start"] - t) < 0.002 and w["word"] == word]
        if len(hit) != 1:
            sys.exit(f"word-end fix did not find {word!r} at {sid} {t}")
        hit[0]["_endWas"] = hit[0]["end"]
        hit[0]["end"] = end

    # layer 1, brand auto list, everywhere
    for w in words:
        if "_was" in w:
            continue
        pre, core, post = split(w["word"])
        rep = auto.get(core.lower())
        if rep and core != rep:
            w["word"] = pre + rep + post
            applied[f"{core} -> {rep}"] = applied.get(f"{core} -> {rep}", 0) + 1

    # segment words are the same dict objects in whisperx output? not guaranteed,
    # so rebuild segment text from the corrected word list by position
    idx = {(w["session"], w.get("start"), w.get("end")): w["word"] for w in words}
    for seg in segments:
        for w in seg.get("words", []):
            k = (seg["session"], w.get("start"), w.get("end"))
            if k in idx:
                w["word"] = idx[k]
        seg["text"] = " ".join(w["word"] for w in seg.get("words", [])) or seg["text"]

    doc = {"language": "en", "sessions": sessions,
           "_note": "times are LOCAL to each session's camera clip; match on "
                    "(session, time), never on time alone",
           "segments": segments, "word_segments": words}
    json.dump(doc, open(a.out, "w"), indent=1)
    json.dump({"applied": applied,
               "flagged": [{"session": s, "at": t, "heard": h, "likely": c, "why": y}
                           for s, t, h, c, y in FLAGGED]},
              open(a.flags_out, "w"), indent=1)
    for k, v in sorted(applied.items(), key=lambda kv: -kv[1]):
        print(f"  {v:3d}x  {k}")
    print(f"flagged (not applied): {len(FLAGGED)}")
    print(f"sessions {[s['id'] for s in sessions]}  words {len(words)}")
    print(f"wrote {a.out}")


main()
