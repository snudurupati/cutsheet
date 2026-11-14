#!/usr/bin/env python3
"""Rounded-corner mask, border and drop shadow for the `demo` scene face inset.
Style: styles/editorial/style.md -> demo scene inset. Values are canvas numbers
(1920x1080) doubled for 3840x2160 delivery: 480->960 box, radius 24->48,
1px $rule border -> 2px, 72px margins -> 144.
Composited in FFmpeg, never through the browser: 4m21s of footage round-tripped
through a headless render would cost ~3% luma on every frame of it.
"""
from PIL import Image, ImageDraw, ImageFilter
import os, json, re

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)
os.makedirs('art', exist_ok=True)

brand = json.loads(re.search(r'```json\n(.*?)```',
                             open('../../../brand.md').read(), re.S).group(1))
RULE = brand['colors']['rule'].lstrip('#')
RULE_RGB = tuple(int(RULE[i:i + 2], 16) for i in (0, 2, 4))

BOX, RADIUS, BORDER, PAD = 960, 48, 2, 80
CANVAS = BOX + PAD * 2

# 1. alpha mask for the face — white inside the rounded rect, black outside
mask = Image.new('L', (BOX, BOX), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, BOX - 1, BOX - 1], RADIUS, fill=255)
mask.save('art/inset-mask.png')

# 2. border stroke, transparent inside
border = Image.new('RGBA', (BOX, BOX), (0, 0, 0, 0))
ImageDraw.Draw(border).rounded_rectangle(
    [BORDER / 2, BORDER / 2, BOX - 1 - BORDER / 2, BOX - 1 - BORDER / 2],
    RADIUS, outline=RULE_RGB + (255,), width=BORDER)
border.save('art/inset-border.png')

# 3. drop shadow: 0 8px 32px rgba(0,0,0,0.35), doubled -> 16px down, 64px blur
shadow = Image.new('RGBA', (CANVAS, CANVAS), (0, 0, 0, 0))
ImageDraw.Draw(shadow).rounded_rectangle(
    [PAD, PAD + 16, PAD + BOX - 1, PAD + BOX - 1 + 16], RADIUS,
    fill=(0, 0, 0, 90))
shadow = shadow.filter(ImageFilter.GaussianBlur(32))
shadow.save('art/inset-shadow.png')

print(f"wrote art/inset-mask.png, art/inset-border.png, art/inset-shadow.png "
      f"(box {BOX}, radius {RADIUS}, border {BORDER}px {brand['colors']['rule']}, canvas {CANVAS})")
