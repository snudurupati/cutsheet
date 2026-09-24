#!/usr/bin/env python3
"""Apply the mishear passes and write the durable transcript/transcript.json.

Two layers, in this order (rough-cut skill):
  1. brand.md's fixed list. Only mode:auto entries are applied silently.
  2. this job's own findings, from the dictionary pass.

Only single-word, whole-word swaps are ever applied. Anything that would change
the word count is FLAGGED and left alone, because the count change would break
every timestamp downstream.

brand.md marks "cloud" as flag mode because "cloud" makes a perfectly good
sentence. All six occurrences in this recording were read in context and every
one of them is "Claude"; they are applied as REVIEWED, not as auto.
"""
import argparse, json, re, sys

# reviewed in context, single word, whole word. safe.
REVIEWED = {
    "cloud": "Claude",     # 6x, all of them "Claude Opus 5" / "Claude Code" / "Claude"
    "cod":   "Claude",     # 1x @1418s "hit go and COD goes and does it work"
    "dbd":   "dbt",        # 1x @1299s "ran a dbd debug"
    "inman": "Inmon",      # 1x @2348s, next to Kimball. Bill Inmon.
    "esdeleted": "isDeleted",   # 1x @2151s, the is_deleted column
}

# never applied: the correction changes the word count, or the heard form may be
# what was actually said. Recorded so a human can judge.
FLAGGED = [
    (2128.8, "the easily then for", "the isDeleted flag for", "two words to two, ambiguous split"),
    (2266.3, "tasks of knowledge",  "tacit knowledge",        "three words to two"),
    (2687.0, "a generated UAI model", "a generative AI model", "word count change"),
    (2736.9, "Bill and Mon",       "Bill Inmon",              "three words to two"),
    (370.5,  "RunB",               "Run B",                   "two words"),
    (529.7,  "ADAA",               "ADA-A",                   "repo folder name, two tokens"),
    (1400.4, "ADAB",               "ADA-B",                   "repo folder name, two tokens"),
]


def load_brand_auto(brand_path):
    txt = open(brand_path).read()
    block = re.search(r"```json\s*(\{.*\})\s*```", txt, re.S)
    if not block:
        sys.exit("no machine-readable block in brand.md")
    data = json.loads(block.group(1))
    auto = {}
    for row in data.get("misheard", []):
        if row.get("mode") == "auto":
            for h in row["heard"]:
                if " " not in h:                    # single word only, ever
                    auto[h.lower()] = row["correct"]
    return auto


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--transcript", required=True, help="raw whisperx json")
    ap.add_argument("--brand", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--flags-out", required=True)
    a = ap.parse_args()

    auto = load_brand_auto(a.brand)
    swaps = {**auto, **REVIEWED}
    tr = json.load(open(a.transcript))

    counts = {}

    def fix(tok):
        # keep surrounding punctuation and match case-insensitively
        m = re.match(r"^(\W*)([\w'-]+)(\W*)$", tok)
        if not m:
            return tok
        pre, core, post = m.groups()
        rep = swaps.get(core.lower())
        if not rep:
            return tok
        counts[core.lower()] = counts.get(core.lower(), 0) + 1
        return pre + rep + post

    n_words = 0
    for seg in tr.get("segments", []):
        for w in seg.get("words", []):
            w["word"] = fix(w["word"]); n_words += 1
        seg["text"] = " ".join(w["word"] for w in seg.get("words", [])) or seg.get("text", "")
    for w in tr.get("word_segments", []):
        w["word"] = fix(w["word"])

    json.dump(tr, open(a.out, "w"), indent=1)
    json.dump({"applied": counts,
               "flagged": [{"at": t, "heard": h, "likely": c, "why": w}
                           for t, h, c, w in FLAGGED],
               "_note": "flagged entries are NOT applied; they change the word "
                        "count and would break every downstream timestamp"},
              open(a.flags_out, "w"), indent=1)

    print(f"words scanned {n_words}")
    print("applied:")
    for k, v in sorted(counts.items(), key=lambda kv: -kv[1]):
        print(f"   {v:3d}x  {k} -> {swaps[k]}")
    print(f"flagged (not applied): {len(FLAGGED)}")
    print(f"wrote {a.out}")


main()
