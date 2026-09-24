#!/usr/bin/env python3
"""Build transcript/cutsheet.json from the word-aligned transcript.

Adapted from 03-project-context for a job recorded as TWO sessions. Each session
is its own camera + screen pair with its own head trim, kills and sections; the
cut plays session A then session B. Every segment carries its session, its own
cam/screen paths and frames LOCAL to that cam. Nothing here builds a shared
source timeline, so a word or frame from one session can never be matched to a
segment of the other.

Every path and number comes in as an argument (hard rule 12). The only thing
baked in is the editorial decision list: which spans are housekeeping, retakes
or abandoned first takes. Those are judgements about THIS recording.

Method, per session:
  1. drop every word inside a KILL range
  2. group survivors into spans, splitting where the silence between two words
     exceeds the section's threshold AND the join buys back MIN_RECLAIM
  3. pad each span, taking the tail from the last word's END
  4. snap to the frame grid; frames are authoritative, seconds derived
  5. assert non-overlap and monotonicity before writing anything
"""
import argparse, json, subprocess, sys

# ---------------------------------------------------------------- editorial ---
# (session, lo, hi, why). Times are seconds on THAT session's camera clip.
# Kept on purpose, human 2026-09-22: A 4:13 "And today the date is Thursday,
# September 22nd." Announcing the model and the date is deliberate because models
# change so often, and the line gets a graphic. 22 Sep 2026 was a TUESDAY, so the
# card prints the date without a weekday rather than repeat the slip on screen.
KILLS = [
    ("a",    0.00,   58.20, "slate: thumbnail shots, 'It's my face', mic test, and settling in. Ends at 58.20, 0.11s before 'AI hallucinates' (human note 2026-09-22, see HEAD_HOLD)"),
    ("a",  238.40,  244.20, "'but then, you know, for consistency's sake.' First take, restated immediately as 'For consistency sake, I'm back to using Claude Code'"),
    ("a",  498.55, 1477.35, "the agent's 16-minute build, watched in silence ('Okay.' at 23:34 included). 'the whole nine yards.' -> 'okay so Claude Code came back'"),
    ("a", 1508.70, 1527.40, "housekeeping: 'since I'll be working in the terminal... make it full screen. Increase the font up a bit.'"),
    ("a", 1544.70, 1577.70, "dbt build running, 33s, with a lone 'Okay.' in the middle"),
    ("a", 1895.50, 1911.80, "'but in this case uh let me let me fix that' then 16s retyping the query. 'change between runs' -> 'So this is called fact daily branch sales.'"),
    ("a", 1915.60, 1924.05, "dangling 'So let me.' before the corrected query result"),
    ("a", 2051.60, 2167.00, "end of session A: silence, 'All right.', and the camera feed goes black at 34:25. Session B picks up the build report"),
    ("b",    0.00,    7.90, "pre-roll before 'When I verify the build report'"),
    ("b",  322.40,  338.70, "'okay sorry' while the console reopens; 'invoke the DuckDB console again' -> 'Alright, so earlier I had 1845 records'"),
    ("b",  429.50,  446.05, "'So these were two void transactions. Sorry, wrong query. Yeah,' The corrected query is kept from 'so this is a void transaction.'"),
    ("b",  640.60,  644.30, "'300 something tests and 400 something macros': the build reported 228 tests and 489 macros on screen at 6:27. Human decision 2026-09-22: drop the counts, keep the recap. 'it built 17 models' -> 'for a single person'"),
    ("b",  831.64,  834.17, "'seriously, one, sorry, not seriously,' -> 'built things serially, one table at a time'"),
]

# (session, name, lo, hi, silence threshold). Measured from two signals that
# agree: the transcript's announcements and the screen clip going from black to
# the app (A 3:42, 7s after "let's get started") and back to black (B 9:33, as
# the recap starts). The screen is cut gently, the face tightly.
SECTIONS = [
    ("a", "intro",   0.0,  220.0, 0.70),
    ("a", "demo",  220.0,    1e9, 2.50),
    ("b", "demo",    0.0,  573.0, 2.50),
    ("b", "outro", 573.0,    1e9, 0.70),
]

