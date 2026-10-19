#!/bin/bash
# g011 — the `demo` scene. Face inset over the full-frame screen recording.
#
# The inset carries its own slice of the talking-head footage, cut from the SAME
# source ranges the demo segments were cut from, at the time they are PLACED —
# so if the base is ever re-spliced this script re-cuts rather than sliding.
#
# All geometry, no browser: styles/editorial/style.md says composite this in
# FFmpeg because minutes of footage through a headless render costs ~3% luma per
# frame. Entry/exit are alpha fades (0.5s in / 0.35s out) — an FFmpeg compositor
# cannot ramp a scale deterministically, and a fade reads as designed rather than
# as a pop.
set -euo pipefail
cd "$(dirname "$0")/.."

TH="raw/talkinghead-2026-08-18 21-09-42.mov"
FACEDIR=outputs/face
mkdir -p "$FACEDIR"
rm -f "$FACEDIR"/face_*.mov "$FACEDIR"/concat.txt

# 1. face strip — same source ranges as the demo segments, cropped square
python3 - > "$FACEDIR/jobs.txt" <<'PYJOBS'
import json
c = json.load(open('transcript/cutsheet.json'))
for s in c['segments']:
    if s['section'] == 'demo':
        print(f"{s['id']}\t{s['start']:.6f}\t{s['end']-s['start']:.6f}\t{round((s['end']-s['start'])*60)}")
PYJOBS

while IFS=$'\t' read -r id start dur frames; do
  ffmpeg -nostdin -hide_banner -v error -y -ss "$start" -t "$dur" -i "$TH" \
    -frames:v "$frames" -an \
    -vf "crop=2160:2160:470:0,scale=960:960:flags=lanczos" \
    -c:v prores_ks -profile:v 3 -video_track_timescale 60000 \
    "$FACEDIR/face_${id}.mov"
  echo "file 'face_${id}.mov'" >> "$FACEDIR/concat.txt"
  printf "\rface strip %s" "$id"
done < "$FACEDIR/jobs.txt"
echo

ffmpeg -nostdin -hide_banner -v error -y -f concat -safe 0 -i "$FACEDIR/concat.txt" \
  -c copy "$FACEDIR/face-strip.mov"

DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$FACEDIR/face-strip.mov")
OUTFADE=$(python3 -c "print(f'{max(0,$DUR-0.35):.3f}')")
echo "face strip: ${DUR}s"

# 2. (removed 2026-09-24) This step used to build outputs/inset.mov: the face strip
# alpha-merged with three LOOPED stills, with no frame cap. A looped still never
# ends, so the output never ended: it wrote 231GB of ProRes 4444 and filled the
# disk. It was also dead: make_segments.py composites the inset straight from the
# face strip and the art (see its g011 block), and nothing reads inset.mov.
