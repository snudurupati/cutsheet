#!/usr/bin/env python3
"""Build transcript/cutsheet.json from the word-aligned transcript.

Every path and number comes in as an argument (hard rule 12). The only thing
baked in is the editorial decision list below: which spans are housekeeping,
retakes or abandoned first takes. Those are judgements about THIS recording and
belong with the job, not in a skill.

Method:
  1. drop every word inside a KILL range
  2. group the survivors into spans, splitting wherever the silence between two
     consecutive words exceeds the threshold for the section it falls in
  3. pad each span, taking the tail from the last word's END (never start+margin,
     which bisects the word and clips it mid-syllable)
  4. snap to the frame grid; startFrame/endFrame are authoritative and seconds
     are derived (1/30 has no finite decimal form, so a rounded second un-snaps)
  5. assert non-overlap and monotonicity before writing anything
"""
import argparse, json, subprocess, sys

# ---------------------------------------------------------------- editorial ---
# Housekeeping, retake markers and abandoned first takes. "take the last one,
# always". Times are source seconds on the CAMERA clip.
KILLS = [
    (0.0,     75.30, "slate, first take of the hook, and the retake marker ('Redick')"),
    (168.80,  206.00, "'So when I take a break' plus the abandoned first take of the production-fail point, restated at 3:26"),
    (337.50,  354.60, "abandoned 'GitHub page' opener, the 'Cut, retake' marker, AND the second 'So let's get started.' at 353.25. He says the line twice, 22 seconds apart; the first one at 331.86 closes the intro and is kept. Found by audit_joins.py, not by any counting gate"),
    (474.50,  575.00, "first take of the 'Claude Code came back' summary, the abandoned 'open as a project' route, and three Cut/retake markers. Restated at 9:35 going to terminal instead"),
    (1189.05, 1219.80, "'excuse me retake' on the experiment-two intro, restated at 20:20. Starts at 1189.05 rather than 1189.50 so the dangling 'where' goes with it: the cut otherwise read 'Now let's do another experiment where' straight into 'So experiment B', leaving the clause hanging. Found by audit_joins.py"),
    (206.40,  208.20, "the first of two consecutive 'so production ai use cases' phrases. He restarts the sentence inside the kept take, so the cut said it twice back to back. Found by audit_joins.py"),
    (2087.70, 2091.90, "the abandoned 'Now let's finally look at the...' and the 'Sorry, I closed it' stumble; the restate at 2091.97 is kept. The earlier bounds (2087.50, 2091.20) clipped the word 'smart.' at the head and ended inside 'Sorry,', which left a stray 'I closed it.' in the cut"),
    (2615.70, 2654.35, "the 'so just to recap, what did I do' summary of both experiments. Redundant: it restates the point he has just finished making. Human note 2026-09-08, cut 22:36-23:14. Ends just before 'So that was a demo', which is kept"),
    (2656.10, 2677.90, "'and this might leave you with a few questions. The first question is,' then 'retake, retake conclusion, retake takeaways'. Human note 2026-09-08: cut straight from 'So that was a demo' into 'So what are my takeaways'"),
    (2822.50, 2834.80, "'I would like to call this phenomenon... So, retake', restated at 47:15"),
    (2863.20, 2926.60, "the unfinished bridge sentence ('In the same way, your agent... it does not'), the stray 'Thank you for watching', 'Retake of the last line', AND the seasoned-expert / tribal-knowledge passage. Human decision 2026-09-08: the architect analogy had no completed bridge to the AI agent anywhere in the footage, so the cut lands the parallel immediately instead: 'they just fill in the gaps.' -> 'And AI models in a way behave the same way.' START 2863.20 not 2862.50, which cut through 'fill' and removed 'fill in the gaps', the phrase completing the analogy. END 2926.60 sits between 'codify them.' and 'And AI models'."),
    (2938.50, 2977.00, "first take of the closing 'toy example' answer, contains a 'cut' marker, restated at 49:37"),
]

# Where the speaker is on camera vs presenting the screen. Measured from the
# screen recording (saturation separates the desktop from an app window), not
# guessed. The cut is tighter on the face than on the screen because cutting
# inside a screen recording makes the screen jump.
SECTIONS = [
    ("intro", 0.0,    332.50, 0.70),
    ("demo",  332.50, 2657.00, 2.50),
    ("outro", 2657.00, 1e9,   0.70),
]

