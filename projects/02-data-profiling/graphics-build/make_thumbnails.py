#!/usr/bin/env python3.14
"""Build the two A/B thumbnails (1280x720) for 02-data-profiling, each with a -feed-360.png preview.

Titles and texts are the human's, verbatim (2026-10-28):
  A  "Robotics Made Data Engineering Fun Again". The smile, the two ALOHA sim arms large beside it
     (the real sim frame, from the Rerun panel in the screen recording, mid-insertion), the profiler
     notebook faint behind. Text "THIS IS WHY."
  B  "Robotics Reminded Me Why I Love Data Engineering". The Push-T episode-length S-curve, redrawn
     from the dataset's own episode table (206 episodes, 25,650 frames), its two real outliers
     (episodes 174 and 184, above the 1.5 x IQR fence) circled in $accent, joined to the Push-T sim
     with its T home on the goal: the "outlier" finished its task. The skeptical look. Text
     "CURIOUS AGAIN."

EXPOSURE: no grade (human 2026-10-18). The plate is the raw frame, downscaled, light sharpen only.

  python3.14 make_thumbnails.py --brand ../../../brand.md --fonts ../../../assets/fonts/satoshi \
      --face-a "../raw/Camera-2026-10-27 19-49-33.mov:13.0:1640,260,2740,1700" \
      --face-b "../raw/Camera-2026-10-27 20-07-14.mov:779.8:1480,180,2500,1450" \
      --aloha <Screen 20-24-11 at 1397.0 as png> --notebook <Screen 20-07-14 at 257.6 as png> \
      --lengths <Push-T meta/episodes lengths as a JSON list> --out ../assets/thumbnails
  (faces: A the pre-roll smile; B hands on the jaw at 12:42, the human's pick 2026-10-28)
"""
import argparse, json, math, os, re, subprocess, tempfile
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageStat

W, H, S = 1280, 720, 2
LAP = ImageFilter.Kernel((3, 3), [0, -1, 0, -1, 4, -1, 0, -1, 0], 1, 128)


def font(path, px, wght=None):
    f = ImageFont.truetype(path, round(px * S))
    if wght:
        f.set_variation_by_axes([wght])
    return f


def hexrgb(h):
    h = h.lstrip("#"); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def grab(src, at):
    tmp = tempfile.mktemp(suffix=".png")
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-ss", f"{at:.3f}", "-i", src,
                    "-frames:v", "1", tmp], check=True)
    im = Image.open(tmp).convert("RGB"); os.remove(tmp)
    if im.size != (3840, 2160):
        raise SystemExit(f"{src}: expected a 3840x2160 frame, got {im.size}")
    return im


def sharpest(raw, at, fbox, k=2):
    """The sharpest frame within k frames of `at`, measured on the eye band of the face box."""
    x0, y0, x1, y1 = fbox
    eyes = (x0, y0 + (y1 - y0) * 30 // 100, x1, y0 + (y1 - y0) * 55 // 100)
    best = None
    for i in range(-k, k + 1):
        t = at + i / 30
        im = grab(raw, t)
        v = ImageStat.Stat(im.convert("L").crop(eyes).filter(LAP)).var[0]
        if best is None or v > best[0]:
            best = (v, t, im)
    print(f"  face {at:.3f}: sharpest frame {best[1]:.3f} (eye detail {best[0]:.0f})")
    return best[2]


def face_plate(spec, fx=0.70, cw=3600, k=2):
    """Full frame with shoulders, face centre at fx of the width, so the card lives on the left.
    When that puts the crop past the camera frame's left edge, the frame is extended with a mirrored,
    blurred continuation of the wall there (human 2026-10-28: "bring the face to the right"); that strip
    sits under the notebook and the cards."""
    raw, at, box = spec
    x0, y0, x1, y1 = box
    ch = round(cw * 9 / 16)
    cx = (x0 + x1) / 2
    im = sharpest(raw, at, box, k)
    pad = max(0, round(fx * cw - cx))
    if pad:
        ext = Image.new("RGB", (3840 + pad, 2160))
        strip = im.crop((0, 0, pad, 2160)).transpose(Image.FLIP_LEFT_RIGHT).filter(ImageFilter.GaussianBlur(60))
        ext.paste(strip, (0, 0)); ext.paste(im, (pad, 0))
        seam = Image.new("L", (3840 + pad, 2160), 0)
        ImageDraw.Draw(seam).rectangle((0, 0, pad, 2160), fill=255)
        ext = Image.composite(ext.filter(ImageFilter.GaussianBlur(30)), ext, seam.filter(ImageFilter.GaussianBlur(80)))
        im = ext; x0 += pad; x1 += pad; cx += pad
    cx0 = round(min(max(cx - fx * cw, 0), im.size[0] - cw))
    cy0 = 2160 - ch                          # bottom-aligned: shoulders in, never a neck crop
    p = im.crop((cx0, cy0, cx0 + cw, cy0 + ch)).resize((W * S, H * S), Image.LANCZOS)
    face_l = (x0 - cx0) * W / cw
    print(f"  plate crop x{cx0} y{cy0} w{cw} pad{pad}: face spans x {face_l:.0f}-{(x1 - cx0) * W / cw:.0f} of 1280")
    return p.filter(ImageFilter.UnsharpMask(radius=1.2, percent=50, threshold=2)).convert("RGBA"), face_l


def shadowed(img, box, radius=18, alpha=95):
    x0, y0, x1, y1 = box
    sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rectangle((x0 + 8 * S, y0 + 12 * S, x1 + 8 * S, y1 + 12 * S), fill=(0, 0, 0, alpha))
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(radius * S)))


