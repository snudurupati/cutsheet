// g22: aha 6 resolved, THE PEAK of the video's ahas. g21's stack returns on frame 0 with EPISODE 3
// and EPISODE 5 lit; the other six fade and the two lit bars grow into two big rows. The hypothesis
// ring is planted here (g21 only stated the hunch): OBSERVE and HUNCH lit, TEST current.
// 'jerky': EPISODE 3's tail fills with a busy squiggle, LAST-MINUTE CORRECTION; 'accomplished': a
// tick. 'smooth': EPISODE 5's tail gets a calm line, SMOOTH INSERTION, tick. 'love': the hunch is
// struck, the rows collapse to a strip, the ring leaves, and the answer takes the card at 64px (the
// biggest type in the demo cards) with a tick and the accent rule. 'good': the answer's tick pulses.
// What moves when (113s): the ring's dot laps every 4s until 'love' (no playhead loops: review
// 2026-10-28 read them as ticking). One accent at a time: TEST node, then the answer's rule.
import { C, emit, frames, panelClass, fg, dim, wipeUp, struck, strikeIn } from "../lib.mjs";
import { T, EYEBROW, rowUp, drawAll, cueRel, exitIfFree, f3, prng } from "../common.mjs";
import { POS, CW, CH, BX0, BX1, BH, barY, stackSVG, loopSVG, orbJS, chg, tickSVG, TXC } from "./_demo2.mjs";

const ID = "g22";
const RX0 = 24, RX1 = 500, RH = 34, RW = RX1 - RX0;
const ROWS = [{ k: 3, i: 2, y: 86 }, { k: 5, i: 4, y: 192 }];
const rtx = fr => RX0 + RW * fr / 500;

