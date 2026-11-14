// gZ4: punch-in on the notebook's comparison table (ALOHA beside PushT), framed left of the face inset,
// which stays bottom-right through it. Paper underlines on each row as it is read (fps, episodes, action
// size, cameras), each running from the row label's first glyph to the PushT value's last. As he starts
// the list of zeros ("no timing mismatches") the one accent box draws round the four zero rows; on
// "clean" a paper CLEAN label with a drawn tick: the clean bill of health, marked as loudly as a miss.
// On "no NaN values" the success_episodes row (NaN: no success label in sim) is dimmed under a veil.
// No scroll inside the stop; the zoom-out ends before the demo scene's exit.
import { C, emit, frames } from "../lib.mjs";
import { cueRel } from "../common.mjs";
import { marks, abs, ocrAt, plateauAbs } from "./_zoom.mjs";
const ID = "gZ4";
export default function build() {
  const D = frames(ID) / 30, M = marks(ID), cue = k => abs(ID, cueRel(ID, k));
  const within = plateauAbs("gZ4");
  // a row: its label (OCR) and its two values, whose boxes come from the label's y and each column's x
  // (the right-aligned value columns end at x 1645 and 1905 on the screen, measured on the frame at 1790)
  const row = re => {
    const l = ocrAt(within[0] + 1, re, { xmax: 1300, ymin: 1090, within });
    const y0 = l[1] - 4, y1 = l[3] + 4;
    return [{ re, xmax: 1300, ymin: 1090, prose: true },
            { est: [1540, y0, 1645, y1], prose: true }, { est: [1790, y0, 1905, y1], prose: true }];
  };
  const body =
      M.ul("fps", "gZ4", { on: cue("fps"), targets: row(/^fps$/) })
    + M.ul("episodes", "gZ4", { on: cue("episodes"), targets: row(/^episodes$/) })
    + M.ul("14", "gZ4", { on: cue("14"), targets: row(/action_size/) })
    + M.ul("camera", "gZ4", { on: cue("camera"), targets: row(/^cameras$/) })
    // round 3: the box draws as he starts the list ("no timing mismatches", 1799.0), the label lands on
    // "clean", and both hold to 0.3s before the zoom-out (1808.0)
    + M.box("clean", "gZ4", { on: 1799.0, col: C.accent, padX: 10,
        targets: [/timing_mismatches/, /video_window_mismatches/, /idle_episodes/, /dead_joints/].flatMap(row) })
    // the label sits in the empty screen under the table, left-aligned with the box (the inset holds the
    // bottom-right and the right of the box)
    + M.label("cleanL", "gZ4", { on: cue("clean"), text: "CLEAN", at: [86, 912] })
    // "no NaN values" (1804.2) while success_episodes reads NaN under the box: that row is dimmed
    + M.veil("nan", "gZ4", { on: 1804.2, targets: row(/success_episodes/) });
  console.log(M.check());
  const [ch, cj] = M.clock(D);
  emit(ID, D, `<div style="position:absolute;inset:0">${body}${ch}</div>`, M.js() + cj);
}
