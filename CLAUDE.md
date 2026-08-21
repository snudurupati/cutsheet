# video-editor — the pipeline contract

This folder is an AI video editing pipeline. It has two halves and they never mix.

- **Taste (permanent, shared across every video):** `brand.md`, `styles/`, `assets/`.
- **Jobs (disposable, one per video):** `projects/<job>/`.

Anything that does not clearly belong to one of those two halves is a sign the design drifted.
Do not add a notes file, a config file, or a `temp/` folder as you go.

## The five stages

| # | Stage | What happens | Runs on | Skill |
|---|-------|--------------|---------|-------|
| 0 | Setup | Workspace, brand file, style files. Once, before the first video. | Claude | — |
| 1 | Rough cut | Transcribe every word with timings, decide what goes, cut and stitch. | WhisperX + FFmpeg | `rough-cut` |
| 2 | Graphics | Decide which lines earn a graphic, then build each one as code. | HyperFrames | `graphics` |
| 3 | B-roll | Generate motion graphics and AI footage for beats with no real footage. | HyperFrames + Higgsfield | `ai-broll` |
| 4 | Finishing | Captions, a music bed, a handful of sound effects, then review. | FFmpeg + `watch` | `finishing` |
| 5 | Export | Promote one final file, delete the scratch. | FFmpeg | `export` |

Format does not change which stages run. Short form and long form use the same five stages.
All that changes is how graphics and captions behave inside stages 2 and 4, and that is driven
entirely by the style file — never by an inline judgement call.

## Folder structure

```
video-editor/
├── CLAUDE.md              this file
├── brand.md               colours, fonts, voice, hook, mishear list. The one personalised file
├── styles/
│   └── <style>/           one folder per look you edit in
│       ├── style.md       creative direction in prose
│       └── style.json     the same decisions as machine-readable knobs
├── assets/
│   ├── fonts/             real font files. Renders cannot rely on system fonts
│   ├── logos/             marks, end screens
│   └── sfx/               real sound samples, grown over time
└── projects/
    └── <job>/             one folder per video, named after the content
        ├── raw/           source clips, copied in, never moved
        ├── broll/         screen recordings and supporting footage
        ├── audio/         licensed music, sound samples for this video
        ├── assets/        references, screenshots, logos for this video
        ├── transcript/    transcript.json and cutsheet.json, the durable record
        ├── graphics-build/ composition source. This is the real progress
        └── outputs/       renders and the cut-aligned transcript
```

## Job naming — a rule, not a nicety

Name the job folder after what the video is **about**, in kebab case: `projects/claude-edits-my-videos/`.

- Never the camera filename.
- Never a date.
- Never a stage suffix (`-final`, `-v2`, `-fixed`).

One folder carries the whole content piece across every stage. Stage suffixes are how you end up
with four folders and no idea which one shipped.

## Starting a job

```bash
cd ~/Projects/video-editor
JOB=<content-name-in-kebab-case>
mkdir -p projects/$JOB/{raw,broll,audio/soundtracks,audio/sound-effects,assets,transcript,graphics-build,outputs}

cp <your source clips>                 projects/$JOB/raw/
cp <the licensed track for this video> projects/$JOB/audio/soundtracks/
cp assets/sfx/*.mp3                    projects/$JOB/audio/sound-effects/
```

Sound effects are permanent and live in `assets/sfx/` — copy them into the job, never the other way
round. Music is per video and licensed per video, so it lives only in the job.

Then open Claude Code in the workspace root (`claude`) and invoke the skill for that video type:

> `/<video-type-skill> projects/<job>`

**Name the skill.** The video type is the one thing the files cannot infer reliably — the footage in
`raw/` hints at it, but relying on that is a guess, and guessing wrong silently skips the recording
spec and default treatment that skill owns. The five stage skills are the mechanics; a video-type
skill sequences them for one shape and is what you invoke.

That is the whole prompt. Everything a prompt could specify is already written down — the stages
above, the hard rules below, the recording spec and treatment in the owning skill, the look in
`styles/`, the voice and palette in `brand.md`. **A prompt that repeats them is not adding
direction, it is duplicating the contract in a place that cannot be version-controlled or improved.**

Add to the prompt only what the footage and the files cannot supply:

- direction that is not in the script or the footage — "this beat is the payoff", "cut it harder
  than usual", "no music on this one"
- a correction you want applied this time
- "run under `caffeinate`, don't wait for my input" to hand the job off unattended

The pipeline measures the rest and asks about taste it cannot measure — which music track, which of
three candidate hook lines, whether an ambiguous beat earns a graphic. If it asks something the
footage could have answered, that is a bug in the skill, not a missing instruction in your prompt.

## Colour tokens

Colours live in `brand.md` twice: a readable table for the human, and a JSON block for the skills.
Style files and compositions refer to colours as `$bg`, `$rule`, `$accent`, `$accent-soft`, `$ink`,
`$muted` — never as hardcoded hex. Changing one brand colour must recolour every graphic in every
style at once.

## Pinned tool versions

Everything here is tuned against these versions. A silent upgrade breaks renders that were already
signed off. Do not float them.

| Tool | Pinned | Invoke as |
|------|--------|-----------|
| HyperFrames | 0.8.3 | `npx hyperframes@0.8.3 <cmd>` — never `@latest` |
| Node | 26.5.0 (needs ≥22) | `node` |
| FFmpeg / ffprobe | 9.0 | `ffmpeg` / `ffprobe` |
| WhisperX | 3.8.6 (uv tool, isolated) | `whisperx` (`~/.local/bin/whisperx`) |
| watch skill | 0.2.0 | `/watch`, or `python3 <skill_dir>/scripts/watch.py` |

Verify before building anything:

