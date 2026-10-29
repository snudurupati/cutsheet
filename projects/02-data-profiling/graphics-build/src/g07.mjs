// g07: the hypothesis loop, planted (the video's spine). Continues g06's HERO card with no gap: the card
// shell and the series humanoid (still holding its accent data sheet, head tilted) are exactly where g06
// leaves them on frame 0; g06's struck list is gone and g07's content clip-masks in from the left.
// The robot side-steps to the card's left edge (honest steps, humWalk) while the ring draws on
// "profiling". The ring is drawn at 70% to fit beside the robot (see the geometry note below). The sheet gives up the accent when the first node takes it ("forming").
// Nodes lift to accent in SPEECH order: "forming" HUNCH, "observing" OBSERVE, "prove" TEST, "disprove"
// DATA ANSWERS; the node left behind returns to its unlit muted ring (loop anatomy). On "disprove" a tick
// and a cross draw under the robot's sheet: the data answers either way.
// Moving: 0.15-1.77 the robot's walk; 1.3-2.5 the ring draws; the dot travels between nodes on each cue.
import { C, emit, frames, panelClass, fg, dim } from "../lib.mjs";
import { show, hide, drawAll, cueRel, exitIfFree, HERO, f3 } from "../common.mjs";
import { humanoid, humWalk, humWalkEnd, HUM } from "../hum.mjs";
import { ringGeom, ringSVG, nodeIn, accentOn, accentOff, dotMove } from "./_loop.mjs";
import { ROBOT_SCALE, ROBOT_CARD_LOCAL, ROBOT_POSE } from "./g06.mjs";

