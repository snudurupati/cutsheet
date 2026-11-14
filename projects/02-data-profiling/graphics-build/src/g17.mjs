// g17: aha 3. Hypothesis loop, return 2, as a stat panel over the notebook (opaque, right strip).
// Enters on "my hunch"; HUNCH "reward tracks demo quality" lands on "quality". The card leaves while
// he plots and comes back on "correlation" grown to its full state.
// Review 2026-10-28 (decided): the figure is "≈ 0", landing ON the spoken "0.01" with a wipe (the slot
// is empty until then, no count-up); "corr −0.01" sits under it, true to the plot title beside it.
// DATA ANSWERS: what the data showed, "no link to length", on "doesn't correlate"; his assumption
// arrives on "outlining" as a provisional dim line, "likely: reward scores / the final fit", no tick.
// Two card states = two card elements (short: ring + hunch; tall: everything), each on its own slide
// wrapper. The dot laps the ring whenever a card is on screen.
// Not used: the plan's "plot" cue (1130.3); the card is off screen while he writes the plots.
import { C, emit, frames, panelClass, fg, dim } from "../lib.mjs";
import { rowUp, cueRel, exitIfFree, f3 } from "../common.mjs";
import { slides, stateTracker, hunchPanel, loopDot, NODE_OFF, NODE_LIT, NODE_ACC, drawIn, figureIn } from "./_demo1.mjs";

const ID = "g17";
const POS = { x: 1340, y: 56 };
export default function build() {
  const D = frames(ID) / 30;
  const c = k => cueRel(ID, k);
  const F = fg(ID), M = dim(ID), cls = panelClass(ID);
  const tHunch = 1104.6 - 1101.0667;      // "my hunch" (transcript-cut.json)
  const tNoCorr = 1164.8 - 1101.0667;     // "don't correlate to the reward"
  const tQ = c("quality"), tCorr = c("correlation"), t001 = c("001"), tOut = c("outlining");
  const A = `${ID}-a`, B = `${ID}-b`;
  const hunch = [{ lines: ["reward tracks", "demo quality"], size: 26, color: F }];

  const body = `
<div id="${A}-w" style="position:absolute;left:${POS.x}px;top:${POS.y}px;width:540px;height:246px">
  ${hunchPanel(A, cls, F, M, { H: 246, hunches: hunch })}</div>
<div id="${B}-w" style="position:absolute;left:${POS.x}px;top:${POS.y}px;width:540px;height:440px">
  ${hunchPanel(B, cls, F, M, { H: 440, hunches: hunch,
      answer: { proven: ["no link to length"], likely: ["likely: reward scores", "the final fit"] },
      stat: { label: "length vs reward", sub: "corr −0.01" } })}</div>`;

  const aIn = tHunch - 0.5, aOut = tQ + 6, bIn = tCorr - 0.6;
  let js = slides(`#${A}-w`, [[aIn, aOut]]);
  js += slides(`#${B}-w`, [[bIn, null]]);
  js += loopDot(A, aIn, aOut + 0.6) + loopDot(B, bIn, D);

  // card A: OBSERVE lit, HUNCH current from the entrance ("my hunch"); the line lands on "quality"
  const held = (sel, st) => `tl.fromTo("${sel}",${JSON.stringify(st)},{...${JSON.stringify(st)},duration:0.2,immediateRender:true},0);\n`;
  js += held(`#${A}-n0`, NODE_LIT(F)) + held(`#${A}-n1`, NODE_ACC);
  js += rowUp(`#${A}-hl`, tHunch);
  js += rowUp(`#${A}-h0l0`, tQ) + rowUp(`#${A}-h0l1`, tQ + 0.15);

  // card B: arrives with TEST visited and the hunch still current
  // review round 3: the accent stays on HUNCH (labelled) until DATA ANSWERS lights; TEST is lit, not accent
  js += held(`#${B}-n0`, NODE_LIT(F)) + held(`#${B}-n1`, NODE_ACC) + held(`#${B}-n2`, NODE_LIT(F));
  const nB = stateTracker({ [`#${B}-n1`]: NODE_ACC, [`#${B}-n3`]: NODE_OFF(M) });
  js += rowUp(`#${B}-sl`, tCorr);
  js += figureIn(`#${B}-num`, t001 - 0.1) + rowUp(`#${B}-sub`, t001 + 0.3);
  // the data answers: no link to length
  js += nB(`#${B}-n1`, NODE_LIT(F), tNoCorr) + nB(`#${B}-n3`, NODE_ACC, tNoCorr);
  js += drawIn(`#${B}-lead`, tNoCorr - 0.1, 0.35) + rowUp(`#${B}-de`, tNoCorr + 0.1) + rowUp(`#${B}-pv0`, tNoCorr + 0.25);
  // his reading, provisional
  js += rowUp(`#${B}-lk0`, tOut) + rowUp(`#${B}-lk1`, tOut + 0.15);
  js += exitIfFree(ID, D, [`#${B}`]);
  emit(ID, D, body, js);
}
