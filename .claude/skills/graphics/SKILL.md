---
name: graphics
description: Stage 2 of the video pipeline, and the biggest one. Decide which lines in a finished rough cut earn a graphic, then build each one as a HyperFrames composition and composite it over the base with FFmpeg. Owns the plan/build split, the safe zones, overlay-vs-segment, and every HyperFrames and compositing gotcha. Use after rough-cut, or whenever a single graphic needs changing.
argument-hint: "projects/<job> [part-id]"
user-invocable: true
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Task, AskUserQuestion
---

# Skill 2 — graphics

**Whole job:** decide which lines earn a graphic, then build each one.

Two halves that stay separate. **Planning is a judgment problem. Building is an engineering
problem.** Mixing them produces a plan written to be easy to build, which is the wrong optimisation.
Finish and validate the plan before opening a single composition file.

HyperFrames is pinned: **always `npx hyperframes@0.8.3`, never `@latest`.**

---

# Part A — the plan

## Read three things before deciding a single beat

1. `outputs/transcript-cut.json` — the finished transcript from the rough cut.
2. **Comments left on the script document.** Pull these out with the document's XML, not a library —
   libraries drop anchored comments. For `.docx`: unzip and read `word/comments.xml` plus
   `word/document.xml` to map each comment to its anchor text.
3. **The narration inside the B-roll clips** (`transcript/broll-*.json`). "Zoom in here", "use this
   for the pricing bit" — direction that appears nowhere in the main script.

## For every beat, answer in order

### Does this line even need a graphic?

**Default to no.** A graphic on every line is wrong. Plain beats give rhythm and let the face carry
the moment.

A beat **earns** a graphic when it is:

- the hook,
- naming something concrete and showable — a stat, a screenshot, a before-and-after,
- a payoff worth emphasising,
- describing a process a picture would make instantly clearer,
- or explicitly requested in a script comment.

Leave connective tissue, transitions, asides and emotional delivery **plain**. Those land harder on
the face alone.

### What kind?

Think in rich terms first, then flatten to the fixed set the build step can actually handle:

`stat` · `card` · `screenshot` · `takeover` · `zoom` · `diagram` · `broll-slot`

**Reach for showing over telling.** Screen recordings, screenshots, diagrams and stats beat text
cards almost every time. Reserve `card` for the hook and the punchlines, and even then give it motion
and a visual element rather than a wall of type.

### Where?

| Format | Placement |
|--------|-----------|
| Short form explainer | Graphics in the top half, face in the bottom half. |
| Short form raw | Exactly one hook card. Nothing else. |
| Long form | Full-frame takeovers and lower thirds. Reframes are allowed where the style file defines a named scene for them — never as an ad-hoc move. |

### What exactly?

Write the actual creative direction: what is on screen, what the hierarchy is, what the hero element
is, and **critically what animates and in what order**. Concrete enough that the build step is not
guessing. "Stat card for the 90% number" is not direction. "90% counts up from 0 over 1.2s in display
900 at 220px, the % sign clip-masks in 0.4s after it settles, the `$accent` rule draws left-to-right
underneath" is.

## Output the plan two ways

`graphics-build/cutsheet.json` — machine-readable, one entry per beat that gets a graphic. Beats with
no graphic simply are not in the list.

```json
{ "parts": [
  { "id": "g001", "start": 0.000, "end": 6.500, "kind": "card",
    "class": "overlay",
    "direction": "Hook card. Eyebrow 'THE PIPELINE' ...",
    "notes": "script comment L14: 'start zoomed in, rapid zoom out'" }
] }
```

Plus a human-readable table in `graphics-build/PLAN.md` for review.

## Validate the plan with a script before the build step ever sees it

- required fields present,
- `kind` is one of the seven allowed values,
- `start` < `end`,
- sorted ascending,
- no overlaps,
- **consecutive beats either abut exactly or leave a gap of more than one second.**

That last rule is not obvious and it matters. Anything in between — a gap of a few tenths — flashes
raw un-graphiced footage for a fraction of a second during the composite, and almost always means the
plan meant to abut and did not.

```bash
python3 graphics-build/validate_cutsheet.py graphics-build/cutsheet.json   # exits non-zero on any violation
```

## Safe zones

| Format | Frame | Keep key visuals inside |
|--------|-------|-------------------------|
| Short form | 1080 × 1920 | y 200 → 1620. Top 200px and bottom 300px are background only. |
| Long form | 1920 × 1080 | Title safe, 10% margins. Keep the outro's right 40% clear for end-screen cards. |

The short-form bands are **not a guideline**. The platform UI, the username, the audio tag and the
progress bar all land there.

