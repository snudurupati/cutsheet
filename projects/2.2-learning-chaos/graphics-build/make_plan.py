#!/usr/bin/env python3
"""Write graphics-build/cutsheet.json, the machine-readable graphics plan for 2.2-learning-chaos.

Every part's span is derived from a spoken cue in outputs/transcript-cut.json: a (word, near-time)
pair finds the word nearest to the planned time within CUE_TOLERANCE and snaps to the frame grid.
A cue that cannot be found fails the run: the cut moved under the plan (hard rule 12). Times here
are written against the v9 cut (24:09.0, 43470 frames); when the base cut changes, re-run and fix
only the cues the error names.

Human decisions carried so far (2026-11-11):
  opening        lifted hook line, then the opening statement, then the body (human, verbatim)
  treatment      face-plate composite, right-anchored cards (human)
  hook card      style says hook.card=false and the hook must be a drawn object under load;
                 the object is the series line-art humanoid (style.json recurringObjects.robot)
  1950           the human sign-off trim removed the spoken year (statement now ends 'quoting Alan
                 "Turing'); the card prints 1950 as attribution fact; no card may print 1915
"""
import argparse, json, re, sys

CUE_TOLERANCE = 3.0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cut-transcript", required=True)
    ap.add_argument("--edit-cutsheet", required=True)
    ap.add_argument("--out", required=True)
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

    def cue(word, near, after_word_end=False):
        """the time of the word nearest `near`, found within CUE_TOLERANCE"""
        want = norm(word)
        cands = [w for w in words if norm(w["word"]) == want]
        if not cands:
            sys.exit(f"cue {word!r} near {near:.1f}: word not in the cut transcript at all")
        w = min(cands, key=lambda w: abs(w["start"] - near))
        if abs(w["start"] - near) > CUE_TOLERANCE:
            sys.exit(f"cue {word!r} near {near:.1f}: nearest is {w['word']!r} at {w['start']:.2f}, "
                     f"outside tolerance {CUE_TOLERANCE}: the cut moved under the plan")
        return w["end"] if after_word_end else w["start"]

    P = []  # planned parts, filled in order; each: dict + cue specs
    def part(id, kind, cls, cue_start, cue_end, direction, notes="", draw=None, kind_extra=None):
        P.append({"id": id, "kind": kind, "class": cls,
                  "cs": cue_start, "ce": cue_end,
                  "direction": direction, "notes": notes, "draw": draw})

    # ---- parts (times are v8 cut seconds, cues are (word, time) pairs) ----
    part("g01", "analogy", "overlay", ("if", 0.14), ("unless", 10.34),
         "Hook, drawn (style hook.mustBeDrawnObject). The series line-art humanoid stands at a control "
         "lever on a deterministic rail: it moves in perfect lockstep, ticks stamped at its feet, "
         "reading 'DETERMINISTIC'. Frame 1 carries motion (hook.opensOnMotion): the humanoid walks its "
         "rail before any type lands. On 'completely deterministic' the rail locks with a click "
         "(the style's one accent element: the lock). On 'cannot learn' its grip slackens. On 'baseline "
         "of chaos' the rail shatters into drifting dots; on 'real world' the humanoid steps off onto "
         "uneven ground and keeps walking. heroLeft band; the face plate carries the speaker. "
         "Built inside g01 (like 2.1's lower third): Sreeram Nudurupati / AI for the Working Data "
         "Engineer / @snudurupati, name display 900 40px, role 500 24px $muted, wipes up 2s in, out "
         "at 7.6, on the lower-left band under the rail (face plate is right; nothing spoken is "
         "repeated there).",
         draw="series humanoid; rail; lock; chaos dots")
    part("g02", "card", "overlay", ("unless", 10.34), ("Turing.", 25.87, True),
         "The opening statement as a quote card on the right plate. Small eyebrow 'THE CLAIM' 22px "
         "$muted; the quote builds verbatim line by line as spoken, 44px display, '$accent' on "
         "'stochasticity' only (accentElementsPerScene=1). Attribution block lands on 'Dennis Noble': "
         "'Dennis Noble' 900 / 'on biological intelligence, quoting Alan Turing' 500 $muted / "
         "'1950' on the year (printed attribution fact: the Imitation Game is 1950, and the human "
         "sign-off trim removed the spoken 'back to 1950', so the card is the only place the year "
         "appears). NO card or caption prints 1915 anywhere in this video.",
         notes="right-anchored per human treatment decision; panel over screen is opaque")
    part("g03", "stat", "overlay", ("deterministic", 32.95), ("it", 37.04, True),
         "'DETERMINISTIC' struck through in $accent on 'failed miserably', and under it a week "
         "counter lands: '1 week' 160px display (statMinFontPx) with '0 successes' under it in "
         "$muted. The strike is the scene's one accent.")
    part("g04", "stat", "overlay", ("missing", 42.93), ("labels", 43.63, True),
         "Community dataset rows: three small rows land (LeRobot dataset tiles), each missing its "
         "'success' column: the column header ticks to a dashed empty slot in $accent-soft. Label "
         "'success labels: missing'.")
    part("g05", "diagram", "overlay", ("physics", 57.83), ("mind", 59.25, True),
         "'physics has its own mind': a hand-coded flowchart (if/then diamonds) on the left, on "
         "'physics' an arrow bends off the chart by itself and draws its own squiggle to the right. "
         "Dashed 'can't hand-code this' chip.")
    part("g06", "card", "overlay", ("today", 78.17), ("success", 89.14, True),
         "Today's map: four numbered stops draw as a route, each landing on its spoken word: "
         "1 deterministic policy (lands grey, gets struck), 2 what failed, 3 learning from data, "
         "4 success. Route line in $rule, the one accent on stop 4. heroLeft.")
    part("g07", "card", "overlay", ("profiling", 92.23), ("measure", 94.03, True),
         "Stop 5 'profiling my data' joins the route, chip 'what did I measure?' This is the handoff "
         "into the demo; the map leaves on 'let's get started' (demo begins at 'So here, if you can "
         "see my screen', cut 96.90).")
    part("gD-NOTE", "diagram", "overlay", ("screen", 98.38), ("screen", 98.38, True),
         "PLACEHOLDER stripped before output; the demo scene lives in PLAN.md prose and "
         "demo-scene.json, not in the parts list.",
         notes="demo scene: screen full frame, face inset 480x480 at 1368,528 r24 (style "
               "demoInset), enters once on 'So here, if you can see my screen' (demo section "
               "starts 96.77, enters 96.77, leaves 1057.57, re-derived from the v8 cutsheet "
               "section map), steps aside for every punch-in. Built by the build stage with the "
               "ffmpeg compositor; cam/screen head_trim already in the edit cutsheet (screen "
               "leads cam by 2 frames/session).")
    part("g08", "card", "overlay", ("called", 100.38), ("kernel", 125.42, True),
         "Notebook ID card over the opening cells: the screen title OCRs to 'sim_pushTV2.ipynb', so "
         "the chip prints exactly that (spoken 'SIM Push-T V2, an ipynb notebook'). Below it a small "
         "Jupyter glyph ticks 'kernel attached' on 'attached to the appropriate kernel'. Import chip "
         "names 'gymnasium' as he says it. Right-anchored, opaque panel.")
    part("gZ1", "zoom", "overlay", ("Pymunk", 134.20), ("easier", 136.54, True),
         "Punch-in on the notebook import cells: mark 'import gymnasium' and 'gym_pusht' as they are "
         "named. Chip 'no MuJoCo: Pymunk 2D' beside the mark, and the contrast lands here: a small "
         "'MuJoCo' tile greyed out vs 'Pymunk' active (style: contrast over screen is opaque panel).")
    part("gZ2", "zoom", "overlay", ("Push-T", 145.72), ("state", 149.06, True),
         "Punch-in on the env creation line: underline 'PushT-v0' and 'observation_type=state' as "
         "read. No marks drift (1.00-1.03 push) so a held still screen is never frozen.")
    part("gZ2b", "diagram", "overlay", ("collect", 160.24), ("screen", 165.12, True),
         "'collect data instead of running a sim for a human observation': two tiny tiles, 'render "
         "for eyes' greyed with a slash vs 'collect frames' active in $accent (one accent). "
         "The data-engineering move at the top of the notebook: capture, don't watch.")
    part("gZ3", "zoom", "overlay", ("action", 169.41), ("5-fold", 182.22, True),
         "Punch-in on the action space print from 'action space is the amount of area we allotted': "
         "a 5x5 grid draws over the output, x/y axes marked 0..5, one cell lights $accent on "
         "'lowest ... highest'")
    part("gZ4", "stat", "overlay", ("390", 197.88), ("radians", 236.99, True),
         "Over the Push-T board: coordinate labels land as he reads them, pusher '390, 304' with a "
         "leader line to the pusher dot, outline '241.5, 268.5' at '3.3 degree angle', goal '0.78 "
         "degree radians' counting on screen. The Push-T task legend (pusher / block / outline) names "
         "each part once so the demo reads without the speaker.")
    part("gZ5", "stat", "overlay", ("experiment", 258.63), ("100", 265.17, True),
         "Punch-in on 'n_episodes = 100': counter ticks '100 episodes' 160px on the number itself.")
    part("gZ6", "diagram", "overlay", ("seed", 292.67), ("sets", 300.03, True),
         "Seed diagram over the loop: three small boards, each with the pusher and block at a "
         "different spot, one $accent seed chip feeding them. 'each episode starts somewhere new'.")
    part("gZ7", "zoom", "overlay", ("300", 318.95), ("300", 340.37, True),
         "Punch-in on 'end less than 300' in the loop condition: a step meter fills, dashed ceiling "
         "labelled '300'; on 'whichever condition comes first, stop the loop' a second exit arrow "
         "'done' lights above the ceiling.")
    part("gZ7b", "diagram", "overlay", ("not", 364.46), ("policy", 382.44, True),
         "'This is not a real policy': two tiny flow diagrams stacked. Top (the real one): read state "
         "-> decide action -> step. Bottom (his): sample(action_space) -> go, arrow skipping state "
         "with a dashed bypass. The bypass is the scene's accent. Lands as he defines what a policy "
         "means, closes on 'the random policy'.")
    part("gZ8", "stat", "overlay", ("zero", 385.40), ("0.115", 390.56, True),
         "Random policy scorecard: '0 / 100' successes lands 160px $ink, 'max coverage 0.115' under "
         "it in $muted with a tiny 11.5% fill bar (the bar is the scene's accent element). The one "
         "payoff of the random baseline.")
    part("gZ8a", "contrast", "overlay", ("even", 408.58), ("order", 414.47, True),
         "'pure chaos does not create order': left, scattered dots in free motion labelled 'chaos' "
         "(the scene's accent: the scatter); right, the same dots refusing to form a T outline, "
         "dashed target ghost empty. The line is his: learning needs chaos, chaos alone builds "
         "nothing. Sets up why the random policy was still the right choice.")
    part("gZ8b", "diagram", "overlay", ("deterministic", 424.68), ("happen", 450.79, True),
         "The hand-coded plan drawn: pusher dot bottom-left, star target top-right, an arrow draws "
         "'go to star' then 'push in a straight line', a ghost outline shows the expected overlap. "
         "Dashed 'that should work' chip lands on 'That's what I thought. It should work, should "
         "happen.' The plan's own confidence makes the circling failure land; one accent (the arrow "
         "head).")
    part("gZ9", "analogy", "overlay", ("unexpected", 480.14), ("cowboy", 497.55, True),
         "The cowboy: on 'the unexpected happens' the board appears and the T starts circling "
         "(drawn from the real circling motion on screen); the line-art rope loop arcs over the "
         "spinning T, the pusher dot swings it in a loop on 'swinging it down in a loop'. "
         "Chip 'the cowboy policy'. The humanoid wears the series line-art cowboy hat here (human request 2026-11-12; costume for this beat only, the recurring robot stays hatless elsewhere). This beat is the video's comic beat: let the loop spin a full "
         "extra cycle past the last 'cowboy'.")
    part("gZ9b", "stat", "overlay", ("attempt", 500.22), ("AI", 536.34, True),
         "Attempt 1 verdict: a 'was a failure' stamp lands on the spinning cowboy board, the rope "
         "dissolves; 'attempt 1: deterministic, failed' ledger row ticks under gZ9's ledger. Then "
         "'hey, you know what? I am not super smart. Let me try AI.' lands as a small chip on 'try "
         "AI' (one accent: the stamp).")
    part("gZ10", "stat", "overlay", ("Gemini", 537.92), ("corner", 558.20, True),
         "AI interlude: a terminal glyph types a prompt, then a small board: the pusher dot walks to "
         "a corner and sits, an X marks the spot. 'assumed the goal was 400x400' chip. One accent: "
         "the X.")
    part("gZ11", "contrast", "overlay", ("five", 566.84), ("week", 568.68, True),
         "'five minutes' vs 'a whole week': a clock glyph left, a 5-day strip of code/version chips "
         "right that fills on 'back and forth, bunch of codes, bunch of versions'. The week strip is "
         "$accent-soft, the clock hands $accent.")
    part("gZ11b", "card", "overlay", ("get", 582.30), ("process", 587.83, True),
         "The thesis returns mid-demo as a mini quote card: 'to get a machine to learn ... you need "
         "some level of randomness in the learning process', attribution chip 'Dennis Noble / Alan "
         "Turing' (the names he credits on this line). Small card, right plate; the echo of g02 that "
         "tips him toward the diffusion policy.")
    part("gZ12", "stat", "overlay", ("promised", 604.06), ("successes", 612.19, True),
         "Hugging Face promise: '64-65% success' count-up 160px, 'their eval' caption; on 'I did get "
         "a good chunk of successes' a small check ticks under the number.")
    part("gZ12b", "stat", "overlay", ("diffusion", 616.41), ("settled", 624.15, True),
         "First success replay: punch-in on the sim running the diffusion policy, the T block slides "
         "onto the outline; a 'success' tick lands in $accent on 'successfully pushes', chip 'that "
         "was settled' on 'settled'. The first green light after three failed attempts.")
    part("gZ13", "stat", "overlay", ("80", 649.44), ("minutes", 650.58, True),
         "'80-90 min for 50 episodes' 160px with a small M5 Pro chip glyph. Sets up gZ14's arithmetic "
         "and g24's wall.")
    part("gZ14", "stat", "overlay", ("36", 674.29), ("rate", 677.83, True),
         "His own eval: '36 / 50 = 74%' 160px count-up on '74 percent', the % the one accent. "
         "Spelled as spoken.")
    part("gZ14b", "card", "overlay", ("built", 690.36), ("fared", 710.03, True),
         "'I built a profiler': a small gauge/lens glyph over the dataset tile, two check rows land "
         "as he names them, 'outliers?' and 'is the data good?', then a 'tested on Push-T community "
         "' tick, an 'ALOHA community' tick, and the beat line 'now: my own data' in $accent (one "
         "accent). The profiler enters as a character here, before its own demo.")
    part("gZ15", "diagram", "overlay", ("name", 725.99), ("had", 737.46, True),
         "Dataset card: push_t_sim, fps 10, features list scrolls as he reads it, a 'no video "
         "captured' chip dashed with the reason 'machine capacity'. LeRobot dataset chip lands on "
         "'LeRobot dataset'.")
    part("gZ15b", "zoom", "overlay", ("each", 748.13), ("ds.add_frame", 750.02, True),
         "Punch-in on the collection loop: underline 'ds.add_frame' as he says it, tiny frame-stack "
         "glyph filling once. Two seconds, then releases to the full screen.")
    part("gZ15c", "zoom", "overlay", ("print", 786.49), ("pattern", 791.49, True),
         "Punch-in on the printed schema: mark the schema keys as they appear (episode index, frame "
         "index, timestamp, action, observation), chip 'LeRobot schema: it just follows it'. The "
         "convention is the point: he writes nothing, the format is already right.")
    part("gZ16", "stat", "overlay", ("1,050", 796.63), ("policy", 805.89, True),
         "Dataset size: '1,050 episodes' 160px, splits beneath on 'a thousand ... 50': '1,000 random' "
         "+ '50 diffusion' as two tinted blocks of a stacked bar.")
    part("gZ16b", "stat", "overlay", ("300", 812.62), ("frames", 815.26, True),
         "'~300k frames' count-up 160px beside a small frame-stack glyph; '1,000 x 300 steps' caption "
         "(the arithmetic he narrates: all the random ones ran the full 300).")
    part("gZ16b2", "diagram", "overlay", ("count", 830.65), ("zero", 853.06, True),
         "Metadata vs data check: two stacked tiles 'metadata' and 'data' with a counter on each; on "
         "'they match exactly' an = lights between them, on 'count of zero' a check stamp "
         "'everything matches' lands. The data-engineering discipline beat: verify, don't assume.")
    part("gZ17", "diagram", "overlay", ("episode", 857.59), ("data", 878.10, True),
         "Two datasets, one task card: left tile '1,000 random, all failures', right tile '50 "
         "diffusion, 36 successes'; on 'would skew my data' the left tile slides behind a split line. "
         "'split by task' chip closes the beat.")
    part("gZ17b", "diagram", "overlay", ("random", 886.34), ("250", 914.07, True),
         "Episode-length picture drawn over the real distribution plot: the random rows all pin at "
         "300 (flat ceiling of bars, 'all ran to the cap'), the diffusion rows spread 50-300 with the "
         "early finishers $accent-soft and a marker at 250 'success sooner'. Drawn bars track the "
         "real histogram on screen.")
    part("gZ18", "stat", "overlay", ("IQR", 930.67), ("300", 934.47, True),
         "'IQR = 161' count-up 160px; a whisker plot band lands under it marking the 139-300 "
         "outlier window on 'below 139 or above 300'.")
    part("gZ19", "diagram", "overlay", ("idle", 969.45), ("them", 999.75, True),
         "Profiler checklist over the report: idle episodes, dead joints, null values, nan values, "
         "cameras: each row ticks in sequence as he clears them ('no dead joints no idle episodes', "
         "'no null values no nan values', 'no cameras, I didn't record them'). Ticks $accent (one "
         "accent row: the last tick). The checklist is the profiler's argument.")
    part("gZ19b", "stat", "overlay", ("36", 1006.82), ("policies", 1013.43, True),
         "'36 succeeded / 1,050' 160px with the reason line '$muted: 1,000 of them are random "
         "policies' landing on the explanation. The number that makes the low rate make sense.")
    part("gZ19c", "card", "overlay", ("works", 1036.43), ("system", 1052.69, True),
         "'The profiler itself works' chip: same profiler, my own data; 'filter by task type' mini "
         "diagram (one queue splits by policy), 'summary written to file system' footer tick. The "
         "profiler earns its keep before the takeaways.")
    part("gZ20", "analogy", "overlay", ("parrots", 1070.52), ("parrot", 1085.83, True),
         "Takeaway lead-in: 'LLMs are just parrots?' A drawn parrot-on-perch silhouette "
         "(line art, series style) beside the Reddit-style thread glyph ('search: AI parrot / LLM "
         "star parrot'). Sets up gZ21.")
    part("gZ20b", "card", "overlay", ("quote", 1102.22), ("stochastic", 1120.00, True),
         "Quote echo card (g02's voice returns): 'In biological intelligence, the cellular processes "
         "are stochastic. There is a certain level of randomness ...' attribution 'Dennis Noble'. "
         "Aside chip 22px $muted: 'not a biologist, no AP bio' (his own joke on this line).")
    part("gZ20c", "card", "overlay", ("same", 1125.12), ("in", 1137.31, True),
         "The Turing half of the quote: 'to make a machine learn, especially learn in a real world, "
         "the learning process has to have a level of randomness, stochasticity built in' "
         "attribution 'Alan Turing'. The two quote cards together re-state the thesis at the moment "
         "his data proves it.")
    part("gZ20d", "diagram", "overlay", ("language", 1139.98), ("patterns", 1149.15, True),
         "'exactly what LLM training tries to emulate': network glyph left, a corpus block (stacked "
         "lines) feeds it, 'learns patterns' ticks out right. The same diagram family as gZ21's "
         "right side, drawn plain here so gZ21's contrast reads.")
    part("gZ21", "contrast", "overlay", ("haiku", 1152.66), ("new", 1179.59, True),
         "Parrot vs pattern-learner: left, a parrot mirroring two author tiles (Hemingway, Emerson, "
         "spelled correctly, the transcript's Ernst/Hummingway mishears are not screen copy); right, "
         "the same tiles feeding a small network glyph that emits a NEW tile. On 'create something "
         "new out of it' the right side wins: the new tile lifts and the parrot dims to $muted. "
         "Chip: 'same for code'.")
    part("g22", "strike-list", "overlay", ("one", 1180.97), ("that", 1205.74, True),
         "Takeaway one as a counted row: 'Stochastic training is not a bug' 44px with 'a model that "
         "can be wrong can be right' $muted under it. Rises on 'On the contrary'.")
    part("g22b", "card", "overlay", ("talking", 1212.76), ("science", 1250.01, True),
         "The AI-collapse aside as a quote card: 'AI downturn? AI collapse? The bubble may burst. "
         "AI is here to stay and only going to improve' with a small 'hopeful' signature line "
         "'future of CS and robotics'. One accent: 'here to stay'. Lighter card weight than g22 (this "
         "is a mood beat, not an argument).")
    part("g23", "strike-list", "overlay", ("second", 1252.97), ("set", 1276.41, True),
         "Takeaway two: 'policy = f(data)' lands 90px as the formula types itself (font: display "
         "900), then 'garbage in, garbage out' stamps beneath on 'garbage and garbage out' (the "
         "spoken wording), $accent on 'garbage' once. Data-curation chip on 'curated clean ... "
         "indicative' (1272-1276).")
    part("g23b", "diagram", "overlay", ("policy", 1291.44), ("place", 1302.29, True),
         "'treat policy as a black box': an opaque rounded box, 'data' arrow in, 'action' arrow out, "
         "'our life becomes easy' chip. The abstraction a data engineer gets to use. On 'falls into "
         "place' the arrows snap straight.")
    part("g24", "strike-list", "overlay", ("90", 1339.62), ("easy", 1351.26, True),
         "Takeaway three: '50 episodes = 90 min on an M5 Pro' 160px count, then a 1000/2000/100k "
         "stack grows on 'thousand ... two thousand ... 100k' and stops, unresolved: 'imagine'. The "
         "compute wall, drawn.")
    part("g24b", "strike-list", "overlay", ("success", 1368.27), ("misleading", 1380.19, True),
         "The misleading-names lesson: a dataset tile reads 'success_v2', the success metric under it "
         "counts to 0 (strike lands on the tile name), chip 'curated, many successes inside: naming "
         "misleads'. On face value: no. The profiler's reason to exist, one line.")
    part("g25", "card", "overlay", ("Spark", 1403.92), ("episodes", 1426.02, True),
         "Next episode preview as three route chips that light in turn as he names them: 'Spark "
         "box: transfer the sims' (CUDA cores chip), 'ALOHA / SO-101', 'teleop episodes'. "
         "Right-anchored, opaque panel (over the desk wall it is lightReinforced per zones).")
    part("g26", "card", "overlay", ("filter", 1436.31), ("comment", 1439.01, True),
         "The ask: 'know a way to filter datasets on Hugging Face? leave a comment', a comment "
         "bubble glyph lands on 'leave me a comment'. $accent bubble (one accent).")
    part("g27", "card", "overlay", ("goodbye", 1445.08), (None, None),
         "End card: five brand rows from brand.md (YouTube @snudurupati with channel name "
         "'AI for the Working Data Engineer' above, blog nudurupati.co, github, linkedin, x "
         "@srnudurupati) rise in 0.4s apart on 'goodbye', hold to the last frame (+2.3s hold per "
         "style). Panel x96-680 above y660 (measured wall), one $accent rule under the first row. "
         "Per the human sign-off decision 2026-11-12 the video ends at 24:09.0 on the end card, two "
         "frames after 'you.' (no face-turn tail: the human asked not to wait for the turn).")

    # resolve cues -> spans
    parts = []
    for p in P:
        st = cue(*p["cs"])          # full tuple: honours the after_word_end flag
        en = cue(*p["ce"]) if p["ce"][0] is not None else total
        parts.append({"id": p["id"], "kind": p["kind"], "class": p["class"],
                      "start": snap(st), "end": snap(en),
                      "direction": p["direction"], "notes": p["notes"], "draw": p["draw"]})
    parts.sort(key=lambda x: (x["start"], x["end"]))
    parts = [p for p in parts if p["id"] != "gD-NOTE"]  # demo stub: prose only, never a part
    # g27 end card must be last and after g26; demo spans everything
    json.dump({"source": a.cut_transcript, "fps": fps, "totalSeconds": total, "parts": parts},
              open(a.out, "w"), indent=1)
    # report the shape for the PLAN.md writer
    for p in parts:
        print(f"{p['id']:4s} {p['start']:8.2f}-{p['end']:8.2f} {p['kind']:10s} {p['class']:8s} {p['direction'][:60]}")
    print(f"{len(parts)} parts -> {a.out}")


main()
