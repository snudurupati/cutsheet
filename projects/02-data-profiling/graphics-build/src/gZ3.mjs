// gZ3: the IQR cell, the fences and the outlier table, in four framings split at the speaker's scrolls
// (757.07 lands the IQR output, then 772.17/773.27 re-run, 783.30 and 786.20: make_demo_spec.py). Every
// mark is placed on the text's position in ITS OWN stop and leaves before the next scroll; the gate
// proves the text under each mark holds still while it is on.
//   gZ3a  the one accent box on "49" alone (not "99 148"), as the zoom lands just after "comes out to be
//         49" (the IQR output scrolls into place on that word); a paper underline under the fences
//         25.5 221.5 on "1.5".
//   gZ3b  a paper underline under 25.5 on "the bottom end of the IQR comes at about 25".
//   gZ3c  "we do have two episodes": the accent box on the outlier rows 184 / 229 and 174 / 246.
//   gZ3d  after a 41px scroll the box is drawn again on the rows' new position ("which do fall on the
//         far end"), a paper underline under the upper fence 221.5 on "far", and the box holds through
//         "episode 184 and episode 174" until the scroll at 791.87.
import { C, emit, frames } from "../lib.mjs";
import { cueRel } from "../common.mjs";
import { marks, abs } from "./_zoom.mjs";
const ID = "gZ3";
export default function build() {
  const D = frames(ID) / 30, M = marks(ID), cue = k => abs(ID, cueRel(ID, k));
  // the two outlier rows whole, border pipes included (| 184 | 229 |, | 174 | 246 |)
  const rows = [/^184\b/, /^174\b/].map(re => ({ re, ymin: 1000, xmax: 1300, estX: [880, 1245], phrase: true, keepPipes: true }));
  // spoken (outputs/transcript-cut.json): "25" 777.7, "have" 784.5, "do fall" 786.6, "far" 788.3
  const body =
      M.box("iqr", "gZ3a", { on: 757.7, targets: [{ re: /^99 148 49/, subRe: /49$/ }] })
    + M.ul("fen", "gZ3a", { on: cue("fences"), re: /^25\.5 221\.5/, phrase: true, ymin: 1600 })
    + M.ul("low", "gZ3b", { on: 777.7, re: /^25\.5 221\.5/, sub: "25.5" })
    + M.box("out", "gZ3d", { on: 786.6, col: C.accent, targets: rows })
    + M.ul("up", "gZ3d", { on: 788.3, re: /^25\.5 221\.5/, subRe: /221\.5/ });
  console.log(M.check());
  const [ch, cj] = M.clock(D);
  emit(ID, D, `<div style="position:absolute;inset:0">${body}${ch}</div>`, M.js() + cj);
}
