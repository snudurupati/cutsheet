#!/usr/bin/env python3
"""The base-cut gate, half 1: an acoustic audit whose evidence is the AUDIO, not the transcript
(CLAUDE.md hard rule 15; rough-cut skill, "The base-cut gate").

WhisperX drops repeated words and false starts ("and not, not as much" -> "and not as much"), so
every check built on its words is blind to exactly the stutters a cut leaves behind. This reads the
source voice track for every kept span and flags:

  UNCOVERED  a run of speech energy >= MIN_RUN inside a kept span that no transcribed word covers:
             an untranscribed stutter, false start or retake tail
  PAD        speech energy inside a segment's head or tail pad, beyond its first/last word: the pad
             has caught part of another word
  LONGWORD   a word longer than LONG_WORD seconds (stumbles merge into one span)
  PAUSE      the silence actually rendered at a join versus what the join needs: a sentence end
             wants SENTENCE_PAUSE, mid-sentence wants at least MIN_PAUSE

Speech = 10ms RMS more than SPEECH_DB above the room-tone floor (the 10th percentile of each
session's frame energies, so breaths and room tone are not speech).

    python3 audit_cut.py --cutsheet ../transcript/cutsheet.json --transcript ../transcript/transcript.json \
        --audio a=../transcript/voice-a-16k.wav --audio b=../transcript/voice-b-16k.wav --out audit.json
Exits 1 if anything is flagged. Writes a readable report beside the JSON.
"""
import argparse, json, math, re, struct, sys, wave

HOP = 0.01
SPEECH_DB = 20.0
VOICE_DB = 28.0            # a pause runs to the next VOICED speech: a breath intake is part of a pause
MIN_RUN = 0.12
GAP_MIN = 0.25
LONG_WORD = 1.0
SENTENCE_PAUSE = (0.6, 1.0)
MIN_PAUSE = 0.10


def rms_track(path):
    w = wave.open(path); sr = w.getframerate(); n = w.getnframes()
    raw = w.readframes(n); w.close()
    samples = struct.unpack(f"<{n}h", raw)
    hop = int(sr * HOP); out = []
    for i in range(0, n - hop, hop):
        seg = samples[i:i + hop]
        e = sum(x * x for x in seg) / hop
        out.append(10 * math.log10(e / (32768.0 ** 2) + 1e-12))
    return out


def runs(mask, t0):
    out, start = [], None
    for i, m in enumerate(mask):
        if m and start is None: start = i
        if not m and start is not None: out.append((t0 + start * HOP, t0 + i * HOP)); start = None
    if start is not None: out.append((t0 + start * HOP, t0 + len(mask) * HOP))
    return out


