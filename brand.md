# brand.md

The one file you personalise. Every skill reads it. Six colours, two fonts, a caption voice, a
default hook, and a mishear list — nothing else belongs here.

## Colours

Six, each with a role, each with one hex value. Six is deliberately few: a palette with twelve
entries is a palette the editor will use badly.

| Token | Role | Hex |
|-------|------|-----|
| `bg` | Background base | `#F7F5F1` warm paper |
| `rule` | Thin lines, grid, hairlines | `#DCD6CC` |
| `accent` | The one loud colour | `#E8542F` burnt orange |
| `accent-soft` | A quieter tint of it, for gradients and decoration | `#F7B9A5` |
| `ink` | Dark title text | `#14110E` |
| `muted` | Subheads and labels | `#6E665C` |

`bg` on `ink` measures 17.8:1 — well past readable. `accent` is the one bold colour and appears on
exactly one element per scene. `accent-soft` is decoration only: gradients, tints, fills. Never text.

## Fonts

| Role | Font | File |
|------|------|------|
| Display | Satoshi (Variable, weights 300–900) | `assets/fonts/satoshi/Satoshi-Variable.ttf` |
| Caption | Satoshi (same family, Bold 700) | `assets/fonts/satoshi/Satoshi-Bold.otf` |

One typeface everywhere, weight does the work: headlines Black/900, chips and captions Bold/700,
support and labels Medium/500. Static `.otf` and `.woff2` cuts of Regular/Medium/Bold/Black sit
beside the variable file for compositions that will not load a variable axis.

Renders cannot rely on system fonts. Every composition loads these by path with `@font-face`.
Satoshi is from Fontshare under the ITF Free Font License — free for commercial use, redistribution
of the font files themselves is not.

## Caption voice

Lightly cleaned verbatim. My words, with filler removed — sentence case, punctuation kept, numbers
always as digits. Cards break on phrase boundaries at three to five words, never mid-clause and
never mid-number. Technical terms keep their real capitalisation (MCP, LLM, dbt, FFmpeg) even when
that breaks sentence case.

Long form ships with no burned-in captions at all — YouTube serves its own and burn-ins clutter a
16:9 frame. This voice governs short form and any long-form pull-quote card.

## Default hook text

Not a fixed line — derived per video. Every video opens on the hook, and the strongest hook is
always already in the footage. The `rough-cut` skill proposes three candidate hook lines pulled
verbatim from the actual transcript's boldest claim, ranked, and I pick one before graphics start.

Standing fallback when a video genuinely has no usable line: **"Here's the part nobody tells you."**

Replace this section with the winning line from the first real video, once one exists.

## Links and handles

What goes on an end card or a lower third. Shared across every video type — the format decides how
they appear, this file decides what they say.

**Name on screen:** Sreeram Nudurupati. **Role line:** AI for the Working Data Engineer.
These two are what a lower third says, and they had to be guessed on 2026-08-30 because this file
only carried the channel name and the handle.

**Channel:** AI for the Working Data Engineer — handle `@srnudurupati`.
The handle is a person's name by choice; the channel name is carried on screen above it
where a format has room for two lines, and omitted where it does not.

| Channel | Label on screen | Value |
|---------|-----------------|-------|
| YouTube | `like and subscribe` | `@srnudurupati` |
| Blog | `blog` | `https://www.nudurupati.co/` |
| GitHub | `github` | `https://github.com/snudurupati` |
| LinkedIn | `linkedin` | `in/snudurupati` |
| X | `x` | `@srnudurupati` |

**Cues are matched first-wins in spoken order**, so each list must be ordered
most-specific-first and must not contain a word that is ordinary English in context.

**A channel's own name belongs in its cue list.** Added 2026-09-08: the YouTube row
was cued only on `subscribe` and `channel`, and on `03-project-context` the closing
line is "All the links for this **YouTube** video, the GitHub, LinkedIn, Twitter".
GitHub, LinkedIn and X all matched; YouTube fell through to the no-cue fallback
despite being the first channel named out loud. A platform name is a proper noun, so
it is safe under the ordinary-English rule, and it goes first because it is the most
specific term available.
On 2026-08-20 `"code"` matched "not writing **code**" 40s before the repo mention and
`"like"` matched "**like** I've done" 34s before the subscribe line; `"x"` matches
inside almost anything. Both rows would have landed against the wrong line.

## Mishear list

