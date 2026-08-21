#!/bin/bash
# job1 rough cut splice — 3840x2160 master.
#
# Rules from .claude/skills/rough-cut:
#   - no -c copy on arbitrary cut points (desyncs a/v)
#   - video re-encoded per segment with hardware acceleration
#   - audio rides through the cut LOSSLESS (pcm) and is amplified/limited exactly
#     once on the assembled track, so no join gets a click
#
# Frame grid: every cut in cutsheet.json is snapped to 1/60s. Unaligned cuts make
# each segment's video round up to a whole frame while its audio stays
# sample-exact; across 92 joins that accumulated 733ms of a/v drift while every
# individual segment still probed clean. The gate below fails loudly if it returns.
set -euo pipefail
cd "$(dirname "$0")"
SEGDIR=outputs/segments
mkdir -p "$SEGDIR"
rm -f "$SEGDIR"/seg_*.mov outputs/concat.txt

python3 - > outputs/segjobs.txt <<'PYJOBS'
import json
c = json.load(open('transcript/cutsheet.json'))
srcmap = {"raw/talkinghead-2026-08-18 21-09-42.mov": "raw/talkinghead-2026-08-18 21-09-42.mov",
          "raw/screencast-2026-08-18 21-09-42.mov": "outputs/sc2160.mp4"}
for s in c['segments']:
    print(f"{s['id']}\t{srcmap[s['src']]}\t{s['start']:.6f}\t{s['end']-s['start']:.6f}\t{round((s['end']-s['start'])*60)}")
PYJOBS

n=0
total=$(wc -l < outputs/segjobs.txt | tr -d ' ')
while IFS=$'\t' read -r id src start dur frames; do
  n=$((n+1))
  ffmpeg -nostdin -hide_banner -v error -y \
    -ss "$start" -t "$dur" -i "$src" \
    -ss "$start" -t "$dur" -i outputs/voice48.wav \
    -map 0:v:0 -map 1:a:0 \
    -frames:v "$frames" \
    -c:v h264_videotoolbox -b:v 50M -profile:v high -pix_fmt yuv420p \
    -c:a pcm_s16le -ar 48000 -ac 1 \
    -video_track_timescale 60000 \
    "$SEGDIR/seg_${id}.mov"
  echo "file 'segments/seg_${id}.mov'" >> outputs/concat.txt
  printf "\rspliced %d/%s" "$n" "$total"
done < outputs/segjobs.txt
echo

# Sync gate — must pass before anything downstream trusts this cut.
python3 - <<'PYGATE' || exit 1
import subprocess, glob, sys
tv = ta = 0.0
for f in sorted(glob.glob('outputs/segments/seg_*.mov')):
    q = lambda s: float(subprocess.run(
        ['ffprobe', '-v', 'error', '-select_streams', s, '-show_entries',
         'stream=duration', '-of', 'csv=p=0', f], capture_output=True, text=True).stdout)
    tv += q('v:0'); ta += q('a:0')
drift = tv - ta
print(f"a/v drift across the whole cut: {drift*1000:+.1f} ms  (video {tv:.3f}s / audio {ta:.3f}s)")
if abs(drift) > 0.040:
    print("FAIL: segments are off the frame grid — fix build_cutsheet.py snap()", file=sys.stderr)
    sys.exit(1)
PYGATE

# Assemble. Stream copy is safe here: every segment shares one encoder config.
ffmpeg -nostdin -hide_banner -v error -y -f concat -safe 0 -i outputs/concat.txt \
  -c copy outputs/base-assembled.mov

# Polish the audio ONCE on the assembled track, then encode.
ffmpeg -nostdin -hide_banner -v error -y -i outputs/base-assembled.mov \
  -c:v copy \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11,alimiter=limit=0.95" \
  -c:a aac -b:a 192k -ar 48000 \
  outputs/base-cut.mp4

ffprobe -v error -show_entries format=duration -show_entries stream=width,height,r_frame_rate \
  -of default=noprint_wrappers=1 outputs/base-cut.mp4
