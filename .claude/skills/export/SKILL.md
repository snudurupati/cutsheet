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

## Which file is the deliverable: never guess this

**Take it from `outputs/audio-plan.json` → `output`**, which the finishing stage wrote. Do not pick
the newest render by mtime, and do not filter candidates by extension.

Two sessions in a row patched the same `.mov` vs `.mp4` split in this script by adding names to a
list, and the bug survived both times, because a denylist of stems cannot express "which render is
finished". On 2026-08-31 the picker still saw only `*.mp4`, so `finished.mov` was invisible to it: the
plan was to promote `graphics-pass.mp4`, which has no music and no sound effects, and then delete the
one file that did.

**Then gate the promotion on content, not on the name.** A plan can name a stale file. Assert the
render actually carries what the plan describes before promoting it:

- take the **10th-percentile short-window RMS** inside a music placement and in a music-free window,
- require the bed to lift the quiet floor by **at least 4 dB**.

The percentile is the whole trick. A bed at -30 LUFS under a -21 LUFS voice moves the *mean* by tenths
of a dB, which no gate can read. It holds the level up in the speech pauses, which is obvious. On this
job the finished mix scored +7.2 dB and the graphics pass scored -15.4 dB: a 22.6 dB separation.
If the gate fails, refuse to promote and refuse to reclaim. Do not fall through to another file.

## Promoting is a remux, not a copy

The finishing render carries lossless PCM audio in a `.mov`. `shutil.copy2` onto a `.mp4` name gives
you a file whose extension lies about its container. Copy the **video** stream and re-encode only the
audio:

```bash
ffmpeg -i finished.mov -map 0:v:0 -map 0:a:0 -c:v copy -c:a aac -b:a 320k -movflags +faststart final.mp4
```

Then verify, because size cannot tell you a remux was correct once the container changed: duration
within 50ms, **video stream md5 identical** to the source, and an audio stream present. Check the AAC
encode did not shift audio against the copied picture by correlating the two envelopes at several
points. Decode both files **in full from zero** to do it. Seeking each file separately with `-ss`
lands on different packet boundaries in the two containers and manufactures a 15-20ms phantom lag
that is entirely your own measurement.

## Half one — promote

- **Promote** the render identified above to a single clearly named final:
  `outputs/<job>-final-<format>.mp4`.
- **Retire** the superseded drafts.
- **Keep**, always: the base cut, the transcripts, and `graphics-build/` — the job has to be
  reopenable.
- **Drop a copy** somewhere convenient, e.g. `~/Downloads/`.

## Record what shipped, and resolve it by that record

On promote, write `outputs/deliverable.json`: the name, byte size, mtime and what it was
promoted from. Later runs resolve the deliverable through that record, **never through a
filename prefix**.

On 2026-08-31 the promoted file lost its `02-` prefix to something outside this pipeline. The
prefix test immediately reclassified the shipped 4.25 GB file as a superseded draft and listed it
for deletion. Only the "never delete anything newer than the deliverable" mtime guard kept it,
and that held by luck of timing rather than by design. If the record's name is missing but a file
matches its size and mtime, treat that file as the deliverable renamed, say so, and keep it.

Content hashing does not solve this. The finishing master and the graphics pass share a video
stream md5 whenever the mix was muxed with `-c:v copy`, so the picture cannot tell the shipped
file from the draft it came from. Only a record can.

## The lossless master is not swept by promotion

The file you promoted FROM carries the same picture with audio that has never been through a
lossy encode. Regenerating it means re-running the composite and the mix, the most expensive step
in the job. Keep it unless the human asks for it by name, behind an explicit `--drop-master`.
Promoting is not consent to delete the master.

## Never sweep build source out of a reclaim target

`RECLAIMABLE_DIRS` names directories by convention and the convention drifts. On 02-first-agent
`graphics-build/parts` held the twelve generated HTML compositions, 112 KB of reviewed source,
not the ProRes renders the name implies. Check the target for source extensions before deleting
it and skip it if it has any. Deleting build source to reclaim kilobytes is never the trade, and
hard rule 8 says the build source is durable.

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

The RETIRE list is only deleted with `--reclaim --apply`. A bare `--apply` promotes and writes
`deliverable.json`, prints "applied" and deletes nothing. On 04-lightweight-ontology that looked
like a finished cleanup with all three drafts still on disk. Run `--reclaim` (dry) first and check
its list against the plan the human approved.

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
