---
name: tech-video-editor
description: End-to-end edit for a technical talking-head video shot as two simultaneous clips — a face camera carrying the audio and a silent screen recording of slides, a terminal, an IDE or a live demo. Runs stages 1, 2, 4 and 5 (no AI b-roll by design) and delivers the full treatment: hook title, lower third, graphics on every beat that earns one, a demo scene with the face inset over the screen, a verdict card, an end card, music bed and sound effects. Use when a job's raw/ holds a face clip plus a screen clip. Not for other video types — those get their own skill.
argument-hint: "projects/<job>"
user-invocable: true
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, AskUserQuestion
---

# tech-video-editor

**The shape this skill is for:** one recording session, two clips in `raw/`.

- a **face camera** — talking head, carries the only usable audio,
- a **screen recording** — slides, terminal, IDE, browser, silent or effectively silent.

Both run the full session length and start within a few frames of each other, so once that offset is
measured (see below — it is never assumed) they share one timeline and the section
boundaries are a transcript problem, not a footage problem.

If the job does not look like that — no screen clip, three cameras, an interview, a pure motion
graphic — **this is the wrong skill.** Say so rather than forcing the shape.

## Recording spec — check incoming footage against this

These are measured, verified numbers from a real capture chain (Sony ZV-E10 II → OBS with two Source
Record filters → Shure MV7+). **Check every new job's footage against them and report drift before
editing** — a recording can measure perfect on resolution and still be unusable.

| What | Spec | How to check |
|---|---|---|
| Resolution, both clips | 3840×2160 | `ffprobe` |
| Frame rate, both clips | 30, identical on both | mixed rates drift on composite |
| Camera bitrate | ~45 Mbps | `size*8/duration` |
| Screen bitrate | ~40 Mbps (HEVC) | as above |
| **Duplicate frames** | **camera <5% on DEFAULT thresholds** | `mpdecimate` (see the warning below; it cannot judge a screen recording) |
| **Encoding lag** | **zero lines in the OBS log** | `grep "encoding lag"` |
| Audio | 1 track, PCM 24-bit, 48 kHz, mono | six identical tracks means OBS is writing every track |
| Voice level | −18 to −22 LUFS, peaks −6 to −10 dBFS | `ebur128`, `astats` |
| **Flat factor** | **0** | non-zero means a limiter is clamping normal speech, not catching accidents |
| Noise floor | ≤ −65 dB, rumble (<100 Hz) ≤ −75 dB | quiet window + band filters |
| Face luma | 130–145 | `signalstats` on a face crop |
| Face key/fill split | within ~25 units | two crops across the face |
| Background | below face luma; saturation below the face's | region crops |
| **Lens / framing** | **35mm on APS-C. A clear region of at least 500x260 canvas px, LEFT of the face** | `python3 styles/measure_zones.py` |

### Framing is part of the spec, and it is the one that cannot be fixed in the edit

Everything else in this table can be worked around. Framing cannot: you can crop in, never out, and
delivery is `min(style, source)` so cropping to make room costs resolution.

**Shoot 35mm on APS-C, and leave the left of the face clear.** `job1` was shot on a **50mm on
APS-C** (around a 75mm full-frame equivalent) and came out a tight head-and-shoulders close-up
with no usable negative space anywhere in the frame. `measure_zones.py` found no region reaching
500x260: the largest clear areas were a 240px sliver at the right edge and a 420x360 patch on the
left. Every stored zone in `styles/editorial/style.json` measured as sitting on his face, and the
verdict card in the shipped video crosses his mouth as a direct result.

The correction, from the human on 2026-09-07: subsequent videos are shot on a **35mm**, which leaves
**plenty of room to the left of the face and none at the bottom**.

- **Left of the face is the working zone.** Side cards, stats, lists, hero type.
- **The bottom is not available.** Even at 35mm there is no room under the chin in this setup, so a
  full-width lower band is not a placement to plan for. Lower thirds go left, not along the bottom.
