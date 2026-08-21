#!/bin/bash
# One composite pass. Every extra full-frame pass is another generation loss at 4K.
#
#  - eof_action=pass on EVERY overlay. Without it the frame scheduler duplicates
#    output frames on a periodic cadence; the result is dead-even CFR so every tool
#    reads it as fine while the content only changes ~18 times a second.
#  - the base is input 0 and heads the chain. A short overlay or a looped still at
#    the head of the chain never reaches EOF - that wrote a 142GB file on job1.
#  - each overlay is shifted onto its slot with setpts and enable-windowed, so the
#    0.5s tail margin baked into every part is never shown but is there if a
#    boundary lands late.
set -euo pipefail
cd "$(dirname "$0")/.."

ffmpeg -nostdin -hide_banner -stats -y \
  -i outputs/.cache/base-cut-pcm.mov \
  -i outputs/.cache/parts/g001.mov \
  -i outputs/.cache/parts/g002.mov \
  -i outputs/.cache/parts/g022.mov \
  -i outputs/.cache/parts/g003.mov \
  -i outputs/.cache/parts/g017.mov \
  -i outputs/.cache/parts/g018.mov \
  -i outputs/.cache/parts/g019.mov \
  -i outputs/.cache/parts/g020.mov \
  -i outputs/.cache/parts/g021.mov \
  -i outputs/.cache/parts/g004.mov \
  -i outputs/.cache/parts/g005.mov \
  -i outputs/.cache/parts/g006.mov \
  -i outputs/.cache/parts/g023.mov \
  -i outputs/.cache/parts/g007.mov \
  -i outputs/.cache/parts/g008.mov \
  -i outputs/.cache/parts/g009.mov \
  -i outputs/.cache/parts/g010.mov \
  -i outputs/.cache/parts/g011.mov \
  -i outputs/.cache/parts/g012.mov \
  -i outputs/.cache/parts/g024.mov \
  -i outputs/.cache/parts/g013.mov \
  -i outputs/.cache/parts/g014.mov \
  -i outputs/.cache/parts/g015.mov \
  -i outputs/.cache/parts/g016.mov \
  -filter_complex "[1:v]setpts=PTS+0.0000/TB[o1];[0:v][o1]overlay=0:0:eof_action=pass:enable='between(t,0.0000,7.2800)'[v1];[2:v]setpts=PTS+6.8800/TB[o2];[v1][o2]overlay=0:0:eof_action=pass:enable='between(t,6.8800,15.2000)'[v2];[3:v]setpts=PTS+14.8000/TB[o3];[v2][o3]overlay=0:0:eof_action=pass:enable='between(t,14.8000,19.6000)'[v3];[4:v]setpts=PTS+43.9000/TB[o4];[v3][o4]overlay=0:0:eof_action=pass:enable='between(t,43.9000,71.6000)'[v4];[5:v]setpts=PTS+195.8800/TB[o5];[v4][o5]overlay=0:0:eof_action=pass:enable='between(t,195.8800,219.0000)'[v5];[6:v]setpts=PTS+226.9030/TB[o6];[v5][o6]overlay=0:0:eof_action=pass:enable='between(t,226.9030,238.5330)'[v6];[7:v]setpts=PTS+351.6430/TB[o7];[v6][o7]overlay=0:0:eof_action=pass:enable='between(t,351.6430,362.5330)'[v7];[8:v]setpts=PTS+407.5130/TB[o8];[v7][o8]overlay=0:0:eof_action=pass:enable='between(t,407.5130,419.5330)'[v8];[9:v]setpts=PTS+568.9130/TB[o9];[v8][o9]overlay=0:0:eof_action=pass:enable='between(t,568.9130,591.5330)'[v9];[10:v]setpts=PTS+666.7330/TB[o10];[v9][o10]overlay=0:0:eof_action=pass:enable='between(t,666.7330,675.5330)'[v10];[11:v]setpts=PTS+699.8330/TB[o11];[v10][o11]overlay=0:0:eof_action=pass:enable='between(t,699.8330,723.0330)'[v11];[12:v]setpts=PTS+756.8330/TB[o12];[v11][o12]overlay=0:0:eof_action=pass:enable='between(t,756.8330,768.5330)'[v12];[13:v]setpts=PTS+887.0000/TB[o13];[v12][o13]overlay=0:0:eof_action=pass:enable='between(t,887.0000,905.5000)'[v13];[14:v]setpts=PTS+1008.8030/TB[o14];[v13][o14]overlay=0:0:eof_action=pass:enable='between(t,1008.8030,1016.7330)'[v14];[15:v]setpts=PTS+1016.7330/TB[o15];[v14][o15]overlay=0:0:eof_action=pass:enable='between(t,1016.7330,1027.5330)'[v15];[16:v]setpts=PTS+1188.5330/TB[o16];[v15][o16]overlay=0:0:eof_action=pass:enable='between(t,1188.5330,1196.0330)'[v16];[17:v]setpts=PTS+1239.2330/TB[o17];[v16][o17]overlay=0:0:eof_action=pass:enable='between(t,1239.2330,1264.0330)'[v17];[18:v]setpts=PTS+1290.5330/TB[o18];[v17][o18]overlay=0:0:eof_action=pass:enable='between(t,1290.5330,1308.0330)'[v18];[19:v]setpts=PTS+1492.0330/TB[o19];[v18][o19]overlay=0:0:eof_action=pass:enable='between(t,1492.0330,1512.5330)'[v19];[20:v]setpts=PTS+1629.0000/TB[o20];[v19][o20]overlay=0:0:eof_action=pass:enable='between(t,1629.0000,1653.0000)'[v20];[21:v]setpts=PTS+1655.5330/TB[o21];[v20][o21]overlay=0:0:eof_action=pass:enable='between(t,1655.5330,1745.5330)'[v21];[22:v]setpts=PTS+1809.0330/TB[o22];[v21][o22]overlay=0:0:eof_action=pass:enable='between(t,1809.0330,1814.5230)'[v22];[23:v]setpts=PTS+1816.5230/TB[o23];[v22][o23]overlay=0:0:eof_action=pass:enable='between(t,1816.5230,1841.0330)'[v23];[24:v]setpts=PTS+1842.5330/TB[o24];[v23][o24]overlay=0:0:eof_action=pass:enable='between(t,1842.5330,1897.3000)'[vout]" \
  -map "[vout]" -map 0:a \
  -c:v h264_videotoolbox -b:v 80M -pix_fmt yuv420p \
  -c:a pcm_s16le -map_chapters -1 \
  outputs/graphics-pass.mov

echo "=== duplicate-frame check (clean <3%, the eof_action bug ~25%, gate fails >8%) ==="
TOT=$(ffprobe -v error -select_streams v:0 -show_entries stream=nb_frames -of csv=p=0 outputs/graphics-pass.mov)
DUP=$(ffmpeg -hide_banner -i outputs/graphics-pass.mov -an -vf mpdecimate=hi=64:lo=32:frac=0.001 -f null - 2>&1 \
      | tr '\r' '\n' | tail -1 | grep -oE 'drop=[ ]*[0-9]+' | grep -oE '[0-9]+' || echo 0)
python3 -c "
import sys
tot,dup=int(sys.argv[1]),int(sys.argv[2] or 0)
pct=dup/tot*100
print(f'  {dup} duplicate frames of {tot} = {pct:.2f}%')
sys.exit(1 if pct>8 else 0)
" "$TOT" "${DUP:-0}"
echo "  PASS"