PAD_HEAD = 0.15   # air before the first word of a span
PAD_TAIL = 0.28   # air after the LAST WORD'S END

# The end card is an overlay that has to hold under the final "thank you" to the
# last frame, and speech ends 0.27s before the cut would. There is unused tail in
# the raw clip: he holds the lens cleanly to 3035.9s and starts turning away to
# stop the recording at about 3036.0, so the last segment runs to frame 91077 and
# the card gets a 3.3 second hold. Checked on frames, not assumed.
TAIL_HOLD_TO_FRAME = 91077

# A join is a visible jump cut on a talking head, so it has to buy back enough
# runtime to be worth one. Measured on this recording: 51 of 138 candidate joins
# reclaimed under 0.6s each and returned 20.7 seconds BETWEEN THEM, which is 51
# jump cuts for twenty seconds. Requiring a full second of reclaim drops 74 of
# the 138 joins and costs 38 seconds, landing at roughly one cut every 19s on
# the talking head, which is where the reference job (02-first-agent) sat.
# It also leaves natural 0.7-1.4s breath pauses alone, which is what preserving
# cadence actually means.
MIN_RECLAIM = 1.00


def section_of(t):
    for name, lo, hi, thr in SECTIONS:
        if lo <= t < hi:
            return name, thr
    return SECTIONS[-1][0], SECTIONS[-1][3]


