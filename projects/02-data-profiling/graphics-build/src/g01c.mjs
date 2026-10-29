// g01c: HOOK candidate C, "the left arm grabs first" (the human's pick of Option 2, 2026-10-28). Same HERO
// card (light-reinforced sheet) and window as g01a/g01b, over "you can even find God in data. This much has
// been clear to those who study it."
// Data only from aloha-hook.json (make_aloha_hook.py measures lerobot/aloha_sim_insertion_human, a
// SIMULATED set with human teleop, and refuses to write if the claim stops holding). Copy never says "real".
//  * from frame 1, 50 rows (one per episode, 0-6.4s left to right) stream in as noise: each episode's
//    whole-arm speed at 50 fps, rows overlapping so they tangle. A playhead rides the stream's front.
//  * "God": the noise dims; each row gets two equal dots at the frames its grippers clamp, left ($accent,
//    the one accent element) and right (ink), joined by an ink rule. Every left dot is before its right.
//  * "This": the plot rises to make room; LEFT / RIGHT keys, a time axis, "50 / 50 ROBOT EPISODES" and
//    "The left arm grabs first."
//  * "study": a halo ring pulses out from every left dot. Between beats the left column breathes.
// Composition review 2026-10-28 (round 1, all fixed): noise read as ruled lines (now speed, 3x pitch);
// whose hand (now "robot" / "arm"); no time axis (added); keys 20px -> 26px; dots equal size; bottom
// third empty until "This" (plot starts centred, rises); study pulse invisible (halo); rules too faint.
import { C, emit, frames, panelClass, fg, dim, wipeUp } from "../lib.mjs";
import { cueRel, exitIfFree, HERO, f3, rowUp, T, EYEBROW } from "../common.mjs";
import { readFileSync } from "node:fs";

