#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo "### composite"; rm -f outputs/graphics-pass.mov; bash graphics-build/assemble.sh
echo "### mix"; rm -f outputs/finished.mov
python3 transcript/mix_audio.py outputs/graphics-pass.mov outputs/finished.mov
echo "### verify"; python3 transcript/verify_mix.py outputs/graphics-pass.mov outputs/finished.mov || true
echo "### deliverable"
python3 - <<'PY'
import json, re, subprocess
o = subprocess.run(["ffmpeg","-hide_banner","-i","outputs/finished.mov","-map","0:a",
     "-af","loudnorm=I=-14:TP=-1.0:LRA=11:print_format=json","-f","null","-"],
     capture_output=True, text=True).stderr
d = json.loads(re.findall(r"\{[\s\S]*?\}", o)[-1])
open("/tmp/ln.txt","w").write(
  f"loudnorm=I=-14:TP=-1.0:LRA=11:measured_I={d['input_i']}:measured_TP={d['input_tp']}"
  f":measured_LRA={d['input_lra']}:measured_thresh={d['input_thresh']}"
  f":offset={d['target_offset']}:linear=true:print_format=summary")
PY
rm -f outputs/still-data-engineer-final-longform-2160p.mp4
ffmpeg -nostdin -hide_banner -loglevel error -y -i outputs/finished.mov \
  -map 0:v -c:v copy \
  -map 0:a -af "$(cat /tmp/ln.txt),aresample=48000,alimiter=level=disabled:limit=0.891:attack=1:release=50" \
  -c:a aac -b:a 320k -ar 48000 -movflags +faststart \
  outputs/still-data-engineer-final-longform-2160p.mp4
rm -f outputs/still-data-engineer-longform.mp4
cp outputs/still-data-engineer-final-longform-2160p.mp4 ~/Downloads/
echo "### promoted and copied"
ffprobe -v error -show_entries stream=codec_type,width,height,nb_frames,sample_rate,channels -show_entries format=duration,size -of default=noprint_wrappers=1 outputs/still-data-engineer-final-longform-2160p.mp4 | tr '\n' ' '; echo
ffmpeg -nostdin -hide_banner -i outputs/still-data-engineer-final-longform-2160p.mp4 -map 0:a -af ebur128 -f null - 2>&1 | grep -A9 Summary | grep -E "I:|LRA:"
echo "### done"