---

# Part B — the build

**Generate the compositions from a script. Do not hand-write HTML per graphic.** A single build
script in `graphics-build/` holds the shared CSS, the per-graphic markup and the per-graphic
animation, and emits one composition file per part, plus a render script and an assemble script.

```
projects/<job>/graphics-build/
├── build.mjs          shared CSS + per-part markup + per-part animation
├── cutsheet.json      the validated plan
├── PLAN.md            the human-readable table
├── parts/             emitted compositions, one per part
├── render.sh          renders parts (pinned hyperframes@0.8.3)
└── assemble.sh        the composite pass + the duplicate-frame check
```

That folder is the real progress on the job, so it lives **in the project**, never in a temp
directory.

## Classify every part as one of exactly two things

The question is simple: does it change the footage underneath, or does it float on top?

| Class | What it is | How it renders |
|-------|-----------|----------------|
| **Overlay** | A card, a panel, a callout. | Renders standalone to a transparent file, composited over the base at its timestamp. |
| **Segment** | A takeover, a full-screen cutaway, anything that replaces the frame. | Renders with its own slice of the base footage baked in, as an opaque file covering the base for its window. |

**The base rough cut is never re-rendered. That is the whole point.** Editing one graphic means
regenerating one composition, re-rendering one part in seconds, and running one FFmpeg composite pass
over everything. Lock the parts one at a time.

## Non-negotiables

1. **Graphics hold until the next part starts.** Never fade out early and leave dead air before the
   next one.
2. **The picture-in-picture enters once per graphics run.** Chain everything between entries.
   Bouncing between full frame and PiP and back is the single most amateur-looking thing an AI editor
   does. Hard cuts between card *contents* are fine. A full-screen bounce never is.
3. **Continuous motion on any beat 20 seconds or longer.** A count-up that finishes at six seconds of
   a nineteen-second beat reads as a frozen frame for thirteen seconds. On any long beat, write out
   explicitly what is moving across its entire duration, not just at the entrance.
4. **Real assets over recreations.** The actual logo, the actual screenshot, the actual chart, with a
   slow pan or push on it. Never a redrawn approximation.
5. **Measure, do not estimate.** Pull the actual frame, measure the element's bounding box in pixels,
   then set the zoom from that measurement.
6. **Check the tail of every clip, not just the start.** A retake seam leaves a bad frame right at the
   out point, and nobody watches the last second.
7. **Assets outlast their window.** Give every part about half a second of tail margin past its
   nominal end, so a slightly late composite boundary never exposes a missing asset.
8. **Local direction never silently overrides a style convention.** If a script comment says put the
   chip in the upper third and the style file says chips sit under the chin, that is a conflict to
   **flag**, not a decision to make quietly. Following the more recent instruction is recency bias,
   not judgment.

## Generating assets mid-edit

HTML draws text, charts and screen recordings. When a graphic needs an icon or an illustration that
code cannot build, generate the image with the Higgsfield MCP mid-edit and have the composition
composite it in. That changes what a graphic can be — but it never replaces a real asset that exists.

---

# Part C — HyperFrames: the gotchas that cost a month

HyperFrames builds every graphic as HTML, CSS and GSAP, then renders it in a headless browser. That
is why there is no ceiling on how many graphics a video can have. It is also where all the sharp
edges live. None of these are guessable.

## The timeline contract

**Compositions are seeked, not played.** The renderer jumps to arbitrary frames rather than running
in real time, and everything below follows from that.

- Build **one master timeline, created paused**, with every tween at an **absolute second**. Not
  relative offsets.
- **Never use random values.** The same frame has to render identically on every seek.
- **Never drive state from real-time timers.** No `setTimeout`, no animation-frame loops. Everything
  comes off timeline position.
- **Every exit that lands on a boundary needs an explicit hard kill** — an opacity set to zero at
  that exact time. An unresolved tween pops instead of finishing.
- **Time is always in seconds.** Never frames.
- **Every entrance uses a `fromTo` tween, never a bare `to`.** A bare `to` has no defined start state
  when the timeline is seeked into the middle of it.
- **Never put a CSS transform and a GSAP tween on the same property.**

## Things that silently do not render

This is the category that wastes days, because nothing errors. It just quietly comes out wrong.

- **Never transform a `<video>` element directly.** Put a scale or a move on a `<video>` and the
  headless render composites it away — the face just vanishes where the move should be. No error, no
  warning. Fix: reframe **through layout**. Wrap the video in a div with `overflow: hidden` and
  animate the wrapper's `left`, `top`, `width`, `height`. The parent shrinks and crops the
  untransformed video inside it.