```bash
ffmpeg -version | head -1 && node --version && uv --version && python3 -c "import PIL; print(PIL.__version__)" && whisperx --version && npx hyperframes@0.8.3 --version
```

### Higgsfield MCP — not connected yet

Stages 1, 2, 4 and 5 all run without it. Only AI-generated B-roll and mid-edit image generation are
blocked. To connect: copy the personal connection URL from higgsfield.ai/mcp, then

```bash
claude mcp add --transport http higgsfield <your-url-from-higgsfield.ai/mcp>
```

Verify with `claude mcp list` before running the `ai-broll` skill.

`npx hyperframes@0.8.3 doctor` failing on Docker is expected and irrelevant — Docker is not used.
`whisper-cpp`, Kokoro TTS and MusicGen also report missing; all three are optional local fallbacks
this pipeline does not use (WhisperX handles transcription, music is user-supplied and licensed).

## Hard rules that outrank any local instruction

1. **Transcribe once per video, ever.** `transcript/transcript.json` is durable. Re-running skips to it.
2. **The base rough cut is never re-rendered** once graphics start. Editing one graphic regenerates
   one composition and one composite pass.
3. **Local direction never silently overrides a style convention.** If a script comment and the style
   file disagree, flag the conflict. Following the more recent instruction is recency bias, not judgement.
   **And a style file that contradicts itself is a bug, not a tie to break.** `style.json` is
   authoritative for whether, `style.md` for how; if they disagree, stop and report it. Never resolve
   it silently, in either direction, and never cite one half of a self-contradicting file as grounds
   for overriding what the user asked for. Run `python3 styles/check_style.py` after editing a style.
4. **Delivery resolution is the lesser of the style's `delivery` setting and the source — never
   lower.** Probe the source; do not take the frame size from the authoring canvas. Any downscale is
   reported to the user as a decision, never applied as a default.
5. **Every cut snaps to the frame grid**, and the splice fails above 40ms of cumulative a/v drift.
   Unaligned cuts round video up to a whole frame while audio stays sample-exact — about 12ms per
   join, invisible per segment, 733ms across 92 of them.
6. **Claude cannot see video.** Any claim about how a render *looks* must come from frames pulled with
   the `watch` skill, in a sub-agent, never from assumption.
7. **Check incoming footage against the recording spec before editing it.** Resolution, frame rate,
   bitrate, duplicate frames, encoding lag, audio level and noise floor. A recording can measure
   perfect on resolution and still be half repeated frames. The spec lives in the skill that owns the
   video type. Report drift; do not silently edit around it.
8. **The build source is durable.** `graphics-build/` lives in the project, never only in a temp dir.
   Only heavy regenerable renders belong in a cache.
9. **Corrections that should apply to every future video get written back into the style file** before
   the job is closed out. One-off notes are applied and forgotten.
10. **Composition-pass findings are not optional, and "nit" is not a reason to skip one.** The person
    running this pipeline is relying on the five skills for craft judgement — that is the whole point
    of the review loop, and the composition pass is the only step that catches what a checklist
    cannot: "why is that there", "that's tiny", "the wins read quieter than the misses", "there is no
    graphic for ten minutes". Those are exactly the calls an amateur editor cannot be expected to
    supply for themselves.

    **Every composition finding is either fixed, or escalated to the human as an explicit decision
    with options — never silently downgraded and moved past.** Severity labels from the reviewer rank
    the work; they do not license dropping it. If there is no time to fix one, it goes in front of the
    human *before* they watch, phrased as a choice, not buried in a report.

    This rule exists because on 2026-08-20 a composition pass returned eight findings that were
    logged as nits and skipped — including a ten-minute stretch of the video with no graphic at all,
    and a scorecard whose "win" cards were styled quieter than its "miss" cards, undercutting the
    argument the video was making. The human had to ask what had been suppressed.

11. **Verify content, not just counts.** Every gate in this pipeline measures frames, samples and
    durations, and a stale or mismatched source can satisfy all of them exactly. After assembling any
    cut, transcribe a window of the render and compare it against `outputs/transcript-cut.json` for
    the same window. Fail below about 70% word match on the leading words.

    This rule exists because on 2026-08-20 a re-cut shipped **old audio on new video**, 4.47 seconds
    out of sync through the whole demo, the verdict and the end card. It passed the frame count, the
    sample count, the 40ms drift gate and the duplicate-frame check, because `-shortest` had
    truncated the stale track to exactly the right length. The file was numerically flawless and
    audibly wrong. Counts cannot see that; only content can.

12. **Pipeline scripts take their inputs as arguments and gate them on something the cutsheet knows.**
    A hardcoded path is a landmine that arms itself the first time the cut changes. The bug in rule 11
    was caused by exactly that: a script read a path from a string literal, the caller wrote the new
    audio somewhere else, and the script silently processed the wrong file and produced a
    correct-looking result. Every script that reads a pipeline artefact asserts what it read matches
    the cutsheet before doing any work.

## House style

**No em-dashes.** Not in on-screen card copy, not in the YouTube title, description or
tags, not in captions, not in any document written here. They read as a tell for
AI-generated text, which matters more than usual for a channel whose subject is being
rigorous about AI output.

Restructure the sentence rather than substituting another dash: a full stop and a new
sentence, a colon where one clause introduces the next, brackets for a genuine aside, or
a comma where the pause is light. An en-dash is fine for ranges (2019-2024). A hyphen is
fine in compounds (frame-exact).

## Pre-work (the highest-leverage thing in this pipeline)

Write the script in a document that supports comments, and leave comments on it: what music and
where, camera moves, what kind of graphic goes on which line, links to reference images. The graphics
skill reads those comments. Ten minutes of comments saves hours of directing.
