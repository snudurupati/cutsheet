#!/usr/bin/env python3
"""Build the two A/B thumbnails (1280x720) for 04-lightweight-ontology.

Human decisions 2026-09-23:
  A  title "AI Hallucinates Because It Doesn't Know Your Business. Here's the Fix"
     face 4 (raw take, 16.233s) + a "Lightweight ontology / Works." card
  B  title "Skip the Enterprise Knowledge Graph: A Lightweight Ontology for AI"
     face 4 + "AI GUESSED. / MY CONTEXT / DIDN'T." with DIDN'T in $accent

Colours come from brand.md's JSON block, fonts from the job's font files. The wall
beside the face measures luma ~105 (mid-tone), so type sits on the brand $bg panel,
per style.md "type over footage always sits on a panel". Drawn at 2x and downsampled.

  python3 make_thumbnails.py --raw "../raw/<camera.mov>" --at 16.233 --brand ../../../brand.md \
      --card-render renders/g19.mov --card-at 11.0 --out ../assets/thumbnail --preview ../assets/thumbnail

Thumbnails live in the job's assets/thumbnail/ with a -feed-360 preview each, as in
every earlier job.
"""
import argparse, json, os, re, subprocess, tempfile
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

W, H, S = 1280, 720, 2          # output size and supersample factor


def font(path, px, wght=None):
    f = ImageFont.truetype(path, px * S)
    if wght:
        f.set_variation_by_axes([wght])
    return f


def face_plate(raw, at):
    """The FULL 4K camera frame (human 2026-09-23: the tight crop cut at the neck and read
    as "neck deep sinking"; the face needs its shoulders). Full frame is also the only
    16:9 crop that keeps the face on the right: its left edge sits at x ~550 of 1280, so
    the cards live in x < ~500. The mic stays: in a full frame it reads as the setup."""
    tmp = tempfile.mktemp(suffix=".png")
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-ss", f"{at:.3f}", "-i", raw,
                    "-frames:v", "1", tmp], check=True)
    im = Image.open(tmp).convert("RGB"); os.remove(tmp)
    if im.size != (3840, 2160):
        raise SystemExit(f"expected a 3840x2160 camera frame, got {im.size}")
    # a 15% punch-in that keeps the face where it was and both shoulder lines at the bottom
    # (review 2026-09-23: 170px of headroom, face only 23% of the width); the right edge
    # at x 3563 also drops the doorframe strip with its red LEDs
    return relight(im).crop((224, 262, 224 + 3339, 262 + 1878)).resize((W * S, H * S), Image.LANCZOS)


def relight(im):
    """A lighting fix, not a luma target (memory: grade on range, not mean), in the 4K
    camera frame's own coordinates. The face measured mean luma 77 with its viewer-left
    cheek in shadow, and the wall (101,87,79) sat close to the skin (99,73,61). Lift the
    face's midtones and open its shadow side under feathered ellipses, take the wall on
    the left down and slightly desaturated, and ease the lamp hotspot by the jaw."""
    from PIL import ImageEnhance
    m = Image.new("L", im.size, 0)
    ImageDraw.Draw(m).ellipse((1690, 330, 2650, 1560), fill=255)
    m = m.filter(ImageFilter.GaussianBlur(140))
    lifted = im.point([min(255, round(255 * (v / 255) ** 0.86)) for v in range(256)] * 3)
    m2 = Image.new("L", im.size, 0)
    ImageDraw.Draw(m2).ellipse((1665, 550, 2150, 1400), fill=150)
    m2 = m2.filter(ImageFilter.GaussianBlur(120))
    out = Image.composite(lifted, im, m)
    out = Image.composite(out.point([min(255, round(255 * (v / 255) ** 0.90)) for v in range(256)] * 3), out, m2)
    g = Image.new("L", im.size, 0)
    ImageDraw.Draw(g).rectangle((0, 0, 1500, im.size[1]), fill=255)
    g = g.filter(ImageFilter.GaussianBlur(180))
    out = Image.composite(ImageEnhance.Color(ImageEnhance.Brightness(out).enhance(0.88)).enhance(0.85), out, g)
    hm = Image.new("L", im.size, 0)
    ImageDraw.Draw(hm).ellipse((1600, 1250, 1850, 1460), fill=255)
    return Image.composite(ImageEnhance.Brightness(out).enhance(0.82), out, hm.filter(ImageFilter.GaussianBlur(48)))


def panel(img, box, bg, rule, radius=0):   # square, like the video's cards (A pastes one)
    """$bg panel at 94% with a 2px $rule edge and a soft shadow, the style's card."""
    x0, y0, x1, y1 = box
    sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rectangle((x0 + 10 * S, y0 + 14 * S, x1 + 10 * S, y1 + 14 * S), fill=(0, 0, 0, 90))
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(22 * S)))
    lay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    d.rectangle(box, fill=bg + (240,), outline=rule + (255,), width=2 * S)
    img.alpha_composite(lay)