const ID = "g07";
export default function build() {
  const D = frames(ID) / 30;
  const tPro = cueRel(ID, "profiling"), tForm = cueRel(ID, "forming"), tObs = cueRel(ID, "observing"),
        tProve = cueRel(ID, "prove"), tDis = cueRel(ID, "disprove");
  const F = fg(ID), M = dim(ID);
  const X = HERO.x, Y = HERO.y, W = HERO.w, H = HERO.h;

  // ---- the robot exactly as g06 leaves it (src/g06.mjs exports: scale, card-local position, pose;
  // the sheet in the left gripper inside the foreL group, filled accent)
  const HS = ROBOT_SCALE, HID = `${ID}-h`, BEND = ROBOT_POSE.foreL;
  const [wx, wy] = HUM.wrist.L;
  const sheet = `<g transform="translate(${wx},${wy + 24}) rotate(${-BEND})">
      <rect id="${ID}-sheet" x="-42" y="0" width="84" height="104" rx="5" fill="${C.bg}" stroke="${F}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M-28,24 H28 M-28,44 H28 M-28,64 H14 M-28,84 H22" fill="none" stroke="${F}" stroke-width="4" stroke-linecap="round"/></g>`;
  const hum = humanoid(HID, 0, 0, HS, { stroke: F, visor: C.ink }).replace(`<g id="${HID}-gripL">`, `${sheet}<g id="${HID}-gripL">`);
  // The robot side-steps to the left edge and steps BACK as it goes (scale to an effective 0.64 about
  // its own feet), so the ring clears it by 40px (round 2 review). Everything below is DERIVED from
  // g06's exports and the humanoid's user-space extents, and asserted, so a change to g06's robot
  // (scale or stop position) moves the walk and the ring, or fails the build, never silently overlaps.
  const XS = ROBOT_CARD_LOCAL.x, HT = ROBOT_CARD_LOCAL.y;
  const E = Math.min(HS, 0.64), K = E / HS;                      // effective final scale, scale factor
  const U = { sheetL: -77.7, armR: 188.8, headL: 80, headR: 160, headT: 6, feet: 504, cx: 120 };   // user px
  const STR = 70 * HS, feetY = HT + U.feet * HS;
  // stop on a whole step: the furthest-left stop that keeps the sheet inside the card (x >= 4)
  let XT = null;
  for (let n = 0; n < 20; n++) { const xe = XS - (n + 0.5) * STR, ox = xe + U.cx * HS;
    if (ox + (U.sheetL - U.cx) * E >= 4) XT = xe; else break; }
  if (XT === null) throw new Error(`${ID}: no step stop keeps the sheet in the card`);
  const XL = humWalkEnd(XS, XT, HS), nSteps = Math.round((XS - XL) / STR - 0.5);
  const OX = XL + U.cx * HS;                                    // robot centre after the walk
  const ROB = { right: OX + (U.armR - U.cx) * E, headT: feetY - (U.feet - U.headT) * E, sheetL: OX + (U.sheetL - U.cx) * E };
  const tWalk = 0.15, dWalk = nSteps * 0.26 + 0.32;

  // ---- the ring (labels 22px 700 +0.14em, measured: OBSERVE 119, HUNCH 94, TEST 61, DATA 65 / ANSWERS 126)
  // At g06's 0.8 robot scale the robot needs x 38-251 of the 580px card, so the brief's radius-120 ring
  // with four side labels (546px) cannot sit beside it: the ring is drawn at 70% (radius 84, nodes and
  // labels full size), with its left node at neck height where the robot is narrowest, and DATA ANSWERS
  // sits above the robot's head, up-left of its node.
  const RCX = Math.min(347, Math.max(300, Math.ceil(ROB.right + 40 + 15 + 84)));
  const g = { ...ringGeom(RCX, 150, 0.7), r: 15 };
  const [n0, n1, n2, n3] = [0, 1, 2, 3].map(i => g.node(i));
  const PILL = `background:${C.bg};padding:3px 10px;border-radius:8px;`;
  const lab = (i, txt, style) => `<div id="${ID}-l${i}" style="position:absolute;${style};${PILL}font-family:Satoshi,sans-serif;font-variation-settings:'wght' 700;font-size:22px;line-height:1.12;letter-spacing:.14em;text-transform:uppercase;color:${M};white-space:nowrap;text-align:center">${txt}</div>`;
  // DATA ANSWERS sits up-left of its node, 40px clear above the robot's head
  const DLB = Math.min(n3[1] - 30, ROB.headT - 40), DLT = DLB - 56;
  const labels =
    lab(0, "Observe", `left:${n0[0]}px;top:${n0[1] - 15 - 8 - 31}px;transform:translateX(-50%)`) +
    lab(1, "Hunch", `left:${n1[0] + 15 + 8}px;top:${n1[1] - 16}px`) +
    lab(2, "Test", `left:${n2[0]}px;top:${n2[1] + 15 + 8}px;transform:translateX(-50%)`) +
    lab(3, "Data<br>answers", `right:${f3(W - 12 - (n3[0] + 8))}px;top:${f3(DLT)}px`);
  // tick and cross directly beside the DATA ANSWERS node (inside the ring, right of the node)
  const marks = `<svg id="${ID}-mk" style="position:absolute;left:${f3(n3[0] + 24)}px;top:${f3(n3[1] - 17)}px;overflow:visible" width="80" height="34" viewBox="0 0 100 36">
    <path id="${ID}-tick" class="dr" pathLength="1" d="M4,18 L15,30 L36,4" fill="none" stroke="${F}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <path id="${ID}-x1" class="dr" pathLength="1" d="M56,6 L80,30" fill="none" stroke="${M}" stroke-width="5" stroke-linecap="round"/>
    <path id="${ID}-x2" class="dr" pathLength="1" d="M80,6 L56,30" fill="none" stroke="${M}" stroke-width="5" stroke-linecap="round"/></svg>`;

  const body = `
<div id="${ID}-card" class="${panelClass(ID)}" style="position:absolute;left:${X}px;top:${Y}px;width:${W}px;height:${H}px">
  <div id="${ID}-ct" style="position:absolute;left:0;top:0;width:${W - 12}px;height:${H - 12}px">
    ${ringSVG(ID, g, ID)}
    ${labels}
    ${marks}
  </div>
  <div style="position:absolute;left:0;top:0;width:${W - 12}px;height:${H - 12}px;overflow:hidden">
    <div style="position:absolute;left:0;top:${HT}px">${hum}</div>
  </div>
</div>`;

  let js = "";
  // frame 0 = g06's last frame: the card shell is simply there (no wipe), the robot where g06 left it
  js += `tl.fromTo("#${ID}-card",{opacity:1},{opacity:1,duration:0.2,immediateRender:true},0);\n`;
  js += `tl.fromTo("#${HID}",{x:${f3(XS)},y:0},{x:${f3(XS)},y:0,duration:0.1,immediateRender:true},0);\n`;
  js += `tl.fromTo("#${HID}-foreL",{rotation:${BEND},svgOrigin:"${HUM.elbow.L.join(" ")}"},{rotation:${BEND},svgOrigin:"${HUM.elbow.L.join(" ")}",duration:0.1,immediateRender:true},0);\n`;
  // the sheet gives up the accent at once (one accent: the ring's nodes take it)
  js += `tl.fromTo("#${ID}-sheet",{fill:"${C.accent}"},{fill:"${C.bg}",duration:0.3,ease:"power1.out",immediateRender:true},0);\n`;
  js += `tl.fromTo("#${HID}-head",{rotation:${ROBOT_POSE.head},svgOrigin:"120 104"},{rotation:${ROBOT_POSE.head},svgOrigin:"120 104",duration:0.1,immediateRender:true},0);\n`;
  // g07's content clip-masks in from the left, under the robot
  js += `tl.fromTo("#${ID}-ct",{clipPath:"inset(-20px 100% -20px -20px)"},{clipPath:"inset(-20px -20px -20px -20px)",duration:0.5,ease:"power2.out",immediateRender:true},0.05);\n`;
  js += show(`#${ID}-ghost`, 0.05, 0.3);
  // TEST waits until the robot has walked past it (round 2 review: the robot crossed the label mid-walk)
  js += [0, 1, 2, 3].map(i => show(`#${ID}-l${i}`, i === 2 ? tWalk + dWalk + 0.05 : 0.15 + i * 0.08, 0.35, "y:10", "y:0")).join("");
  // the robot side-steps to the left edge, head straightening; the ring draws on "profiling"
  js += humWalk(HID, XS, XT, tWalk, dWalk, HS);
  js += `tl.fromTo("#${HID}",{scale:1,transformOrigin:"${f3(U.cx * HS)}px ${f3(U.feet * HS)}px"},{scale:${f3(K)},transformOrigin:"${f3(U.cx * HS)}px ${f3(U.feet * HS)}px",duration:${f3(dWalk)},ease:"power1.inOut",immediateRender:false},${f3(tWalk)});\n`;
  js += `tl.fromTo("#${HID}-head",{rotation:${ROBOT_POSE.head},svgOrigin:"120 104"},{rotation:0,svgOrigin:"120 104",duration:0.5,ease:"power2.inOut",immediateRender:false},${f3(tWalk)});\n`;
  js += drawAll(`#${ID}-ring`, tPro, 1.2);
  js += hide(`#${ID}-ghost`, tPro + 0.9, 0.35);
  js += [0, 1, 2, 3].map(i => nodeIn(ID, g, i, tPro + i * 0.3)).join("");
  // accent hops in speech order; the node left behind returns to a muted ring, its label to muted
  const lab_ = (i, a, b, t) => `tl.fromTo("#${ID}-l${i}",{color:"${a}"},{color:"${b}",duration:0.3,immediateRender:false},${f3(t)});\n`;
  // the dot travels only on the cues: OBSERVE -> HUNCH, back to OBSERVE, on to TEST, into DATA ANSWERS
  js += dotMove(ID, g, 0, 1, tForm - 0.3) + dotMove(ID, g, 1, 0, tObs - 0.3, true) + dotMove(ID, g, 0, 2, tProve - 0.5) + dotMove(ID, g, 2, 3, tDis - 0.3);
  js += accentOn(ID, 1, tForm) + lab_(1, M, F, tForm);
  js += accentOff(ID, 1, tObs) + lab_(1, F, M, tObs) + accentOn(ID, 0, tObs) + lab_(0, M, F, tObs);
  js += accentOff(ID, 0, tProve) + lab_(0, F, M, tProve) + accentOn(ID, 2, tProve) + lab_(2, M, F, tProve);
  js += accentOff(ID, 2, tDis) + lab_(2, F, M, tDis) + accentOn(ID, 3, tDis) + lab_(3, M, F, tDis);
  // "prove or disprove": the data's two answers, beside the DATA ANSWERS node
  js += drawAll(`#${ID}-tick`, tDis + 0.05, 0.35);
  js += drawAll(`#${ID}-x1`, tDis + 0.4, 0.2) + drawAll(`#${ID}-x2`, tDis + 0.55, 0.2);
  js += exitIfFree(ID, D, [`#${ID}-card`]);
  // geometry guards (graphics skill habit 2): 40px between robot and ring, label off the helmet
  const nodeL = n3[0] - 15;
  if (nodeL - ROB.right < 40) throw new Error(`${ID}: ring ${f3(nodeL)} only ${f3(nodeL - ROB.right)}px from the robot (${f3(ROB.right)})`);
  if (ROB.headT - DLB < 40 || DLT < 2) throw new Error(`${ID}: DATA ANSWERS label (${f3(DLT)}-${f3(DLB)}) vs head top ${f3(ROB.headT)}`);
  if (ROB.sheetL < 0) throw new Error(`${ID}: sheet leaves the card (${f3(ROB.sheetL)})`);
  if (n1[0] + 15 + 8 + 114 > W - 12 - 8) throw new Error(`${ID}: HUNCH label leaves the card`);
  console.log(`  ${ID}: robot ${nSteps} steps to ${f3(XL)}, scale x${f3(K)}, right ${f3(ROB.right)}, head top ${f3(ROB.headT)}; ring cx ${RCX}, gap ${f3(nodeL - ROB.right)}`);
  emit(ID, D, body, js);
}
