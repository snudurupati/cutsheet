#!/bin/bash
# Composite -> audio mix -> deliverable. Runs unattended under caffeinate.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "### waiting for all 16 parts"
until [ "$(ls outputs/.cache/parts/*.mov 2>/dev/null | wc -l | tr -d ' ')" = "16" ]; do sleep 20; done
echo "### 16/16 present"

echo; echo "### STAGE 2 composite (one pass)"
bash graphics-build/assemble.sh

echo; echo "### STAGE 4 audio mix (video stream copied, never re-encoded)"
python3 transcript/mix_audio.py outputs/graphics-pass.mov outputs/finished.mov

echo; echo "### mix verification"
python3 transcript/verify_mix.py outputs/graphics-pass.mov outputs/finished.mov || echo "  (an effect did not clear the threshold - see above)"

echo; echo "### deliverable: remux to mp4, video COPIED (no third generation), audio -> AAC 320k"
ffmpeg -nostdin -hide_banner -loglevel error -y -i outputs/finished.mov \
  -map 0:v -c:v copy -map 0:a -c:a aac -b:a 320k -movflags +faststart \
  outputs/still-data-engineer-longform.mp4

echo "### base cut to the name the contract uses, video copied"
ffmpeg -nostdin -hide_banner -loglevel error -y -i outputs/base-cut.mov \
  -map 0:v -c:v copy -map 0:a -c:a aac -b:a 320k outputs/base-cut.mp4
mv outputs/base-cut.mov outputs/.cache/base-cut-pcm.mov

echo; echo "### done"
ls -la outputs/*.mp4 outputs/*.mov 2>/dev/null
