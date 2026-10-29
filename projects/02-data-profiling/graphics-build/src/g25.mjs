// g25: the VERDICT, the biggest type in the video (style.md Title card anatomy: the verdict's 180px
// exception), in the full HERO (x48 y48 w592 h492, to y 540).
// Composition review 2026-10-28, applied: the card is never shown empty (card and eyebrow land
// together 0.4s before 'enjoyed', the headline on 'enjoyed'); the accent rule spans the headline's
// MEASURED width (AGAIN_W, 'again.' at 180px measured in the DOM) and lands alone on 'fun'; the
// hook-lens motif is DROPPED here (no room under the rule at ~200px without shrinking the verdict,
// and the verdict reads stronger as type alone; the rule is the card's one accent).
// 'Fun again.' measures ~880px on one line at 180px, wider than HERO's 580px inner box, so it sets on
// two lines at the full 180px. Copy is a proposal for the human (spoken: "I enjoyed data
// engineering, data analysis after a long time ... it was fun").
// The two 180px lines sit at line-height 0.86; HyperFrames' content_overlap measures each line's FONT
// content area (1.25em = 225px), which overlaps the neighbour at any leading under 1.25 though the
// INK does not ('Fun' has no descenders, 'again.' no ascenders). The headline carries
// data-layout-ignore for that reason only; the ink clearances are checked on the render.
import { emit, frames, panelClass, fg, dim, wipeUp } from "../lib.mjs";
import { EYEBROW, rowUp, cueRel, exitIfFree, f3 } from "../common.mjs";

const ID = "g25";
const CARD = { x: 48, y: 48, w: 592, h: 492 };
const EB_Y = 30;
const HEAD = { x: 32, y: 84, size: 180, lh: 0.86 };
const AGAIN_W = 508;                       // measured: 'again.' at 180px, wght 900, -0.02em = 508.5px
const RULE = { x: 38, y: 450, h: 6 };

export default function build() {
  const D = frames(ID) / 30;
  const tEnj = cueRel(ID, "enjoyed"), tFun = cueRel(ID, "fun");
  const F = fg(ID), M = dim(ID);
  const T0 = Math.max(0, tEnj - 0.4);
  const LH = Math.round(HEAD.size * HEAD.lh);

  const body = `
<div id="${ID}-card" class="${panelClass(ID)}" style="position:absolute;left:${CARD.x}px;top:${CARD.y}px;width:${CARD.w}px;height:${CARD.h}px">
  ${EYEBROW("Data was fun once.", 36, EB_Y, M, `${ID}-eb`)}
  <div id="${ID}-h" data-layout-ignore style="position:absolute;left:${HEAD.x}px;top:${HEAD.y}px;width:540px;height:${2 * LH}px">
    ${["Fun", "again."].map((s, i) => `<div id="${ID}-h${i + 1}" style="position:absolute;left:0;top:${i * LH}px;height:${LH}px;white-space:nowrap;font-family:Satoshi,sans-serif;font-variation-settings:'wght' 900;font-size:${HEAD.size}px;line-height:${HEAD.lh};letter-spacing:-0.02em;color:${F}">${s}</div>`).join("")}
  </div>
  <div id="${ID}-rule" class="accentbar" style="position:absolute;left:${RULE.x}px;top:${RULE.y}px;width:${AGAIN_W - (RULE.x - HEAD.x) - 4}px;height:${RULE.h}px;border-radius:3px"></div>
</div>`;

  let js = wipeUp(`#${ID}-card`, T0, 0.35) + "\n";
  js += rowUp(`#${ID}-eb`, T0 + 0.05);                              // with the card
  js += rowUp(`#${ID}-h`, tEnj - 0.05, 0.4);                        // the verdict arrives WITH 'enjoyed'
  js += `tl.fromTo("#${ID}-rule",{scaleX:0,transformOrigin:"left center"},{scaleX:1,transformOrigin:"left center",duration:0.45,ease:"power2.out"},${f3(tFun)});\n`;
  // exit: a fade, not the shared top-down wipe, which cropped 'Fun' mid-glyph (review round 3)
  js += `tl.fromTo("#${ID}-card",{opacity:1},{opacity:0,duration:0.3,ease:"power1.in",immediateRender:false},${f3(D - 0.3 - 1 / 30)});\n`;
  emit(ID, D, body, js);
}
