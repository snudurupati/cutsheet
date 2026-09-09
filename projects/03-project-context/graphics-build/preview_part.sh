#!/bin/bash
# Composite ONE part over its own footage window, with his audio, for review.
#
# The overlay is aligned with setpts, NEVER input-side -ss. Seeking the overlay
# input desynchronises its PTS from the base, eof_action=pass then lets the bare
# footage through, and the overlay silently never appears. It looks correct only
# for a part starting at 00:00, so a spot check on the first graphic passes while
# every later one is missing.
set -euo pipefail
cd "$(dirname "$0")"

ID="$1"; PAD="${2:-3}"
BASE=../outputs/base-cut.mov
PART="renders/$ID.mov"
[ -f "$PART" ] || { echo "no render for $ID"; exit 1; }

read -r S E < <(python3 -c "
import json,sys
p=[x for x in json.load(open('cutsheet.json'))['parts'] if x['id']=='$ID'][0]
print(p['start'], p['end'])")

P=$(python3 -c "print(max(0.0, $S - $PAD))")
LEN=$(python3 -c "print(($E - $S) + 2*$PAD)")
OFF=$(python3 -c "print(round($S - $P, 3))")

mkdir -p previews
echo "  $ID: part $S-$E, preview from $P for ${LEN}s, overlay delayed ${OFF}s"

ffmpeg -nostdin -v error -y -ss "$P" -t "$LEN" -i "$BASE" -i "$PART" \
  -filter_complex "[1:v]setpts=PTS-STARTPTS+$OFF/TB[o];[0:v][o]overlay=0:0:eof_action=pass,scale=1920:1080[v]" \
  -map "[v]" -map 0:a -c:v h264_videotoolbox -b:v 10M -pix_fmt yuv420p \
  -c:a aac -b:a 160k -movflags +faststart "previews/$ID.mp4"

# Full-resolution stills, straight off the composite.
# The part frame is pulled from the PART's own timeline at (t - start) and the
# base frame at absolute t, then combined. An earlier version delayed the overlay
# by (t - start) instead of seeking into it, which produced bare footage and
# looked exactly like a graphic that had failed to render.
STILLS=$(python3 -c "
s,e=$S,$E
pts=[s+0.35*(e-s), s+0.72*(e-s), e-0.6] if (e-s)>12 else [s+0.55*(e-s), e-0.6]
print(' '.join(f'{t:.2f}' for t in pts))")
i=0
for t in $STILLS; do
  i=$((i+1))
  REL=$(python3 -c "print(round($t - $S, 3))")
  ffmpeg -nostdin -v error -y -ss "$t" -i "$BASE" -frames:v 1 "previews/.base.png"
  ffmpeg -nostdin -v error -y -ss "$REL" -i "$PART" -frames:v 1 "previews/.part.png"
  ffmpeg -nostdin -v error -y -i "previews/.base.png" -i "previews/.part.png" \
    -filter_complex "[0:v][1:v]overlay=0:0" -frames:v 1 "previews/${ID}-still${i}.png"
done
rm -f previews/.base.png previews/.part.png
ls -lh "previews/$ID.mp4" previews/${ID}-still*.png | awk '{print "   ",$9,$5}'
