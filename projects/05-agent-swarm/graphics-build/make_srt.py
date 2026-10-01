#!/usr/bin/env python3
"""Captions (.srt) for the upload, from the cut-aligned transcript.

Short single-line cues like 04's: at most 42 characters and 5s, broken at sentence ends
first, then at commas. Word timings come from outputs/transcript-cut.json, which the
mishear list has already been applied to; CAPTION_FIX below corrects the few that are
spoken file names or that WhisperX lowercased.

Gated on the deliverable: the last caption must end inside the video.

  python3 make_srt.py --transcript ../outputs/transcript-cut.json \
      --video ../outputs/05-agent-swarm-final-longform-2160p.mp4 \
      --out ../outputs/05-agent-swarm.srt
"""
import argparse, json, re, subprocess, sys

MAXC, MAXD, GAP = 42, 5.0, 0.8
# phrase-level fixes, applied to cue text (word timings are untouched)
CAPTION_FIX = [
    (r"\bdbdproject\.yml\b", "dbt_project.yml"),
    (r"\bbuildreport\.md\b", "BUILD_REPORT.md"),
    (r"\bdata match itself\b", "data marts itself"),
    (r"\bClaude code\b", "Claude Code"),
    (r"\bclaude code\b", "Claude Code"),
    (r"\bconventions\.md\b", "CONVENTIONS.md"),
    (r"\bi\b", "I"),
    (r"\bi'(ve|m|ll|d)\b", r"I'\1"),
]


def fmt(t):
    ms = round(t * 1000)
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--transcript", required=True)
    ap.add_argument("--video", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    words = [w for w in json.load(open(a.transcript))["words"] if w.get("word", "").strip() and "start" in w]
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
                                a.video], capture_output=True, text=True).stdout)
    if words[-1]["end"] > dur:
        sys.exit(f"transcript ends at {words[-1]['end']:.2f}s, past the video's {dur:.2f}s: wrong transcript")

    cues, cur = [], []
    def flush():
        if cur:
            cues.append([cur[0]["start"], cur[-1]["end"], " ".join(w["word"].strip() for w in cur)])
            cur.clear()
    for i, w in enumerate(words):
        if cur:
            text = " ".join(x["word"].strip() for x in cur + [w])
            if (len(text) > MAXC or w["end"] - cur[0]["start"] > MAXD or w["start"] - cur[-1]["end"] > GAP):
                # prefer to break after a comma in the back half of the cue
                cut = max((j for j, x in enumerate(cur) if x["word"].rstrip().endswith(",") and j >= len(cur) // 2),
                          default=None)
                if cut is not None and cut < len(cur) - 1:
                    tail = cur[cut + 1:]; del cur[cut + 1:]; flush(); cur.extend(tail)
                else:
                    flush()
        cur.append(w)
        if w["word"].rstrip().endswith((".", "?", "!")):
            flush()
    flush()

    out = []
    for n, (s, e, t) in enumerate(cues, 1):
        nxt = cues[n][0] if n < len(cues) else dur
        e = min(max(e + 0.15, s + 0.8), nxt - 0.02, dur)       # hold a beat, never overlap the next
        for pat, rep in CAPTION_FIX:
            t = re.sub(pat, rep, t)
        if n == 1 or cues[n - 2][2].rstrip().endswith(('.', '?', '!')):   # sentence starts only
            t = t[0].upper() + t[1:]
        out.append(f"{n}\n{fmt(s)} --> {fmt(e)}\n{t}\n")
    open(a.out, "w").write("\n".join(out))
    print(f"wrote {a.out}: {len(cues)} cues, last ends {fmt(min(cues[-1][1] + 0.15, dur))} of {fmt(dur)}")


main()
