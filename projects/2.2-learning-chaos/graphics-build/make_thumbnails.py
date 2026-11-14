#!/usr/bin/env python3
"""Build the two A/B thumbnails (1280x720) for 2.2-learning-chaos, each with a
-feed-360.png preview. Ported from 2.1-robotics-as-de.

  A  the pre-roll smile (raw a 4.8667, face-finder CHOICE-A) + the Push-T board
     redrawn in its own colours with the cowboy swing arc in $accent;
     "PHYSICS HAS ITS OWN MIND" over "CHAOS."
     Title: "Physics Has Its Own Mind: Why Robots Need Chaos"
  B  The Scoreboard (human brief 2026-11-14): the rueful raised-brow face
     (raw b 995.0, closed mouth, reads apart from A's smile) + the off-white
     card on the left split in two halves: the grey cowboy T mid-spin on its
     dashed loop with a bold "0/100"; one orange arrow down; the black T snapped
     into the green goal outline with "36 of 50" in accent. No words beyond the
     numbers. Pairs with Title B.
  Round 3 (human 2026-11-14): A's graphic approved as is, the face was chopped;
  the plate now spans head top to below the shoulders, true orientation (no
  mirror: the earlier flip was rejected), and `shift` centres the face in the
  zone beside the card over a blurred edge extension. The 74% scorecard B and
  the grid B were both cut.

EXPOSURE: no grade. The plate is the raw frame exactly as finished.mov shows it
(the base cut is the raw, ungraded), downscaled with a light sharpen only (human
2026-10-18, 01: graded faces read overexposed next to the video).

The board and the scorecard are REDRAWN (02 precedent), not frames: the dataset
board is 96x96 in the notebook and a struck-through row reads better drawn than
captured.

  python3 make_thumbnails.py --rawA "../raw/Camera-2026-11-11 10-56-42.mov" \
      --rawB "../raw/Camera-2026-11-11 11-14-09.mov" --brand ../../../brand.md \
      --fonts fonts --out ../assets/thumbnail
"""
import argparse, json, os, re, subprocess, tempfile
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageStat

W, H, S = 1280, 720, 2


def font(path, px, wght=None):
    f = ImageFont.truetype(path, px * S)
    if wght:
        f.set_variation_by_axes([wght])
    return f


def grab(src, at):
    tmp = tempfile.mktemp(suffix=".png")
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-ss", f"{at:.3f}", "-i", src,
                    "-frames:v", "1", tmp], check=True)
    im = Image.open(tmp).convert("RGB"); os.remove(tmp)
    if im.size != (3840, 2160):
        raise SystemExit(f"{src}: expected a 3840x2160 frame, got {im.size}")
    return im


LAP = ImageFilter.Kernel((3, 3), [0, -1, 0, -1, 4, -1, 0, -1, 0], 1, 128)
EYES = (880, 760, 1640, 920)   # eye band in these frames, for the sharpness score


def sharpest(raw, at, k=2):
    """The sharpest frame within k frames of `at`, scored on the eyes (2.1: this
    camera's H.264 alternates sharp and soft frames)."""
    best = None
    for i in range(-k, k + 1):
        t = at + i / 30
        im = grab(raw, t)
        v = ImageStat.Stat(im.convert("L").crop(EYES).filter(LAP)).var[0]
        if best is None or v > best[0]:
            best = (v, t, im)
    print(f"  face {at:.2f}: sharpest frame {best[1]:.3f} (eye detail {best[0]:.0f})")
    return best[2]


def face_plate(raw, at, crop, k=2, shift=0):
    """Head-to-shoulders plate at 2x, no grade, light sharpen. The speaker sits
    left of centre in both raw frames; `shift` slides the crop right on the
    canvas (in 1x px) so the face centres in the free zone beside the card, and
    the vacated left strip is filled with a blurred edge extension of the same
    frame (wall). No mirror: the frame keeps its true orientation (2026-11-14).
    """
    x0, y0, cw, ch = crop
    p = sharpest(raw, at, k).crop((x0, y0, x0 + cw, y0 + ch)).resize((W * S, H * S), Image.LANCZOS)
    if shift:
        sx = shift * S
        canvas = Image.new("RGB", (W * S, H * S))
        edge = p.crop((0, 0, 8 * S, H * S)).filter(ImageFilter.GaussianBlur(24 * S))
        canvas.paste(edge.resize((sx, H * S), Image.BILINEAR), (0, 0))
        canvas.paste(p.crop((0, 0, W * S - sx, H * S)), (sx, 0))
        p = canvas
    return p.filter(ImageFilter.UnsharpMask(radius=1.2, percent=50, threshold=2))


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


