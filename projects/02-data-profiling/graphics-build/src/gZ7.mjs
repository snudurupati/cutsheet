// gZ7: legibility punch-in on the tail-motion tables (ALOHA), three framings split at the speaker's
// scrolls (1467.50, and 1481.77 + 1483.10: make_demo_spec.py). Every mark is placed on its text's
// position in its own stop and leaves before the next scroll; the face inset stays bottom-right.
//   gZ7a  on "very low": a paper box round the least-movement table's tail_motion values (0.05...),
//         the episodes whose tail barely moves
//   gZ7b  on "top three": a paper box round the most-movement table's episodes 3 / 30 / 44; then the one
//         accent box round their tail_motion values (1.15 / 1.09 / 1.03). Round 3: on "busy" (1473.7) his
//         I-beam sits in those values until 1475.9 (measured against the plateau's median frame), so the
//         box lands at 1476.1 as he says "the tail motion is barely busy... pretty busy", once it has left
//   gZ7c  on "median": a paper box round the median-rows table (46 / 40 / 34 and their values)
import { C, emit, frames } from "../lib.mjs";
import { cueRel } from "../common.mjs";
import { marks, abs } from "./_zoom.mjs";
const ID = "gZ7";
export default function build() {
  const D = frames(ID) / 30, M = marks(ID), cue = k => abs(ID, cueRel(ID, k));
  const cells = (ids, subRe, y) => ids.map(n => ({ re: new RegExp(`^${n} ?\\|`), subRe, phrase: true, ...y }));
  const LEAST_A = { ymin: 800, ymax: 960 }, MOST_B = { ymin: 1100, ymax: 1260 }, MED_C = { ymin: 1380, ymax: 1520 };
  const body =
      M.box("low", "gZ7a", { on: cue("low"), targets: cells([47, 5, 19], /0\.0\S+?(?=\s?\|)/, LEAST_A) })
    + M.box("top", "gZ7b", { on: cue("top"), targets: cells([3, 30, 44], /^\d+/, MOST_B) })
    + M.box("busy", "gZ7b", { on: 1476.1, col: C.accent, targets: cells([3, 30, 44], /1\. ?\d+/, MOST_B) })
    + M.box("median", "gZ7c", { on: cue("median"), padX: 10, targets: cells([46, 40, 34], /.*\d/, MED_C) });
  console.log(M.check());
  const [ch, cj] = M.clock(D);
  emit(ID, D, `<div style="position:absolute;inset:0">${body}${ch}</div>`, M.js() + cj);
}