export default function build() {
  const D = frames(ID) / 30, F = fg(ID), M = dim(ID);
  const c = k => cueRel(ID, k);
  const tJerky = c("jerky"), tAcc = c("accomplished"), tSmooth = c("smooth"), tLove = c("love"), tGood = c("good");
  const TX = rtx(400), TW = RX1 - TX;

  // the tails, in row-local px: a busy correction and a calm insertion
  const r = prng(22);
  let busy = `M2,${RH / 2}`;
  for (let x = 6; x <= TW - 4; x += 4.5) busy += ` L${f3(x)},${f3(RH / 2 + (x % 9 < 4.5 ? -1 : 1) * (5 + r() * 9))}`;
  let calm = `M2,${RH / 2 + 4}`;
  for (let x = 6; x <= TW - 4; x += 4) calm += ` L${f3(x)},${f3(RH / 2 + 4 * Math.cos(x / (TW - 4) * Math.PI))}`;
  const row = ({ k, y }) => `
    <div id="${ID}-row${k}" style="position:absolute;left:${RX0}px;top:${y}px;width:${RW}px;height:${RH}px">
      <svg style="position:absolute;left:0;top:0;overflow:visible" width="${RW}" height="${RH}" viewBox="0 0 ${RW} ${RH}">
        <rect x="0" y="0" width="${RW}" height="${RH}" rx="4" fill="${F}"/>
        <rect x="${f3(TX - RX0)}" y="0" width="${f3(TW)}" height="${RH}" rx="4" fill="${M}"/>
        <path id="${ID}-sq${k}" class="dr" pathLength="1" transform="translate(${f3(TX - RX0)},0)" d="${k === 3 ? busy : calm}"
              fill="none" stroke="${C.ink}" stroke-width="${k === 3 ? 2.5 : 3}" stroke-linecap="round" stroke-linejoin="round"/>
      </svg></div>`;

  const inner = `
    ${EYEBROW("Episode tails", 24, 16, M, `${ID}-eb`)}
    ${stackSVG(ID, F, M, { lit: [2, 4], tails: true })}
    ${ROWS.map(row).join("")}
    <svg id="${ID}-phs" style="position:absolute;left:0;top:0;overflow:visible" width="528" height="428" viewBox="0 0 528 428">
      ${ROWS.map(({ k, y }) => `<line id="${ID}-ph${k}" x1="${RX0}" y1="${y - 3}" x2="${RX0}" y2="${y + RH + 3}" stroke="${C.ink}" stroke-width="2.5" opacity="0"/>`).join("")}</svg>
    ${T("EPISODE 3", RX0, 56, 22, { weight: 700, color: F, ls: 0.1, id: `${ID}-e3` })}
    ${T("EPISODE 5", RX0, 162, 22, { weight: 700, color: F, ls: 0.1, id: `${ID}-e5` })}
    ${tickSVG(`${ID}-k3`, RX0, 125, F)}
    ${T("LAST-MINUTE CORRECTION", RX0 + 38, 127, 22, { weight: 700, color: F, ls: 0.08, id: `${ID}-c3` })}
    ${tickSVG(`${ID}-k5`, RX0, 231, F)}
    ${T("SMOOTH INSERTION", RX0 + 38, 233, 22, { weight: 700, color: F, ls: 0.08, id: `${ID}-c5` })}
    ${loopSVG(ID, F, M)}
    ${T("HUNCH", TXC, 276, 20, { weight: 700, color: M, ls: 0.14, id: `${ID}-hh` })}
    <div id="${ID}-ht" style="position:absolute;left:${TXC}px;top:300px;font-family:Satoshi,sans-serif;font-variation-settings:'wght' 700;font-size:24px;line-height:1.12;color:${F};white-space:nowrap">${struck(`${ID}-st`, "idle tail = failed episode", M, 2)}</div>
    ${T("DATA ANSWERS", 24, 172, 22, { weight: 700, color: F, ls: 0.14, id: `${ID}-ah` })}
    ${tickSVG(`${ID}-ka`, 18, 222, F, 40)}
    ${T("busy tail =<br>correction,<br>not failure", 70, 200, 64, { w: 440, weight: 700, color: F, lh: 1.02, id: `${ID}-at` })}
    <svg id="${ID}-ar" style="position:absolute;left:70px;top:404px;overflow:visible" width="330" height="8"><line class="dr" pathLength="1" x1="2" y1="3" x2="326" y2="3" stroke="${C.accent}" stroke-width="6" stroke-linecap="round"/></svg>`;
  const body = `<div id="${ID}-card" class="${panelClass(ID)}" style="position:absolute;left:${POS.x}px;top:${POS.y}px;width:${CW}px;height:${CH}px">${inner}</div>`;

  let js = "";
  js += wipeUp(`#${ID}-card`, 0, 0.35);
  // the loop returns as g21 left it, then TEST takes the accent: the hunch is being tested
  // the ring draws once the stack has handed over; each node appears as the stroke reaches it
  // ring and nodes fade in together (no lone node drawing ahead of its ring)
  js += drawAll(`#${ID}-ring`, 0.05, 0.25);
  js += `tl.fromTo("#${ID}-loop",{opacity:0},{opacity:1,duration:0.4,ease:"power2.out"},0.9);\n`;
  js += chg(`#${ID}-n-observe`, `{fill:"${C.ink}"}`, `{fill:"${F}"}`, 1.0);
  js += chg(`#${ID}-n-hunch`, `{fill:"${C.ink}"}`, `{fill:"${F}"}`, 1.15);
  js += chg(`#${ID}-n-test`, `{fill:"${C.ink}",stroke:"${M}"}`, `{fill:"${C.accent}",stroke:"${C.accent}"}`, 1.5);
  js += rowUp(`#${ID}-hh`, 1.2) + rowUp(`#${ID}-ht`, 1.3) + rowUp(`#${ID}-eb`, 0.15);
  js += orbJS(ID, 1.5, D);
  // the stack hands its two lit bars to the big rows
  [0, 1, 3, 5, 6, 7].forEach(i => { js += chg(`#${ID}-bar${i}`, `{opacity:0.35}`, `{opacity:0}`, 0.6, 0.45); });
  ROWS.forEach(({ k, i, y }) => {
    js += chg(`#${ID}-bar${i}`, `{opacity:1}`, `{opacity:0}`, 0.65, 0.2);
    js += `tl.fromTo("#${ID}-row${k}",{opacity:0},{opacity:1,duration:0.2,immediateRender:true},0.6);\n`;
    js += `tl.fromTo("#${ID}-row${k}",{x:${BX0 - RX0},y:${barY(i) - y},scaleX:${f3((BX1 - BX0) / RW)},scaleY:${f3(BH / RH)},transformOrigin:"0px 0px"},{x:0,y:0,scaleX:1,scaleY:1,transformOrigin:"0px 0px",duration:0.8,ease:"power3.inOut",immediateRender:true},0.7);\n`;
  });
  js += rowUp(`#${ID}-e3`, 1.2) + rowUp(`#${ID}-e5`, 1.35);
  // 'jerky': the busy correction draws into EPISODE 3's tail; 'accomplished': tick
  js += drawAll(`#${ID}-sq3`, tJerky, 0.9);
  js += rowUp(`#${ID}-c3`, tJerky + 0.3);
  js += drawAll(`#${ID}-k3 path`, tAcc, 0.4);
  // 'smooth': the calm insertion into EPISODE 5's tail, its label, tick as the insertion completes
  js += drawAll(`#${ID}-sq5`, tSmooth, 0.9);
  js += rowUp(`#${ID}-c5`, tSmooth + 0.2);
  js += drawAll(`#${ID}-k5 path`, tSmooth + 1.2, 0.4);
  // 'love', THE PEAK: the hunch is struck; the two rows collapse to a strip at the top, their
  // labels go, the ring leaves, and the answer
  // takes the card at 64px with a tick and the accent rule under it (the scene's one accent).
  js += strikeIn(`${ID}-st`, tLove, 0.35);
  const tC = tLove + 0.5;
  js += chg(`#${ID}-n-test`, `{fill:"${C.accent}",stroke:"${C.accent}"}`, `{fill:"${F}",stroke:"${M}"}`, tC);
  js += chg(`#${ID}-n-answers`, `{fill:"${C.ink}"}`, `{fill:"${F}"}`, tC);
  js += chg([`#${ID}-e3`, `#${ID}-e5`, `#${ID}-c3`, `#${ID}-c5`, `#${ID}-k3`, `#${ID}-k5`], `{opacity:1}`, `{opacity:0}`, tC, 0.3);
  ROWS.forEach(({ k, y }, j) => {
    js += `tl.fromTo("#${ID}-row${k}",{y:0,scaleY:1,transformOrigin:"0px 0px"},{y:${60 + j * 20 - y},scaleY:${f3(14 / RH)},transformOrigin:"0px 0px",duration:0.6,ease:"power3.inOut",immediateRender:false},${f3(tC)});\n`;
  });
  // the struck hunch rides up to sit under the strip, quieter
  js += `tl.fromTo(["#${ID}-hh","#${ID}-ht"],{x:0,y:0},{x:${24 - TXC},y:-172,duration:0.6,ease:"power3.inOut",immediateRender:false},${f3(tC)});\n`;
  js += chg(`#${ID}-ht`, `{opacity:1}`, `{opacity:0.55}`, tC, 0.4);
  // the ring has done its job: it leaves so the answer can take the card
  js += chg(`#${ID}-loop`, `{opacity:1}`, `{opacity:0}`, tC, 0.35);
  js += rowUp(`#${ID}-ah`, tC + 0.6);
  js += `tl.fromTo("#${ID}-at",{opacity:0,y:18},{opacity:1,y:0,duration:0.45,ease:"power3.out"},${f3(tC + 0.75)});\n`;
  js += drawAll(`#${ID}-ka path`, tC + 1.0, 0.4);
  js += drawAll(`#${ID}-ar line`, tC + 1.2, 0.55);
  // 'good': the answer's tick pulses once
  js += `tl.fromTo("#${ID}-ka",{scale:1,transformOrigin:"50% 50%"},{scale:1.35,transformOrigin:"50% 50%",duration:0.22,yoyo:true,repeat:1,ease:"power2.out",immediateRender:false},${f3(tGood)});\n`;
  js += exitIfFree(ID, D, [`#${ID}-card`]);
  emit(ID, D, body, js);
}
