// g06: two years of LLM chores, a strike-list, then the robot (HERO light card).
// g05 ends on this part's first frame in the same rect, so the card is simply there on frame 0 and
// only its contents change (panel -> panel swap, no second wipe).
//   0.2        eyebrow TWO YEARS OF, accent header rule (the one accent while the list runs)
//   mcps ... context  each row rises on its cue; a 2px $muted strike draws across it 0.3s later
//   joy        the struck stack slides down, shrinks into the lower left and dims; the header rule
//              gives up the accent
//   robotics   the series humanoid has side-stepped in from the right into the freed space holding a
//              data sheet; the sheet turns $accent on "robotics" (the one accent) and the head
//              tilts toward it. What it holds, it holds: the sheet rides in the forearm group.
import { C, emit, frames, panelClass, fg, dim, struck, strikeIn } from "../lib.mjs";
import { T, EYEBROW, rowUp, cueRel, exitIfFree, HERO, f3 } from "../common.mjs";
import { humanoid, humWalk, humWalkEnd, HUM } from "../hum.mjs";

const ID = "g06";
// The robot's FINAL state on this part's last frame, for the builder who carries it into g07.
// Stage (1920x1080) position of the humanoid's top-left = card origin + 6px border + card-local.
export const ROBOT_SCALE = 0.72;                                 // humanoid(id, 0, 0, 0.72): 173 x 374 px
export const ROBOT_CARD_LOCAL = { x: 338, y: 84 };               // inside the HERO card's padding box
export const ROBOT_STAGE = { x: 48 + 6 + 338, y: 48 + 6 + 84 };  // = { x: 392, y: 138 }; feet on y ~501 (15px above the card's lower edge zone)
export const ROBOT_POSE = { foreL: 75, armL: 0, armR: 0, foreR: 0, legs: 0, head: -9 };   // degrees (humArm b / a, head svgOrigin "120 104")
export const ROBOT_SHEET = "sheet held in the LEFT gripper (inside the foreL group at wrist + 24px, counter-rotated -75), filled $accent";
export default function build() {
  const D = frames(ID) / 30;
  const c = k => cueRel(ID, k);
  const tRows = [c("mcps"), c("rags"), c("vector"), c("ai"), c("context")], tJoy = c("joy"), tRob = c("robotics");
  const F = fg(ID), M = dim(ID);
  const { x: X, y: Y, w: W, h: H } = HERO;
  const ROWS = ["MCP servers", "RAG", "Vector databases", "AI-assisted data engineering", "Context engineering"];
  const RY = 88, RP = 58;

  // ---- the humanoid, holding a sheet in its left gripper (forearm bent outward, sheet upright)
  const HS = ROBOT_SCALE, HID = `${ID}-h`, BEND = 75;
  const [wx, wy] = HUM.wrist.L;
  const sheet = `<g transform="translate(${wx},${wy + 24}) rotate(${-BEND})">
      <rect id="${ID}-sheet" x="-42" y="0" width="84" height="104" rx="5" fill="${C.bg}" stroke="${F}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M-28,24 H28 M-28,44 H28 M-28,64 H14 M-28,84 H22" fill="none" stroke="${F}" stroke-width="4" stroke-linecap="round"/></g>`;
  const hum = humanoid(HID, 0, 0, HS, { stroke: F, visor: C.ink }).replace(`<g id="${HID}-gripL">`, `${sheet}<g id="${HID}-gripL">`);
  const X0 = 716, XE = humWalkEnd(X0, 338, HS), HT = Math.round(447 - 504 * HS);   // feet on y 447 (lifted 15px)
  const tWalk = +(tRob - 2.14).toFixed(1);                     // 7 steps of 0.26s + the 0.32s settle (clean step times)

  // strikes at mid-cap height, 3px (measured: Satoshi at 34px on a 44px line puts the baseline at
  // 35px and the cap top at 11px, so cap middle = 23). Still a child of the word's own box at its
  // full width (style.md 2026-09-30); animated with strikeIn.
  const strike = (id, text) => `<span style="position:relative;display:inline-block;white-space:nowrap">${text}<span id="${id}" style="position:absolute;left:2px;right:1px;top:21.5px;height:3px;border-radius:3px;background:${M};transform:scaleX(0);transform-origin:left center"></span></span>`;
  const rows = ROWS.map((t, i) => `<div id="${ID}-row${i}" style="position:absolute;left:0;top:${i * RP}px;font-family:Satoshi;font-variation-settings:'wght' 700;font-size:34px;line-height:44px;color:${F};white-space:nowrap;opacity:0">${strike(`${ID}-s${i}`, t)}</div>`).join("");

  const body = `
<div id="${ID}-card" class="${panelClass(ID)}" style="position:absolute;left:${X}px;top:${Y}px;width:${W}px;height:${H}px">
  ${EYEBROW("Two years of", 32, 24, M, `${ID}-eb`)}
  <div id="${ID}-rule" style="position:absolute;left:32px;top:66px;width:180px;height:4px;border-radius:2px;background:${C.accent}"></div>
  <div id="${ID}-stack" style="position:absolute;left:32px;top:${RY}px;width:520px;height:${ROWS.length * RP}px">${rows}</div>
  <div style="position:absolute;left:0;top:0;width:${W - 12}px;height:${H - 12}px;overflow:hidden">
    <div style="position:absolute;left:0;top:${HT}px">${hum}</div>
  </div>
</div>`;

  let js = "";
  js += rowUp(`#${ID}-eb`, 0.2);
  js += `tl.fromTo("#${ID}-rule",{scaleX:0,transformOrigin:"left center"},{scaleX:1,transformOrigin:"left center",duration:0.45,ease:"power2.out"},0.45);\n`;
  tRows.forEach((t, i) => { js += rowUp(`#${ID}-row${i}`, t) + strikeIn(`${ID}-s${i}`, t + 0.3, 0.3); });
  // joy: the struck stack slides down into the lower left and dims (0.72: rows stay 24px, never smaller); the rule lets go of the accent
  js += `tl.fromTo("#${ID}-stack",{y:0,scale:1,opacity:1,transformOrigin:"0 0"},{y:179,scale:0.72,opacity:0.5,transformOrigin:"0 0",duration:0.7,ease:"power2.inOut",immediateRender:false},${f3(tJoy)});\n`;
  js += `tl.fromTo("#${ID}-eb",{opacity:1},{opacity:0.45,duration:0.5,immediateRender:false},${f3(tJoy)});\n`;
  js += `tl.fromTo("#${ID}-rule",{opacity:1},{opacity:0,duration:0.4,immediateRender:false},${f3(tJoy)});\n`;
  // the robot: off the card's right edge with the sheet raised, side-steps in, stops on "robotics"
  js += `tl.fromTo("#${HID}",{x:${X0},y:0},{x:${X0},y:0,duration:0.1,immediateRender:true},0);\n`;
  js += `tl.fromTo("#${HID}-foreL",{rotation:${BEND},svgOrigin:"${HUM.elbow.L.join(" ")}"},{rotation:${BEND},svgOrigin:"${HUM.elbow.L.join(" ")}",duration:0.1,immediateRender:true},0);\n`;
  js += humWalk(HID, X0, 338, tWalk, 2.14, HS);   // arrives within ~40ms of "robotics"
  js += `tl.fromTo("#${ID}-sheet",{fill:"${C.bg}"},{fill:"${C.accent}",duration:0.3,ease:"power1.out",immediateRender:false},${f3(tRob)});\n`;
  js += `tl.fromTo("#${HID}-head",{rotation:0,svgOrigin:"120 104"},{rotation:-9,svgOrigin:"120 104",duration:0.5,ease:"power2.inOut",immediateRender:false},${f3(tRob + 0.2)});\n`;
  js += exitIfFree(ID, D, [`#${ID}-card`]);
  if (XE !== ROBOT_CARD_LOCAL.x || HT !== ROBOT_CARD_LOCAL.y || XE < 330 || XE + 240 * HS > W - 12) throw new Error(`${ID}: robot stops at ${XE}, outside the freed space`);
  emit(ID, D, body, js);
}
