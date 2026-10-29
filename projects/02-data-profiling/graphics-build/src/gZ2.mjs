// gZ2: punch-in on the episode-length stats, metadata against data, in two framings split at the
// speaker's 162px scroll at 662.47 (make_demo_spec.py; a framing never spans a scroll). Both tables are
// framed left of the face inset, which stays bottom-right.
//   gZ2a  paper boxes on min 49 and max 246 on their words; as "average" is said they leave and a paper
//         box lands on "124" alone ("about 124"; 246 and 124 sit either side of one pipe, so their boxes
//         are never on together). Every box is snapped to the glyph ink with the pipes excluded, and
//         leaves before the scroll.
//   gZ2b  the win, marked as loudly as a miss: the one accent box round the DATA table's whole row
//         (| 206 | 25650 |, border pipes included)
//         as he says "the data agrees with that", then paper underlines on the metadata row's 206 and
//         25650 as he reads them out ("206 episodes and 25,650 frames"), held through "the metadata and
//         data agree here" until the scroll at 671.57; a paper "AGREES" label with a drawn tick beside the box.
import { C, emit, frames } from "../lib.mjs";
import { cueRel } from "../common.mjs";
import { marks, abs } from "./_zoom.mjs";
const ID = "gZ2";
export default function build() {
  const D = frames(ID) / 30, M = marks(ID), cue = k => abs(ID, cueRel(ID, k));
  const META_A = { ymin: 1320, ymax: 1380 }, META_B = { ymin: 1160, ymax: 1220 }, DATA_B = { ymin: 1385, ymax: 1460 };
  // spoken (outputs/transcript-cut.json): "49" 630.7, "246." 633.8 (round 3: on the NUMBERS, not on
  // "minimum" / "max" 1.8s earlier), "the data agrees" 664.1, "206" 666.2, "25 650" 667.7
  const body =
      M.box("mn", "gZ2a", { on: 630.7, off: cue("average") - 0.25, targets: [{ re: /^49 ?\|/, ...META_A }] })
    + M.box("mx", "gZ2a", { on: 633.8, off: cue("average") - 0.25, targets: [{ re: /^246 ?\| ?124/, sub: "246", ...META_A }] })
    + M.box("av", "gZ2a", { on: cue("average"), targets: [{ re: /^246 ?\| ?124/, subRe: /124\.5/, glyphs: [0, 3], ...META_A }] })
    + M.box("agree", "gZ2b", { on: 664.1, col: C.accent, targets: [{ re: /^25650/, ...DATA_B, estX: [880, 1350], phrase: true, keepPipes: true }] })
    // the win's label in the empty screen right of the small table, beside its accent box; it holds until
    // 0.3s before the scroll at 671.57 that ends the stop ("which is good" at 671.9 falls after that scroll)
    + M.label("agreeL", "gZ2b", { on: 664.4, text: "AGREES", at: [575, 702] })
    + M.ul("m206", "gZ2b", { on: 666.2, re: /^206\|/, ...META_B })
    + M.ul("m256", "gZ2b", { on: 667.7, re: /^25650/, ...META_B });
  console.log(M.check());
  const [ch, cj] = M.clock(D);
  emit(ID, D, `<div style="position:absolute;inset:0">${body}${ch}</div>`, M.js() + cj);
}
