# Prompts to fire off the video editing skill

Recorded? Drop the clips in and run it.

Check the tools once per machine, and after any upgrade:

```bash
ffmpeg -version | head -1 && node --version && uv --version && python3 -c "import PIL; print(PIL.__version__)" && whisperx --version && npx hyperframes@0.8.3 --version
```

Make the job:

```bash
cd ~/Projects/video-editor
JOB=project-context
mkdir -p projects/$JOB/{raw,broll,audio/soundtracks,audio/sound-effects,assets,transcript,graphics-build,outputs}
cp assets/sfx/*.mp3 projects/$JOB/audio/sound-effects/
```

Copies the newest Camera and Screen clip, not every take:

```bash
cp "$(ls -t ~/Movies/SourceRecorder/Camera-*.mov | head -1)" "$(ls -t ~/Movies/SourceRecorder/Screen-*.mov | head -1)" projects/$JOB/raw/ && ls -lh projects/$JOB/raw/
```

Check both filenames carry the same timestamp. A mismatched pair passes every gate.

Soundtrack in:

```bash
cp <the licensed track> projects/$JOB/audio/soundtracks/
```

Open Claude Code in the workspace root and invoke the video-type skill:

```
/tech-video-editor projects/project-context
```

Name the skill. The footage hints at the type, but guessing wrong silently skips the recording spec and default treatment that skill owns.

Add to the prompt only what the files cannot know: direction for a beat, a correction for this run, or `run under caffeinate, don't wait for my input`.

Resume mid-pipeline with the stage skill instead:

```
/rough-cut projects/project-context
/graphics  projects/project-context
/ai-broll  projects/project-context
/finishing projects/project-context
/export    projects/project-context
```

Review a render:

```
/watch projects/project-context/outputs/<file>.mp4
```

Roll back a bad run with `git checkout v1.0.0`.