const ID = "g01c";
export default function build() {
  const D = frames(ID) / 30;
  const tGod = cueRel(ID, "god"), tThis = cueRel(ID, "this"), tStudy = cueRel(ID, "study");
  const F = fg(ID), M = dim(ID);
  const X = HERO.x, Y = HERO.y, W = HERO.w, H = HERO.h, IW = W - 12, IH = H - 12;
  const A = JSON.parse(readFileSync("aloha-hook.json", "utf8"));
  if (A.leftFirst !== A.episodes || A.eps.length !== 50) throw new Error(`${ID}: aloha-hook.json no longer says 50/50`);

  // ---- geometry (card-inner): the first 320 frames (6.4s; every clamp is inside it) across 500px
  const SPAN = 320, X0 = 40, SX = 500 / SPAN, R0 = 52, PITCH = 5.8, AMP = 6.5, RD = 4.6;
  if (Math.max(...A.eps.map(e => e.right)) >= SPAN) throw new Error(`${ID}: a clamp falls past the ${SPAN}-frame window`);
  const rowY = k => R0 + k * PITCH, yLast = rowY(49), AX = yLast + 12;
  const LIFT = Math.round((IH - (AX + 24 - R0 + 30)) / 2 - R0 + 20);     // plot starts centred in the card
  const traces = A.eps.map((e, k) => {
    const pts = e.trace.filter((_, i) => i * A.traceStep <= SPAN).map((z, i) => `${f3(X0 + i * A.traceStep * SX)},${f3(rowY(k) - Math.max(-1.5, Math.min(2.8, z)) * AMP)}`);
    return `<polyline points="${pts.join(" ")}" fill="none" stroke="${M}" stroke-width="1" stroke-linejoin="round"/>`; }).join("");
  const lx = e => X0 + e.left * SX, rx = e => X0 + e.right * SX;
  const marks = A.eps.map((e, k) => `
    <line id="${ID}-c${k}" class="dr" pathLength="1" x1="${f3(lx(e) + RD)}" y1="${f3(rowY(k))}" x2="${f3(rx(e) - RD)}" y2="${f3(rowY(k))}" stroke="${F}" stroke-width="1.5" opacity=".55"/>
    <circle id="${ID}-h${k}" cx="${f3(lx(e))}" cy="${f3(rowY(k))}" r="${RD}" fill="none" stroke="${C.accent}" stroke-width="1.6" opacity="0"/>
    <circle id="${ID}-l${k}" cx="${f3(lx(e))}" cy="${f3(rowY(k))}" r="0" fill="${C.accent}"/>
    <circle id="${ID}-r${k}" cx="${f3(rx(e))}" cy="${f3(rowY(k))}" r="0" fill="${F}"/>`).join("");
  const mL = X0 + A.leftMeanS * A.fps * SX, mR = X0 + A.rightMeanS * A.fps * SX;
  const axis = `<line x1="${X0}" y1="${AX}" x2="${X0 + 500}" y2="${AX}" stroke="${M}" stroke-width="1.5"/>
    <line x1="${X0}" y1="${AX - 4}" x2="${X0}" y2="${AX + 4}" stroke="${M}" stroke-width="1.5"/>
    <line x1="${X0 + 500}" y1="${AX - 4}" x2="${X0 + 500}" y2="${AX + 4}" stroke="${M}" stroke-width="1.5"/>`;

  const body = `
<div id="${ID}-card" class="${panelClass(ID)}" style="position:absolute;left:${X}px;top:${Y}px;width:${W}px;height:${H}px">
  <div style="position:absolute;left:0;top:0;width:${IW}px;height:${IH}px;overflow:hidden">
    <div id="${ID}-plot" style="position:absolute;left:0;top:0;width:${IW}px;height:${IH}px">
      <div id="${ID}-stream" style="position:absolute;left:0;top:0;width:${IW}px;height:${IH}px;clip-path:inset(0 100% 0 0)">
        <svg id="${ID}-tr" style="position:absolute;left:0;top:0;overflow:visible" width="${IW}" height="${IH}" opacity=".8">${traces}</svg>
      </div>
      <div id="${ID}-ph" style="position:absolute;left:${X0}px;top:${R0 - 22}px;width:2px;height:${f3(yLast - R0 + 36)}px;background:${F};opacity:0"></div>
      <svg style="position:absolute;left:0;top:0;overflow:visible" width="${IW}" height="${IH}"><g id="${ID}-ax" opacity="0">${axis}</g>${marks}</svg>
      ${T("0s", X0, AX + 6, 20, { id: `${ID}-t0`, weight: 600, color: M })}
      ${T("time →", X0 + 250 - 40, AX + 6, 20, { id: `${ID}-tm`, weight: 600, color: M, w: 80, align: "center" })}
      ${T("6s", X0 + 500 - 40, AX + 6, 20, { id: `${ID}-t1`, weight: 600, color: M, w: 40, align: "right" })}
      ${T("Left", 0, 8, 26, { id: `${ID}-lL`, w: mL + 24, align: "right", weight: 800, color: C.accent, ls: 0.12, upper: true })}
      ${T("Right", mR - 24, 8, 26, { id: `${ID}-lR`, weight: 800, color: F, ls: 0.12, upper: true })}
    </div>
    ${EYEBROW("50 / 50 robot episodes", X0, 390, M, `${ID}-eb`)}
    ${T("The left arm grabs first.", X0, 424, 40, { id: `${ID}-hd`, weight: 800, color: F, lh: 1.05 })}
  </div>
</div>
<style>#${ID}-lL,#${ID}-lR,#${ID}-eb,#${ID}-hd,#${ID}-t0,#${ID}-tm,#${ID}-t1{opacity:0}</style>`;

  let js = "";
  js += wipeUp(`#${ID}-card`, 0, 0.35);
  // the plot sits centred while it is alone, then rises to make room for the copy on "This"
  js += `tl.fromTo("#${ID}-plot",{y:${LIFT}},{y:0,duration:0.5,ease:"power2.inOut",immediateRender:true},${f3(tThis - 0.35)});\n`;
  // the stream: rows fill left to right from frame 1, a playhead on the front
  const s0 = 0.02, s1 = Math.max(0.55, tGod - 0.05);
  js += `tl.fromTo("#${ID}-stream",{clipPath:"inset(0 100% 0 0)"},{clipPath:"inset(0 0% 0 0)",duration:${f3(s1 - s0)},ease:"none",immediateRender:true},${f3(s0)});\n`;
  js += `tl.fromTo("#${ID}-ph",{x:0,opacity:0.8},{x:${f3(500)},opacity:0.8,duration:${f3(s1 - s0)},ease:"none",immediateRender:true},${f3(s0)});\n`;
  js += `tl.fromTo("#${ID}-ph",{opacity:0.8},{opacity:0,duration:0.15,immediateRender:false},${f3(s1)});\n`;
  // "God": the noise dims, the clamp dots land row by row, top to bottom
  js += `tl.fromTo("#${ID}-tr",{opacity:0.8},{opacity:0.12,duration:0.4,ease:"power2.out",immediateRender:false},${f3(tGod - 0.05)});\n`;
  A.eps.forEach((e, k) => {
    const t = tGod - 0.02 + k * 0.012;
    js += `tl.fromTo("#${ID}-l${k}",{attr:{r:0}},{attr:{r:${RD}},duration:0.22,ease:"back.out(2)",immediateRender:false},${f3(t)});\n`;
    js += `tl.fromTo("#${ID}-r${k}",{attr:{r:0}},{attr:{r:${RD}},duration:0.22,ease:"back.out(2)",immediateRender:false},${f3(t + 0.08)});\n`;
    js += `tl.fromTo("#${ID}-c${k}",{strokeDashoffset:1},{strokeDashoffset:0,duration:0.25,ease:"power2.out",immediateRender:false},${f3(t + 0.04)});\n`;
  });
  // "This": keys and axis with the rise, then the claim
  js += rowUp(`#${ID}-lL`, tThis - 0.15) + rowUp(`#${ID}-lR`, tThis - 0.05);
  js += `tl.fromTo("#${ID}-ax",{opacity:0},{opacity:1,duration:0.3,immediateRender:false},${f3(tThis)});\n`;
  js += rowUp(`#${ID}-t0`, tThis + 0.05) + rowUp(`#${ID}-tm`, tThis + 0.1) + rowUp(`#${ID}-t1`, tThis + 0.15);
  js += rowUp(`#${ID}-eb`, tThis + 0.3) + rowUp(`#${ID}-hd`, tThis + 0.55);
  // the left column breathes between beats; "study" sends a halo ring out from every left dot
  const lm = A.eps.map((_, k) => `#${ID}-l${k}`).join(","), hm = A.eps.map((_, k) => `#${ID}-h${k}`).join(",");
  const tB = tGod + 0.9, per = 0.9;
  js += `tl.fromTo("${lm}",{attr:{r:${RD}}},{attr:{r:${RD + 1}},duration:${per / 2},ease:"sine.inOut",yoyo:true,repeat:${Math.max(1, 2 * Math.floor((tStudy - tB) / per) - 1)},immediateRender:false},${f3(tB)});\n`;
  js += `tl.fromTo("${hm}",{attr:{r:${RD}},opacity:0.9},{attr:{r:${RD * 3.2}},opacity:0,duration:0.7,ease:"power2.out",immediateRender:false},${f3(tStudy - 0.05)});\n`;
  js += exitIfFree("g01a", D, [`#${ID}-card`]);
  emit(ID, D, body, js);
}
