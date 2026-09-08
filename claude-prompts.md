# Prompts to fire off the video editing skill

Recorded? Drop the clips in and run it.

```bash
cd ~/Projects/video-editor
JOB=<content-name-in-kebab-case>
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

Print the path, paste it into Claude Code:

```bash
echo "/tech-video-editor projects/$JOB"
```

Roll back a bad run with `git checkout v1.0.0`.