WhisperX reliably mangles product names, my own name, and anything unusual. Written as heard →
correct pairs, the rough cut applies them to every transcript automatically, so a mishear fixed once
is fixed in every future video. This is brand vocabulary — it belongs here, not in a separate file.

**`auto`** = single-word, whole-word swap, applied silently. **`flag`** = never auto-applied. Either
the correct form is two words (which would change the word count and break every timestamp
downstream) or the heard form is a real English word that might be genuinely meant.

| Heard | Correct | Mode |
|-------|---------|------|
| Sriram, Shriram, Sreeraam, Shreeram | Sreeram | auto |
| Sri Ram, Sree Ram | Sreeram | flag (two words) |
| Claud, Clod, Cloude | Claude | auto |
| cloud | Claude | flag (real word — "cloud" makes a perfectly good sentence look broken) |
| Anthropics, Anthropik | Anthropic | auto |
| and tropic, anthro pick | Anthropic | flag (two words) |
| MSP, MCPs | MCP | flag (MSP is a real term) |
| ELM, LLMs, L L M | LLM | flag (check plural intent) |
| Oppus, Opis | Opus | auto |
| agenic, agentech, a genetic | agentic | auto |
| Whisper X, whisper ex | WhisperX | flag (two words) |
| FF MPEG, FFM peg, F F Meg | FFmpeg | flag (two words) |
| Hyper Frames, hyperframe | HyperFrames | flag (two words) |
| Data bricks, data breaks | Databricks | flag (two words) |
| Snow flake | Snowflake | flag (two words) |
| Kubernetis, Kubernets, Coobernetes | Kubernetes | auto |
| Postgress, Post grass | Postgres | auto |
| Kafta, Kavka | Kafka | auto |
| Inman, Inmon's | Inmon | auto |
| Bill and Mon, Bill Inman | Bill Inmon | flag (two words) |
| DBT, D B T, debt | dbt | flag (lowercase brand, "debt" is a real word) |
| Terra form, terror form | Terraform | flag (two words) |
| Tera form | Terraform | auto |
| dbdcore, dbt core | dbt-core | auto |
| duck DB, duckdb | DuckDB | auto |
| duckdbt, duck dbt | dbt-duckdb | flag (could be dbt or the adapter, check context) |
| wipe coding, white coding | vibe coding | flag (two words) |
| ei agent, a i agent | AI agent | flag (two words) |
| XRUS, ex rus | across | flag (real word once split) |
| chat gbd, chat gpt, chatgpt | ChatGPT | flag (two words) |
| the green | the grain | flag (real word, and "grain" is the whole subject of a modelling video) |
| agents.md, agents dot md | AGENTS.md | auto |
| codecs, co decks | Codex | flag ("codecs" is a real word this channel also uses) |

The dictionary pass in `rough-cut` grows this list from real transcripts: anything neither ordinary
English nor already listed gets judged in context. A recurring brand name lands here permanently; a
one-off lands in the per-video list in the job's `transcript/` folder.

## Machine-readable block

Skills parse this. Keep it in sync with the tables above.