- **CSS blur filters are not render-safe.** For a blur-in text reveal, use a per-letter opacity
  stagger instead, around **0.045s** between letters.
- **Grayscale filters fail the same way.** Fake desaturation by tweening the colour toward a flatter
  value.
- **Class-name tweens do not survive the seek.** Worse than failing to apply, they can wipe the base
  class's styling entirely. Tween the actual CSS properties directly.
- **Near-zero-duration tweens are unreliable.** Two identical 0.001s tweens in the same call, one
  applied and one did not. Give every instant state change a real duration of **0.2–0.35s**. It still
  reads as a cut.
- **Raw emoji glyphs hang the render.** A single emoji codepoint sends the headless browser spinning
  at full CPU trying to load a colour emoji font it cannot decode. It never errors and never times
  out — a five-second part that should take seven seconds will burn five minutes before you kill it.
  Fake the look with the brand font, or pre-render the glyph as a transparent PNG and overlay it.
  **The tell:** a render still going at three times the length of a same-sized part is an emoji, not
  a real hang.
- **Transparent overlays have nothing behind them**, so backdrop blur does not happen. Design frosted
  panels to read on their own fill.

## The composite traps

FFmpeg problems, not HyperFrames problems — but they only show up when you assemble.

- **Match every part to the base frame rate exactly.** Mixed frame rates drift. Probe it, never guess.
- **Segments carry their own base slice, cut once from the base**, so the first and last frame match
  at the seam.
- **Cut that slice at the time it is placed, not the time it was built.** If the base gets re-spliced
  and graphics shift, a slice cut at the old time makes the footage jump at the seam and run out of
  sync with the audio for its whole duration. Overlays just slide. Only segments carry footage, so
  only segments need re-cutting and re-rendering.
- **Every overlay needs its end-of-file behaviour set to `pass`, not `repeat`** (`eof_action=pass` on
  the overlay filter). This one is vicious. Chain several short overlays over a long base and the
  frame scheduler starts duplicating output frames on a periodic cadence — measured at exactly one in
  four. The output is dead-even constant frame rate, so every tool reads it as perfectly fine, but the
  content only changes about 18 times a second wearing a 24fps costume. Visible judder, worst on
  smooth motion. Every input measures clean on its own, so you will keep "fixing" a zoom that was
  never broken.

  **Detect it by counting exactly-duplicate frames in the output: clean is under 3%, the bug is around
  25%.** Wire this into `assemble.sh` and fail above 8%. Do **not** mask it by forcing a frame rate —
  the output is already constant.

  ```bash
  ffmpeg -i outputs/graphics-pass.mp4 -vf mpdecimate=hi=64:lo=32:frac=0.001 -loglevel debug -f null - 2>&1 \
    | grep -c 'drop_count' # dupes / total frames → fail if > 8%
  ```

  **The one exception** is a deliberately held frame, like an outro push-in that should not zoom back
  out. That one gets `repeat`.
- **Do not use frame padding to hold a zoom.** It never reaches end of file and can balloon a
  few-second clip into gigabytes before you catch it.
- **Browser segments darken the footage.** Round-tripping through the headless browser costs about
  **3% of luma**, so the face visibly dips at every segment seam. Fix it at the root, in this order:
  1. **Do footage motion in FFmpeg instead of the browser.** A zoom or a push-in is pure geometry and
     never needs to enter a browser at all. Only reach for a browser segment when the reframe needs
     live graphics revealing behind the moving face.
  2. If it must be a browser segment, render its source frames as **PNG** rather than the default —
     that halves the dip on its own — then close the remainder with a **gamma** correction at
     assemble time (`eq=gamma=1.03`). Gamma, not a flat gain: it pins black and white and does not
     clip highlights.
- **An FFmpeg zoom on a mid-video slice needs its frame counter reset**, or the zoom comes out
  constant and reads as a hard cut instead of a ramp. Build the slice by **trimming inside the
  filtergraph and resetting timestamps** (`trim=start=…:end=…,setpts=PTS-STARTPTS`), rather than
  seeking to a start point. This is invisible when a part starts at zero, so an intro zoom can work by
  luck and every later one silently will not.
- **Anchor footage motion to measured scene cuts, not nominal ones.** The rendered base drifts from
  the cut sheet — a few hundred milliseconds by the end of a reel — and the transcript drifts with it.
  Detect the real cut with scene detection on the *rendered* file and use that time.

  ```bash
  ffmpeg -i outputs/base-cut.mp4 -vf "select='gt(scene,0.3)',showinfo" -f null - 2>&1 | grep showinfo
  ```
