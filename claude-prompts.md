### Prompts to fire-off the Video Editing Skill
###When you've recorded, drop the clips in and run it:
```
cd ~/Projects/video-editor
JOB=<content-name-in-kebab-case>
mkdir -p projects/$JOB/{raw,broll,audio/soundtracks,audio/sound-effects,assets,transcript,graphics-build,outputs}
cp assets/sfx/*.mp3 projects/$JOB/audio/sound-effects/
```
### Might need to edit the below to only include latest clips
```
cp ~/Movies/SourceRecorder/Camera-*.mov ~/Movies/SourceRecorder/Screen-*.mov projects/$JOB/raw/
```

### Then your soundtrack into projects/$JOB/audio/soundtracks/, and:

```
/tech-video-editor projects/<job>
```