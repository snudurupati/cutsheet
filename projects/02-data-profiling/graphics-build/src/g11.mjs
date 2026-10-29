// g11: THE NINE CHECKS (script, section 6: "Show the table on screen"). strike-list in the COLUMN zone.
//
// ROW GEOMETRY (reused by g16 at 60% scale; all numbers are CARD-LOCAL px inside the 6px border,
// card = COLUMN x48 y48 w432 h812, so inner box 420 x 800):
//   row k (A=0 .. I=8): top = ROW0 + k * PITCH = 140 + k * 54   (rows 36px tall, last row ends 608)
//   letter disc:  centre (DISC_X, top + 18) = (46, top + 18), radius 18, letter 20px 900
//   check name:   left NAME_X = 80, top = top + 1, 30px 700, one line (widest "Episode lengths" 221px)
//   free column for a g16 tick: x 330..392 (right of the widest name, inside the card)
//   question panel: 2px rule at y 646, question text from y 662, 28px 500, width 364, up to 3 lines (ends by y 765)
// Timeline: card at 0, title on "checking", letters pop on "letters A through I", then each row
// lands ON its spoken letter, its disc is the one $accent and earlier discs settle to $ink; the
// spoken row's question shows in the panel. Continuous motion: a soft paper light band sweeps down
// the rows every 3s from 1s to the end (the card runs 116s).
import { C, emit, frames, panelClass, fg, dim, wipeUp, cueIn } from "../lib.mjs";
import { T, EYEBROW, rowUp, show, cueRel, exitIfFree, COLUMN, f3 } from "../common.mjs";
import { fade } from "./_part2.mjs";

const ID = "g11";
export const G11 = { ROW0: 140, PITCH: 54, DISC_X: 46, DISC_R: 18, NAME_X: 80, PANEL_Y: 646 };
export const CHECKS = [
  ["A", "Overview", "What does the dataset say about itself: fps, episodes, frames, joints?"],
  ["B", "Episode lengths", "Do the three sources agree, and are any episodes unusually short or long?"],
  ["C", "Frame timing", "Do the timestamps match the declared frame rate?"],
  ["D", "Video windows", "Is each episode's video clip as long as its data?"],
  ["E", "Action", "Right size, sane ranges, no nulls or NaNs?"],
  ["F", "Idle and dead", "Did anything actually move?"],
  ["G", "State", "Same questions as E, for the robot's own readings"],
  ["H", "Cameras", "How many, how big, how fast, and do all sources agree?"],
  ["I", "Outcomes", "Does the dataset carry its own quality signal?"],
];

// g11's LAST FRAME as static markup (card-inner coordinates, 420 x 800), for g12's hand-off: g12's
// frame 0 shows it inside the shell and fades it out while the shell reshapes.
export const g11Final = (F, M) => {
  const { ROW0, PITCH, DISC_X, DISC_R, NAME_X, PANEL_Y } = G11;
  const txt = (t, x, y, size, wght, color, extra = "") => `<div style="position:absolute;left:${x}px;top:${y}px;font-family:Satoshi,sans-serif;font-variation-settings:'wght' ${wght};font-size:${size}px;line-height:1.12;color:${color};white-space:nowrap;${extra}">${t}</div>`;
  const rows = CHECKS.map(([L, name], k) => { const top = ROW0 + k * PITCH, last = k === 8;
    return `<svg style="position:absolute;left:${DISC_X - DISC_R}px;top:${top}px" width="${2 * DISC_R}" height="36"><circle cx="${DISC_R}" cy="18" r="${DISC_R}" fill="${last ? C.accent : F}"/></svg>
      <div style="position:absolute;left:${DISC_X - DISC_R}px;top:${top}px;width:${2 * DISC_R}px;line-height:36px;text-align:center;font-family:Satoshi,sans-serif;font-variation-settings:'wght' 900;font-size:20px;color:${last ? C.ink : C.bg}">${L}</div>
      ${txt(name, NAME_X, top + 1, 30, 700, F)}`; }).join("");
  return txt("The profiler", 28, 26, 28, 700, M, "letter-spacing:0.18em;text-transform:uppercase;")
    + txt("Nine checks", 28, 62, 44, 900, F) + rows
    + `<div style="position:absolute;left:28px;top:${PANEL_Y}px;width:364px;height:2px;background:${C.rule}"></div>`
    + `<div style="position:absolute;left:28px;top:${PANEL_Y + 16}px;width:364px;font-family:Satoshi,sans-serif;font-variation-settings:'wght' 500;font-size:28px;line-height:1.22;color:${M}">${CHECKS[8][2]}</div>`;
};