def panel(img, box, bg, rule):
    shadowed(img, box)
    lay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(lay).rectangle(box, fill=bg + (244,), outline=rule + (255,), width=2 * S)
    img.alpha_composite(lay)


def framed(img, pic, xy, border=6):
    """The house card edge: a 6px white border and a real shadow."""
    x, y = xy; b = border * S
    box = (x - b, y - b, x + pic.size[0] + b, y + pic.size[1] + b)
    shadowed(img, box, radius=14, alpha=110)
    ImageDraw.Draw(img).rectangle(box, fill=(255, 255, 255, 255))
    img.alpha_composite(pic.convert("RGBA"), (x, y))
    return box


def lines_font(d, path, lines, maxw, top, low=56):
    for px in range(top, low - 1, -2):
        f = font(path, px, 900)
        if max(d.textlength(t, font=f) for t in lines) <= maxw:
            return f
    raise SystemExit(f"{lines} do not fit {maxw / S:.0f}px even at {low}px")


def draw_lines(d, lines, f, x, y, fill, gap):
    for t in lines:
        bb = d.textbbox((0, 0), t, font=f)
        d.text((x - bb[0], y - bb[1]), t, font=f, fill=fill)
        y += bb[3] - bb[1] + gap
    return y - gap


def pusht(size, C):
    """The Push-T sim at the moment its task completes: the T home on its goal, the pusher beside it.
    Redrawn in the sim's own colours (pymunk LightSlateGray T, LightGreen goal, RoyalBlue agent): the
    dataset's frames are 96x96 and read as mush at thumbnail size."""
    n = size * 4
    im = Image.new("RGBA", (n, n), (255, 255, 255, 255))
    d = ImageDraw.Draw(im)
    u = n / 9.0                               # T: bar 4u x 1u, stem 1u x 3u
    def T(cx, cy, ang, fill):
        pts_bar = [(-2, -2), (2, -2), (2, -1), (-2, -1)]
        pts_stem = [(-0.5, -1), (0.5, -1), (0.5, 2), (-0.5, 2)]
        c, s = math.cos(ang), math.sin(ang)
        for poly in (pts_bar, pts_stem):
            d.polygon([(cx + u * (x * c - y * s), cy + u * (x * s + y * c)) for x, y in poly], fill=fill)
    ang = math.radians(-135 + 180)             # bar runs down-right, stem points down-left, as in the take
    T(n / 2 + u * 0.16, n / 2 + u * 0.20, ang, (144, 238, 144, 255))   # the goal peeks out, so it reads as home
    T(n / 2, n / 2, ang, (119, 136, 153, 255))
    c, s = math.cos(ang), math.sin(ang)
    px, py = n / 2 + u * (1.0 * c - (-2.75) * s), n / 2 + u * (1.0 * s + (-2.75) * c)
    r = u * 0.42
    d.ellipse((px - r, py - r, px + r, py + r), fill=(65, 105, 225, 255))
    return im.resize((size, size), Image.LANCZOS)


def scurve(lengths, w, h, C):
    """The episode-length S-curve (episodes sorted by length), from the dataset's own table, in ink.
    Returns the image and the centre and radii of the outlier ellipse (points above Q3 + 1.5 IQR)."""
    s = sorted(lengths); n = len(s)
    q = lambda p: s[int(p * (n - 1))]
    fence = q(0.75) + 1.5 * (q(0.75) - q(0.25))
    out = [i for i, v in enumerate(s) if v > fence]
    m = 6 * S
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    lo, hi = 40, 260
    X = lambda i: m + (w - 2 * m) * i / (n - 1)
    Y = lambda v: h - m - (h - 2 * m) * (v - lo) / (hi - lo)
    d.line([(X(i), Y(v)) for i, v in enumerate(s)], fill=C["ink"] + (255,), width=6 * S, joint="curve")
    # the step: where the curve stops climbing and goes vertical, from the last ordinary episode
    # to the outliers above the fence
    k = out[0] - 2
    d.line([(X(i), Y(s[i])) for i in range(k, n)], fill=C["accent"] + (255,), width=7 * S, joint="curve")
    xs = [X(i) for i in range(k, n)]; ys = [Y(s[i]) for i in range(k, n)]
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    print(f"  S-curve: {n} episodes, fence {fence:.1f}, outliers {[s[i] for i in out]}, step from {s[k]}")
    return im, (cx, cy), (max(xs) - min(xs), max(ys) - min(ys))


