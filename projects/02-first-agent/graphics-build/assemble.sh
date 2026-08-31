#!/bin/bash
# Composite pass: footage layer (base + demo scene) then all 12 graphics parts.
#
# TWO gotchas baked in, both of which silently ship a broken video:
#  1. Overlays MUST be aligned with trim/setpts, never input-side -ss. Input seeking
#     desynchronises the overlay's PTS from the base and the overlay just never appears.
#     It looks correct only for parts that start at 00:00.
#  2. eof_action=pass on every overlay. With the default (repeat), chaining short overlays
#     over a long base makes the frame scheduler duplicate output frames on a periodic
#     cadence -- constant frame rate, so every tool reads it as fine, but the content
#     only changes ~18 times a second.
set -euo pipefail
cd "$(dirname "$0")"
OUT="${1:-../outputs/graphics-pass.mp4}"
python3 build_assemble.py --audio-source ../outputs/base-audio.wav --trim-tail-frames 30 --cutsheet cutsheet.json --demo demo-scene.json \
  --base ../outputs/base-cut.mov --demoscene ../outputs/demo-scene.mp4 \
  --renders renders --out "$OUT"
echo "--- duplicate-frame check ---"
python3 dupecheck.py "$OUT" 8.0