def hexrgb(h):
    h = h.lstrip("#"); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def fits(d, text, f, maxw, what):
    w = d.textlength(text, font=f)
    if w > maxw:
        raise SystemExit(f"{what}: '{text}' is {w / S:.0f}px, wider than {maxw / S:.0f}px")
    return w


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", required=True)
    ap.add_argument("--at", type=float, required=True)
    ap.add_argument("--brand", required=True)
    ap.add_argument("--fonts", default="fonts")
    ap.add_argument("--out", required=True)
    ap.add_argument("--preview", default="", help="also write 360px-wide previews here")
    ap.add_argument("--card-render", required=True, help="renders/g19.mov, the Works. card with alpha")
    ap.add_argument("--card-at", type=float, required=True, help="a time in that render after everything has landed")
    a = ap.parse_args()

    b = json.loads(re.search(r"```json\s*(\{[\s\S]*\})\s*```", open(a.brand).read()).group(1))
    C = {k: hexrgb(v) for k, v in b["colors"].items()}
    VAR, BOLD = os.path.join(a.fonts, "Satoshi-Variable.ttf"), os.path.join(a.fonts, "Satoshi-Bold.otf")
    plate = face_plate(a.raw, a.at)
    os.makedirs(a.out, exist_ok=True)
    outs = []

    # ---------------- A: the video's own "Works." card (g19) ---------------------
    # Human 2026-09-23: "Lightweight ontology" means the GRAPHIC from the video, not
    # text: the g19 card (subject, the three files wired to the jar, $7,449,106 struck,
    # $2,187,780 ticked, "Works." and its rule), taken from its alpha render after
    # everything has landed and scaled so its body is 450px wide, left of the face.
    img = plate.convert("RGBA")
    tmp = tempfile.mktemp(suffix=".png")
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-ss", f"{a.card_at:.3f}", "-i", a.card_render,
                    "-frames:v", "1", "-vf", "format=rgba", tmp], check=True)
    card = Image.open(tmp).convert("RGBA"); os.remove(tmp)
    body = card.split()[3].point(lambda v: 255 if v > 200 else 0).getbbox()      # the panel itself
    full = card.split()[3].point(lambda v: 255 if v > 8 else 0).getbbox()       # with its shadow
    if not body:
        raise SystemExit(f"{a.card_render} at {a.card_at}s has no card on it")
    k = (470 * S) / (body[2] - body[0])
    card = card.crop(full)
    card = card.resize((round(card.size[0] * k), round(card.size[1] * k)), Image.LANCZOS)
    bx0 = round((body[0] - full[0]) * k); by0 = round((body[1] - full[1]) * k)
    bh = round((body[3] - body[1]) * k)
    # 50px above centre: centred, its bottom edge sat on the left shoulder line (human 2026-09-23)
    X, Y = 34 * S - bx0, (H * S - bh) // 2 - by0 - 50 * S
    img.alpha_composite(card, (X, Y))
    print(f"  A: g19 card at {a.card_at}s, body {470}x{bh // S}px at x {(X + bx0) // S}-{(X + bx0) // S + 470}, y {(Y + by0) // S}-{(Y + by0 + bh) // S}")
    outs.append(("thumb-A-works.png", img))

    # ---------------- B: "AI GUESSED. / MY CONTEXT / DIDN'T." --------------------
    # Review 2026-09-23: the block sat 5px low and no line led; "DIDN'T." is now 15%
    # larger in $accent and the block is centred on measured glyph boxes.
    img = plate.convert("RGBA")
    d = ImageDraw.Draw(img)
    X0, X1, PADX, PADY = 34 * S, 490 * S, 32 * S, 40 * S   # full frame: the face starts at x ~550
    col = X1 - X0 - 2 * PADX
    f, fb = font(VAR, 57, 900), font(VAR, 66, 900)   # "MY CONTEXT", the widest line: 387px at 57px in a 392px column
    lines = [("AI GUESSED.", f, C["ink"]), ("MY CONTEXT", f, C["ink"]), ("DIDN’T.", fb, C["accent"])]
    for t, ff, _ in lines:
        fits(d, t, ff, col, "B")
    boxes = [d.textbbox((0, 0), t, font=ff) for t, ff, _ in lines]
    GAP = 28 * S
    hsum = sum(bx[3] - bx[1] for bx in boxes) + GAP * 2
    Y0 = (H * S - (hsum + 2 * PADY)) // 2
    panel(img, (X0, Y0, X1, Y0 + hsum + 2 * PADY), C["bg"], C["rule"])
    d = ImageDraw.Draw(img)
    y = Y0 + PADY
    for (t, ff, c), bx in zip(lines, boxes):
        d.text((X0 + PADX - bx[0], y - bx[1]), t, font=ff, fill=c)
        y += bx[3] - bx[1] + GAP
    outs.append(("thumb-B-guessed.png", img))

    for name, im in outs:
        fin = im.convert("RGB").resize((W, H), Image.LANCZOS)
        p = os.path.join(a.out, name); fin.save(p)
        print(f"  {p}  {fin.size[0]}x{fin.size[1]}")
        if a.preview:
            os.makedirs(a.preview, exist_ok=True)
            q = os.path.join(a.preview, name.replace(".png", "-feed-360.png"))
            fin.resize((360, 203), Image.LANCZOS).save(q); print(f"  {q}  360x203")


main()
