// g18: aha 4. The same panel as g17, returning with its state changed. g17's hunch sits above, dim;
// the new HUNCH "path length measures effort" lands on "hunch". The card leaves while he writes the
// query and returns with the stat row: "≈ 0" lands ON "0.02" with a wipe, "corr −0.02" under it
// (true to the plot title). On "conclude" DATA ANSWERS is current and "or effort" joins g17's "no link
// to length". It leaves again and returns for the verdict: on "disproved" both hunches take a 2px dim
// strike (each line its own measured strike) and what the data proved, "no link to length or
// effort", takes the 5px accent tick, settling on "beautiful". The provisional reading ("likely:
// reward scores the final fit", his assumption) stays dim and unticked (review 2026-10-28).
// Moving: the dot laps the ring whenever a card is on screen.
import { C, emit, frames, panelClass, fg, dim, strikeIn } from "../lib.mjs";
import { rowUp, cueRel, exitIfFree, f3 } from "../common.mjs";
import { slides, stateTracker, hunchPanel, loopDot, NODE_OFF, NODE_LIT, NODE_ACC, drawIn, figureIn } from "./_demo1.mjs";

const ID = "g18";
// Measured 2026-10-28 on base-screen.mp4: at 1224-1238s the card covers the right half of the
// "path length vs mean_reward (corr 0.05)" plot and its title's tail, not all of it; the card is
// already at the frame's right edge, so it cannot move right far enough to clear the title.
const POS = { x: 1340, y: 56 };
export default function build() {
  const D = frames(ID) / 30;
  const c = k => cueRel(ID, k);
  const F = fg(ID), M = dim(ID), cls = panelClass(ID);
  const tH = c("hunch"), t002 = c("002"), tCon = c("conclude"), tDis = c("disproved"), tBeau = c("beautiful");
  const A = `${ID}-a`, B = `${ID}-b`;
  const hunches = [{ lines: ["reward tracks demo quality"], size: 22, color: M },
                   { lines: ["path length", "measures effort"], size: 26, color: F }];

  const body = `
<div id="${A}-w" style="position:absolute;left:${POS.x}px;top:${POS.y}px;width:540px;height:246px">
  ${hunchPanel(A, cls, F, M, { H: 246, hunches })}</div>
<div id="${B}-w" style="position:absolute;left:${POS.x}px;top:${POS.y}px;width:540px;height:440px">
  ${hunchPanel(B, cls, F, M, { H: 440, hunches,
      answer: { proven: ["no link to length", "or effort"], likely: ["likely: reward scores", "the final fit"], tick: true },
      stat: { label: "path length vs reward", sub: "corr −0.02" } })}</div>`;

  const aIn = Math.max(0, tH - 1.0), aOut = tH + 6.5, b1 = t002 - 2.0, b1Out = tCon + 3.2, b2 = tDis - 1.8;
  let js = slides(`#${A}-w`, [[aIn, aOut]]);
  js += slides(`#${B}-w`, [[b1, b1Out], [b2, null]]);
  js += loopDot(A, aIn, aOut + 0.6) + loopDot(B, b1, D);
  const held = (sel, st) => `tl.fromTo("${sel}",${JSON.stringify(st)},{...${JSON.stringify(st)},duration:0.2,immediateRender:true},0);\n`;

  // card A: the old hunch is there (dim); HUNCH current; the new hunch lands on "hunch"
  js += held(`#${A}-n0`, NODE_LIT(F)) + held(`#${A}-n1`, NODE_ACC);
  js += rowUp(`#${A}-h1l0`, tH) + rowUp(`#${A}-h1l1`, tH + 0.15);

  // card B: TEST visited, HUNCH current; g17's answer carried (eyebrow, "no link to length", the likely reading)
  // review round 3: the accent stays on HUNCH (labelled) until DATA ANSWERS lights; TEST is lit, not accent
  js += held(`#${B}-n0`, NODE_LIT(F)) + held(`#${B}-n1`, NODE_ACC) + held(`#${B}-n2`, NODE_LIT(F));
  js += `tl.fromTo("#${B}-lead",{opacity:1,strokeDashoffset:0},{opacity:1,strokeDashoffset:0,duration:0.2,immediateRender:true},0);\n`;
  const nB = stateTracker({ [`#${B}-n1`]: NODE_ACC, [`#${B}-n3`]: NODE_OFF(M) });
  js += rowUp(`#${B}-sl`, b1 + 0.45);
  js += figureIn(`#${B}-num`, t002 - 0.1) + rowUp(`#${B}-sub`, t002 + 0.3);
  // "conclude": DATA ANSWERS current, "or effort" joins the proven line
  js += nB(`#${B}-n1`, NODE_LIT(F), tCon) + nB(`#${B}-n3`, NODE_ACC, tCon);
  js += rowUp(`#${B}-pv1`, tCon + 0.2);
  // the verdict: strikes on "disproved"; the node settles to paper so the tick is the one accent
  js += strikeIn(`${B}-s0l0`, tDis, 0.3) + strikeIn(`${B}-s1l0`, tDis + 0.1, 0.3) + strikeIn(`${B}-s1l1`, tDis + 0.2, 0.3);
  js += nB(`#${B}-n3`, NODE_LIT(F), tDis + 0.2);
  // review round 3: the struck hunches fade to muted regular weight, so the ticked answer wins
  js += `tl.fromTo("#${B}-h1l0, #${B}-h1l1",{color:"${F}",fontVariationSettings:"'wght' 700"},{color:"${M}",fontVariationSettings:"'wght' 500",duration:0.4,ease:"power1.out",immediateRender:false},${f3(tDis + 0.35)});\n`;
  js += drawIn(`#${B}-tick path`, tDis + 0.3, 0.4);
  // the tick settles as he says "beautiful": a small press and release
  js += `tl.fromTo("#${B}-tick",{scale:1,transformOrigin:"50% 60%"},{scale:1.18,transformOrigin:"50% 60%",duration:0.18,yoyo:true,repeat:1,ease:"power2.out",immediateRender:false},${f3(tBeau - 0.18)});\n`;
  js += exitIfFree(ID, D, [`#${B}`]);
  emit(ID, D, body, js);
}
