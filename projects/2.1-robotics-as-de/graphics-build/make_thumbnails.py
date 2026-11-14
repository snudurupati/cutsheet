#!/usr/bin/env python3
"""Build the two A/B thumbnails (1280x720) for 01-robotics-as-de, each with a -feed-360.png preview.

  A  the smile from the deliberate pre-roll takes (raw A 7.867) + the series humanoid holding the cup
     (from g01b), "your next data problem" over "Robotics".  Title: "Why Robotics Is the Next
     Frontier of Data Engineering".
  B  the questioning tilt on "hear me out" (raw A 147.700) + one enlarged Push-T frame (the dataset's
     own observation image, from the Rerun panel in the screen recording) above a three-row table, a
     highlighted frame joined to a highlighted row by one $accent line; "VIDEO + TABLES?".
     Title: "What Robot Training Data Actually Looks Like".
  SHORT  the Short's cover (1080x1920): A's card on paper in the top half, the same smile below,
     so the Short and video A point at each other. Text inside y 200-1620 like the captions.
  (human 2026-10-18: both texts and titles; B's image idea; "keep exposure same as finished.mov")

EXPOSURE: no grade. The plate is the raw frame exactly as finished.mov shows it (the base cut is the
raw, ungraded), downscaled with a light sharpen only. The 05 grade (black point, S-curve, midtone
lift) read overexposed against the video itself.

  python3 make_thumbnails.py --raw "../raw/Camera-2026-10-16 20-47-45.mov" --brand ../../../brand.md \
      --renders renders --out ../assets/thumbnails
"""
import argparse, json, os, re, subprocess, tempfile
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps, ImageStat

W, H, S = 1280, 720, 2


def font(path, px, wght=None):
    f = ImageFont.truetype(path, px * S)
    if wght:
        f.set_variation_by_axes([wght])
    return f


def grab(src, at, fmt="rgb24"):
    tmp = tempfile.mktemp(suffix=".png")
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-ss", f"{at:.3f}", "-i", src,
                    "-frames:v", "1", tmp], check=True)
    im = Image.open(tmp).convert("RGB"); os.remove(tmp)
    if im.size != (3840, 2160):
        raise SystemExit(f"{src}: expected a 3840x2160 frame, got {im.size}")
    return im


FACE = (1640, 330, 2680, 1570)   # set per face in face_card (sub-agent bboxes, 4K)
LAP = ImageFilter.Kernel((3, 3), [0, -1, 0, -1, 4, -1, 0, -1, 0], 1, 128)


def sharpest(raw, at, k=2):
    """The sharpest frame within k frames of `at`. This camera's H.264 alternates sharp and
    soft frames, and a moving head adds blur: at the aha smile, 377.00 measured 115 on the
    eyes and 377.10 measured 127 (Laplacian variance). Expression barely changes in 2 frames."""
    best = None
    for i in range(-k, k + 1):
        t = at + i / 30
        im = grab(raw, t)
        v = ImageStat.Stat(im.convert("L").crop((1800, 760, 2950, 1000)).filter(LAP)).var[0]
        if best is None or v > best[0]:
            best = (v, t, im)
    print(f"  face {at:.2f}: sharpest frame {best[1]:.3f} (eye detail {best[0]:.0f})")
    return best[2]


def grade(im, fbox=None):
    """Human 2026-09-30: the first grade (a gamma lift on the face) read washed out and soft.
    A lift raises the shadows and flattens contrast, which is exactly "washed out". This
    sets real black and white points, adds a gentle S-curve, gives the face local contrast
    and detail, and takes the empty wall on the left down so face and card separate."""
    L = im.convert("L"); h = L.histogram(); n = sum(h)
    def pct(p):
        c = 0
        for i, v in enumerate(h):
            c += v
            if c >= p * n: return i
    lo, hi = pct(0.004), pct(0.997)
    lut = []
    for v in range(256):
        x = min(1.0, max(0.0, (v - lo) / max(1, hi - lo)))
        s_ = x * x * (3 - 2 * x)                      # smoothstep S-curve
        # ** 0.84: brighter overall (human 2026-09-30: "a bit underexposed", then "a little more"); after the
        # black point, so the blacks stay black and the contrast holds
        lut.append(round(255 * min(1.0, (0.72 * x + 0.28 * s_)) ** 0.84))
    out = im.point(lut * 3)
    out = ImageEnhance.Color(out).enhance(1.08)
    m = Image.new("L", im.size, 0)
    ImageDraw.Draw(m).ellipse(fbox or FACE, fill=255)
    m = m.filter(ImageFilter.GaussianBlur(120))
    face = out.filter(ImageFilter.UnsharpMask(radius=40, percent=18, threshold=0))    # local contrast
    # midtones up on the face only, after the black point is set: brighter, not flatter
    face = face.point([round(255 * (v / 255) ** 0.88) for v in range(256)] * 3)
    face = face.filter(ImageFilter.UnsharpMask(radius=2.0, percent=90, threshold=2))  # detail
    out = Image.composite(face, out.filter(ImageFilter.UnsharpMask(radius=2.0, percent=60, threshold=3)), m)
    g = Image.new("L", im.size, 0)
    ImageDraw.Draw(g).rectangle((0, 0, (fbox or FACE)[0] - 60, im.size[1]), fill=255)
    g = g.filter(ImageFilter.GaussianBlur(180))
    return Image.composite(ImageEnhance.Color(ImageEnhance.Brightness(out).enhance(0.86)).enhance(0.85), out, g)


