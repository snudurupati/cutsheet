#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
rm -f outputs/finished.mov outputs/still-data-engineer-longform.mp4

echo "### mix (no limiter)"
python3 transcript/mix_audio.py outputs/graphics-pass.mov outputs/finished.mov

echo; echo "### mix verification"
python3 transcript/verify_mix.py outputs/graphics-pass.mov outputs/finished.mov || true

echo; echo "### measured loudness of the premaster"
ffmpeg -nostdin -hide_banner -i outputs/finished.mov -map 0:a -af ebur128=peak=true -f null - 2>&1 \
  | grep -A9 Summary | grep -E "I:|LRA:|Peak:"

echo; echo "### deliverable: loudnorm to -14 LUFS / -1.0 dBTP (YouTube's normalisation target),"
echo "###              audio-only encode - the video stream is COPIED"
python3 - <<'PY'
import json, re, subprocess
o = subprocess.run(["ffmpeg","-hide_banner","-i","outputs/finished.mov","-map","0:a",
     "-af","loudnorm=I=-14:TP=-1.0:LRA=11:print_format=json","-f","null","-"],
     capture_output=True, text=True).stderr
m = json.loads(re.search(r"\{[^{}]*\}", o[o.rindex("{")-1:] if "{" in o else "{}").group(0)) \
    if "{" in o else {}
d = json.loads(re.findall(r"\{[\s\S]*?\}", o)[-1])
print("  measured:", {k: d[k] for k in ("input_i","input_tp","input_lra","input_thresh")})
f = (f"loudnorm=I=-14:TP=-1.0:LRA=11:measured_I={d['input_i']}:measured_TP={d['input_tp']}"
     f":measured_LRA={d['input_lra']}:measured_thresh={d['input_thresh']}"
     f":offset={d['target_offset']}:linear=true:print_format=summary")
open("/tmp/ln.txt","w").write(f)
print("  second pass filter written")
PY
ffmpeg -nostdin -hide_banner -loglevel error -y -i outputs/finished.mov \
  -map 0:v -c:v copy -map 0:a -af "$(cat /tmp/ln.txt)" -c:a aac -b:a 320k -movflags +faststart \
  outputs/still-data-engineer-longform.mp4

echo; echo "### deliverable loudness"
ffmpeg -nostdin -hide_banner -i outputs/still-data-engineer-longform.mp4 -map 0:a -af ebur128=peak=true -f null - 2>&1 \
  | grep -A9 Summary | grep -E "I:|LRA:|Peak:"
echo "### done"
