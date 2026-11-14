#!/usr/bin/env python3
"""The base-cut gate, half 3: the evidence a judging agent rules on (CLAUDE.md hard rule 15).

For every audit flag, every failing join and every re-listen REPEAT: the window +-1.5s of the
render, with what the INDEPENDENT re-listen heard there, what the cut transcript says, a 10ms
energy trace (# voiced, + sound, . silence; | marks the join) and a spectrogram PNG of the window.
The judge rules from the re-listen, the energy and the spectrogram. The cut transcript is shown
only so a disagreement with it is visible; it is never evidence that a spot is clean.

    python3 judge_pack.py --audio ../outputs/base-audio.wav --cutsheet ../transcript/cutsheet.json \
        --audit ../transcript/audit-v4.json --relisten ../transcript/relisten-cut-v4.json \
        --relisten-words ../transcript/relisten-cut-v4-whisperx.json --transcript-cut ../outputs/transcript-cut.json \
        --out ../transcript/judge-pack.json --png-dir <cache dir>
"""
import argparse, json, math, os, struct, subprocess, sys, wave

W = 1.5


def main():
    ap = argparse.ArgumentParser()
    for k in ("audio", "cutsheet", "audit", "relisten", "relisten-words", "transcript-cut", "out", "png-dir"):
        ap.add_argument("--" + k, required=True)
    a = ap.parse_args()
    cs = json.load(open(a.cutsheet))
    mono = os.path.join(a.png_dir, "render-16k.wav"); os.makedirs(a.png_dir, exist_ok=True)
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", a.audio, "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", mono], check=True)
    w = wave.open(mono); sr = w.getframerate(); n = w.getnframes()
    if abs(n / sr - cs["totalFrames"] / cs["fps"]) > 0.05:
        sys.exit("audio does not match the cutsheet: stale render, refusing")
    samp = struct.unpack(f"<{n}h", w.readframes(n)); w.close()
    hop = sr // 100
    db = [10 * math.log10(sum(x * x for x in samp[i:i + hop]) / hop / 32768 ** 2 + 1e-12) for i in range(0, n - hop, hop)]
    floor = sorted(db)[len(db) // 10]
    au = json.load(open(a.audit)); rl = json.load(open(a.relisten))
    heard = [x for x in json.load(open(a.relisten_words))["word_segments"] if "start" in x]
    cutw = json.load(open(a.transcript_cut))["words"]
    items = []
    for f in au["flags"]:
        items.append({"source": "audit", "kind": f["kind"], "t": f["cut"][0], "detail": {k: v for k, v in f.items() if k not in ("cut",)}})
    for f in rl:
        if f["kind"] == "REPEAT":
            items.append({"source": "relisten", "kind": "REPEAT", "t": f["cut"], "detail": f})
    items.sort(key=lambda x: x["t"])
    joins = [j["cut"] for j in au["joins"]]
    os.makedirs(a.png_dir, exist_ok=True)
    for i, it in enumerate(items, 1):
        t0, t1 = max(0, it["t"] - W), it["t"] + W
        it["id"] = f"J{i:03d}"
        it["window"] = [round(t0, 2), round(t1, 2)]
        it["heardIndependently"] = " ".join(f"{x['word']}@{x['start']:.2f}" for x in heard if t0 <= x["start"] < t1)
        it["cutTranscript"] = " ".join(f"{x['word']}@{x['start']:.2f}" for x in cutw if t0 <= x["start"] < t1)
        js = [j for j in joins if t0 <= j < t1]
        it["joinsInWindow"] = js
        tr = ""
        for k in range(int(t0 * 100), int(t1 * 100)):
            if any(abs(k / 100 - j) < 0.005 for j in js): tr += "|"
            v = db[k] if k < len(db) else floor
            tr += "#" if v > floor + 28 else ("+" if v > floor + 20 else ".")
        it["energy"] = tr
        png = os.path.join(a.png_dir, f"{it['id']}.png")
        subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-ss", f"{t0:.3f}", "-t", f"{t1 - t0:.3f}", "-i", a.audio,
                        "-lavfi", "showspectrumpic=s=900x300:legend=1:fscale=log", png], check=True)
        it["spectrogram"] = png
    json.dump(items, open(a.out, "w"), indent=1)
    print(f"{len(items)} items -> {a.out}, spectrograms in {a.png_dir}")


main()
