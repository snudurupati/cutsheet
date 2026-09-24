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

VOICE_CHAIN = ("adeclip,highpass=f=60:p=2,"
               "equalizer=f=140:t=q:w=1.0:g=1,equalizer=f=280:t=q:w=1.1:g=-3,"
               "equalizer=f=3400:t=q:w=2.0:g=4,deesser=i=0.4:m=0.5:f=0.5")


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

    # Intro and outro only, flat, no ducking.
    #
    # INTRO_END is the director's mark, not a derived number: he wants the bed to
    # have finished tapering by "so let's get started with the demo" at 2:28, which
    # is 20s before the demo scene actually enters. So the fade LANDS on 148.0
    # rather than running until the section boundary.
    #
    # The outro needs 224.0s and the track is 168.86s, so one placement cannot cover
    # it. It used to be trimmed to the track length, which left the last 55.1s of the
    # video (the whole closing argument and the end card) with no bed at all. A
    # second placement picks the track up again for the remainder and carries the
    # final fade.
    INTRO_END = d0                    # 04: the bed runs under the hook and takeover, up to the demo
    fade = st["musicFadeOutSeconds"]
    intro_len = min(td, INTRO_END)
    outro_len = min(td, total - d1)
    tail_len = max(0.0, (total - d1) - outro_len)
    music = {"track": track, "trackLufs": tl, "targetLufs": round(target, 1), "gainDb": gain,
             "_why": (f"style.json musicBedDb {st['musicBedDb']} relative to the measured voice. "
                      f"Not ducked: style.json musicDucking is false, and if a future bed fights "
                      f"the voice the instruction is to lower it before reaching for a sidechain."),
             "placements": [
                 {"id": "m1", "start": 0.0, "trim": [0.0, round(intro_len, 2)],
                  "fadeOut": {"at": round(intro_len - fade, 2), "dur": fade},
                  "beat": "intro, under the hook and the analogy"},
                 {"id": "m2", "start": round(d1, 2), "trim": [0.0, round(outro_len, 2)],
                  "fadeOut": {"at": round(outro_len - fade, 2), "dur": fade}
                             if tail_len <= 0.01 else {"at": round(outro_len, 2), "dur": 0.01},
                  "beat": "outro, from where he returns to camera"},
             ]}
    if tail_len > 0.01:
        music["placements"].append(
            {"id": "m3", "start": round(d1 + outro_len, 2), "trim": [0.0, round(tail_len, 2)],
             "fadeOut": {"at": round(tail_len - fade, 2), "dur": fade},
             "beat": "outro continued, so the close and the end card are not dry"})

    # Structural beats only. style.json sfxPerVideoMax is 6 and the skill says sparse:
    # transitions and the hook. Nothing lands inside the demo, where the screen is
    # doing the work.
    # Every effect is placed AT a boundary the cutsheet already knows, and is
    # looked up by part id rather than written as a number. These were literals
    # (18.2 / 85.0 / 1494.0) and happened to still be right, which is the whole
    # danger: they are the takeover in/out points, so the first cut change that
    # moved g003 or g028 would have left a woosh landing over nothing, with
    # every count and duration still perfect. Hard rule 12.
    parts = {p["id"]: p for p in json.load(open(a.cutsheet))["parts"]}

    def at(pid, edge):
        p = parts.get(pid)
        if p is None:
            sys.exit(f"sfx anchored to {pid}, which is not in the cutsheet any more")
        if p["class"] != "segment":
            sys.exit(f"sfx anchored to {pid}, which is a {p['class']} now, not a "
                     "full-frame takeover. A transition effect over a card is wrong")
        return round(p[edge], 2)

    # the hook card enters 0.2s before "because" (human 2026-09-23: not on frame 0), so
    # its effect is derived from the same cue, never typed in
    words = json.load(open(os.path.join(a.job, "outputs/transcript-cut.json")))["words"]
    bec = next((w for w in words if w["word"].lower().strip(".,") == "because" and w["start"] < 10), None)
    if bec is None:
        sys.exit("hook cue 'because' not found in the first 10s of the cut transcript")
    hook_at = round(max(0.0, bec["start"] - 0.2), 2)
    # 04-lightweight-ontology: transitions and the hook only, sparse (style.json sfxPerVideoMax)
    want = [
        ("s1", "ribhavagrawal-cinematic-reveal-type-01-265535", hook_at, "the hook lands"),
        ("s2", "musicmbuildings-deep-and-cinematic-woosh-sound-effect-318325",
         at("g03", "start"), "the committee takeover enters, full frame"),
        ("s3", "ribhavagrawal-cinematic-transition-type-02-265533",
         at("g03", "end"), "the takeover leaves, back to the face"),
        ("s4", "ribhavagrawal-woosh-230554", round(d0, 2), "demo scene enters"),
        ("s5", "ribhavagrawal-woosh-230554", round(d1, 2), "demo scene leaves, the close begins"),
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
        "voiceChain": VOICE_CHAIN,
        "_voiceChainWhy": ("adeclip: the OBS filter order (Limiter before a +8 dB Compressor) clipped "
                           "83 seconds of the cut; flat factor 8.67 -> 0.00 on the densest 20s. "
                           "highpass 60Hz: rumble -1.7 dB for -0.1 dB of chest (75Hz cost -0.3). "
                           "EQ: variant A (03-project-context's by-ear choice, same mic and room) "
                           "PENDING the human's A/B of A / B-gentler / C-flat and declip on/off."),
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
