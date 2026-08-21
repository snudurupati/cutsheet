---
name: ai-broll
description: Stage 3 of the video pipeline. Turn a beat with no footage into a rendered clip — map the beat to a scene template, write a prompt that carries the design rules, generate with HyperFrames or Higgsfield, and write a manifest entry. Generation only; it never picks windows in existing footage and never composites. Use for broll-slot beats left by the graphics plan.
argument-hint: "projects/<job>"
user-invocable: true
allowed-tools: Bash, Read, Write, Edit, Glob
---

# Skill 3 — AI B-roll

**Whole job:** turn a beat that has no footage into a rendered clip.

**Note what it does not do.** It does not pick windows in footage you already shot — that belongs in
`graphics`. And it does not composite anything into the final video. It generates a clip and writes a
manifest entry, and that is it. **Keeping generation separate from placement is what makes both
debuggable.**

Input: the `broll-slot` entries in `graphics-build/cutsheet.json`.
Output: clips in `projects/<job>/broll/generated/` plus `broll/manifest.json`.

## Map every slot to a scene template before writing a prompt

Picking the right one up front is most of what stops the output reading generic.

| The beat is about | Reach for |
|-------------------|-----------|
| One big number landing | Stat reveal |
| Several categories at once | Data breakdown |
| Parts of a whole | Pie or donut |
| Things ranked | Podium |
| A system or process | Flowchart |
| "Look what showed up" | Phone notification |
| Old versus new | Before and after |
| Words as the payoff | Kinetic type |

Eight templates, and the same layout must never be reused for two consecutive beats.

## The twelve design rules

These are what separate motion design from PowerPoint. **Make at least half of them explicit in every
single prompt** rather than hoping the render figures them out.

1. Text never just fades in. Clip-mask reveals, or word by word.
2. Nothing animates simultaneously. Stagger everything by at least **0.4 seconds**.
3. The background is never flat. Gradient, vignette, or a fine grid.
4. The accent colour appears on **exactly one element per scene**.
5. Numbers count up or flip. They never just appear.
6. Exits are designed. Elements leave with purpose.
7. Generous whitespace. More than feels right.
8. One focal point per frame. Never more than two things moving.
9. Scale is dramatic. Primary numbers **160px minimum**.
10. Connectors and dividers draw in, never appear.
11. Small premium details. Thin highlights, low-opacity reflections.
12. Motion blur on fast travel, removed once settled.

Colours and fonts come from `brand.md` as tokens. Named GSAP eases only — `power3.out`, not "smooth".

## The failure list

The mirror image of the twelve. If a generated clip shows any of these, it gets regenerated, not
patched:

- the same layout reused for every beat,
- "fade in" instead of a real entrance,
- no stagger,
- a flat background,
- a vague ease like "smooth" instead of a named one,
- small type,
- no exits,
- too many colours,
- everything moving at once.

## Render settings — three rules, all of them load-bearing

**Frame rate: the base video's exact rate, probed, never guessed.** If the base is 23.976 you pass
`24000/1001`, not `24`. A rounded guess drifts out of sync the moment the clip is composited back.

```bash
ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 outputs/base-cut.mp4
```

**Every generated clip is silent.** The base voice track keeps playing underneath. If a render
produces an audio stream anyway, strip it (`-an`) before writing the manifest.

**Duration is the beat window plus half a second of tail margin.** A clip that ends exactly on its
boundary is a bug waiting for the next composite.

## The manifest

`broll/manifest.json` — one entry per generated clip, and the only thing `graphics` reads back:

```json
{ "clips": [
  { "partId": "g014", "file": "broll/generated/g014-stat-reveal.mp4",
    "template": "stat-reveal", "source": "hyperframes",
    "start": 184.200, "end": 191.700, "durationSeconds": 8.0,
    "fps": "24000/1001", "hasAudio": false, "prompt": "…" }
] }
```

`source` is `hyperframes` for anything code can draw — text, numbers, charts, diagrams, kinetic type
— and `higgsfield` for generated footage and imagery code cannot draw. Prefer HyperFrames whenever
the beat is one of the eight templates: it is deterministic, free, and on-brand by construction.

Higgsfield runs as an MCP server; if it is not connected, say so and generate what HyperFrames can
rather than silently skipping the beat.

## Done when

- Every `broll-slot` beat has a clip or an explicit skip with a reason.
- Every clip probes at the base frame rate exactly, and has no audio stream.
- Every clip runs its window plus 0.5s.
- No two adjacent slots use the same template.
- `broll/manifest.json` validates.

Hand back to `graphics` for placement. This skill never composites.
