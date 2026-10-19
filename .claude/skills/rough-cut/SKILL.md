---
name: rough-cut
description: Stage 1 of the video pipeline. Turn raw talking-head clips in projects/<job>/raw/ into the shortest cut that still delivers the value — transcribe every word with WhisperX, decide what goes, splice with FFmpeg, and write a cut-aligned transcript for everything downstream. Use whenever a job has footage but no base cut, or the base cut needs re-splicing.
argument-hint: "projects/<job>"
user-invocable: true
allowed-tools: Bash, Read, Write, Edit, AskUserQuestion
---

# Skill 1 — the rough cut

**Whole job:** turn raw talking-head clips into the shortest cut that still delivers the value.

Claude cannot hear audio. It has no idea where a cut should land unless something tells it the
sub-second timing of every word. WhisperX gives exactly that — word-level timestamps with forced
alignment, tight enough that cuts land *on* the breath instead of near it. That is why the rough cut
is the stage Claude nails every time: cutting raw footage down is a pure transcript problem.

Read `brand.md` (mishear list) and `styles/<style>/style.json` before starting.

## The five steps

### 1. Transcribe once, ever

WhisperX `large-v3` with wav2vec2 alignment. Write to `projects/<job>/transcript/transcript.json`.
Re-running this skill **skips straight to the saved copy** — this is the slowest step in the whole
pipeline and it runs exactly once per video, ever.

```bash
[ -f projects/<job>/transcript/transcript.json ] || \
  whisperx projects/<job>/raw/*.mp4 \
    --model large-v3 --align_model WAV2VEC2_ASR_LARGE_LV60K_960H \
    --output_format json --output_dir projects/<job>/transcript/
```

### 2. Transcribe `broll/` too

Creators narrate direction inside their own B-roll takes — "zoom in here", "use this for the pricing
bit". That direction never appears in the main script and it is the highest-signal input the
graphics stage gets. Write those to `transcript/broll-<clip>.json`.

### 3. Write `transcript/cutsheet.json`

An ordered list of segments: source clip, start, end, and **the line of text it contains**. That text
field is not decoration — it lets the whole edit be sanity-checked by reading it, without watching
anything.

```json
{ "segments": [
  { "id": "s001", "src": "raw/a-roll-01.mp4", "start": 12.480, "end": 18.115,
    "text": "Here's the part nobody tells you.", "keep": true, "why": "hook" }
] }
```

### 4. Splice with a single FFmpeg filtergraph

One `trim` per kept segment, `concat`, then polish the audio **once** on the assembled track.

### 5. Write the remapped transcript

A second transcript with every word remapped onto the edited timeline, to
`outputs/transcript-cut.json`. Every downstream skill reads that file. **Nothing re-transcribes,
ever.**

## What gets cut automatically

- Filler words **when they are vestigial**.
- Stutters and false starts.
- Silences over about 0.4 seconds.
- Tangents that do not serve the hook.
- Throat clears, "let me start over".
- Any preamble before the hook lands. **Every video opens on the hook.**

When a line was recorded several times, **take the last one, always**. It is the warmest delivery and
comparing takes wastes an hour.

**Preserve cadence.** Do not surgically remove every "like". Some of them are rhythm. A cut that
reads perfectly on the page and sounds robotic is a failed rough cut.

## Hook selection

`brand.md` sets `defaultHook.mode: derived-per-video`. Before handing off to graphics, propose three
candidate hook lines pulled **verbatim** from the transcript's boldest claim, ranked, and let the
human pick. Only if no line works, fall back to `defaultHook.fallback`.

## The gotchas — none of these are guessable

**Cuts that are not on the frame grid drift audio against video.** Video rounds each segment up to a
whole frame; audio stays sample-exact. About 12ms per join — invisible in any single segment, and
every segment plus the assembled file still probes as valid. Across 92 joins it reached **733ms**,
which is badly out of lip sync. Snap every start and end to `round(t*fps)/fps` (at 60fps and 48kHz,
one frame is exactly 800 samples, so both streams land together), pass `-frames:v N` to pin the
count, and **gate the splice**: sum video and audio duration across all segments and fail above 40ms.

```bash
# in splice.sh, before assembly
python3 -c "...sum ffprobe stream=duration for v:0 and a:0 across segments; exit 1 if |drift| > 0.040"
```

**Counting gates are not enough, and a content gate that reads the cutsheet is circular.** Comparing
the render's audio against `outputs/transcript-cut.json` proves nothing: both were generated from the
same cutsheet, so they agree with each other while both disagree with the picture. The check has to
compare the render against something **upstream of every artefact the edit produced**, which means
the raw footage. Sample a dozen points across the timeline, map each through the cutsheet to its
source frame, pull both frames and compare:

```bash
# a match reads ~0.1 mean pixel difference, a misplaced frame ~3
ffmpeg -v error -ss $CUT_T  -i outputs/base-cut.mov -frames:v 1 -vf scale=480:-2 a.png
ffmpeg -v error -ss $SRC_T  -i raw/<clip>           -frames:v 1 -vf scale=480:-2 b.png
```

