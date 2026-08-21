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

## Done when

- `transcript/transcript.json` exists and is durable.
- `transcript/cutsheet.json` reads as a coherent script on its own.
- `outputs/base-cut.mp4` exists, opens on the hook, and has no click at any join.
- `outputs/transcript-cut.json` is remapped onto the edited timeline.
- Three ranked hook candidates have been put in front of the human.

Hand off to `graphics`. **The base cut is never re-rendered after that point.**
