#!/usr/bin/env python3
"""A YouTube Short (1080x1920) cut down from the long-form master (style.md: short form is cut from the
long-form base, never edited separately). Format: short-form-explainer, by the style's bands.

  layout per moment, from the graphics plan:
    card on screen      top band (y 260-944): the card, cropped from the master's left column
                        face band (y 980-1620): the face, from the base cut
    takeover on screen  top band: the whole full-screen scene, scaled; face band as above
    nothing on screen   the face fills the frame (a 9:16 crop of the base cut)
  captions burned in (style captions.shortForm): Satoshi Bold 64px, 3-5 words per card on phrase
  boundaries, $ink with an 8px $bg stroke, the key word in $accent, bottom anchored at y 1420;
  nothing readable outside y 200-1620. Fillers dropped (brand.md captionVoice).

  python3 make_short.py --master ../outputs/finished.mov --base ../outputs/base-cut.mov \\
      --transcript ../outputs/transcript-cut.json --plan cutsheet.json --brand ../../../brand.md \\
      --start 0 --end 71.5 --out ../outputs/01-robotics-as-de-short-1080x1920.mp4
"""
import argparse, json, os, re, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1920
TOP, FACE = (260, 944), (980, 1620)
CAP_BOTTOM, CAP_SIZE, CAP_STROKE = 1600, 64, 8   # style says 1420: on this framing that is the mouth (flagged to the human)
FILLER = re.compile(r"^(uh|um|uhm|erm|er|ah)[,.]?$", re.I)
KEY = {"robotics", "robots", "frontier"}


