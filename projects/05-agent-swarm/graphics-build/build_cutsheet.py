#!/usr/bin/env python3
"""Build transcript/cutsheet.json from the word-aligned transcript.

Two sessions (A 11:50, B 12:30; the camera overheated and shut down after A).
Adapted from 04-lightweight-ontology: every segment carries its session, its own
cam/screen paths and frames LOCAL to that cam, and nothing builds a shared
source timeline.

NEW ON THIS JOB: session A's demo is never cut for silence. Human direction
2026-09-29: "in the first screen recording, don't cut the silence bits with no
speech, because the demo screen shows important stuff, see if it can be
compressed/sped-up". So inside a section whose mode is "ff", a silent gap is:

  frozen screen (no second in it changes, screen-activity.json)
                         -> cut as usual; there is nothing to show
  longer than FF_MIN_S   -> a FAST-FORWARD segment, FF_OUT_FRAMES long whatever
                            its source length (human 2026-09-29: "one SFX length
                            each", the fast-forward sample is 8.736s), voice
                            muted, face inset slides out (graphics stage)
  longer than the section threshold
                         -> a COMPRESS segment at COMPRESS_SPEED, so typing a
                            command stays visible; audio time-compressed with it
  shorter                -> kept at 1x inside the span

Gap segments are contiguous with the speech on either side: a speech span ends
at frame E and the gap segment starts at E, half-open ranges, no shared frame.
Every segment has outFrames, its length ON THE CUT; for 1x segments that is
endFrame - startFrame.

Every path and number comes in as an argument (hard rule 12). The only thing
baked in is the editorial list below: judgements about THIS recording.
"""
import argparse, json, subprocess, sys

# ---------------------------------------------------------------- editorial ---
# (session, lo, hi, why). Seconds on THAT session's camera clip.
KILLS = [
    ("a",    0.00,   22.50, "slate: 'Mic testing 1, 2, 3' twice and 'Go.'"),
    ("a",   53.80,   66.10, "'So how can we solve the problem? Cut.' First take; restarted at 'But we can't let our agent mull things over'"),
    ("a",  158.00,  204.90, "'So I've already cloned an empty repo here ... what it looks like.' then 'cut repeat'. The retake is kept"),
    ("a",  364.10,  370.90, "'Okay, now that the message board has been started, cut.' The 18s of starting the board before it is compressed, not cut"),
    ("a", 1651.40, 1667.90, "'So Claude, you know...' false start, and its restatement 'So what Claude did, it created its own JSON file ... as a message board.' Human 2026-09-29: trim it. The Claude Code docs describe a built-in mailbox (a JSON inbox per agent under ~/.claude/teams/), which board.py reads, so the line would contradict the agent-team explainer"),
    ("a", 1734.00, 1796.40, "end of session A after 'let me do slash exit'. Session B picks up with 'so the agents finished successfully'"),
    ("b",    0.00,   18.10, "pre-roll before 'so the agents finished successfully'"),
    ("b",  186.00,  231.30, "first take of the line-nine walkthrough: 'the gist of it is the CRM wants to handle, I don't know, cut.' The retake from 'So here in line number nine' is kept"),
    ("b",  111.20,  118.58, "'If I were building a team and dividing tasks, I could have done any better than what this did.' A slip that inverts the meaning (he means couldn't). Human 2026-09-29: cut the sentence"),
    ("b",  269.50,  276.98, "'And if I look at line number 37,' false start, restated as line 39"),
    ("b",  326.37,  327.67, "'this file. Sorry,' so the line reads 'make use of this column.'"),
    ("b",  609.30,  611.10, "'Cut and pause for the conclusion.'"),
    ("b",  921.97,  954.25, "closing retakes: 'Do connect to me on any one of the channels' x2, 'cut, cut, cut. Last line.' The last take is kept"),
]

# (session, name, lo, hi, threshold, mode). Boundaries from the transcript: A's
# demo starts after "So let's get started" (157.9), B's ends at "Cut and pause
# for the conclusion" (609.5). The screen agrees on A (first change at 3:00,
# inside the retake the kill removes). On B the screen goes idle around 9:00, a
# minute early; the transcript wins and that is reported.
SECTIONS = [
    ("a", "intro",   0.0,  160.0, 0.70, "cut"),
    ("a", "demo",  160.0,    1e9, 2.50, "ff"),
    ("b", "demo",    0.0,  611.0, 2.50, "cut"),
    ("b", "outro", 611.0,    1e9, 0.70, "cut"),
]

PAD_HEAD = 0.15
PAD_TAIL = 0.28
MIN_RECLAIM = 1.00          # a jump cut must buy back a second (03-project-context)
FF_MIN_S = 60.0             # the three agent builds are 181-445s; the next longest gap is 29s
FF_SFX_S = 8.736            # audio/sound-effects/freesound_community-fast-forward-5980.mp3
COMPRESS_SPEED = 4.0
COMPRESS_MIN_S = 5.0        # shorter pauses stay at 1x: a 2s pause at 4x is half a second of
                            # jittering face, which reads as a glitch, not as time passing

