# editorial — creative direction

> **Authority.** `style.json` is authoritative for **whether** — every constraint, limit, allowed
> value and on/off decision is a key in that file. This file is authoritative for **how** — the
> mechanics, anatomy, geometry and pacing of the things `style.json` permits.
>
> Do not write a constraint in this file. No "never", "always", "only", "must" about *whether*
> something is allowed — those belong in `style.json` and nowhere else. Describing a mechanic
> ("the chip wipes up, never dissolves") is fine; that is how, not whether.
>
> **If the two files disagree, that is a bug in the style, not a decision to make.** Stop, report the
> contradiction, and ask. Resolving it silently — in either direction — is how a wrong edit gets
> made while claiming the style file called for it. This rule exists because exactly that happened
> on 2026-08-18: prose said long form "never reframes" while this same file specified long-form PiP
> geometry, and the prose line was used to strip a requested picture-in-picture out of an edit.
>
> `check_style.py` enforces the first half of this mechanically. Run it after editing either file.

The bar for this file: you should be able to make a new video in this style from this file alone,
without ever rewatching a reference. If it reads like a mood board full of adjectives, it is not done.

Colours are always tokens (`$bg`, `$rule`, `$accent`, `$accent-soft`, `$ink`, `$muted`) resolved from
`brand.md`. Never a hex value in this file.

## What this style is for

Talking-head explainer built out of a clean editorial grid: a lot of face, a little type, and
graphics that show rather than tell. Long form is the primary format (`primaryFormat`), authored on
a 1920×1080 canvas and delivered at whatever `delivery` says. It leans on full-frame takeovers,
lower thirds, and reframes expressed as named scenes — `panel` for content beside the face, `demo`
for a screen recording with the face inset. Short form runs the same scene vocabulary with the
reframe and caption behaviour `style.json` specifies for it, and is cut down from the long-form base
rather than edited separately.

Palette is light: paper `$bg` with near-black `$ink`, so graphics read as printed editorial rather
than as a dark dashboard. Type is one family, Satoshi, with weight doing all the work — 900 for
headlines, 700 for chips and captions, 500 for support.

## Scene vocabulary

Six scene types. Every beat in a cut sheet is one of these, by name.

| Name | What it is | When it runs |
|------|-----------|--------------|
| `head` | Full-frame face, no overlay. | Default. Connective tissue, asides, emotional delivery. |
| `chip` | Face full-frame with a small label under the chin. | Naming a thing, a section marker. |
| `panel` | Face reframed to picture-in-picture, content beside it. | Stats, lists, comparisons, screenshots that need the face for reaction. |
| `takeover` | Content fills the frame, face gone. | A screen recording or diagram that needs every pixel. |
| `push` | Face full-frame with a slow camera move on it. | Payoff lines, the hook, the last line before a turn. |
| `slot` | A generated or shot B-roll clip fills the frame. | A beat with no real footage. |
| `demo` | A screen recording fills the frame with the face inset in a corner. | A live demo or walkthrough that needs every pixel *and* the speaker's presence. |

Rhythm: `head` is the floor and everything returns to it. Never more than two consecutive non-`head`
scenes without a `head` beat between them, except inside one continuous `panel` run (see below).

## Transitions — the mechanic at every boundary

| Boundary | Mechanic |
|----------|----------|
| `head` → `head` | Hard cut on the breath. No dissolve, ever. |
| `head` → `chip` | Chip wipes up from behind the lower edge, 0.35s, `power3.out`. Face untouched. |
| `head` → `panel` | Face reframes to PiP over 0.5s `power2.inOut`; content enters 0.4s **after** the reframe settles. |
| `panel` → `panel` | Face stays in PiP. Only the content swaps: outgoing clip-masks out left, incoming clip-masks in right, 0.3s, no gap. |
| `panel` → `head` | Content leaves first (0.3s), face returns to full frame over 0.5s `power2.inOut`. |
| `head` → `takeover` | Hard cut to the takeover. No transition — the cut is the transition. |
| `takeover` → `head` | Hard cut back. |
| `push` in/out | No boundary treatment. The move itself is the transition. |
| Any → `slot` | Hard cut in, hard cut out. B-roll never dissolves. |
| `head` → `demo` | Hard cut to the screen. Face inset scales in from 0.92 with opacity 0→1 over 0.5s `power2.inOut`, starting 0.3s after the cut. |
| `demo` → `head` | Face inset scales out to 0.92 and fades over 0.35s, then hard cut back to full frame. |