def hexrgb(h):
    h = h.lstrip("#"); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def main():
    ap = argparse.ArgumentParser()
    for k in ("master", "base", "transcript", "plan", "brand", "out"):
        ap.add_argument("--" + k, required=True)
    ap.add_argument("--start", type=float, required=True); ap.add_argument("--end", type=float, required=True)
    ap.add_argument("--fonts", default="fonts")
    a = ap.parse_args()
    S0, S1 = a.start, a.end
    if not 30 <= S1 - S0 <= 90:
        sys.exit(f"{S1 - S0:.1f}s is outside 30-90s")
    plan = json.load(open(a.plan))
    tr = json.load(open(a.transcript))
    nf = lambda f: int(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=nb_frames",
                                       "-of", "csv=p=0", f], capture_output=True, text=True).stdout.strip())
    if nf(a.master) != round(plan["totalSeconds"] * 30) or nf(a.base) != round(plan["totalSeconds"] * 30):
        sys.exit("master/base frame counts disagree with the plan: stale input")
    b = json.loads(re.search(r"```json\s*(\{[\s\S]*\})\s*```", open(a.brand).read()).group(1))
    C = {k: hexrgb(v) for k, v in b["colors"].items()}

    # windows (short-relative seconds) where a card or a takeover is on screen
    cards, takes = [], []
    for p in plan["parts"]:
        if p.get("builtBy") in ("push", "demo_scene") or p["end"] <= S0 or p["start"] >= S1:
            continue
        if p["kind"] == "takeover":
            takes.append((max(p["start"], S0) - S0, min(p["end"], S1) - S0)); continue
        # a card animates in and out inside its span: split the layout only while it is FULLY drawn,
        # measured on its render's alpha (QA 2026-10-18: an empty band for 3.5s before g03 entered,
        # a half-drawn card at its exit, the thesis card still building at the switch)
        rf = os.path.join(os.path.dirname(a.plan) or ".", "renders", f"{p['id']}.mov")
        raw = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", rf, "-vf", "scale=96:54,format=rgba,alphaextract",
                              "-f", "rawvideo", "-pix_fmt", "gray", "-"], capture_output=True).stdout
        # the card rows only (y < 540 of 1080): g01's lower third (y 548-660) must not set the bar
        n = 96 * 54; cov = [sum(1 for v in raw[i:i + 96 * 27] if v > 128) for i in range(0, len(raw) - n + 1, n)]
        full = [i for i, c in enumerate(cov) if c >= 0.92 * max(cov)]
        if not full:
            continue
        v0, v1 = p["start"] + full[0] / 30, p["start"] + (full[-1] + 1) / 30
        if v1 > S0 and v0 < S1:
            cards.append((max(v0, S0) - S0, min(v1, S1) - S0))
    def en(ws):
        return "+".join(f"between(t,{x:.3f},{y - 0.001:.3f})" for x, y in ws) or "0"
    graphic = cards + takes
    print("cards", [(round(x, 2), round(y, 2)) for x, y in cards], "takeovers", [(round(x, 2), round(y, 2)) for x, y in takes])

    # captions: 3-5 words, break at sentence/clause ends, <= 26 characters
    words = [x for x in tr["words"] if "start" in x and S0 <= x["start"] < S1 - 0.2 and not FILLER.match(x["word"].strip())]
    cues, cur = [], []
    for x in words:
        t = " ".join(y["word"] for y in cur + [x])
        if cur and (len(cur) >= 5 or len(t) > 26):
            cues.append(cur); cur = []
        cur.append(x)
        if x["word"].rstrip().endswith((".", "?", "!", ",")) and len(cur) >= 3:
            cues.append(cur); cur = []
    if cur: cues.append(cur)
    tmp = tempfile.mkdtemp()
    fcap = ImageFont.truetype(os.path.join(a.fonts, "Satoshi-Bold.otf"), CAP_SIZE)
    caps = []
    for k, c in enumerate(cues):
        t0 = c[0]["start"] - S0
        t1 = min((cues[k + 1][0]["start"] - S0) if k + 1 < len(cues) else S1 - S0, c[-1]["end"] - S0 + 0.6)
        im = Image.new("RGBA", (W, 160), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        toks = [y["word"].strip() for y in c]
        txt = " ".join(toks); txt = txt[0].upper() + txt[1:] if k == 0 or cues[k - 1][-1]["word"].rstrip().endswith((".", "?", "!")) else txt
        toks = txt.split(" ")
        tw = d.textlength(txt, font=fcap)
        if tw > W - 120:
            sys.exit(f"caption '{txt}' is {tw:.0f}px, wider than {W - 120}")
        x = (W - tw) / 2; y = 160 - 30 - CAP_SIZE
        for tok in toks:
            fill = C["accent"] if re.sub(r"[^a-z]", "", tok.lower()) in KEY else C["ink"]
            d.text((x, y), tok, font=fcap, fill=fill, stroke_width=CAP_STROKE, stroke_fill=C["bg"])
            x += d.textlength(tok + " ", font=fcap)
        f = os.path.join(tmp, f"c{k:03d}.png"); im.save(f)
        caps.append((f, t0, t1))
    print(f"{len(caps)} caption cards")

    D = S1 - S0
    bg = "0x%02X%02X%02X" % C["bg"]
    inputs = ["-ss", f"{S0:.3f}", "-t", f"{D:.3f}", "-i", a.master, "-ss", f"{S0:.3f}", "-t", f"{D:.3f}", "-i", a.base]
    for f, _, _ in caps:
        inputs += ["-i", f]
    g = [f"color=c={bg}:s={W}x{H}:r=30:d={D:.3f}[bg]",
         "[0:v]split=2[m1][m2]", "[1:v]split=2[f1][f2]",
         # the face filling the frame: a 9:16 crop of the base cut centred on the face. The nose sits at
         # x ~2416 of 3840 while he talks (measured on six full-face moments, 2026-10-18; the pre-roll
         # smile sat further left and centring on it cut the right side of the face)
         f"[f1]crop=1215:2160:1809:0,scale={W}:{H}:flags=lanczos[faceful]",
         # the face band: 1080x640 of the base cut, face and shoulders (no cards in the base)
         f"[f2]crop=3200:1896:640:80,scale={W}:{FACE[1] - FACE[0]}:flags=lanczos[faceband]",   # face high, shoulders below,
         # a card: the master's left column, fitted into the top band on paper
         f"[m1]crop=1500:1190:60:150,scale=-2:{TOP[1] - TOP[0]}:flags=lanczos[card]",
         # a takeover: the whole full-screen scene, scaled to the band's width
         f"[m2]scale={W}:-2:flags=lanczos[take]",
         f"[bg][faceful]overlay=0:0:enable='not({en(graphic)})'[v1]",
         f"[v1][faceband]overlay=0:{FACE[0]}:enable='{en(graphic)}'[v2]",
         f"[v2][card]overlay=(W-w)/2:{TOP[0]}:enable='{en(cards)}'[v3]",
         f"[v3][take]overlay=0:{TOP[0] + (TOP[1] - TOP[0] - 608) // 2}:enable='{en(takes)}'[v4]"]
    cur = "v4"
    for k, (f, t0, t1) in enumerate(caps):
        g.append(f"[{cur}][{2 + k}:v]overlay=0:{CAP_BOTTOM - 160 + 30}:enable='between(t,{t0:.3f},{t1:.3f})'[c{k}]"); cur = f"c{k}"
    g.append(f"[0:a]afade=t=in:st=0:d=0.05,afade=t=out:st={D - 0.45:.3f}:d=0.45[a]")
    gf = os.path.join(tmp, "graph.txt"); open(gf, "w").write(";".join(g))
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", *inputs, "-filter_complex_script", gf,
                    "-map", f"[{cur}]", "-map", "[a]", "-c:v", "h264_videotoolbox", "-b:v", "16M", "-profile:v", "high",
                    "-pix_fmt", "yuv420p", "-r", "30", "-c:a", "aac", "-b:a", "320k", "-ar", "48000",
                    "-frames:v", str(round(D * 30)), "-movflags", "+faststart", a.out], check=True)
    print(f"wrote {a.out}: {D:.2f}s, {nf(a.out)} frames, {W}x{H}")


main()
