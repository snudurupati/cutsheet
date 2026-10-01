#!/usr/bin/env python3
"""Write the graphics plan: graphics-build/cutsheet.json and PLAN.md.

Every time comes from a spoken cue in outputs/transcript-cut.json, found by
word + the approximate time it was planned at, and snapped to the frame grid.
A cue that cannot be found within CUE_TOLERANCE of where it was planned fails:
that means the cut moved under the plan, and the plan must be re-read, not
silently re-timed (hard rule 12).

Human decisions this plan carries (2026-09-29):
  hook object          one jar-with-limbs against the exam clock; pays off in g02
  11 min vs 20m 34s    show both, honestly: the /usage panel reads API 11m 7s and
                       wall 20m 34s; the fast-forward clocks count wall time from
                       the same origin, so they agree with the panel
  OpenAI/Hugging Face  the line stays, no graphic names it
  verdict              'To what use?' at 180px, answered by the use-case list under the
                       same question; 'Am I still relevant?' keeps its own card before it
  9:41 trim            'Claude created its own JSON file' cut (docs: built-in mailbox)
  fast-forwards        one SFX length each; inset slides out (style.json
                       demoInset.mayHide permits it)
"""
import argparse, json, re, sys

CUE_TOLERANCE = 3.0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cut-transcript", required=True)
    ap.add_argument("--edit-cutsheet", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--plan-md", required=True)
    a = ap.parse_args()

    cut = json.load(open(a.cut_transcript))
    cs = json.load(open(a.edit_cutsheet))
    fps = cs["fps"]
    if cut["totalFrames"] != cs["totalFrames"]:
        sys.exit("cut transcript and edit cutsheet disagree; stale artefact")
    words = cut["words"]
    total = cut["totalSeconds"]
    snap = lambda t: round(round(t * fps) / fps, 6)

    # Cue anchors were planned on the cut before the 9:41 trim (human 2026-09-29).
    # Everything after it moved by TRIM_SHIFT; the cue is still re-found by word.
    TRIM_AT, TRIM_SHIFT = 580.0, -9.032

    def cue(word, near, post=False):
        # post=True: 'near' is already on the trimmed cut (parts added after the trim)
        if near > TRIM_AT and not post:
            near += TRIM_SHIFT
        norm = lambda t: re.sub(r"[^a-z0-9$.%']", "", t.lower()).rstrip(".,")
        w = norm(word)
        hits = [x for x in words
                if norm(x["word"]) == w
                and abs(x["start"] - near) <= CUE_TOLERANCE]
        if not hits:
            sys.exit(f"cue {word!r} not found within {CUE_TOLERANCE}s of {near}")
        return snap(min(hits, key=lambda x: abs(x["start"] - near))["start"])

    # segment boundaries on the cut, for the demo span and the fast-forwards
    acc, bounds = 0, []
    for s in cs["segments"]:
        bounds.append((s, acc, acc + s["outFrames"]))
        acc += s["outFrames"]
    demo = [(s, a0, a1) for s, a0, a1 in bounds if s["section"] == "demo"]
    demo_in, demo_out = demo[0][1] / fps, demo[-1][2] / fps
    ffs = [(s, a0 / fps, a1 / fps) for s, a0, a1 in bounds if s["kind"] == "ff"]
    if len(ffs) != 3:
        sys.exit(f"expected 3 fast-forward segments, found {len(ffs)}")

    P = []
    def part(id, start, end, kind, cls, built, direction, notes="", cues=None):
        P.append({"id": id, "start": snap(start), "end": snap(end),
                  "startFrame": round(start * fps), "endFrame": round(end * fps),
                  "kind": kind, "class": cls, "builtBy": built,
                  "direction": direction, "notes": notes, "cues": cues or {}})

    # ------------------------------------------------------------- intro ---
    t_when = cue("when", 2.61)
    t_imagine = cue("imagine", 15.71)
    part("g01", t_when - 0.1, t_imagine, "analogy", "overlay", "hyperframes",
         "OPENING CARD (human addition 1, 2026-09-29). The video opens full face on 'Agents are like "
         "humans' with a slow push from frame 1 (1.00 -> 1.04, FFmpeg, eyes anchored). On 'when it comes "
         "to thinking' (2.6s) an animation card wipes up in heroLeft (measured zone, left of the face), "
         "opaque light panel: the series' brain-in-a-jar WITH LIMBS (art.mjs JAR/BRAIN/LIMB from "
         "02-first-agent / 04-lightweight-ontology) at a table of six scattered line-art objects "
         "(tokens of different shapes), a small timer ring above it. M1 'The longer they think' (4.6): "
         "the ring is SHORT and runs out in ~1s; the jar grabs the nearest object, a small $muted cross "
         "on it. M2 'the better responses' (6.2): the object drops back and the ring resets as a much "
         "larger dial, sweeping slowly. M3 'figuring things out' (10.3): the limbs sort the objects "
         "into two rows. M4 'ruling out possibilities' (11.7): three objects are picked up and tossed "
         "one by one into a bin at the edge of the table. M5 'better responses' (14.4): BINGO, the jar "
         "lifts the single best object, it fills $accent (the scene's one accent element) with a small "
         "burst of ink rays and a tick. Holds to 'Imagine'. MATCH-CUT HAND-OFF into g02 (human "
         "2026-09-29): g01 does not exit. On 'Imagine' its panel is carried into g02, see there.",
         "Human 2026-09-29 replaced the exam-clock hook object with this sorting scene, and moved the "
         "full-frame hook scene to 'Imagine' (g02). style.json hook.card=false: the line 'Agents are "
         "like humans...' stays spoken, never set as type.",
         {"when": t_when, "longer": cue("longer", 4.59), "better": cue("better", 6.17),
          "figuring": cue("figuring", 10.27), "ruling": cue("ruling", 11.65),
          "bingo": cue("better", 14.41)})

    t_thats = cue("that's", 54.96)
    part("g02", t_imagine, t_thats, "analogy", "overlay", "hyperframes",
         "HOOK SCENE, full frame from 'Imagine' (human addition 2), on $bg with the 6% grid and 8% "
         "accent-soft radial. It ARRIVES BY MATCH-CUT from g01 (human 2026-09-29, chosen over a hard "
         "cut or a face beat): over the first 0.6s, power2.inOut, g01's panel grows from its heroLeft "
         "box to the full frame, the face footage visible behind it shrinking out of view as the panel "
         "covers it, while the jar-with-limbs travels from its card position to its desk position and "
         "the bingo object settles on the desk as the exam paper. So g02's first 0.6s bakes in the base "
         "footage behind the growing panel, so it renders as a full-frame ALPHA overlay (transparent "
         "only outside the growing page during those 0.6s). Movement 1 'Imagine' (15.7): the same desk, jar and four-section "
         "exam, eyebrow 'GRE / GMAT' in $muted 34px. M2 '30 minutes' (20.1): the 30-min clock sweeps and "
         "runs out mid-section 2 exactly as in the hook, label '30 min' beside it. M3 'three hours' "
         "(26.7): the clock face widens to a 3-hour dial, the jar finishes all four sections, an $ink "
         "tick on the paper. M4 'latency' (~34.0): a queue of three waiting user figures forms beside the "
         "desk and the 3-hour dial dims to $muted. M5 'divide' (39.5): the paper splits along three "
         "cuts into four sections, which slide apart. M6 'Give each section' (41.5): four jars-with-limbs "
         "draw in, one per section, each with its own 30-min clock. M7 'parallelize' (51.1): all four "
         "clocks sweep together and all four sections fill; the single $accent element across the scene "
         "is the split line of M5, which stays accent to the end. Between cues the four clock hands and "
         "pencils keep moving; 1.00 -> 1.03 takeover drift over the whole 39s (style takeoverDrift).",
         "Concept scan: analogy @15.71 'imagine'; stat @41.49 '30 minutes' folds in here. The match-cut "
         "is a transition style.md does not define (overlay -> takeover); raise at close-out whether it "
         "becomes a standing convention (hard rule 9).",
         {"30min": cue("30", 20.14), "three": cue("three", 26.66), "latency": cue("latency", 34.76),
          "divide": cue("divide", 39.53), "give": cue("give", 41.49), "parallelize": cue("parallelize", 51.13)})

    t_spark = cue("apache", 60.85)
    t_when = cue("when", 78.55)
    part("g03", t_spark, t_when, "contrast", "segment", "hyperframes",
         "CONTRAST takeover. Hairline $rule divider draws down first (0.5s). LEFT, on 'Apache Spark' "
         "(60.9): eyebrow 'APACHE SPARK', a driver box fanning out to four executor boxes, each holding "
         "one data partition block; a dot runs driver -> executors -> back. RIGHT, on 'applied to AI "
         "agents' (63.4): the SAME fan-out geometry at the same scale, the driver replaced by a lead jar "
         "and the executors by four jars-with-limbs, each holding one exam section from g02. On 'agent "
         "swarm' (67.2) the right eyebrow writes 'AGENT SWARM'; on 'agent team' (73.5) it wipes to "
         "'AGENT TEAM' with a support line 'in Claude Code' (caption 500, 28px, $muted). The single "
         "$accent element is the right-hand eyebrow rule. Dots keep running on both sides to the end.",
         "Concept scan: 'now it's' contrast candidates; this beat is the explicit comparison the "
         "script makes ('the exact concept of ... now applied to AI agents').",
         {"agents": cue("applied", 62.65), "swarm": cue("swarm", 67.53), "team": cue("agent", 73.53)})

    t_prev = cue("previous", 89.21)
    part("g04", t_prev - 0.2, t_prev + 8.0, "card", "overlay", "hyperframes",
         "LOWER THIRD in the left column (not the bottom band: no room under the chin in this framing). "
         "Name 'Sreeram Nudurupati' display 700 36px $ink, role 'AI for the Working Data Engineer · "
         "Episode 5' caption 500 28px $muted, 2px $accent rule drawing left to right under the name. "
         "Wipes up 0.35s power3.out on 'previous episode'; holds; wipes down 0.3s.",
         "No self-introduction in the footage; the series call-back is the natural cue. Values from "
         "brand.md.")

    # -------------------------------------------------------------- demo ---
    part("gD", demo_in, demo_out, "takeover", "segment", "demo_scene",
         "DEMO SCENE. Screen full frame, face inset 480x480 bottom-right (style demoInset), entering "
         "0.3s after the cut and leaving once at the end. Corner and visibility per span are MEASURED "
         "from screen-ocr.json text density under each corner, not guessed: bottom-right by default "
         "(terminal line ends matter least); moves to bottom-left for the tmux grid if its lower-right "
         "pane is live, and for Cursor's split editor where the right pane is being read. Slides over "
         "0.6s smoothstep. Hidden during the three fast-forwards (fade 0.35s out at each entry, 0.5s in "
         "after). Every punch-in below is part of this scene, built in FFmpeg on the screen track.",
         "Runs the whole of both sessions' demo; the A->B join inside it is invisible because the "
         "screen app changes anyway (terminal -> Cursor).")

    # ---- legibility punch-ins added after the composition review (2026-09-29, finding 4):
    # stretches of 50-69s with nothing readable while he names on-screen text
    part("gZ1", cue("here", 112.7) - 0.2, cue("changed", 123.9) + 1.5, "zoom", "segment", "demo_scene",
         "PUNCH-IN on the terminal's git lines: 'git branch --show-current' -> ep05-demo, then "
         "'git status --short' (empty), as he says 'episode 5 demo branch' and 'git status is empty'.",
         "Composition review 2026-09-29: 1:37-2:30 had no graphic and ~6px terminal text.")
    part("gZ2", cue("so", 194.6) - 0.2, cue("bit.", 205.6) + 0.4, "zoom", "segment", "demo_scene",
         "PUNCH-IN on 'python3 tools/board.py --log board.log' and 'Watching ~/.claude/teams and "
         "~/.claude/tasks. Log: board.log' on 'this is the message board log. Right now it's empty'.",
         "Composition review 2026-09-29: 2:43-3:35 had no graphic.")
    part("g05", cue("conventions.md", 150.87) - 0.3, cue("what", 163.25), "zoom", "overlay", "demo_scene+hyperframes",
         "PUNCH-IN 2.4x on the three context files in the directory listing (CONVENTIONS.md, "
         "STANDARDS.md, REQUIREMENTS.md), crop measured from OCR boxes. Each filename gets an $ink "
         "underline as it is named; the accent is the REQUIREMENTS.md underline, the file the team "
         "reads for what to build.",
         "Recurring 'context files' motif from 04-lightweight-ontology.",
         {"standards": cue("standards", 154.51), "requirements": cue("requirements", 158.27)})

    part("gT", cue("so", 215.35), cue("screen.", 239.55) + 0.4, "card", "overlay", "hyperframes",
         "DICTIONARY CARD for tmux (human addition 3), left column, opaque panel over the demo. "
         "Headword 'tmux' display 900 at 96px $ink; beside it 'noun' caption 500 24px $muted italic; "
         "1px $rule under the headword; the definition quoted verbatim in caption 500 34px $ink: "
         "'An open-source terminal multiplexer for Unix-like operating systems. It allows multiple "
         "terminal sessions to be accessed simultaneously in a single window.' Source line 'Wikipedia' "
         "24px $muted. On 'each agent in a different tmux screen' (235.8) a small line-art window "
         "splits into four panes under the definition, the split lines drawing in $accent (the one "
         "accent element). Lands on 'tmux' (216.7).",
         "Definition checked against en.wikipedia.org/wiki/Tmux 2026-09-29: 'tmux is an open-source "
         "terminal multiplexer for Unix-like operating systems. It allows multiple terminal sessions "
         "to be accessed simultaneously in a single window.' Also fills most of the 86s bare stretch.",
         {"tmux": cue("tmux.", 216.73), "panes": cue("tmux", 235.81)})

    part("g06", cue("setting", 249.28) - 0.3, cue("tmux.", 273.41) + 1.0, "zoom", "overlay", "demo_scene+hyperframes",
         "PUNCH-IN on the command line that launches the team: the experimental env flag, then the "
         "teammate-mode / tmux arguments. Pan left to right across the command as each piece is named "
         "('experimental flag' 250.4, 'teammate mode' 268.9, 'tmux' 273.4). An $accent box on the flag "
         "itself (the one thing viewers need to copy). On 'still experimental, so it's not on by default' "
         "(255.6) a tag drops from the flag (human addition 4): 'EXPERIMENTAL · off by default' display "
         "700 28px on an opaque chip, sub 'Claude Code docs' 20px $muted. On 'teammate mode' a second tag "
         "on '--teammate-mode tmux': 'each teammate in its own tmux pane'. Text measured from OCR, never "
         "retyped: on screen it reads 'CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 claude --teammate-mode tmux'.",
         "Docs (code.claude.com/docs/en/agent-teams, 2026-09-29): 'Agent teams are experimental and "
         "disabled by default. Enable them by setting CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1'. Split-pane "
         "mode gives each teammate its own pane and requires tmux or iTerm2.",
         {"flag": cue("experimental", 250.36), "offByDefault": cue("experimental,", 255.6), "mode": cue("teammate", 268.87), "tmux": cue("tmux.", 273.41)})

    part("g07", cue("opus", 284.57) - 0.6, cue("prompt.", 291.86) + 0.5, "card", "overlay", "hyperframes",
         "MODEL CARD (human addition 5: a must, identifies the model), lower-left over the demo (inset is "
         "bottom-right), opaque panel, bigger than a chip. Eyebrow 'RECORDED WITH' 24px $muted. Row 1 "
         "'Claude Opus 5.5' display 900 56px $ink, lands on 'Opus' (284.6). Row 2 'medium effort' "
         "display 700 32px. Row 3 on 'Claude Pro subscription' (286.6): 'Claude Pro subscription' display "
         "700 32px. Footer 'Claude Code v2.1.283 · 29 Sep 2026' caption 500 24px $muted. One $accent "
         "element: the rule under row 1. All values read from the Claude Code banner on screen (OCR "
         "cut 276.8), not from speech.",
         "Series convention (04's model/date card): models change often, so every episode records which "
         "one ran. Banner reads 'Claude Code v2.1.283 / Opus 5.5 · Claude Pro', status line 'medium · "
         "/effort'.",
         {"opus": cue("opus", 284.57), "pro": cue("claude", 286.61)})

    part("g08", cue("telling", 299.94) + 0.56, cue("so", 336.5) - 0.2, "zoom", "overlay", "demo_scene+hyperframes",
         "PUNCH-IN on the prompt as he reads it: frames the prompt block, then pans down line by line "
         "keyed to his paraphrase ('read the conventions', 'agent team', 'create a plan', 'message "
         "board', 'write a report ... what it could not infer'). Continuous slow pan for the whole beat; "
         "$accent underline travels to the phrase being named (one element, moving). Ends before the "
         "'team has not started yet' line, where the full frame returns to show the lead planning.",
         "Starts when the prompt settles in the chat (OCR 300.6) and ends before 'So here, the team "
         "has not started yet'. Two framings: the prompt scrolls at 326.2.")

    labels = ["planning", "teammates building", "marts agent building"]
    for i, ((s, f0, f1), lab) in enumerate(zip(ffs, labels)):
        part(f"gF{i+1}", f0, f1, "stat", "overlay", "hyperframes",
             f"FAST-FORWARD chip, {s['speed']:.0f}x, over the sped-up screen (inset hidden). Upper-left "
             f"panel, opaque: '>> {s['speed']:.0f}x' display 700 34px $ink with a small play-forward "
             f"glyph drawn as two SVG triangles (no emoji), and a WALL CLOCK in display 900 at 160px "
             f"counting real elapsed time since Claude Code started (source A 7:33, the /usage "
             f"panel's wall origin), from its value at this segment's first source frame to its last, "
             f"linearly over the {f1-f0:.1f}s. Caption under it: '{lab}' 24px $muted. The clock's "
             f"colon is the $accent element. Chip wipes in 0.35s, holds, wipes out 0.3s at the end.",
             "Human 2026-09-29: show both API and wall time honestly. Clock origin anchored so it reads "
             "20:34 at the /usage frame; derived at build from screen-ocr.json, not typed.",
             {"srcStart": s["startFrame"], "srcEnd": s["endFrame"]})

    part("g09", cue("spawned", 371.50), cue("and", 391.66) + 1.0, "self-demonstrating", "overlay", "hyperframes",
         "SELF-DEMONSTRATING over the real tmux grid. As each teammate is named ('erp' 380.1, "
         "'e-commerce' 382.4, 'crm' 384.1, 'pos' 385.8) a label tab drops onto THAT pane's measured "
         "top-left corner (from OCR boxes of each pane's header), display 700 28px on an opaque chip, "
         "plus a thin $ink outline drawn round the pane. On 'fifth agent ... data marts ... standby' "
         "(388.0) a dashed $muted outline marks where the marts agent will appear, labelled "
         "'MARTS · standby'. The lead's pane gets the single $accent outline on 'master agent' (368.7).",
         "Inset position for this span measured against the grid before building.",
         {"lead": cue("master", 368.72), "erp": cue("erp", 380.09), "ecom": cue("e-commerce", 382.37),
          "crm": cue("crm", 384.05), "pos": cue("pos", 385.77), "marts": cue("fifth", 388.0)})

    part("gA", cue("so", 400.01), cue("all", 413.57) - 0.2, "diagram", "overlay", "hyperframes",
         "EXPLAINER, what an agent team is (human addition 4), left column opaque panel over the live "
         "tmux grid. Header 'AGENT TEAM · Claude Code' with the one $accent rule. Four rows land 0.4s "
         "apart from 'team of agents working for you' (400.9), each with a tiny line-art icon: 'Team "
         "lead: the session that spawns and coordinates' (jar with a crown-less lead mark); 'Teammates: "
         "separate Claude Code instances, each with its own context window' (jar-with-limbs); 'Shared "
         "task list: teammates claim work' (checklist); 'Mailbox: agents message each other directly' "
         "(envelope). Source line 'Claude Code docs' 20px $muted.",
         "Wording from code.claude.com/docs/en/agent-teams (architecture table), checked 2026-09-29. "
         "See the open question on 'mailbox' vs the 9:41 line.",
         {"team": cue("team", 400.92)})

    part("g10", cue("ecom", 451.44) - 0.3, cue("so", 466.26), "zoom", "overlay", "demo_scene+hyperframes",
         "PUNCH-INS on the message board log lines as he names them: 'team-lead -> ecom' first, then "
         "'ecom -> crm' (451.4), then 'erp -> pos' (462.1). Each stop 2.4x on the exact line from OCR, "
         "panning between stops, the sender and receiver names boxed in $ink and the arrow in $accent.",
         "Terminal text is ~11px at 1080p: unreadable without these.",
         {"ecomcrm": cue("ecom", 451.44), "erppos": cue("erp", 462.09)})

    part("g11", cue("so", 466.26), ffs[1][1], "loop", "overlay", "hyperframes",
         "LOOP diagram on an opaque left panel over the demo: a lead jar at the top, four teammate jars "
         "in a row below (ERP, ECOM, CRM, POS). 'plan was designed' (467.6): the lead's four delegation "
         "arrows draw down. 'talk to the different agents' : sideways arcs draw ECOM<->CRM and "
         "ERP<->POS. A message dot travels the arcs continuously; the arc carrying the dot is the one "
         "$accent element. Holds to the fast-forward, where the board keeps filling at 21x.",
         "Concept scan: loop 'back and forth' (13:59, 14:45, 16:54) is paid off here and in g15.")

    t_created = cue("created", 533.58)
    # gZ3: first proposed in review round 1 and dropped on a misreading that the "Messages that
    # changed a teammate's work" block only arrived at 587. Screen OCR has it at y 635 from 574.8
    # to 585.2 (cut time), exactly under "I'd asked it to create a message board", and review
    # round 2 (finding 14) saw it at 580. Restored.
    part("g12", t_created - 0.2, cue("so", 551.92), "stat", "overlay", "hyperframes",
         "STAT STACK, left column opaque over the demo. Rows land ON their cues and count up, never "
         "appear: '5 agents' (five 536.0), '8 sources' (eight 544.4), '5 intermediate models' (545.5), "
         "'6 marts' (546.9), '149 tests' (548.8). Numbers display 900 at 160px, the 149 last and the "
         "one $accent element (its underline). Values read from the lead's summary on screen via OCR "
         "and asserted equal to the spoken numbers before build.",
         "",
         {"five": cue("five", 536.04), "eight": cue("eight", 544.4), "models": cue("five", 545.48),
          "marts": cue("six", 546.92), "tests": cue("149", 548.84)})

    t_cost = cue("$4.56", 612.15)
    part("g13", t_cost - 0.2, cue("so", 644.37), "stat", "overlay", "hyperframes",
         "USAGE CARD, left column opaque over the demo, the real /usage figures. '$4.56' counts up on "
         "'$4.56' (612.2). On '11 minutes and 7 seconds' (617.1) row 2 lands: 'API time 11m 7s'. "
         "Row 3 lands 0.4s later, directly under it at the same size: 'wall time 20m 34s', "
         "with the single $accent element as its underline. On 'single agent took about 20 minutes' "
         "(631.8) a divider draws and a second column lands to the right of the numbers: 'single "
         "agent, ep 4: ~20 min wall'. Everything holds through 'is it of any consequence? I don't know' "
         "so the viewer sees the like-for-like comparison while he asks the question.",
         "Human 2026-09-29: show both, honestly. All figures from the /usage frame (OCR, cut ~607), "
         "never from speech.",
         {"cost": t_cost, "api": cue("11", 617.1), "single": cue("20", 631.81)})

    part("gZ3", cue("so", 574.2, post=True) - 0.1, cue("there.", 585.8, post=True) + 0.8, "zoom", "segment", "demo_scene",
         "PUNCH-IN on the lead's 'Messages that changed a teammate's work' section while the speaker says "
         "they never gave the agents a mechanism for a message board.",
         "Composition review round 2, finding 14: 551.9-602.9 had no graphic.")
    part("gZ4", cue("so", 663.7, post=True) - 0.1, cue("to", 667.9, post=True) + 2.2, "zoom", "segment", "demo_scene",
         "PUNCH-IN on TEAM_PLAN.md's '# Team plan' and 'Build the warehouse from landing/ through to "
         "the three reports in REQUIREMENTS.md' as he reads it.",
         "Composition review 2026-09-29: 10:35-11:36 had no graphic.")
    part("g14", cue("four", 705.97) - 0.5, cue("and", 709.84) + 12.0, "zoom", "overlay", "demo_scene+hyperframes",
         "PUNCH-IN on TEAM_PLAN.md: the roster table as 'four plus two ... six agents in total' lands "
         "(each of the six rows gets an $ink tick in order, the sixth tick $accent), then pan to the "
         "file-ownership column on 'file ownership' (710.8).",
         "The plan's own document is the real asset; no redraw.")

    part("gZ5", cue("and", 717.4, post=True) - 0.1, cue("task", 723.0, post=True) + 1.5, "zoom", "segment", "demo_scene",
         "PUNCH-IN on TEAM_PLAN.md's '## Task list' table (T01...) on 'divided into 10 tasks'.",
         "Composition review 2026-09-29: 11:53-13:02 had no graphic; the task list was tiny.")
    part("g15", cue("english", 790.91) - 0.2, cue("tokens", 796.13) + 2.5, "strike-list", "overlay", "hyperframes",
         "STRIKE-LIST, left column opaque over the board log. Rows land on their cues: 'English' "
         "(790.9) with an $ink tick; 'a new invented language' (793.3), 'binary' (794.7), 'tokens' "
         "(796.1), each struck by a 2px $muted line 0.3s after it lands. The single $accent element is "
         "the header rule over 'How the agents talk'. Quick, playful, 7s.",
         "Not in the concept scan; the absence list is explicit in the line.",
         {"english": cue("english", 790.91), "invented": cue("invented", 793.31),
          "binary": cue("binary", 794.67), "tokens": cue("tokens", 796.13)})

    part("g16", cue("so", 807.36), cue("and", 867.08), "zoom", "overlay", "demo_scene+hyperframes",
         "PUNCH-INS on the negotiation in board.log, one stop per line he names: line 9 (ECOM proposes "
         "points 1-5), line 23 (CRM agrees to 1, 3, 4, 5, 6, pushes back on 2), line 39 (ECOM concedes "
         "point 2). In each stop 'point 2' is boxed; the box is $accent in the line-39 stop only, where "
         "the argument resolves. A small tally on an opaque side chip tracks point 2: proposed -> pushed "
         "back -> agreed.",
         "Exact start/end re-derived from the cut ('So here in line number nine' .. 'Agents are "
         "communicating like people would do').")

    part("g17", cue("and", 885.26), cue("so,", 898.61), "zoom", "overlay", "demo_scene+hyperframes",
         "PUNCH-IN on board.log line 53: the team lead forwarding ERP's new order-date column to every "
         "teammate. Boxed sender, the fan-out of recipients underlined one by one.",
         "Cue checked at build; the line number is read on screen.")

    part("gB", cue("and", 911.77), cue("all", 934.43) - 0.2, "analogy", "overlay", "hyperframes",
         "AHA SCENE (human addition 6), left column opaque panel over the board log. Five small "
         "jars-with-limbs in a ring (lead + ERP, ECOM, CRM, POS). On 'agent teammates collaborate, do back "
         "and forth' (914.5) message dots start flying between them along drawn arcs, continuously. On "
         "'watching agents communicate' (923.6) a line-art light bulb draws in above the ring, filament "
         "first. On 'aha moment' (929.4) the bulb LIGHTS: its fill becomes the scene's one $accent "
         "element with ink rays drawing outward. Dots keep flying to the end (23s beat, continuous "
         "motion throughout). No type except an optional eyebrow 'AHA' 28px $muted.",
         "Covers the message-board excitement: collaborate / back and forth / glad I'm alive / aha / "
         "impressed.",
         {"collab": cue("teammates", 914.81), "watch": cue("watching", 923.56), "aha": cue("aha", 929.38)})

    # ends 0.13s before the screen switches away from BUILD_REPORT.md (measured by frame
    # differencing, 957.13): the marks were left floating over a blank terminal (QA 2026-09-29)
    part("g17b", cue("so", 947.90), 957.0, "zoom", "overlay", "demo_scene+hyperframes",
         "PUNCH-IN on BUILD_REPORT.md where it says web orders are not created as a branch because they "
         "have no city, so web revenue is excluded from daily branch sales. The sentence boxed in $ink, "
         "'no city' underlined in $accent. Holds through 'run a few SQLs'.",
         "Continuity with 04-lightweight-ontology, where the same web/branch rule was the finding.")

    part("g18", cue("so", 988.38) - 0.5, demo_out, "zoom", "overlay", "demo_scene+hyperframes",
         "PUNCH-INS on the two revenue checks in DuckDB (starting on 'So here'; the console launch before it stays full frame): '2.19 million from the source files' (989.6) "
         "boxed in $ink, then the data mart result boxed on 'matches to the cent' (996.4) with the "
         "matching digits underlined in $accent. Then the web-sales check result on 'checks out too'.",
         "Values from the screen, never from the speech.")

    # ------------------------------------------------------------- outro ---
    t_there = cue("so", 1014.55)
    t_whatuse = cue("to", 1053.91)
    t_relevant = cue("am", 1073.65)
    t_one = cue("one", 1086.58)
    part("gP1", demo_out, t_relevant, "zoom", "segment", "push",
         "PUSH over the recap to camera: 1.00 -> 1.06 over the beat, power1.inOut, anchored on the eyes, "
         "FFmpeg geometry.", "Recap beat, ~39s of face; the push is its motion.")

    # (gP2 is defined after g20, whose end it abuts)
    # g19 (the 170px "To what use?" verdict card) REMOVED, human 2026-09-30: "seems vestigial, doesn't
    # add any value or context". g21's use-case list carries the question as its header and is the
    # answer; the recap push (gP1) now runs on to g20.
    part("g20", t_relevant, t_one + 3.0, "card", "overlay", "hyperframes",
         "QUESTION CARD, same slot and anatomy: 'Am I still relevant?' lands with the phrase (1073.7). "
         "On 'is still relevant.' (1084.8) a support line lands under the rule, verbatim: 'that years "
         "of building data pipelines ... is still relevant.' caption 500 36px $muted. Series call-back: "
         "eyebrow 'THE SERIES QUESTION'.",
         "Quote trimmed with an ellipsis, words unchanged. 'pipeline' pluralised? NO: keep 'pipeline' "
         "verbatim.")

    part("gP2", t_one + 3.0, cue("migrations.", 1130.14) - 0.3, "zoom", "segment", "push",
         "PUSH over the use-case lead-in to camera: 1.00 -> 1.04 over the beat, power1.inOut, on the "
         "eyes, FFmpeg geometry.",
         "Composition review 2026-09-29 (finding 21): a 40s bare head; style.md says a head beat over "
         "12s wants a chip or a push.")

    t_mig = cue("migrations.", 1130.14)
    t_details = cue("details", 1267.58)
    part("g21", t_mig - 0.3, t_details - 0.4, "strike-list", "overlay", "hyperframes",
         "THE ANSWER TO THE VERDICT: use-case list, left column. Header is the verdict again, 'To what "
         "use?' display 900 at 72px with its $accent rule (the one accent element), so the answer sits "
         "under the question. Rows accumulate on their cues (no strikes, these are kept), each with a "
         "small line-art team of jars-with-limbs as its icon: 'Migrations' + sub 'time-bound; spare the "
         "humans' (1130.1), with a count-up '60-80% of the code' (1158.5) beside it; 'Niche skills' + "
         "sub '10,000 PL/SQL files', the 10,000 counting up (1189.8); 'Time to value' + sub "
         "'mission-critical' (1217.1). Holds through 'not saying agent teams can replace humans. Not "
         "yet.' to the end card. ~137s over the face: the active row's marker dot pulses and the icon "
         "jars pass a message dot, so something moves throughout.",
         "Human 2026-09-29: verdict = 'to what use' + the use cases. Over live footage, so takeoverDrift "
         "does not apply; continuous motion still written.",
         {"m": t_mig, "pct": cue("60", 1158.48), "niche": cue("second", 1181.98),
          "plsql": cue("10,000", 1189.83), "ttv": cue("time", 1217.14)})

    connect = cue("connect", 1270.11)
    part("g23", t_details - 0.4, total, "card", "overlay", "hyperframes",
         "END CARD, overlay beside the face (speaker stays full frame), left column x 96 -> 680, "
         "vertically centred on the rows it holds. Panel enters on 'details ... right here' (1267.6). "
         "Rows from brand.md links: YouTube, blog, GitHub, LinkedIn, X. Only LinkedIn has a spoken cue "
         "('connect', 1270.1); the others take noCueFallback and land with it, 0.4s apart. Label caption "
         "500 28px $muted, value display 700 36px $ink, each row clip-mask wiping up 0.35s power3.out. "
         "One $accent element: the rule under the first row. Holds to the last frame. Longest value "
         "(the GitHub URL) measured to fit 584px before build.",
         "Right 40% clear for YouTube end-screen cards by construction.",
         {"details": t_details, "connect": connect})

    # the demo scene is the container the demo parts compose over, not a beat
    gd = next(p for p in P if p["id"] == "gD"); P.remove(gD := gd)
    P.sort(key=lambda p: p["start"])
    doc = {"video": "outputs/base-cut.mov", "fps": fps, "totalSeconds": total,
           "_demoScene": {"in": snap(demo_in), "out": snap(demo_out),
                          "direction": gD["direction"], "notes": gD["notes"],
                          "_why": "parts inside the demo compose over the demo scene, not the base"},
           "parts": P}
    json.dump(doc, open(a.out, "w"), indent=1)

    def mm(t):
        d = round(t * 10)
        return f"{d // 600}:{(d % 600) // 10:02d}.{d % 10}"
    TITLE = {
        "g01": "Opening card: jar-with-limbs sorts, discards, bingo", "g02": "Hook scene: the exam analogy, full frame (match-cut from g01)",
        "g03": "Spark vs agent team, side by side", "g04": "Lower third: name, series, episode 5",
        "g05": "Punch-in: the three context files", "gT": "Dictionary card: tmux (Wikipedia)",
        "g06": "Punch-in: launch command + 'experimental' tag", "g07": "Model card: Opus 5.5, medium, Claude Pro, v2.1.283",
        "g08": "Punch-in: the prompt, panned as you read it", "gF1": "Fast-forward 1 (33x): chip + wall clock",
        "g09": "Labels on the real tmux panes as you name them", "gA": "Explainer: what an agent team is",
        "g10": "Punch-ins: board log lines you name", "g11": "Diagram: lead + four teammates, messages flowing",
        "gF2": "Fast-forward 2 (21x): chip + wall clock", "gF3": "Fast-forward 3 (51x): chip + wall clock",
        "g12": "Stat stack: 5 agents, 8 sources, 5 models, 6 marts, 149 tests",
        "g13": "Usage card: $4.56, API 11m 7s, wall 20m 34s, vs single agent",
        "g14": "Punch-in: TEAM_PLAN.md roster and ownership", "g15": "Strike-list: English, not invented language / binary / tokens",
        "g16": "Punch-ins: the point-2 negotiation (lines 9, 23, 39)", "g17": "Punch-in: board line 53, lead forwards to all",
        "gB": "Aha scene: jars messaging, bulb lights up", "g17b": "Punch-in: BUILD_REPORT web/branch rule",
        "g18": "Punch-ins: 2.19M source vs mart, to the cent", "gP1": "Slow push over the recap",
        "g20": "Question card: 'Am I still relevant?'",
        "g21": "The answer: 'To what use?' + migrations, niche skills, time to value",
        "g23": "End card: channels, beside your face",
        "gZ1": "Punch-in: git branch and git status", "gZ2": "Punch-in: the empty board log",
        "gZ3": "Punch-in: 'Messages that changed a teammate's work'", "gZ4": "Punch-in: 'Build the warehouse from landing/...'",
        "gZ5": "Punch-in: the 10-task list", "gP2": "Slow push over the use-case lead-in"}
    missing = [p["id"] for p in P if p["id"] not in TITLE]
    if missing:
        sys.exit(f"no PLAN.md title for {missing}")
    WHAT = {"overlay": "overlay on the footage", "segment": "replaces the frame"}
    L = ["# 05-agent-swarm: graphics plan", "",
         "For review before anything is built. Every time below is a spoken cue from the cut transcript. "
         "Times are on the edited video (21:27).", "",
         f"- **Intro** 0:00-{mm(demo_in)}: face, opening card, the exam hook, Spark vs agent team.",
         f"- **Demo** {mm(demo_in)}-{mm(demo_out)}: screen full frame with your face in a corner "
         "(hidden during the three fast-forwards).",
         f"- **Outro** {mm(demo_out)}-{mm(total)}: face, question cards, use cases, verdict, end card.", "",
         "## At a glance", "", "| # | Time | What |", "|---|---|---|"]
    L.append(f"| gD | {mm(demo_in)}-{mm(demo_out)} | Demo scene: screen + face inset |")
    for p in P:
        L.append(f"| {p['id']} | {mm(p['start'])}-{mm(p['end'])} | {TITLE[p['id']]} |")
    sec = None
    for p in P:
        where = "intro" if p["end"] <= demo_in + 0.01 else ("demo" if p["start"] < demo_out - 0.01 else "outro")
        if where != sec:
            sec = where
            L += ["", f"## {where.title()}", ""]
            if where == "demo":
                L += [f"### gD · {mm(demo_in)}-{mm(demo_out)} · demo scene", "", gD["direction"], "",
                      f"_Why:_ {gD['notes']}", ""]
        L += [f"### {p['id']} · {mm(p['start'])}-{mm(p['end'])} · {TITLE[p['id']]}", "",
              f"_{p['kind']}, {WHAT[p['class']]}_", "",
              p["direction"], ""]
        if p["notes"]:
            L += [f"_Why:_ {p['notes']}", ""]
    L += ["## Decisions carried (human, 2026-09-29)", "",
          "- Opening: full face, then the jar-with-limbs sorting card on 'when it comes to thinking' (g01).",
          "- Hook scene: full-frame exam analogy from 'Imagine' (g02), arriving by match-cut: g01's panel "
          "grows to full frame and its jar walks to the exam desk over 0.6s.",
          "- Added: tmux dictionary card (gT), experimental tag + agent-team explainer (g06, gA), model card "
          "with the banner's real values (g07), aha bulb scene (gB).",
          "- 11 min vs 20m 34s: show both from the /usage panel (g13); fast-forward clocks count wall time "
          "from the same origin (gF1-gF3).",
          "- OpenAI / Hugging Face line: no graphic names it.",
          "- Verdict: the use-case list under 'To what use?' (g21); the standalone 170px card (g19) was cut 2026-09-30 as vestigial.",
          "- 9:41 'Claude created its own JSON file' trimmed: the docs describe a built-in mailbox.",
          "- Fast-forwards: one sound-effect length each, face inset hidden (style.json demoInset.mayHide).",
          "", "## Open questions", "",
          "None open. Resolved 2026-09-29: verdict is 'To what use?' + the use cases (g19, g21); the 9:41 "
          "'created its own JSON file' line is trimmed from the cut; sound effects need no input."]
    open(a.plan_md, "w").write("\n".join(L) + "\n")
    print(f"wrote {a.out}: {len(P)} parts")
    print(f"wrote {a.plan_md}")


main()
