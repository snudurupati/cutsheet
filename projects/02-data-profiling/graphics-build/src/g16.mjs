// g16: the nine checks return (g11's card, opaque, in the right strip over the notebook). Rows A, B
// and C already carry ticks. Each result lands its tick ON its cue: D "empty", E "null", F "idle",
// H "AV1", I "this"; G (state) lands on "consistent". The card slides out between results so it is
// on screen only around each one. G is landed where state is covered ("consistent", ~31s).
// Scale: g11's anatomy at ~60% would put the names at 18px and the questions at 13px, under the
// 20px floor, so the rows keep the anatomy (disc, name, then the RESULT where g11 had the question)
// at 24px / 22px in a 540 x 410 card. Ticks are paper (the card's ink colour inverted), 5px, as
// strong as any strike in the video; the current row's disc is the one accent.
import { C, emit, frames, panelClass, fg, dim } from "../lib.mjs";
import { T, EYEBROW, rowUp, drawAll, cueRel, f3 } from "../common.mjs";
import { slides, stateTracker, tickSVG, drawIn } from "./_demo1.mjs";

const ID = "g16";
const POS = { x: 1340, y: 56 };
const ROWS = [
  ["A", "Overview", null], ["B", "Episode lengths", null], ["C", "Frame timing", null],
  ["D", "Video windows", "no mismatches"], ["E", "Action", `<span id="${ID}-resE1">no nulls</span><span id="${ID}-resE2" style="opacity:0">, two dims</span>`], ["F", "Idle and dead", "zero idle, zero dead"],
  ["G", "State", "same as E"], ["H", "Cameras", "1 cam, 96\u00d796, AV1"], ["I", "Outcomes", "reward present"],
];
export default function build() {
  const D = frames(ID) / 30;
  const c = k => cueRel(ID, k);
  const F = fg(ID), M = dim(ID);
  // H 410 (bottom y 466): at 103-112s the card cleared the "next.reward: values" line he reads at y ~470
  const W = 540, H = 410, Y0 = 64, P = 37;

  const rows = ROWS.map(([L, name, res], i) => {
    const y = Y0 + i * P, done = i < 3;
    return `<div id="${ID}-r${L}" style="position:absolute;left:0;top:${y}px;width:${W}px;height:32px">
      <svg style="position:absolute;left:22px;top:1px;overflow:visible" width="30" height="30" viewBox="0 0 30 30">
        <circle id="${ID}-d${L}" cx="15" cy="15" r="13.5" fill="${done ? F : C.ink}" stroke="${done ? F : M}" stroke-width="2.5"/></svg>
      <div id="${ID}-dl${L}" style="position:absolute;left:22px;top:1px;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-family:Satoshi,sans-serif;font-variation-settings:'wght' 900;font-size:20px;color:${done ? C.ink : M}">${L}</div>
      ${T(name, 64, 1, 24, { weight: 700, color: F })}
      ${res ? T(res, 262, 3, 22, { weight: 500, color: M, id: `${ID}-res${L}` }) : ""}
      ${tickSVG(`${ID}-t${L}`, 484, 0, L === "G" ? M : F, 0.85)}
    </div>`;
  }).join("");
  const body = `
<div id="${ID}-w" style="position:absolute;left:0;top:0;width:1920px;height:1080px">
<div id="${ID}-card" class="${panelClass(ID)}" style="position:absolute;left:${POS.x}px;top:${POS.y}px;width:${W}px;height:${H}px">
  ${EYEBROW("The nine checks", 24, 18, M)}
  ${rows}
</div></div>`;

  // appearances: in ~1.7s before each result, out ~6-8s after it
  // Review rounds 2026-10-28: "two dimension ... data is consistent there" (27-33s) is about ACTION
  // (the screen shows "E action: ok (declared length 2)"), so E gets "no nulls" on "null" and ", two
  // dims" with its tick on "consistent". G gets a muted "same as E" tick right after F's, so the ticks
  // land in alphabetical order. Cameras come in on "cameras", the tick lands on "AV1" (the plan's H
  // cue, "camera", was 4s early), and the card leaves before 1059.3, when his output line
  // "'video.fps': 10.0" scrolls up to y ~122 under the card. Times from transcript-cut.json.
  const tD = c("D"), tE = c("E"), tF = c("F"), tI = c("I");
  const tCons = 1004.0 - 972.7333, tCam = 1046.0 - 972.7333, tH = 1054.7 - 972.7333, tG = tF + 0.7;
  // F's window runs straight into cameras (they are 1s apart), so it is one appearance
  const spans = [[0, tD + 7.2], [tE - 1.7, tCons + 2.5], [tF - 1.7, tH + 4.2], [tI - 1.7, D - 0.6 > tI + 7 ? tI + 7 : null]];
  let js = slides(`#${ID}-w`, spans);

  // A-C ticks are already there (drawn at frame 0 by an instant fromTo, so the .dr CSS cannot hide them)
  ["A", "B", "C"].forEach(L => { js += `tl.fromTo("#${ID}-t${L} path",{strokeDashoffset:0,opacity:1},{strokeDashoffset:0,opacity:1,duration:0.2,immediateRender:true},0);\n`; });

  const disc = stateTracker(Object.fromEntries(ROWS.map(([L], i) => [`#${ID}-d${L}`, i < 3 ? { fill: F, stroke: F } : { fill: C.ink, stroke: M }])));
  const lab = stateTracker(Object.fromEntries(ROWS.map(([L], i) => [`#${ID}-dl${L}`, { color: i < 3 ? C.ink : M }])));
  const cur = (L, t) => disc(`#${ID}-d${L}`, { fill: C.accent, stroke: C.accent }, t) + lab(`#${ID}-dl${L}`, { color: C.ink }, t);
  const done = (L, t) => disc(`#${ID}-d${L}`, { fill: F, stroke: F }, t) + lab(`#${ID}-dl${L}`, { color: C.ink }, t);
  // the row being spoken is the one accent; it settles to paper when the next result comes up
  // (state changes happen while the card is off screen, just before it slides back)
  js += `tl.fromTo("#${ID}-dD",{fill:"${C.accent}",stroke:"${C.accent}"},{fill:"${C.accent}",stroke:"${C.accent}",duration:0.2,immediateRender:true},0);\n`;
  js += `tl.fromTo("#${ID}-dlD",{color:"${C.ink}"},{color:"${C.ink}",duration:0.2,immediateRender:true},0);\n`;
  const land = (L, t) => drawIn(`#${ID}-t${L} path`, t, 0.35) + rowUp(`#${ID}-res${L}`, t + 0.1);
  // D lands at its cue (1.3s in, after the 0.35s entrance)
  disc(`#${ID}-dD`, { fill: C.accent, stroke: C.accent }, 0); lab(`#${ID}-dlD`, { color: C.ink }, 0);
  js += land("D", tD);
  js += done("D", tE - 2.2) + cur("E", tE - 2.2) + rowUp(`#${ID}-resE`, tE + 0.1);
  js += `tl.fromTo("#${ID}-resE2",{opacity:0},{opacity:1,duration:0.3,ease:"power2.out"},${f3(tCons)});\n` + drawIn(`#${ID}-tE path`, tCons, 0.35);
  js += done("E", tF - 2.2) + cur("F", tF - 2.2) + land("F", tF);
  js += done("G", tG) + land("G", tG);            // muted: G is covered by E, not spoken; F keeps the accent
  js += done("F", tCam) + cur("H", tCam) + land("H", tH);
  js += done("H", tI - 2.2) + cur("I", tI - 2.2) + land("I", tI);
  emit(ID, D, body, js);
}
