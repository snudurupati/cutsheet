#!/usr/bin/env python3
"""The base-cut gate, half 2: an INDEPENDENT re-transcription of the rendered base cut (hard rule 15).

The cut's own transcript (outputs/transcript-cut.json) is derived from the cutsheet, so it agrees
with the cut whatever the cut sounds like. This transcribes the render's audio again, with a
different model size and a disfluent initial prompt (so it keeps "uh" and repeats instead of
smoothing them away), and reports:

  REPEAT   a word or 1-4 word phrase said twice in a row (fillers between allowed; the last word may
           be a prefix of its retake), marked when it sits within 1.5s of a join
  EXTRA    a non-filler word heard in the render that the cut transcript has nowhere near it
  FILLER   every filler heard, so kept ones are a decision, never an accident

    python3 relisten_cut.py --audio ../outputs/base-audio.wav --cutsheet ../transcript/cutsheet.json \
        --transcript-cut ../outputs/transcript-cut.json --audit ../transcript/audit-v3.json --out ../transcript/relisten-cut.json
"""
import argparse, json, os, re, subprocess, sys, tempfile, wave, difflib

PROMPT = "Um, so, uh, the the data, I mean, uh, we, we have, like, um, so so this is, uh, it's it's the"
FILLER = re.compile(r"^(uh|um|uhm|erm|er|ah|hmm|mm)$")
norm = lambda t: re.sub(r"[^a-z0-9']", "", t.lower())


def find_repeats(words, max_n=6, max_skip=2, window=3.0):
    """Retakes in a word list: a phrase said again straight after (fillers between allowed; the last
    word may be a prefix of its retake, "state states"), or a RESTART: a 2+ word opening, up to
    max_skip abandoned words, then the same opening again ("specifically the little bot, specifically
    the LeRobot", "because of, you know, because of"). Returns (first copy start idx, retake start idx)."""
    toks = [(i, norm(w["word"])) for i, w in enumerate(words) if norm(w["word"]) and not FILLER.match(norm(w["word"]))]
    out, used = [], set()
    for p in range(len(toks)):
        if toks[p][0] in used:
            continue
        hit = None
        for n in range(max_n, 0, -1):
            for skip in ([0] if n == 1 else range(0, max_skip + 1)):
                q = p + n + skip
                if q + n > len(toks):
                    continue
                c1, c2 = toks[p:p + n], toks[q:q + n]
                if skip:
                    # a restart, not a list ("the episode index, the frame index"): the abandoned words
                    # are discourse filler, or a near-copy of what the retake goes on to say
                    sk = [x[1] for x in toks[p + n:q]]
                    conts = ["".join(x[1] for x in toks[q + n:q + n + m]) for m in range(1, skip + 1)]
                    if not (" ".join(sk) in ("you know", "i mean", "like", "you", "know")
                            or max(difflib.SequenceMatcher(None, "".join(sk), c).ratio() for c in conts) >= 0.6):
                        continue
                la, lb = c1[-1][1], c2[-1][1]
                if [x[1] for x in c1[:-1]] != [x[1] for x in c2[:-1]] or not (la == lb or (len(la) >= 3 and lb.startswith(la))):
                    continue
                if words[c2[0][0]]["start"] - words[c1[0][0]]["start"] > window:
                    continue
                # "...called an episode. An episode might..." ends one sentence and opens the next on
                # purpose (anadiplosis). A retake never straddles a full stop.
                if not skip and re.search(r"[.?!]$", words[c1[-1][0]]["word"]):
                    continue
                hit = (c1[0][0], c2[0][0]); used.update(k for k, _ in toks[p:q]); break
            if hit:
                break
        if hit:
            out.append(hit)
    return out


