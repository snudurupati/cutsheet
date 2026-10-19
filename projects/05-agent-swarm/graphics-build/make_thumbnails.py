#!/usr/bin/env python3
"""Build the two A/B thumbnails (1280x720) for 05-agent-swarm.

  A  face (raw B 377.00, the smile on "nothing short of an aha moment") + a card: the
     agent-team line art from the video's own g03 card and "They talk."
  B  a second, different face (raw B 970.50, the closed-lip half-smile at the sign-off) + the same team
     art and "Split the work." (human 2026-09-30: both variants face + infographic, two
     different faces; the serene 970.30 read as tired)

The team art is lifted from the g03 render (Spark vs agent team), so the thumbnail shows
the video's own drawing. Colours from brand.md's JSON block, fonts from the job's font
files. Drawn at 2x and downsampled. Adapted from 04-lightweight-ontology's builder.

  python3 make_thumbnails.py --raw "../raw/Camera-2026-09-29 12-30-57.mov" --at 377.00 --at-b 970.50 \
      --brand ../../../brand.md --team-render renders/g03.mp4 --team-at 15 \
      --out ../assets/thumbnail --preview ../assets/thumbnail
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


FACE = (1860, 520, 2800, 1760)   # both faces sit here in the 4K frame (sub-agent bboxes)
LAP = ImageFilter.Kernel((3, 3), [0, -1, 0, -1, 4, -1, 0, -1, 0], 1, 128)


def sharpest(raw, at, k=2):
    """The sharpest frame within k frames of `at`. This camera's H.264 alternates sharp and
    soft frames, and a moving head adds blur: at the aha smile, 377.00 measured 115 on the
    eyes and 377.10 measured 127 (Laplacian variance). Expression barely changes in 2 frames."""
    best = None
    for i in range(-k, k + 1):
        t = at + i / 30
        im = grab(raw, t)
        v = ImageStat.Stat(im.convert("L").crop((2000, 850, 2700, 1100)).filter(LAP)).var[0]
        if best is None or v > best[0]:
            best = (v, t, im)
    print(f"  face {at:.2f}: sharpest frame {best[1]:.3f} (eye detail {best[0]:.0f})")
    return best[2]


def grade(im):
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
    ImageDraw.Draw(m).ellipse(FACE, fill=255)
    m = m.filter(ImageFilter.GaussianBlur(120))
    face = out.filter(ImageFilter.UnsharpMask(radius=40, percent=18, threshold=0))    # local contrast
    # midtones up on the face only, after the black point is set: brighter, not flatter
    face = face.point([round(255 * (v / 255) ** 0.88) for v in range(256)] * 3)
    face = face.filter(ImageFilter.UnsharpMask(radius=2.0, percent=90, threshold=2))  # detail
    out = Image.composite(face, out.filter(ImageFilter.UnsharpMask(radius=2.0, percent=60, threshold=3)), m)
    g = Image.new("L", im.size, 0)
    ImageDraw.Draw(g).rectangle((0, 0, 1650, im.size[1]), fill=255)
    g = g.filter(ImageFilter.GaussianBlur(180))
    return Image.composite(ImageEnhance.Color(ImageEnhance.Brightness(out).enhance(0.86)).enhance(0.85), out, g)


def face_plate(raw, at):
    """Full frame with shoulders (04: a neck crop read as "sinking"), punched in 13%.
    The face's left edge lands at x ~600 of 1280, so the card lives in x < ~560. A light
    sharpen after the downscale restores what LANCZOS softens."""
    p = grade(sharpest(raw, at)).crop((300, 200, 300 + 3340, 200 + 1879)).resize((W * S, H * S), Image.LANCZOS)
    return p.filter(ImageFilter.UnsharpMask(radius=1.2, percent=50, threshold=2))


def team_ink(render, at, ink):
    """The agent team (lead + four) from the g03 card, as ink with alpha, so it sits on
    any panel. Paper becomes transparent; the jars' grey fill stays a light tint."""
    im = grab(render, at).crop((2050, 420, 3800, 1480))
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
    ap.add_argument("--raw", required=True)
    ap.add_argument("--at", type=float, required=True, help="face time for A")
    ap.add_argument("--at-b", type=float, required=True, help="a different face for B")
    ap.add_argument("--raw-b", default="", help="B's clip, when its face is in another recording")
    ap.add_argument("--brand", required=True)
    ap.add_argument("--fonts", default="fonts")
    ap.add_argument("--team-render", required=True, help="renders/g03.mp4, the Spark vs agent team card")
    ap.add_argument("--team-at", type=float, required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--preview", default="")
    a = ap.parse_args()

    b = json.loads(re.search(r"```json\s*(\{[\s\S]*\})\s*```", open(a.brand).read()).group(1))
    C = {k: hexrgb(v) for k, v in b["colors"].items()}
    VAR = os.path.join(a.fonts, "Satoshi-Variable.ttf")
    team = team_ink(a.team_render, a.team_at, C["ink"])
    os.makedirs(a.out, exist_ok=True)
    outs = []

    def face_card(raw, at, head, words, name):
        """The face at `at` with a card in the left negative space: a small head line, the
        team art, and the phrase in heavy type (one or two lines) over an $accent rule."""
        img = face_plate(raw, at).convert("RGBA")
        d = ImageDraw.Draw(img)
        X0, X1, PX = 34 * S, 540 * S, 30 * S
        col = X1 - X0 - 2 * PX
        fh, fw = font(VAR, 34, 700), font(VAR, 94, 900)
        fits(d, head, fh, col, name)
        ww = max(fits(d, w, fw, col, name) for w in words)
        art = scaled(team, col * 0.86)
        hb = d.textbbox((0, 0), head, font=fh)
        wbs = [d.textbbox((0, 0), w, font=fw) for w in words]
        G1, G2, LG, RULE = 30 * S, 34 * S, 14 * S, 6 * S
        wh = sum(b[3] - b[1] for b in wbs) + LG * (len(words) - 1)
        inner = (hb[3] - hb[1]) + G1 + art.size[1] + G2 + wh + 18 * S + RULE
        PY = 34 * S
        Y0 = max(24 * S, (H * S - (inner + 2 * PY)) // 2 - 30 * S)
        panel(img, (X0, Y0, X1, Y0 + inner + 2 * PY), C["bg"], C["rule"])
        d = ImageDraw.Draw(img)
        y = Y0 + PY
        d.text((X0 + PX - hb[0], y - hb[1]), head, font=fh, fill=C["ink"]); y += hb[3] - hb[1] + G1
        img.alpha_composite(art, (X0 + (X1 - X0 - art.size[0]) // 2, y)); y += art.size[1] + G2
        for w, wb in zip(words, wbs):
            d.text((X0 + PX - wb[0], y - wb[1]), w, font=fw, fill=C["ink"]); y += wb[3] - wb[1] + LG
        y += 18 * S - LG
        d.rectangle((X0 + PX, y, X0 + PX + round(ww * 0.62), y + RULE), fill=C["accent"])
        outs.append((name, img))

    # A: the aha smile + "They talk." (pairs with title 4)
    face_card(a.raw, a.at, "5 AI agents, 1 pipeline", ["They talk."], "thumb-A-talk.png")
    # B: a second, different face + "Split the work." (human 2026-09-30: face + infographic
    # for both variants; pairs with title 1)
    face_card(a.raw_b or a.raw, a.at_b, "one lead, four teammates", ["Split the", "work."], "thumb-B-split.png")

    for name, im in outs:
        fin = im.convert("RGB").resize((W, H), Image.LANCZOS)
        p = os.path.join(a.out, name); fin.save(p)
        print(f"  {p}  {fin.size[0]}x{fin.size[1]}")
        if a.preview:
            q = os.path.join(a.preview, name.replace(".png", "-feed-360.png"))
            fin.resize((360, 203), Image.LANCZOS).save(q); print(f"  {q}  360x203")


main()
