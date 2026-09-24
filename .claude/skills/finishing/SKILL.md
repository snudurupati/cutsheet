---
name: finishing
description: Stage 4 of the video pipeline. Captions, a music bed and a few sound effects on top of the graphics pass, then the review loop that actually makes the edit one-shot — sub-agents pull frames with the watch skill and hand back timestamped findings across two distinct passes, technical QA then composition. Use after graphics, or to re-run captions, audio or review on their own.
argument-hint: "projects/<job> [captions|music|sfx|review]"
user-invocable: true
allowed-tools: Bash, Read, Write, Edit, Glob, Task
---

# Skill 4 — the finishing pass

**Whole job:** captions, a music bed, and a few sound effects, then review.

Three sub-steps that can each run alone, but when run together **always run in this order**, because
each one operates on whatever the previous one produced.

---

## 1. Captions

Burn them in from the **remapped** transcript (`outputs/transcript-cut.json`), styled from the style
file — never from a judgement call at render time.

Two things designed in from the start:

- **Never caption a file that is already captioned.** Make the script pick its own input by scanning
  `outputs/` for the newest un-captioned render, rather than accepting whatever it is handed. A
  double burn-in is unrecoverable without a re-render.
- **Captions are genuinely optional.** Long form skips them entirely — YouTube serves its own and
  burn-ins clutter a 16:9 frame. `style.json` → `captions.longForm.burnIn: false` is the switch, and
  it is off by default in this workspace.

Voice, casing, chunking and safe-zone position all come from `brand.md` → `captionVoice` and
`style.json` → `captions`.

## 2. Music

- A **flat bed at `style.json` → `audio.musicBedDb`**, relative to the measured voice.
  Read the number from the style file rather than repeating it here. Its history, for
  context only: −18 until 2026-08-31 (inaudible), then −9 from a four-way A/B, then −12 on
  2026-09-09 when −9 proved too loud under the intro and outro. The knob and its `_why`
  are the record; this paragraph already went stale once by quoting a number.
- **No ducking. No fade-in.** A short fade-out on the tail.
- The track is **user-supplied and licensed**. This skill never downloads one. If `audio/` is empty,
  stop and ask.
- Ducking and fade-in exist as **opt-in flags** and you should almost never reach for them. **If the
  bed is not audible enough, change the level — do not add a sidechain.**

## 3. Sound effects

- **Sparse.** A handful of moments per video, not a hit on every cut.
- **Real sample files** from `assets/sfx/`, at around **−10 dB**. That library grows over time.
- **Never a synthesised tone.** A generated sine wave is instantly recognisable as
  not-a-sound-effect. **If you have no samples, skip the step rather than fabricate one.**

## Both audio passes are pure audio

**Copy the video stream, never re-encode it** (`-c:v copy`). Re-encoding here throws away the
graphics pass quality for nothing.

## Verifying the mix — three traps that make a correct mix look broken

You cannot hear the render, so every claim about the audio is a measurement. These three all
produced false alarms on one job:

- **Measure an effect across its full span, not a narrow window.** A woosh is a slow swell; a 0.35s
  window catches its quiet onset and reads as −45 dB — indistinguishable from missing. The same
  effect measured +21 dB above ambient across its real 1.15s span.
- **Do not null-test two AAC encodes.** Different encoder priming delay means they never null, and
  the residual is the whole signal rather than the difference. Compare RMS envelopes at ~50ms
  resolution instead, or A/B in PCM.
- **Watch the channel count.** Mixing a mono voice with a stereo effect can produce a stereo output
  whose per-sample mean sits ~3 dB below the mono source. That is channel conversion, not level loss.

A bed at `musicBedDb` under speech shifts the programme mean by only a few tenths of a dB. That is
what a bed *is* — check its LUFS against the voice's LUFS (it should land `musicBedDb` down,
whatever the knob currently says), not the mean of
the mix.

## Write the plan to disk

`outputs/audio-plan.json` — the effects plan and the exact filtergraph. When a graphics tweak later
re-renders the base, re-apply the same plan instead of re-deciding every placement from scratch.

**Record the file you wrote, as `output`.** A relative path from the job root:

```json
{ "output": "outputs/finished.mov", "music": { ... }, "sfx": [ ... ] }
```

This is the only place in the pipeline that knows which render is the finished one. Without it
`export` has to guess, and it guesses by mtime and file extension. On 2026-08-31 that guess filtered
candidates to `*.mp4`, could not see `finished.mov` at all, and planned to promote the graphics pass
(no music, no sound effects) and then retire the only file that had them. The finishing stage knows
the answer for free. Write it down.