def mmss(t):
    return f"{int(t)//60}:{t%60:04.1f}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--audio", required=True); ap.add_argument("--cutsheet", required=True)
    ap.add_argument("--transcript-cut", required=True); ap.add_argument("--audit", required=True)
    ap.add_argument("--out", required=True); ap.add_argument("--model", default="medium")
    ap.add_argument("--kills-out", default="", help="write render-only retakes as source-time cuts for build_cutsheet --render-kills")
    ap.add_argument("--reuse", default="", help="an earlier whisperx json of this same audio")
    a = ap.parse_args()
    cs = json.load(open(a.cutsheet))
    w = wave.open(a.audio); dur = w.getnframes() / w.getframerate(); w.close()
    if abs(dur - cs["totalFrames"] / cs["fps"]) > 0.05:
        sys.exit(f"{a.audio} is {dur:.2f}s, the cutsheet {cs['totalFrames'] / cs['fps']:.2f}s: stale audio, refusing")
    if a.reuse:
        heard = json.load(open(a.reuse))
    else:
        tmp = tempfile.mkdtemp()
        subprocess.run(["whisperx", a.audio, "--model", a.model, "--language", "en", "--initial_prompt", PROMPT,
                        "--align_model", "WAV2VEC2_ASR_LARGE_LV60K_960H", "--output_format", "json", "--output_dir", tmp],
                       check=True, capture_output=True)
        heard = json.load(open(os.path.join(tmp, os.path.splitext(os.path.basename(a.audio))[0] + ".json")))
        json.dump(heard, open(a.out.replace(".json", "-whisperx.json"), "w"))
    hw = [x for x in heard["word_segments"] if "start" in x]
    cut = json.load(open(a.transcript_cut))["words"]
    joins = [j["cut"] for j in json.load(open(a.audit))["joins"]]
    near_join = lambda t: min((abs(t - j) for j in joins), default=9) < 1.5
    found, kills = [], []
    segs = [g for g in cs["segments"] if g.get("keep", True)]
    def to_src(t):                       # cut time -> (segment index, session, source time); speech only
        acc = 0
        for k, g in enumerate(segs):
            c0 = acc / cs["fps"]; acc += g["outFrames"]
            if t < acc / cs["fps"]:
                return (k, g["session"], g["startFrame"] / cs["fps"] + (t - c0)) if g["kind"] == "speech" else None
        return None
    for a_, b_ in find_repeats(hw):
        t, t2 = hw[a_]["start"], hw[b_]["start"]
        text = " ".join(hw[k]["word"] for k in range(a_, b_ + 1))
        n = 1 + sum(1 for k in range(a_ + 1, b_) if norm(hw[k]["word"]))
        # said twice in the cut transcript too: the cutsheet KEPT both copies (the builder should catch it)
        intended = bool(find_repeats([x for x in cut if t - 0.4 <= x["start"] <= t2 + 0.4]))
        found.append({"kind": "REPEAT", "cut": round(t, 2), "text": text, "nearJoin": near_join(t), "inCutTranscript": intended})
        s1, s2 = to_src(t - 0.08), to_src(t2)
        if not intended and s1 and s2:
            # first copy -> retake, in source time; across a join, the first copy is cut to its segment's end
            hi = s2[2] - 0.005 if s1[0] == s2[0] else segs[s1[0]]["endFrame"] / cs["fps"] + 0.05
            kills.append({"session": s1[1], "start": round(max(s1[2], hw[a_ - 1]["end"] - t + s1[2] + 0.08 if a_ else 0), 3),
                          "end": round(hi, 3), "text": text, "cut": round(t, 2)})
    if a.kills_out:
        json.dump(kills, open(a.kills_out, "w"), indent=1)
        print(f"{len(kills)} render-only retakes -> {a.kills_out}")
    for x in hw:
        t, tok = x["start"], norm(x["word"])
        if not tok:
            continue
        if FILLER.match(tok):
            found.append({"kind": "FILLER", "cut": round(t, 2), "text": x["word"], "nearJoin": near_join(t)})
            continue
        if not any(norm(c["word"]).startswith(tok[:4]) or tok.startswith(norm(c["word"])[:4]) for c in cut if abs(c["start"] - t) < 1.5 and norm(c["word"])):
            found.append({"kind": "EXTRA", "cut": round(t, 2), "text": x["word"], "nearJoin": near_join(t)})
    found.sort(key=lambda f: f["cut"])
    json.dump(found, open(a.out, "w"), indent=1)
    lines = [f"independent re-listen ({a.model}, disfluent prompt): {len(hw)} words heard, "
             + ", ".join(f"{k} {sum(1 for f in found if f['kind'] == k)}" for k in ("REPEAT", "EXTRA", "FILLER")), ""]
    for f in found:
        ctx = " ".join(x["word"] for x in hw if f["cut"] - 1.5 <= x["start"] <= f["cut"] + 1.5)
        lines.append(f"{mmss(f['cut']):>7}  {f['kind']:6s} {'JOIN' if f['nearJoin'] else '    '} "
                     f"{'(in cut transcript) ' if f.get('inCutTranscript') else ''}'{f['text']}'   | {ctx}")
    open(a.out.replace(".json", ".txt"), "w").write("\n".join(lines) + "\n")
    print("\n".join(l for l in lines if "FILLER" not in l))


main()
