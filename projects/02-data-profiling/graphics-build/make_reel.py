#!/usr/bin/env python3.14
"""The graphics checkpoint's preview clips (CLAUDE.md hard rule 13; graphics skill).

Every part over its REAL footage window at 1080p, one second of context either side, each with a
small part-id + timestamp slate, with the cut's own audio so cue timing can be judged by ear.
ONE FILE PER PART in previews/clips/, named to sort in story order (`07-g06-1m40s.mp4`), plus
previews/clips/index.txt. Human decision 2026-10-17: a single long reel made it hard to rewatch one
graphic several times. --reel also writes the old back-to-back reel.
Also the single-part preview for iteration (hard rule 14):
    python3 make_reel.py --only g07          -> previews/clips/NN-g07-....mp4, about a minute

Footage per part:
  * face parts      outputs/base-cut.mov (g01 carries its push: 1.00 -> 1.04 from frame 1)
  * demo parts      demo_scene.py rendered for just that window (screen, punch-ins, face inset),
                    the same script and spec the full build uses
  * segments (g18)  the part's own opaque render replaces the footage for its window
Overlays come from previews/parts/<id>.mov (capture.mjs, 1080p alpha).

Every input is gated against the cutsheet: a part whose capture has the wrong frame count is
refused rather than composited (hard rule 12).

INCREMENTAL (CLAUDE.md hard rule 14, graphics skill "The checkpoint loop is incremental too").
On 01-robotics-as-de every feedback round re-captured and re-clipped all ~31 parts, 19.6-24.6 min,
when a round changed 2-5 of them. Now each artefact carries a key and is rebuilt only when it moves:
  * capture  previews/parts/<id>.mov.key = hash(every file in parts/<id>/, the part's frame range
             and class, capture.mjs). Stale captures run --jobs at a time (capture.mjs, 1080p alpha).
  * clip     previews/clips/.keys.json[<id>] = hash(the capture keys of EVERY part overlaid in the
             window, so a neighbour's change rebuilds this clip too; the footage window; the base,
             audio and screen identities; the demo spec and script for demo windows; the slate; this
             script).
Prints REUSED and REBUILT per round, lists the rebuilt clip files in previews/clips/changed.txt
(the round's review set), and ends with one timing line, also appended to previews/rounds.log:
    PREVIEW ROUND COMPLETE in 74s: captured 1 [g21], rebuilt 1 clip [g21], reused 30
previews/.round-done is deleted at the start and written at the end: wait on that file (or the PID),
never on `pgrep -f`, which matches the waiting shell's own command line and never exits.

    python3 make_reel.py                 the round: capture what changed, clip what changed
    python3 make_reel.py --capture-only  just the keyed captures (capture_all.sh)
    python3 make_reel.py --force         rebuild every capture and clip
"""
import argparse, hashlib, json, os, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor

FPS = 30
SLATE_FONT = "fonts/Satoshi-Bold.otf"
HERE = os.path.dirname(os.path.abspath(__file__))
CAPTURE_SCALE, CAPTURE_WORKERS = "0.5", "3"


def sha(*chunks):
    h = hashlib.sha1()
    for c in chunks:
        h.update(c if isinstance(c, bytes) else str(c).encode()); h.update(b"\0")
    return h.hexdigest()


def file_bytes(p):
    return open(p, "rb").read()


def ident(p):
    """identity of a big media file: path, size, mtime (hashing 7GB per round is the cost we avoid)"""
    st = os.stat(p)
    return f"{os.path.abspath(p)}:{st.st_size}:{st.st_mtime_ns}"


def tree_hash(d):
    """content hash of a part folder: every file, by bytes, so a rebuilt-but-identical file is not a change"""
    h = hashlib.sha1()
    for root, dirs, files in os.walk(d):
        dirs.sort()
        for f in sorted(files):
            if f.startswith("."): continue
            fp = os.path.join(root, f)
            h.update(os.path.relpath(fp, d).encode()); h.update(b"\0"); h.update(file_bytes(fp))
    return h.hexdigest()