def face_plate(raw, at, face, crop, k=2):
    """Full frame with shoulders (04: a neck crop read as "sinking"), punched in 13%.
    The face's left edge lands at x ~600 of 1280, so the card lives in x < ~560. A light
    sharpen after the downscale restores what LANCZOS softens."""
    x0, y0, cw = crop
    # no grade (human 2026-10-18): the frame exactly as the finished video shows it
    p = sharpest(raw, at, k).crop((x0, y0, x0 + cw, y0 + round(cw * 9 / 16))).resize((W * S, H * S), Image.LANCZOS)
    return p.filter(ImageFilter.UnsharpMask(radius=1.2, percent=50, threshold=2))


def team_ink(render, at, ink, box):
    """The agent team (lead + four) from the g03 card, as ink with alpha, so it sits on
    any panel. Paper becomes transparent; the jars' grey fill stays a light tint."""
    im = grab(render, at).crop(box)
    L = im.convert("L")
    paper = sorted(L.getdata())[len(L.getdata()) // 2]
    # below 12% is paper texture (a soft blotch on the g03 card), not ink
    a = L.point(lambda v: (lambda x: 0 if x < 30 else x)(max(0, min(255, round((paper - v) * 255 / max(1, paper - 20))))))
    bb = a.point(lambda v: 255 if v > 60 else 0).getbbox()
    lay = Image.new("RGBA", im.size, ink + (0,)); lay.putalpha(a)
    return lay.crop(bb)


def panel(img, box, bg, rule):
    x0, y0, x1, y1 = box
    sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rectangle((x0 + 10 * S, y0 + 14 * S, x1 + 10 * S, y1 + 14 * S), fill=(0, 0, 0, 90))
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(22 * S)))
    lay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(lay).rectangle(box, fill=bg + (242,), outline=rule + (255,), width=2 * S)
    img.alpha_composite(lay)


def hexrgb(h):
    h = h.lstrip("#"); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def fits(d, text, f, maxw, what):
    w = d.textlength(text, font=f)
    if w > maxw:
        raise SystemExit(f"{what}: '{text}' is {w / S:.0f}px, wider than {maxw / S:.0f}px")
    return w