PAD_HEAD = 0.15
PAD_TAIL = 0.28
MIN_RECLAIM = 1.00   # a jump cut must buy back a second (03-project-context)

# He holds the lens smiling after "thank you." (887.71) until he blinks into the
# turn at 891.6. Checked on frames. The end card holds over this.
TAIL_HOLD = ("b", 26742)

# Human notes 2026-09-22. First: "it starts abruptly, leave a couple of seconds",
# so the cut opened at 56.20 (frame 1686) with a 2.1s lead-in. Then, having
# watched it: "starts from an awkward frame with my face awkwardly contorted, start
# at the 2s mark". Checked on frames: at 56.20 his eyes are half shut and his head
# tilted; by 58.2 he is settled into the first word. So the cut opens at 58.20
# (frame 1746), 0.11s before "AI". No head hold: the slate kill simply ends there.
HEAD_HOLD = None


def probe(path, entries):
    return subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0",
                           "-show_entries", entries, "-of",
                           "default=noprint_wrappers=1:nokey=1", path],
                          capture_output=True, text=True).stdout.split()


def section_of(sid, t):
    rows = [r for r in SECTIONS if r[0] == sid]
    for _, name, lo, hi, thr in rows:
        if lo <= t < hi:
            return name, thr
    return rows[-1][1], rows[-1][4]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--transcript", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--fps", type=float, required=True)
    a = ap.parse_args()
    fps = a.fps

    tr = json.load(open(a.transcript))
    sessions = tr["sessions"]
    all_words = [w for w in tr["word_segments"] if "start" in w and "end" in w]

    segs, doc_sessions, n = [], [], 0
    for sess in sessions:
        sid, cam, scr = sess["id"], sess["cam"], sess["screen"]
        cam_frames = int(probe(cam, "stream=nb_frames")[0])
        scr_frames = int(probe(scr, "stream=nb_frames")[0])
        cam_dur = cam_frames / fps
        head_trim = scr_frames - cam_frames
        if head_trim < 0:
            sys.exit(f"{sid}: camera longer than screen by {-head_trim} frames")

        words = sorted((w for w in all_words if w["session"] == sid),
                       key=lambda w: w["start"])
        # gate: this transcript belongs to this footage
        if not (0.5 * cam_dur < words[-1]["end"] <= cam_dur + 1.0):
            sys.exit(f"{sid}: transcript ends at {words[-1]['end']:.1f}s but {cam} "
                     f"is {cam_dur:.1f}s. Wrong transcript for this footage.")

        kills = [(lo, hi, why) for s, lo, hi, why in KILLS if s == sid]
        bis = [f"  {sid} kill {e} inside {w['word']!r} ({w['start']:.3f}-{w['end']:.3f})"
               for lo, hi, _ in kills for e in (lo, hi) for w in words
               if w["start"] < e < w["end"]]
        if bis:
            sys.exit("kill boundaries bisect words:\n" + "\n".join(bis))

        killed = lambda t: any(lo <= t < hi for lo, hi, _ in kills)
        kept = [w for w in words if not killed(w["start"])]

        spans, cur = [], [kept[0]]
        for prev, w in zip(kept, kept[1:]):
            gap = w["start"] - prev["end"]
            _, thr = section_of(sid, prev["end"])
            crosses = any(prev["end"] <= lo < w["start"] or prev["end"] < hi <= w["start"]
                          for lo, hi, _ in kills)
            worth = gap - (PAD_HEAD + PAD_TAIL) >= MIN_RECLAIM
            if (gap > thr and worth) or crosses:
                spans.append(cur); cur = [w]
            else:
                cur.append(w)
        spans.append(cur)

        prev_end_f = -1
        first_idx = len(segs)
        for sp in spans:
            s = sp[0]["start"] - PAD_HEAD
            e = sp[-1]["end"] + PAD_TAIL
            for lo, hi, _ in kills:
                if lo <= e <= hi: e = lo - 0.01
                if lo <= s <= hi: s = hi + 0.01
            s, e = max(0.0, s), min(e, cam_dur)
            sf, ef = round(s * fps), round(e * fps)
            if sf <= prev_end_f:
                sf = prev_end_f + 1
            if ef <= sf:
                continue
            n += 1
            segs.append({
                "id": f"s{n:03d}", "session": sid,
                "section": section_of(sid, sp[0]["start"])[0],
                "cam": cam, "screen": scr,
                "startFrame": sf, "endFrame": ef,
                "screenStartFrame": sf + head_trim, "screenEndFrame": ef + head_trim,
                "start": sf / fps, "end": ef / fps, "keep": True,
                "text": " ".join(w["word"] for w in sp).strip(),
            })
            prev_end_f = ef

        if HEAD_HOLD and HEAD_HOLD[0] == sid:
            first = segs[first_idx]
            if not (0 <= HEAD_HOLD[1] < first["startFrame"]):
                sys.exit(f"head hold {HEAD_HOLD[1]} is not before the first kept "
                         f"frame {first['startFrame']}")
            if any(lo * fps < HEAD_HOLD[1] < hi * fps for lo, hi, _ in kills
                   if lo > 1.0):
                sys.exit("head hold reaches into a later kill range")
            first.update(startFrame=HEAD_HOLD[1], screenStartFrame=HEAD_HOLD[1] + head_trim,
                         start=HEAD_HOLD[1] / fps, headHold=True)

        if TAIL_HOLD[0] == sid:
            last = segs[-1]
            if not (last["endFrame"] < TAIL_HOLD[1] <= cam_frames):
                sys.exit(f"tail hold {TAIL_HOLD[1]} not in unused tail "
                         f"({last['endFrame']}..{cam_frames})")
            last.update(endFrame=TAIL_HOLD[1], screenEndFrame=TAIL_HOLD[1] + head_trim,
                        end=TAIL_HOLD[1] / fps, tailHold=True)

        mine = segs[first_idx:]
        for x, y in zip(mine, mine[1:]):
            assert x["endFrame"] < y["startFrame"], f"overlap {x['id']}/{y['id']}"
        assert mine[-1]["endFrame"] <= cam_frames, f"{sid} runs past its camera clip"
        assert mine[-1]["screenEndFrame"] <= scr_frames, f"{sid} runs past its screen clip"
        doc_sessions.append({"id": sid, "cam": cam, "screen": scr,
                             "camFrames": cam_frames, "screenFrames": scr_frames,
                             "screenHeadTrimFrames": head_trim})

    total = sum(s["endFrame"] - s["startFrame"] for s in segs)
    doc = {
        "fps": fps, "fpsRational": "30/1",
        "sessions": doc_sessions,
        "_sessionsWhy": "two recordings, A (15:13) then B (16:06). B continues A. "
                        "Frames are LOCAL to each segment's own cam; tails align, "
                        "so each screen clip's head carries its offset",
        "delivery": {"width": 3840, "height": 2160,
                     "_why": "min(style delivery, source); all four clips are 4K"},
        "sections": [{"session": s, "name": nm, "start": lo,
                      "end": (None if hi > 1e8 else hi), "silenceThresholdSeconds": t}
                     for s, nm, lo, hi, t in SECTIONS],
        "kills": [{"session": s, "start": lo, "end": hi, "why": w} for s, lo, hi, w in KILLS],
        "totalFrames": total, "totalSeconds": round(total / fps, 3),
        "segments": segs,
    }
    json.dump(doc, open(a.out, "w"), indent=1)
    src = sum(s["camFrames"] for s in doc_sessions) / fps
    print(f"segments  {len(segs)}  ({sum(1 for s in segs if s['session']=='a')} A, "
          f"{sum(1 for s in segs if s['session']=='b')} B)")
    print(f"source    {src/60:.1f} min   cut {total/fps/60:.2f} min   "
          f"removed {100*(1-total/fps/src):.0f}%")
    for sec in ("intro", "demo", "outro"):
        f = sum(s["endFrame"] - s["startFrame"] for s in segs if s["section"] == sec)
        print(f"  {sec:6s} {f/fps/60:5.2f} min")
    print(f"wrote {a.out}")


main()