def board_art(C):
    """The Push-T board redrawn in the house colours: the T outline light, the T
    block rotated (torqued, not translated: the cowboy failure), the pusher with
    its arm, and the cowboy swing arc in accent."""
    sz = (900, 900)
    im = Image.new("RGBA", sz, (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    ink, mut, acc = C["ink"] + (255,), C["muted"] + (255,), C["accent"] + (255,)
    # the outline T (an L-shape pair, like the sim's goal outline), light grey
    ow = 26
    d.rectangle((300, 300, 600, 300 + ow), fill=mut)          # top bar
    d.rectangle((425, 300, 425 + ow, 620), fill=mut)          # stem
    # the block: same T, rotated 40 deg about its centre, ink, sitting off the goal
    blk = Image.new("RGBA", (300, 340), (0, 0, 0, 0))
    bd = ImageDraw.Draw(blk)
    bd.rectangle((0, 0, 300, 46), fill=ink)
    bd.rectangle((127, 0, 173, 340), fill=ink)
    blk = blk.rotate(40, expand=True, resample=Image.BICUBIC)
    im.alpha_composite(blk, (250, 480))
    # pusher: a filled dot with a short arm, at the block's edge (holding the T by
    # its edge and swinging it, which is what the cowboy policy does)
    d.ellipse((700, 430, 780, 510), fill=ink)
    d.line((740, 470, 620, 560), fill=ink, width=22)
    # cowboy arc: dashed sweep around the block in accent, arrowhead at the end
    import math
    cx, cy, r = 420, 620, 300
    for a0 in range(200, 350, 14):
        p0 = [cx + r * math.cos(math.radians(a0)), cy - r * math.sin(math.radians(a0))]
        p1 = [cx + r * math.cos(math.radians(a0 + 7)), cy - r * math.sin(math.radians(a0 + 7))]
        d.line((*p0, *p1), fill=acc, width=16)
    ax, ay = cx + r * math.cos(math.radians(357)), cy - r * math.sin(math.radians(357))
    d.polygon([(ax + 30, ay), (ax - 12, ay - 26), (ax - 12, ay + 26)], fill=acc)
    bb = im.getbbox()
    return im.crop(bb)


def score_art(C):
    """The two-policy scorecard drawn, not captured: random 0 of 100 struck
    through in muted, diffusion 36 of 50 in accent. The numbers are his own
    (cut 6:12 zero successes in 100; cut 11:09 36 of 50)."""
    im = Image.new("RGBA", (900, 470), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    ink, mut, acc = C["ink"] + (255,), C["muted"] + (255,), C["accent"] + (255,)
    VAR = os.environ["DSH_VAR_FONT"]
    f1 = font(VAR, 28, 500); f2 = font(VAR, 54, 900)
    d.text((0, 0), "random policy", font=f1, fill=mut)
    d.text((0, 34), "0 of 100", font=f2, fill=mut)
    w = d.textlength("0 of 100", font=f2)
    d.line((0 - 6, 100, w + 6, 100), fill=mut, width=6)     # struck through: it failed
    d.text((0, 168), "diffusion policy", font=f1, fill=mut)
    d.text((0, 202), "36 of 50", font=f2, fill=acc)
    d.line((0, 300, 900, 300), fill=C["rule"] + (255,), width=4)
    d.text((0, 328), "the policy that learned", font=f1, fill=ink)
    return im.crop(im.getbbox())


def scoreboard_art(C):
    """The Scoreboard card, human brief 2026-11-14: two halves. Top: the cowboy T
    mid-spin, grey, with the dashed loop and a bold "0/100" beside it. Between:
    one orange arrow. Bottom: the T snapped into the goal outline (the sim's own
    green), "36 of 50" in accent beside it. No words beyond the numbers.
    Canvas is the card's content column wide, drawn at 2x by the caller."""
    GREEN = (88, 178, 88)          # the sim's lightgreen goal, darkened for the card
    WID, HALF, GAP, ARROW = 900, 300, 96, 60
    im = Image.new("RGBA", (WID, HALF * 2 + GAP + ARROW), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    ink, mut, acc = C["ink"] + (255,), C["muted"] + (255,), C["accent"] + (255,)
    VAR = os.environ["DSH_VAR_FONT"]
    fn = font(VAR, 78, 900)

    def t_shape(col, scale=1.0):
        """A Push-T block as its own image: top bar + stem, drawn upright."""
        w, bar, stem_w, stem_h = int(200 * scale), int(44 * scale), int(58 * scale), int(210 * scale)
        b = Image.new("RGBA", (w, bar + stem_h - 6), (0, 0, 0, 0))
        bd = ImageDraw.Draw(b)
        bd.rectangle((0, 0, w, bar), fill=col)
        bd.rectangle(((w - stem_w) // 2, 0, (w + stem_w) // 2, bar + stem_h - 6), fill=col)
        return b

    def goal_outline(col, w, bar, stem_w, stem_h, ow):
        """The goal T as an outline only, in the same T geometry as t_shape."""
        b = Image.new("RGBA", (w + 24, bar + stem_h + 30), (0, 0, 0, 0))
        bd = ImageDraw.Draw(b)
        bd.rectangle((12, 12, 12 + w, 12 + bar), outline=col, width=ow)
        bd.rectangle((12 + (w - stem_w) // 2, 12, 12 + (w + stem_w) // 2,
                      12 + bar + stem_h), outline=col, width=ow)
        return b

    def num(x_right, y_mid, txt, col):
        """Bold number, right-aligned at x_right, auto-fitted into the number
        zone (420..900) so nothing clips the card edge."""
        px = 78
        f = font(VAR, px, 900)
        while d.textlength(txt, font=f) > 470 and px > 40:
            px -= 2
            f = font(VAR, px, 900)
        nb = d.textbbox((0, 0), txt, font=f)
        d.text((x_right - nb[0] - d.textlength(txt, font=f), y_mid - (nb[3] - nb[1]) // 2 - nb[1]),
               txt, font=f, fill=col)

    # --- top half: cowboy T mid-spin + dashed loop, grey, "0/100" beside it
    blk = t_shape(mut).rotate(38, expand=True, resample=Image.BICUBIC)
    bx, by = 40, 40
    im.alpha_composite(blk, (bx, by))
    import math
    cx, cy, r = bx + blk.size[0] // 2, by + blk.size[1] // 2 + 30, 170
    for a0 in range(205, 355, 15):
        p0 = [cx + r * math.cos(math.radians(a0)), cy - r * math.sin(math.radians(a0))]
        p1 = [cx + r * math.cos(math.radians(a0 + 8)), cy - r * math.sin(math.radians(a0 + 8))]
        d.line((*p0, *p1), fill=mut, width=10)
    ax, ay = cx + r * math.cos(math.radians(357)), cy - r * math.sin(math.radians(357))
    d.polygon([(ax + 24, ay), (ax - 10, ay - 20), (ax - 10, ay + 20)], fill=mut)
    num(880, HALF // 2, "0/100", mut)

    # --- between the halves: one orange arrow, pointing down (failure to fix)
    xa = 170
    d.line((xa, HALF + 8, xa, HALF + GAP + ARROW - 44), fill=acc, width=16)
    d.polygon([(xa, HALF + GAP + ARROW - 4), (xa - 30, HALF + GAP + ARROW - 52),
               (xa + 30, HALF + GAP + ARROW - 52)], fill=acc)

    # --- bottom half: T snapped into the green goal: the goal drawn as a green
    # T 28% larger than the block, ink block centred inside it, so the green
    # reads as the goal ring around the block (like the sim at goal), "36 of 50"
    # in accent beside it
    y2 = HALF + GAP + ARROW
    g = t_shape(GREEN, 1.28)
    blk2 = t_shape(ink)
    gcx, gcy = 170, y2 + HALF // 2
    im.alpha_composite(g, (gcx - g.size[0] // 2, gcy - g.size[1] // 2))
    im.alpha_composite(blk2, (gcx - blk2.size[0] // 2, gcy - blk2.size[1] // 2))
    num(880, y2 + HALF // 2, "36 of 50", acc)
    return im


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--rawA", required=True); ap.add_argument("--rawB", required=True)
    ap.add_argument("--brand", required=True); ap.add_argument("--fonts", default="fonts")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    b = json.loads(re.search(r"```json\s*(\{[\s\S]*\})\s*```", open(a.brand).read()).group(1))
    C = {k: hexrgb(v) for k, v in b["colors"].items()}
    VAR = os.path.join(a.fonts, "Satoshi-Variable.ttf")
    os.environ["DSH_VAR_FONT"] = VAR
    os.makedirs(a.out, exist_ok=True)
    outs = []

    def big_font(d, text, maxw, top=110, low=64):
        for px in range(top, low - 1, -2):
            f = font(VAR, px, 900)
            if d.textlength(text, font=f) <= maxw: return f
        raise SystemExit(f"'{text}' does not fit {maxw / S:.0f}px even at {low}px")

    # Measured on the raw frames (grid overlay, probe/thumbs-r3/gridA.png): A's
    # face centre x ~1163, head top ~190, chin ~1410; B's face centre x ~1351.
    # The old crop (0,60,1900,1070) ended at y 1070: it cut the face across the
    # nose. This window carries head top to below the shoulders; `shift` slides
    # the plate right so the face centres in the zone beside the card (human
    # 2026-11-14: the exact same frame as the approved original, true
    # orientation, no mirror, just centred properly).
    CROP = (0, 110, 2915, 1640)   # 16:9

    def card_A():
        img = face_plate(a.rawA, 4.8667, CROP, shift=370).convert("RGBA")
        d = ImageDraw.Draw(img)
        X0, X1, PX = 34 * S, 512 * S, 28 * S; col = X1 - X0 - 2 * PX
        head, word = "PHYSICS HAS ITS OWN MIND", "CHAOS."
        fh = font(VAR, 30, 700); fits(d, head, fh, col, "A head")
        fw = big_font(d, word, col, top=120)
        art = scaled(board_art(C), col * 0.72)
        hb, wb = d.textbbox((0, 0), head, font=fh), d.textbbox((0, 0), word, font=fw)
        G1, G2, RULE, PY = 20 * S, 24 * S, 6 * S, 28 * S
        inner = (hb[3] - hb[1]) + G1 + art.size[1] + G2 + (wb[3] - wb[1]) + 16 * S + RULE
        Y0 = max(24 * S, (H * S - (inner + 2 * PY)) // 2 - 16 * S)
        panel(img, (X0, Y0, X1, Y0 + inner + 2 * PY), C["bg"], C["rule"]); d = ImageDraw.Draw(img)
        y = Y0 + PY
        d.text((X0 + PX - hb[0], y - hb[1]), head, font=fh, fill=C["muted"]); y += hb[3] - hb[1] + G1
        img.alpha_composite(art, (X0 + (X1 - X0 - art.size[0]) // 2, y)); y += art.size[1] + G2
        d.text((X0 + PX - wb[0], y - wb[1]), word, font=fw, fill=C["ink"]); y += wb[3] - wb[1] + 16 * S
        d.rectangle((X0 + PX, y, X0 + PX + round(d.textlength(word, font=fw) * 0.62), y + RULE), fill=C["accent"])
        outs.append(("thumb-A-chaos.png", img))

    def card_B():
        """The Scoreboard (human brief 2026-11-14): same off-white card, accent
        and big face as A; card on the left, two halves with one orange arrow
        between; no words beyond the numbers; rueful raised-brow face at 995.0 s
        (picked from the plate-geometry montage, probe/thumbs-r3/sheetB2.png),
        so it reads apart from A's smile."""
        img = face_plate(a.rawB, 995.000, CROP, shift=330).convert("RGBA")
        d = ImageDraw.Draw(img)
        X0, X1, PX = 34 * S, 512 * S, 28 * S; col = X1 - X0 - 2 * PX
        art = scaled(scoreboard_art(C), col)
        PY = 28 * S
        inner = art.size[1]
        Y0 = max(24 * S, (H * S - (inner + 2 * PY)) // 2 - 8 * S)
        panel(img, (X0, Y0, X1, Y0 + inner + 2 * PY), C["bg"], C["rule"]); d = ImageDraw.Draw(img)
        img.alpha_composite(art, (X0 + (X1 - X0 - art.size[0]) // 2, Y0 + PY))
        outs.append(("thumb-B-scoreboard.png", img))

    card_A(); card_B()
    for name, im in outs:
        fin = im.convert("RGB").resize((W, H), Image.LANCZOS)
        fin = fin.filter(ImageFilter.UnsharpMask(radius=0.8, percent=40, threshold=2))
        p = os.path.join(a.out, name); fin.save(p)
        fin.resize((640, 360), Image.LANCZOS).save(p.replace(".png", "-feed-360.png"))
        print(f"  {p}  {fin.size[0]}x{fin.size[1]}  (+ feed-360)")


main()
