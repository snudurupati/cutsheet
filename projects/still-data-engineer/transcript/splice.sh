#!/bin/bash
# Stage 1 splice. One segment per cut, then concat, then polish the audio ONCE.
#
#  - ffmpeg -nostdin everywhere: inside a read loop ffmpeg eats the job list and
#    silently drops segments.
#  - no -c copy: stream copy desyncs on arbitrary cut points. Re-encode each segment.
#  - audio rides through lossless (pcm_s16le) and is amplified once on the assembly,
#    because encoding each piece separately puts a click at every join.
set -euo pipefail
cd "$(dirname "$0")/.."

CACHE=outputs/.cache/segments
mkdir -p "$CACHE" outputs
A=graphics-build/assets

# style.md demo inset, doubled for 3840x2160 delivery
EASE_IN="if(lt(t,0.3),0.92,if(lt(t,0.8),0.92+0.08*(1-pow(1-(t-0.3)/0.5,3)),1))"

python3 - <<'PY' > "$CACHE/jobs.txt"
import json
d = json.load(open("transcript/cutsheet.json"))
for s in d["segments"]:
    print("\t".join(str(x) for x in [
        s["id"], s["part"], s["scene"], s["startFrame"], s["frames"],
        int(bool(s.get("browser"))), s.get("blurUntil") or 0,
        int(bool(s.get("insetEnter"))), int(bool(s.get("insetExit"))),
        s.get("seamFade") or 0, s.get("insetSide") or "right",
        s.get("dimScreen") or 0, s.get("dimUntil") or 0]))
PY

# ONLY=s001,s012 restricts the run to named segments, for testing
if [ -n "${ONLY:-}" ]; then
  grep -E "^($(echo "$ONLY" | tr ',' '|'))\t" "$CACHE/jobs.txt" > "$CACHE/jobs.sel" || true
  mv "$CACHE/jobs.sel" "$CACHE/jobs.txt"
fi
# PRIVACY GATE. Independently re-check every demo segment's top band and refuse to render
# if one reads as browser chrome without the bookmark blur. A derived flag that gets wiped
# by an upstream rebuild must not be the only thing standing between the speaker's
# bookmarks and a published video.
python3 - <<'PYGATE' || exit 1
import json, subprocess, re, sys
cs = json.load(open("transcript/cutsheet.json"))
SCREEN = {"p1": "raw/Screen-2026-08-19 20-36-07.mov", "p2": "raw/Screen-2026-08-19 22-01-29.mov"}
OFF = {"p1": 1, "p2": -2}
bad = []
for s in cs["segments"]:
    if s["scene"] != "demo":
        continue
    t = (s["startFrame"] + OFF[s["part"]] + s["frames"] * 0.25) / 30
    o = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", SCREEN[s["part"]],
        "-frames:v", "1", "-vf", "crop=3840:208:0:0,signalstats,metadata=print:file=-",
        "-f", "null", "-"], capture_output=True, text=True).stdout
    m = re.search(r"YAVG=([\d.]+)", o)
    if m and float(m.group(1)) > 150 and not s.get("browser"):
        bad.append(f"{s['id']} (top band {float(m.group(1)):.0f} luma, no blur flag)")
if bad:
    print("PRIVACY GATE FAILED - browser chrome with no bookmark blur:")
    for b in bad: print("   ", b)
    sys.exit(1)
print("  privacy gate: every bright-chrome segment carries the bookmark blur")
PYGATE

