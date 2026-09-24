#!/usr/bin/env python3
"""Content gate for the COMPOSITE pass, as distinct from the cut.

verify_cut.py answers "is this the right footage in the right order" by comparing
the base cut against the raw camera. It cannot answer anything about the graphics
pass, because from about 13% to 86% of this video the picture is deliberately NOT
the camera: it is the screen recording, and every mark in that range would read as
misplaced.

So this gate asks the composite's own question instead: is each layer actually
present, in its own span?

  PLAIN    no part, outside the demo window  -> render must MATCH the base cut
  DEMO     inside the demo window, no card   -> render must MATCH demo-scene.mp4
                                                and must DIFFER from the base
  SEGMENT  a full-frame takeover             -> render must MATCH that part's render
                                                and must DIFFER from the base
  OVERLAY  a card                            -> render must DIFFER from what is under it

The "must DIFFER from the base" half is the one that matters, and it exists because
on 2026-09-09 a composite was pointed at a demo scene path that did not exist. The
layer was skipped silently, the raw talking head played for 19 minutes, and the file
still had exactly the right frame count, the right sample count, zero drift and a
size within 0.002% of correct. Nothing that counts could see it. Comparing each span
against the layer that is supposed to be there can.

Matching is a mean absolute pixel difference. A faithful re-encode of the same
picture lands near 0.1; genuinely different footage lands in the single digits.
"""
import argparse, json, os, subprocess, sys, tempfile
from PIL import Image, ImageChops, ImageStat

MATCH, DIFFER = 1.2, 2.0     # <=MATCH is the same picture, >=DIFFER is another one


def frame(src, t, out, w=480):
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-ss", f"{t:.3f}",
                    "-i", src, "-frames:v", "1", "-vf", f"scale={w}:-2", out],
                   check=True)
    return out


def diff(p, q):
    a, b = Image.open(p).convert("RGB"), Image.open(q).convert("RGB")
    if a.size != b.size:
        b = b.resize(a.size)
    return ImageStat.Stat(ImageChops.difference(a, b)).mean[0]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--render", required=True)
    ap.add_argument("--base", required=True)
    ap.add_argument("--cutsheet", required=True, help="graphics-build/cutsheet.json")
    ap.add_argument("--renders", required=True)
    ap.add_argument("--demo-scene", default="")
    ap.add_argument("--demo-spec", default="")
    ap.add_argument("--per-class", type=int, default=4)
    a = ap.parse_args()

    cs = json.load(open(a.cutsheet))
    parts = cs["parts"]
    total = cs["totalSeconds"]

    rf = int(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0",
                             "-show_entries", "stream=nb_frames", "-of",
                             "default=nw=1:nk=1", a.render],
                            capture_output=True, text=True).stdout.strip())
    want = round(total * cs["fps"])
    print(f"render frames {rf}  cutsheet {want}  "
          f"{'OK' if rf == want else 'MISMATCH'}\n")
    if rf != want:
        sys.exit("frame count disagrees with the cut sheet; stop here")

    D0 = D1 = None
    if a.demo_spec and os.path.exists(a.demo_spec):
        sp = json.load(open(a.demo_spec))["span"]
        D0, D1 = sp["start"], sp["end"]

    # Two different margins, deliberately. Deciding a time is COVERED is generous
    # (0.5s either side) so that "plain" really is plain. Deciding to TEST a card
    # is strict (1.0s inside), because the overlay's enable window is exact and the
    # card animates in: a sample at 1299.98 against a part starting at 1300.0 read
    # as "no card over the footage here" and was a false alarm, not a finding.
    def covering(t):
        return [p for p in parts if p["start"] - 0.5 <= t <= p["end"] + 0.5]

    def inside(t, p):
        return p["start"] + 1.0 <= t <= p["end"] - 1.0

    def in_demo(t):
        return D0 is not None and D0 <= t <= D1

    # build sample points per class, spread across the video
    cand = [round(total * i / 400.0, 2) for i in range(1, 400)]
    buckets = {"PLAIN": [], "DEMO": [], "SEGMENT": [], "OVERLAY": []}
    for t in cand:
        cov = covering(t)
        if not cov:
            buckets["DEMO" if in_demo(t) else "PLAIN"].append(t)
        elif any(p["class"] == "segment" and p["kind"] != "zoom" for p in cov):
            seg = [p for p in cov if p["class"] == "segment"][0]
            if inside(t, seg):
                buckets["SEGMENT"].append((t, seg))
        elif all(p["class"] == "overlay" for p in cov):
            if inside(t, cov[0]):
                buckets["OVERLAY"].append((t, cov[0]))

    def spread(xs, n):
        if len(xs) <= n:
            return xs
        step = len(xs) / n
        return [xs[int(i * step)] for i in range(n)]

    tmp = tempfile.mkdtemp()
    ok = True
    print(f"{'class':8} {'cut t':>8} {'layer':>10} {'vs layer':>9} {'vs base':>8}  verdict")

    for t in spread(buckets["PLAIN"], a.per_class):
        R = frame(a.render, t, f"{tmp}/r.png")
        B = frame(a.base, t, f"{tmp}/b.png")
        d = diff(R, B)
        good = d <= MATCH
        ok &= good
        print(f"{'PLAIN':8} {t:8.2f} {'base':>10} {d:9.3f} {d:8.3f}  "
              f"{'ok' if good else 'MISMATCH: the base footage is not what is on screen'}")

    for t in spread(buckets["DEMO"], a.per_class):
        R = frame(a.render, t, f"{tmp}/r.png")
        L = frame(a.demo_scene, t - D0, f"{tmp}/l.png")
        B = frame(a.base, t, f"{tmp}/b.png")
        dl, db = diff(R, L), diff(R, B)
        good = dl <= MATCH and db >= DIFFER
        ok &= good
        why = "ok" if good else ("MISSING: this is the base footage, the demo scene is absent"
                                 if db < DIFFER else "does not match demo-scene.mp4")
        print(f"{'DEMO':8} {t:8.2f} {'demo':>10} {dl:9.3f} {db:8.3f}  {why}")

    for t, p in spread(buckets["SEGMENT"], a.per_class):
        f = os.path.join(a.renders, f"{p['id']}.mp4")
        if not os.path.exists(f):
            continue
        R = frame(a.render, t, f"{tmp}/r.png")
        L = frame(f, t - p["start"], f"{tmp}/l.png")
        B = frame(a.base, t, f"{tmp}/b.png")
        dl, db = diff(R, L), diff(R, B)
        good = dl <= MATCH and db >= DIFFER
        ok &= good
        why = "ok" if good else ("MISSING: the takeover is absent" if db < DIFFER
                                 else f"does not match {p['id']}")
        print(f"{'SEGMENT':8} {t:8.2f} {p['id']:>10} {dl:9.3f} {db:8.3f}  {why}")

    for t, p in spread(buckets["OVERLAY"], a.per_class):
        R = frame(a.render, t, f"{tmp}/r.png")
        under = (frame(a.demo_scene, t - D0, f"{tmp}/u.png") if in_demo(t)
                 else frame(a.base, t, f"{tmp}/u.png"))
        d = diff(R, under)
        good = d >= 0.35          # a card covers ~15% of frame, so a smaller delta
        ok &= good
        print(f"{'OVERLAY':8} {t:8.2f} {p['id']:>10} {'-':>9} {d:8.3f}  "
              f"{'ok' if good else 'MISSING: no card over the footage here'}")

    print("\n" + ("PASS" if ok else "FAIL"))
    sys.exit(0 if ok else 1)


main()