**The one-entry rule.** The picture-in-picture enters once per graphics run and everything between
entries chains inside it. Bouncing full frame → PiP → full frame → PiP is the single most
amateur-looking thing an AI editor does. Hard cuts between panel *contents* are fine; a full-screen
bounce never is.

## Picture-in-picture geometry (exact)

Long form, 1920×1080 frame:

- Face wrapper: `width 648px, height 648px, left 96px, top 216px`, radius `24px`, 1px `$rule` border.
- Content column: `left 816px, width 1008px`, vertically centred in the 1080 frame, `72px` gutter.
- The video inside the wrapper is **never transformed**. The wrapper crops it (`overflow: hidden`)
  and the wrapper's `left/top/width/height` animate. A transform on a `<video>` renders as nothing.

`demo` scene inset — long form, 1920×1080 canvas (double every value at 3840×2160 delivery):

- Screen recording fills the frame. It is the content; nothing crops it.
- Face inset: `width 480px, height 480px, left 1368px, top 528px` — bottom-right, 72px margins.
  Radius `24px`, 1px `$rule` border, `0 8px 32px rgba(0,0,0,0.35)` shadow.
- The face is cropped square by its wrapper, never transformed. Composite it with FFmpeg geometry
  rather than a browser segment: it is pure geometry for minutes at a time, and round-tripping that
  much footage through a headless render costs ~3% luma on every frame of it.
- The inset enters once and leaves once, exactly like `panel`. No bouncing.
- It **may move to the opposite corner, or fade out entirely**, for a span where the screen
  content needs the space: a slide whose columns are building, or a diagram using the whole
  frame. Use the same enter and exit mechanic, and jump position on an existing cut boundary
  so the move is invisible. The one-entry rule is about the frame changing between full and
  picture-in-picture; here the frame is unchanged and only the inset moves, so that rule is
  not the one in play. `style.json` carries the permission.

Short form, 1080×1920 frame:

- Content occupies `y 260 → 940`. Face wrapper occupies `y 980 → 1620`, full width inset `60px`.
- Nothing readable ever enters `y < 200` or `y > 1620`.

## Graphic zones — where things can go in this setup

The camera sits left of a two-display desk and the speaker sits right of it, so the frame is
permanently asymmetric: empty wall on the left, speaker and dressed background (bookcase, lamp,
picture) on the right. That is a fixed constraint of the room, not a framing choice, so the zones
below are measured from the footage rather than assumed. Canvas coordinates, 1920×1080.

| Zone | Canvas box | Use |
|------|-----------|-----|
| Left column | `x 96 → 840`, `y 100 → 980` | Side cards, stats, stacks, quote cards. The full-height negative space. |
| Lower band | `x 96 → 1824`, `y 720 → 972` | Full-width strips only: lower thirds and chips. Hero type does NOT go here (see below). |
| Hero left | `x 96 → 820`, `y 300 → 940` | Title, hook and verdict cards. The left negative space, clear of the face entirely. |
| Top band | `x 96 → 1200`, `y 60 → 280` | Pipeline diagrams and horizontal node rows. Stops at 1200 — the framed picture starts there. |

The speaker's silhouette begins at roughly `x 840`, with the shadow it casts starting near `x 720`.
**Nothing readable goes right of `x 820` outside the lower band.** The chin sits between `y 710` and
`y 820` depending on posture, which is why the lower band starts at 720 rather than 690.