n=0
total=$(wc -l < "$CACHE/jobs.txt")
while IFS=$'\t' read -r id part scene sf frames browser blurUntil enter exit fade side dim dimUntil; do
  n=$((n+1))
  out="$CACHE/$id.mov"
  if [ -s "$out" ]; then continue; fi

  if [ "$part" = p1 ]; then
    CAM="raw/Camera-2026-08-19 20-36-07.mov"; SCR="raw/Screen-2026-08-19 20-36-07.mov"; OFF=1
  else
    CAM="raw/Camera-2026-08-19 22-01-29.mov"; SCR="raw/Screen-2026-08-19 22-01-29.mov"; OFF=-2
  fi
  CT=$(python3 -c "print(f'{$sf/30:.6f}')")
  ST=$(python3 -c "print(f'{($sf+$OFF)/30:.6f}')")
  DUR=$(python3 -c "print(f'{$frames/30:.6f}')")

  # audio is always the camera, trimmed to exactly frames*1600 samples
  AF="atrim=0:$DUR,asetpts=PTS-STARTPTS"
  if [ "$fade" != "0" ]; then
    ST_F=$(python3 -c "print(f'{$frames/30-$fade:.4f}')")
    AF="$AF,afade=t=out:st=$ST_F:d=$fade"     # retake seam: ring the word out
  fi

  if [ "$scene" = demo ] && [ "$side" = none ]; then
    # the diagram uses the whole frame; the inset steps aside. The FRAME does not change,
    # so this is not the full-frame<->PiP bounce style.md forbids.
    # SCRV must be built HERE: it is assigned inside the demo branch below, so reaching
    # this branch first would otherwise inherit the previous loop iteration's value -
    # including its trim duration, which silently truncates the segment.
    SCRV="[0:v]trim=0:$DUR,setpts=PTS-STARTPTS"
    ffmpeg -nostdin -hide_banner -loglevel error -y \
      -ss "$ST" -i "$SCR" -ss "$CT" -i "$CAM" \
      -filter_complex "$SCRV[v];[1:a]$AF[a]" \
      -map "[v]" -map "[a]" -frames:v "$frames" -fps_mode cfr -r 30 \
      -c:v h264_videotoolbox -b:v 60M -pix_fmt yuv420p -c:a pcm_s16le -map_chapters -1 "$out"
    printf "\r  %3d/%3d  %s  %s (no inset)   " "$n" "$total" "$id" "$scene"
    continue
  fi

  if [ "$scene" = head ]; then
    ffmpeg -nostdin -hide_banner -loglevel error -y \
      -ss "$CT" -i "$CAM" \
      -filter_complex "[0:v]trim=0:$DUR,setpts=PTS-STARTPTS[v];[0:a]$AF[a]" \
      -map "[v]" -map "[a]" -frames:v "$frames" -fps_mode cfr -r 30 \
      -c:v h264_videotoolbox -b:v 60M -pix_fmt yuv420p -c:a pcm_s16le -map_chapters -1 "$out"
  else
    # screen full frame, face inset bottom-right
    SCRV="[0:v]trim=0:$DUR,setpts=PTS-STARTPTS"
    # The browser reads 214 luma against 44-58 for the material either side of it.
    # Pull the highlights down on the SCREEN ONLY, before the face is composited, so the
    # speaker's exposure is untouched. Text stays dark on a softer page.
    if [ "$dim" != "0" ]; then
      CURVE="curves=all='0/0 0.25/0.21 0.75/0.60 1/0.76'"
      if [ "$dimUntil" != "0" ]; then
        SCRV="$SCRV,split[dA][dB];[dA]$CURVE[dC];[dB][dC]overlay=0:0:enable='lt(t,$dimUntil)'"
      else
        SCRV="$SCRV,$CURVE"
      fi
    fi
    if [ "$browser" = 1 ]; then
      if [ "$blurUntil" != "0" ]; then EN=":enable='lt(t,$blurUntil)'"; else EN=""; fi
      SCRV="$SCRV,split[bg][br];[br]crop=3840:100:0:108,boxblur=luma_radius=24:luma_power=2:chroma_radius=24:chroma_power=2[bb];[bg][bb]overlay=0:108$EN"
    fi
    UNIT="[sh][fb]overlay=96:96[unit];[unit]format=rgba"
    if [ "$enter" = 1 ]; then
      UNIT="$UNIT,scale=w='2*round(576*($EASE_IN))':h='2*round(576*($EASE_IN))':eval=frame,format=rgba,fade=in:alpha=1:st=0.3:d=0.5"
      POS="x='2640+(1152-w)/2':y='960+(1152-h)/2':eval=frame"
    elif [ "$exit" = 1 ]; then
      XS=$(python3 -c "print(f'{$frames/30-0.35:.4f}')")
      EASE_OUT="if(lt(t,$XS),1,1-0.08*(1-pow(1-(t-$XS)/0.35,3)))"
      UNIT="$UNIT,scale=w='2*round(576*($EASE_OUT))':h='2*round(576*($EASE_OUT))':eval=frame,format=rgba,fade=out:alpha=1:st=$XS:d=0.35"
      POS="x='2640+(1152-w)/2':y='960+(1152-h)/2':eval=frame"
    else
      # bottom-right by default; bottom-left mirrors it with the same 72px canvas margin
      if [ "$side" = left ]; then POS="144:960"; else POS="2640:960"; fi
    fi
    ffmpeg -nostdin -hide_banner -loglevel error -y \
      -ss "$ST" -i "$SCR" -ss "$CT" -i "$CAM" \
      -i "$A/inset-mask.png" -i "$A/inset-border.png" -i "$A/inset-shadow.png" \
      -filter_complex "\
$SCRV[scr];\
[1:v]trim=0:$DUR,setpts=PTS-STARTPTS,crop=2000:2000:1280:160,scale=960:960,format=rgba[f];\
[f][2:v]alphamerge[fr];\
[fr][3:v]overlay=0:0[fb];\
[4:v]format=rgba[sh];\
$UNIT[u];\
[scr][u]overlay=$POS[v];\
[1:a]$AF[a]" \
      -map "[v]" -map "[a]" -frames:v "$frames" -fps_mode cfr -r 30 \
      -c:v h264_videotoolbox -b:v 60M -pix_fmt yuv420p -c:a pcm_s16le -map_chapters -1 "$out"
  fi
  printf "\r  %3d/%3d  %s  %s %5.2fs   " "$n" "$total" "$id" "$scene" "$(python3 -c "print($frames/30)")"
done < "$CACHE/jobs.txt"
echo; echo "segments done"
