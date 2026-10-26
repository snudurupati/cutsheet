#!/usr/bin/env python3
"""The composite pass: base cut -> demo scene -> segments (pushes, takeovers) -> overlay cards.
No face mattes on this job: every card sits on the clear wall left of the face (zone-checked).

FULL mode composites the whole cut in one pass, HEVC with a keyframe forced at EVERY layer boundary
and no B-frames, so each boundary is a clean, closed cut point. It writes <out>.json, a manifest
of every layer's identity (file size, mtime, frame count, frame range).

INCREMENTAL mode (rule 14, graphics skill "Rebuild time"): with a previous pass and its manifest,
only the layers whose identity changed are re-composited, over their frame windows (snapped out to
the boundary set), and spliced into the previous pass by STREAM COPY. The untouched ranges are
verified by packet md5 against the previous pass, and the output by frame count. A changed base,
cut length or boundary set falls back to FULL. Audio rides through from the base, untouched.

Gotchas carried from 04/05 (each shipped a broken video silently once):
  * overlays aligned with trim/setpts, NEVER input -ss; eof_action=pass on every overlay;
  * layers placed and enabled on FRAME NUMBERS from the cutsheet, never seconds;
  * a missing demo scene or render is fatal (a valid-length video with the demo missing);
  * a render shorter than its part, or older than its composition, is fatal.

    python3 assemble.py --cutsheet cutsheet.json --base ../outputs/base-cut.mov --renders renders \\
        --demo-scene ../outputs/demo-scene.mp4 --demo-spec demo-spec.json --demo-scene-json demo-scene.json \\
        --out ../outputs/graphics-pass.mov [--full]
Prints the windows it re-composited (cut seconds) on the last line as WINDOWS lo:hi,... for the gates.
"""
import argparse, json, os, shutil, subprocess, sys, tempfile

FPS = 30
ENC = ["-c:v", "hevc_videotoolbox", "-b:v", "60M", "-tag:v", "hvc1", "-bf", "0", "-pix_fmt", "yuv420p",
       "-fps_mode", "cfr", "-r", str(FPS)]