- **Measure it anyway, every job.** `styles/measure_zones.py` writes `graphics-build/zones.json` and
  that file is authoritative. Two videos from the same person in the same room with the same lights
  gave completely different zone maps; only the lens changed.
- **If no region reaches 500x260, the job cannot carry overlay graphics at all.** Say so before
  editing. The beats that would have been cards become full-frame takeovers or reframes, which is a
  bigger change than it sounds and should not be discovered halfway through a build.

```bash
# the two checks that catch a silently broken recording
ffmpeg -i <clip> -vf mpdecimate -an -f null -    # DEFAULT thresholds. see the warning below
grep -c "encoding lag" ~/Library/Application\ Support/obs-studio/logs/<latest>.txt
```

> **Do not pass `mpdecimate=hi=64:lo=32:frac=0.001`.** That was the command here until 2026-08-30 and
> it detects nothing. FFmpeg's defaults are `hi=768:lo=320:frac=0.33`; `hi=64` is **12x lower**, so
> almost any block difference disqualifies a frame from counting as a duplicate. Proof: on a 200s
> window of a screen recording that was provably frozen (first scene change at t=240s), the tuned
> command reported **0 of 6000 frames duplicated** while default `mpdecimate` reported **5996 of
> 6000**. A check that reports 0% on a completely frozen screen would also report 0% on a recording
> that was half repeated frames, which is the whole failure it exists to catch.
>
> **And `mpdecimate` alone cannot answer this question for a screen recording**, because it cannot
> tell "the encoder repeated a frame" from "the content did not change". An idle screen is *supposed*
> to produce identical frames. Use it on the camera, where the subject always moves, and confirm
> encoder health on the screen from the OBS log plus arithmetic instead:
>
> ```bash
> # frames / fps must equal the wall-clock recording duration. If the encoder dropped or
> # repeated frames to keep up, these disagree.
> ffprobe -v error -select_streams v:0 -show_entries stream=nb_frames,r_frame_rate -of csv=p=0 <clip>
> grep -E "Total frames output|Total drawn frames" ~/Library/Application\ Support/obs-studio/logs/<latest>.txt
> ```

**Known-good rig settings** (for diagnosing a regression, not for repeating blindly):
camera 4K30 full-width readout — not 4K60, which is a cropped, less detailed readout on this body;
OBS Source Record per source with **different codecs** (camera H.264, screen HEVC) because two
simultaneous hardware H.264 sessions fail with `VTCompressionSessionCreate -12903`; a
**Scale / Aspect Ratio filter above** the screen's Source Record filter, since Source Record has no
scaling of its own and taps the frame at its own position in the chain; Record Mode "Virtual Camera"
so the main recording never runs as a third encode; MV7+ manual gain (not Auto-level, which lifts
room tone in every pause), limiter on, HPF 75 Hz, denoiser and popper stopper off, LEDs off or solid.

**Clips are NOT frame-locked.** Source Record stops both filters at the same instant but starts them
a few frames apart — observed 14 frames under encoder load, 2 frames when healthy. **Align at the
tail** and trim the head of the longer clip. Never assume equal durations, and never assume the
offset is zero because it was last time.

## What this skill does without being asked

The prompt for a job is "edit the video in `projects/<job>`". Everything below happens by default, so
no one has to remember to ask for it:

**Decided by measurement — never asked about:** which clip carries the voice; the base frame rate;
delivery resolution; the offset between the two clips; where the section boundaries fall; where the
speaker sits in frame and therefore which zones are free; the background luma under each graphic and
therefore its panel treatment; which beats are dead air; every safe zone and level in `style.json`.

**Title and verdict cards live in the left negative space.** The full-width lower band passes under
the speaker's chin and mouth, so "face clear above" is not enough on its own. This was got wrong on
more than one video before it was written down on 2026-08-30; the zone is `heroLeft` in `style.json`.