Re-measure these when the room or framing changes: sample a frame in vertical strips and read the
luma profile, and measure the chin line as well as the subject edge. Last measured **2026-08-30** on
`02-first-agent` — clean wall 159–166 out to `x 560`, 146–153 to `x 720`, the cast shadow 128–140
across `720–840`, subject 102–126 from `x 840`. The wall now reads 152–166 overall, above the 150
threshold, so left-column parts take the **inverted** treatment. The speaker also gestures into the
left column, reaching `x 290` on one beat, so lower-left content can be crossed by a hand.

## Panel treatment is measured, not assumed

Type composited onto footage is legible only against footage of the right brightness, and this room
puts the brightest surface exactly where the graphics go. So the panel treatment is chosen per part,
from the actual footage under it, not from taste:

Sample the mean luma of the base render inside the part's box across its window, then:

| Measured background luma | Treatment |
|--------------------------|-----------|
| `< 110` | Light panel: `$bg` at 92%, 1px `$rule` border. |
| `110 – 150` | Light panel plus a 2px `$rule` border and a soft drop shadow, so the edge survives. |
| `> 150` | **Inverted panel**: `$ink` at 92% fill, `$bg` text, `$accent` unchanged. |

When a part's own window **crosses** a threshold, take the more robust treatment rather
than the mean's — this room's left wall reads 147–156 and straddles the 150 line, so
three cards in the same zone would otherwise split treatment over a six-luma wobble.

A part sitting over a **screen recording** goes opaque regardless of what it measures.
Mean luma cannot see detail density — a dark terminal full of bright syntax-coloured text
measures the same as a dark shirt and wants the opposite treatment.

Sample the part's **actual box**, not the zone it sits in. The end card measured 147.5
across the whole left column and 150.9 across the rows it really covers — a different
treatment from the same footage.

The accent colour keeps its meaning in all three. This is what makes the graphics independent of the
lighting on any given day — the wall measured 173 before the key light was turned around and 140–155
after, which crosses a threshold without anything in this file changing.

## Title card anatomy

Top to bottom, on `$bg` with a 1px `$rule` hairline grid at 10% opacity:

1. **Eyebrow** — display font, 28px, `$muted`, letterspaced `0.18em`, uppercase. One or two words.
2. **Headline** — display font, 120px long form / 96px short form, `$ink`, line height 1.05, max
   three lines. This is the hero. **120px is a full-frame figure.** In the 290px lower
   band a headline is one line at ~100px — 120px over two lines overflows the band by
   62px. The verdict is the exception at 180px, the largest that still leaves the accent
   rule clear of the descenders.
3. **Rule** — 2px `$accent` line, draws in left to right over 0.45s. Never fades in.
4. **Support** — caption font, 36px, `$muted`, one line, optional.

The accent colour appears on exactly one element per card — usually the rule, occasionally one
headline word. Never both.

## Camera behaviour inside a scene

- `push`: 1.00 → 1.06 scale over the full beat, `power1.inOut`, anchored on the eyes. Done in FFmpeg
  geometry, not in the browser.
- `panel` content: a 1.00 → 1.03 drift on screenshots so a still asset is never actually still.
- Any beat 20 seconds or longer carries continuous motion for its whole duration. A count-up that
  finishes at 6 seconds of a 19 second beat reads as a frozen frame for 13 seconds.
- Nothing zooms back out unless the script says so.

## Texture

- Background is never flat: `$bg` base with a `$accent-soft` radial at 8% opacity, plus a 1px
  `$rule` grid at 60px pitch, 6% opacity.
- Panels read on their own fill (`$bg` at 92% + 1px `$rule`). No backdrop blur — transparent
  overlays have nothing behind them to blur.
- A 3% monochrome grain over full-frame graphics. No grain on overlays composited over footage.

## Font roles

- Display font: headlines, eyebrows, stat numbers, chips.
- Caption font: burned-in captions, support lines, labels, axis text.
- Stat numbers are display font at 160px minimum. Scale is dramatic or it is not a stat.
  In the 290px lower band 160px is also effectively the **ceiling**: a 220px numeral
  overlaps its own label there. The sub-line goes in the card's right column, not stacked
  beneath the number, for the same reason.

