// gZ1: punch-in on the PushT overview row, framed at 62% height so the face inset can sit top-right
// (make_demo_spec.py measures that the row reaches the bottom-right corner only). Paper underlines on
// 206, 25650 and fps 10 on their spoken numbers; the one accent box on the state_names cell
// {[motor_0, motor_1]} only ("two motors, motor zero, motor one"), not on total_tasks or fps; then
// paper underlines on state_shape [2] ("the state shape is two dimensions") and on the action_names
// cell ("and the action ... with two motors"). Every edge is the glyph ink of the frame (_ink.mjs),
// pipes excluded. All marks leave before the scroll at 603.60.
import { C, emit, frames } from "../lib.mjs";
import { cueRel } from "../common.mjs";
import { marks, abs } from "./_zoom.mjs";
const ID = "gZ1", Y = { ymin: 1450, ymax: 1560 };
export default function build() {
  const D = frames(ID) / 30, M = marks(ID), cue = k => abs(ID, cueRel(ID, k));
  const body =
      M.ul("ep", "gZ1", { on: cue("206"), re: /^206\|/, ...Y })
    + M.ul("fr", "gZ1", { on: cue("25k"), re: /^25650/, ...Y })
    + M.ul("fps", "gZ1", { on: cue("10"), re: /10\|\{\[mo/, subRe: /10(?=\|)/, ...Y })
    + M.box("mot", "gZ1", { on: cue("motors"), col: C.accent, targets: [{ re: /10\|\{\[mo/, subRe: /\{.*\}/, phrase: true, ...Y }] })
    // "So the state shape is two dimensions" (shape 595.3) / "And the action," (597.5): outputs/transcript-cut.json
    + M.ul("shape", "gZ1", { on: 595.3, re: /^\[2\]\|\{/, subRe: /^\[2\]/, phrase: true, ...Y })
    + M.ul("act", "gZ1", { on: 597.5, re: /^\[2\]\|\{/, subRe: /\{.*\}/, phrase: true, ...Y });
  console.log(M.check());
  const [ch, cj] = M.clock(D);
  emit(ID, D, `<div style="position:absolute;inset:0">${body}${ch}</div>`, M.js() + cj);
}