**Shown to the human before it is acted on, without being asked:**
1. **Footage check against the recording spec** — before any editing, with drift reported.
2. **The cutsheet as readable text** — the whole edit checkable without watching anything.
3. **The graphics plan** — the beat table, before a single composition is built.
4. **Any conflict** between local direction and the style file, or inside the style file itself.
5. **Every composition-review finding** — fixed, or raised as a decision with options. Hard rule 10:
   they are never downgraded to nits and skipped. The human is relying on this pipeline for the craft
   calls a checklist cannot make.
6. **The export dry run** — what would be promoted, retired and deleted.

**Asked about — taste that no measurement settles:** which music track when `audio/soundtracks/`
holds more than one; which of three candidate hook lines; whether an ambiguous beat earns a graphic;
anything the human's direction contradicts.

**Never asked:** anything `ffprobe`, `signalstats`, the transcript or the style files already answer.
A question whose answer is in the footage is a defect in this skill, not a gap in the prompt.

## Run order

Stages **1, 2, 4 and 5** from `CLAUDE.md`, using the `rough-cut`, `graphics`, `finishing` and
`export` skills for the mechanics. This skill owns the decisions specific to the two-clip technical
video.

**Stage 3 (`ai-broll`) does not run for this format. That is a decision, not an omission.** Every
beat in a two-clip technical video already has footage — the speaker or the screen — so a generated
clip would be filling a gap that does not exist, and AI footage sits badly next to a real terminal
and a real face. The `graphics` plan therefore never emits a `broll-slot` beat here.

If a beat genuinely has nothing to show, the answer is a diagram, a stat card or a plain `head` beat
— not generated footage. Say so and move on; do not reach for `ai-broll`, and do not treat the
missing Higgsfield MCP as a blocker, because nothing in this format needs it.

## Step 0 — measure before deciding anything

```bash
ffprobe -v error -show_entries stream=index,codec_type,width,height,r_frame_rate,channels \
        -show_entries format=duration -of default=noprint_wrappers=1 raw/<clip>
```

Establish, and report:

- **which clip carries the voice** — measure every audio stream, do not assume. A screen recorder
  often writes a silent or near-silent track (−91 dB on job1), and a camera recorder may write
  several identical mono copies (six of them on job1). Pick one and say which.
- **the base frame rate**, exactly, as a rational. Everything downstream matches it.
- **delivery resolution** = min(style `delivery`, source). Never the authoring canvas. Report any
  downscale as a decision.

## Step 1 — rough cut

Per the `rough-cut` skill, plus these, which are specific to this shape:

- **Transcribe the face clip's voice track only.** The screen clip has nothing to transcribe.
- **Measure the clip offset first, then cut both clips with identical ranges.** Compare durations;
  the difference is the head offset, because both stop together. Trim the head of the longer clip so
  the two share a timeline, and only then cut ranges. Skipping this puts the screen out of step with
  the voice for the whole demo.
- **Snap every cut to the frame grid** (hard rule 5) and run the drift gate before assembling.
- **Cut depth differs by section.** The talking-head sections take the tight treatment — filler,
  stutters, silences over ~0.4s. The screen sections take only the long dead air (a wait while a
  command runs), because cutting inside a screen recording makes the screen jump. On job1 that was
  0.7s threshold on the face and 2.5s on the screen.
- **Housekeeping is a kill.** "Can you see my screen", "let me make my font bigger", the first take
  of a line that gets restated 20 seconds later. Take the last one, always.

## Step 2 — find the section boundaries

Two independent signals, and they should agree. If they disagree, trust the transcript and report it.

1. **The transcript.** "Let me show you", "let's get into the demo", "so that's it" — the presenter
   always announces the switch.
2. **Screen activity.** The screen is idle while they talk to camera and starts changing when they
   present:

```bash
ffmpeg -v info -i raw/<screen> -vf "fps=1,scale=426:-2,select='gt(scene,0.06)',metadata=print:file=-" \
       -an -f null - 2>/dev/null | grep pts_time
```

On job1 these agreed within four seconds, which is the confirmation you want before cutting.

## Step 3 — the treatment

Default structure, all of it, unless told otherwise:

| Element | Where | Notes |
|---|---|---|
| Hook title card | opens the video | the hook is already in the footage — pull the line verbatim, do not write one. **Left negative space, never across the frame** |
| Lower third | ~5–15s in, on the self-introduction | name + role, from `brand.md` |
| Graphics through the talk | every beat that earns one | default to no. See the `graphics` skill's earn test |
| **demo scene** | the whole screen section | screen full frame, face inset, enters once, leaves once |
| Chips inside the demo | 2–3 maximum | the screen needs its pixels |
| Stat / finding cards | the payoff beats | numbers count up, never appear |
| Verdict card | the answer to the hook | biggest type in the video, **left negative space** (not the lower band, which runs under the chin), callback to the hook card |
| End card | the closing call-to-action | rows land **on the cue word**, one per channel — see below |
| Music bed | intro and outro only | flat, no ducking |
| SFX | transitions + the hook | sparse, real samples |

**The demo scene is the signature move of this format.** Full-frame screen with the face inset in a
corner, composited in FFmpeg — never through a browser, because minutes of footage round-tripped
through a headless render costs ~3% luma on every frame. Geometry and entry/exit come from
`style.md`. It enters once and leaves once; no bouncing.

The inset occludes part of the screen wherever it sits. Bottom-right costs less than bottom-left,
because line *ends* matter less than line *starts* in a terminal. Say which content it covers rather
than pretending it covers nothing.

**Which corner depends on the app, so measure it.** For a chat-style agent UI the content sits in a
narrow centre column and the bottom-right is empty canvas, so the inset covers nothing. For a
**split-pane editor** the right pane is the thing being read, and bottom-right lands on it: move the
inset to bottom-left for that span, jumping on an existing cut boundary so the move is invisible.

**Frame the inset from the footage, not from a guess.** A square crop that is too tight cuts the
shoulder and clips the chin whenever the speaker leans, while wasting headroom above. Test three or
four crops on real frames spread across the demo and look at them side by side. On `02-first-agent`
the working crop was `1760x1760` at `(1120, 400)` of a 3840x2160 source, where the first attempt at
`1480x1480 @ (1340, 300)` was too tight.

**Punch in on the specific line, not the general area.** A screen recording of an IDE renders code at
about 11px in canvas terms: fine at 4K, unreadable at 1080p where most of the audience watches. A
gentle overall zoom does not fix that; a 2.4x push framed on the exact lines being discussed does.
Keep each punch-in short and on content measured to be static, and **render the crop and read it**
before committing to it.

### Screen recordings leak

Check every frame of the screen clip for things the video is not meant to publish. On
`02-first-agent` the agent's sidebar listed unrelated personal projects for nearly four minutes.
Detect it rather than trusting a timestamp someone read off a player: scan the strip for populated
text and blur the region for the spans where it appears. Blur in **source space**, before any
punch-in, so the mask scales with the content.

```bash
# find the runs, then blur them
[screen]split[a][b];[b]crop=W:H:X:Y,boxblur=24:2[blur];[a][blur]overlay=X:Y:enable='between(t,s1,e1)+between(t,s2,e2)'
```

Be precise about what is private: a repository file tree the video is actively demonstrating is
content, not a leak. Only mask what is genuinely unrelated.

### The closing card is an overlay beside the face, and it is cue-triggered

**This is not a full-frame outro.** The speaker stays on camera, full frame, talking to the lens for
the whole closing sequence. The card is an **overlay** in the negative space beside their face, and
the footage never cuts away, never reframes, never goes to a graphic-only screen. It is `class:
overlay` on a `head` scene — the same treatment as a lower third, just taller and built up over
several seconds.

The closing lines name each channel in turn — "subscribe to my channel", "follow along at my blog",
"get the full code from my github repo", "connect with me on linkedin". **Each row appears on its own
cue word**, timed from the remapped transcript. Rows **accumulate** and hold to the last frame; none
of them exit.