def capture_key(q):
    return sha(tree_hash(f"parts/{q['id']}"), q["startFrame"], q["endFrame"], q.get("class"),
               CAPTURE_SCALE, file_bytes(os.path.join(HERE, "capture.mjs")))


def capture(q, key):
    """capture.mjs into a temp name, then rename and write the key: a failed capture never leaves a
    file that looks current"""
    out = f"previews/parts/{q['id']}.mov"; tmp = f"previews/parts/.{q['id']}.tmp.mov"
    t0 = time.time()
    r = subprocess.run(["node", os.path.join(HERE, "capture.mjs"), q["id"], tmp, CAPTURE_SCALE, CAPTURE_WORKERS],
                       capture_output=True, text=True)
    open(f"previews/.log/{q['id']}.log", "w").write(r.stdout + r.stderr)
    if r.returncode:
        return q["id"], False, f"capture failed:\n{(r.stdout + r.stderr)[-800:]}"
    os.replace(tmp, out); open(out + ".key", "w").write(key)
    return q["id"], True, f"{r.stdout.strip().splitlines()[-1]}  ({time.time() - t0:.0f}s wall)"


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        sys.exit(f"failed: {' '.join(cmd[:12])}\n{r.stderr[-1500:]}")
    return r.stdout


def frames(p):
    return int(run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=nb_frames",
                    "-of", "csv=p=0", p]).strip())


def mmss(t):
    return f"{int(t)//60}:{t%60:04.1f}"