# "See you next time. Thank you." ends 969.37; the end card holds under it.
# Provisional: checked on frames in the graphics stage.
TAIL_HOLD = ("b", 29160)


def probe(path, entries):
    return subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0",
                           "-show_entries", entries, "-of",
                           "default=noprint_wrappers=1:nokey=1", path],
                          capture_output=True, text=True).stdout.split()


def section_of(sid, t):
    rows = [r for r in SECTIONS if r[0] == sid]
    for r in rows:
        if r[2] <= t < r[3]:
            return r
    return rows[-1]


def mmss(t):
    return f"{int(t)//60}:{t%60:04.1f}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--transcript", required=True)
    ap.add_argument("--activity", required=True, help="graphics-build/screen-activity.json")
    ap.add_argument("--out", required=True)
    ap.add_argument("--fps", type=float, required=True)
    a = ap.parse_args()
    fps = a.fps
    ff_out = round(FF_SFX_S * fps)

    tr = json.load(open(a.transcript))
    act = json.load(open(a.activity))
    all_words = [w for w in tr["word_segments"] if "start" in w and "end" in w]

    segs, doc_sessions, n = [], [], 0
    for sess in tr["sessions"]:
        sid, cam, scr = sess["id"], sess["cam"], sess["screen"]
        cam_frames = int(probe(cam, "stream=nb_frames")[0])
        scr_frames = int(probe(scr, "stream=nb_frames")[0])
        cam_dur = cam_frames / fps
        head_trim = scr_frames - cam_frames
        if head_trim < 0:
            sys.exit(f"{sid}: camera longer than screen by {-head_trim} frames")
        tra = act["sessions"][sid]
        if tra["screen"] != scr or tra["frames"] != scr_frames:
            sys.exit(f"{sid}: screen-activity.json was traced from a different screen clip")
        # activity is per SCREEN second; the screen leads the camera by head_trim
        def changing(lo, hi):
            s0 = int(lo + head_trim / fps); s1 = int(hi + head_trim / fps)
            return sum(1 for x in tra["scores"][s0:s1] if x > act["active"])

        words = sorted((w for w in all_words if w["session"] == sid), key=lambda w: w["start"])
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

        # spans of words, and the kind of join after each span
        spans, joins, cur = [], [], [kept[0]]
        for prev, w in zip(kept, kept[1:]):
            gap = w["start"] - prev["end"]
            _, _, _, _, thr, mode = section_of(sid, prev["end"])
            crosses = any(prev["end"] <= lo < w["start"] or prev["end"] < hi <= w["start"]
                          for lo, hi, _ in kills)
            worth = gap - (PAD_HEAD + PAD_TAIL) >= MIN_RECLAIM
            join = None
            if crosses:
                join = "cut"
                # ff mode: silent screen work BEFORE a killed line is still shown.
                # A 'cut.' spoken after an 18s wait kills the line, not the wait.
                lo = min(k[0] for k in kills if prev["end"] <= k[0] < w["start"])
                if (mode == "ff" and lo - prev["end"] > COMPRESS_MIN_S
                        and changing(prev["end"], lo) > 0):
                    join = ("compress-cut", lo)
            elif mode == "ff" and gap > thr:
                if changing(prev["end"], w["start"]) == 0:
                    join = "cut" if worth else None
                elif gap > FF_MIN_S:
                    join = "ff"
                elif gap > COMPRESS_MIN_S:
                    join = "compress"
            elif gap > thr and worth:
                join = "cut"
            if join:
                spans.append(cur); joins.append(join); cur = [w]
            else:
                cur.append(w)
        spans.append(cur); joins.append(None)

        # frames for every speech span
        rng = []
        for sp in spans:
            s = sp[0]["start"] - PAD_HEAD
            e = sp[-1]["end"] + PAD_TAIL
            for lo, hi, _ in kills:
                if lo <= e <= hi: e = lo - 0.01
                if lo <= s <= hi: s = hi + 0.01
            s, e = max(0.0, s), min(e, cam_dur)
            rng.append([round(s * fps), round(e * fps)])
        # a gap segment owns everything between its neighbours; pads never overlap
        for i, j in enumerate(joins[:-1]):
            if j in ("ff", "compress"):
                if rng[i][1] > rng[i + 1][0]:
                    mid = (rng[i][1] + rng[i + 1][0]) // 2
                    rng[i][1] = rng[i + 1][0] = mid

        first_idx = len(segs)
        prev_end = -1

        def add(kind, sf, ef, text, section):
            nonlocal n, prev_end
            if ef <= sf:
                return
            if sf < prev_end:
                sys.exit(f"{sid}: segment at {sf} overlaps the previous one ending {prev_end}")
            n += 1
            src = ef - sf
            if kind == "ff":
                out = ff_out
            elif kind == "compress":
                out = max(1, round(src / COMPRESS_SPEED))
            else:
                out = src
            segs.append({
                "id": f"s{n:03d}", "session": sid, "section": section, "kind": kind,
                "cam": cam, "screen": scr,
                "startFrame": sf, "endFrame": ef,
                "screenStartFrame": sf + head_trim, "screenEndFrame": ef + head_trim,
                "outFrames": out, "speed": round(src / out, 4),
                "start": sf / fps, "end": ef / fps, "keep": True, "text": text,
            })
            prev_end = ef

        for i, sp in enumerate(spans):
            sec = section_of(sid, sp[0]["start"])[1]
            add("speech", rng[i][0], rng[i][1],
                " ".join(w["word"] for w in sp).strip(), sec)
            if isinstance(joins[i], tuple):          # compress-cut: up to the kill
                sf, ef = rng[i][1], round(joins[i][1] * fps)
                add("compress", sf, ef,
                    f"[compressed: {(ef-sf)/fps:.1f}s of silent screen before a killed line, "
                    f"{changing(sf / fps, ef / fps)}s of it changing]", sec)
            if joins[i] in ("ff", "compress"):
                sf, ef = rng[i][1], rng[i + 1][0]
                secs = (ef - sf) / fps
                label = ("FAST-FORWARD" if joins[i] == "ff" else "compressed")
                add(joins[i], sf, ef,
                    f"[{label}: {secs:.1f}s of silent screen, "
                    f"{changing(sf / fps, ef / fps)}s of it changing]", sec)

        if TAIL_HOLD[0] == sid:
            last = segs[-1]
            if not (last["endFrame"] < TAIL_HOLD[1] <= cam_frames):
                sys.exit(f"tail hold {TAIL_HOLD[1]} not in unused tail "
                         f"({last['endFrame']}..{cam_frames})")
            last.update(endFrame=TAIL_HOLD[1], screenEndFrame=TAIL_HOLD[1] + head_trim,
                        end=TAIL_HOLD[1] / fps, tailHold=True,
                        outFrames=TAIL_HOLD[1] - last["startFrame"])

        mine = segs[first_idx:]
        for x, y in zip(mine, mine[1:]):
            assert x["endFrame"] <= y["startFrame"], f"overlap {x['id']}/{y['id']}"
        assert mine[-1]["endFrame"] <= cam_frames, f"{sid} runs past its camera clip"
        assert mine[-1]["screenEndFrame"] <= scr_frames, f"{sid} runs past its screen clip"
        doc_sessions.append({"id": sid, "cam": cam, "screen": scr,
                             "camFrames": cam_frames, "screenFrames": scr_frames,
                             "screenHeadTrimFrames": head_trim})

    total = sum(s["outFrames"] for s in segs)
    doc = {
        "fps": fps, "fpsRational": "30/1",
        "sessions": doc_sessions,
        "_sessionsWhy": "two recordings, A (11:50) then B (12:30); the camera overheated "
                        "and shut down after A. Frames are LOCAL to each segment's own cam; "
                        "tails align, so each screen clip's head carries its offset",
        "delivery": {"width": 3840, "height": 2160,
                     "_why": "min(style delivery, source); all four clips are 4K"},
        "speedSegments": {
            "_why": "human 2026-09-29: session A's silent demo stretches are sped up, not cut",
            "ffOutFrames": ff_out, "ffSfx": "audio/sound-effects/freesound_community-fast-forward-5980.mp3",
            "compressSpeed": COMPRESS_SPEED, "compressMinSeconds": COMPRESS_MIN_S, "ffMinSeconds": FF_MIN_S,
            "insetDuringFF": "slides out, then back. Human 2026-09-29; permitted by style.json "
                             "graphics.pip.demoInset.mayHide, so not an override",
        },
        "sections": [{"session": s, "name": nm, "start": lo, "end": (None if hi > 1e8 else hi),
                      "silenceThresholdSeconds": t, "mode": m}
                     for s, nm, lo, hi, t, m in SECTIONS],
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
    for k in ("speech", "compress", "ff"):
        ks = [s for s in segs if s["kind"] == k]
        print(f"  {k:8s} {len(ks):3d} segs  {sum(s['endFrame']-s['startFrame'] for s in ks)/fps:7.1f}s source"
              f" -> {sum(s['outFrames'] for s in ks)/fps:7.1f}s on the cut")
    for sec in ("intro", "demo", "outro"):
        f = sum(s["outFrames"] for s in segs if s["section"] == sec)
        print(f"  {sec:6s} {f/fps/60:5.2f} min")
    print(f"wrote {a.out}")


main()