**Sample the very start, not just the middle.** When a segment is lifted to the front, the wrong-order
and right-order timelines re-converge after it, so any window past that point matches under both and
reports a pass. Three windows at 45s, 400s and 735s all passed at 98% on a render whose first 73
seconds were out of sync.

**The `select` filter cannot reorder frames, and fails silently when you ask it to.**
`select='between(n,a,b)+between(n,c,d)'` picks frames but always emits them in **source decode
order**. Every video-type skill lifts the hook out of the middle of the take and puts it first, so a
`select`-based splice quietly ignores that move: the audio, built with `atrim`+`concat`, honours the
cutsheet's order while the video does not. The result is a file whose first minute has picture and
sound from different parts of the recording, and it passes **every** count-based gate because the
frames, the samples and the drift are all still correct. Assemble video per segment and join with the
concat demuxer, which respects order.

**Segments must not overlap in the source.** Two kept ranges sharing even one frame diverge between
streams: `select` unions them and emits the frame once, while audio `concat` duplicates it. That is a
33ms video/audio mismatch **per overlap** which sails under the 40ms drift gate while genuinely
repeating a slice of speech. Assert non-overlap on the frame values before splicing.

**A span end must not bisect a word.** Reading word *start* times from a transcript dump and adding a
margin lands the boundary inside the last word, and the splice clips it mid-syllable. On one job this
silently truncated twelve words ("It worked fine", "let's get started", "environment properly").
Select words by start time, then derive the segment edge from the last word's **end**.

**ffmpeg eats stdin and will swallow your job list.** A `while read` loop feeding segment jobs to
ffmpeg silently loses lines — it processed 34 of 92 and then mis-parsed. Always `ffmpeg -nostdin`
inside a read loop.

**Stream copy does not work on arbitrary cut points.** `-c copy` desyncs audio and video. Re-encode
each segment with hardware acceleration instead (`-c:v h264_videotoolbox` on this machine). Still
fast — around fifteen seconds for a minute of output.

**Never encode audio per segment.** Ride it through the cut lossless (`-c:a pcm_s16le` on segments),
then amplify and limit **once** on the assembled track. Encoding each piece separately puts a click
at every join.

**Do not auto-snap cuts to silence.** Word-level alignment is the whole advantage. Silence detection
will drag deliberate boundaries into filler words and awkward pauses.

**Retake seams clip word tails.** When a speaker cuts in on top of their own previous word, the kept
word can end up sounding chopped. Extend the out point slightly into the stumble and fade that
segment's audio to zero over its last fraction of a second, so the word rings out instead of
hard-clipping.

**Stumbles hide inside long word spans.** WhisperX sometimes merges a stumble and its retake into one
word span over 1.2 seconds. If a word's duration looks wrong for what it should sound like, that is
the signal. Run silence detection *across that span only* before deciding the cut.

```bash
awk 'BEGIN{}' # flag spans: any word where (end - start) > 1.2
ffmpeg -i <clip> -af "silencedetect=n=-35dB:d=0.15" -f null - 2>&1 | grep silence_
```

**The transcript will mishear things.** Cross-check before killing a line. "Claude" becoming "cloud"
makes a perfectly good sentence look broken — the line is fine, the transcript is wrong.

**Screen recordings can carry a chapter track** that inflates the reported duration and leaves a
black tail on the end. Probe and strip chapters when re-encoding.

```bash
ffprobe -v error -show_chapters -of json <clip>   # then re-encode with -map_chapters -1
```

## The mishear pass

Two layers, in this order.

1. **The fixed list.** Apply `brand.md`'s `misheard` entries. Only `mode: auto` entries are applied
   silently.
2. **The dictionary pass.** Compare every transcript word against a system dictionary, print only the
   words that are neither ordinary English nor already known, and judge each one in context.

```bash
python3 - <<'PY'
import json,re
words={w.strip().lower() for w in open('/usr/share/dict/words')}
seen=set()
for seg in json.load(open('projects/<job>/transcript/transcript.json'))['segments']:
    for w in seg.get('words',[]):
        t=re.sub(r'[^A-Za-z]','',w['word']).lower()
        if t and t not in words and t not in seen:
            seen.add(t); print(f"{w['start']:8.2f}  {w['word']}")
PY
```

A recurring brand name goes into the permanent list in `brand.md`. A one-off goes into
`transcript/misheard-local.json` for this video only.

**Only ever auto-apply single-word, whole-word swaps.** A two-words-into-one fix changes the word
count and breaks every timestamp downstream. Those get flagged for a human, never applied.

## Joins need breath, not a fixed pad

One pad everywhere (0.15s head + 0.28s tail, a 0.43s join) is right inside a sentence and wrong
between thoughts. When the last kept word ends a sentence and the next one starts a new idea, the
join keeps a pause of **0.6 to 0.9s**, taken from the recording's own silence after the sentence
(never invented with padding). Mid-sentence joins stay tight. On 01-robotics-as-de "and hear me
out why I think so." ran straight into "Modern robotics is..." with 0.43s and read as clipped.

