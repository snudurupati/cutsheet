// Shared art for g21 and g22 (the 500-frame bar stack and the small hypothesis loop), so g22's first
// frame is exactly g21's geometry returning. Card-local coordinates inside a 540 x 440 demo card
// (content box 528 x 428, inside the 6px border). Not a part (leading underscore).
import { C } from "../lib.mjs";
import { f3 } from "../common.mjs";

// demo card position, measured from the screen OCR (coordinator 2026-10-28): x 1340-1880, y 56-496
// is clear in both the notebook and the Rerun viewer. Max card 540 x 440.
export const POS = { x: 1340, y: 56 };
export const CW = 540, CH = 440;

// ------------------------------------------------------------ the bar stack
// Eight episodes, every one exactly 500 frames. 420px = 500 frames; the TAIL is the last 100.
// (No per-bar robot icons: composition review 2026-10-28 found them unreadable at ~30px; a failed
// episode is shown on its bar instead, by g21.)
export const BX0 = 24, BX1 = 444, BY0 = 70, PITCH = 27, BH = 18, NB = 8;
export const fx = fr => BX0 + (BX1 - BX0) * fr / 500;
export const TX = fx(400);
export const barY = i => BY0 + i * PITCH;

// tails are shown by opacity; `op` is each bar's starting opacity (lit bars 1, others `dimOp`)
export const stackSVG = (id, F, M, { lit = null, tails = false, dimOp = 0.35 } = {}) => {
  let s = "";
  for (let i = 0; i < NB; i++) {
    const y = barY(i), op = lit && !lit.includes(i) ? dimOp : 1;
    s += `<g id="${id}-bar${i}" opacity="${op}">
      <rect id="${id}-b${i}" x="${BX0}" y="${y}" width="${BX1 - BX0}" height="${BH}" rx="4" fill="${F}"/>
      <rect id="${id}-t${i}" x="${f3(TX)}" y="${y}" width="${f3(BX1 - TX)}" height="${BH}" rx="4" fill="${M}" opacity="${tails ? 1 : 0}"/></g>`;
  }
  return `<svg id="${id}-stack" style="position:absolute;left:0;top:0;overflow:visible" width="528" height="428" viewBox="0 0 528 428">${s}</svg>`;
};

// -------------------------------------------------------- the small loop
// The hypothesis loop's geometry (OBSERVE top, HUNCH right, TEST bottom, DATA ANSWERS left) at
// ~55-60% scale in the card's lower-left corner. At this size the node labels would fall below the
// 20px floor, so the loop carries no per-node pills: the lit node's name is the eyebrow of the text
// column beside it (HUNCH / DATA ANSWERS), 20px tracked caps.
export const LCX = 88, LCY = 346, LR = 66, NR = 10;
export const NODES = [["observe", 0, -1], ["hunch", 1, 0], ["test", 0, 1], ["answers", -1, 0]];
export const TXC = 186;                       // text column x
export const loopSVG = (id, F, M) => {
  const nodes = NODES.map(([k, dx, dy]) =>
    `<circle id="${id}-n-${k}" cx="${LCX + dx * LR}" cy="${LCY + dy * LR}" r="${NR}" fill="${C.ink}" stroke="${M}" stroke-width="3"/>`).join("");
  return `<svg id="${id}-loop" style="position:absolute;left:0;top:0;overflow:visible" width="528" height="428" viewBox="0 0 528 428">
    <circle id="${id}-ring" class="dr" pathLength="1" cx="${LCX}" cy="${LCY}" r="${LR}" fill="none" stroke="${M}" stroke-width="3" transform="rotate(-90 ${LCX} ${LCY})"/>
    <g id="${id}-orb"><circle cx="${LCX}" cy="${LCY - LR}" r="5" fill="${F}"/></g>
    ${nodes}</svg>`;
};
// the dot travels the ring, one lap per 4s, from t0 to t1 (seek-safe: one repeating tween)
export const orbJS = (id, t0, t1) => {
  const n = Math.max(1, Math.floor((t1 - t0) / 4));
  return `tl.fromTo("#${id}-orb",{opacity:0},{opacity:1,duration:0.3,immediateRender:true},${f3(t0)});\n`
    + `tl.fromTo("#${id}-orb",{rotation:0,svgOrigin:"${LCX} ${LCY}"},{rotation:360,svgOrigin:"${LCX} ${LCY}",duration:4,ease:"none",repeat:${n - 1},immediateRender:true},${f3(t0)});\n`;
};
// a state change after the first: never stamps its from-state at creation
export const chg = (sel, from, to, t, d = 0.3) =>
  `tl.fromTo(${JSON.stringify(sel)},${from},{...${to},duration:${d},ease:"power2.out",immediateRender:false},${f3(t)});\n`;

// the win mark: a drawn tick, 4px, at least as strong as a strike
export const tickSVG = (id, x, y, F, size = 28) =>
  `<svg id="${id}" style="position:absolute;left:${x}px;top:${y}px;overflow:visible" width="${size}" height="${size}" viewBox="0 0 28 28">
    <path class="dr" pathLength="1" d="M3,15 L11,23 L25,5" fill="none" stroke="${F}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