---

# The review loop — the part everyone misses

Everything above gets you a workflow. It does not get you a one-shot edit. Without this, the first
draft comes back with captions over the face and a graphic using the space badly, and you spend two
hours being the director for a blind video editor.

**Claude Code cannot see video.** It can only read the transcript. That is exactly why the rough cut
lands every time — cutting is a pure transcript problem — and exactly why graphics come back with
small issues, because nothing ever looked at the result.

The loop needs exactly two ingredients: **a goal** (finish the video) and **a way to check the work**
(the `watch` skill). That is the entire recipe for an agent loop. Make a change, watch it back, spot
what is off, fix it, repeat until it looks right. No editor edits a whole video with their eyes
closed; there is no reason to ask an agent to.

## Always in sub-agents, never the main session

Frame dumps flood the context window. **Send the review out, get findings back** — a list of
timestamped items, not images, returns to the main session.

Watch is installed at `~/.claude/plugins/cache/claude-video/watch/<version>/skills/watch/`. Inside a
review sub-agent:

```bash
SKILL_DIR=~/.claude/plugins/cache/claude-video/watch/0.2.0/skills/watch
python3 "$SKILL_DIR/scripts/watch.py" outputs/<render>.mp4 --start 1:12 --end 1:42 --fps 2 --resolution 1024
```

- `--start/--end` on a named window is how you inspect **the seam between two specific graphics**
  rather than being handed a summary of the whole clip.
- `--resolution 1024` whenever on-screen text has to be read.
- `--timestamps` for deictic moments the narration flags ("look here", "as you can see").
- `--no-dedup` only when judging subtle frame-to-frame motion, e.g. verifying judder.

**Use a frame-extraction skill, not a video-understanding model.** The reason is control: you decide
exactly where to look.

## Run the review in two distinct passes

This is the single most useful thing in the pipeline.

### Pass 1 — technical QA, as a checklist

Binary things, all unambiguous, all catchable:

- stretched or squashed assets,
- a vanished element,
- a wrong colour against `brand.md`,
- a brightness dip at a seam (browser-segment luma dip),
- caption collisions with the face or the safe-zone bands,
- text clipped by the frame edge,
- judder (duplicate-frame check ≥ 8%),
- a graphic that fades out before the next part starts,
- a frozen frame on a beat 20s or longer,
- a bad tail frame at any clip out-point.

### Every composition finding is acted on — this is hard rule 10

**The person running this pipeline is relying on these five skills for craft judgement.**
Pass 2 is the only step that catches what a checklist cannot, so suppressing its output defeats the
entire point of running it. A severity label ranks the work; it does not license dropping it.

Every finding is **either fixed, or put in front of the human as an explicit decision with options,
before they watch.** Never logged as a nit and skipped. Never buried in a summary they have to mine.

When there is not time to fix one, the escalation reads like a choice — "the wins are styled quieter
than the misses, which undercuts the balance; give them their own mark, or leave it?" — not like a
footnote.

### Pass 2 — composition, as its own named step

A checklist review only catches things that are binary. **Composition is not.** "Why is that at the
top", "that's tiny", "does this actually make sense" are judgment calls with no pass or fail, so a
checklist-driven reviewer skips right past them while looking directly at the frames that show the
problem. Give this pass concrete items of its own:

- **every overlay re-checked against what the style file says for that element category**, and
- **every distinct visual moment named in the direction accounted for** as built, or explicitly
  flagged as skipped — **never silently simplified away**.

The review sub-agents read `styles/<style>/style.md` and `style.json` **fresh on every pass**, so an
absorbed correction tightens every future review with no extra wiring.

### Early spot review

Run one after the **first ten percent** of the build, not just at the end. A wrong placement habit
caught once is a fix. Caught at the end it is a rebuild. (The `graphics` skill triggers this one.)

## The loop

1. Render.
2. Dispatch sub-agents: technical QA pass, then composition pass.
3. Collect timestamped findings.
4. Fix, re-render **only the affected parts**, review again.
5. Repeat until both passes come back clean.

By the time a human sits down for final review, the video has already been through half a dozen
reviews it ran on itself.

## Done when

- Captions are burned in exactly once, or deliberately skipped for long form.
- Music sits flat at `audio.musicBedDb` below the measured voice, with a tail fade and no ducking.
- SFX are real samples at −10 dB, or the step was skipped.
- `outputs/audio-plan.json` exists.
- Both review passes come back clean on the current render.

Hand off to `export`.
