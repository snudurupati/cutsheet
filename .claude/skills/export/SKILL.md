---
name: export
description: Stage 5 of the video pipeline. Turn a messy outputs folder into one unambiguous final file — promote the newest real render, retire superseded drafts, keep everything needed to reopen the job, copy the deliverable somewhere convenient, and absorb standing corrections into the style file. Dry run by default. Use to close out a job or to reclaim disk afterwards.
argument-hint: "projects/<job> [--reclaim] [--apply]"
user-invocable: true
allowed-tools: Bash, Read, Write, Edit, Glob
---

# Skill 5 — export

**Whole job:** turn a messy outputs folder into one unambiguous file.

By the end of a job you have a base cut, a graphics pass, a captions pass, a music pass and two
drafts — and in a week you will not know which one shipped.

## Half one — promote

- **Promote** the newest real render to a single clearly named final:
  `outputs/<job>-final-<format>.mp4`.
- **Retire** the superseded drafts.
- **Keep**, always: the base cut, the transcripts, and `graphics-build/` — the job has to be
  reopenable.
- **Drop a copy** somewhere convenient, e.g. `~/Downloads/`.

## Half two — reclaim space (separate, optional)

Reclaimable: render scratch, cached intermediate renders, stray `node_modules`.

**Never source footage. Never the `outputs/` folder.**

## Two rules make this safe enough to trust

**0. Promote freely; never reclaim on your own initiative.** Promoting and copying the deliverable is
finishing the job. Deleting is not — the plan exists to be read by a human, so an unattended session
prints it and stops there, even when told to "finish the job". Everything reclaimable is regenerable
from `raw/` plus the scripts; the hours saved by deleting it are never worth deleting something the
user wanted for the morning's iteration.

**1. Dry run by default, always.** Both halves print exactly what they would promote, delete and
keep, and do nothing until an explicit `--apply` flag is passed after the plan has been read.

```bash
python3 .claude/skills/export/export.py projects/<job>            # prints the plan, changes nothing
python3 .claude/skills/export/export.py projects/<job> --apply    # only after reading it
```

**2. Never delete anything newer than the deliverable.** Put that guard **inside the script itself**,
comparing modification times — not in the prompt, not in a comment — so a future session cannot talk
itself past it.

```python
if os.path.getmtime(candidate) > os.path.getmtime(deliverable):
    keep(candidate, reason="newer than deliverable — never deleted")
```

## Absorb the corrections before closing out

Every note given in final review is a note that gets given again next week unless it is written down.

- A correction that **should apply to every future video** gets written back into
  `styles/<style>/style.md` (prose) **and** `style.json` → `learned[]` (the knob), before the job is
  closed out.
- A **one-off** note is applied to this video and forgotten.
- **Show the diff before it becomes standing behaviour.** Print the proposed style-file change and
  get a yes — a standing rule adopted silently is how a style file drifts away from actual taste.

Because the review sub-agents in `finishing` read the style fresh on every pass, an absorbed
correction tightens every future review with no extra wiring.

## Done when

- Exactly one file in `outputs/` reads as the deliverable, by name.
- Drafts are retired; base cut, transcripts and `graphics-build/` are intact.
- A copy is in the convenient location.
- Standing corrections are in the style file, with the diff shown and approved.
- Nothing newer than the deliverable was deleted.
