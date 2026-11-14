// g24: the series map returns (map, second visit; g12's geometry imported via src/_close.mjs).
// Plan: PUSH-T and ALOHA carry ticks on 'two'; on 'standard' a LEROBOT v3 bracket draws under all
// three nodes. Composition review 2026-10-28: g24 must not spoil g26, so SO-101 stays as g12 left it
// (dashed $accent ring, NEXT WEEK static; g26 owns its change), and g12's WEEK 1 line is dropped
// (PUSH-T already sits under the THIS WEEK bracket). The plan's 'real' and 'test' cues go unused.
// Frame 0 is g12's end state in the full-HERO card. Motion: dots travel PUSH-T -> ALOHA and the
// dashed arrow's dashes march toward SO-101 for the whole part.
import { emit, frames, panelClass, dim, wipeUp } from "../lib.mjs";
import { EYEBROW, rowUp, drawAll, cueRel, exitIfFree } from "../common.mjs";
import { CARD, seriesMap, dotsRun, marchDashes } from "./_close.mjs";

const ID = "g24";
// Review round 3: the map scaled up inside the card. 1.15 is the most the card holds: the map's
// content spans card-local x 50-540 (580 available) and y 104-431; about (290, 331) it lands at
// x 14-577, y 70-446, clear of the eyebrow (ends y 55). 1.3 would run ~60px past both sides.
const K = 1.15, O = [290, 331];
export default function build() {
  const D = frames(ID) / 30;
  const tTwo = cueRel(ID, "two"), tStd = cueRel(ID, "standard");
  const M = dim(ID);
  const { map, so, e1 } = seriesMap(ID);

  const body = `
<div id="${ID}-card" class="${panelClass(ID)}" style="position:absolute;left:${CARD.x}px;top:${CARD.y}px;width:${CARD.w}px;height:${CARD.h}px">
  ${EYEBROW("The datasets", 28, 24, M, `${ID}-eb`)}
  <div style="position:absolute;inset:0;transform:scale(${K});transform-origin:${O[0]}px ${O[1]}px"><div id="${ID}-map" style="position:absolute;inset:0">${map}</div>
  ${so}</div>
</div>`;

  let js = wipeUp(`#${ID}-card`, 0, 0.35) + "\n";
  // 'two': the two simulated datasets are done, a drawn tick lands above each
  js += drawAll(`#${ID}-tpusht`, tTwo - 0.05, 0.35) + drawAll(`#${ID}-taloha`, tTwo + 0.35, 0.35);
  // 'standard': one LeRobot v3 bracket under all three
  js += drawAll(`#${ID}-lr`, tStd - 0.1, 0.6) + rowUp(`#${ID}-lrl`, tStd + 0.35);
  // continuous motion
  js += dotsRun([`#${ID}-dot0`], e1[0], e1[1], 0.4, D);              // one travelling dot, as in g12
  js += marchDashes(`#${ID}-e2l`, 0, D);
  js += exitIfFree(ID, D, [`#${ID}-card`]);
  emit(ID, D, body, js);
}
