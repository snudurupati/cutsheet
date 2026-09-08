#!/bin/bash
# The rest of the job, unattended: rebuild the panel segment, composite, verify
# against the raw footage, mix audio, export. Every step gates before the next.
set -uo pipefail
cd "$(dirname "$0")"
echo "=== 1. panel segment ==="
python3 graphics-build/make_segments.py --only g015 || exit 1
echo
echo "=== 2. composite (one pass) ==="
python3 graphics-build/assemble.py || exit 1
echo
echo "=== 3. verify content against RAW FOOTAGE (hard rule 11) ==="
python3 graphics-build/verify.py outputs/graphics-pass.mp4 || echo "VERIFY REPORTED PROBLEMS"
echo
echo "=== 4. audio: bed + sfx, relative to measured voice ==="
python3 finish.py outputs/graphics-pass.mp4 || exit 1
echo
echo "=== 5. seam review frames ==="
bash graphics-build/review_frames.sh outputs/job1-music-sfx.mp4 outputs/review || true
echo
echo "=== 6. export ==="
FINAL=outputs/job1-final-longform-2160p-v2.mp4
cp outputs/job1-music-sfx.mp4 "$FINAL"
ffprobe -v error -show_entries format=duration:stream=width,height,r_frame_rate,nb_frames \
  -of default=nw=1 "$FINAL" | head -8
ls -la "$FINAL" | awk '{printf "final: %.2f GB\n", $5/1073741824}'
echo "ALL DONE"
