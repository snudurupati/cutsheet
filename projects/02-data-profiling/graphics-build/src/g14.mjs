// g14: hypothesis loop, return 1 resolved (opaque card over PushT's Rerun viewer). The ring arrives as
// g13 left it (OBSERVE, HUNCH visited, TEST current) with the hunch row. On "not really outliers" DATA
// ANSWERS lifts to accent; its line 'Hard starts, not mistakes' lands on "starting position". On
// "legitimate" KEEP THEM lands with a drawn 5px tick (the win, marked louder than the miss). On "wrong"
// the hunch's two lines take a 2px dim strike each and the HUNCH node is struck too.
// Moving: the dot travels TEST -> DATA ANSWERS, arriving on "not really outliers" (only on cues); state changes on each cue.
import { C, emit, frames, panelClass, fg, dim, wipeUp, struck, strikeIn } from "../lib.mjs";
import { T, EYEBROW, rowUp, drawAll, cueRel, exitIfFree, f3 } from "../common.mjs";
import { ringGeom, ringSVG, accentOn, accentOff, dotMove, holdOn } from "./_loop.mjs";

const ID = "g14";
// ONE position for the whole part (finished-cut review 2026-10-28): the card used to dissolve out with the
// space swipe and back in at the notebook margin, timed on the preview footage's swipe, but base-screen.mp4
// puts the swipe 20 frames later, so in the finished cut the card vanished and popped back mid-hold while the
// screen was still Rerun. It now sits from the first frame at the notebook's empty right margin (the g13
// slot). Over Rerun that spot covers the reward plot and the Selection panel, neither of which he is talking
// about (he is on the T's starting position in the image view); over the notebook the old Rerun spot would
// cover the IQR code. Clear of the face inset (top 528) on both screens.
const POS = { x: 1340, y: 56 };
const W = 440, H = 372;

export default function build() {
  const D = frames(ID) / 30;
  const tLeg = cueRel(ID, "legitimate"), tWrong = cueRel(ID, "wrong");
  const tNot = 903.13 - 902.6;            // "these are not really outliers" (transcript-cut.json)
  const tStart = 905.09 - 902.6;          // "the starting position was a little awkward"
  const F = fg(ID), M = dim(ID);
  const g = ringGeom(104, 200, 0.6);
  const RX = 212;
  const n1 = g.node(1);
  const body = `
<div id="${ID}-wrap" style="position:absolute;left:0;top:0">
<div id="${ID}-card" class="${panelClass(ID)}" style="position:absolute;left:${POS.x}px;top:${POS.y}px;width:${W}px;height:${H}px">
  ${EYEBROW("Hypothesis loop", 28, 24, M, `${ID}-eb`)}
  ${ringSVG(ID, g, ID)}
  <svg style="position:absolute;left:0;top:0;overflow:visible" width="10" height="10">
    <line id="${ID}-ns" class="dr" pathLength="1" x1="${f3(n1[0] - 16)}" y1="${f3(n1[1] + 16)}" x2="${f3(n1[0] + 16)}" y2="${f3(n1[1] - 16)}" stroke="${M}" stroke-width="3" stroke-linecap="round"/></svg>
  ${T("Hunch", RX, 84, 20, { weight: 700, color: M, upper: true, ls: 0.14, id: `${ID}-hl` })}
  <div id="${ID}-h" style="position:absolute;left:${RX}px;top:112px;font-family:Satoshi,sans-serif;font-variation-settings:'wght' 500;font-size:26px;line-height:32px;color:${F}">
    <div>${struck(`${ID}-s0`, "184 and 174", M, 2)}</div><div>${struck(`${ID}-s1`, "are bad data", M, 2)}</div></div>
  ${T("Data answers", RX, 196, 20, { weight: 700, color: M, upper: true, ls: 0.14, id: `${ID}-dl` })}
  ${T("Hard starts,", RX, 224, 26, { weight: 500, color: F, id: `${ID}-d0` })}
  ${T("not mistakes", RX, 256, 26, { weight: 500, color: F, id: `${ID}-d1` })}
  <div id="${ID}-keep" style="position:absolute;left:28px;top:304px;display:flex;align-items:center;gap:14px">
    <div style="font-family:Satoshi,sans-serif;font-variation-settings:'wght' 900;font-size:30px;line-height:1.1;letter-spacing:.06em;color:${F};white-space:nowrap">KEEP THEM</div>
    <svg width="44" height="40" viewBox="0 0 44 40" style="overflow:visible"><path id="${ID}-tick" class="dr" pathLength="1" d="M4,20 L16,33 L40,5" fill="none" stroke="${F}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </div>
</div></div>`;

  let js = "";
  js += wipeUp(`#${ID}-card`, 0, 0.35);
  js += rowUp(`#${ID}-eb`, 0.2);
  // the ring as g13 left it: drawn, all four nodes in, TEST current (visited nodes are unlit muted rings)
  js += drawAll(`#${ID}-ring`, 0.05, 0.5);
  js += [0, 1, 2, 3].map(i => holdOn(`#${ID}-n${i}`)).join("") + holdOn(`#${ID}-na2`);
  js += rowUp(`#${ID}-hl`, 0.25) + rowUp(`#${ID}-h`, 0.35);
  // "not really outliers": the data answers
  // the dot arrives at DATA ANSWERS as it lights on "not really outliers" (move takes ~0.575s)
  js += dotMove(ID, g, 2, 3, Math.max(0.02, tNot - 0.5));
  js += accentOff(ID, 2, tNot) + accentOn(ID, 3, tNot) + rowUp(`#${ID}-dl`, tNot);
  js += `tl.fromTo("#${ID}-dl",{color:"${M}"},{color:"${F}",duration:0.3,immediateRender:false},${f3(tNot + 0.1)});\n`;
  js += rowUp(`#${ID}-d0`, tStart) + rowUp(`#${ID}-d1`, tStart + 0.4);
  // "legitimate": keep them, with a drawn tick
  js += rowUp(`#${ID}-keep`, tLeg) + drawAll(`#${ID}-tick`, tLeg + 0.1, 0.4);
  // "wrong": the hunch was wrong, not the data
  js += strikeIn(`${ID}-s0`, tWrong, 0.3) + strikeIn(`${ID}-s1`, tWrong + 0.25, 0.3);
  js += drawAll(`#${ID}-ns`, tWrong + 0.1, 0.3);
  js += `tl.fromTo("#${ID}-h",{color:"${F}"},{color:"${M}",duration:0.3,immediateRender:false},${f3(tWrong)});\n`;
  js += exitIfFree(ID, D, [`#${ID}-card`]);
  emit(ID, D, body, js);
}