export default function build() {
  const D = frames(ID) / 30;
  const F = fg(ID), M = dim(ID);
  const { ROW0, PITCH, DISC_X, DISC_R, NAME_X, PANEL_Y } = G11;
  const W = COLUMN.w, H = COLUMN.h, IW = W - 12;
  const tCheck = cueRel(ID, "checking"), tLetters = cueRel(ID, "letters"), tAI = cueRel(ID, "AI");   // from the plan (re-cut safe)
  const tk = CHECKS.map(([L]) => cueRel(ID, L));
  // guard: the plan's cues are in order and inside the part
  tk.forEach((t, k) => { if (t <= 0 || t >= D || (k && t <= tk[k - 1])) throw new Error(`${ID}: cue ${CHECKS[k][0]} out of order (${t})`); });

  const rows = CHECKS.map(([L, name], k) => {
    const top = 12 + k * PITCH, cy = 18;     // inside the rows box, which starts at ROW0 - 12
    return `<div id="${ID}-r${k}" style="position:absolute;left:0;top:${top}px;width:${IW}px;height:36px">
      <svg style="position:absolute;left:${DISC_X - DISC_R - 2}px;top:0;overflow:visible" width="${2 * DISC_R + 4}" height="36" viewBox="${DISC_X - DISC_R - 2} 0 ${2 * DISC_R + 4} 36">
        <circle id="${ID}-ph${k}" cx="${DISC_X}" cy="${cy}" r="${DISC_R - 1.5}" fill="none" stroke="${C.rule}" stroke-width="3" stroke-dasharray="5 5"/>
        <circle id="${ID}-dk${k}" cx="${DISC_X}" cy="${cy}" r="${DISC_R}" fill="${F}" opacity="0"/>
        <circle id="${ID}-da${k}" cx="${DISC_X}" cy="${cy}" r="${DISC_R}" fill="${C.accent}" opacity="0"/>
      </svg>
      <div id="${ID}-lm${k}" style="position:absolute;left:${DISC_X - DISC_R}px;top:0;width:${2 * DISC_R}px;height:36px;line-height:36px;text-align:center;font-family:Satoshi,sans-serif;font-variation-settings:'wght' 900;font-size:20px;color:${M}">${L}</div>
      <div id="${ID}-li${k}" style="position:absolute;left:${DISC_X - DISC_R}px;top:0;width:${2 * DISC_R}px;height:36px;line-height:36px;text-align:center;font-family:Satoshi,sans-serif;font-variation-settings:'wght' 900;font-size:20px;color:${C.ink};opacity:0">${L}</div>
      <div id="${ID}-lw${k}" style="position:absolute;left:${DISC_X - DISC_R}px;top:0;width:${2 * DISC_R}px;height:36px;line-height:36px;text-align:center;font-family:Satoshi,sans-serif;font-variation-settings:'wght' 900;font-size:20px;color:${C.bg};opacity:0">${L}</div>
      ${T(name, NAME_X, 1, 30, { weight: 700, color: F, id: `${ID}-n${k}` })}
    </div>`;
  }).join("");
  const questions = CHECKS.map(([, , q], k) =>
    T(q, 28, PANEL_Y + 16, 28, { w: IW - 56, weight: 500, color: M, lh: 1.22, id: `${ID}-q${k}` })).join("");

  const body = `
<div id="${ID}-card" class="${panelClass(ID)}" style="position:absolute;left:${COLUMN.x}px;top:${COLUMN.y}px;width:${W}px;height:${H}px">
  ${EYEBROW("The profiler", 28, 26, M, `${ID}-eb`)}
  ${T("Nine checks", 28, 62, 44, { weight: 900, color: F, id: `${ID}-ti` })}
  <div id="${ID}-rows" style="position:absolute;left:0;top:${ROW0 - 12}px;width:${IW}px;height:${9 * PITCH + 12}px;overflow:hidden">
    ${rows}
    <div id="${ID}-band" style="position:absolute;left:0;top:0;width:${IW}px;height:90px;background:linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.30) 50%, rgba(255,255,255,0) 100%)"></div>
  </div>
  <div id="${ID}-prule" style="position:absolute;left:28px;top:${PANEL_Y}px;width:${IW - 56}px;height:2px;background:${C.rule}"></div>
  ${T("Is it good enough to train on?", 28, PANEL_Y + 16, 28, { w: IW - 56, weight: 500, color: M, lh: 1.22, id: `${ID}-q0x` })}
  ${questions}
</div>`;

  let js = wipeUp(`#${ID}-card`, 0, 0.35) + "\n";
  // first content arrives with the card (review round 2: no blank tall card before "checking")
  js += rowUp(`#${ID}-eb`, 0.05) + rowUp(`#${ID}-ti`, 0.25);   // ("checking" at ${tCheck}s no longer gates the title)
  // the nine placeholders are there from frame 1 (the card reads as a list waiting to fill); the
  // letters arrive in a sweep across "letters A through I"
  CHECKS.forEach((_, k) => { js += show(`#${ID}-lm${k}`, tLetters + k * (tAI - tLetters) / 8, 0.25, "y:8", "y:0"); });
  // the question slot is not empty before A: the profiler's overall question, from "verify" until A
  const tVer = cueIn(ID, "verify");
  js += show(`#${ID}-prule`, tVer - 0.2, 0.3);
  js += `tl.fromTo("#${ID}-q0x",{opacity:0,y:12},{opacity:1,y:0,duration:0.35,ease:"power3.out"},${f3(tVer)});\n` + fade(`#${ID}-q0x`, 1, 0, tk[0] - 0.05, 0.2);
  CHECKS.forEach((_, k) => {
    const t = tk[k], tn = k < 8 ? tk[k + 1] : null;
    // land: the dashed placeholder goes, the disc fills accent, the letter turns paper, the name rises
    js += fade(`#${ID}-ph${k}`, 1, 0, t, 0.25);
    js += `tl.fromTo("#${ID}-da${k}",{opacity:0,scale:0.5,svgOrigin:"${DISC_X} 18"},{opacity:1,scale:1,svgOrigin:"${DISC_X} 18",duration:0.35,ease:"back.out(2)",immediateRender:false},${f3(t)});\n`;
    js += `tl.fromTo("#${ID}-dk${k}",{opacity:0},{opacity:1,duration:0.2,immediateRender:false},${f3(t + 0.35)});\n`;   // ink under the accent
    // ink letter on the accent disc (paper on $accent reads 3.4:1), paper letter once it settles to ink
    js += fade(`#${ID}-lm${k}`, 1, 0, t, 0.2) + fade(`#${ID}-li${k}`, 0, 1, t, 0.2);
    js += `tl.fromTo("#${ID}-n${k}",{opacity:0,x:-16},{opacity:1,x:0,duration:0.35,ease:"power3.out"},${f3(t)});\n`;
    // question in the panel, from its letter to the next letter
    js += `tl.fromTo("#${ID}-q${k}",{opacity:0,y:12},{opacity:1,y:0,duration:0.35,ease:"power3.out"},${f3(t + 0.1)});\n`;
    if (tn !== null) {
      js += fade(`#${ID}-da${k}`, 1, 0, tn, 0.25);          // settles to ink as the next letter lands
      js += fade(`#${ID}-li${k}`, 1, 0, tn, 0.2) + fade(`#${ID}-lw${k}`, 0, 1, tn, 0.2);
      js += fade(`#${ID}-q${k}`, 1, 0, tn - 0.05, 0.2);
    }
  });
  // continuous motion: the light band sweeps the rows every 3s, from 1s to the end
  const P = 3, t0 = 1.0, n = Math.max(1, Math.floor((D - t0) / P));
  js += `tl.fromTo("#${ID}-band",{y:-90},{y:${9 * PITCH + 12},duration:${P},ease:"power1.inOut",repeat:${n - 1},immediateRender:true},${f3(t0)});\n`;
  js += exitIfFree(ID, D, [`#${ID}-card`]);
  emit(ID, D, body, js);
}