def probe(path, entries):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", entries,
                          "-of", "default=noprint_wrappers=1:nokey=1", path],
                         capture_output=True, text=True).stdout.split()
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--transcript", required=True)
    ap.add_argument("--cam", required=True)
    ap.add_argument("--screen", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--fps", type=float, required=True)
    a = ap.parse_args()

    fps = a.fps
    cam_frames = int(probe(a.cam, "stream=nb_frames")[0])
    scr_frames = int(probe(a.screen, "stream=nb_frames")[0])
    cam_dur = float(probe(a.cam, "format=duration")[0])

    # Tails align (both Source Record filters stop together), so the longer clip
    # started earlier and its head carries the offset.
    head_trim = scr_frames - cam_frames
    if head_trim < 0:
        sys.exit(f"camera is longer than screen by {-head_trim} frames; this "
                 "assumes the screen leads. Re-check the alignment.")

    tr = json.load(open(a.transcript))
    words = [w for w in tr["word_segments"] if "start" in w and "end" in w]
    words.sort(key=lambda w: w["start"])
    if not words:
        sys.exit("transcript has no word-level timings")

    # gate the input against something independent of the cutsheet
    last = words[-1]["end"]
    if not (0.5 * cam_dur < last <= cam_dur + 1.0):
        sys.exit(f"transcript ends at {last:.1f}s but the camera clip is "
                 f"{cam_dur:.1f}s. Wrong transcript for this footage.")

    # A kill boundary must land between words, never inside one. On 2026-09-08 a
    # boundary at 2862.50 fell inside "fill" and silently took "fill in the gaps"
    # with it, leaving the architect analogy ending on "they just". Nothing errored;
    # the human found it by watching. Fail the build instead.
    bisect = []
    for lo, hi, why in KILLS:
        for w in words:
            for edge, name in ((lo, "start"), (hi, "end")):
                if w["start"] < edge < w["end"]:
                    bisect.append(f"  kill {name} {edge} falls inside {w['word']!r} "
                                  f"({w['start']:.3f}-{w['end']:.3f}) :: {why[:60]}")
    if bisect:
        sys.exit("kill boundaries bisect words:\n" + "\n".join(bisect))

    killed = lambda t: any(lo <= t < hi for lo, hi, _ in KILLS)
    kept = [w for w in words if not killed(w["start"])]

    # group into spans
    spans, cur = [], [kept[0]]
    for prev, w in zip(kept, kept[1:]):
        gap = w["start"] - prev["end"]
        _, thr = section_of(prev["end"])
        # a kill range between two words is always a split, whatever the gap
        crosses_kill = any(prev["end"] <= lo < w["start"] or
                           prev["end"] < hi <= w["start"] for lo, hi, _ in KILLS)
        worth_it = gap - (PAD_HEAD + PAD_TAIL) >= MIN_RECLAIM
        if (gap > thr and worth_it) or crosses_kill:
            spans.append(cur); cur = [w]
        else:
            cur.append(w)
    spans.append(cur)

    segs, prev_end_f = [], -1
    for i, sp in enumerate(spans, 1):
        s = sp[0]["start"] - PAD_HEAD
        e = sp[-1]["end"] + PAD_TAIL          # tail from the last word's END
        # never let padding reach into a kill range or past the clip
        for lo, hi, _ in KILLS:
            if lo <= e <= hi: e = lo - 0.01
            if lo <= s <= hi: s = hi + 0.01
        s = max(0.0, s)
        e = min(e, cam_dur)
        sf, ef = round(s * fps), round(e * fps)
        if ef <= sf:
            continue
        if sf <= prev_end_f:
            sf = prev_end_f + 1               # assert non-overlap by construction
        if ef <= sf:
            continue
        name, _ = section_of(sp[0]["start"])
        segs.append({
            "id": f"s{i:03d}",
            "section": name,
            "cam": a.cam, "screen": a.screen,
            "startFrame": sf, "endFrame": ef,
            "screenStartFrame": sf + head_trim, "screenEndFrame": ef + head_trim,
            "start": sf / fps, "end": ef / fps,
            "keep": True,
            "text": " ".join(w["word"] for w in sp).strip(),
        })
        prev_end_f = ef

    # hold the last frame open for the end card (see TAIL_HOLD_TO_FRAME)
    if TAIL_HOLD_TO_FRAME and segs:
        if not (segs[-1]["endFrame"] < TAIL_HOLD_TO_FRAME <= cam_frames):
            sys.exit(f"tail hold {TAIL_HOLD_TO_FRAME} is not inside the unused tail "
                     f"({segs[-1]['endFrame']}..{cam_frames}); re-check it on frames")
        segs[-1]["endFrame"] = TAIL_HOLD_TO_FRAME
        segs[-1]["screenEndFrame"] = TAIL_HOLD_TO_FRAME + head_trim
        segs[-1]["end"] = TAIL_HOLD_TO_FRAME / fps
        segs[-1]["tailHold"] = True
        segs[-1]["_tailHoldWhy"] = ("speech ends 0.27s before the clip does; the end "
                                    "card holds to the last frame, so the segment runs "
                                    "on to the frame before he turns away")

    # hard assertions before anything is written
    for x, y in zip(segs, segs[1:]):
        assert x["endFrame"] < y["startFrame"], f"overlap at {x['id']}/{y['id']}"
        assert x["startFrame"] < x["endFrame"], f"empty segment {x['id']}"
    assert segs[-1]["endFrame"] <= cam_frames, "segment runs past the camera clip"

    total = sum(s["endFrame"] - s["startFrame"] for s in segs)
    doc = {
        "fps": fps, "fpsRational": "30/1",
        "source": {
            "cam": a.cam, "screen": a.screen,
            "screenHeadTrimFrames": head_trim,
            "_offsetWhy": "tails align; the screen clip is longer, so it started "
                          "earlier and its head carries the offset",
        },
        "delivery": {"width": 3840, "height": 2160,
                     "_why": "min(style delivery, source); both are 4K"},
        "sections": [{"name": n, "start": lo, "end": (None if hi > 1e8 else hi),
                      "silenceThresholdSeconds": thr} for n, lo, hi, thr in SECTIONS],
        "kills": [{"start": lo, "end": hi, "why": w} for lo, hi, w in KILLS],
        "totalFrames": total,
        "totalSeconds": round(total / fps, 3),
        "segments": segs,
    }
    json.dump(doc, open(a.out, "w"), indent=1)
    print(f"segments      {len(segs)}")
    print(f"source        {cam_dur/60:.1f} min ({cam_frames} frames)")
    print(f"cut           {total/fps/60:.1f} min ({total} frames)")
    print(f"removed       {(cam_dur - total/fps)/60:.1f} min "
          f"({100*(1-total/fps/cam_dur):.0f}%)")
    print(f"screen head trim {head_trim} frame(s)")
    print(f"wrote {a.out}")


main()