def mmss(t):
    return f"{int(t)//60}:{t%60:04.1f}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cutsheet", required=True); ap.add_argument("--transcript", required=True)
    ap.add_argument("--audio", action="append", required=True, help="session=wav")
    ap.add_argument("--out", required=True)
    ap.add_argument("--gaps", default="", help="probe_gaps.py output: gaps whose re-listen heard no words are breaths, cleared")
    a = ap.parse_args()
    cleared = []
    if a.gaps:
        cleared = [(g["session"], g["src"][0], g["src"][1]) for g in json.load(open(a.gaps)) if not g.get("inRun", "").strip()]
    cs = json.load(open(a.cutsheet)); fps = cs["fps"]
    # the builder's refined words (long spans split, dropped words put back) when it wrote them
    words = cs.get("words") or [w for w in json.load(open(a.transcript))["word_segments"] if "start" in w and "end" in w]
    tracks, floors = {}, {}
    for spec in a.audio:
        sid, path = spec.split("=", 1)
        tr = rms_track(path); tracks[sid] = tr
        floors[sid] = sorted(tr)[len(tr) // 10]
    speech = lambda sid, t0, t1: [x > floors[sid] + SPEECH_DB for x in tracks[sid][int(t0 / HOP):int(t1 / HOP)]]
    flags, joins = [], []
    acc = 0
    segs = [s for s in cs["segments"] if s.get("keep", True)]
    for i, s in enumerate(segs):
        sid, s0, s1 = s["session"], s["startFrame"] / fps, s["endFrame"] / fps
        cut0 = acc / fps; acc += s["outFrames"]
        to_cut = lambda t: cut0 + (t - s0)
        ws = sorted((w for w in words if w["session"] == sid and w["end"] > s0 and w["start"] < s1), key=lambda w: w["start"])
        # UNCOVERED: speech inside a GAP between consecutive transcribed words (>= GAP_MIN), and
        # PAD: speech inside the head pad before the first word or the tail pad after the last. In
        # fluent speech words sit back to back, so energy between them is coarticulation, not a word;
        # a dropped word or false start shows up as a run of speech in a real gap.
        mask = speech(sid, s0, s1)
        edges = [(s0, ws[0]["start"], "PAD")] if ws else []
        edges += [(p["end"], q["start"], "UNCOVERED") for p, q in zip(ws, ws[1:]) if q["start"] - p["end"] >= GAP_MIN]
        if ws: edges.append((ws[-1]["end"], s1, "PAD"))
        if s.get("muteFrom"):                       # the end-card hold is muted past the last word
            edges = [(g0, min(g1, s["muteFrom"]), k) for g0, g1, k in edges]
        for m0, m1 in s.get("muteRanges", []):         # a judged muted pause is silence, not speech
            edges = [(max(g0, m1) if g0 < m1 and g1 > m1 and g0 >= m0 - 0.1 else g0, g1, k) for g0, g1, k in edges]
        for g0, g1, kind in edges:
            lo, hi = max(s0, g0 + 0.05), min(s1, g1 - 0.05)
            if hi - lo < MIN_RUN: continue
            for r0, r1 in runs(speech(sid, lo, hi), lo):
                if r1 - r0 < MIN_RUN: continue
                near = " ".join(w["word"] for w in ws if abs(w["start"] - r0) < 1.5)
                if any(c[0] == sid and c[1] - 0.15 <= r0 and r1 <= c[2] + 0.15 for c in cleared):
                    continue                                       # re-listened: a breath, no words
                flags.append({"kind": kind, "seg": s["id"], "session": sid, "src": [round(r0, 2), round(r1, 2)],
                              "cut": [round(to_cut(r0), 2), round(to_cut(r1), 2)], "dur": round(r1 - r0, 2), "context": near})
        for w in ws:
            if w["end"] - w["start"] > LONG_WORD:
                flags.append({"kind": "LONGWORD", "seg": s["id"], "session": sid, "word": w["word"],
                              "src": [w["start"], w["end"]], "cut": [round(to_cut(w["start"]), 2), round(to_cut(w["end"]), 2)],
                              "dur": round(w["end"] - w["start"], 2)})
        # trailing / leading silence measured on the audio for the join after this segment
        mask = [x > floors[sid] + VOICE_DB for x in tracks[sid][int(s0 / HOP):int(s1 / HOP)]]
        for m0, m1 in s.get("muteRanges", []):         # muted in the render: silence
            for k in range(max(0, int((m0 - s0) / HOP)), min(len(mask), int((m1 - s0) / HOP) + 1)): mask[k] = False
        # a voiced blip under 40ms (a consonant release, a lip click in a breath) is not speech
        for r0, r1 in runs(mask, 0.0):
            if r1 - r0 < 0.04 - 1e-9:
                for k in range(round(r0 / HOP), round(r1 / HOP)): mask[k] = False
        tail_sil = 0.0
        for x in reversed(mask):
            if x: break
            tail_sil += HOP
        s["_tail"] = tail_sil
        lead = 0.0
        for x in mask:
            if x: break
            lead += HOP
        s["_lead"] = lead
        s["_lastword"] = ws[-1]["word"] if ws else ""
        # the silence the SPEAKER left at this point in the source, after the last kept word and before
        # the first: a mid-sentence join in fluent speech had none, and a tight join there is natural
        full = tracks[sid]; voiced = lambda t: 0 <= int(t / HOP) < len(full) and full[int(t / HOP)] > floors[sid] + VOICE_DB
        nat_after = 0.0
        if ws:
            t = ws[-1]["end"]
            while voiced(t) and t < ws[-1]["end"] + 0.5: t += HOP
            while not voiced(t) and nat_after < 2.0: t += HOP; nat_after += HOP
        nat_before = 0.0
        if ws:
            t = ws[0]["start"]
            while voiced(t) and t > ws[0]["start"] - 0.3: t -= HOP
            while not voiced(t) and nat_before < 2.0: t -= HOP; nat_before += HOP
        s["_natAfter"], s["_natBefore"] = nat_after, nat_before
        s["_cutEnd"] = acc / fps
    for x, y in zip(segs, segs[1:]):
        pause = round(x["_tail"] + y["_lead"], 2)
        sentence = bool(re.search(r"[.?!]$", x["_lastword"]))
        natural = x["_natAfter"] + y["_natBefore"]
        # a join never needs more pause than the speaker left there (minus frame rounding)
        need = ((round(min(SENTENCE_PAUSE[0], 0.9 * natural), 2), SENTENCE_PAUSE[1]) if sentence
                else (round(min(MIN_PAUSE, 0.8 * natural), 2), 9))
        ok = need[0] <= pause <= need[1]
        joins.append({"after": x["id"], "cut": round(x["_cutEnd"], 2), "pause": pause, "sentenceEnd": sentence, "ok": ok,
                      "lastWord": x["_lastword"]})
        if not ok:
            flags.append({"kind": "PAUSE", "seg": x["id"], "cut": [round(x["_cutEnd"], 2)] * 2, "pause": pause,
                          "need": list(need), "lastWord": x["_lastword"]})
    json.dump({"floors": floors, "flags": flags, "joins": joins}, open(a.out, "w"), indent=1)
    lines = [f"base-cut audit: {len(segs)} segments, {len(joins)} joins, {len(flags)} flags",
             "floors (dB): " + ", ".join(f"{k} {v:.1f}" for k, v in floors.items()), ""]
    for f in sorted(flags, key=lambda f: f["cut"][0]):
        if f["kind"] == "PAUSE":
            lines.append(f"{mmss(f['cut'][0]):>7}  PAUSE      after {f['seg']} '{f['lastWord']}'  {f['pause']:.2f}s, needs {f['need'][0]}-{f['need'][1]}s")
        elif f["kind"] == "LONGWORD":
            lines.append(f"{mmss(f['cut'][0]):>7}  LONGWORD   {f['seg']} '{f['word']}' {f['dur']}s (src {f['session']} {f['src'][0]:.2f})")
        else:
            lines.append(f"{mmss(f['cut'][0]):>7}  {f['kind']:9s}  {f['seg']} {f['dur']}s speech, src {f['session']} {f['src'][0]:.2f}-{f['src'][1]:.2f}  near: {f['context']}")
    open(a.out.replace(".json", ".txt"), "w").write("\n".join(lines) + "\n")
    print("\n".join(lines[:80]))
    sys.exit(1 if flags else 0)


main()
