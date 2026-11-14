#!/usr/bin/env python3
"""Merge the per-session WhisperX transcripts, apply the mishear passes, and
write the durable transcript/transcript.json.

01-robotics-as-de is TWO recording sessions (A 20:47, B 21:09). A is the
talking-head intro, B the demo and outro: A ends on "let's jump into a demo",
B opens "let's get started with the demo". Every word keeps its session id and
its time LOCAL to its own camera clip.

Mishear layers, in order (rough-cut skill):
  1. brand.md's fixed list, mode:auto, single-word only, applied everywhere.
  2. this job's reviewed swaps, applied BY POSITION (session, start time), each
     read in context. "cloud" is a real word, so brand.md flags it rather than
     auto-swapping; every hit below is "Claude Code" or "Claude" the product.

Only single-word, whole-word swaps are ever applied, so the word count and every
timestamp stay intact. Anything else is FLAGGED and left alone.
"""
import argparse, json, re, sys

# (session, word start seconds, heard core, correct) -- each read in context
REVIEWED_AT = [
    ("b",   39.075, "Cloud",     "Claude"),    # "my favorite AI assistant, which is Claude Code"
    ("b",   44.911, "Cloud",     "Claude"),    # "ask Claude Code to clone the repo"
    ("b",   84.970, "clock",     "Claude"),    # "so Claude Code came back" ("clock or")
    ("b",   85.270, "or",        "Code"),
    ("b",  472.715, "plus",      "press"),     # "So when I press play or click on a point"
    ("b",  472.955, "spray",     "play"),
    ("b",  546.060, "Letterbot", "LeRobot"),   # the dataset format, as on screen and in A
    ("b",  549.960, "Letterbot", "LeRobot"),
    ("b",  741.077, "duckdb",    "DuckDB"),    # brand.md table lists duckdb -> DuckDB auto;
    ("b",  744.679, "duckdb",    "DuckDB"),    # its JSON block is missing the row
    ("b",  747.280, "duckdb",    "DuckDB"),
    ("b",  885.121, "Parker",    "Parquet"),   # "to understand the Parquet data"
    ("b",   94.612, "physically", "physical"), # repo is physical-ai-data-architect (screen, 20s):
    ("b",   95.152, "I",          "AI"),       # "paida stands for physical AI data architect",
    ("b",   95.272, "did",        "data"),     # four words for four, so no timestamp moves
    ("b",   95.492, "analytics",  "architect"),
]

# WhisperX sometimes stretches a word across the silence after it. None measured
# on this job yet; the mechanism is kept so a fix lands in the durable transcript.
WORD_END_FIX = []

# never applied: changes the word count, or genuinely ambiguous
FLAGGED = [
    ("a",  418.9, "AGI Bot World", "AgiBot World", "two words into one; any graphic spells it AgiBot World"),
    ("b",   91.1, "PA idea week one", "paida-wk01", "two words into one; the folder on screen is ~/Projects/paida-wk01"),
    ("b", 1230.3, "in two weeks i can tell you operator norm i can take", "unclear", "'operator norm' is not a phrase; no graphic quotes this line"),
    ("b",  931.8, "big Uber MP4 file", "über", "meant as 'über'; left as heard"),
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
