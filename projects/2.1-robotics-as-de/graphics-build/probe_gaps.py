#!/usr/bin/env python3
"""Identify what is in each UNCOVERED / PAD flag from audit_cut.py: transcribe just those spots again,
independently, with a disfluency-keeping setup, so a cut decision is made on what was SAID there
(filler, repeat, real word the first pass dropped), never guessed.

Every flagged window (the speech run +-0.45s) is laid end to end with 1.2s of silence between, run
once through WhisperX large-v3 with a disfluent initial prompt (it then keeps "uh", "um" and repeats
instead of smoothing them away), and each word is mapped back to the flag whose window it fell in.

    python3 probe_gaps.py --audit ../transcript/audit-v1.json --audio a=... --audio b=... --out ../transcript/gaps.json
"""
import argparse, json, os, struct, subprocess, tempfile, wave

PAD, SIL = 0.45, 1.2
PROMPT = "Um, so, uh, the the data, I mean, uh, we, we have, like, um, so so this is, uh, it's it's the"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--audit", required=True); ap.add_argument("--audio", action="append", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    flags = [f for f in json.load(open(a.audit))["flags"] if f["kind"] in ("UNCOVERED", "PAD", "LONGWORD")]
    src = {}
    for spec in a.audio:
        sid, path = spec.split("=", 1); w = wave.open(path)
        src[sid] = (w.getframerate(), w.readframes(w.getnframes())); w.close()
    sr = src[flags[0]["session"]][0]
    out, idx, t = bytearray(), [], 0.0
    sil = b"\x00\x00" * int(SIL * sr)
    for i, f in enumerate(flags):
        r, data = src[f["session"]]
        a0, a1 = max(0, f["src"][0] - PAD), f["src"][1] + PAD
        chunk = data[int(a0 * r) * 2:int(a1 * r) * 2]
        idx.append((t, t + (a1 - a0), i, a0)); out += chunk + sil; t += (a1 - a0) + SIL
    tmp = tempfile.mkdtemp()
    wav = os.path.join(tmp, "gaps.wav")
    w = wave.open(wav, "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(bytes(out)); w.close()
    subprocess.run(["whisperx", wav, "--model", "large-v3", "--language", "en", "--initial_prompt", PROMPT,
                    "--align_model", "WAV2VEC2_ASR_LARGE_LV60K_960H", "--output_format", "json", "--output_dir", tmp],
                   check=True, capture_output=True)
    words = [x for x in json.load(open(os.path.join(tmp, "gaps.json")))["word_segments"] if "start" in x]
    for (t0, t1, i, a0) in idx:
        f = flags[i]
        inwin = [x for x in words if t0 - 0.05 <= x["start"] < t1]
        # words whose source time falls in the flagged speech run itself
        f["heard"] = " ".join(x["word"] for x in inwin)
        f["inRun"] = " ".join(x["word"] for x in inwin if f["src"][0] - 0.12 <= a0 + (x["start"] - t0) <= f["src"][1] + 0.05)
        # every heard word with its SOURCE time, so a stumble inside one long WhisperX span can be cut
        f["words"] = [[x["word"], round(a0 + x["start"] - t0, 3), round(a0 + x.get("end", x["start"]) - t0, 3)] for x in inwin]
    json.dump(flags, open(a.out, "w"), indent=1)
    for f in flags:
        print(f"{f['cut'][0]:7.2f} {f['kind']:9s} {f['session']} {f['src'][0]:7.2f} {f['dur']:.2f}s  run: [{f['inRun']}]   window: {f['heard']}")


main()