def slate(path, text):
    from PIL import Image, ImageDraw, ImageFont
    im = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    f = ImageFont.truetype(SLATE_FONT, 26)
    w = d.textlength(text, font=f)
    d.rounded_rectangle([1880 - w - 28, 24, 1896, 70], radius=8, fill=(20, 17, 14, 200))
    d.text((1880 - w - 14, 32), text, font=f, fill=(247, 245, 241, 255))
    im.save(path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--plan", default="cutsheet.json")
    ap.add_argument("--spec", default="demo-spec.json")
    ap.add_argument("--base", default="../outputs/base-cut.mov")
    ap.add_argument("--audio", default="../outputs/base-audio.wav")
    ap.add_argument("--screen", default="../outputs/base-screen.mp4")
    ap.add_argument("--work", default=os.path.expanduser("~/Library/Caches/cutsheet/02-data-profiling/reel"))
    ap.add_argument("--out", default="previews/reel.mp4")
    ap.add_argument("--only", default="")
    ap.add_argument("--clips-dir", default="previews/clips")
    ap.add_argument("--reel", action="store_true", help="also concatenate every clip into --out")
    ap.add_argument("--jobs", type=int, default=2, help="captures at once (each runs CAPTURE_WORKERS pages)")
    ap.add_argument("--capture-only", action="store_true")
    ap.add_argument("--force", action="store_true", help="ignore every key: recapture and re-clip all")
    a = ap.parse_args()
    T0 = time.time()
    done_file = "previews/.round-done"
    if os.path.exists(done_file): os.remove(done_file)
    plan = json.load(open(a.plan)); spec = json.load(open(a.spec))
    nb = frames(a.base)
    if nb != round(plan["totalSeconds"] * FPS):
        sys.exit(f"{a.base} has {nb} frames, the plan {round(plan['totalSeconds'] * FPS)}: stale base or plan, refusing")
    os.makedirs(a.clips_dir, exist_ok=True); os.makedirs("previews/parts", exist_ok=True); os.makedirs("previews/.log", exist_ok=True)
    keys_path = os.path.join(a.clips_dir, ".keys.json")
    old_keys = {} if a.force or not os.path.exists(keys_path) else json.load(open(keys_path))
    # 02: the hook alternates (g01b) get their own clip and capture; an alternate never overlays its
    # rival (each candidate's clip shows only itself)
    ALTS = plan.get("alternates", []); ALL = plan["parts"] + ALTS
    rivals = {}
    for q in ALTS:
        rivals.setdefault(q["id"], set()).add(q["altOf"]); rivals.setdefault(q["altOf"], set()).add(q["id"])
    with_comp = {q["id"]: q for q in ALL if os.path.exists(f"parts/{q['id']}/index.html")}
    order = {q["id"]: i + 1 for i, q in enumerate(sorted(ALL, key=lambda q: (q["start"], q["id"])))}
    PUSHES = plan.get("pushes", [])
    index = []
    D0, D1 = plan["demo"]["start"], plan["demo"]["end"]          # 02: the plan's demo entry
    total = plan["totalSeconds"]
    os.makedirs(a.work, exist_ok=True)
    parts = [p for p in ALL if p.get("builtBy") != "push" and (not a.only or p["id"] in a.only.split(","))]
    footage = {"base": ident(a.base), "audio": ident(a.audio)}

    def window(p):
        s, e = p["start"], p["end"]
        in_demo = s >= D0 - 0.01 and e <= D1 + 0.01
        w0 = max(D0 if in_demo else 0.0, s - 1.0); w1 = min(D1 if in_demo else total, e + 1.0)
        if not in_demo:
            w0 = max(0.0, s - 1.0); w1 = min(total, e + 1.0)
            if w0 < D1 <= s: w0 = max(w0, D1)              # never pull demo footage into a face part
            if e <= D0 < w1: w1 = min(w1, D0)
        w0 = round(w0 * FPS) / FPS; w1 = round(w1 * FPS) / FPS     # the window on the frame grid too
        near = [q for q in ALL if q["start"] < w1 - 1e-3 and q["end"] > w0 + 1e-3 and q["id"] in with_comp
                and q["id"] not in rivals.get(p["id"], set()) and (q["id"] == p["id"] or "altOf" not in q)]
        return in_demo, w0, w1, near

    # 1. captures: every composition overlaid in any selected window (a --capture-only run: every one)
    need = {}
    for p in parts:
        for q in window(p)[3]: need[q["id"]] = q
    if a.capture_only:
        need = dict(with_comp) if not a.only else {k: v for k, v in with_comp.items() if k in a.only.split(",")}
    cap_keys = {pid: capture_key(q) for pid, q in need.items()}
    stale = [q for pid, q in need.items() if a.force or not os.path.exists(f"previews/parts/{pid}.mov")
             or not os.path.exists(f"previews/parts/{pid}.mov.key") or open(f"previews/parts/{pid}.mov.key").read() != cap_keys[pid]]
    captured = [q["id"] for q in stale]
    print(f"captures: {len(need) - len(stale)} reused, {len(stale)} to capture {captured}", flush=True)
    with ThreadPoolExecutor(max_workers=max(1, a.jobs)) as ex:
        bad = []
        for pid, ok, msg in ex.map(lambda q: capture(q, cap_keys[q["id"]]), stale):
            print(f"  REBUILT capture {msg}" if ok else f"  FAIL {pid}: {msg}", flush=True)
            if not ok: bad.append(pid)
    if bad:
        sys.exit(f"captures failed: {bad}")

    def finish(line):
        line = f"{line}  [{time.strftime('%Y-%m-%d %H:%M:%S')}]"
        print(line)
        open("previews/rounds.log", "a").write(line + "\n")
        open(done_file, "w").write(line + "\n")

    if a.capture_only:
        finish(f"CAPTURE ROUND COMPLETE in {time.time() - T0:.0f}s: captured {len(captured)} {captured}, reused {len(need) - len(captured)}")
        return

    # 2. clips
    me = file_bytes(os.path.abspath(__file__))
    demo_id = sha(file_bytes(a.spec), file_bytes(os.path.join(HERE, "demo_scene.py")), file_bytes("inset-mask.png"),
                  file_bytes("inset-border.png"), ident(a.screen)) if os.path.exists(a.screen) else None
    new_keys = dict(old_keys); rebuilt = []; reused = []
    clips = []
    for p in parts:
        pid, s, e = p["id"], p["start"], p["end"]
        in_demo, w0, w1, near = window(p)
        n = round((w1 - w0) * FPS)
        # every part whose span meets this window is overlaid, not only this one, so a hand-off
        # into or out of a neighbour reads as it will in the video (technical review 2026-10-17
        # flagged each abutting hand-off as a one-frame pop because the context second was bare)
        for q in near:
            ovq = f"previews/parts/{q['id']}.mov"
            # the capture's key was checked against its composition above; the count is checked here
            if frames(ovq) != q["endFrame"] - q["startFrame"]:
                sys.exit(f"{q['id']}: capture has {frames(ovq)} frames, cut sheet says {q['endFrame'] - q['startFrame']}")
        if in_demo and demo_id is None:
            sys.exit(f"{pid}: demo window but no screen cut at {a.screen}")
        slate_text = f"{pid}   {mmss(s)} - {mmss(e)}   {p['kind']}"
        name = f"{order[pid]:02d}-{pid}-{int(s)//60}m{int(s)%60:02d}s.mp4"
        index.append(f"{name}\t{pid}\t{mmss(s)}-{mmss(e)}\t{p['kind']}\t{p['direction'][:160]}")
        ckey = sha(me, f"{w0:.4f}:{w1:.4f}", n, footage["base"], footage["audio"], demo_id if in_demo else "-", slate_text,
                   *[f"{q['id']}:{q['startFrame']}:{q['endFrame']}:{cap_keys[q['id']]}" for q in near])
        work_clip = os.path.join(a.work, f"{pid}.mp4")
        if (old_keys.get(pid, {}).get("key") == ckey and old_keys[pid].get("name") == name
                and os.path.exists(os.path.join(a.clips_dir, name))):
            reused.append(pid); clips.append(os.path.join(a.clips_dir, name))
            continue
        t_clip = time.time()
        has_ov = any(q["id"] == pid for q in near)
        # footage
        foot = os.path.join(a.work, f"{pid}-foot.mp4")
        if in_demo:
            run(["python3.14", os.path.join(HERE, "demo_scene.py"), "--spec", a.spec, "--base", a.base, "--screen", a.screen,
                 "--mask", "inset-mask.png", "--border", "inset-border.png", "--start", f"{w0:.3f}", "--end", f"{w1:.3f}",
                 "--out", foot])
            src = ["-i", foot]; vtrim = "[0:v]setpts=PTS-STARTPTS,scale=1920:1080"
        else:
            # Trim on frame bounds: a 3-decimal timestamp lands after the frame it names (251.767 > 7553/30)
            # and the clip came out a frame short of its window (g11, g15; 2026-10-19, caught by the count
            # gate below).
            # And SEEK the input: trimming from frame 0 decoded the base up to the window, so a clip at
            # 8:00 took 58s and one at 0:00 took 2s. -copyts keeps the base's own timestamps through the
            # seek, and the trim bounds sit half a frame early so float jitter cannot move a frame.
            f0, f1 = round(w0 * FPS), round(w1 * FPS)
            fr = f"start={(f0 - 0.5) / FPS:.6f}:end={(f1 - 0.5) / FPS:.6f}"
            src = ["-copyts", "-ss", f"{max(0.0, w0 - 2.0):.3f}", "-i", a.base]
            vtrim = f"[0:v]trim={fr},setpts=PTS-STARTPTS,scale=1920:1080"
            # 02: a window inside a push (the hook) takes its footage from the push's own render
            # (renders/<push>.mp4, push.py), so the preview shows the real 1.00 -> 1.06 move
            pz = next((q for q in PUSHES if q["startFrame"] <= f0 and f1 <= q["endFrame"]
                       and os.path.exists(f"renders/{q['id']}.mp4")), None)
            if pz:
                src = ["-i", f"renders/{pz['id']}.mp4"]
                vtrim = f"[0:v]trim=start_frame={f0 - pz['startFrame']}:end_frame={f1 - pz['startFrame']},setpts=PTS-STARTPTS,scale=1920:1080"
        sl = os.path.join(a.work, f"{pid}-slate.png")
        slate(sl, slate_text)
        inputs = list(src)
        for q in near:
            inputs += ["-i", f"previews/parts/{q['id']}.mov"]
        k_sl = 1 + len(near); k_au = k_sl + 1
        inputs += ["-loop", "1", "-i", sl, "-i", a.audio]
        g = [vtrim + "[b]"]
        cur = "[b]"
        f0 = round(w0 * FPS)
        for j, q in enumerate(near):
            # frame-aligned offset from the cut sheet's integer frames (round 2: float offsets put a
            # bare frame between abutting parts)
            nq = q["endFrame"] - q["startFrame"]
            if q["startFrame"] < f0:
                # an overlay that began before this window is trimmed to it BY FRAME COUNT; shifting it
                # by a negative timestamp lost its last frame and showed a bare frame at hand-offs
                # (round 3, g19 -> g20)
                skip = f0 - q["startFrame"]
                g.append(f"[{1 + j}:v]trim=start_frame={skip},setpts=PTS-STARTPTS[o{j}]")
                o, nq = 0.0, nq - skip
            else:
                o = (q["startFrame"] - f0) / FPS
                g.append(f"[{1 + j}:v]setpts=PTS-STARTPTS+{o:.4f}/TB[o{j}]")
            g.append(f"{cur}[o{j}]overlay=0:0:eof_action=pass:enable='between(t,{o - 0.5 / FPS:.4f},{o + (nq - 0.5) / FPS:.4f})'[bo{j}]")
            cur = f"[bo{j}]"
        g.append(f"{cur}[{k_sl}:v]overlay=0:0:shortest=1[v]")
        g.append(f"[{k_au}:a]atrim=start={w0:.3f}:end={w1:.3f},asetpts=PTS-STARTPTS,afade=t=in:d=0.08,afade=t=out:st={w1-w0-0.12:.3f}:d=0.12[a]")
        clip = work_clip
        run(["ffmpeg", "-nostdin", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(g),
             "-map", "[v]", "-map", "[a]", "-frames:v", str(n), "-c:v", "h264_videotoolbox", "-b:v", "14M",
             "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-r", "30", clip])
        if frames(clip) != n:
            sys.exit(f"{pid}: clip has {frames(clip)} frames, window {n}")
        clips.append(os.path.join(a.clips_dir, name))
        for old_ in [f for f in os.listdir(a.clips_dir) if f.split("-")[1:2] == [pid]]:
            os.remove(os.path.join(a.clips_dir, old_))      # one current clip per part, never a stale twin
        run(["cp", clip, os.path.join(a.clips_dir, name)])
        new_keys[pid] = {"key": ckey, "name": name}
        json.dump(new_keys, open(keys_path, "w"), indent=1)  # after every clip: an interrupted round keeps its work
        rebuilt.append(pid)
        print(f"  REBUILT {pid:5s} {mmss(w0)}-{mmss(w1)}  {'demo' if in_demo else 'face'}{'  +overlay' if has_ov else ''}"
              f"  {time.time() - t_clip:.0f}s", flush=True)
    if reused:
        print(f"  REUSED  {len(reused)}: {' '.join(reused)}")
    json.dump(new_keys, open(keys_path, "w"), indent=1)
    if not a.only:
        open(os.path.join(a.clips_dir, "index.txt"), "w").write("file\tpart\ttime\tkind\twhat\n" + "\n".join(index) + "\n")
    # the round's review set: only these clips need a composition review (graphics skill, review budget)
    open(os.path.join(a.clips_dir, "changed.txt"), "w").write("".join(new_keys[q]["name"] + "\n" for q in rebuilt))
    print(f"wrote {len(rebuilt)} clips to {a.clips_dir}/ (changed.txt lists them)")
    if a.reel:
        lst = os.path.join(a.work, "concat.txt")
        open(lst, "w").write("".join(f"file '{c}'\n" for c in clips))
        run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", a.out])
        print(f"wrote {a.out}  ({len(clips)} parts)")
    finish(f"PREVIEW ROUND COMPLETE in {time.time() - T0:.0f}s: captured {len(captured)} {captured}, "
           f"rebuilt {len(rebuilt)} clips {rebuilt}, reused {len(reused)}")


main()
