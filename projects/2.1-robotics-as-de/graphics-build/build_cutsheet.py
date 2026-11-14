#!/usr/bin/env python3
"""Build transcript/cutsheet.json from the word-aligned transcript.

Two sessions (A 20:47, B 21:09). A is the talking-head intro: its screen clip is
the Obsidian script used as a teleprompter, so A uses the camera only. B is the
demo (GitHub, Claude Code, Rerun, DuckDB) then the outro to camera. Adapted from
05-agent-swarm: every segment carries its session, its own cam/screen paths and
frames LOCAL to that cam, and nothing builds a shared source timeline.

No fast-forward or compress segments on this job: no direction asked for them,
so long waits in the demo are cut like any other dead air. The ff/compress code
paths stay because the section mode decides them and none is set to "ff".

Every path and number comes in as an argument (hard rule 12). The only thing
baked in is the editorial list below: judgements about THIS recording.
"""
import os, argparse, json, math, re, struct, subprocess, sys, wave, difflib

# ---------------------------------------------------------------- editorial ---
# (session, lo, hi, why). Seconds on THAT session's camera clip.
KILLS = [
    ("a",    0.00,   94.90, "slate 'mic testing', the 2017 opening twice, 'Cut. Starting all over again.' The third take is kept"),
    ("a",  123.20,  144.90, "'I think it's robotics' x2 and 'Hear me out why', each followed by 'cut'. The last take is kept"),
    ("a",  148.90,  182.20, "first take of 'Modern robotics is not ...' and 'cut, repeat' x2"),
    ("a",  200.10,  226.50, "first take of 'Then it would not be incorrect ...' and 'cut, repeat'"),
    ("a",  273.00,  296.00, "first take of 'Classical robotics works beautifully ...' and 'repeat, cut, repeat'"),
    ("a",  313.30,  323.50, "'It's like teaching my daughter. Cut.' Said in full at 345.8"),
    ("a",  335.50,  345.70, "'It's like teaching my daughter how to ride a bike and holding on' abandoned; restated"),
    ("a",  374.80,  393.70, "first take of the Hugging Face 80,000 datasets line and 'cut and repeat'"),
    ("a",  403.00,  416.00, "'The largest academic' abandoned; restated"),
    ("a",  426.50,  456.70, "three takes of 'that's before you count all the teleoperation' with two 'cut and repeat'. The last take is kept"),
    ("a",  480.60,  486.40, "'however the problems faced by robotics' restated as 'however the challenges faced by robotics companies'"),
    ("a",  525.00,  531.30, "'Physical telemetry is highly multimodal and highly, cut, repeat.'"),
    ("a",  561.10,  569.70, "'and the state of' abandoned mid-list, then 7s of silence; reads 'the commands it was issued and the timestamp'"),
    ("a",  575.00,  600.90, "first take of 'the primary challenge here shifts ...'"),
    ("a",  610.10,  648.40, "'And if the streams drift out of sync even for a single second' abandoned; restated as 'a single frame'"),
    ("a",  671.00,  680.80, "'that's exactly what I plan to show in the next series' abandoned; restated"),
    ("a",  687.00,  724.30, "'So for the next 13 weeks, I'll be building' abandoned; restated"),
    ("a",  732.00,  749.70, "'And along the way, I'll cover data engineering,' abandoned; restated"),
    ("a",  873.40,  909.70, "'the pair of data is what?' then a 28s pause reading; restated from 'Every time I move the leader'"),
    ("a",  925.00,  930.00, "'The pair repeated.' abandoned; restated"),
    ("a", 1006.50, 1012.10, "'Cut, pause.' end of session A"),
    ("b",    0.00,   14.10, "pre-roll before 'let's get started with the demo'"),
    ("b",   99.80,  142.10, "housekeeping: 'let me open up a different project ... Click projects ... let me go to terminal'"),
    ("b",  255.00,  293.00, "first take of 'the data set was downloaded' and an aside about the keyword 'cut', then 'Retake'"),
    ("b",  301.10,  325.20, "'before I talk about what I'm showing you ... So what is an episode?' then 'cut and retake'. Resumes 'so before I talk about what's going on let me run a simulation'"),
    ("b",  767.08,  769.38, "'conspicuously' said twice with a 1.4s pause; the second is kept"),
    ("b",  828.90,  880.80, "'Now let's query ... one more table ... We already had this cut. Cut restart.' The second query is explained at 919"),
    ("b",  886.00,  918.90, "'The first SQL' left dangling, then 'the second SQL tells me the location or the...' abandoned"),
    ("b", 1101.40, 1117.50, "first take of 'One, modern robotics learns from data.'"),
    ("b", 1167.50, 1187.40, "'And three, and the most important ...' x3. The last start is kept"),
    ("b", 1229.50, 1232.95, "'i can tell you operator norm': unintelligible to the transcript. Reads 'In two weeks, I can take a robot data set apart'"),
]

