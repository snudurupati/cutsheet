#!/usr/bin/env python3
"""Write outputs/audio-plan.json: music bed and sound effects, as GAINS.

style.json audio._levelsAreRelativeToVoice: musicBedDb and sfxDb are dB relative
to the MEASURED integrated loudness of the voice on THIS render, not raw gains on
the source files. A track mastered at -10 LUFS and one at -20 must land at the same
bed level, and this job's sfx library spans 14 dB (-4.4 to -18.6), so a flat gain
would put one effect above the voice and leave another inaudible.

So: measure the voice, measure every source, compute each gain.
"""
import argparse, json, os, re, subprocess, sys


def lufs(path, stream="a:0"):
    r = subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-nostats", "-i", path,
                        "-map", f"0:{stream}", "-vn", "-af", "ebur128", "-f", "null", "-"],
                       capture_output=True, text=True)
    m = re.findall(r"I:\s+(-?[\d.]+)\s+LUFS", r.stdout + r.stderr)
    if not m:
        sys.exit(f"could not measure loudness of {path}")
    return float(m[-1])


def dur(path):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                 "-of", "csv=p=0", path], capture_output=True,
                                text=True).stdout.strip())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--render", required=True)
    ap.add_argument("--job", required=True)
    ap.add_argument("--style", required=True)
    ap.add_argument("--cutsheet", required=True)
    ap.add_argument("--transcript", required=True,
                    help="cut-aligned transcript (transcript-cut-v9.json), for word anchors")
    ap.add_argument("--demo", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    st = json.load(open(a.style))["audio"]
    demo = json.load(open(a.demo))
    d0, d1 = demo["enters"]["cutSeconds"], demo["leaves"]["cutSeconds"]
    total = json.load(open(a.cutsheet))["totalSeconds"]

    voice = lufs(a.render)
    print(f"voice on the render: {voice:.1f} LUFS")

    tracks = sorted(f for f in os.listdir(os.path.join(a.job, "audio/soundtracks"))
                    if f.lower().endswith((".mp3", ".wav", ".m4a")))
    if not tracks:
        sys.exit("no soundtrack in the job")
    if len(tracks) > 1:
        sys.exit(f"{len(tracks)} soundtracks; which one is a human choice, not mine")
    track = os.path.join("audio/soundtracks", tracks[0])
    tl = lufs(os.path.join(a.job, track))
    td = dur(os.path.join(a.job, track))
    target = voice + st["musicBedDb"]
    gain = round(target - tl, 1)
    print(f"music {tracks[0]}\n  source {tl:.1f} LUFS -> target {target:.1f} -> gain {gain:+.1f} dB")

    # Section layout, chosen by the human for this video on 2026-11-13 ("Sections,
    # like 2.1/04"), fitted to a track that is only 144.0s long:
    #   - the bed runs from 0:00 (human review 2026-11-13, finding 1: "Music
    #     should start at 0:00". The earlier dry cold open was this job's plan
    #     decision, not a style law; the override is recorded in style.json);
    #   - ... carried through the body intro to the demo entry (1:35), the fade
    #     landing on the boundary;
    #   - NOTHING under the 16-minute demo. The screen is doing the work there;
    #   - two brief lifts: the cowboy beat (gZ9) and the takeaway block (g22);
    #   - a continuous outro from where he returns to camera. The outro needs
    #     392.7s and the track is 144.0s, so it restarts from the top of the track
    #     until it covers the end (the m1/m1b/m2 continuation the human approved
    #     on 03), with the final 1.5s fade landing under the end card.
    # Every boundary is looked up by part id or word in the cut transcript, never
    # typed as a literal. Hard rule 12.
    parts = {p["id"]: p for p in json.load(open(a.cutsheet))["parts"]}

    def at(pid, edge):
        p = parts.get(pid)
        if p is None:
            sys.exit(f"bed/sfx anchored to {pid}, which is not in the cutsheet any more")
        return round(p[edge], 2)

    tx = json.load(open(a.transcript))
    wlist = tx["words"] if isinstance(tx, dict) and "words" in tx else tx

    def word(w, pick=0):
        hits = [x for x in wlist
                if (x.get("word") or x.get("text", "")).strip().lower().rstrip(".,") == w]
        if len(hits) <= pick:
            sys.exit(f"bed/sfx anchored to the word '{w}', which the cut transcript "
                     f"does not contain ({len(hits)} hits, wanted #{pick})")
        return round(float(hits[pick].get("start")), 2)

    fade = st["musicFadeOutSeconds"]
    placements = []

    def seg(mid, s, e, beat, hard=False):
        s, e = round(s, 2), round(e, 2)
        ln = round(e - s, 2)
        if ln <= 0.01:
            sys.exit(f"{mid} spans {ln}s, nothing to place")
        if ln > td + 0.01:
            sys.exit(f"{mid} wants {ln}s of a {td:.1f}s track")
        fo = ({"at": round(ln, 2), "dur": 0.01} if hard
              else {"at": round(ln - fade, 2), "dur": fade})
        # a bed that starts at 0:00 enters on a short fade, never a hard 0->gain
        # jump (a click at the file head). Mid-video segments keep the hard
        # entry: that is the section feel the human chose.
        fi = {"at": 0.0, "dur": 0.8} if s == 0.0 else None
        placements.append({"id": mid, "start": s, "trim": [0.0, ln], "fadeOut": fo,
                           "fadeIn": fi,
                           "beat": beat})

    seg("m1", 0.0, d0,
        "body intro, from 0:00 (human review finding 1) to the demo entry")
    seg("m2", at("gZ9", "start"), at("gZ9", "end"),
        "brief lift under the cowboy beat")
    seg("m3", at("g22", "start"), at("g22", "end"),
        "brief lift under the takeaway block")
    t, n = d1, 4
    while total - t > 0.01:
        ln = min(td, total - t)
        seg(f"m{n}", t, t + ln,
            "outro, from where he returns to camera" if n == 4
            else "outro continued, so the close and the end card are not dry",
            hard=(total - t) > td + 0.01)
        t += ln
        n += 1

    music = {"track": track, "trackLufs": tl, "targetLufs": round(target, 1), "gainDb": gain,
             "_why": (f"style.json musicBedDb {st['musicBedDb']} relative to the measured voice. "
                      f"Not ducked: style.json musicDucking is false, and if a future bed fights "
                      f"the voice the instruction is to lower it before reaching for a sidechain. "
                      f"Sections per the human on 2026-11-13; the orchestral-outro sfx stays out "
                      f"because the bed tail already carries the end card and PLAN.md forbids "
                      f"running both.")}
    music["placements"] = placements

    # Structural beats only. style.json sfxPerVideoMax is 6 and the skill says
    # sparse. Five placements, per PLAN.md. No effect lands inside the demo except
    # the three zoom-card wooshes and the typing texture, and none of them sits
    # over narration the audience needs. The orchestral outro under g27 was left
    # out at the mix: the bed tail fades out under the end card, and PLAN.md says
    # never both.
    want = [
        ("s1", "musicmbuildings-deep-and-cinematic-woosh-sound-effect-318325",
         word("baseline"), "the hook's rail shatters on 'baseline of chaos' (g01)"),
        ("s2", "ribhavagrawal-woosh-230554", at("gZ3", "start"),
         "the punch-in zoom card enters (gZ3)"),
        ("s3", "ribhavagrawal-woosh-230554", at("gZ7", "start"),
         "the punch-in zoom card enters (gZ7)"),
        ("s4", "ribhavagrawal-woosh-230554", at("gZ15c", "start"),
         "the LeRobot schema card enters (gZ15c)"),
        ("s5", "hauntsync-mechanical-keyboard-typing-sound-effect-ai-made-sfx-473872",
         at("gZ10", "start"), "typing texture under the profiling demo (gZ10)"),
    ]
    for sid, _, at_s, beat in want:
        if at_s > total + 0.01:
            sys.exit(f"{sid} lands at {at_s}s, past the end of a {total}s cut")
    if len(want) > st["sfxPerVideoMax"]:
        sys.exit(f"{len(want)} effects against sfxPerVideoMax {st['sfxPerVideoMax']}")
    sfx = []
    for sid, name, at, beat in want:
        f = os.path.join(a.job, "audio/sound-effects", name + ".mp3")
        if not os.path.exists(f):
            sys.exit(f"missing sfx: {f}")
        sl = lufs(f)
        g = round(voice + st["sfxDb"] - sl, 1)
        sfx.append({"id": sid, "file": name, "at": at, "beat": beat,
                    "sourceLufs": sl, "gainDb": g})
        print(f"  {sid} {beat[:38]:40s} {sl:6.1f} LUFS -> {g:+.1f} dB")

    # nb_frames from the container, not -count_frames: decoding 47k frames of 4K
    # HEVC to learn a number the container already stores costs ten minutes, and
    # every other gate in this pipeline (verify_cut, verify_composite) reads it the
    # cheap way. If the container header ever disagreed with the stream, the
    # duplicate-frame check would be decoding it anyway.
    frames = int(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0",
                                 "-show_entries", "stream=nb_frames",
                                 "-of", "csv=p=0", a.render],
                                capture_output=True, text=True).stdout.strip())
    want = round(total * json.load(open(a.cutsheet)).get("fps", 30))
    if frames != want:
        sys.exit(f"{a.render} has {frames} frames, the cutsheet gives {want}. "
                 "The render and the cut sheet disagree; do not plan audio against it")

    plan = {
        "output": "outputs/finished.mov",
        "measuredAgainst": {"render": a.render, "frames": frames},
        "_measuredAgainstWhy": ("mix_audio.py refuses any input that does not have this "
                                "frame count. Rule 11 shipped old audio on new video and "
                                "passed every count gate, because nothing tied the audio "
                                "decisions to the picture they were measured from."),
        "_outputWhy": ("the file the finishing stage actually writes. export gates promotion on "
                       "this rather than picking the newest render by mtime: on 2026-08-31 a "
                       "picker filtered to *.mp4, could not see finished.mov, and planned to "
                       "promote the graphics pass (no music, no sfx) then delete the only file "
                       "that had them."),
        "_levelsAreRelativeToVoice": st["_levelsAreRelativeToVoice"],
        "voiceLufs": round(voice, 1),
        "voiceEq": st["_voiceEq"],
        "deliveryTarget": {"lufs": -14.0, "truePeakDb": -1.5,
                           "_why": ("the platform normalisation point, so nothing is turned down "
                                    "on upload. Not in style.json; chosen here and flagged.")},
        "music": music,
        "sfx": {"gainRule": st["sfxDb"], "placements": sfx},
    }
    json.dump(plan, open(a.out, "w"), indent=1)
    print(f"\nwrote {a.out}")


main()
