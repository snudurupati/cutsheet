#!/usr/bin/env python3
"""Merge the per-session WhisperX transcripts, apply the mishear passes, and
write the durable transcript/transcript.json.

2.2-learning-chaos is TWO recording sessions (A 10:56, B 11:14) of one ~33 min
talk. A is the intro plus the sim_pushTV2 demo (random policy, diffusion 36/50);
B is the data-collection demo, the profiler, takeaways and outro. Every word
keeps its session id and its time LOCAL to its own camera clip.

Mishear layers, in order (rough-cut skill):
  1. brand.md's fixed list, mode:auto, single-word only, applied everywhere.
  2. this job's reviewed swaps, applied BY POSITION (session, start time), each
     read in context, checked against the screen frames (VS Code notebook names)
     and, for three unclear tokens, an independent no-alignment WhisperX re-listen
     of the isolated window (graphics-build/probe/).

Only single-token, whole-token swaps are ever applied, so the token count and
every timestamp stay intact. Anything else is FLAGGED and left alone.
"""
import argparse, json, re, sys

# (session, word start seconds, heard core, correct) -- each read in context
REVIEWED_AT = [
    # --- take A (intro + sim_pushTV2 notebook demo; screen: sim_pushTV2.ipynb) ---
    ("a",  222.163, "Mojoco",   "MuJoCo"),  # "I'm not using MuJoCo for this yet"
    ("a",  243.572, "Jim",      "Gym"),     # "Gym Push-T does not make use of..."
    ("a",  245.253, "Mojoco",   "MuJoCo"),  # "does not make use of MuJoCo, but..."
    ("a",  247.134, "PyMonk",   "Pymunk"),  # "makes use of Pymunk 2D physics"
    ("a",  261.454, "PushD",    "Push-T"),  # "using the Push-T version 0" (gym_push_t)
    ("a",  526.713, "ENB",      "env"),     # "an env.step and doing a make action"
    # --- take B (LeRobot dataset collection + profiler + takeaways) ---
    ("b",   35.728, "pushd",    "push_t"),  # repo id snudurupati/push_t_sim (screen)
    ("b",   63.755, "ds.addframe", "ds.add_frame"),  # LeRobotDataset API, one token
    ("b",   85.608, "HuggingFacelyRobot", "Hugging Face LeRobot"),  # one token kept, spaces inside
    ("b",   91.171, "snudarapati", "snudurupati"),   # the handle, brand.md spelling
    ("b",  624.230, "Ernst",    "Ernest"),  # "Ernest Hemingway"
    ("b",  627.803, "emerson",  "Emerson"), # "or Emerson" (Ralph Waldo)
    ("b",  951.701, "cuda",     "CUDA"),    # "a lot of CUDA cores"
]

# WhisperX sometimes stretches a word across the silence after it. None measured
# on this job yet; the mechanism is kept so a fix lands in the durable transcript.
WORD_END_FIX = []

# never applied: changes the token count, or genuinely ambiguous
FLAGGED = [
    ("a",  208.34, "an iPad or notebook", "a Jupyter notebook",
     "multi-word swap; screen shows sim_pushTV2.ipynb open in VS Code; any graphic spells Jupyter"),
    ("a",  745.48, "Jim,", "Gemini? (unclear aside)",
     "independent re-listen also heard 'Jim'; aside, no graphic quotes it"),
    ("a",   72.36, "Alan Turing's 1915 paper", "misspoken date in BOTH takes (Turing's papers: 1936/1950)",
     "transcript keeps the words said; no card or caption may print 1915"),
    ("b",   33.15, "Lee robot", "LeRobot",
     "two words into one; any graphic spells LeRobot"),
    ("b",  107.48, "lead robot", "LeRobot",
     "two words into one; any graphic spells LeRobot"),
    ("b",  311.03, "missing joins", "missing ones? (unclear)",
     "profiler null-handling aside; no graphic quotes it"),
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
