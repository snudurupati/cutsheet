// g05x: the second half of the construction-site beat as a FULL-FRAME takeover (class segment),
// entered by MATCH-CUT from g05's card (style.md 2026-09-30): frame 0 redraws g05's last frame at the
// card's exact pixels (the carry: the same scene, frozen at the cut), the sheet grows to the full
// page, and the scene arrives scaled up whole on the paper page with dust, grain and the 1.00 -> 1.03
// drift. Hard cut out; g06 follows. The scene is g05's (sceneOf), on the same beat clock, so every
// piece built in g05 is already standing and nothing replays.
import { emit, frames } from "../lib.mjs";
import { takeoverScene, HERO, planPart } from "../common.mjs";
import { sceneOf } from "./g05.mjs";

const ID = "g05x";
export default function build() {
  const D = frames(ID) / 30;
  const shift = +(planPart(ID).start - planPart("g05").start).toFixed(3);
  if (Math.abs(planPart("g05").end - planPart(ID).start) > 0.02) throw new Error(`${ID}: does not abut g05; the match-cut needs it to`);
  const main = sceneOf(ID, D, { shift });
  const carry = sceneOf(`${ID}-k`, D, { shift, frozen: true });
  // the cut (review 2026-10-28 #1): the backdrop goes opaque in 0.25s so the face never ghosts through
  // the growing paper, and the carried card drawing SCALES WITH THE GROW onto the full layout (the
  // same transform takeoverScene gives the scene: k, L, T0), so the two copies coincide when the live
  // scene fades in over it instead of cross-fading in two places. The carry's own fade from
  // matchCutGrow is overridden by a hold that starts a frame later (later-starting tweens render last).
  const GROW = 0.6, W = 580, H = 480, B = 6;
  const k = Math.min(1600 / W, 900 / H), L = Math.round((1920 - W * k) / 2), T0 = Math.round((1080 - H * k) / 2);
  const carryW = `<div id="${ID}-cw" style="position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform-origin:0 0">${carry.inner}</div>`;
  const TK = takeoverScene(ID, D, W, H, main.inner, { from: [HERO.x, HERO.y, HERO.w, HERO.h], carry: carryW, grow: GROW, bgIn: 0.25, cIn: GROW - 0.02 });   // live scene only once the carry has landed (mid-grow it doubled)
  let cj = `tl.fromTo("#${ID}-cw",{x:0,y:0,scale:1},{x:${L - HERO.x - B},y:${T0 - HERO.y - B},scale:${k.toFixed(4)},duration:${GROW},ease:"power2.inOut",immediateRender:true},0);\n`;
  cj += `tl.fromTo("#${ID}-carry",{opacity:1},{opacity:1,duration:${(GROW + 0.04).toFixed(3)},ease:"none",immediateRender:true},0.06);\n`;
  cj += `tl.fromTo("#${ID}-carry",{opacity:1},{opacity:0,duration:0.25,ease:"power1.in",immediateRender:false},${(GROW + 0.12).toFixed(3)});\n`;
  emit(ID, D, TK.body, TK.js + carry.js + main.js + cj, ["grain.png"]);
}
