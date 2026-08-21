# cutsheet

An opinionated pipeline for editing long-form technical talking-head video with Claude
Code. Raw camera and screen recordings go in, a finished, graded, graphicked 4K video
comes out, and every step is gated on a measurement rather than a judgement call.

It is not a video editor. There is no timeline and no UI. It is five stages with
artifacts between them, and a style system that decides how things look so the model
never has to.

**This repository preserves the system, not the videos.** Skills, style files and the
scripts that run the pipeline. Footage, renders, transcripts and per-job reports are all
excluded, because they are either regenerable or belong to a particular video.

## The five stages

| # | Stage | What happens | Runs on |
|---|-------|--------------|---------|
| 0 | Setup | Workspace, brand file, style files. Once, ever. | Claude |
| 1 | Rough cut | Transcribe every word with timings, decide what goes, cut and stitch. | WhisperX + FFmpeg |
| 2 | Graphics | Decide which lines earn a graphic, then build each as code. | HyperFrames |
| 3 | B-roll | Generate footage for beats that have none. | HyperFrames + Higgsfield |
| 4 | Finishing | Captions, music bed, sound effects, then review. | FFmpeg |
| 5 | Export | Promote one final file, retire the rest. | FFmpeg |

## The idea

**Taste is permanent, jobs are disposable.** `brand.md` and `styles/` hold six colours,
two fonts, measured zones and a set of hard rules. `projects/<job>/` holds one video. The
model reads the first and never invents from the second.

**Everything is measured, nothing is assumed.** Delivery resolution is probed from the
source. Panel treatment is sampled from the luma under each card. Graphic zones come from
vertical luma strips of the actual footage, not a template. The speaker's silhouette is
measured, not guessed.

**Gates, not vibes.** Cuts snap to the frame grid and the splice fails above 40ms of
cumulative drift. The composite fails above 8% duplicate frames. A cue that falls outside
its own part fails the build. A bright browser window with no bookmark blur refuses to
render at all.

**Verify content, not just counts.** The newest hard rule and the most expensive one to
learn. See rule 11 in `CLAUDE.md`.

## Layout

```
CLAUDE.md              the contract, and twelve hard rules that outrank everything
brand.md               six colours, two fonts, a caption voice, a mishear list
styles/editorial/      style.md (how) + style.json (whether) + a checker enforcing the split
.claude/skills/        the five stage skills plus one video-type skill
projects/<job>/        per-job scripts; everything they produce is gitignored
```

## Worth reading first

- **`CLAUDE.md`** for the hard rules. Each one records the failure that produced it.
- **`.claude/skills/graphics/SKILL.md`** is the biggest, and its gotchas are all real: a
  `<video>` transformed in a headless render vanishes silently; an overlay missing
  `eof_action=pass` produces perfectly constant-frame-rate judder; a looped still at the
  head of a filter chain once wrote a 142GB file.
- **`projects/*/transcript/`** and **`graphics-build/`** for the working scripts: frame-exact
  splicing with a drift gate, join de-glitching, loudness-relative audio mixing, panel
  treatment sampled from the footage, and an SRT builder that repairs transcription
  mishears the pipeline deliberately kept.

## What this repo does NOT protect

A filesystem loss would still cost you the things git is the wrong tool for:

- **Source footage.** Irreplaceable. Back it up separately.
- **The sound-effects library** and licensed music. Re-purchasable, tedious.
- **Fonts.** Satoshi is free for commercial use but redistribution of the files is not
  permitted, so they are referenced here and never vendored. Re-download from Fontshare.

## Pinned versions

Tuned against HyperFrames 0.8.3, Node 26, FFmpeg 9.0 and WhisperX 3.8.6. A silent upgrade
breaks renders that were already signed off, so nothing floats.