- **Screen recordings carry black bars.** Run crop detection (`cropdetect`) before compositing one
  into a card, or the bars get scaled in too and the readable content shrinks. And **size the card
  bigger than feels right** when writing the CSS — numbers that look generous as CSS render
  noticeably small.

## Compositing overlays onto footage

- **Type on footage always sits on a panel** (`$bg` at 92% + 1px `$rule`). Bare `$ink` type is
  legible only where the footage happens to be light — the same card read cleanly over a pale wall
  and turned to mud over a navy shirt and dark hair in one video. Chips and cards get the fill; the
  only bare type allowed is type over a region measured light for the whole beat.
- **Choose the panel treatment by measurement, before building.** Sample the mean luma of the base
  render inside each part's box across its window, and pick the treatment from the style's
  `panelContrast` thresholds — light, light-reinforced, or inverted. Do not choose by eye or by
  memory of how the room looked: a key light turned to face the speaker instead of the wall moved one
  room's negative space from luma 173 to 145, which crosses a threshold with nothing else changed.

  ```bash
  # per part, on the base cut, before the build
  ffmpeg -ss <start> -i outputs/base-cut.mp4 -frames:v 1 \
    -vf "crop=<w>:<h>:<x>:<y>,signalstats,metadata=print" -f null - 2>&1 | grep YAVG
  ```

- **Graphic zones come from the footage, not from a template.** Where the speaker sits in frame is
  fixed by their room — camera position, desk, displays — and is often asymmetric. Profile the frame
  in vertical strips, find where the subject's silhouette starts, and place side graphics in the
  measured negative space. A style whose side cards live in the right third will put every one of
  them on the speaker's face if they happen to sit right of centre.
- **Hero type never covers the face.** A 160px verdict centred on frame landed across the speaker's
  mouth. Biggest type goes in the lower band with the face clear above it.
- **The base must be the MAIN input of the filter chain.** Looped stills (`-loop 1` masks, shadows,
  borders) are infinite; if one heads the chain the output never ends. That mistake wrote a **142GB**
  file before it was caught. Chain from `[0:v]` — the base — and enable-window everything else.
- **Verify a part over the real footage, not on white.** A composition snapshot renders on a white
  background where every contrast problem disappears. Pull the frame from the composited render.
- **One pass, not two.** Every extra full-frame pass is another generation loss at 4K.

## HyperFrames project layout for a multi-part build

`lint`, `check`, `snapshot` and `render` all take a project **directory**, not a composition file.
Emit one small project per part — `parts/<id>/{index.html,hyperframes.json,assets/}` — from the
build script, so every part can be linted, checked, snapshotted and re-rendered on its own. Render
overlays with `--format mov` for a transparent ProRes 4444 track, `--fps` matching the base exactly,
and `--video-frame-format png`.

Author on the 1920×1080 canvas and scale the stage 2× in static CSS for 4K delivery, so every number
in `style.md` stays valid. The stage transform is static — GSAP never touches it, because a CSS
transform and a GSAP tween must never share a property.

**The static stage scale is not merely preferred, it is the only route to 4K alpha.**
`--resolution landscape-4k` is rejected outright for `--format mov|webm|png-sequence`: the alpha
capture path does not apply `deviceScaleFactor` and would silently emit composition-resolution
frames. So the DPR shortcut that works for opaque MP4 renders is unavailable for every overlay, and
the scale has to live in the CSS.

## Linter and workflow notes

- **Lint and validate are the gate.** Run both on every part before rendering:
  `npx hyperframes@0.8.3 lint parts/<part>.html && npx hyperframes@0.8.3 check parts/<part>.html`.
- **Contrast warnings on deliberately dim text** are worth satisfying by raising the **opacity**
  rather than the brightness. It keeps the intended look.
- **A dense-track warning on a short build is normal.** Do not refactor a handful of parts into
  sub-compositions to silence it.
- **Keep the build source durable, never only in a temp folder.** Temp is volatile on every platform;
  an overnight clear has wiped an entire in-progress build. The build script and the compositions
  belong in `graphics-build/`. Only the heavy regenerable renders belong in a cache.

## Early spot review

After the first **ten percent** of the build — not at the end — dispatch one review sub-agent (see
the `finishing` skill for the review protocol) over the parts built so far. A wrong placement habit
caught once is a fix. Caught at the end it is a rebuild.

## Done when

- Every part lints and validates.
- The duplicate-frame check on the composite is under 8%.
- No seam shows a luma dip, a footage jump, or dead air between parts.
- Every conflict between a script comment and the style file has been flagged to the human, not
  silently resolved.

Hand off to `ai-broll` if any `broll-slot` beats are unfilled, otherwise to `finishing`.