def scaled(im, w):
    return im.resize((round(w), round(im.size[1] * w / im.size[0])), Image.LANCZOS)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", required=True); ap.add_argument("--brand", required=True)
    ap.add_argument("--fonts", default="fonts"); ap.add_argument("--renders", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    b = json.loads(re.search(r"```json\s*(\{[\s\S]*\})\s*```", open(a.brand).read()).group(1))
    C = {k: hexrgb(v) for k, v in b["colors"].items()}
    VAR = os.path.join(a.fonts, "Satoshi-Variable.ttf")
    hum = team_ink(os.path.join(a.renders, "g01b.mov"), 15.6, C["ink"], (1360, 660, 2140, 1800))
    os.makedirs(a.out, exist_ok=True)
    outs = []

    def big_font(d, text, maxw, top=96, low=60):
        for px in range(top, low - 1, -2):
            f = font(VAR, px, 900)
            if d.textlength(text, font=f) <= maxw: return f
        raise SystemExit(f"'{text}' does not fit {maxw / S:.0f}px even at {low}px")

    def card_A():
        img = face_plate(a.raw, 7.867, (1640, 330, 2680, 1570), (60, 220, 3000)).convert("RGBA")   # face ~70% across
        d = ImageDraw.Draw(img)
        X0, X1, PX = 34 * S, 520 * S, 30 * S; col = X1 - X0 - 2 * PX
        head, word = "your next data problem", "Robotics"
        fh = font(VAR, 34, 700); fits(d, head, fh, col, "A")
        fw = big_font(d, word, col)
        art = scaled(hum, col * 0.46)
        hb, wb = d.textbbox((0, 0), head, font=fh), d.textbbox((0, 0), word, font=fw)
        G1, G2, RULE, PY = 26 * S, 30 * S, 6 * S, 32 * S
        inner = (hb[3] - hb[1]) + G1 + art.size[1] + G2 + (wb[3] - wb[1]) + 18 * S + RULE
        Y0 = max(24 * S, (H * S - (inner + 2 * PY)) // 2 - 20 * S)
        panel(img, (X0, Y0, X1, Y0 + inner + 2 * PY), C["bg"], C["rule"]); d = ImageDraw.Draw(img)
        y = Y0 + PY
        d.text((X0 + PX - hb[0], y - hb[1]), head, font=fh, fill=C["muted"]); y += hb[3] - hb[1] + G1
        img.alpha_composite(art, (X0 + (X1 - X0 - art.size[0]) // 2, y)); y += art.size[1] + G2
        d.text((X0 + PX - wb[0], y - wb[1]), word, font=fw, fill=C["ink"]); y += wb[3] - wb[1] + 18 * S
        d.rectangle((X0 + PX, y, X0 + PX + round(d.textlength(word, font=fw) * 0.62), y + RULE), fill=C["accent"])
        outs.append(("thumb-A-robotics.png", img))

    def arms_with_cams():
        """g11b's leader and follower (paper -> transparent, as ink), on a wider canvas with a wrist cam on
        the follower's forearm and a front cam on a stand to its right, in the arms' own line weight."""
        im = grab(os.path.join(a.renders, "g11b.mov"), 11.0).crop((200, 520, 1280, 980))
        L = im.convert("L"); paper = sorted(L.getdata())[len(L.getdata()) // 2]
        al = L.point(lambda v: (lambda x: 0 if x < 30 else x)(max(0, min(255, round((paper - v) * 255 / max(1, paper - 20))))))
        CW, CH, OY = 1420, 660, 120
        cv = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
        lay = Image.new("RGBA", im.size, C["ink"] + (0,)); lay.putalpha(al)
        cv.alpha_composite(lay, (0, OY))
        d = ImageDraw.Draw(cv); ink, mut, SW = C["ink"] + (255,), C["muted"] + (255,), 11
        lf = font(VAR, 32, 700)                                    # x2 supersampled by font(): 64px here
        # wrist cam: a small body riding the follower's forearm near the gripper, lens forward
        wx, wy = 890, OY + 4
        d.line((wx + 40, wy + 60, wx + 40, wy + 96), fill=ink, width=SW)
        d.rounded_rectangle((wx, wy, wx + 96, wy + 62), radius=12, fill=C["bg"] + (255,), outline=ink, width=SW)
        d.ellipse((wx + 66, wy + 10, wx + 108, wy + 52), fill=C["bg"] + (255,), outline=ink, width=SW)
        d.text((wx - 30, wy - 100), "wrist cam", font=lf, fill=mut)
        # front cam: on a stand to the right, lens toward the follower
        fx, fy = 1130, OY + 170
        d.line((fx + 60, fy + 70, fx + 60, OY + 390), fill=ink, width=SW)
        d.line((fx + 10, OY + 390, fx + 110, OY + 390), fill=ink, width=SW)
        d.rounded_rectangle((fx, fy, fx + 120, fy + 70), radius=12, fill=C["bg"] + (255,), outline=ink, width=SW)
        d.ellipse((fx - 30, fy + 8, fx + 24, fy + 62), fill=C["bg"] + (255,), outline=ink, width=SW)
        d.text((fx - 30, fy - 96), "front cam", font=lf, fill=mut)
        # which arm is which
        d.text((60, OY + 410), "leader", font=lf, fill=mut)
        d.text((760, OY + 410), "follower", font=lf, fill=mut)
        return cv.crop(cv.getbbox())

    def card_B():
        img = face_plate(a.raw, 147.700, (1860, 245, 2960, 1505), (300, 150, 3340), k=0).convert("RGBA")
        d = ImageDraw.Draw(img)
        X0, X1, PX = 34 * S, 566 * S, 28 * S; col = X1 - X0 - 2 * PX
        lines = ["VIDEO +", "TABLES"]
        fw = big_font(d, max(lines, key=lambda t: d.textlength(t, font=font(VAR, 92, 900))), col, top=92)
        lbs = [d.textbbox((0, 0), t, font=fw) for t in lines]
        art = scaled(arms_with_cams(), col)
        G, LG, RULE, PY = 30 * S, 10 * S, 6 * S, 30 * S
        th = sum(bb[3] - bb[1] for bb in lbs) + LG
        inner = art.size[1] + G + th + 16 * S + RULE
        Y0 = max(24 * S, (H * S - (inner + 2 * PY)) // 2 - 10 * S)
        panel(img, (X0, Y0, X1, Y0 + inner + 2 * PY), C["bg"], C["rule"]); d = ImageDraw.Draw(img)
        y = Y0 + PY
        img.alpha_composite(art, (X0 + PX, y)); y += art.size[1] + G
        for t, bb in zip(lines, lbs):
            d.text((X0 + PX - bb[0], y - bb[1]), t, font=fw, fill=C["ink"]); y += bb[3] - bb[1] + LG
        y += 16 * S - LG
        d.rectangle((X0 + PX, y, X0 + PX + round(d.textlength(lines[1], font=fw) * 0.62), y + RULE), fill=C["accent"])
        outs.append(("thumb-B-video-tables.png", img))

    def card_short():
        SW_, SH_, SPLIT = 1080 * S, 1920 * S, 980 * S
        img = Image.new("RGBA", (SW_, SH_), C["bg"] + (255,))
        # the face: the A smile, x centred on the face (bbox 1640-2680), shoulders to the frame bottom
        fp = sharpest(a.raw, 7.867).crop((1011, 160, 3309, 2160)).resize((SW_, SH_ - SPLIT), Image.LANCZOS)
        fp = fp.filter(ImageFilter.UnsharpMask(radius=1.2, percent=50, threshold=2)).convert("RGBA")
        fade = Image.new("L", fp.size, 255)
        for yy in range(60 * S):                                  # paper melts into the wall, no hard seam
            ImageDraw.Draw(fade).line((0, yy, fp.size[0], yy), fill=round(255 * yy / (60 * S)))
        fp.putalpha(fade); img.alpha_composite(fp, (0, SPLIT))
        d = ImageDraw.Draw(img)
        head, word, col = "your next data problem", "Robotics", 900 * S
        fh = font(VAR, 58, 700); fits(d, head, fh, col, "short")
        fw = big_font(d, word, col, top=168, low=120)
        art = scaled(hum, 305 * S)
        hb, wb = d.textbbox((0, 0), head, font=fh), d.textbbox((0, 0), word, font=fw)
        y = 176 * S
        d.text(((SW_ - (hb[2] - hb[0])) // 2 - hb[0], y - hb[1]), head, font=fh, fill=C["muted"]); y += hb[3] - hb[1] + 30 * S
        img.alpha_composite(art, ((SW_ - art.size[0]) // 2, y)); y += art.size[1] + 56 * S
        wx = (SW_ - (wb[2] - wb[0])) // 2 - wb[0]
        d.text((wx, y - wb[1]), word, font=fw, fill=C["ink"]); y += wb[3] - wb[1] + 22 * S
        rw = round(d.textlength(word, font=fw) * 0.62)
        d.rectangle(((SW_ - rw) // 2, y, (SW_ + rw) // 2, y + 10 * S), fill=C["accent"])
        if y + 10 * S > SPLIT - 30 * S:
            raise SystemExit(f"short: card runs to y {(y + 10 * S) / S:.0f}, into the face")
        outs.append(("thumb-short-robotics.png", img))

    card_A(); card_B(); card_short()
    for name, im in outs:
        size = (W, H) if im.size == (W * S, H * S) else (im.size[0] // S, im.size[1] // S)
        fin = im.convert("RGB").resize(size, Image.LANCZOS)
        fin = fin.filter(ImageFilter.UnsharpMask(radius=0.8, percent=40, threshold=2))
        p = os.path.join(a.out, name); fin.save(p)
        fin.resize((size[0] // 2, size[1] // 2) if size != (W, H) else (640, 360), Image.LANCZOS).save(p.replace(".png", "-feed-360.png"))
        print(f"  {p}  {fin.size[0]}x{fin.size[1]}  (+ feed-360)")


main()
