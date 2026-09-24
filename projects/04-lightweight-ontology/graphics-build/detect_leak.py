#!/usr/bin/env python3
"""Find every span of the demo where the app sidebar's project list is on screen.

Human decision 2026-09-22: blur the sidebar's whole project and session list
wherever it is visible. The list sits in a different place depending on the app's
UI scale, which changed mid-recording (he enlarged it at A 25:24, a step the cut
removes), and during the full-screen terminal phase the same pixels hold terminal
output that must stay sharp. So the blur is driven by DETECTION, never by
timestamps read off a player (tech-video-editor: "Screen recordings leak").

Method: the nav block above the list ("New / Artifacts / Customize / More") is a
fixed piece of chrome. Each sampled frame's nav region is compared against a
reference crop at each scale; the closest layout under the threshold says the
sidebar is up and which box to blur. The references are cut from this footage
and saved beside this script (leak-ref-*.png) so the detection is reproducible.

Output (leak.json): per demo segment, spans in segment-local frames with the
layout, so splice_screen.py can blur in SOURCE space before any punch-in.
"""
import argparse, json, subprocess, sys
from PIL import Image, ImageChops, ImageStat

LAYOUTS = {   # source-pixel boxes on the 3840x2160 screen clip, measured 2026-09-22
    "small": {"nav": (0, 100, 300, 320), "list": (0, 360, 500, 790)},
    "large": {"nav": (0, 150, 560, 450), "list": (0, 510, 740, 1130)},
}
SAMPLE_EVERY = 15      # frames: two samples a second
MATCH_MAX = 6.0        # mean abs diff (0-255) on the downscaled nav; see calibration
PAD_FRAMES = 15        # blur reaches half a second past the last positive sample


def frame(src, t):
    raw = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-ss", f"{t:.4f}", "-i", src,
                          "-frames:v", "1", "-vf", "crop=740:1130:0:0,format=gray",
                          "-f", "rawvideo", "-"], capture_output=True).stdout
    if len(raw) != 740 * 1130:
        return None
    return Image.frombytes("L", (740, 1130), raw)


def score(img, ref, box):
    w, h = ref.size
    crop = img.crop(box).resize((w // 4, h // 4))
    return ImageStat.Stat(ImageChops.difference(crop, ref.resize((w // 4, h // 4)))).mean[0]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cutsheet", required=True)
    ap.add_argument("--refs", required=True, help="dir holding leak-ref-small.png, leak-ref-large.png")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    cs = json.load(open(a.cutsheet)); fps = cs["fps"]
    refs = {k: Image.open(f"{a.refs}/leak-ref-{k}.png").convert("L") for k in LAYOUTS}
    for k, r in refs.items():
        want = LAYOUTS[k]["nav"]
        if r.size != (want[2] - want[0], want[3] - want[1]):
            sys.exit(f"reference {k} is {r.size}, box says {want}")

    out, positives, samples, closest_neg = {"layouts": LAYOUTS, "matchMax": MATCH_MAX,
                                            "segments": {}}, 0, 0, 99.0
    for s in cs["segments"]:
        if s["section"] != "demo":
            continue
        n = s["endFrame"] - s["startFrame"]
        hits = []
        for i in list(range(0, n, SAMPLE_EVERY)) + [n - 1]:
            img = frame(s["screen"], (s["screenStartFrame"] + i) / fps)
            if img is None:
                sys.exit(f"{s['id']}: could not read screen frame {i}")
            best = min((score(img, refs[k], LAYOUTS[k]["nav"]), k) for k in LAYOUTS)
            samples += 1
            if best[0] <= MATCH_MAX:
                hits.append((i, best[1])); positives += 1
            else:
                closest_neg = min(closest_neg, best[0])
        spans = []
        for i, k in hits:
            if spans and spans[-1]["layout"] == k and i - spans[-1]["end"] <= SAMPLE_EVERY + 1:
                spans[-1]["end"] = i
            else:
                spans.append({"layout": k, "start": i, "end": i})
        for sp in spans:
            sp["start"] = max(0, sp["start"] - PAD_FRAMES)
            sp["end"] = min(n, sp["end"] + PAD_FRAMES)
        out["segments"][s["id"]] = spans
        cov = sum(sp["end"] - sp["start"] for sp in spans)
        print(f"  {s['id']} {s['session']} {n:6d}f  sidebar {100*cov/n:5.1f}%  "
              f"{' '.join(sp['layout'][0]+str(sp['start'])+'-'+str(sp['end']) for sp in spans)}",
              flush=True)
    json.dump(out, open(a.out, "w"), indent=1)
    print(f"\nsamples {samples}, sidebar present in {positives}; "
          f"closest non-match {closest_neg:.1f} (threshold {MATCH_MAX})")
    if closest_neg < MATCH_MAX * 1.5:
        sys.exit("a non-match sits too close to the threshold; the detector cannot "
                 "separate sidebar from not-sidebar reliably. Inspect before trusting it.")
    print(f"wrote {a.out}")


main()
