// g13: hypothesis loop, return 1 (opaque card over the notebook). The g07 ring at 60% in the card's
// left half, its stages as rows on the right (label 20px caps + a 24px line). OBSERVE is current as the
// card lands on "look at these episodes"; HUNCH lifts on "hunch" with '184 and 174 are bad data'; TEST
// lifts on "training" and its line 'look at them in Rerun' lands with "look at rerun" (not before it).
// Moving: the dot travels OBSERVE -> HUNCH on "hunch" and HUNCH -> TEST on "training" (only on cues).
import { C, emit, frames, panelClass, fg, dim, wipeUp } from "../lib.mjs";
import { T, EYEBROW, rowUp, drawAll, cueRel, exitIfFree, f3 } from "../common.mjs";
import { ringGeom, ringSVG, nodeIn, accentOn, accentOff, dotMove } from "./_loop.mjs";

const ID = "g13";
// measured on screen OCR: the notebook's text runs to x 1350; the strip right of it is empty (max 540x440)
const POS = { x: 1340, y: 56 };
const W = 520, H = 380;

export default function build() {
  const D = frames(ID) / 30;
  const tHunch = cueRel(ID, "hunch"), tTrain = cueRel(ID, "training");
  const tLook0 = 793.19 - 792.4;          // "look at these episodes" (transcript-cut.json)
  const tLook1 = 809.55 - 792.4;          // "go look at rerun"
  const F = fg(ID), M = dim(ID);
  const g = ringGeom(104, 214, 0.6);
  const RX = 212, RY = [100, 190, 280];
  const ROWS = [["Observe", "Two episodes run long"], ["Hunch", "184 and 174 are bad data"], ["Test", "look at them in Rerun"]];
  const rows = ROWS.map(([l, s], k) =>
    T(l, RX, RY[k], 20, { weight: 700, color: M, upper: true, ls: 0.14, id: `${ID}-rl${k}` }) +
    T(s, RX, RY[k] + 30, 24, { weight: 500, color: F, id: `${ID}-rs${k}` })).join("");

  const body = `
<div id="${ID}-card" class="${panelClass(ID)}" style="position:absolute;left:${POS.x}px;top:${POS.y}px;width:${W}px;height:${H}px">
  ${EYEBROW("Hypothesis loop", 28, 24, M, `${ID}-eb`)}
  ${ringSVG(ID, g, ID)}
  ${rows}
</div>`;

  const lit = (k, t) => `tl.fromTo("#${ID}-rl${k}",{color:"${M}"},{color:"${F}",duration:0.3,immediateRender:false},${f3(t)});\n`;
  const unlit = (k, t) => `tl.fromTo("#${ID}-rl${k}",{color:"${F}"},{color:"${M}",duration:0.3,immediateRender:false},${f3(t)});\n`;
  let js = "";
  js += wipeUp(`#${ID}-card`, 0, 0.35);
  js += rowUp(`#${ID}-eb`, 0.2);
  js += drawAll(`#${ID}-ring`, 0.15, 0.8);
  js += [0, 1, 2, 3].map(i => nodeIn(ID, g, i, 0.3 + i * 0.15)).join("");
  // OBSERVE: the episodes he is about to look at
  js += accentOn(ID, 0, tLook0) + rowUp(`#${ID}-rl0`, tLook0) + rowUp(`#${ID}-rs0`, tLook0 + 0.15) + lit(0, tLook0);
  // "hunch"
  js += dotMove(ID, g, 0, 1, tHunch - 0.3);
  js += accentOff(ID, 0, tHunch) + unlit(0, tHunch) + accentOn(ID, 1, tHunch) + rowUp(`#${ID}-rl1`, tHunch) + rowUp(`#${ID}-rs1`, tHunch + 0.15) + lit(1, tHunch);
  // "training": TEST lifts; its line lands with "look at rerun"
  js += dotMove(ID, g, 1, 2, tTrain - 0.3);
  js += accentOff(ID, 1, tTrain) + unlit(1, tTrain) + accentOn(ID, 2, tTrain) + rowUp(`#${ID}-rl2`, tTrain) + lit(2, tTrain);
  js += rowUp(`#${ID}-rs2`, tLook1);
  js += exitIfFree(ID, D, [`#${ID}-card`]);
  emit(ID, D, body, js);
}
