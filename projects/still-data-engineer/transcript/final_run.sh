#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo "### rebuilding the base video (5 segments changed) "
ffmpeg -nostdin -hide_banner -loglevel error -f concat -safe 0 -i outputs/.cache/concat.txt -c copy -an -map_chapters -1 outputs/.cache/bv.mov -y
echo "### base audio: re-polish from the new concat (the cut changed, so the old track no longer aligns)"
ffmpeg -nostdin -hide_banner -loglevel error -f concat -safe 0 -i outputs/.cache/concat.txt -c copy -vn -map_chapters -1 outputs/.cache/ba-raw.mov -y
python3 transcript/deglitch.py outputs/.cache/ba-raw.mov
ffmpeg -nostdin -hide_banner -loglevel error -i outputs/.cache/bv.mov \
  -f s16le -ar 48000 -ac 1 -i outputs/.cache/base-audio-deglitched.raw \
  -map 0:v -c:v copy -map 1:a -af "volume=5dB" -c:a pcm_s16le -map_chapters -1 -shortest \
  outputs/.cache/base-cut-pcm.mov -y
ffprobe -v error -show_entries stream=codec_type,nb_frames -show_entries format=duration -of default=noprint_wrappers=1 outputs/.cache/base-cut-pcm.mov | tr '\n' ' '; echo

echo "### parts already rendered - reusing"
ls outputs/.cache/parts/*.mov | wc -l | xargs -I{} echo "  {}/22 present"

echo "### sync gate: the assembled base must SAY what the cutsheet says"
python3 - <<'PY2'
import json, subprocess, re, sys
cs = json.load(open("outputs/transcript-cut.json"))
# transcribe a window straddling the re-cut and compare against the remapped transcript
seg = next(s for s in cs["segments"] if s["id"] == "s021")
t0 = seg["start"]
subprocess.run(["ffmpeg","-v","error","-ss",f"{t0:.2f}","-t","9","-i",
  "outputs/.cache/base-cut-pcm.mov","-vn","-ac","1","-ar","16000","-c:a","pcm_s16le",
  "/tmp/sync.wav","-y"], check=True)
subprocess.run(["whisperx","/tmp/sync.wav","--model","base.en","--compute_type","int8",
  "--language","en","--output_format","txt","--no_align","--output_dir","/tmp"],
  capture_output=True)
heard = open("/tmp/sync.txt").read().lower()
want = " ".join(w["word"] for w in cs["words"] if t0 <= w["start"] < t0 + 8).lower()
norm = lambda x: re.sub(r"[^a-z ]", "", x).split()
h, w = norm(heard), norm(want)
hit = sum(1 for x in w[:10] if x in h[:14])
print(f"  cutsheet says : {' '.join(w[:10])}")
print(f"  render says   : {' '.join(h[:10])}")
print(f"  {hit}/10 leading words match")
if hit < 7:
    sys.exit("FAIL: the assembled base does not say what the cutsheet says - audio/video mismatch")
print("  SYNC OK")
PY2

echo "### composite"
rm -f outputs/graphics-pass.mov; bash graphics-build/assemble.sh
echo "### mix"
rm -f outputs/finished.mov
python3 transcript/mix_audio.py outputs/graphics-pass.mov outputs/finished.mov
python3 transcript/verify_mix.py outputs/graphics-pass.mov outputs/finished.mov || true
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
ffmpeg -nostdin -hide_banner -loglevel error -y -i outputs/.cache/base-cut-pcm.mov -map 0:v -c:v copy -map 0:a -c:a aac -b:a 320k outputs/base-cut.mp4
cp outputs/still-data-engineer-final-longform-2160p.mp4 ~/Downloads/
echo "### final"
ffprobe -v error -show_entries stream=codec_type,width,height,nb_frames,sample_rate,channels -show_entries format=duration,size -of default=noprint_wrappers=1 outputs/still-data-engineer-final-longform-2160p.mp4 | tr '\n' ' '; echo
ffmpeg -nostdin -hide_banner -i outputs/still-data-engineer-final-longform-2160p.mp4 -map 0:a -af ebur128 -f null - 2>&1 | grep -A9 Summary | grep -E "I:|LRA:"
echo "### done"
