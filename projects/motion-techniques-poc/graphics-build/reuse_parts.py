#!/usr/bin/env python3
"""Copy the reused parts' composition sources from the shipped job, unchanged.

Inputs are arguments (hard rule 12). Each part's composition length is checked against THIS job's
cut sheet; a mismatch fails unless the part is listed in --trim, where the composition's
data-duration is cut to the POC window (the timeline past it simply never renders).
"""
import argparse, json, os, re, shutil, sys

ap = argparse.ArgumentParser()
ap.add_argument("--from-parts", required=True)
ap.add_argument("--cutsheet", required=True)
ap.add_argument("--trim", default="")
a = ap.parse_args()
trim = set(filter(None, a.trim.split(",")))
FPS = 30
for p in json.load(open(a.cutsheet))["parts"]:
    if not p.get("reuse") or p.get("builtBy") == "push":
        continue
    src = os.path.join(a.from_parts, p["id"])
    if not os.path.exists(f"{src}/index.html"):
        sys.exit(f"{p['id']}: no source at {src}")
    dst = os.path.join("parts", p["id"])
    shutil.rmtree(dst, ignore_errors=True)
    shutil.copytree(src, dst)
    f = f"{dst}/index.html"; h = open(f).read()
    got = round(float(re.search(r'data-duration="([\d.]+)"', h).group(1)) * FPS)
    want = p["endFrame"] - p["startFrame"]
    if got != want:
        if p["id"] not in trim:
            sys.exit(f"{p['id']}: shipped composition {got}f, POC window {want}f, and it is not in --trim")
        h = re.sub(r'data-duration="[\d.]+"', f'data-duration="{(int(want / FPS * 1e6) / 1e6):.6f}"', h, count=1)
        open(f, "w").write(h)
        print(f"  {p['id']:5} copied, trimmed {got}f -> {want}f")
    else:
        print(f"  {p['id']:5} copied, {want}f")
