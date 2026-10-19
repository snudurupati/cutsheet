#!/usr/bin/env python3
"""Captions (.srt) for the upload, from the cut-aligned transcript.

Short single-line cues like 04's: at most 42 characters and 5s, broken at sentence ends
first, then at commas. Word timings come from outputs/transcript-cut.json, which the
mishear list has already been applied to; CAPTION_FIX below corrects the few that are
spoken file names or that WhisperX lowercased.

Gated on the deliverable: the last caption must end inside the video.

  python3 make_srt.py --transcript ../outputs/transcript-cut.json --cutsheet ../transcript/cutsheet.json \
      --video ../outputs/finished.mov --out ../outputs/01-robotics-as-de.srt

01-robotics-as-de: brand.md captionVoice is "lightly cleaned verbatim, filler removed", so uh/um never
appear, and nor does any word inside a room-tone mute (cut-overrides "mutes", the end-card hold):
those are silent in the cut.
"""
import argparse, json, re, subprocess, sys

MAXC, MAXD, GAP = 42, 5.0, 0.8
# phrase-level fixes, applied to cue text (word timings are untouched)
CAPTION_FIX = [
    (r"\bPA idea\b", "paida"),
    (r"\brerun\b", "Rerun"),
    (r"\bAGI Bot World\b", "AgiBot World"),
    (r"\bparquet\b", "Parquet"),
    (r"\bthe json metadata\b", "the JSON metadata"),
    (r"\bClaude code\b", "Claude Code"),
    (r"\bi\b", "I"),
    (r"\bi'(ve|m|ll|d)\b", r"I'\1"),
    (r" ,", ","),
]
FILLER = re.compile(r"^(uh|um|uhm|erm|er|ah)[,.]?$", re.I)


def fmt(t):
    ms = round(t * 1000)
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--transcript", required=True)
    ap.add_argument("--video", required=True)
    ap.add_argument("--cutsheet", required=True, help="transcript/cutsheet.json: its muted stretches carry no captions")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    words = [w for w in json.load(open(a.transcript))["words"] if w.get("word", "").strip() and "start" in w]
    # muted stretches, in cut seconds: no caption may sit over silence
    cs = json.load(open(a.cutsheet)); fps = cs["fps"]; acc = 0; muted = []
    for g in cs["segments"]:
        if not g.get("keep", True): continue
        st = g["startFrame"] / fps; c0 = acc / fps; acc += g["outFrames"]
        for m0, m1 in g.get("muteRanges", []): muted.append((c0 + m0 - st, c0 + m1 - st))
        if g.get("muteFrom"): muted.append((c0 + g["muteFrom"] - st, acc / fps))
    if abs(acc / fps - json.load(open(a.transcript)).get("totalSeconds", acc / fps)) > 0.05:
        sys.exit("cutsheet and cut transcript disagree on length: stale artefact")
    n0 = len(words)
    words = [w for w in words if not FILLER.match(w["word"].strip())
             and not any(m0 - 0.02 <= w["start"] < m1 for m0, m1 in muted)]
    print(f"dropped {n0 - len(words)} filler or muted words of {n0}")
    # word-level fixes for phrases a cue break could split: (spoken tokens) -> (caption tokens), timings kept
    WORD_FIX = [(["SO", "LeRobot", "Arm", "SORM-101,", "101", "Pro."], ["LeRobot", "SO-ARM101", "Pro."])]
    for src, dst in WORD_FIX:
        for i in range(len(words) - len(src) + 1):
            if [w["word"].strip() for w in words[i:i + len(src)]] == src:
                seg = words[i:i + len(src)]
                new = [dict(seg[0], word=dst[0])] + [dict(seg[min(k + 1, len(seg) - 1)], word=d) for k, d in enumerate(dst[1:])]
                new[-1]["end"] = seg[-1]["end"]
                words[i:i + len(src)] = new
                break
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