def sh(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode:
        sys.exit(f"failed: {' '.join(cmd[:14])}\n{r.stderr[-2000:]}")
    return r.stdout


def nframes(f):
    return int(sh(["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries",
                   "stream=nb_read_packets", "-of", "csv=p=0", f]).strip())


def ident(f):
    st = os.stat(f)
    return [st.st_size, st.st_mtime_ns]


def layers_of(a, cs):
    """[(id, file, sf, ef)] in compositing order: demo scene, then the parts in plan order."""
    L = []
    if a.demo_scene:
        if not os.path.exists(a.demo_scene):
            sys.exit(f"--demo-scene {a.demo_scene} does not exist: the result would be a valid-length video "
                     "with the entire demo missing")
        spec = json.load(open(a.demo_spec)); dj = json.load(open(a.demo_scene_json))
        S, E = spec["span"]["start"], spec["span"]["end"]
        if abs(S - dj["enters"]["cutSeconds"]) > 0.01 or abs(E - dj["leaves"]["cutSeconds"]) > 0.01:
            sys.exit(f"demo-spec span {S}-{E} disagrees with demo-scene.json")
        SF, EF = dj["enters"]["frame"], dj["leaves"]["frame"]
        if nframes(a.demo_scene) != EF - SF:
            sys.exit(f"demo scene has {nframes(a.demo_scene)} frames, its span {EF - SF}")
        L.append(("demo", a.demo_scene, SF, EF))
    for p in cs["parts"]:
        built = p.get("builtBy")
        if built is None:
            sys.exit(f"{p['id']}: no builtBy in the cutsheet")
        if built == "demo_scene":
            continue                                   # a punch-in inside the demo scene
        f = os.path.join(a.renders, f"{p['id']}.mp4" if p["class"] == "segment" else f"{p['id']}.mov")
        if not os.path.exists(f):
            sys.exit(f"missing render for {p['id']} ({built}): {f}")
        comp = os.path.join(os.path.dirname(a.renders.rstrip("/")), "parts", p["id"], "index.html")
        if built != "push" and os.path.exists(comp) and os.path.getmtime(f) < os.path.getmtime(comp):
            sys.exit(f"{p['id']}: render is OLDER than its composition; re-render before compositing")
        sf, ef = p["startFrame"], p["endFrame"]
        if nframes(f) != ef - sf:
            sys.exit(f"{p['id']}: render has {nframes(f)} frames, the part spans {ef - sf}")
        L.append((p["id"], f, sf, ef))
    return L


def graph(L, base, lo, hi):
    """ffmpeg inputs + filtergraph compositing frames [lo, hi) of the cut."""
    inputs, chain, cur, n = ["-i", base], [f"[0:v]trim=start_frame={lo}:end_frame={hi},setpts=PTS-STARTPTS[b]"], "b", 1
    for lid, f, sf, ef in L:
        a0, a1 = max(lo, sf), min(hi, ef)
        if a0 >= a1:
            continue
        inputs += ["-i", f]
        chain.append(f"[{n}:v]trim=start_frame={a0 - sf}:end_frame={a1 - sf},setpts=PTS-STARTPTS+{a0 - lo}/({FPS}*TB)[l{n}]")
        chain.append(f"[{cur}][l{n}]overlay=0:0:eof_action=pass:enable='between(n,{a0 - lo},{a1 - lo - 1})'[v{n}]")
        cur = f"v{n}"; n += 1
    return inputs, ";".join(chain), cur


def bounds(L, total):
    return sorted({0, total} | {x for _, _, sf, ef in L for x in (sf, ef) if 0 < x < total})


def encode(inputs, fc, cur, nfr, kf_frames, out):
    kf = ",".join(f"{x / FPS:.6f}" for x in kf_frames) or "0"
    sh(["ffmpeg", "-nostdin", "-y", "-v", "error", *inputs, "-filter_complex", fc, "-map", f"[{cur}]", "-an",
        *ENC, "-force_key_frames", kf, "-frames:v", str(nfr), out])


def split(src, at_frames, outdir, tag):
    """Split src at frame boundaries (all keyframes) into stream-copied pieces; return [(lo, hi, file)]."""
    if not at_frames:
        return None
    pattern = os.path.join(outdir, f"{tag}%04d.mov")
    sh(["ffmpeg", "-nostdin", "-y", "-v", "error", "-i", src, "-map", "0:v", "-c", "copy", "-f", "segment",
        "-segment_frames", ",".join(map(str, at_frames)), "-reset_timestamps", "1", pattern])
    edges = [0] + at_frames
    files = sorted(f for f in os.listdir(outdir) if f.startswith(tag))
    return [(edges[i], None, os.path.join(outdir, f)) for i, f in enumerate(files)]


def pkt_md5(f):
    return sh(["ffmpeg", "-nostdin", "-v", "error", "-i", f, "-map", "0:v", "-c", "copy", "-f", "md5", "-"]).strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cutsheet", required=True); ap.add_argument("--base", required=True)
    ap.add_argument("--renders", required=True); ap.add_argument("--demo-scene", default="")
    ap.add_argument("--demo-spec", default=""); ap.add_argument("--demo-scene-json", default="")
    ap.add_argument("--out", required=True); ap.add_argument("--full", action="store_true")
    a = ap.parse_args()
    cs = json.load(open(a.cutsheet))
    total = round(cs["totalSeconds"] * FPS)
    if nframes(a.base) != total:
        sys.exit(f"base has {nframes(a.base)} frames, the plan {total}: stale base or plan")
    L = layers_of(a, cs)
    B = bounds(L, total)
    man = {"total": total, "base": ident(a.base), "bounds": B,
           "layers": {lid: {"f": os.path.basename(f), "id": ident(f), "sf": sf, "ef": ef} for lid, f, sf, ef in L}}
    mf = a.out + ".json"
    prev = json.load(open(mf)) if os.path.exists(mf) and os.path.exists(a.out) else None
    tmp = tempfile.mkdtemp(prefix="assemble-", dir=os.path.dirname(os.path.abspath(a.out)))
    try:
        full = a.full or prev is None or prev["total"] != total or prev["base"] != man["base"] or prev["bounds"] != B
        if not full:
            changed = [k for k in set(man["layers"]) | set(prev["layers"]) if man["layers"].get(k) != prev["layers"].get(k)]
            if not changed:
                print("graphics pass up to date: no layer changed\nWINDOWS -"); return
            W = []
            for k in changed:
                for m in (man["layers"].get(k), prev["layers"].get(k)):
                    if m:
                        lo = max(b for b in B if b <= m["sf"]); hi = min(b for b in B if b >= m["ef"])
                        W.append([lo, hi])
            W.sort(); merged = []
            for lo, hi in W:
                if merged and lo <= merged[-1][1]: merged[-1][1] = max(merged[-1][1], hi)
                else: merged.append([lo, hi])
            print(f"incremental: {len(changed)} changed layer(s) {sorted(changed)}; re-compositing "
                  + ", ".join(f"{lo / FPS:.2f}-{hi / FPS:.2f}s" for lo, hi in merged), flush=True)
            cuts = sorted({x for w in merged for x in w if 0 < x < total})
            old = split(a.out, cuts, tmp, "old")
            edges = [0] + cuts + [total]
            pieces = []
            for i in range(len(edges) - 1):
                lo, hi = edges[i], edges[i + 1]
                if any(w[0] <= lo and hi <= w[1] for w in merged):
                    nf = os.path.join(tmp, f"new{i:04d}.mov")
                    inputs, fc, cur = graph(L, a.base, lo, hi)
                    encode(inputs, fc, cur, hi - lo, [b - lo for b in B if lo <= b < hi], nf)
                    pieces.append((lo, hi, nf, False))
                else:
                    pieces.append((lo, hi, old[i][2], True))
            lst = os.path.join(tmp, "list.txt")
            open(lst, "w").write("".join(f"file '{p[2]}'\n" for p in pieces))
            vid = os.path.join(tmp, "video.mov")
            sh(["ffmpeg", "-nostdin", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", vid])
            # the untouched ranges must be the previous pass's packets, bit for bit
            check = split(vid, cuts, tmp, "chk")
            for (lo, hi, f, kept), (_, _, cf) in zip(pieces, check):
                if kept and pkt_md5(f) != pkt_md5(cf):
                    sys.exit(f"splice check FAILED: untouched frames {lo}-{hi} changed")
            kept_n = sum(hi - lo for lo, hi, _, k in pieces if k)
            print(f"splice verified: {kept_n} untouched frames packet-identical to the previous pass")
        else:
            print(f"full composite of {len(L)} layers, {len(B) - 2} forced keyframe boundaries", flush=True)
            vid = os.path.join(tmp, "video.mov")
            inputs, fc, cur = graph(L, a.base, 0, total)
            encode(inputs, fc, cur, total, B[:-1], vid)
            merged = [[0, total]]
        out_tmp = a.out + ".tmp.mov"
        sh(["ffmpeg", "-nostdin", "-y", "-v", "error", "-i", vid, "-i", a.base, "-map", "0:v", "-map", "1:a:0",
            "-c:v", "copy", "-c:a", "pcm_s24le", "-map_chapters", "-1", "-frames:v", str(total), out_tmp])
        if nframes(out_tmp) != total:
            sys.exit(f"graphics pass has {nframes(out_tmp)} frames, want {total}")
        os.replace(out_tmp, a.out)
        json.dump(man, open(mf, "w"), indent=1)
        print(f"wrote {a.out}: {total} frames")
        print("WINDOWS " + ",".join(f"{lo / FPS:.3f}:{hi / FPS:.3f}" for lo, hi in merged))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


main()