## WhisperX drops what a cut most needs to see

It drops repeated words and false starts: "and not, not as much" comes back as "and not as much".
Cut points are placed from its words, so an untranscribed stutter survives inside a pad, or a
segment's head repeats the last word of the one before it. **No check built on the transcript can
see this, including a re-transcription with the same model.** That is what the gate below is for.

**The fix is a targeted re-listen, then cutting on the audio.** `probe_gaps.py` re-transcribes only
the audit's flagged spots (disfluent prompt) and records each heard word's source time. The builder
(`--relisten`) splits every long WhisperX span into the words heard inside it ("data." 4.8s became
"data. Every time, every time I move"), cuts the first copy of any phrase said twice in a row (the
retake is always kept), and cuts fillers from the **energy**, not WhisperX's times (they are off by
up to 0.6s): only the voiced run goes, the silence either side stays, and a filler stays in when
less than 0.18s of silence (0.5s after a sentence) would remain. A kept "uh" beats two words
butted together. The refined word list is written into the cutsheet (`words`), and the audit and
the remap read it from there.

**What three judge rounds on 01-robotics-as-de taught (each was a real defect a listener would hear):**

- **A repeat that straddles a full stop is rhetoric, not a retake.** "...called an episode. An
  episode might have..." and "the follower. The follower follows..." are kept. Cutting the first
  copy leaves "is called An episode might". The retake detector never cuts across `.?!`.
- **Never fence a pad at a hand-placed kill boundary or a WhisperX word end.** Hand kills sit right
  against the kept word, and WhisperX stretches word ends over the silence after them; both ate the
  sentence pause at every retake. Fence at where the killed words' *sound* starts and stops.
- **A 10-40ms voiced blip is a consonant release or a lip click, not the next word.** Search for
  "the next speech" as a voiced run of 40ms or more, or every tail stops 30ms after its word.
- **When a speaker ran a drone or a false start straight into the next word, there is no silence to
  cut to.** Keep the picture and fill the audio with the session's own room tone (the builder picks
  the quietest 3s; `cut-overrides.json` "mutes"), with 25ms/10ms fades. Never digital zero: the air
  dropping out is audible.
- **A slow word can be split into two by the long-word refinement and then cut as a "retake"**
  ("two hundred... six" became "six"). Every cut the detectors make goes past the judge; on a
  mismatch with the independent re-listen, the re-listen wins.
- **Judged fixes live in `transcript/cut-overrides.json`**, each citing the judge item and the audio
  evidence, applied last by the builder. An override that no longer matches a boundary stops the
  build (rule 12), so a re-cut never silently drops a judged fix.

## The base-cut gate (CLAUDE.md hard rule 15)

The rough cut is not done when it renders. It is done when the gate passes, and graphics do not
start before that.

1. **Acoustic audit** (`graphics-build/audit_cut.py`), evidence from the audio, not the transcript:
   - **Uncovered speech.** 10ms RMS against the measured room-tone floor, over every kept span. Any
     run of speech energy over about 0.12s that no transcribed word covers is flagged: that is
     where untranscribed stutters, false starts and retake tails live.
   - **Pads.** Speech energy inside a segment's head or tail pad, beyond its first or last word, is
     flagged: the pad has caught part of another word.
   - **Word durations.** A word over 1.0s, or one much longer than its syllables justify, is
     flagged (stumbles merge into one span).
   - **Join pauses.** The silence actually rendered at each join, against what the join needs:
     tight mid-sentence, 0.6-0.9s between thoughts.
2. **Independent re-transcription** of the rendered base cut, set to keep disfluencies (a
   different model size and a disfluent `--initial_prompt`). The script then looks for any word or
   2-4 word phrase that repeats across or near a join, and any word in it that the cut transcript
   does not have.
3. **Judging agent.** It reads the audit and the measurements behind each flag (energy traces,
   spectrograms of the flagged clips, the independent transcript), then passes or fails every flag
   with a reason. It never passes a flag because the transcript reads cleanly.
4. **Human sign-off.** The human listens to the **full cut end to end** on their Mac and signs off.
   A join reel is a supplement, never a phone proxy: full resolution, about 4s either side of each
   join, slated (`graphics-build/join_reel.py`). On 01-robotics-as-de the 240p, 2s reel "didn't make
   sense" and was skipped; the end-to-end listen is what found the one remaining preference (longer
   section pauses). Fix what they flag, re-run 1-3, and send again.

## Done when

- `transcript/transcript.json` exists and is durable.
- `transcript/cutsheet.json` reads as a coherent script on its own.
- `outputs/base-cut.mp4` exists, opens on the hook, and has no click at any join.
- `outputs/transcript-cut.json` is remapped onto the edited timeline.
- Three ranked hook candidates have been put in front of the human.
- **The base-cut gate has passed: the audit is clean or every flag is judged, and the human has
  listened to the full cut end to end and signed off.**

Hand off to `graphics` only then. **The base cut is never re-rendered after that point.**
