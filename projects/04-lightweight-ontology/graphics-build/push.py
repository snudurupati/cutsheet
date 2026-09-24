#!/usr/bin/env python3
"""Render the slow camera pushes (parts with builtBy == "push") from the base cut.

Human decision 2026-09-22: the recap (93s) and the spot-check stretch (42s) were
plain face; each gets a slow 1.00 -> 1.06 push (style.md: `push`, power1.inOut,
anchored on the eyes, done in FFmpeg geometry rather than a browser segment,
which would cost ~3% luma).

Anchored means the EYES stay put while the frame grows around them: for zoom z
the source crop origin is eye * (1 - 1/z), so the eye point maps to itself. The
eye point was measured on a recap frame (base-cut 1170s): eyes at x ~1880 and
~2160, y ~1100 in the 3840x2160 frame.

The slice is TRIMMED inside the filtergraph from the base cut and its frame
counter reset (graphics skill: seeking to a start point leaves zoompan's counter
wrong and the ramp comes out constant). Output is capped at the part's exact
frame count and verified.
"""
import argparse, hashlib, json, math, os, subprocess, sys

EYE = (2020, 1100)
Z1 = 0.06


def probe_frames(p):
    return int(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                               "stream=nb_frames", "-of", "csv=p=0", p], capture_output=True, text=True).stdout)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cutsheet", required=True)
    ap.add_argument("--base", required=True)
    ap.add_argument("--renders", required=True)
    ap.add_argument("--only", default="")
    a = ap.parse_args()
    cs = json.load(open(a.cutsheet))
    parts = [p for p in cs["parts"] if p.get("builtBy") == "push"
             and (not a.only or p["id"] in a.only.split(","))]
    if not parts:
        sys.exit("no push parts in the cutsheet")
    base_frames = probe_frames(a.base)
    for p in parts:
        sf, ef = p["startFrame"], p["endFrame"]
        n = ef - sf
        if ef > base_frames:
            sys.exit(f"{p['id']}: ends at frame {ef}, base has {base_frames}")
        # power1.inOut in [0,1] over the output frame counter `on`
        e = f"((1-cos(PI*on/{n - 1}))/2)"
        z = f"(1+{Z1}*{e})"
        ex, ey = EYE
        vf = (f"trim=start_frame={sf}:end_frame={ef},setpts=PTS-STARTPTS,"
              f"zoompan=z='{z}':x='{ex}*(1-1/({z}))':y='{ey}*(1-1/({z}))':d=1:s=3840x2160:fps=30")
        out = f"{a.renders}/{p['id']}.mp4"
        # skip when the key of everything this push depends on is unchanged and the
        # output is whole: the pushes re-encoded on every rebuild (~1.5 min) though
        # nothing they read had moved (2026-09-23)
        st = os.stat(a.base)
        key = json.dumps({"sf": sf, "ef": ef, "z1": Z1, "eye": EYE, "vf": vf,
                          "base": [st.st_size, int(st.st_mtime)],
                          "script": hashlib.sha1(open(__file__, "rb").read()).hexdigest()}, sort_keys=True)
        kf = out + ".key"
        if os.path.exists(out) and os.path.exists(kf) and open(kf).read() == key and probe_frames(out) == n:
            print(f"  {p['id']}  up to date, skipping")
            continue
        subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", a.base, "-vf", vf, "-an",
                        "-frames:v", str(n), "-c:v", "hevc_videotoolbox", "-b:v", "60M", "-tag:v", "hvc1",
                        "-pix_fmt", "yuv420p", "-r", "30", out], check=True)
        got = probe_frames(out)
        if got != n:
            sys.exit(f"{p['id']}: wanted {n} frames, got {got}")
        open(kf, "w").write(key)
        print(f"  {p['id']}  {n} frames  push 1.00->{1 + Z1:.2f} on the eyes {EYE}")


if __name__ == "__main__":
    main()
