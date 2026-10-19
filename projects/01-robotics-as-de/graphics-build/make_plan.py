#!/usr/bin/env python3
"""Write graphics-build/cutsheet.json, the machine-readable graphics plan.

PLAN.md is the human-readable plan the human reviewed and changed on 2026-10-16;
this is the same plan with every span derived from a spoken cue in
outputs/transcript-cut.json, found by word near the time it was planned at and
snapped to the frame grid. A cue that cannot be found within CUE_TOLERANCE of
where it was planned fails: the cut moved under the plan (hard rule 12).

Human decisions this plan carries (2026-10-16):
  opening        the Databricks story, no lift
  g01            Wi-Fi login (script), password as dots; lower third inside it
  g01b           drawn icons + the series humanoid; NO AI footage in the series
  g06            a drawn bike scene instead of the daughter photo
  g18            edit timeline; the only full-screen MG, so the only one with dust
  g21            links only
  robot motif    a line-art humanoid (style.json recurringObjects.robot)
"""
import argparse, json, re, sys

CUE_TOLERANCE = 3.0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cut-transcript", required=True)
    ap.add_argument("--edit-cutsheet", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--planned-on", default="", help="the cutsheet the plan's times were written against "
                    "(transcript/cutsheet-v1.json): every planned time is carried through the SOURCE onto this cut")
    a = ap.parse_args()

    cut = json.load(open(a.cut_transcript))
    cs = json.load(open(a.edit_cutsheet))
    fps = cs["fps"]
    if cut["totalFrames"] != cs["totalFrames"]:
        sys.exit("cut transcript and edit cutsheet disagree; stale artefact")
    words = [w for w in cut["words"] if "start" in w]
    total = cut["totalSeconds"]
    snap = lambda t: round(round(t * fps) / fps, 6)
    norm = lambda t: re.sub(r"[^a-z0-9$.%']", "", t.lower()).rstrip(".,")

    # The plan's times were written on an earlier cut. A planned time is mapped old cut -> source ->
    # this cut, so a re-cut moves every cue with its words (13s came out of the base cut on 2026-10-17).
    def segmap(doc):
        acc, out = 0, []
        for g in doc["segments"]:
            if not g.get("keep", True): continue
            out.append((acc / doc["fps"], (acc + g["outFrames"]) / doc["fps"], g["session"],
                        g["startFrame"] / doc["fps"], g["endFrame"] / doc["fps"], g["kind"]))
            acc += g["outFrames"]
        return out
    NEW = segmap(cs)
    OLD = segmap(json.load(open(a.planned_on))) if a.planned_on else None
    if OLD is not None and abs(OLD[-1][1] - 1023.367) > 0.05:
        sys.exit("--planned-on is not the 17:03.4 cut the plan was written on")
    def carry(t):
        if OLD is None:
            return t
        c0, c1, sid, s0, s1, kind = min(OLD, key=lambda g: 0 if g[0] <= t < g[1] else min(abs(t - g[0]), abs(t - g[1])))
        src = s0 + min(max(t - c0, 0), s1 - s0) if kind == "speech" else s0
        best = min(NEW, key=lambda g: (g[2] != sid, 0 if g[3] <= src < g[4] else min(abs(src - g[3]), abs(src - g[4]))))
        return best[0] + min(max(src - best[3], 0), best[1] - best[0]) if best[5] == "speech" else best[0]

    def cue_new(word, near):          # a cue placed on THIS cut (2026-10-17 checkpoint fixes): no carry
        return cue(word, near, carried=True)

    def cue(word, near, carried=False):
        near = near if carried else carry(near)
        w = norm(word)
        hits = [x for x in words if norm(x["word"]) == w and abs(x["start"] - near) <= CUE_TOLERANCE]
        if not hits:
            sys.exit(f"cue {word!r} not found within {CUE_TOLERANCE}s of {near}")
        return snap(min(hits, key=lambda x: abs(x["start"] - near))["start"])

    acc, demo = 0, []
    for s in cs["segments"]:
        if s["section"] == "demo":
            demo.append((acc, acc + s["outFrames"]))
        acc += s["outFrames"]
    demo_in, demo_out = demo[0][0] / fps, demo[-1][1] / fps

    P = []
    def part(id, start, end, kind, cls, built, direction, cues=None):
        P.append({"id": id, "start": snap(start), "end": snap(end),
                  "startFrame": round(start * fps), "endFrame": round(end * fps),
                  "kind": kind, "class": cls, "builtBy": built,
                  "direction": direction, "cues": cues or {}})

    # ------------------------------------------------------------- intro ---
    t_db = cue("databricks", 10.1)
    # the "Simple?" card holds until just before the warehouse lands; the grow to full frame happens
    # into blank paper there (human 2026-10-17: "expand to fullscreen after simple to white space just
    # before warehouse shows up")
    t_db = cue_new("platforms", t_db + 3.9) - 0.8
    # the hook's slow push on the face, under g01 (FFmpeg, push.py): a full-frame segment of base footage
    part("gP1", 0.0, t_db, "push", "segment", "push",
         "Slow push 1.00 -> 1.04 from frame 1, power1.inOut, anchored on the eyes (push.py).")
    part("g01", 0.0, t_db, "analogy", "overlay", "hyperframes",
         "HOOK, Wi-Fi login (script cue, adapted to style.json hook). Slow push from frame 1 (FFmpeg, "
         "push.py). The sheet wipes up in heroLeft on the first 'Databricks' (style: the drawn object "
         "lands on the first clause break, not frame 0; the approved plan said 0.3s, raised to the "
         "human): three networks, 'Databricks' selected. On 'make big data simple' the password field "
         "fills with dots, one per letter; on 'password' the check draws in $accent (the one accent). "
         "The lower third wipes up under the sheet after it lands and exits at 7.0. The sheet holds to "
         "the second 'Databricks', where g01b swaps its contents in place.",
         {"databricks": cue("databricks", 1.15), "make": cue("make", 4.6), "password": cue("password", 7.0)})
    t_mod = cue("modern", 30.8)
    part("g01b", t_db, cue_new("and", t_mod - 3.33) - 0.2, "takeover", "overlay", "hyperframes",
         "Solved, and what's next. Same card rect as g01; contents swap in place on 'Databricks'. Four "
         "named tiles land on their names (Databricks, Snowflake, Redshift, EMR), each takes a tick on "
         "'solved' and they slide off on 'problems'. The horizon runs along the bottom throughout; on "
         "'where' a stretch of it turns $accent. On 'robotics' the series humanoid side-steps in from the "
         "right, feet planted, facing out. Horizon keeps moving.",
         {"platforms": cue("databricks", 10.1), "snowflake": cue("snowflake", 14.9), "redshift": cue("redshift", 16.5),
          "emr": cue("emr", 17.6), "solved": cue("solved", 18.5), "problems": cue("problems", 22.2),
          "where": cue("where", 24.5), "robotics": cue("robotics", 27.4), "so": cue("so", 30.4)})
    t_then = cue("then", 46.9)
    part("g03", t_mod, t_then, "contrast", "overlay", "hyperframes",
         "Rules vs data, split panel. Left: a closed ring sense -> plan -> act, nodes labelled on "
         "'sense', 'plan', 'act'. Right on 'learning': dots streaming into a funnel and a curve fitting "
         "through them. Ring dims to $muted, the curve is the one $accent. Dot stream never stops.",
         {"rule": cue("rule-based", 34.6), "sense": cue("sense", 37.2), "act": cue("act", 38.3),
          "learning": cue("learning", 40.9)})
    t_thesis = cue("modern", 66.0)
    t_class = cue("classical", 68.6)
    # the thesis holds until "factory" (checkpoint 2026-10-17: it read for 0.8s, swapped out on "Classical")
    t_class = cue_new("factory", t_class + 2.0) - 0.4
    part("g04", t_thesis, t_class, "card", "overlay", "hyperframes",
         "Thesis, typographic hit (the title of the video and the series): 'Modern robotics is a data "
         "engineering problem.' display 900 measured to fit heroLeft, lands by 0.8s, $accent rule under "
         "'data engineering'. Hands straight to g05.",
         {"data": cue("data", 67.4)})
    t_so = cue("so", 85.8)
    part("g05", t_class, t_so, "takeover", "overlay", "hyperframes",
         "Factory vs home. Left: a conveyor with a fixed industrial arm, the same part arriving at the "
         "same spot, a counter past 10,000. Right on 'falls': a floor plan whose objects move every beat "
         "and the humanoid reaching where the mug was a beat ago. Belt runs to the end.",
         {"factory": cue("factory", 72.2), "falls": cue("falls", 77.1)})
    t_its = cue("it's", 95.8)
    t_over = cue("over", 104.1)
    part("g06", t_its, t_over + 1.2, "takeover", "overlay", "hyperframes",
         "Teaching my daughter to ride a bike, drawn (human 2026-10-16, no photo). A small faceless "
         "rider on a child's bike, an adult hand on the back of the seat, rolling left to right; the "
         "grip tightens on 'holding'; on 'go' the hand opens and stays, the bike rides on with one "
         "wobble. Bike frame is the $accent.",
         {"bike": cue("bike", 98.0), "holding": cue("holding", 100.2), "go": cue("go", 103.5)})
    t_hf = cue("hugging", 113.1)
    t_so2 = cue("so", 140.8)
    part("g07", t_hf, t_so2, "stat", "overlay", "hyperframes",
         "Stat stack in heroLeft, each number counts up and lands on its word: 80,000 LeRobot datasets "
         "with a small bar from 1,100 (2024); 1M+ trajectories (AgiBot World); 100+ robots; then tags "
         "teleop logs, fleet telemetry, metadata. Figures as spoken, not verified by the pipeline.",
         {"n80": cue("80000", 115.0), "n1100": cue("1100", 120.6), "million": cue("million", 127.5),
          "robots": cue("100", 130.7), "teleop": cue("teleoperation", 133.1), "fleet": cue("fleet", 134.7),
          "metadata": cue("metadata", 136.0)})
    t_phys = cue("physical", 161.1)
    t_and = cue("and", 188.3)
    t_phys = cue_new("single", t_phys + 5.3) - 0.5      # no empty "ONE MOMENT" card for 5s (checkpoint 2026-10-17)
    part("g08", t_phys, t_and, "diagram", "overlay", "hyperframes",
         "One moment explodes into its streams (script cue). One frame tile on 'single'; rows fly out "
         "on their words: wrist camera + front camera ('camera'), joint positions ('joints'), commands "
         "('commands'), timestamps ('timestamp'). On 'different' each row pulses at its own rate; on "
         "'downsampling' the fast rows thin. Pulses never stop.",
         {"single": cue("single", 166.2), "camera": cue("camera", 169.8), "joints": cue("joints", 172.0),
          "commands": cue("commands", 174.1), "timestamp": cue("timestamp", 176.9),
          "different": cue("different", 179.6), "downsampling": cue("downsampling", 186.0)})
    t_that = cue("and", 199.6)
    part("g09", t_and, t_that + 1.0, "analogy", "overlay", "hyperframes",
         "Nothing crashes. The g08 rows carry on; on 'sync' one row slips a frame; on 'crashes' a status "
         "dot stays green; on 'quietly' the humanoid closes its gripper one tick late beside the block. "
         "No red anywhere.",
         {"sync": cue("sync", 189.9), "crashes": cue("crashes", 192.5), "quietly": cue("quietly", 198.0)})
    t_13 = cue("13", 210.9)
    t_nob = cue("and", 229.4)
    part("g10", t_13 - 0.6, t_nob, "strike-list", "overlay", "hyperframes",
         "The series. On '13' a line draws with 13 ticks and week numbers, week 1 lit $accent. 'a robot "
         "data platform, in public' sets under it; on 'not' the words 'a robot' strike (sized by text) "
         "and 'the engine behind it' lands. A small arm icon nods on 'arm'.",
         {"weeks": cue("13", 210.9), "not": cue("not", 215.6), "engine": cue("engine", 216.9),
          "arm": cue("arm", 225.8)})
    t_start = cue("so", 240.2)
    t_black = cue("the", 258.6)
    part("g11", t_start, t_black, "screenshot", "overlay", "hyperframes",
         "The real kit: the SO-ARM101 Pro box photo (IMG_0269) on 'invested', the parts laid out "
         "(IMG_0271) on 'leader', slow push on each, in a panel left of the face. Chip 'Yantra: "
         "machine, in Sanskrit' on 'Yantra'.",
         {"invested": cue("invested", 241.4), "leader": cue("leader", 244.0), "yantra": cue("yantra", 254.4)})
    t_every = cue("every", 274.3)
    part("g11b", t_black, t_every, "diagram", "overlay", "hyperframes",
         "Leader and follower (script cue): a filled $ink SO-101 silhouette on 'black', an outline one on "
         "'white'; on 'follows' the leader bends and dots flow along a line to the follower, which makes "
         "the same move a beat later, labelled 'joint angles'. Loops to the end.",
         {"white": cue("white", 260.6), "follows": cue("follows", 262.2)})
    t_fol = cue("the", 288.3)
    t_fol = cue_new("wrist", t_fol + 3.3) - 0.4     # the wrist photo lands with its label (checkpoint 2026-10-17)
    part("g12", t_every, t_fol, "loop", "overlay", "hyperframes",
         "How a robot learns: a frame thumbnail and a command arrow snap into one row on 'saw' / 'told', "
         "the row drops onto a stack, repeats, and a counter climbs on 'thousands'. Stack keeps growing.",
         {"records": cue("records", 278.7), "saw": cue("saw", 280.3), "told": cue("told", 282.7),
          "thousands": cue("thousands", 285.4)})
    t_but = cue("but", 311.3)
    part("g13", t_fol, t_but, "screenshot", "overlay", "hyperframes",
         "The two cameras: wrist-camera photo (IMG_0275, rotated upright) labelled on 'wrist', then the "
         "clamp-arm webcam (IMG_0272, cropped) on 'sidelines'; labels 'the details' / 'the big picture'.",
         {"wrist": cue("wrist", 291.6), "sidelines": cue("sidelines", 299.9), "eyes": cue("eyes", 303.5)})

    # -------------------------------------------------------------- demo ---
    part("gZ1", cue("github", 323.4), cue("github", 323.4) + 5.0, "zoom", "segment", "demo_scene",
         "Punch-in on the GitHub breadcrumb physical-ai-data-architect / weeks / week-01 and the README "
         "title, framed from OCR. FFmpeg crop on the screen track.")
    part("gZ2", cue("alright", 349.3), cue("so", 363.9), "zoom", "overlay", "demo_scene+hyperframes",
         "Punch-in on Claude Code's reply 'Cloned repo ... ~/Projects/paida-wk01' (OCR); chip 'paida = "
         "physical AI data architect' lands on 'stands'.",
         {"stands": cue("stands", 359.6)})
    part("g14", cue("hello", 370.1), cue("so", 389.5), "analogy", "overlay", "hyperframes",
         "Hello World analogy over the idle terminal, opaque panel: a tiny terminal printing "
         "'Hello, World' beside the Push-T board (a grey T block, its outline, a blue dot); on 'robotics' "
         "the dot pushes the T into the outline. On 'download' a small download arrow fills.",
         {"pusht": cue("push-t", 374.6), "robotics": cue("robotics", 377.0), "download": cue("download", 381.9)})
    part("gZ3", cue("run", 400.6), cue("so", 446.9), "zoom", "overlay", "demo_scene+hyperframes",
         "Rerun: punch-in on the sim image panel as the blue dot pushes the T. On '206' a count-up "
         "chip '206 episodes' (paper on the screen); on 'episode' the chip adds 'one attempt each'.",
         {"n206": cue("206", 428.6), "episode": cue("episode", 435.8)})
    part("gZ4", cue("state", 455.8) - 0.2, cue("and", 516.3), "zoom", "overlay", "demo_scene+hyperframes",
         "Rerun: punch-ins on the state panel ('state'), then the action panel ('action'), then a framing "
         "of both with a bracket on the gap between the curves on 'deviates' and a label 'the object "
         "pushes back' on 'pushes'.",
         {"state": cue("state", 455.9), "action": cue("action", 471.3), "identical": cue("identical", 492.9),
          "pushes": cue("pushes", 507.0)})
    part("g15", cue("disparate", 550.7), cue("so", 564.1), "diagram", "overlay", "hyperframes",
         "Three sources, three clocks (camera, state, action) as rows of ticks at different rates; on "
         "'missing' they snap to one shared clock and stitch into one row; one tick that would be "
         "missing flashes as a gap first. Opaque panel over the screen.",
         {"missing": cue("missing", 554.6)})
    part("g16", cue("three", 588.9), cue("so", 643.0), "diagram", "overlay", "hyperframes",
         "The three parts of a LeRobot dataset beside the real find output: meta/ JSON on 'metadata', "
         "data/ Parquet on 'tabular', videos/ MP4 on 'MP4'; each a labelled folder that draws on its "
         "cue; the three stay to the end.",
         {"metadata": cue("metadata", 591.9), "tabular": cue("tabular", 611.1), "mp4": cue("mp4", 640.3)})
    # ends as "...given right here." finishes: the terminal scrolls on the next frame (681.90 on the
    # 2026-10-17 cut, measured on base-screen.mp4), and marks held past it sit on moved text
    part("gZ5", cue("so", 649.4), cue("here", 689.2) + 0.17, "zoom", "overlay", "demo_scene+hyperframes",
         "Punch-in on info.json; paper marks land on robot_type 'unknown', total_episodes 206, "
         "total_frames 25650 and fps 10 as each is read. The terminal scrolls at 683.4: a second framing "
         "on data_path and video_path ('the data path is given right here') joined by a pan.",
         {"unknown": cue("unknown", 650.4), "n206": cue("206", 654.1), "frames": cue("25650", 668.6),
          "fps": cue("10", 681.6)})
    t_feat = cue("features", 690.6)
    part("gZ5b", t_feat + 1.8, t_feat + 8.3, "zoom", "segment", "demo_scene",
         "Legibility punch-in (style: a 60s+ demo stretch gets one on what is being read): the top of the "
         "features block, data_path, video_path, 'features' and 'observation.image', while the features "
         "are named. The screen scrolls at 690.4 and again at 699.4; framed between the two.")
    # the relational join, as a diagram card (checkpoint call 3, 2026-10-17): the JSON paths that tie the
    # two are scrolled off screen by then, so a punch-in has nothing to land on
    t_json = cue_new("json", 719.2)
    # holds 1.2s past "let's" so the join can be read (human 2026-10-17: it left before he could focus)
    part("g16b", t_json - 0.3, cue_new("let's", 728.3) + 1.0, "diagram", "overlay", "hyperframes",
         "The metadata behaves like a relational join: a Parquet table (episode_index, frame_index, "
         "timestamp) on the left, the MP4 files with their start offsets on the right; on 'relational' an "
         "$accent join line draws between the two episode_index columns, labelled 'join on episode_index'; "
         "on 'join' the matching rows light up together.",
         {"relational": cue_new("relational", 721.0), "join": cue_new("join", 725.0)})
    part("gZ6", cue("and", 756.3), cue("so", 783.5), "zoom", "overlay", "demo_scene+hyperframes",
         "Punch-in on the DESCRIBE result: paper underlines on observation.state, action, episode_index, "
         "frame_index, timestamp as named; on 'missing' an empty slot where observation.image would be, "
         "label 'video lives in MP4'. Wins marked as loudly as the gap.",
         {"features": cue("features", 759.6), "missing": cue("missing", 769.4)})
    part("gZ7", cue("so", 783.5), cue_new("understand", cue("so", 805.5) + 3.7), "zoom", "overlay", "demo_scene+hyperframes",
         "Punch-in on the frames query result; on 'always' a paper box on the 0.0 timestamps of each "
         "episode, label 'resets every episode'.",
         {"always": cue("always", 803.7)})
    part("g17", cue("so", 810.7), cue("so", 824.7), "diagram", "overlay", "hyperframes",
         "Film strip file-000.mp4 (script cue): on 'big' a long strip draws; on 'second' it divides into "
         "episodes 0, 1, 2 with v_from / v_to ticks. Opaque panel clear of the query being read.",
         {"big": cue("big", 811.9), "second": cue("second", 816.3)})
    # ends after "...complex enough.": the wide shot with the face carries "very large, very fast" and the
    # 13:56 section beat plays on a still wide frame (checkpoint 2026-10-17)
    part("gZ8", cue("so", 824.7), cue_new("this", cue("so", 853.1) - 13.4) + 0.2, "zoom", "overlay", "demo_scene+hyperframes",
         "The g17 strip carries on: on 'join' the formula 'video position = v_from + timestamp' lands and "
         "a marker drops into episode 1 ($accent); on 'start' the frame punches in on the video_position "
         "column of the real result.",
         {"join": cue("join", 826.4), "start": cue("start", 834.3)})

    # ------------------------------------------------------------- outro ---
    part("g18", cue("analogy", 874.9) - 0.8, cue("so", 911.0), "self-demonstrating", "segment", "hyperframes",
         "Edit-timeline takeover (35s): picture track of mouth thumbnails, an audio track of waveforms, "
         "a playhead always moving, 1.00 -> 1.03 drift and the style's takeoverDust behind everything. "
         "On 'cameras' a second picture track snaps in; on 'lips' the audio clip slides right a few frames "
         "so peaks miss the open mouths; on 'nothing' a robot track slips and nothing changes colour.",
         {"cameras": cue("cameras", 880.6), "lips": cue("lips", 894.6), "nothing": cue("nothing", 898.7),
          "late": cue("late", 910.2)})
    t_verdict = cue_new("but", cue("the", 947.7) + 3.6) - 0.3   # no blank verdict card (checkpoint 2026-10-17)
    part("g19", cue("three", 919.8), t_verdict, "strike-list", "overlay", "hyperframes",
         "Three takeaways, counted build in heroLeft: row 1 on 'one' 'Robots learn from data, not "
         "handwritten rules.'; row 2 on 'two' 'A dataset is three parts: metadata, Parquet, MP4.'; "
         "row 3 holds as a numeral until g20.",
         {"one": cue("one", 922.8), "two": cue("two", 929.3), "three": cue("three", 945.0)})
    part("g20", t_verdict, cue("so", 962.0), "card", "overlay", "hyperframes",
         "Verdict: 'The hard part isn't storing the data. It's stitching it together.' Biggest type in "
         "the video, measured to fit heroLeft, 'stitching' in $accent; beneath it the g08 streams lock "
         "into sync and the humanoid closes its grip on the block.",
         {"stitching": cue("stitching", 951.8), "arithmetic": cue("arithmetic", 959.5)})
    # the sign-off is anchored on its PHRASE, the last "see you then": the old cut's ending carried a
    # cut-off retake ("So let's see what kind of"), so a single word carried from it lands on the wrong "see"
    signoff = [i for i in range(len(words) - 2) if [norm(words[i + k]["word"]) for k in range(3)] == ["see", "you", "then"]]
    if not signoff:
        sys.exit("cue 'see you then' not found")
    part("g21", snap(words[signoff[-1]]["start"]) - 0.2, total, "card", "overlay", "hyperframes",
         "End card, links only (human 2026-10-16): all five brand.md rows land together on 'see you "
         "then' (no channel is named, so every row takes the no-cue fallback), panel x 96 -> 680, one "
         "$accent rule under the first row, held to the last frame.")

    # a punch-in lives on the screen track, which ends with the demo: clamp to it
    for p in P:
        if "demo_scene" in p["builtBy"] and p["end"] > demo_out:
            p["end"] = snap(demo_out); p["endFrame"] = round(demo_out * fps)
    P.sort(key=lambda p: p["start"])
    doc = {"video": "outputs/base-cut.mov", "fps": fps, "totalSeconds": total,
           "_demoScene": {"in": round(demo_in, 6), "out": round(demo_out, 6),
                          "direction": "Screen full frame, face inset bottom-right (style demoInset), "
                                       "enters once, leaves once; corner per span measured from OCR "
                                       "density; every punch-in is FFmpeg on the screen track."},
           "parts": P}
    json.dump(doc, open(a.out, "w"), indent=1)
    print(f"{len(P)} parts, demo {demo_in:.1f}-{demo_out:.1f}, wrote {a.out}")


main()