Take the channels, labels, values and cue words from `brand.md` → `links`. Do not hardcode a handle
here — a changed username must be one edit in `brand.md`, not a hunt through skills.

- **Timing:** find the first spoken cue for each channel in `outputs/transcript-cut.json` and land
  that row on it. A row that arrives before its word is a spoiler; one that arrives after reads as
  lag. Land it *with* the word, not 0.4s later — the stagger rule exists to separate simultaneous
  entrances, and speech already separates these.
- **A channel whose cue is never spoken still gets its row** (X, usually) — it lands with the final
  cued row rather than being dropped. `brand.md` records that as `noCueFallback`.
- **If the closing lines are re-ordered or a channel goes unmentioned**, follow the transcript, not
  this list. The spoken order wins.
- **Anatomy:** label in caption 500 at 28px `$muted`, value in display 700 at 36px `$ink`, on one
  panel whose treatment is measured like any other. Each row clip-mask wipes up over 0.35s
  `power3.out`. **Exactly one `$accent` element across the whole card** — the rule under the first
  row — not one per row.
- **Geometry:** the panel sits in the left column, `x 96 → 680`, vertically centred on the rows it
  currently holds so it grows downward as they accumulate. It must clear the speaker's silhouette,
  which starts around `x 700` — measure it, do not assume — and it satisfies the long-form
  "right 40% clear" rule for YouTube's end-screen cards by construction.
- **Check the longest value fits before building.** The GitHub URL is the widest row; at 36px in a
  584px column it fits, but a longer handle would not. Measure the rendered width, do not eyeball it.
- The card holds under the final "thank you" to the last frame. If the recording stops dead on the
  last word, say so — that is a record-time fix (hold three seconds), not something to paper over.

## Step 4 — finishing and review

Per the `finishing` skill. For this format specifically:

- **Long form ships uncaptioned.**
- **Verify effects by measurement, across each effect's full span.** A woosh is a slow swell; a
  narrow window samples its quiet onset and reads as missing. Compare RMS envelope against the
  pre-finishing render at 50ms resolution.
- Do not null-test two AAC encodes against each other — different priming delay means they never
  null, and the residual looks like signal. And watch channel counts: mono against stereo shows a
  −3 dB difference that is conversion, not content.
- **Do not add a corrective filter to chase a marginal spec number.** On `02-first-agent` the rumble
  figure sat 2.4 dB over a −75 dB target, and an 80 Hz high-pass moved it to −78 dB while costing
  about 1 dB of chest in the voice. Measure the cost in the band that matters before applying the fix;
  a number inside spec is not worth a voice that sounds thinner.
- **Judge voice tone by listening, not by a target curve.** Build two or three EQ variants of the same
  20 second excerpt at matched loudness and let the human pick. On `02-first-agent` the raw voice
  peaked at 200–350 Hz with the presence band 11–12 dB below it, which reads as boxy and smears
  consonants; the chosen correction was −3 dB at 280 Hz and +4.5 dB at 3.8 kHz. A stronger version of
  the same move was rejected as sounding "like a phonograph", which no measurement would have told
  you.

## Step 5 — export

Per the `export` skill. **Promote and copy without asking; never reclaim without the human having
read the plan.** Print the dry run and leave the scratch.

## What this format gets wrong most often

- **Type composited bare onto footage.** It is legible over a pale wall and mud over a dark shirt.
  Every card gets the panel fill. Check a real frame over the actual footage, not a snapshot on white.
- **Hero type over the speaker's face.** Lower band, face clear above.
- **A looped still heading an FFmpeg filter chain.** The output never ends. The base must be the main
  input. This wrote a 142GB file on job1 before it was caught.
- **Claiming a graphic works without looking at it.** Every part gets a frame pulled from the
  composited render, not from the composition in isolation.

## Ask only what footage cannot answer

Measure the frame rate, the voice track, the boundaries, the safe zones. Ask about taste: which
music track, how hard to cut, whether a section earns a graphic the transcript is ambiguous about.
Never ask a question whose answer is in `ffprobe` output.
