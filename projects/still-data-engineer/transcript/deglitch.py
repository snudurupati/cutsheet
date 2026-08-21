#!/usr/bin/env python3
"""Micro-fade every segment join on the assembled track.

Butt-joining two points of a waveform leaves a step wherever the two sides do not
happen to sit at the same value - audible as a click. A 4ms raised-cosine fade either
side of each seam removes the step. On room tone at -68 dBFS an 8ms dip is inaudible,
and 4ms is far shorter than any speech transient.
"""
import json, math, struct, subprocess, sys

SR, FPS = 48000, 30
FADE = int(0.004 * SR)          # 4 ms = 192 samples

segs = json.load(open("transcript/cutsheet.json"))["segments"]
joins, cum = [], 0
for s in segs[:-1]:
    cum += s["frames"]
    joins.append(cum * SR // FPS)          # exact: 1600 samples per frame

SRC = sys.argv[1] if len(sys.argv) > 1 else "outputs/.cache/base-raw.mov"
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", SRC,
                      "-map", "0:a", "-f", "s16le", "-"], capture_output=True).stdout
n = len(raw) // 2
# HARD GATE. This file was once hardcoded to a stale path while the caller wrote the new
# audio elsewhere, so the render shipped OLD audio on NEW video - and because -shortest
# truncated it, the sample and frame counts still agreed. Everything after the re-cut was
# 4.47s out of sync. Assert the source matches the cutsheet before touching a sample.
expected = sum(x["frames"] for x in segs) * SR // FPS
if n != expected:
    raise SystemExit(f"FAIL: {SRC} has {n} samples but the cutsheet expects {expected} "
                     f"({(n - expected) / SR:+.3f}s). Wrong or stale source audio.")
a = list(struct.unpack(f"<{n}h", raw))
print(f"{SRC}: {n} samples matches the cutsheet, {len(joins)} joins")

for j in joins:
    for i in range(FADE):                                   # fade out into the seam
        k = j - FADE + i
        if 0 <= k < n:
            a[k] = int(a[k] * 0.5 * (1 + math.cos(math.pi * i / FADE)))
    for i in range(FADE):                                   # fade in out of it
        k = j + i
        if 0 <= k < n:
            a[k] = int(a[k] * 0.5 * (1 - math.cos(math.pi * i / FADE)))

out = struct.pack(f"<{n}h", *a)
open("outputs/.cache/base-audio-deglitched.raw", "wb").write(out)
print(f"wrote {len(out)} bytes ({len(out)//2} samples) - {'MATCHES' if len(out)//2==n else 'MISMATCH'}")