## Pacing (measured, not vibes)

- Average `head` beat: 4–7s. Anything over 12s wants a `chip` or a `push`.
- `panel` runs: 15–45s, containing 2–5 content swaps.
- `takeover`: 6–20s. Under 6s reads as a glitch.
- `demo`: no upper bound. A presentation or walkthrough runs as one continuous scene; the 6–20s
  ceiling above is for graphic takeovers, not for footage the video is actually about.
- Entrance stagger between elements: 0.4s minimum, never simultaneous.
- Any timing taken from the transcript is **re-derived at build time and range-checked against
  the part that owns it**. A cue that falls outside its own part renders nothing and errors
  nowhere.
- Per-letter stagger for text reveals: **up to** 0.045s — it is a maximum, not a fixed
  value. The headline landing by 0.8s is the budget, and the stagger derives from it:
  `stagger = min(0.045, (0.8 - tweenDuration - startAt) / (chars - 1))`. Short headlines
  keep the 0.045s feel; long ones speed up so they still land on time. Stated as two
  independent figures these contradict above about fourteen characters — a 25-character
  hook at a flat 0.045s lands at 1.68s, double the budget.
- Card holds: headline lands by 0.8s, card holds until the next part starts — never fades early.
- **Any card whose copy quotes something spoken lands on the cue, not on the card's
  entrance.** A count-up finishes *on* its number; a hero line arrives *with* its phrase.
  Early is a spoiler, late reads as lag. The 0.4s stagger rule exists to separate
  simultaneous entrances — speech already separates these. Take the cue time from
  `outputs/transcript-cut.json`, not from the beat's start.

## Standing corrections

Corrections that should apply to every future video get appended here (and to `learned` in
`style.json`) before a job is closed out. One-off notes are applied and forgotten.

- **2026-08-19 — long form may reframe.** The original wording said long form "never reframes" while
  this same file specified long-form PiP geometry and `head → panel` transitions. The no-reframe line
  was wrong, and it was used once to strip a requested PiP out of an edit. Reframes are allowed as
  named scenes.
- **2026-08-19 — graphics live in the left column, not the right third.** The camera is fixed left of
  a two-display desk and the speaker sits right of it. Every side card originally specified in the
  right third would land on their face. Measured zones are in "Graphic zones" above.
- **2026-08-19 — panel treatment is sampled from the footage, not chosen.** The negative space in
  this room is also its brightest surface, and its luma moves when the lighting changes. Three
  treatments, selected per part by measurement. See "Panel treatment is measured, not assumed".
- **2026-08-19 — type over footage always sits on a panel.** Bare `$ink` type composited straight
  onto footage is legible only where the footage happens to be light. On job1 the same card read
  cleanly over a pale wall and became mud over a navy shirt and dark hair. Every card, stat, finding
  and verdict gets the `$bg` 92% + 1px `$rule` panel. Chips already had it. The only type allowed
  bare on footage is type positioned over a region measured to be light for the whole beat.
- **2026-08-19 — the biggest type never covers the face.** A 160px verdict centred on the frame
  landed across the speaker's mouth. Hero type belongs in the lower band with the face clear above it.
- **2026-08-30: hero cards go in the LEFT negative space, not the full-width lower band.** "Face clear
  above" was not enough: the lower band runs `x 96 → 1824`, so it passes under the chin and mouth. The
  hook card and the verdict card both landed on the speaker's face, and the human noted this had
  happened in earlier videos too. Title, hook and verdict cards now sit in the `heroLeft` zone,
  `x 96 → 820`, `y 300 → 940`, which is clear wall in this room. Headline wraps to two or three lines
  at 72-84px rather than running one line across the frame. The full-width lower band remains available
  for lower thirds and chips, which are small enough to sit beside the face rather than over it.
- **2026-08-19 — `demo` scene added.** Screen recordings with the speaker present get a corner inset
  over a full-frame screen, not the `panel` split, which shrinks dense screen text past legibility.
