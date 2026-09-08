# How to fire off a video edit

Everything the pipeline needs is already written down: the stages in `CLAUDE.md`, the look in
`styles/`, the voice and palette in `brand.md`, the recording spec inside the video-type skill.
**A prompt that repeats any of that is not adding direction.** Keep the prompt to what the files
cannot know.

---

## 1. Check the tools, once per machine or after any upgrade

```bash
ffmpeg -version | head -1 && node --version && uv --version && python3 -c "import PIL; print(PIL.__version__)" && whisperx --version && npx hyperframes@0.8.3 --version
```

Versions are pinned in `CLAUDE.md`. A silent upgrade breaks renders that were already signed off.

## 2. Make the job

Name the folder after what the video is **about**, in kebab case. Never the camera filename, never a
date, never a stage suffix like `-v2` or `-final`.

```bash
cd ~/Projects/video-editor
JOB=<content-name-in-kebab-case>
mkdir -p projects/$JOB/{raw,broll,audio/soundtracks,audio/sound-effects,assets,transcript,graphics-build,outputs}
cp assets/sfx/*.mp3 projects/$JOB/audio/sound-effects/
```

## 3. Copy in the footage

This takes the **newest** Camera and Screen file, so an old take in `~/Movies/SourceRecorder` cannot
get picked up by a glob:

```bash
cp "$(ls -t ~/Movies/SourceRecorder/Camera-*.mov | head -1)" "$(ls -t ~/Movies/SourceRecorder/Screen-*.mov | head -1)" projects/$JOB/raw/ && ls -lh projects/$JOB/raw/
```

Check the two filenames carry the **same timestamp**. They are one recording shot as two clips, and
a mismatched pair is the one error the pipeline cannot detect for you: it will align and cut a face
camera against the wrong screen capture, and every gate will pass.

The two clips will differ slightly in length. That is expected and handled (OBS starts the filters a
few frames apart and stops them together, so the pipeline aligns at the tail).

## 4. Drop the soundtrack in

```bash
cp <the licensed track for this video> projects/$JOB/audio/soundtracks/
```

Music is licensed per video, so it lives in the job. Sound effects are permanent and were copied out
of `assets/sfx/` in step 2, never the other way round.

## 5. Run it

Print the path, then open Claude Code in the workspace root and paste it:

```bash
echo "/tech-video-editor projects/$JOB"
```

**Name the skill.** The footage hints at the video type but relying on that is a guess, and guessing
wrong silently skips the recording spec and the default treatment that skill owns.

---

## What to add to the prompt, and what not to

Add only what the footage and the files cannot supply:

- direction that is in neither the script nor the footage: "this beat is the payoff", "cut it harder
  than usual", "no music on this one"
- a correction you want applied this time
- `run under caffeinate, don't wait for my input` to hand the job off unattended

Do not restate the stages, the style, the palette or the safe zones. If the pipeline asks you
something the footage could have answered, that is a bug in the skill, not a missing line in your
prompt.

## What it will ask you

The pipeline measures what it can and asks about taste it cannot measure. Expect these:

| When | What it asks |
|------|--------------|
| After the rough cut | Three candidate hook lines, pulled verbatim from your own transcript, ranked. Pick one. |
| Before the graphics plan | Concept beats found in the transcript, each with two or three candidate objects. Pick or decline. |
| During the plan | Which music track, and any beat where the style file and a script comment disagree. |
| Before export | The export dry run: what gets promoted, retired and deleted. |

The concept-beat question is the newest one. The scan reads your cut transcript and finds the places
where you reached for a comparison, a contrast, a cycle or a list, and offers objects to draw. You
are picking, not inventing. A candidate you decline is closed with a reason rather than padded with a
graphic nobody wanted.

## The highest-leverage thing you can do

Write the script in a document that supports comments, and leave comments on it: what music and
where, camera moves, what kind of graphic goes on which line, links to reference images. The graphics
skill reads those comments. Ten minutes of comments saves hours of directing.

## If a run goes wrong

```bash
git checkout v1.0.0
```

That is the pipeline as it shipped 02-first-agent. Transcripts are durable, so re-running never
re-transcribes, and the base rough cut is never re-rendered once graphics start.
