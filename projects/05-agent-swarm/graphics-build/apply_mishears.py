#!/usr/bin/env python3
"""Merge the per-session WhisperX transcripts, apply the mishear passes, and
write the durable transcript/transcript.json.

05-agent-swarm is TWO recording sessions (A 11:50, B 12:30): the camera
overheated and shut down after A. B continues A: A ends on "let me do slash
exit", B opens "so the agents finished successfully". Every word keeps its
session id and its time LOCAL to its own camera clip.

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
    ("a",  113.810, "cloud",   "Claude"),     # "Within Claude Code, an agent swarm is called..."
    ("a",  314.169, "Cloud",   "Claude"),     # "Claude Code using agent teams"
    ("a",  395.084, "Cloud",   "Claude"),
    ("a",  420.828, "Cloud",   "Claude"),     # "firing up a Claude Code team"
    ("a",  424.029, "Cloud",   "Claude"),     # "a Claude Code experimental flag"
    ("a",  429.071, "Cloud",   "Claude"),     # "agent teams within Claude"
    ("a",  435.174, "Cloud",   "Claude"),     # "letting my Claude command know"
    ("a",  473.739, "cloud",   "Claude"),     # "my Claude Code ready"
    ("a", 1726.822, "Cloud",   "Claude"),     # "exit out of Claude Code"
    ("b",  628.743, "cloud",   "Claude"),     # "what Claude calls an agent team"
    ("b",  678.988, "cloud",   "Claude"),     # "if Claude does all the work"
    ("b",  682.529, "cloud",   "Claude"),     # "not just one Claude agent"
    ("a",  236.759, "dbd",     "dbt"),        # "a typical dbt project"
    ("a",  269.894, "mark",    "mart"),       # "what kind of data mart to build"
    ("a",  849.657, "marks",   "marts"),      # "a fifth agent to build the data marts"
    ("a", 1140.450, "mods",    "marts"),      # "spawned the marts agent"
    ("a", 1142.051, "mods",    "marts"),
    ("a", 1146.215, "mods",    "marts"),      # "building the final data marts"
    ("a", 1617.344, "smarts",  "marts"),      # "five intermediate models, six marts"
    ("b",  531.161, "mark",    "mart"),       # "the one in the data mart"
    ("b",  496.537, "smart",    "mart"),       # "the daily sales mart"
    ("b",  559.148, "brand",   "branch"),     # fact_daily_branch_sales (job 04: same table)
    ("a", 1705.658, "off",     "of"),         # "Is this of any consequence?"
    ("a", 1718.800, "off",     "of"),
    ("a",  382.660, "TMUX",    "tmux"),
    ("a",  393.503, "TMUX",    "tmux"),
    ("a",  401.746, "TMUX",    "tmux"),
    ("a",  447.743, "Tmux",    "tmux"),
    ("b",  122.861, "NAT",     "Gantt"),      # "project management tool and Gantt charts"
    ("b",  280.849, "e-comm",  "ECOM"),       # the teammate is named ECOM everywhere else
    ("b",  283.450, "succeeding", "conceding"),  # "agreed on point number two, we'll do it as you're proposing"
    ("b",  500.337, "sequels", "SQLs"),       # "run a few SQLs"
    ("b",  547.202, "send",    "cent"),       # "matches to the cent, so this checks"
]

# WhisperX sometimes stretches a word across the silence after it. None measured
# on this job yet; the mechanism is kept so a fix lands in the durable transcript.
WORD_END_FIX = []

# never applied: changes the word count, or genuinely ambiguous
FLAGGED = [
    ("a",  231.6, "not changed any files with the net", "unclear", "possibly 'with the edit' or 'since then'; not changed"),
    ("a",  239.8, "dbdproject.yml", "dbt_project.yml", "one token that is really a filename; check the screen"),
    ("a", 1623.8, "buildreport.md", "build_report.md?", "filename; check the screen, not the speech"),
    ("a",  301.1, "the OpenAI hacking hugging face incident", "(content)", "a factual claim said twice (also B 5:49), unverified. Human 2026-09-29: the line stays, no graphic names it"),
    ("b",  116.0, "could have done any better", "couldn't have done any better", "a spoken slip that inverts the meaning; the sentence is killed in the cutsheet (human 2026-09-29)"),
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