# (session, name, lo, hi, threshold, mode). A is all talking head. B's demo runs
# from 'let's get started with the demo' to the end of the join query; the screen
# agrees (desktop by 1000s) and the outro starts 'so I started off by saying' at 1007.6.
SECTIONS = [
    ("a", "intro",   0.0,    1e9, 0.70, "cut"),
    ("b", "demo",    0.0, 1000.0, 2.50, "cut"),
    ("b", "outro", 1000.0,   1e9, 0.70, "cut"),
]

PAD_HEAD = 0.15
PAD_TAIL = 0.28
# Joins need breath, not a fixed pad (rough-cut skill; human 2026-10-17: "why I think so" ran straight
# into "Modern robotics"). After a sentence end the tail runs SENT_TAIL into the recording's own
# silence, and the join's total pause is brought to at least SENT_PAUSE using the next segment's
# leading silence if the tail cannot get there. Every pad is then clamped to the AUDIO: it stops
# GUARD before the next speech onset and starts GUARD after the previous speech offset, so a pad can
# never catch part of another word (the 0:43 "and no-, not as much" stutter came from a 0.28s tail
# that ran into an untranscribed "not").
SENT_TAIL = 0.60
SENT_PAUSE = 0.70
GUARD = 0.04
SPEECH_DB = 20.0            # sound (a word's edges, a soft stutter) = 10ms RMS this far above room tone
VOICE_DB = 28.0             # voiced speech; a breath intake sits between the two and belongs to a pause
HOP = 0.01
FILLER = re.compile(r"^(uh|um|uhm|erm|er|ah)$")
MIN_RECLAIM = 1.00          # a jump cut must buy back a second (03-project-context)
FF_MIN_S = 60.0             # the three agent builds are 181-445s; the next longest gap is 29s
FF_SFX_S = 8.736            # audio/sound-effects/freesound_community-fast-forward-5980.mp3
COMPRESS_SPEED = 4.0
COMPRESS_MIN_S = 5.0        # shorter pauses stay at 1x: a 2s pause at 4x is half a second of
                            # jittering face, which reads as a glitch, not as time passing

# "So, see you then." ends 1313.27; the end card holds about 3s under it.
# Provisional: checked on frames in the graphics stage.
TAIL_HOLD = ("b", 39489)


DROPS_ALL = []
ROOM_TONE = {}
WORDS_ALL = []       # the refined word list (re-listen merged in): what every audit reads


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


def rms_track(path):
    w = wave.open(path); sr = w.getframerate(); n = w.getnframes()
    x = struct.unpack(f"<{n}h", w.readframes(n)); w.close()
    hop = int(sr * HOP)
    return [10 * math.log10(sum(v * v for v in x[i:i + hop]) / hop / 32768.0 ** 2 + 1e-12) for i in range(0, n - hop, hop)]


