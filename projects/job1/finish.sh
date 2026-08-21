#!/bin/bash
# job1 finishing pass — music bed + sound effects.
# Rules from .claude/skills/finishing: pure audio pass, video stream COPIED never
# re-encoded; bed flat at -18 dB with no ducking and no fade-in; SFX are real
# samples at -10 dB, sparse. Captions: none — long form ships uncaptioned
# (styles/editorial/style.json -> captions.longForm.burnIn=false).
set -euo pipefail
cd "$(dirname "$0")"

# Pick our own input rather than accepting whatever is handed to us: newest real
# render that has not already been through this pass (finishing skill rule —
# never process a file twice).
IN=${1:-}
if [ -z "$IN" ]; then
  for cand in outputs/graphics-pass.mp4 outputs/base-cut.mp4; do
    [ -f "$cand" ] && IN="$cand" && break
  done
fi
echo "finishing pass input: $IN"

MUS=audio/soundtracks/audiocopper-dark-571483.mp3
WOOSH=audio/sound-effects/ribhavagrawal-woosh-230554.mp3
REVEAL=audio/sound-effects/ribhavagrawal-cinematic-reveal-type-01-265535.mp3

# Output-timeline positions (outputs/sections.json)
INTRO_END=213.733
OUTRO_START=474.533
OUTRO_LEN=133.750
BED1_LEN=156.5          # bed drops before the demo rather than looping (2:38 track, 3:34 intro)
W1=$(echo "$INTRO_END - 0.35" | bc)     # woosh leads into the hard cut
W2=$(echo "$OUTRO_START - 0.35" | bc)

ffmpeg -nostdin -hide_banner -v error -y \
  -i "$IN" \
  -i "$MUS" -i "$MUS" -i "$WOOSH" -i "$WOOSH" -i "$REVEAL" \
  -filter_complex "\
[1:a]atrim=0:${BED1_LEN},asetpts=PTS-STARTPTS,afade=t=out:st=$(echo "$BED1_LEN - 2" | bc):d=2,volume=-18dB[bed1];\
[2:a]atrim=0:${OUTRO_LEN},asetpts=PTS-STARTPTS,afade=t=out:st=$(echo "$OUTRO_LEN - 1.5" | bc):d=1.5,volume=-18dB,adelay=$(echo "$OUTRO_START*1000/1" | bc):all=1[bed2];\
[3:a]volume=-10dB,adelay=$(echo "$W1*1000/1" | bc):all=1[wo1];\
[4:a]volume=-10dB,adelay=$(echo "$W2*1000/1" | bc):all=1[wo2];\
[5:a]volume=-10dB[rev];\
[0:a][bed1][bed2][wo1][wo2][rev]amix=inputs=6:normalize=0:duration=first,alimiter=limit=0.97[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -ar 48000 \
  outputs/job1-music-sfx.mp4

# The effects plan, on disk, so a later graphics re-render re-applies it instead
# of re-deciding every placement.
cat > outputs/audio-plan.json <<JSON
{
  "music": { "track": "$MUS", "beds": [
    { "at": 0.0, "length": $BED1_LEN, "db": -18, "fadeIn": false, "fadeOut": 2.0 },
    { "at": $OUTRO_START, "length": $OUTRO_LEN, "db": -18, "fadeIn": false, "fadeOut": 1.5 } ],
    "ducking": false },
  "sfx": [
    { "at": 0.0, "file": "$REVEAL", "db": -10, "why": "reveal on the hook" },
    { "at": $W1, "file": "$WOOSH", "db": -10, "why": "intro -> demo hard cut" },
    { "at": $W2, "file": "$WOOSH", "db": -10, "why": "demo -> outro hard cut" } ],
  "captions": { "burnIn": false, "why": "long form, style.json captions.longForm.burnIn=false" }
}
JSON
ffprobe -v error -show_entries format=duration -of csv=p=0 outputs/job1-music-sfx.mp4