def marker_loop(img, cx, cy, rx, ry, col, seed=3):
    """A loop drawn as if with a felt marker: not quite closed (the stroke overshoots its start), a little
    wobble in the radius, a slight tilt, and a stroke that swells and tapers."""
    import random
    rnd = random.Random(seed)
    lay = Image.new("RGBA", img.size, (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    tilt, t0, t1 = math.radians(-8), math.radians(-70), math.radians(-70 + 395)
    ph = [rnd.uniform(0, 6.28) for _ in range(3)]
    N = 900
    for j in range(N + 1):
        u = j / N; t = t0 + (t1 - t0) * u
        wob = 1 + 0.035 * math.sin(2 * t + ph[0]) + 0.02 * math.sin(3 * t + ph[1])
        grow = 1 + 0.09 * u                     # the second pass drifts outward, as a hand does
        ex, ey = rx * wob * grow * math.cos(t), ry * wob * grow * math.sin(t)
        x = cx + ex * math.cos(tilt) - ey * math.sin(tilt)
        y = cy + ex * math.sin(tilt) + ey * math.cos(tilt)
        r = S * (2.6 + 2.6 * math.sin(math.pi * min(1, u * 1.15)) ** 0.6)
        d.ellipse((x - r, y - r, x + r, y + r), fill=col + (235,))
    img.alpha_composite(lay)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--brand", required=True); ap.add_argument("--fonts", required=True)
    ap.add_argument("--face-a", required=True); ap.add_argument("--face-b", required=True)
    ap.add_argument("--aloha", required=True, help="a 4K screen frame with the ALOHA Rerun image panel")
    ap.add_argument("--notebook", required=True, help="a 4K screen frame of the profiler notebook")
    ap.add_argument("--lengths", required=True, help="Push-T episode lengths, JSON list")
    ap.add_argument("--out", required=True)
    ap.add_argument("--only", choices=["A", "B"])
    ap.add_argument("--face-b2", help="an alternate face for B, built as thumb-B2")
    a = ap.parse_args()
    b = json.loads(re.search(r"```json\s*(\{[\s\S]*?\})\s*```", open(a.brand).read()).group(1))
    C = {k: hexrgb(v) for k, v in b["colors"].items()}
    VAR = os.path.join(a.fonts, "Satoshi-Variable.ttf")
    def spec(s):
        raw, t, box = s.rsplit(":", 2)
        return raw, float(t), tuple(int(v) for v in box.split(","))
    lengths = json.load(open(a.lengths))
    if (len(lengths), sum(lengths)) != (206, 25650):
        raise SystemExit(f"lengths: {len(lengths)} episodes / {sum(lengths)} frames, the video says 206 / 25650")
    os.makedirs(a.out, exist_ok=True)
    outs = []

    def card_A():
        img, face_l = face_plate(spec(a.face_a), fx=0.76)
        # the notebook in the background: its title and first lines legible at the top, fading down and
        # out before the face (human 2026-10-28)
        nb = Image.open(a.notebook).convert("RGB").crop((820, 300, 3060, 2160))     # below the toolbar row
        nb = nb.resize((round(nb.size[0] * H * S / nb.size[1]), H * S), Image.LANCZOS).convert("RGBA")
        mask = Image.new("L", nb.size, 0); md = ImageDraw.Draw(mask)
        edge = round((face_l - 30) * S)
        for y in range(0, nb.size[1], 2):
            top = 155 if y < 92 * S else round(155 * max(0.0, 1 - (y - 92 * S) / (40 * S)))
            for x in range(0, nb.size[0], 4):
                v = 0 if x > edge else round(top * min(1.0, (edge - x) / (160 * S)))
                md.rectangle((x, y, x + 3, y + 1), fill=v)
        nb.putalpha(mask.filter(ImageFilter.GaussianBlur(2))); img.alpha_composite(nb, (0, 12 * S))
        # the two arms, large, under the notebook's title lines
        arms = Image.open(a.aloha).convert("RGB").crop((470, 1120, 1650, 1665))
        aw = round((face_l - 96) * S)
        arms = arms.resize((aw, round(arms.size[1] * aw / arms.size[0])), Image.LANCZOS)
        abox = framed(img, arms, (40 * S, 132 * S))
        d = ImageDraw.Draw(img)
        # the type: one line, low, allowed onto the shoulder
        text = "THIS IS WHY."
        PX, PY, RULE = 24 * S, 20 * S, 9 * S
        tx = 46 * S
        f = lines_font(d, VAR, [text], round((face_l + 150) * S) - tx - PX, top=104)
        bb = d.textbbox((0, 0), text, font=f)
        th, tw = bb[3] - bb[1], bb[2] - bb[0]
        sb = (H - 26) * S
        st = sb - (PY + th + 16 * S + RULE + PY)
        if st < abox[3] + 36 * S:
            raise SystemExit(f"A: text slab top {st / S:.0f} crowds the arms (bottom {abox[3] / S:.0f})")
        panel(img, (tx - PX, st, tx + tw + PX, sb), C["bg"], C["rule"]); d = ImageDraw.Draw(img)
        yb = draw_lines(d, [text], f, tx, st + PY, C["ink"], 0)
        d.rectangle((tx, yb + 16 * S, tx + round(tw * 0.42), yb + 16 * S + RULE), fill=C["accent"])
        print(f"  A: arms y {abox[1] / S:.0f}-{abox[3] / S:.0f}, type slab y {st / S:.0f}-{sb / S:.0f}, x to {(tx + tw + PX) / S:.0f}")
        outs.append(("thumb-A-this-is-why.png", img))

    def card_B(face, name):
        img, face_l = face_plate(spec(face), fx=0.74)
        X0, X1 = 34 * S, round(min(600, face_l - 24) * S)
        PX, PY = 26 * S, 26 * S
        col = X1 - X0 - 2 * PX
        d = ImageDraw.Draw(img)
        lines = ["CURIOUS", "AGAIN."]
        f = lines_font(d, VAR, lines, col, top=110)
        hb = [d.textbbox((0, 0), t, font=f) for t in lines]
        gap, RULE = 8 * S, 9 * S
        th = sum(bb[3] - bb[1] for bb in hb) + gap
        cw, chh = col, 250 * S
        inner = chh + 34 * S + th + 18 * S + RULE
        Y0 = max(24 * S, (H * S - (inner + 2 * PY)) // 2)
        panel(img, (X0, Y0, X1, Y0 + inner + 2 * PY), C["bg"], C["rule"]); d = ImageDraw.Draw(img)
        cx0, cy0 = X0 + PX, Y0 + PY
        chart, (ocx, ocy), (sw, sh) = scurve(lengths, cw - 50 * S, chh - 20 * S, C)
        img.alpha_composite(chart, (cx0, cy0 + 20 * S)); ocy += 20 * S
        # the marker loop around the step where the curve goes vertical
        marker_loop(img, cx0 + ocx, cy0 + ocy + 4 * S, sw / 2 + 30 * S, sh / 2 + 40 * S, C["accent"])
        # the sim, finished, in the empty top left of the chart (human 2026-10-28)
        sim = 120 * S
        p = pusht(sim, C)
        box = framed(img, p, (cx0 + 8 * S, cy0 + 6 * S), border=4)
        d = ImageDraw.Draw(img)
        lab = font(VAR, 22, 700)
        d.text((box[2] + 12 * S, box[1] + 6 * S), "ep 174:", font=lab, fill=C["muted"])
        d.text((box[2] + 12 * S, box[1] + 34 * S), "done", font=lab, fill=C["muted"])
        ty = cy0 + chh + 34 * S
        yb = draw_lines(d, lines, f, X0 + PX, ty, C["ink"], gap)
        d.rectangle((X0 + PX, yb + 18 * S, X0 + PX + round(d.textlength(lines[0], font=f) * 0.62), yb + 18 * S + RULE), fill=C["accent"])
        outs.append((name, img))

    if a.only in (None, "A"): card_A()
    if a.only in (None, "B"):
        card_B(a.face_b, "thumb-B-curious-again.png")
        if a.face_b2:
            card_B(a.face_b2, "thumb-B2-curious-again-hand.png")
    for name, im in outs:
        fin = im.convert("RGB").resize((W, H), Image.LANCZOS)
        fin = fin.filter(ImageFilter.UnsharpMask(radius=0.8, percent=40, threshold=2))
        p = os.path.join(a.out, name); fin.save(p)
        fin.resize((640, 360), Image.LANCZOS).save(p.replace(".png", "-feed-360.png"))
        print(f"  {p}  {fin.size[0]}x{fin.size[1]}  (+ feed-360)")


main()