def gap_drops(gaps_path, words_by_sid, quiet_screen, repeat_ok_pause=lambda *a: True):
    """Cut decisions from probe_gaps.py's independent re-listen of every flagged gap.
    A run is DROPPED when what was said in it is only filler (uh/um), or literally repeats a
    transcribed word next to it (the copy WhisperX kept). Fillers in the demo are cut only where the
    screen is still, so the picture does not jump. Runs with nothing in them (breaths) are kept."""
    drops = []
    for f in json.load(open(gaps_path)):
        if f["session"] not in words_by_sid:
            continue
        toks = [re.sub(r"[^a-z0-9']", "", t.lower()) for t in f.get("inRun", "").split()]
        toks = [t for t in toks if t]
        if not toks:
            continue
        sid, r0, r1 = f["session"], f["src"][0], f["src"][1]
        # a repeat matches the words IMMEDIATELY next to the run, before or after it within 0.8s (an
        # abandoned copy then the kept one, or the kept one then a stutter). A lone word that matches
        # nothing adjacent may be the real word, misaligned, and is kept.
        norm_ = lambda t: re.sub(r"[^a-z0-9']", "", t.lower())
        ws_ = words_by_sid[sid]
        content = [t for t in toks if not FILLER.match(t)]
        before = [norm_(w["word"]) for w in ws_ if r0 - 0.8 <= w["end"] <= r0 + 0.02][-2:]
        after = [norm_(w["word"]) for w in ws_ if r1 - 0.02 <= w["start"] <= r1 + 0.8][:2]
        near = set(before) | set(after)
        filler = all(FILLER.match(t) for t in toks)
        repeat = all(t in near or FILLER.match(t) for t in toks)
        if filler and not quiet_screen(sid, r0, r1):
            continue
        if filler and not repeat_ok_pause(sid, r0, r1):
            continue                    # removing it would butt the neighbouring words together
        if filler or repeat:
            ws_ = words_by_sid[sid]
            lo = max([r0 - 0.03] + [w["end"] + 0.005 for w in ws_ if w["end"] <= r0 + 0.02])
            hi = min([r1 + 0.03] + [w["start"] - 0.005 for w in ws_ if w["start"] >= r1 - 0.02])
            if hi - lo < 0.06:
                continue
            drops.append((sid, lo, hi, f"{'filler' if filler else 'repeat'} '{f['inRun']}' (independent re-listen)"))
    return drops


_norm = lambda t: re.sub(r"[^a-z0-9']", "", t.lower())


def refine_words(words, relisten, sid):
    """Put back what WhisperX merged or dropped, from probe_gaps.py's independent re-listen.
    A LONGWORD span is replaced by the words heard inside it ("data." 4.8s -> "data. Every time,
    every time I move"); an UNCOVERED run gets the words heard in it inserted. Words that belong to
    a neighbouring transcribed word (same time) are skipped, so nothing is doubled."""
    out = list(words)
    for f in relisten:
        if f["session"] != sid or f["kind"] not in ("LONGWORD", "UNCOVERED") or not f.get("words"):
            continue
        out.sort(key=lambda w: w["start"])
        r0, r1 = f["src"]
        if f["kind"] == "LONGWORD":
            orig = next((w for w in out if abs(w["start"] - r0) < 0.01), None)
            if orig is None:
                continue
            nxt = [w for w in out if w["start"] > orig["start"] + 0.01]
            stop = nxt[0]["start"] - 0.03 if nxt else orig["end"] + 0.5
            heard = [x for x in f["words"] if orig["start"] - 0.05 <= x[1] < stop]
            if len(heard) < 2:
                continue
            out.remove(orig)
            lo_, hi_ = orig["start"], (nxt[0]["start"] - 0.01 if nxt else max(orig["end"], heard[-1][2]))
        else:
            heard = [x for x in f["words"] if r0 - 0.12 <= x[1] <= r1
                     and not any(w["start"] - 0.02 <= x[1] < w["end"] + 0.08 for w in out)]   # its own gap, not a neighbour heard late
            if not heard:
                continue
            lo_, hi_ = r0 - 0.12, r1 + 0.05
        for k, (wd, ws, we) in enumerate(heard):
            st = max(ws, lo_) if k == 0 else ws
            en = min(we, heard[k + 1][1]) if k + 1 < len(heard) else min(we, hi_)
            out.append({"word": wd, "start": round(st, 3), "end": round(max(en, st + 0.03), 3),
                        "session": sid, "relisten": True})
    return sorted(out, key=lambda w: w["start"])


def find_repeats(words, max_n=6, max_skip=2, window=3.0):
    """Retakes in a word list: a phrase said again straight after (fillers between allowed; the last
    word may be a prefix of its retake, "state states"), or a RESTART: a 2+ word opening, up to
    max_skip abandoned words, then the same opening again ("specifically the little bot, specifically
    the LeRobot", "because of, you know, because of"). Returns (first copy start idx, retake start idx)."""
    toks = [(i, _norm(w["word"])) for i, w in enumerate(words) if _norm(w["word"]) and not FILLER.match(_norm(w["word"]))]
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


def repeat_kills(words, sid):
    """Every retake in the session's (refined) word list: the first copy is a false start, so it is
    cut from its first word to the retake's first word. The retake is always the one kept."""
    kills = []
    for a, b in find_repeats(words):
        w1, w2 = words[a], words[b]
        prev = words[a - 1]["end"] + 0.005 if a > 0 else 0.0
        text = " ".join(w["word"] for w in words[a:b + 1])
        kills.append((sid, max(w1["start"] - 0.01, prev), w2["start"] - 0.005, f"retake '{text}': first copy cut"))
    return kills