```json
{
  "colors": {
    "bg": "#F7F5F1",
    "rule": "#DCD6CC",
    "accent": "#E8542F",
    "accent-soft": "#F7B9A5",
    "ink": "#14110E",
    "muted": "#6E665C"
  },
  "fonts": {
    "display": {
      "family": "Satoshi",
      "file": "assets/fonts/satoshi/Satoshi-Variable.ttf",
      "weights": { "headline": 900, "chip": 700, "support": 500 }
    },
    "caption": {
      "family": "Satoshi",
      "file": "assets/fonts/satoshi/Satoshi-Bold.otf",
      "weights": { "caption": 700 }
    }
  },
  "captionVoice": "Lightly cleaned verbatim. Filler removed, sentence case, punctuation kept, numbers as digits. 3-5 word cards broken on phrase boundaries, never mid-clause. Technical terms keep real capitalisation. Long form ships uncaptioned.",
  "defaultHook": {
    "mode": "derived-per-video",
    "rule": "rough-cut proposes three candidate hook lines verbatim from the transcript's boldest claim, ranked; human picks before graphics start",
    "fallback": "Here's the part nobody tells you."
  },
  "presenter": {
    "name": "Sreeram Nudurupati",
    "role": "AI for the Working Data Engineer",
    "_why": "what the lower third says. Added 2026-08-30; before that the skill had to infer a name from the mishear list and the handle."
  },
  "channel": {
    "name": "AI for the Working Data Engineer",
    "handle": "@srnudurupati",
    "_why": "the handle is a person's name by choice. Where an end card has room for two lines, the channel NAME goes above the handle; where it does not, the handle alone is correct and complete. Added 2026-08-20; still-data-engineer shipped with handle only, which is not a defect."
  },
  "links": [
    { "id": "youtube",  "label": "like and subscribe", "value": "@srnudurupati",
      "channelName": "AI for the Working Data Engineer",
      "cues": ["youtube", "subscribe", "channel"] },
    { "id": "blog",     "label": "blog",     "value": "https://www.nudurupati.co/",
      "cues": ["blog"] },
    { "id": "github",   "label": "github",   "value": "https://github.com/snudurupati",
      "cues": ["github", "repo"] },
    { "id": "linkedin", "label": "linkedin", "value": "in/snudurupati",
      "cues": ["linkedin", "connect"] },
    { "id": "x",        "label": "x",        "value": "@srnudurupati",
      "cues": ["twitter"], "noCueFallback": "lands with the final cued row" },
    { "_note": "noCueFallback is NOT specific to x. Whichever channel goes unmentioned takes it. On 02-first-agent, x WAS cued (\"or Twitter\") and BLOG was never spoken, so blog took the fallback. Match cues against the closing section only: \"repo\" appears 10 times earlier in that video and would have fired the github row at 2:22 instead of 12:33." }
  ],
  "misheard": [
    { "heard": ["Sriram", "Shriram", "Sreeraam", "Shreeram"], "correct": "Sreeram", "mode": "auto" },
    { "heard": ["Sri Ram", "Sree Ram"], "correct": "Sreeram", "mode": "flag", "why": "two words" },
    { "heard": ["Claud", "Clod", "Cloude"], "correct": "Claude", "mode": "auto" },
    { "heard": ["cloud"], "correct": "Claude", "mode": "flag", "why": "real word" },
    { "heard": ["Anthropics", "Anthropik"], "correct": "Anthropic", "mode": "auto" },
    { "heard": ["and tropic", "anthro pick"], "correct": "Anthropic", "mode": "flag", "why": "two words" },
    { "heard": ["MSP", "MCPs"], "correct": "MCP", "mode": "flag", "why": "real term" },
    { "heard": ["ELM", "L L M"], "correct": "LLM", "mode": "flag", "why": "check plural intent" },
    { "heard": ["Oppus", "Opis"], "correct": "Opus", "mode": "auto" },
    { "heard": ["agenic", "agentech", "a genetic"], "correct": "agentic", "mode": "auto" },
    { "heard": ["Whisper X", "whisper ex"], "correct": "WhisperX", "mode": "flag", "why": "two words" },
    { "heard": ["FF MPEG", "F F Meg"], "correct": "FFmpeg", "mode": "flag", "why": "two words" },
    { "heard": ["Hyper Frames", "hyperframe"], "correct": "HyperFrames", "mode": "flag", "why": "two words" },
    { "heard": ["Data bricks", "data breaks"], "correct": "Databricks", "mode": "flag", "why": "two words" },
    { "heard": ["Snow flake"], "correct": "Snowflake", "mode": "flag", "why": "two words" },
    { "heard": ["Kubernetis", "Kubernets", "Coobernetes"], "correct": "Kubernetes", "mode": "auto" },
    { "heard": ["Postgress"], "correct": "Postgres", "mode": "auto" },
    { "heard": ["Kafta", "Kavka"], "correct": "Kafka", "mode": "auto" },
    { "heard": ["Inman"], "correct": "Inmon", "mode": "auto",
      "why": "Bill Inmon, alongside Kimball. Recurring on a data-engineering channel; first hit 2026-09-08" },
    { "heard": ["Bill and Mon", "Bill Inman"], "correct": "Bill Inmon", "mode": "flag", "why": "two words" },
    { "heard": ["DBT", "D B T", "debt"], "correct": "dbt", "mode": "flag", "why": "real word" },
    { "heard": ["Terra form", "terror form"], "correct": "Terraform", "mode": "flag", "why": "two words" },
    { "heard": ["Tera form"], "correct": "Terraform", "mode": "auto" }
  ],
  "misheardPerVideo": []
}
```
