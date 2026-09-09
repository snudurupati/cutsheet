#!/usr/bin/env python3
"""Emit graphics-build/cutsheet.json and PLAN.md from the beat table below.

Beat times are on the EDITED timeline and were read off outputs/transcript-cut.json,
never estimated. The demo scene itself is not a part here: it lives in
demo-scene.json and is applied by the footage pass, so overlays in this file
composite on top of it.
"""
import argparse, json, sys

# id, start, end, kind, class, direction, notes
BEATS = [
 ("g001",   0.0,  11.8, "card", "overlay",
  "HOOK. DRAWN OBJECT, not a type card, and the spoken line is never repeated on screen. "
  "A pipeline: four uniform rows pass cleanly through a gate while he says the demos look brilliant "
  "and the POCs work. Then production data arrives in shapes more than twice the height of the "
  "opening, the first lodges against the gate, and three more back up behind it. At 'fail?' (6.62s) "
  "the jammed row turns $accent, the only accent element on the card, and the pipe and the backlog "
  "recede to $muted. The gate is a solid DARK block, not an outline: in $rule on a near-white panel "
  "it reads as a smudge rather than as the thing everything has to fit through.",
  "Object chosen by the human 2026-09-08, after he rejected a first version that drew the "
  "architect's building here: at 0:00 the voice is on AI demos and production failures, and a "
  "building is out of context 18 seconds before an architect is mentioned. This hook does NOT "
  "preview the payoff object; hook.payoffObjectPreview was narrowed that day to analogies landing "
  "within seconds of the hook. The architect is introduced at g003 and returns resolved at g028."),
 ("g002",  13.0,  17.0, "card", "overlay",
  "Lower third, left column. 'Sreeram Nudurupati' in display 700 at 46px $ink, 'AI for the Working Data "
  "Engineer' in caption 500 at 26px $muted beneath. Clip-mask wipes up over 0.35s power3.out, one $accent "
  "rule draws left-to-right under the name. Holds, then wipes down.",
  "Name and role from brand.md presenter block. heroLeft zone, NOT the lower band."),
 ("g003",  18.2,  85.0, "analogy", "segment",
  "THE ARCHITECT. One drawn object built in movements on spoken cues, continuous motion for all 66.8s "
  "(style floor is 20s). 0:18 a plot outline draws. 0:24 'brilliant architect, 15 years' a credential "
  "stack builds, one bar per phrase. 0:41 'the budget and a few basic requirements' the thin two-line "
  "brief slides in, and the empty space below it stays visibly empty. 0:47 'comes back with the design' "
  "a modern flat-roofed building draws itself confidently. 0:55 'not at all satisfied' it desaturates to "
  "$muted. 1:02 'professor of Greek studies' a classical column ghosts in behind in $accent-soft. 1:10 "
  "'exclusively classical architecture' a second column joins it. Ends holding both: what was built, and "
  "what was never asked for.",
  "Concept scan candidate 0:18 'imagine'. Returns as the payoff at g026."),
 ("g004", 106.0, 140.0, "diagram", "overlay",
  "TACIT KNOWLEDGE. Starts at 106.0, not 88.0: the earlier window put the drawing on screen twenty "
  "seconds before the beat it illustrates and left it sitting there. Now it builds only on its cues. "
  "108.52 'tacit knowledge' the words draw in $accent in the centre, the one accent element. 112.31 "
  "'organization' a curve draws in from upper left, labelled Years At The Organization. 117.61 "
  "'debugged' a second curve draws in from lower left, labelled Pipelines Debugged. Both feed INTO "
  "the accent words. 122.91 the model appears at the right as the brain in a jar, and a dashed path "
  "leaves the words toward it and stops short, never bridging, travelling for the rest of the beat.",
  "The unbridged gap is the whole argument of the video. US spelling. The model is the brain in a "
  "jar because that is the series motif, reused from 02-first-agent's art library rather than "
  "redrawn."),
 ("g005", 175.0, 202.0, "contrast", "overlay",
  "TWO EXPERIMENTS. Split frame, both halves visible at the end. Left 'RUN A / bare repo / sample data + "
  "basic requirements'. Right 'RUN B / same repo + CONVENTIONS.md + STANDARDS.md'. Rows land on their own "
  "spoken cues, never all at once. Right half stays $muted until the demo reaches it.",
  "Concept scan 2:28 'two ways'. Sets up the entire demo."),

 ("g006", 205.0, 214.0, "card", "overlay",
  "Chip, 'RUN A · bare repo'. Enters with the demo scene, upper-left of the screen, one $accent dot.",
  "Chip 1 of 3. The skill caps chips at 2-3 in the demo; the screen needs its pixels."),
 ("g007", 338.0, 352.0, "self-demonstrating", "overlay",
  "Annotation anchored to the real terminal. A bracket draws around the actual '6 tests, 6 passed' output "
  "and a $muted note points at it: 'six tests. all passing.' No recreation, the real pixels.",
  "Concept scan 5:38 'right here'. Anchor point must be measured on the frame, not placed by eye."),
 ("g008", 420.0, 434.0, "zoom", "segment",
  "Punch-in on sources.yaml, 2.4x, framed on the external_location line. FFmpeg zoompan, not the browser.",
  "Code is ~21px at 4K, ~10px at 1080p. Crop must be rendered and READ before commit."),
 ("g009", 434.0, 465.0, "contrast", "overlay",
  "WHAT IT WROTE vs WHAT A DATA ENGINEER EXPECTS. Split frame. Left: the real wildcard read. Right: the "
  "same block with union_by_name and all_varchar drawn in $accent. Both visible at the end.",
  "Concept scan 7:13 'rather than'."),
 ("g010", 492.0, 506.0, "zoom", "segment",
  "Punch-in on the staging model, framed on the absent surrogate-key and audit columns.", ""),
 ("g011", 515.0, 524.0, "card", "overlay",
  "'THE BIGGEST MISS'. Typographic hit, scale jump not another row. Display 900, in-band ~100px, lands on "
  "the spoken cue.",
  "Concept scan 8:33 superlative. One of the few places a pure type card earns its place."),
 ("g012", 524.0, 562.0, "loop", "overlay",
  "HISTORY OVERWRITTEN. Closed ring with a travelling dot, 37s of continuous motion. Each pass: 'new data "
  "arrives' -> the single row block flips to the new values -> the previous values fall out of frame and "
  "are gone. After three passes a counter reads 'rows kept: 1' while 'rows seen' climbs. The dot never "
  "stops.",
  "Concept scan 8:41 'every time, every time'. This is Run A's cardinal failure and the strongest drawn beat in the video."),
  # NOTE: g014 is authored BEFORE g013 because the director moved the RUN B chip
  # to 9:22 (562.0), ahead of the 'only difference' contrast at 9:58. The ids are
  # labels, not an ordering; validate_cutsheet.py requires ascending starts.
 ("g014", 562.0, 571.0, "card", "overlay",
  "Chip, 'RUN B · rules codified'. Same geometry and entrance as g006 so the pair reads as a matched set, "
  "one $accent dot. Wipes in over 0.35s power3.out and holds. Moved to 562.0 (9:22) on the director's note 2026-09-09: it was landing at 10:35, a minute after the Run B work began.",
  "Chip 2 of 3. Deliberately mirrors g006 so the viewer reads the two runs as the same experiment twice."),
 ("g013", 598.0, 632.0, "contrast", "overlay",
  "THE ONLY DIFFERENCE. Two repo trees side by side, identical, drawn simultaneously. Every matching file "
  "greys to $muted. Two files remain in $accent: CONVENTIONS.md and STANDARDS.md. Holds on those two.",
  "Concept scan 9:57 'versus'. The hinge of the whole video."),
 ("g015", 707.0, 722.0, "stat", "overlay",
  "6 -> 12 TESTS. Numeral counts up from 6 to 12, landing ON the spoken number, display 900 at the 160px "
  "in-band floor. Sub-line 'same repo. same prompt.' in caption 500.",
  "cardsLandOnSpokenCue: cue re-derived at build time from transcript-cut.json."),
 ("g016", 796.0, 810.0, "stat", "overlay",
  "15 DAYS. Proportion bar fills to the late-arrival cutoff, numeral counts on the cue.",
  "Concept scan 12:46 magnitude."),
 ("g017", 815.0, 832.0, "zoom", "segment",
  "Punch-in on STANDARDS.md, framed on the audit-columns block.", ""),
 ("g018", 966.0,1005.0, "contrast", "overlay",
  "ONE OBJECT, TWO STATES. The Run A row block from g012 returns and morphs: instead of overwriting, a "
  "second row stacks beneath it, an isDeleted flag lights on the missing row, and inserted/updated "
  "timestamps draw in. Never two cards, one object changing.",
  "Concept scan 16:30 'now it's'. Deliberate callback to g012 so the fix reads against the failure."),
 ("g019",1064.0,1130.0, "strike-list", "overlay",
  "THE SAME FOUR OR FIVE MISTAKES. Counted build, rows land on their own cues: no union_by_name, no "
  "surrogate key, no audit columns, no history. Each row then strikes through in $accent as he says the "
  "standards fixed it. 66s, so the strike pass carries the back half.",
  "Concept scan 18:34. Continuous motion required above 20s."),
 ("g020",1141.0,1170.0, "card", "overlay",
  "THE OBJECTION, in his own framing: 'years of history. Jira. Confluence. Slack threads.' Rows stack and "
  "the stack visibly overflows the panel, then the panel holds while he answers it.",
  "The objection is the viewer's, so it earns being on screen while he addresses it."),
 ("g021",1181.0,1202.0, "card", "overlay",
  "TWO FILES. CONVENTIONS.md (business rules) and STANDARDS.md (design and coding). Two panels, one "
  "$accent rule total across both.", "The reusable takeaway of the video."),
 ("g022",1204.0,1235.0, "strike-list", "overlay",
  "IT ALREADY KNOWS. Rows land one per spoken cue: Kimball, Inmon, slowly changing dimensions, how "
  "warehouses work, how to calculate history. All arrive in $ink. Then one gap opens in the middle of the "
  "stack and fills itself with a guessed value in $accent-soft.",
  "Concept scan 20:04. The gap-fill is the mechanism the video is naming."),
 ("g023",1300.0,1314.0, "stat", "overlay",
  "SEVEN. Numeral counts up on the cue, sub-line 'things it knew it was missing'.", ""),

 ("g029",1315.5,1332.5, "card", "overlay",
  "VERDICT, moved. Lands on the line it quotes: 'already knows its blind spot' at 1316.08 and 'You "
  "just have to ask it' at 1318.00, in two movements. It sits inside the demo window, so it is an "
  "opaque card over the screen rather than the biggest type in the video over his face. That is the "
  "trade the human chose: cardsLandOnSpokenCue outranks the visual weight of a closing card.",
  "It previously sat at 1516.0-1533.0, where he is saying 'So that's knowledge elicitation for you' "
  "and the quoted line is 130 seconds in the past. Caught by the human on review, not by any gate: "
  "a card quoting words that are never spoken under it is invisible to every counting check. g023 "
  "was shortened from 1318 to 1314 to make room."),
 ("g024",1356.0,1372.0, "card", "overlay",
  "OPEN QUESTION, asked on screen and answered later: 'How does it know its blind spots?' Type only, held "
  "as an open loop, closed by g026.", "Concept scan 22:31 open-question."),
 ("g025",1378.0,1430.0, "strike-list", "overlay",
  "WHAT IT WAS TRAINED ON. Rows land per cue: coding standards, ETL mapping documents, source-to-target "
  "mappings, data models, DDL and schema definitions, Kimball and Inmon. The stack builds tall and holds.",
  "Concept scan 22:53 'think of a'. Fills what would otherwise be a two-minute gap with no graphic."),
 ("g026",1440.0,1466.0, "loop", "overlay",
  "THE FORK. One node, two paths. Path A 'sees a gap -> fills it with the most probable value' draws in "
  "$muted and loops. Path B 'is asked what is missing -> draws on everything it has' draws in $accent and "
  "completes. Both visible at the end; the taken path is the accent one.",
  "Concept scan 25:07 'unless'. This is the mechanism sentence of the entire video."),
 ("g027",1487.5,1494.0, "card", "overlay",
  "DEFINITION CARD, dictionary format. Lands ON the first spoken 'elicitation' at 24:47.5 and hands off to "
  "the architect at 24:54. Headword 'knowledge elicitation' display 700 at 64px $ink, with a pronunciation "
  "respelling beneath it in caption 500 at 22px $muted. One $accent rule draws left-to-right under the "
  "headword: the only accent element on the card. Then 'noun - knowledge engineering' in caption 500 24px "
  "$muted, then the definition in display 500 34px $ink over two lines: 'Drawing out what an expert knows "
  "but has never written down.' After a 0.6s beat a second block wipes up in $muted 26px: 'Applied here to "
  "an AI agent, which will list its own blind spots if you ask it to.' heroLeft zone, inverted treatment.",
  "Requested by the human 2026-09-08 because the term is hard to hear. FRAMING CORRECTED AND FLAGGED: he "
  "says 'I have termed this phenomenon as knowledge elicitation', but the term is established in knowledge "
  "engineering and predates this video by decades. The card credits the field and claims the APPLICATION, "
  "which is genuinely his. The spoken clause cannot be trimmed (80-100ms of air either side), so audio and "
  "card do not match unless he records a pickup. DECIDED 2026-09-08: card credits the field with no date, audio stays as recorded, no pickup. The card reads as him situating his term inside the field rather than contradicting himself, and nothing false appears on screen. Do not add a date to this card later without asking; the absence of one is the decision."),
 ("g028",1494.0,1519.0, "analogy", "segment",
  "KNOWLEDGE ELICITATION, full frame. Rebuilt 2026-09-08: the previous version redrew the architect "
  "and conveyed nothing. This one shows the MECHANISM the phrase names, and closes g003 by reusing "
  "its gaps. Three slots sit between the architect (left, his skyline of past work) and the model "
  "(right, the brain in a jar): Client's taste, Firm's style, Past work. 1495.0 both sides appear, "
  "each already holding the answer. 1502.1 'since we did not ask them' the slots show as empty. "
  "1506.3 'they just fill in the gaps' each fills with a muted guess. 1507.3 'AI models behave the "
  "same way' the jar's side lights the identical pattern. 1512.3 'unless we ask' an $accent ask line "
  "runs into both and the guesses flip to the real values. 1517.1 the phrase 'knowledge elicitation' "
  "lands in $accent as the answer.",
  "Extended to 1519.0 so it can land 'knowledge elicitation' at 1517.1, which was previously just "
  "outside the window. Full frame with no face, matching g003, so the callback reads as the same "
  "scene returning."),
 ("g030",1563.0,1575.733, "card", "overlay",
  "END CARD. Overlay beside the face, footage never cuts away. Rows accumulate on their spoken cues and "
  "none exit: youtube 1564.43, github 1565.73, linkedin 1566.43, x 1567.19, blog with the final cued row. "
  "Label caption 500 28px $muted, value display 700 36px $ink. Exactly one $accent element across the "
  "whole card: the rule under the first row. Panel x96-680, grows downward. Holds to the last frame.",
  "Cue times re-derived at build time and range-checked. Card holds 8.5s after the final row."),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out-json", required=True)
    ap.add_argument("--out-md", required=True)
    ap.add_argument("--cut-transcript", required=True)
    a = ap.parse_args()

    cut = json.load(open(a.cut_transcript))
    total = cut["totalSeconds"]
    parts = []
    for i, (pid, s, e, kind, cls, direction, notes) in enumerate(BEATS):
        if e > total + 0.01:
            sys.exit(f"{pid} ends at {e} past the cut ({total})")
        parts.append({"id": pid, "start": round(s, 3), "end": round(e, 3),
                      "kind": kind, "class": cls,
                      "direction": direction, "notes": notes})
    json.dump({"video": "outputs/base-cut.mov", "fps": 30,
               "totalSeconds": total,
               "_demoScene": "graphics-build/demo-scene.json (applied by the footage pass, not a part here)",
               "parts": parts}, open(a.out_json, "w"), indent=1)

    def f(x): return f"{int(x)//60}:{int(x)%60:04.1f}"
    NONTYPO = {"analogy", "contrast", "loop", "strike-list", "self-demonstrating", "diagram"}
    with open(a.out_md, "w") as m:
        m.write("# 03-project-context — graphics plan\n\n")
        m.write(f"Cut **{f(total)}**, {len(parts)} parts. "
                f"Demo scene runs 3:25.0 to 22:31.0 and is applied by the footage pass.\n\n")
        nt = sum(1 for p in parts if p["kind"] in NONTYPO)
        m.write(f"Non-typographic scenes: **{nt}** against a style floor of 2.\n\n")
        m.write("| id | in | out | len | kind | class | what |\n|---|---|---|---|---|---|---|\n")
        for p in parts:
            d = p["end"] - p["start"]
            short = p["direction"].split(".")[0][:90]
            m.write(f"| {p['id']} | {f(p['start'])} | {f(p['end'])} | {d:.0f}s | "
                    f"{p['kind']} | {p['class']} | {short} |\n")
        m.write("\n## Coverage\n\n")
        gaps = []
        prev = 0.0
        for p in parts:
            if p["start"] - prev > 60:
                gaps.append((prev, p["start"]))
            prev = max(prev, p["end"])
        if total - prev > 60:
            gaps.append((prev, total))
        m.write(f"Longest plain stretches over a minute: {len(gaps)}\n\n")
        for x, y in gaps:
            m.write(f"- {f(x)} to {f(y)} ({y-x:.0f}s)\n")
        m.write("\n## Full direction\n\n")
        for p in parts:
            m.write(f"### {p['id']}  {f(p['start'])}-{f(p['end'])}  `{p['kind']}` / `{p['class']}`\n\n")
            m.write(p["direction"] + "\n\n")
            if p["notes"]:
                m.write(f"*{p['notes']}*\n\n")
    print(f"parts {len(parts)}   non-typographic {nt}")
    print(f"wrote {a.out_json}\nwrote {a.out_md}")


main()