def render_kills(path, words, sid):
    """Retakes only the independent re-listen of the RENDER heard (map_render_repeats.py), already in
    source time. A boundary inside a transcribed word moves out of it, never into it."""
    out = []
    for k in json.load(open(path)):
        if k["session"] != sid:
            continue
        lo, hi = k["start"], k["end"]
        # the render's own timing is the evidence here: a transcribed word stretched over the false
        # start ("and" 195.07-195.51 covering "not,") is trimmed to the cut, not the cut to the word
        for w in words:
            if w["start"] + 0.05 < lo < w["end"]: w["end"] = lo - 0.002
            elif w["start"] < lo < w["end"]: lo = w["end"] + 0.005
            if w["start"] < hi < w["end"] - 0.05: w["start"] = hi + 0.002
            elif w["start"] < hi < w["end"]: hi = w["start"] - 0.005
        if hi - lo >= 0.06:
            out.append((sid, lo, hi, f"retake '{k['text']}' heard in the render: first copy cut"))
    return out


def relisten_fillers(words, quiet_screen, voiced_runs, sid):
    """Fillers the re-listen put back (they were hiding in long spans). WhisperX's times for them
    are off by up to 0.6s, so the cut comes from the AUDIO: between the neighbouring words' real
    sound, only the voiced run(s) go and the silence either side stays. A filler is cut only where
    the screen is still and at least 0.18s (0.5s after a sentence) of that silence remains, so words never butt together.
    The filler word itself leaves the word list (the cut is word-less, fenced by the pads)."""
    out, gone = [], []
    for i, w in enumerate(words):
        if not w.get("relisten") or not FILLER.match(_norm(w["word"])) or i == 0 or i + 1 >= len(words):
            continue
        prev, nxt = words[i - 1], words[i + 1]
        if FILLER.match(_norm(nxt["word"])) or not quiet_screen(sid, w["start"], w["end"]):
            continue
        g0, g1, rs = voiced_runs(sid, prev["end"], nxt["start"])
        if not rs or (rs[0][0] - g0) + (g1 - rs[-1][1]) < (0.5 if re.search(r"[.?!]$", prev["word"]) else 0.18):
            continue
        out.append((sid, rs[0][0] - 0.02, rs[-1][1] + 0.02, f"filler '{w['word']}' (independent re-listen, cut on the audio)"))
        gone.append(w)
    for w in gone:
        words.remove(w)
    return out

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--transcript", required=True)
    ap.add_argument("--activity", required=True, help="graphics-build/screen-activity.json")
    ap.add_argument("--out", required=True)
    ap.add_argument("--fps", type=float, required=True)
    ap.add_argument("--audio", action="append", required=True, help="session=voice wav (16k)")
    ap.add_argument("--gaps", required=True, help="transcript/gaps.json from probe_gaps.py")
    ap.add_argument("--style", default="", help="styles/<style>/style.json: cut.sectionPause for the section beats")
    ap.add_argument("--overrides", default="", help="transcript/cut-overrides.json: judged fixes, applied last")
    ap.add_argument("--render-kills", default="", help="transcript/render-retakes.json from map_render_repeats.py")
    ap.add_argument("--relisten", default="", help="probe_gaps.py output carrying word times (gaps-v2.json): long spans split, retakes cut")
    a = ap.parse_args()
    TR = {}
    for spec in a.audio:
        sid_, path = spec.split("=", 1); tr_ = rms_track(path); TR[sid_] = (tr_, sorted(tr_)[len(tr_) // 10])
    # each session's room tone: the 3s window whose LOUDEST 10ms frame is quietest (no breath, no
    # click), never digital zero. Mutes are filled with it so the air never drops out.
    ROOM_TONE.clear()
    for sid_, (tr_, fl_) in TR.items():
        n3 = int(6.0 / HOP); best = None          # 6s: the end-card hold mutes ~5.7s
        for i in range(0, len(tr_) - n3, int(0.5 / HOP)):
            w_ = tr_[i:i + n3]
            if min(w_) < fl_ - 12: continue
            if best is None or max(w_) < best[0]: best = (max(w_), i * HOP)
        ROOM_TONE[sid_] = [round(best[1], 3), round(best[1] + 6.0, 3)]
    def speaking(sid_, t, db=SPEECH_DB):
        tr_, fl = TR[sid_]; i = int(t / HOP)
        return 0 <= i < len(tr_) and tr_[i] > fl + db
    # WhisperX's word ends are early and its starts late, so the audio around a boundary is still the
    # word itself. These first step past the word's own sound (up to 0.6s), then find the silence.
    def sound_end(sid_, t, limit=0.6, bridge=0.0):
        # bridge: carry on across a silence shorter than this (the closure of a "p" or "k" mid-phrase).
        # Bridging follows VOICED sound only: a breath between sentences is not part of the word.
        k, last = 0.0, 0.0
        while k < limit:
            if speaking(sid_, t + k, VOICE_DB if bridge else SPEECH_DB): last = k + HOP
            elif k - last >= bridge: break
            k += HOP
        return t + last
    def sound_start(sid_, t):
        k = 0.0
        while k < 0.6 and speaking(sid_, t - k): k += HOP
        return t - k
    def onset_after(sid_, t, limit=3.0):
        t = sound_end(sid_, t); k = 0.0
        # the next speech is a voiced run of 40ms+, not the 10-20ms release of the word's last consonant
        while k < limit and not all(speaking(sid_, t + k + j * HOP, VOICE_DB) for j in range(4)): k += HOP
        # back off to where that next sound starts rising, so the tail never clips into it
        return sound_start(sid_, t + k) if k < limit else t + k
    def offset_before(sid_, t, limit=3.0):
        # step back past the word's own onset (pre-voicing blips like "#.++###" are the word itself),
        # then find previous speech: a voiced run of at least 40ms, never a lone 10ms blip
        t = sound_start(sid_, t) - 0.10; k = 0.0
        while k < limit and not all(speaking(sid_, t - k - j * HOP, VOICE_DB) for j in range(4)): k += HOP
        return sound_end(sid_, t - k) if k < limit else t - k
    fps = a.fps
    ff_out = round(FF_SFX_S * fps)

    tr = json.load(open(a.transcript))
    act = json.load(open(a.activity))
    all_words = [w for w in tr["word_segments"] if "start" in w and "end" in w]

    segs, doc_sessions, n = [], [], 0
    DROPS_ALL.clear(); WORDS_ALL.clear()
    OV = json.load(open(a.overrides)) if a.overrides else {}
    tail_hold = (OV["tailHold"]["session"], OV["tailHold"]["frame"]) if "tailHold" in OV else TAIL_HOLD
    edges_left = list(OV.get("edges", []))
    SECTION_PAUSE = json.load(open(a.style))["cut"]["sectionPause"] if a.style else None
    if OV.get("beats") and SECTION_PAUSE is None:
        sys.exit("beats listed in the overrides but no --style to take cut.sectionPause from")
    beats_left = [(b_, side) for b_ in OV.get("beats", []) for side in ("prev", "next")]
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

        def quiet_screen(sid_, lo, hi):
            if sid_ != "b" or section_of(sid_, lo)[1] != "demo":
                return True
            return changing(lo - 0.5, hi + 1.0) == 0
        # a filler is cut only if at least 0.10s of real silence would remain around the join
        def pause_ok(sid_, r0, r1):
            before = [w for w in words if w["end"] <= r0 + 0.02]; after = [w for w in words if w["start"] >= r1 - 0.02]
            if not before or not after:
                return True
            sil = (r0 - sound_end(sid_, before[-1]["end"])) + (sound_start(sid_, after[0]["start"]) - r1)
            # frame rounding and the guard eat ~0.05s; after a sentence the join needs a real breath
            return sil >= (0.5 if re.search(r"[.?!]$", before[-1]["word"]) else 0.18)
        # between two words' real sound: (sound end of the first, sound start of the second, voiced runs between)
        def voiced_runs(sid_, t0, t1):
            g0, g1 = sound_end(sid_, t0), sound_start(sid_, t1)
            rs, st = [], None
            for k in range(int(g0 / HOP), int(g1 / HOP)):
                on = speaking(sid_, k * HOP)
                if on and st is None: st = k * HOP
                if not on and st is not None:
                    if k * HOP - st >= 0.06: rs.append((st, k * HOP))
                    st = None
            if st is not None and g1 - st >= 0.06: rs.append((st, g1))
            return g0, g1, rs
        drops = [d for d in gap_drops(a.gaps, {sid: words}, quiet_screen, pause_ok) if d[0] == sid] if sid in TR else []
        if a.relisten and sid in TR:
            rl = json.load(open(a.relisten))
            words = refine_words(words, rl, sid)
            drops += relisten_fillers(words, quiet_screen, voiced_runs, sid)
        for r in OV.get("rewords", []):                 # judged: a span WhisperX squeezed, re-listened
            if r["session"] == sid:
                lo_, hi_ = r["range"]
                words = sorted([w for w in words if not lo_ <= w["start"] < hi_]
                               + [dict(x, session=sid, relisten=True) for x in r["words"]], key=lambda w: w["start"])
        if sid in TR:
            drops += repeat_kills(words, sid)
            if a.render_kills:
                drops += render_kills(a.render_kills, words, sid)
        for k in OV.get("unkills", []):                 # judged: this drop was wrong
            if k["session"] == sid:
                n0 = len(drops); drops = [d for d in drops if abs(d[1] - k["near"]) > 0.03]
                if len(drops) == n0: sys.exit(f"override unkill {k} matches no drop")
        drops += [(sid, k["range"][0], k["range"][1], "judged: " + k["why"]) for k in OV.get("kills", []) if k["session"] == sid]
        # a cut boundary that lands inside a word (refined words can overlap by a few ms) steps out of it:
        # the start forward past the word's end, the end back before the word's start
        # judged cuts sit where the AUDIO says: a mistimed word overlapping one is trimmed to it instead
        for _, lo, hi, why_ in [d for d in drops if d[3].startswith("judged")]:
            for w in words:
                if w["start"] < lo < w["end"]: w["end"] = max(w["start"] + 0.01, lo - 0.002)
                if w["start"] < hi < w["end"]: w["start"] = min(w["end"] - 0.01, hi + 0.002)
        def unbisect(lo, hi):
            for w in words:
                if w["start"] < lo < w["end"]: lo = w["end"] + 0.002
            for w in words:
                if w["start"] < hi < w["end"]: hi = w["start"] - 0.002
            return lo, hi
        drops = [(sd, *unbisect(lo, hi), why) for sd, lo, hi, why in drops]
        drops = [d for d in drops if d[2] - d[1] >= 0.04]
        DROPS_ALL.extend(drops)
        WORDS_ALL.extend(words)
        kills = [(lo, hi, why) for s, lo, hi, why in KILLS + drops if s == sid]
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
            first, last = sp[0], sp[-1]
            sent = bool(re.search(r"[.?!]$", last["word"]))
            # head: PAD_HEAD before the first word, never earlier than just after the previous speech
            true_on = sound_start(sid, first["start"])                  # where the first word really starts
            s = min(max(first["start"] - PAD_HEAD, offset_before(sid, first["start"]) + GUARD), true_on - 0.03)
            # tail: into the recording's own silence, SENT_TAIL after a sentence, PAD_TAIL otherwise,
            # never reaching the next speech onset (which may be a killed retake: the kill boundary
            # itself no longer clamps the tail, the audio does)
            # where the last word really ends: near retakes WhisperX ends a phrase up to ~1s early
            # ("because of how physical world works" lost its last three words), so follow the sound
            true_off = sound_end(sid, last["end"], 1.2, bridge=0.12)
            e = min(max(last["end"], true_off) + (SENT_TAIL if sent else PAD_TAIL - 0.1), onset_after(sid, last["end"]) - GUARD)
            e = max(e, true_off + 0.03)
            # a span must still never run INTO a kept-out word
            # a kill stops a pad only at its first/last actual WORD, not at its hand-placed boundary
            # (those sit right against the kept word and stole every sentence's pause)
            for lo, hi, _ in kills:
                kw = [w for w in words if lo <= w["start"] < hi]
                if not kw:                                   # a dropped filler/stutter run: fence it
                    if s < hi <= first["start"] + 0.01: s = max(s, hi)
                    if last["end"] - 0.01 <= lo < e: e = min(e, lo)
                    continue
                if s < kw[-1]["end"] + GUARD and kw[-1]["end"] <= first["start"]: s = max(s, kw[-1]["end"] + GUARD)
                if kw[0]["start"] - GUARD < e and kw[0]["start"] >= last["end"]: e = min(e, kw[0]["start"] - GUARD)
            s, e = max(0.0, s), min(e, cam_dur)
            rng.append([round(s * fps), round(e * fps)])
        # neighbouring spans whose pads now meet in one short silence share it at its middle
        for i in range(len(rng) - 1):
            if rng[i][1] > rng[i + 1][0]:
                m = (rng[i][1] + rng[i + 1][0]) // 2
                rng[i][1] = rng[i + 1][0] = m
        # a join after a sentence end gets at least SENT_PAUSE in total: if the tail could not reach
        # it (the next speech came too soon), the next span's head reaches back into its own silence
        for i in range(len(spans) - 1):
            last, first = spans[i][-1], spans[i + 1][0]
            if not re.search(r"[.?!]$", last["word"]):
                continue
            # measured on the SOUND, not WhisperX's times (its starts run late, so a head that looked
            # 0.5s long held 0.05s of silence: "Parquet data." ran straight into "So we saw")
            on = sound_start(sid, first["start"])
            off = min(sound_end(sid, last["end"], 1.2, bridge=0.12), rng[i][1] / fps)
            tail = rng[i][1] / fps - off; head = on - rng[i + 1][0] / fps
            if tail + head >= SENT_PAUSE:
                continue
            want = on - (SENT_PAUSE - tail)
            floor_ = max(offset_before(sid, first["start"]) + GUARD, rng[i][1] / fps + 1 / fps)
            rng[i + 1][0] = min(rng[i + 1][0], round(max(want, floor_) * fps))
            if os.environ.get("DBG") and abs(first["start"] - float(os.environ["DBG"])) < 1:
                print("DBG", last["word"], first["word"], dict(on=on, off=off, tail=tail, head=head, want=want, floor=floor_, set=rng[i + 1][0] / fps), file=sys.stderr)
        # a gap segment owns everything between its neighbours; pads never overlap
        for i, j in enumerate(joins[:-1]):
            if j in ("ff", "compress"):
                if rng[i][1] > rng[i + 1][0]:
                    mid = (rng[i][1] + rng[i + 1][0]) // 2
                    rng[i][1] = rng[i + 1][0] = mid
        # LAST word on every edge: no pass above may leave a span edge inside a cut. The sentence-pause
        # head extension and the overlap midpoint used to, and kept a dropped "uh, but" and a first "once".
        # A kill that holds words is fenced at those words (its hand-placed boundary sits right against
        # the kept word, and fencing there ate every sentence pause next to a retake); a word-less cut
        # (a filler run) is fenced at its own edges.
        fences = []
        for lo, hi, why_ in kills:
            kw = [w for w in words if lo <= w["start"] < hi]
            if why_.startswith("judged"):               # placed on the audio by the judge: exact
                fences.append((lo, hi)); continue
            # at the killed words' SOUND: WhisperX stretches a word's end over the silence after it
            fences.append((max(lo, min(kw[0]["start"], sound_start(sid, kw[0]["start"])) - GUARD),
                           min(hi, sound_end(sid, kw[-1]["start"] + 0.02) + GUARD)) if kw else (lo, hi))
        for r, sp in zip(rng, spans):
            f0, l1 = sp[0]["start"], sp[-1]["end"]
            for lo, hi in fences:
                if os.environ.get("DBG") and abs(f0 - float(os.environ["DBG"])) < 1 and (lo * fps < r[0] < hi * fps or (r[0] <= lo * fps and hi * fps <= r[1])):
                    print("DBG fence", lo, hi, r, file=sys.stderr)
                if lo * fps < r[0] < hi * fps: r[0] = math.ceil(hi * fps)
                if lo * fps < r[1] < hi * fps: r[1] = math.floor(lo * fps)
                # a cut wholly inside the span's head pad (before its first kept word) or tail pad
                if r[0] <= lo * fps and hi * fps <= r[1] and (lo + hi) / 2 < f0: r[0] = math.ceil(hi * fps)
                if r[0] <= lo * fps and hi * fps <= r[1] and (lo + hi) / 2 > l1: r[1] = math.floor(lo * fps)
            if r[1] <= r[0]: sys.exit(f"{sid}: a span lies wholly inside a cut at frame {r[0]}")
        # judged mutes: a stretch with no silence to cut to (a drone, a false start running into the
        # next word) is KEPT in picture with its audio muted, so the join gets a real pause. The span
        # after it starts at the mute.
        mutes = [m for m in OV.get("mutes", []) if m["session"] == sid]
        for m in mutes:
            lo_, hi_ = round(m["range"][0] * fps), round(m["range"][1] * fps)
            inside = [r for r in rng if r[0] <= lo_ and hi_ <= r[1]]
            if inside:
                continue                                    # already in one span: only the audio changes
            hit = [r for r in rng if lo_ - 0.6 * fps < r[0] <= hi_ + 0.1 * fps]
            if len(hit) != 1:
                sys.exit(f"override mute {m['range']} matches {len(hit)} span starts: the cut changed, re-judge it")
            hit[0][0] = lo_                                 # the span after it starts at the mute
        for e in [e for e in edges_left if e["session"] == sid]:   # judged edges, from the audio evidence
            k = 0 if e["edge"] == "start" else 1
            hit = [r for r in rng if abs(r[k] / fps - e["near"]) < 0.05]
            if len(hit) != 1:
                sys.exit(f"override edge {e['edge']} near {e['near']} matches {len(hit)} span edges: the cut changed, re-judge it")
            hit[0][k] = round(e["to"] * fps); edges_left.remove(e)

        # section beats (style cut.sectionPause): the line before keeps up to 0.9s of its own silence,
        # the line after reaches back into its own silence for the rest. Real silence only; both sides
        # are computed the same way in whichever session holds them.
        def beat_edges(b_):
            ps, pe = b_["prev"]; ns_, nst = b_["next"]
            off = sound_end(ps, pe, 1.2, bridge=0.12)
            tail_end = min(off + 0.9, onset_after(ps, pe) - GUARD)
            on = sound_start(ns_, nst)
            head_start = max(on - (SECTION_PAUSE - (tail_end - off)), offset_before(ns_, nst) + GUARD)
            return tail_end, head_start
        for b_, side in [x for x in beats_left if x[0][x[1]][0] == sid]:
            t_ = b_[side][1]; tail_end, head_start = beat_edges(b_)
            if side == "prev":
                hit = [(r, sp) for r, sp in zip(rng, spans) if abs(sp[-1]["end"] - t_) < 0.05]
            else:
                hit = [(r, sp) for r, sp in zip(rng, spans) if abs(sp[0]["start"] - t_) < 0.05]
            if len(hit) != 1:
                sys.exit(f"beat {b_['why']!r} ({side}) matches {len(hit)} spans: the cut changed, re-place it")
            r = hit[0][0]
            if side == "prev": r[1] = max(r[1], round(tail_end * fps))
            else: r[0] = min(r[0], round(head_start * fps))
            beats_left.remove((b_, side))

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
            mr = [m["range"] for m in mutes if rng[i][0] - 3 <= round(m["range"][0] * fps) < rng[i][1]]
            if mr:      # a mute starting within 0.1s of the segment's first frame starts AT it (no sliver)
                segs[-1]["muteRanges"] = [[rng[i][0] / fps if m0 - rng[i][0] / fps < 0.1 else m0, m1] for m0, m1 in mr]
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

        if tail_hold[0] == sid:
            last = segs[-1]
            if not (last["endFrame"] < tail_hold[1] <= cam_frames):
                sys.exit(f"tail hold {tail_hold[1]} not in unused tail "
                         f"({last['endFrame']}..{cam_frames})")
            lw = [w for w in words if w["start"] < last["endFrame"] / fps][-1]
            last.update(endFrame=tail_hold[1], screenEndFrame=tail_hold[1] + head_trim,
                        end=tail_hold[1] / fps, tailHold=True,
                        outFrames=tail_hold[1] - last["startFrame"],
                        # the recording restarts a line after "see you then": hold the picture, not the sound
                        muteFrom=round(lw["end"] + 0.35, 3))

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
        "_sessionsWhy": "two recordings, A (20:47) the intro, B (21:09) the demo and outro. "
                        "Frames are LOCAL to each segment's own cam; tails align, so each "
                        "screen clip's head carries its offset",
        "delivery": {"width": 3840, "height": 2160,
                     "_why": "min(style delivery, source); all four clips are 4K"},
        "sections": [{"session": s, "name": nm, "start": lo, "end": (None if hi > 1e8 else hi),
                      "silenceThresholdSeconds": t, "mode": m}
                     for s, nm, lo, hi, t, m in SECTIONS],
        "kills": [{"session": s, "start": lo, "end": hi, "why": w} for s, lo, hi, w in KILLS],
        "drops": [{"session": s, "start": round(lo, 3), "end": round(hi, 3), "why": w} for s, lo, hi, w in DROPS_ALL],
        "roomTone": ROOM_TONE,
        "words": [{k: w[k] for k in ("word", "start", "end", "session", "relisten") if k in w} for w in WORDS_ALL],
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
    if edges_left or beats_left:
        sys.exit(f"overrides never applied: edges {edges_left}, beats {beats_left}")
    print(f"wrote {a.out}")


main()
