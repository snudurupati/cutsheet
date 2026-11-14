#!/usr/bin/env python3.14
"""Write graphics-build/cutsheet.json (the machine-readable graphics plan) and PLAN.md.

Every part is anchored to SPOKEN WORDS by source position (session, approximate source second,
word), never by a cut time. The cutsheet maps source to cut, so a re-cut after the human's listen
moves every graphic with its words. A cue word that cannot be found within CUE_TOLERANCE of where it
was planned stops the build (hard rule 12): the cut changed under the plan, re-place that cue.

Planned 2026-10-28 overnight, unattended, at the human's direction ("once rendered, make the
graphics plan and make clips too for morning"). That skipped two gates the pipeline normally holds
for the human: base-cut sign-off (hard rule 15) and plan approval (hard rule 13). Both are put in
front of the human in the morning report; nothing here is final until they have seen it.

Inputs: --edit-cutsheet transcript/cutsheet.json, --out graphics-build/cutsheet.json, --plan-md.
"""
import argparse, json, re, sys

CUE_TOLERANCE = 4.0
HOLD = 1.2          # style: a card holds 1.2s past its last cue

norm = lambda t: re.sub(r"[^a-z0-9$.%']", "", t.lower()).strip(".,'")

# ------------------------------------------------------------------------------------- the plan ---
# Each part: id, kind, class, scene, start cue, end cue, direction, and named cues inside it.
# A cue is (session, approx source seconds, word). end cue "+HOLD" adds the 1.2s hold after the word.
# kind is one of the seven build kinds; scene is the style's scene vocabulary name.
PARTS = [
    # ---------------------------------------------------------------- Part 1: the hook --------
    dict(id="gP1", kind="zoom", cls="segment", scene="push", start=("a", 61.6, "If"), end=("a", 101.6, "joyful."),
         direction="Slow push on the face from frame 1, 1.00 -> 1.06 over the whole hook, power1.inOut, anchored on the eyes. FFmpeg geometry (push.py), never a browser segment. Hook rule: frame 1 moves, the drawn object lands on the first clause break."),
    dict(id="g01a", kind="card", cls="overlay", scene="analogy", start=("a", 63.6, "you"), end=("a", 124.8, "Blockbuster."),
         cues={"god": ("a", 65.0, "God"), "study": ("a", 67.9, "study"), "fun": ("a", 98.5, "fun"), "working": ("a", 99.75, "Working"),
               "joyful": ("a", 101.3, "joyful."), "first": ("a", 113.3, "first"), "enterprises": ("a", 114.9, "enterprises"), "pay": ("a", 115.55, "pay"),
               "analytics": ("a", 116.8, "analytics?"), "engineers": ("a", 118.5, "engineers"), "coveted": ("a", 119.15, "coveted?"),
               "answer": ("a", 120.2, "answer"), "favorite": ("a", 121.75, "favorite"), "weekend": ("a", 123.05, "weekend"), "called": ("a", 124.2, "called")},
         direction="HOOK candidate A, 'the lens finds the T' (no type, eyebrow optional). heroLeft card, light-reinforced panel. A field of ~220 ink dots drifting like noise. On 'you' (first clause break) a drawn magnifier lens (330px circle, 6px white border, card shadow, the style's `lens` anatomy) slides in from the left edge. Inside the lens the same dots are seen sharper; as it settles over the middle on 'God' the dots inside it pull into the PushT T-block silhouette with the round pusher beside it (the video's own subject), the one $accent element. Outside the lens the dots stay noise. 'study': the lens holds, the T inside breathes. This is the recurring motif's first, unresolved appearance: the lens returns at the end over a real plot."),
    dict(id="g01b", kind="card", cls="overlay", scene="analogy", start=("a", 63.6, "you"), end=("a", 68.3, "it.", 0.45), alt_of="g01a", keep_end=True,
         cues={"god": ("a", 65.0, "God"), "study": ("a", 67.9, "study")},
         direction="HOOK candidate B, 'the curve that hides two'. Same card. 206 small ink dots fall in a heap; on 'you' they sort left to right into the sideways S-curve of episode lengths (the real PushT shape: flat middle, steep ends). On 'God' the two highest dots lift out of the curve and pulse $accent, unlabelled: a question the video answers in the demo (episodes 184 and 174). Rendered so the human can choose between A and B."),
    dict(id="g01c", kind="card", cls="overlay", scene="self-demonstrating", start=("a", 63.6, "you"), end=("a", 68.3, "it.", 0.45), alt_of="g01a", keep_end=True,
         cues={"god": ("a", 65.0, "God"), "this": ("a", 66.2, "This"), "study": ("a", 67.9, "study")},
         direction="HOOK candidate C, 'left hand first' (the human's pick of Option 2, 2026-10-28). Same heroLeft card. 50 rows, one per real ALOHA episode, stream in left to right as dense noisy telemetry (a busy joint, z-scored). On 'God' the traces dim and each row gets two marks at the frames its grippers clamp: left (the $accent column) and right (ink), joined by a short rule. Every left mark sits before its right mark. On 'This' the labels: LEFT / RIGHT over the columns, '50 / 50 EPISODES' eyebrow and 'Left hand grabs first.' Data: aloha-hook.json (make_aloha_hook.py, asserts the claim)."),
    dict(id="g02", kind="takeover", cls="overlay", scene="contrast", start=("a", 124.9, "Blockbuster."), end=("a", 170.1, "bankrupt.", "+HOLD"),
         cues={"remember": ("a", 161.6, "remember,"), "netflix": ("a", 165.0, "Netflix"), "didnt": ("a", 167.3, "didn't,"), "bankrupt": ("a", 169.6, "bankrupt.")},
         direction="Drawn worlds go full screen (standing correction 2026-10-17). Contrast takeover on the paper page with ink dust and the 1.00->1.03 drift. Left: a drawn video-rental shelf of VHS tapes with a blue-ticket shop sign, no logo (never a real brand mark). Right: the same shelf rebuilt as a screen grid of tiles with a small bar chart beside it. Both sides visible from the first frame, right side dimmed until 'Netflix'. On 'Netflix' the right side lifts to full ink and its chart's bars grow, one bar $accent ('read the data'). On 'didn't' the left side's shelf stays static and greys. On 'bankrupt' a CLOSED card swings on the left door on a nail (0.6s, back.out) and the left side fades to 40%. Hard cut in, hard cut out."),
    dict(id="g03", kind="diagram", cls="overlay", scene="loop", start=("a", 181.9, "integrating"), end=("a", 215.9, "times.", "+HOLD"),
         cues={"cleansing": ("a", 184.0, "cleansing,"), "curating": ("a", 184.6, "curating,"), "aggregating": ("a", 185.9, "aggregating"), "thanksgiving": ("a", 198.6, "Thanksgiving"), "forecasting": ("a", 210.8, "forecasting,"), "future": ("a", 212.9, "future.")},
         direction="The good old data days, step-built in heroLeft. On 'integrating' four small source glyphs (a table, a log page, a CSV sheet, a cylinder) drop in along the top. Pipe lines draw from them into one channel as each verb lands: 'cleansing' a sieve on the channel, 'curating' the stream sorts into colour lanes, 'aggregating' the lanes merge into a bar chart below. On 'Thanksgiving' one bar rises taller, $accent, with a tiny drawn turkey-leaf label 'THANKSGIVING' 22px. On 'forecasting' a dashed line extends the bars into the future; on 'future' it reaches the card edge. Dots keep flowing through the pipes the whole beat."),
    dict(id="g04", kind="card", cls="overlay", scene="analogy", start=("a", 323.0, "down"), end=("a", 369.1, "engineer.", "+HOLD"),
         cues={"ml": ("a", 324.1, "ml"), "bazillion": ("a", 326.5, "bazillion"), "rule": ("a", 328.5, "rule"), "wait": ("a", 333.7, "wait"), "inconsistent": ("a", 342.5, "inconsistent"), "every": ("a", 345.5, "every"), "hallucinate": ("a", 353.0, "hallucinate"), "forget": ("a", 356.5, "forget"), "data": ("a", 364.0, "data"), "ai": ("a", 367.0, "AI")},
         direction="The model as the style's brain in a jar (recurringObjects.model), heroLeft. On 'down' three small classic-ML boxes (a tree, a line fit, a k-means blob) slide out of the card to the left. On 'bazillion' the jar swells to fill the card and a digit counter on its label runs up 1,000,000,000... (seek-safe, from time). On 'rule' a drawn crown drops onto the lid (bounce.out). 'wait': the crown tilts. 'inconsistent': a question mark goes in, three different numbers come out in speech bubbles one after another on 'every' (42%, 37%, 51%: deliberately different, no meaning). 'hallucinate': a fourth bubble shows a drawn unicorn. 'forget': the bubbles pop in reverse. 'AI': the crown slides off. One $accent: the crown."),
    dict(id="g05", kind="diagram", cls="overlay", scene="analogy", start=("a", 394.4, "It"), end=("a", 421.6, "building"),
         cues={"guardrails": ("a", 395.6, "guardrails"), "connectors": ("a", 398.3, "connectors"), "databases": ("a", 400.3, "databases.")},
         direction="The same jar, now the centre of a construction site, as a CARD (heroLeft) for its first stretch: 'guardrails' a fence rail draws around the jar; 'connectors' cables run out to the DB cylinders. A small engineer walks between the pieces. At 'building retrieval systems' it MATCH-CUTS to g05x full screen (style 2026-09-30: the takeover's first frame redraws this card's last frame at the same pixels and grows from its rect). Hybrid adopted overnight 2026-10-28 from the round-2 composition review: drawn worlds go full screen (2026-10-17) and takeovers cap at 20s (style.json), and this split satisfies both."),
    dict(id="g05x", kind="takeover", cls="overlay", scene="analogy", start=("a", 421.6, "building"), end=("a", 452.5, "chore.", "+HOLD"),
         cues={"retrieval": ("a", 421.6, "retrieval"), "vector": ("a", 423.0, "vector"), "context": ("a", 440.7, "context"), "chore": ("a", 452.0, "chore.")},
         direction="g05's construction site continued FULL SCREEN (paper page, dust, grain, drift), entered by match-cut from g05's card rect: 'retrieval' the index-card drawer with arrows into the jar; 'vector' a scatter of dots on its front card; 'context' a pipe from the drawer feeds the jar's lid, liquid rises; on 'chore' the engineer sits down on a bench. The pipe is the one accent. Dots flow in the pipe throughout."),
    dict(id="g06", kind="card", cls="overlay", scene="strike-list", start=("a", 496.3, "after"), end=("a", 515.4, "robotics.", "+HOLD"),
         cues={"mcps": ("a", 497.5, "MCPs"), "rags": ("a", 498.1, "RAGs,"), "vector": ("a", 500.0, "vector"), "ai": ("a", 502.0, "AI"), "context": ("a", 509.0, "context"), "joy": ("a", 512.6, "joy"), "robotics": ("a", 514.9, "robotics.")},
         direction="Strike-list in heroLeft, header 'TWO YEARS OF' eyebrow 28px. Rows land on their cues and get a $muted strike 0.3s after: MCP SERVERS / RAG / VECTOR DATABASES / AI-ASSISTED DATA ENGINEERING / CONTEXT ENGINEERING. On 'joy' the struck stack slides down and dims; on 'robotics' the series humanoid (recurringObjects.robot) walks into the freed space holding a small data sheet, the one $accent element its sheet."),
    dict(id="g07", kind="diagram", cls="overlay", scene="loop", start=("a", 524.8, "I"), end=("a", 543.4, "robotics.", "+HOLD"),
         cues={"profiling": ("a", 526.1, "profiling,"), "forming": ("a", 531.9, "forming"), "observing": ("a", 533.5, "observing"), "prove": ("a", 535.5, "prove"), "disprove": ("a", 536.0, "disprove")},
         direction="The video's spine: the hypothesis loop, planted here and returned to at every aha. A closed ring of four nodes, OBSERVE -> HUNCH -> TEST -> DATA ANSWERS, 22px tracked caps on paper backings. The ring draws on 'profiling'; nodes lift to $accent in turn on 'observing', 'forming', 'prove' (TEST), 'disprove' (DATA ANSWERS shows two small marks: a tick and a cross). A dot travels the ring continuously. The ring's geometry is reused exactly in g15, g19, g23 and g26 with its state changed."),
    # ---------------------------------------------------------------- Part 2 ------------------
    dict(id="g08", kind="diagram", cls="overlay", scene="analogy", start=("b", 10.6, "garbage"), end=("b", 70.1, "take.", "+HOLD"),
         cues={"out": ("b", 11.7, "out."), "exploratory": ("b", 24.0, "exploratory"), "plot": ("b", 31.0, "plot"), "outliers": ("b", 34.5, "outliers,"), "curve": ("b", 37.5, "curve."), "proper": ("b", 48.0, "proper"), "robotics": ("b", 52.9, "robotics"), "policy": ("b", 66.6, "policy"), "robot": ("b", 69.5, "robot")},
         direction="Garbage in, garbage out, then why profiling exists (heroLeft). On 'garbage' a funnel draws; scrap shapes (a bent bolt, a crumpled page) drop in and the same scrap comes out the bottom on 'out'. On 'exploratory' the funnel becomes a magnifier (the hook lens returns small) over a scatter; on 'plot' a fitted curve draws through it; on 'outliers' one dot far off the curve rings $accent; on 'curve' the ring pulses. On 'robotics' the scatter clears and the series humanoid stands at a table with a cup; on 'policy' it reaches and misses the cup (honest motion: the cup stays put, the gripper closes on air); on 'robot' it looks at its empty gripper."),
    dict(id="g09", kind="screenshot", cls="overlay", scene="contrast", start=("b", 80.0, "PUSH-T"), end=("b", 92.4, "freedom.", "+HOLD"),
         cues={"pusht": ("b", 80.0, "PUSH-T"), "aloha": ("b", 84.7, "ALOHA"), "arms": ("b", 89.0, "arms"), "freedom": ("b", 92.0, "freedom.")},
         direction="The two datasets as REAL frames (real assets over recreations): two tiles in heroLeft taken from this session's own screen recording, the Rerun image panel. PUSH-T (the 96x96 T and pusher, upscaled nearest-neighbour so it reads as pixels, labelled 'PUSH-T  ·  1 ARM, 2 MOTORS') lands on 'PUSH-T'. On 'ALOHA' the second tile (the top-down two-arm frame) lands beside it, labelled 'ALOHA INSERTION  ·  2 ARMS, 14 JOINTS', dimmed until 'arms'. One $accent rule under the label being spoken."),
    dict(id="g10", kind="diagram", cls="overlay", scene="analogy", start=("b", 133.9, "episode."), end=("b", 209.8, "others.", "+HOLD"),
         cues={"attempt": ("b", 152.4, "attempt"), "frame": ("b", 162.8, "frame"), "camera": ("b", 165.7, "camera"), "action": ("b", 178.8, "action"), "state": ("b", 182.0, "state"), "leader": ("b", 190.5, "leader"), "follower": ("b", 191.5, "follower"), "joint": ("b", 203.5, "joint"), "more": ("b", 207.6, "more")},
         direction="The five words, step-built (style 'cards that build in steps'), one drawing per word in heroLeft. 'episode' / 'attempt': a film strip draws left to right, first cell the T far from its outline, last cell the T on it, label EPISODE. 'frame': one cell lifts out and enlarges, label FRAME. 'action' and 'state': the strip slides up and the leader and follower SO-101 arms draw (reuse 01's leader/follower art); on 'leader' an arrow labelled ACTION runs from leader to follower, on 'follower' the follower's joints follow with a lag, label STATE. 'joint': one joint ring on the follower pulses $accent, label JOINT; on 'more' the ALOHA pair of arms ghost in behind with more rings."),
    dict(id="g11", kind="diagram", cls="overlay", scene="strike-list", start=("b", 218.0, "profiler."), end=("c", 151.3, "outcomes", "+HOLD"),
         cues={"checking": ("b", 224.0, "checking"), "letters": ("b", 226.7, "letters"), "AI": ("b", 228.7, "I."), "A": ("b", 245.4, "A,"), "B": ("c", 11.1, "B,"), "C": ("c", 37.6, "C,"), "D": ("c", 45.9, "D."), "E": ("c", 62.6, "E."), "F": ("c", 81.1, "F,"), "G": ("c", 97.4, "G,"), "H": ("c", 122.1, "H,"), "I": ("c", 140.2, "i")},
         direction="THE NINE CHECKS (script cue: 'Show the table on screen'). Tall card in the column zone (432 x 812). Header 'THE PROFILER' eyebrow, then nine rows, each a letter disc + name 30px 700 + one-line question 22px 500 $muted, landing ON its spoken letter (A ... I). Exact script table copy: A Overview / B Episode lengths / C Frame timing / D Video windows / E Action / F Idle and dead / G State / H Cameras / I Outcomes. The row being spoken carries the one $accent disc; earlier rows settle to $ink. 2.5 minutes: a soft paper light band sweeps down the landed rows every 3s so the card never stills. This card returns in the demo (g17) with ticks."),
    dict(id="g12", kind="diagram", cls="overlay", scene="map", start=("c", 166.8, "So"), end=("c", 205.7, "demo.", "+HOLD"),
         cues={"pusht": ("c", 169.5, "Push-T,"), "aloha": ("c", 182.2, "Aloha"), "actual": ("c", 186.5, "actual"), "two": ("c", 190.6, "two"), "real": ("c", 203.2, "real")},
         direction="Series map, first visit (style `map`, on trial techniques). Card in heroLeft: three nodes left to right, PUSH-T (sim) / ALOHA (sim) / SO-101 (real), dashed placeholders from frame 1. 'Push-T' lights its node (last week tick small below: WEEK 1). 'Aloha' lights the second. 'actual' the SO-101 node draws in dashed $muted with 'NEXT WEEK' under it. 'two' brackets the two sim nodes. 'real' an arrow from ALOHA to SO-101 draws dashed. SO-101 is the $accent node. Dots travel the lit edge. Returned to in g26."),
    # ---------------------------------------------------------------- the demo ----------------
    dict(id="gD", kind="takeover", cls="segment", scene="demo", start=("c", 228.6, "So"), end=("d", 1718.6, "demo", "+HOLD"),
         direction="The demo scene: the screen recording full frame with the face inset bottom-right (style.json graphics.pip.demoInset), composited in FFmpeg, entering once on the cut and leaving once. Corner, hides and the Rerun spans come from demo-spec.json measured from the screen (bottom-right is empty notebook gutter on most of the notebook; the Rerun viewer gets measured). Every part below sits over it."),
    dict(id="gZ0", kind="zoom", cls="overlay", scene="self-demonstrating", start=("c", 264.4, "So"), end=("c", 272.0, "outcomes.", 1.5),   # 1.5s: the speaker scrolls 0.33s after "outcomes."; the zoom-out (1.2s) starts on that scroll
         cues={"checks": ("c", 266.5, "checks"), "overview": ("c", 270.0, "overview"), "outcomes": ("c", 271.5, "outcomes.")},
         direction="Legibility punch-in (style: a demo stretch of 60s+ with no graphic gets one on what is being read; 7:37-9:40 was bare). The notebook's own nine-checks table, the real asset behind g11: zoom on its rows as he says 'the different kinds of checks', a paper underline under row A on 'overview' and under row I on 'outcomes'."),
    dict(id="gS", kind="diagram", cls="overlay", scene="contrast", start=("c", 302.1, "And"), end=("c", 348.7, "cluster.", "+HOLD"),
         cues={"lastweek": ("c", 304.8, "last"), "duckdb": ("c", 305.6, "DuckDB."), "sql": ("c", 309.1, "SQL."), "pyspark": ("c", 317.3, "PySpark"), "complex": ("c", 323.0, "complex,"), "scale": ("c", 333.7, "scale,"), "databricks": ("c", 342.0, "Databricks"), "emr": ("c", 345.3, "EMR"), "cluster": ("c", 348.7, "cluster.")},
         direction="Added after the composition review (8:03-9:40 had 97s with no graphic). DuckDB last week, PySpark this week: an opaque contrast card in the notebook's right margin. Left: a single drawn database cylinder labelled DUCKDB with 'just write SQL' (lands on 'DuckDB.', 'SQL.'). On 'PySpark' the right side lights: the same notebook glyph labelled PYSPARK. On 'scale' the notebook glyph copies out along a drawn arrow into a row of three small cluster nodes; on 'Databricks' and 'EMR' two of them take tiny labels (DATABRICKS, AWS EMR, 20px caps), on 'cluster' the third takes YOUR OWN. The arrow is the one accent. Same notebook, scaled out."),
    dict(id="gZ8", kind="zoom", cls="overlay", scene="self-demonstrating", start=("c", 678.702, "Uh,"), end=("c", 748.125, "variance"),
         cues={"sideways": ("c", 679.853, "sideways"), "most": ("c", 683.794, "most"), "top": ("c", 690.335, "top."),
               "p99": ("c", 730.19, "99"), "p122": ("c", 732.352, "122"), "p148": ("c", 735.174, "148"),
               "bottom": ("c", 741.54, "bottom"), "topend": ("c", 743.922, "top")},
         direction="Added after the finished-cut composition review (11:13-12:26 ran 72s bare, over the 60s demo rule). Two legibility punch-ins on the notebook's plots, split at his measured re-run and scrolls (698.1, 699.7-709.4). gZ8a the sorted episode-length S-curve: an ink trace along the real curve on 'sideways S curve', a bracket on the flat middle on 'most of the episodes', the accent ring on the steep top end on 'outliers at the top'. gZ8b the percentile plot: ink rings where the 25th/50th/75th lines meet the curve on '99', '122', '148', then the bottom end on 'bottom' and the accent ring on the top end on 'top end'. Plants the S-curve that g20 redraws."),
    dict(id="gZ9", kind="zoom", cls="overlay", scene="self-demonstrating", start=("d", 1316.673, "loaded"), end=("d", 1360.929, "inserts", "+HOLD"),
         cues={"blue": ("d", 1334.557, "blue"), "red": ("d", 1338.458, "red"), "rerun": ("d", 1348.44, "rerun"),
               "blueone": ("d", 1355.245, "blue"), "redone": ("d", 1356.646, "red"), "inserts": ("d", 1360.929, "inserts")},
         direction="Added after the finished-cut composition review (24:50-25:51 ran 60s bare; ALOHA had no Rerun punch-in against Push-T's two). Punch-in at 2.0 on Rerun's observation.images.top panel (the two arms), clear of the face inset. Paper rings FOLLOW the blue and red blocks (measured by colour 10x a second): blue on 'blue rectangle', red on 'red rectangle'; after he re-runs, blue again on 'the blue one picks it up', red on 'the red one picks it up', and on 'the red one inserts' the accent ring on the red block as it goes in."),
    dict(id="gZ5", kind="zoom", cls="overlay", scene="self-demonstrating", start=("d", 22.0, "nothing"), end=("d", 42.6, "frames.", "+HOLD"),
         cues={"t": ("d", 26.0, "T"), "outline": ("d", 28.6, "outline"), "moves": ("d", 33.3, "moves"), "frames": ("d", 42.6, "frames.")},
         direction="Added after the composition review (13:31-15:02 had 91s with no mark on the evidence). Punch-in on Rerun's observation.image panel while episode 184 plays: a paper ring on the T on 'T', a paper ring on its target outline on 'outline', and on 'moves' a short paper arc from one to the other: the T was simply far from the outline."),
    dict(id="gZ6", kind="zoom", cls="overlay", scene="self-demonstrating", start=("d", 68.0, "Here"), end=("d", 84.6, "obvious.", 0.6),
         cues={"t": ("d", 69.1, "T"), "mirror": ("d", 71.8, "mirror"), "outline": ("d", 73.3, "outline"), "moves": ("d", 80.3, "moves")},
         direction="Punch-in on Rerun's image panel for episode 174: a paper ring on the T on 'T', on 'mirror' a paper ring on the outline and a curved arrow between them showing the half turn: the T started mirror-opposite to where it had to go."),
    dict(id="gZ1", kind="zoom", cls="overlay", scene="self-demonstrating", start=("c", 503.6, "so"), end=("c", 531.6, "motors.", "+HOLD"),
         cues={"206": ("c", 505.9, "206"), "25k": ("c", 508.3, "25k"), "10": ("c", 513.5, "10"), "motors": ("c", 516.3, "motors,")},
         direction="Punch-in on the overview cell output as it is read (OCR-timed, legibility punch-in). Paper underlines land on total_episodes 206, total_frames 25,650 and fps 10 on their spoken numbers, snapped to the real glyph ends (snap_marks.py)."),
    dict(id="gZ2", kind="zoom", cls="overlay", scene="self-demonstrating", start=("c", 560.7, "So"), end=("c", 626.2, "good", "+HOLD"),
         cues={"min": ("c", 575.0, "minimum"), "max": ("c", 578.0, "max"), "average": ("c", 612.0, "average")},
         direction="Punch-in on the episode-length stats (metadata vs data): paper boxes on 49 (min), 246 (max) and ~124 (average) on their words, an $accent tick where 'the metadata and data agree here'."),
    dict(id="gZ3", kind="zoom", cls="overlay", scene="self-demonstrating", start=("c", 762.1, "So"), end=("c", 810.4, "174.", "+HOLD"),
         cues={"49": ("c", 774.0, "49."), "fences": ("c", 784.6, "1.5"), "184": ("c", 808.5, "184"), "174": ("c", 810.0, "174.")},
         direction="Punch-in on the IQR cell: box on 'IQR 49' on its word, underline on the 1.5x fences, then an $accent box on the outlier table rows 184 and 174 as each is named. The loop's TEST node is not shown here; this is the evidence."),
    dict(id="g13", kind="card", cls="overlay", scene="loop", start=("c", 813.3, "So"), end=("c", 833.7, "rerun.", "+HOLD"),
         cues={"hunch": ("c", 826.0, "hunch"), "training": ("c", 832.0, "training,")},
         direction="Hypothesis loop, return 1 (the g07 ring, card opaque over the screen, placed where the measured screen has least text). HUNCH lifts $accent with its text in 26px: '184 and 174 are bad data'. On 'training' TEST lights: 'look at them in Rerun'."),
    dict(id="g14", kind="card", cls="overlay", scene="loop", start=("d", 85.8, "So"), end=("d", 107.4, "on.", "+HOLD"),
         cues={"legitimate": ("d", 96.0, "legitimate"), "wrong": ("d", 104.5, "wrong,")},
         direction="Hypothesis loop, return 1 resolved. DATA ANSWERS lights: 'Hard starts, not mistakes'. On 'legitimate' a drawn tick lands beside 'KEEP THEM'. On 'wrong' the HUNCH node gets a $muted strike (the hunch, not the data, was wrong). Win marked as loudly as any miss (standing correction 2026-09-23)."),
    dict(id="g15", kind="diagram", cls="overlay", scene="contrast", start=("d", 112.8, "So"), end=("d", 153.5, "salt.", "+HOLD"),
         cues={"frame": ("d", 114.5, "frame"), "timestamp": ("d", 117.5, "timestamp"), "fps": ("d", 120.0, "frames"), "real": ("d", 135.5, "real"), "recorder": ("d", 140.0, "recorder"), "calculated": ("d", 143.5, "calculated."), "salt": ("d", 153.0, "salt.")},
         direction="Check C can't fail (aha 2). Opaque card: three small chips FRAME INDEX / TIMESTAMP / FPS land on their words. On 'real' an equation draws: timestamp = frame_index / fps, and a loop arrow closes from the result back to frame_index: the check compares a number with itself. On 'recorder' a small recorder glyph stamps the timestamps; on 'calculated' the equation's '=' turns $accent. On 'salt' a tiny salt shaker tips once. No strike: the check passes, it just cannot see."),
    dict(id="g16", kind="diagram", cls="overlay", scene="strike-list", start=("d", 189.7, "And"), end=("d", 417.9, "me.", "+HOLD"),
         cues={"D": ("d", 191.5, "empty"), "E": ("d", 249.5, "null"), "F": ("d", 316.0, "idle"), "H": ("d", 375.0, "camera"), "I": ("d", 391.9, "this")},
         direction="The nine checks return (g11's card, scaled to 60% in the screen's measured emptiest corner, opaque). Rows A, B and C already carry ticks from earlier. Each result lands its tick on its cue: D 'empty' (no mismatches), E 'null' (no nulls), F 'idle' (zero idle, zero dead), H 'camera' (one camera, 96x96, AV1), I 'this' (reward present). G gets a $muted 'same as E'. Ticks are $ink; the current row's disc is the one $accent. Between ticks the card slides out to the edge (0.35s) so it is on screen only around each result, about 8s each."),
    dict(id="g17", kind="stat", cls="overlay", scene="contrast", start=("d", 436.0, "so"), end=("d", 514.9, "assume.", "+HOLD"),
         cues={"quality": ("d", 444.5, "quality"), "plot": ("d", 467.0, "plot"), "correlation": ("d", 497.0, "correlation"), "001": ("d", 499.5, "0.01"), "outlining": ("d", 513.3, "outlining.")},
         direction="Aha 3. Hypothesis loop, return 2: HUNCH 'reward tracks demo quality'. On 'correlation' a stat panel: 'length vs reward' and the number counting up to 0.01 landing ON '0.01' (160px display). On 'outlining' DATA ANSWERS lights: 'reward scores the final fit'."),
    dict(id="g18", kind="stat", cls="overlay", scene="contrast", start=("d", 679.7, "So"), end=("d", 755.8, "beautiful", 3.7),
         cues={"hunch": ("d", 681.2, "hunch"), "002": ("d", 703.0, "0.02,"), "conclude": ("d", 711.5, "conclude"), "disproved": ("d", 754.0, "disproved"), "beautiful": ("d", 755.4, "beautiful")},
         direction="Aha 4, the same panel as g17 (one card returning, state changed). HUNCH: 'path length measures effort'. Count-up to 0.02 on '0.02'. On 'disproved' both hunches (g17's and this) stack with $muted strikes and the DATA ANSWERS node takes a $accent tick: 'which is beautiful' lands as the tick settles."),
    dict(id="g19", kind="diagram", cls="overlay", scene="analogy", start=("d", 776.2, "simulation,"), end=("d", 794.1, "tandem.", "+HOLD"),
         cues={"arms": ("d", 781.0, "arms,"), "insert": ("d", 783.5, "insert"), "tandem": ("d", 793.6, "tandem.")},
         direction="ALOHA explained with the series' SO-101 line art doubled: two arms face each other on 'arms'; the left picks up a drawn peg, the right a socket; on 'insert' they meet and the peg seats (honest motion: grippers hold what they move). On 'tandem' both arms' joint rings pulse together. Opaque card over the notebook, placed in the measured emptiest area."),
    dict(id="g20", kind="takeover", cls="segment", scene="contrast", start=("d", 896.4, "And"), end=("d", 911.4, "curious.", "+HOLD"),
         cues={"500": ("d", 904.5, "500"), "flat": ("d", 906.5, "flat"), "none": ("d", 909.3, "None")},
         direction="THE TURNING POINT (aha 5), the demo's one takeover: full-screen contrast on paper with dust and drift. Same axes both sides: left PUSH-T, the sideways S-curve of sorted episode lengths (49 to 246), right ALOHA, dimmed until '500'. On '500' the right side lifts and a perfectly flat line draws at 500. On 'flat' the flat line turns $accent. On 'None' the left curve's two top dots (184, 174) pulse once, then still. The point: the same ruler is useless on a new dataset. Hard cut in from the screen, hard cut back; the face inset hides for the takeover and returns."),
    dict(id="g21", kind="diagram", cls="overlay", scene="loop", start=("d", 1110.3, "But"), end=("d", 1190.4, "that.", "+HOLD"),
         cues={"same": ("d", 1121.0, "same"), "fixed": ("d", 1127.5, "fixed"), "improbable": ("d", 1143.8, "improbable"), "failed": ("d", 1159.7, "failed,"), "tail": ("d", 1167.2, "tail"), "idle": ("d", 1170.5, "idle."), "hunch": ("d", 1171.5, "hunch."), "100": ("d", 1178.4, "100")},
         direction="Aha 6 setup. Eight identical 500-frame bars stack on 'same' (all the same length). On 'fixed' a stopwatch glyph above them. On 'failed' one bar's robot icon slumps. On 'tail' the last 100 frames of every bar shade as TAIL ('100' lands its label). Hypothesis loop node HUNCH lifts: 'an idle tail means a failed episode'."),
    dict(id="g22", kind="diagram", cls="overlay", scene="contrast", start=("d", 1363.6, "And"), end=("d", 1541.2, "great.", "+HOLD"),
         cues={"jerky": ("d", 1366.0, "jerky"), "accomplished": ("d", 1405.5, "accomplished."), "smooth": ("d", 1481.0, "smooth"), "love": ("d", 1514.5, "love"), "good": ("d", 1528.5, "good,")},
         direction="Aha 6 resolved, the biggest aha. The g21 bars return with two lit. On 'jerky' bar 'EPISODE 3' gets a busy squiggle in its tail labelled 'LAST-MINUTE CORRECTION'. On 'accomplished' a tick. On 'smooth' bar 'EPISODE 5' gets a calm line in its tail labelled 'SMOOTH INSERTION', tick. On 'love' the loop returns small: HUNCH struck, DATA ANSWERS $accent: 'busy tail = correction, not failure'. Placed clear of the Rerun robot view (measured)."),
    dict(id="g23", kind="diagram", cls="overlay", scene="self-demonstrating", start=("d", 1589.8, "the"), end=("d", 1651.3, "fine", 1.2),
         cues={"busiest": ("d", 1606.4, "busiest"), "steady": ("d", 1622.5, "steady"), "lelbow": ("d", 1637.1, "elbow."), "lwrist": ("d", 1640.0, "wrist"), "relbow": ("d", 1643.0, "elbow."), "rwrist": ("d", 1646.4, "wrist"), "elbows": ("d", 1648.0, "elbows"), "fine": ("d", 1651.3, "fine")},
         direction="Aha 7. The g19 ALOHA arm pair returns, larger, with all 14 joint rings. On 'busiest' four rings light $ink; on 'steady' joints 6 and 3 dim with a still marker. Then each named joint pulses on its word with its label: LEFT ELBOW, LEFT WRIST ANGLE, RIGHT ELBOW, RIGHT WRIST ANGLE (only the current one $accent)."),
    dict(id="gZ7", kind="zoom", cls="overlay", scene="self-demonstrating", start=("d", 1214.7, "So,"), end=("d", 1272.8, "these.", "+HOLD"),
         cues={"low": ("d", 1219.8, "low"), "top": ("d", 1241.6, "top"), "busy": ("d", 1244.8, "busy."), "median": ("d", 1270.4, "median,")},
         direction="Legibility punch-in on the tail-motion table (23:59-25:50 had 111s with no graphic). Paper boxes on the rows whose tail motion is very low on 'low', then on the top three busy-tail rows on 'top' / 'busy', then the median rows on 'median'. Frame each block where it sits at that moment (the output may scroll: split the stop at a scroll, never let a mark outlive its text)."),
    dict(id="gZ4", kind="zoom", cls="overlay", scene="self-demonstrating", start=("d", 1678.8, "Aloha"), end=("d", 1718.6, "demo", "+HOLD"),
         cues={"fps": ("d", 1679.8, "FPS,"), "episodes": ("d", 1683.0, "episodes."), "14": ("d", 1695.0, "14"), "camera": ("d", 1704.0, "camera"), "clean": ("d", 1715.9, "clean")},
         direction="Punch-in on the notebook's comparison table (the real summary). Paper underlines on each row as it is read (fps 50 vs 10, episodes 50 vs 206, action size 14 vs 2, one camera each); on 'clean' an $accent tick on the whole table."),
    # ---------------------------------------------------------------- the close ---------------
    dict(id="g24", kind="diagram", cls="overlay", scene="map", start=("d", 1783.0, "And"), end=("d", 1798.9, "week.", "+HOLD"),
         cues={"two": ("d", 1786.0, "two"), "standard": ("d", 1791.0, "standard"), "real": ("d", 1795.2, "real-world"), "test": ("d", 1797.5, "test")},
         direction="The series map returns (map second visit, g12's geometry). PUSH-T and ALOHA nodes now carry ticks on 'two'. On 'standard' a LEROBOT v3 bracket draws under all three nodes. On 'real' the SO-101 node turns from dashed to solid outline, still unlit; on 'test' 'NEXT WEEK' pulses."),
    dict(id="gP2", kind="zoom", cls="segment", scene="push", start=("d", 1831.4, "finally"), end=("d", 1846.3, "fun", "+HOLD"), eye=(1880, 920),
         direction="Slow push on the face under the VERDICT (g25), 1.00 -> 1.06, power1.inOut, anchored on the eyes (take d, ~1880, 920 in 4K). Added after round-2 review: the verdict card shares the close's card rect with the maps around it, and the style's push is the tool for payoff lines; the card stays a card (text beats stay cards)."),
    dict(id="g25", kind="card", cls="overlay", scene="card", start=("d", 1831.4, "finally"), end=("d", 1847.0, "fun", "+HOLD"),
         cues={"enjoyed": ("d", 1833.0, "enjoyed"), "fun": ("d", 1846.5, "fun")},
         direction="VERDICT, the biggest type in the video, heroLeft (180px exception): eyebrow 'DATA WAS FUN ONCE.' (the hook's line, 28px $muted) lands on 'finally'; the headline 'Fun again.' at 180px lands on 'enjoyed'; the $accent rule draws under it on 'fun'. The hook lens (motif) returns small in the corner, over a single dot that is now part of a line. Copy is a proposal for the human: the spoken line is 'I enjoyed data engineering, data analysis after a long time ... it was fun'."),
    dict(id="g26", kind="diagram", cls="overlay", scene="map", start=("d", 1876.1, "So"), end=("d", 1914.7, "adapted.", "+HOLD"),
         cues={"real": ("d", 1878.5, "real"), "arms": ("d", 1881.0, "arms"), "six": ("d", 1888.0, "six"), "wrist": ("d", 1890.5, "wrist"), "observation": ("d", 1892.0, "observation"), "hugging": ("d", 1902.0, "Hugging"), "survives": ("d", 1912.0, "survives"), "breaks": ("d", 1913.0, "breaks")},
         direction="Next week, the map's payoff: the SO-101 node lights $accent on 'real' and opens as a lens (style `lens`): inside, two drawn SO-101 arms on 'arms', then step-built chips 6 JOINTS (on 'six'), WRIST CAMERA, TOP CAMERA. On 'Hugging' a small fallback tag 'or a public SO-101 set'. On 'survives' / 'breaks' the nine-check letters A-I run along the lens rim, some ticked, some with question marks."),
    dict(id="g27", kind="card", cls="overlay", scene="chip", start=("d", 1954.3, "So"), end=("d", 1966.2, "episode.", "+HOLD"),
         cues={"tell": ("d", 1958.7, "tell"), "comment": ("d", 1963.1, "comment")},
         direction="Call to action chip in heroLeft: 'WHAT ELSE DO YOU CHECK?' lands on 'tell', a drawn speech bubble with a pencil writing three dashes on 'comment'. No em-dashes."),
    dict(id="g28", kind="card", cls="overlay", scene="self-demonstrating", start=("d", 1969.5, "And"), end=("d", 1980.5, "Halloween.", "+HOLD"), alt_of="g28b",  # the human signed off g28b (festive) 2026-10-28; g28 kept for reference
        
         cues={"pumpkin": ("d", 1972.0, "pumpkin"), "halloween": ("d", 1980.0, "Halloween.")},
         direction="OPTIONAL, playful: the speaker points out the room's decorations. A small $accent ring and a hand-drawn arrow land on the real pumpkin in frame on 'pumpkin' (measured position, right of the face), a tiny 'HAPPY HALLOWEEN' 22px label on 'Halloween'. Never over the face. Offered as a choice: keep or drop."),
    dict(id="g28b", kind="card", cls="overlay", scene="self-demonstrating", start=("d", 1969.5, "And"), end=("d", 1980.5, "Halloween.", "+HOLD"),
         cues={"pumpkin": ("d", 1972.0, "pumpkin"), "halloween": ("d", 1980.0, "Halloween.")},
         direction="ALTERNATE of g28, the human's direction 2026-10-28: festive, not a ring on the pumpkin. Drawn pumpkins (accent), ghosts (paper, ink eyes) and fall leaves (accent, accent-soft, muted) rain across the frame: a few leaves on 'spiders and pumpkin things', building on 'time of the year'. 'Happy Halloween!' in Creepster (assets/fonts/creepster, OFL, the human's call) drops in letter by letter on 'happy Halloween' in the left zone. Everything fades over the last 0.35s into g29."),
    dict(id="g29", kind="card", cls="overlay", scene="card", start=("d", 1981.3, "And"), end=("d", 1982.3, "week.", "END"),
         direction="End card, links from brand.md, an overlay beside the face in the left column. No channel is named in the closing lines, so every row lands together on 'see you next week' (brand.md noCueFallback), the 05/01 anatomy: channel eyebrow, label over value rows, one $accent rule under the first row. The video ends about 2.3s after the sign-off, before the speaker turns away (measured: he turns at 1984.8, the tail hold runs to 1984.67)."),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--edit-cutsheet", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--plan-md", required=True)
    a = ap.parse_args()
    cs = json.load(open(a.edit_cutsheet)); fps = cs["fps"]
    words = cs["words"]
    segs, acc = [], 0
    for g in cs["segments"]:
        segs.append((g["session"], g["start"], g["end"], acc / fps)); acc += g["outFrames"]
    total = acc / fps
    snap = lambda t: round(round(t * fps) / fps, 4)

    def to_cut(sid, t):
        for s, a0, a1, c0 in segs:
            if s == sid and a0 - 0.05 <= t <= a1 + 1e-6:        # a word starting just before its segment's first frame
                return c0 + max(t, a0) - a0
        return None

    bad = []
    def cue(c, use_end=False):
        sid, t, word = c[0], c[1], c[2]
        cand = [w for w in words if w["session"] == sid and abs(w["start"] - t) <= CUE_TOLERANCE
                and norm(w["word"]) == norm(word)]
        cand = [w for w in cand if to_cut(sid, w["start"]) is not None]
        if not cand:
            bad.append(f"{sid} {t} {word!r}"); return None
        w = min(cand, key=lambda w: abs(w["start"] - t))
        x = to_cut(sid, w["end"] if use_end else w["start"])
        if x is None:
            x = to_cut(sid, w["start"]) + (w["end"] - w["start"])
        return x

    out = []
    for p in PARTS:
        s = cue(p["start"])
        e_spec = p["end"]
        if len(e_spec) > 3 and e_spec[3] == "END":
            e = total
        else:
            e = cue(e_spec, use_end=True)
            if e is not None and len(e_spec) > 3 and e_spec[3] == "+HOLD":
                e += HOLD
            elif e is not None and len(e_spec) > 3 and isinstance(e_spec[3], (int, float)):
                e += e_spec[3]               # an explicit hold, in seconds
        cues = {k: cue(v) for k, v in p.get("cues", {}).items()}
        if s is None or e is None or any(v is None for v in cues.values()):
            continue
        out.append({"id": p["id"], "start": snap(s), "end": snap(min(e, total)), "kind": p["kind"],
                    "class": p["cls"], "scene": p["scene"], "direction": p["direction"],
                    "cues": {k: snap(v) for k, v in cues.items()},
                    **({"eye": list(p["eye"])} if "eye" in p else {}),
                    **({"altOf": p["alt_of"]} if "alt_of" in p else {}),
                    **({"keepEnd": True} if p.get("keep_end") else {}),
                    # how assemble.py composites it (01's convention): punch-in marks ride on the demo scene
                    "builtBy": "push" if p["scene"] == "push" else "demo_scene+hyperframes" if p["kind"] == "zoom" else "hyperframes"})
    if bad:
        sys.exit("cue words not found where planned (the cut moved, or the word is mis-specified):\n  " + "\n  ".join(bad))
    for p in out:
        for k, v in p["cues"].items():
            if not p["start"] - 0.5 <= v <= p["end"]:
                sys.exit(f"{p['id']}: cue {k} at {v} falls outside its part {p['start']}-{p['end']}")
    out.sort(key=lambda p: (p["start"], p["id"]))
    # FFmpeg geometry on the base (the push, the demo scene) and hook alternates live beside the parts,
    # as on 01: they are not layers in the part sequence
    # the demo scene spans the cutsheet's demo SECTION (its first segment's lead-in to its last tail),
    # not the first and last words: the screen track is cut on exactly those frames
    acc_, dsec = 0, []
    for g in cs["segments"]:
        if g["section"] == "demo": dsec.append((acc_, acc_ + g["outFrames"]))
        acc_ += g["outFrames"]
    for p in out:
        if p["scene"] == "demo":
            p["start"], p["end"] = round(dsec[0][0] / fps, 4), round(dsec[-1][1] / fps, 4)
    D_END = round(dsec[-1][1] / fps, 4)
    for p in out:                    # a part that lives on the screen never outlives the screen (gZ4's hold ran 1.2s past it)
        if p["scene"] != "demo" and dsec[0][0] / fps <= p["start"] < D_END:
            p["end"] = min(p["end"], D_END)
    pushes = [p for p in out if p["scene"] == "push"]
    demo = [p for p in out if p["scene"] == "demo"]
    alts = [p for p in out if "altOf" in p]
    main_ = [p for p in out if p not in pushes + demo + alts]
    # holds never run into the next part, and a sub-second gap closes (it would flash raw footage)
    for x, y in zip(main_, main_[1:]):
        if x["end"] > y["start"] or y["start"] - x["end"] <= 1.0:
            x["end"] = y["start"]
    for p in alts:                   # keepEnd: g01b/g01c keep the old hook window after g01a grew into the opening (2026-10-28)
        if not p.get("keepEnd"):
            p["end"] = next(q["end"] for q in main_ if q["id"] == p["altOf"])
    for p in main_ + pushes + demo + alts:                    # frame numbers, as render.sh and make_reel read them
        p["startFrame"], p["endFrame"] = round(p["start"] * fps), round(p["end"] * fps)
    doc = {"_doc": "graphics plan for 02-data-profiling; generated by make_plan.py from spoken cues. "
                   "Times are CUT seconds on transcript/cutsheet.json (totalFrames " + str(cs["totalFrames"]) + ").",
           "fps": fps, "totalSeconds": round(total, 3), "baseTotalFrames": cs["totalFrames"],
           "parts": main_, "pushes": pushes, "demo": demo[0] if demo else None, "alternates": alts}
    out = main_ + pushes + demo + alts
    out.sort(key=lambda p: (p["start"], p["id"]))
    json.dump(doc, open(a.out, "w"), indent=1)
    mm = lambda t: f"{int(t)//60}:{t%60:04.1f}"
    lines = ["# 02-data-profiling: graphics plan", "",
             "Planned overnight 2026-10-28 at the human's direction, so the two human gates (base-cut sign-off and plan approval) are pending, not skipped for good. Times are on the current cut (" + mm(total) + ").", "",
             "| id | when | length | scene | class | what |", "|---|---|---|---|---|---|"]
    for p in out:
        lines.append(f"| {p['id']} | {mm(p['start'])} | {p['end']-p['start']:.1f}s | {p['scene']} | {p['class']} | {p['direction'][:260].replace('|','/')}{'...' if len(p['direction'])>260 else ''} |")
    open(a.plan_md, "w").write("\n".join(lines) + "\n")
    n_draw = sum(1 for p in out if p["scene"] in ("analogy", "contrast", "loop", "strike-list", "self-demonstrating", "map", "lens", "unit-dots"))
    print(f"{len(out)} parts, {n_draw} drawn scenes, wrote {a.out} and {a.plan_md}")
    for p in out:
        print(f"  {p['id']:5s} {mm(p['start']):>8s} {p['end']-p['start']:6.1f}s  {p['scene']:18s} {p['class']}")


main()
