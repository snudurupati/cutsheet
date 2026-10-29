// Shared helpers for the 02-data-profiling graphics build, lifted unchanged from
// 01-robotics-as-de's build.mjs (ref-01-build.mjs, kept as a read-only reference). Every fix those
// helpers carry (count-ups that start at their from value, rows that rise instead of clip-wiping,
// the seeded dust, the match-cut grow on clip-path) comes with them. Part sources in src/ import
// from here, lib.mjs, hum.mjs and art.mjs; nothing in src/ edits this file.
import { C, emit, span, frames, cueIn, cue, panelClass, fg, dim, wipeUp, wipeDown, exitAt,
         GRAIN_HTML, grainJS, markSVG, mapZoom, plateau, zoomItem, ocrBox, struck, strikeIn,
         DATABASE } from "./lib.mjs";
import { readFileSync } from "node:fs";
export const dur = id => frames(id) / 30;
export const f3 = v => (+v).toFixed(3);
export const BRAND = JSON.parse(readFileSync("../../../brand.md", "utf8").match(/```json\s*(\{[\s\S]*\})\s*```/)[1]);

// ------------------------------------------------------------- shared helpers
export const drawAll = (sel, t, d = 0.4) =>
  `tl.fromTo(${JSON.stringify(sel)},{strokeDashoffset:1},{strokeDashoffset:0,duration:${d},ease:"power2.out"},${f3(t)});\n`;
export const show = (sel, t, d = 0.3, from = "", to = "") =>
  `tl.fromTo(${JSON.stringify(sel)},{opacity:0${from ? "," + from : ""}},{opacity:1${to ? "," + to : ""},duration:${d},ease:"power2.out"},${f3(t)});\n`;
export const hide = (sel, t, d = 0.3) =>
  `tl.fromTo(${JSON.stringify(sel)},{opacity:1},{opacity:0,duration:${d},immediateRender:false},${f3(t)});\n`;
export const wipeIn = (sel, t, d = 0.45) =>
  `tl.fromTo(${JSON.stringify(sel)},{clipPath:"inset(-20px 100% -20px 0)"},{clipPath:"inset(-20px 0% -20px 0)",duration:${d},ease:"power2.out"},${f3(t)});\n`;
// A row RISES in (opacity + 14px), never a clip-path wipe: composition review 2026-10-17 found the
// clip measured against containers whose text is absolutely positioned, so the box was 0px tall and
// the mask cut every row of g19/g21 in half and let descenders show early in g10/g20.
export const rowUp = (sel, t, d = 0.35) =>
  `tl.fromTo(${JSON.stringify(sel)},{opacity:0,y:14},{opacity:1,y:0,duration:${d},ease:"power3.out"},${f3(t)});\n`;
export const ruleIn = (sel, t, d = 0.45) =>
  `tl.fromTo(${JSON.stringify(sel)},{scaleX:0,transformOrigin:"left center"},{scaleX:1,duration:${d},ease:"power2.out"},${f3(t)});\n`;
// Count-ups: the element shows `from` on frame 0, never the end value (review 2026-10-17: g07 and g12
// showed their final number before counting, because the hold tween rendered at creation). Only the
// FIRST counter on an element sets its starting text (init); a chained counter passes init=false.
export const countUp = (sel, from, to, t0, d0, dec = 0, prefix = "", suffix = "", init = true) => `
(function(){ const el=document.querySelector(${JSON.stringify(sel)}); const o={v:${from}};
  const f=v=>${JSON.stringify(prefix)}+v.toFixed(${dec}).replace(/\\B(?=(\\d{3})+(?!\\d))/g,",")+${JSON.stringify(suffix)};
  ${init ? `el.textContent=f(${from});` : ""}
  tl.fromTo(o,{v:${from}},{v:${to},duration:${d0},ease:"power2.out",immediateRender:false,onUpdate:()=>{el.textContent=f(o.v);}},${f3(t0)});
})();`;
// a looping linear tween for continuous motion, seek-safe (one tween, repeat)
export const loop = (sel, prop, from, to, t0, t1, period) => {
  const n = Math.max(1, Math.floor((t1 - t0) / period));
  return `tl.fromTo(${JSON.stringify(sel)},{${prop}:${from}},{${prop}:${to},duration:${f3(period)},ease:"none",repeat:${n - 1},immediateRender:false},${f3(t0)});\n`;
};
export const card = (id, x, y, w, h, inner, extra = "") =>
  `<div id="${id}" class="${panelClass(id.split("-")[0])}" style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;${extra}">${inner}</div>`;
export const T = (txt, x, y, size, opts = {}) => {
  const { w = null, weight = 700, color = "currentColor", cls = "", id = "", align = "left", lh = 1.12, ls = 0, upper = false } = opts;
  return `<div ${id ? `id="${id}"` : ""} class="${cls}" style="position:absolute;left:${x}px;top:${y}px;${w ? `width:${w}px;` : "white-space:nowrap;"}font-family:Satoshi,sans-serif;font-variation-settings:'wght' ${weight};font-size:${size}px;line-height:${lh};color:${color};text-align:${align};letter-spacing:${ls}em;${upper ? "text-transform:uppercase;" : ""}">${txt}</div>`;
};
export const EYEBROW = (txt, x, y, color, id = "") => T(txt, x, y, 28, { weight: 700, color, ls: 0.18, upper: true, id });
// A card leaves with a 0.3s wipe when the next part does NOT start on this part's last frame
// (spot review 2026-10-17: every card vanished in a single frame). Hand-offs keep no exit.
export const PLANP = JSON.parse(readFileSync("cutsheet.json", "utf8")).parts;
export const exitIfFree = (id, D, sels) => {
  const i = PLANP.findIndex(p => p.id === id), nx = PLANP[i + 1];
  if (nx && Math.abs(nx.start - PLANP[i].end) < 0.02) return "";
  return sels.map(sel => wipeDown(sel, exitAt(D, 0.3), 0.3)).join("\n") + "\n";
};
// seeded PRNG at build time: deterministic numbers baked into the composition
export const prng = seed => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };

// -------------------------------------------------------------- takeover page
// analogy/takeover background (style.md Texture): $bg, $rule grid 60px at 6%, $accent-soft radial 8%
export const PAGE = `<div style="position:absolute;inset:0;background:${C.bg}"></div>
<div style="position:absolute;inset:0;opacity:.08;background:radial-gradient(ellipse at 30% 35%, ${C.accentSoft} 0%, transparent 60%)"></div>
<svg style="position:absolute;inset:0;opacity:.06" width="1920" height="1080">${[...Array(33).keys()].map(i => `<line x1="${i * 60}" y1="0" x2="${i * 60}" y2="1080" stroke="${C.rule}" stroke-width="2"/>`).join("")}${[...Array(19).keys()].map(i => `<line x1="0" y1="${i * 60}" x2="1920" y2="${i * 60}" stroke="${C.rule}" stroke-width="2"/>`).join("")}</svg>`;

// takeoverDust (style.json graphics.takeoverDust, human 2026-10-16). ~500 flecks, ink and muted,
// 6-12% opacity, median 2px, drifting up-right ~35px/s with low-frequency wander. Positions are a
// pure function of (seed, index, t): each fleck is a div whose x/y are tweened linearly across the
// part from a seeded start to a seeded end, plus one slow sine wobble; flecks that leave the frame
// wrap by being split into two linear legs. Behind every drawn element.
export const dustHTML = (id, D, seed = 7) => {
  const r = prng(seed), dots = [], js = [];
  const N = 500, ANG = 35 * Math.PI / 180;
  for (let i = 0; i < N; i++) {
    const soft = i < 8;
    const size = soft ? 15 + r() * 5 : Math.max(1, Math.round(r() < 0.5 ? 2 : r() < 0.8 ? 3 : r() < 0.97 ? 4 : 4 + r() * 9));
    const op = soft ? 0.05 + r() * 0.03 : 0.06 + r() * 0.06;
    const col = r() < 0.6 ? C.ink : C.muted;
    const v = 24 + r() * 27;                                   // px/s
    const vx = v * Math.cos(ANG), vy = -v * Math.sin(ANG);
    const x0 = r() * 1920, y0 = r() * 1080;
    // end position, wrapped into the frame by splitting at the edge crossing
    const bg = soft ? `radial-gradient(circle, ${col} 0%, transparent 70%)` : col;
    dots.push(`<div id="${id}-d${i}" style="position:absolute;left:0;top:0;width:${size}px;height:${size}px;border-radius:50%;background:${bg};opacity:${op.toFixed(3)}"></div>`);
    // leg 1 until it exits right/top, then re-enter from left/bottom (wrap), leg 2 to the end
    const tx = vx > 0 ? (1940 - x0) / vx : 1e9, ty = vy < 0 ? (y0 + 20) / -vy : 1e9;
    const tExit = Math.min(tx, ty, D);
    const x1 = x0 + vx * tExit, y1 = y0 + vy * tExit;
    js.push(`tl.fromTo("#${id}-d${i}",{x:${x0.toFixed(1)},y:${y0.toFixed(1)}},{x:${x1.toFixed(1)},y:${y1.toFixed(1)},duration:${f3(Math.max(0.05, tExit))},ease:"none",immediateRender:true},0);`);
    if (tExit < D) {
      const nx = tx < ty ? -20 : x1 - 0, ny = tx < ty ? y1 : 1100;
      const rest = D - tExit;
      js.push(`tl.fromTo("#${id}-d${i}",{x:${nx.toFixed(1)},y:${ny.toFixed(1)}},{x:${(nx + vx * rest).toFixed(1)},y:${(ny + vy * rest).toFixed(1)},duration:${f3(rest)},ease:"none",immediateRender:false},${f3(tExit)});`);
    }
  }
  return { html: `<div id="${id}-dust" style="position:absolute;inset:0;overflow:hidden">${dots.join("")}</div>`, js: js.join("\n") + "\n" };
};

// the SO-101 arm in line art: g11b (leader/follower) and the hook (g01b)
export const so101 = (id, x, y, filled, F) => {
  const fill = filled ? F : C.bg, s = `stroke="${F}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"`;
  return `<svg style="position:absolute;left:${x}px;top:${y}px;overflow:visible" width="220" height="260" viewBox="0 0 220 260">
    <rect x="40" y="216" width="100" height="26" rx="6" fill="${fill}" ${s}/>
    <rect x="72" y="186" width="36" height="32" rx="6" fill="${fill}" ${s}/>
    <g id="${id}-u"><rect x="80" y="86" width="22" height="104" rx="8" fill="${fill}" ${s}/><circle cx="91" cy="188" r="10" fill="${C.bg}" ${s}/>
      <g id="${id}-f"><rect x="91" y="72" width="96" height="22" rx="8" fill="${fill}" ${s}/><circle cx="91" cy="84" r="10" fill="${C.bg}" ${s}/>
        <path d="M187,76 L206,66 M187,92 L206,100" fill="none" ${s}/></g></g></svg>`;
};


// MATCH-CUT GROW (style.md 2026-09-30) on clip-path, never left/top: HyperFrames' check rejects layout
// motion (it snaps to whole device pixels and stutters on an ease-out tail). Two full-frame layers: the
// white border and the paper, each clipped from the card's rect to the full frame; the shadow is a
// drop-shadow on their wrapper, so it follows the clip. Frame 0 redraws a .sheet card at `rect`.
// `inner` is in stage coordinates; `carry` sits in the card's padding box and fades with the grow.
export const matchCutGrow = (id, rect, inner, carry, grow = 0.6) => {
  const [x, y, w, h] = rect, B = 6;
  const ins = (t, r, b, l, rad) => `inset(${t}px ${r}px ${b}px ${l}px round ${rad}px)`;
  // the border layer is a RING (even-odd polygon: outer rect, inner rect), not a filled rect: the 92%
  // paper must sit over the face exactly as the card's does, or frame 0 steps ~7 levels brighter
  // (finished-build QA 2026-10-17: f0efea -> f7f6f1 at the cut)
  const ring = (ox0, oy0, ox1, oy1, ix0, iy0, ix1, iy1) => `polygon(evenodd, ${ox0}px ${oy0}px, ${ox1}px ${oy0}px, ${ox1}px ${oy1}px, ${ox0}px ${oy1}px, ${ox0}px ${oy0}px, ${ix0}px ${iy0}px, ${ix0}px ${iy1}px, ${ix1}px ${iy1}px, ${ix1}px ${iy0}px, ${ix0}px ${iy0}px)`;
  const outer0 = ring(x, y, x + w, y + h, x + B, y + B, x + w - B, y + h - B), outer1 = ring(-B, -B, 1920 + B, 1080 + B, 0, 0, 1920, 1080);
  const paper0 = ins(y + B, 1920 - x - w + B, 1080 - y - h + B, x + B, 1);
  const html = `<div style="position:absolute;inset:0;filter:drop-shadow(0 16px 26px rgba(0,0,0,.38))">
      <div id="${id}-mb" style="position:absolute;inset:0;background:#FFFFFF;clip-path:${outer0}"></div>
      <div id="${id}-mp" style="position:absolute;inset:0;background:${C.bg}EB;clip-path:${paper0}">${inner}
        <div id="${id}-carry" style="position:absolute;left:${x + B}px;top:${y + B}px;width:${w - 2 * B}px;height:${h - 2 * B}px">${carry}</div></div></div>`;
  let js = `tl.fromTo("#${id}-mb",{clipPath:"${outer0}"},{clipPath:"${outer1}",duration:${grow},ease:"power2.inOut",immediateRender:true},0);\n`;
  js += `tl.fromTo("#${id}-mp",{clipPath:"${paper0}"},{clipPath:"${ins(0, 0, 0, 0, 0)}",duration:${grow},ease:"power2.inOut",immediateRender:true},0);\n`;
  js += `tl.fromTo("#${id}-carry",{opacity:1},{opacity:0,duration:${(grow * 0.7).toFixed(3)},ease:"power1.in",immediateRender:true},0.05);\n`;
  return { html, js };
};

// A drawn scene promoted to a FULL-FRAME takeover (human 2026-10-17: g05 and g06 full screen). The
// scene keeps its own W x H layout and timings and is scaled up whole to about 1600 x 900, centred on
// the paper page with takeoverDust, grain and the 1.00 -> 1.03 drift. With `from` (a card rect) it
// arrives by MATCH-CUT (style.md 2026-09-30): frame 0 is that card at the same pixels carrying `carry`
// (the previous card's last content, in card-local px), and the sheet grows to full frame over GROW;
// the carried content fades, the backdrop fades in with the grow (never on frame 1), and the scene
// fades in as the grow lands. Without `from` it opens on a hard cut to the full page.
export const takeoverScene = (id, D, W, H, inner, { from = null, carry = "", grow = 0.6, bgIn = null, cIn = null } = {}) => {
  const k = Math.min(1600 / W, 900 / H), L = Math.round((1920 - W * k) / 2), T0 = Math.round((1080 - H * k) / 2), B = 6;
  const dust = dustHTML(id, D, 5);
  const page = `<div id="${id}-bg" style="position:absolute;inset:0">${PAGE}${dust.html}${GRAIN_HTML}</div>
    <div id="${id}-z" style="position:absolute;inset:0">
      <div id="${id}-c" style="position:absolute;left:${L}px;top:${T0}px;width:${W}px;height:${H}px;transform:scale(${k.toFixed(4)});transform-origin:0 0">${inner}</div></div>`;
  let js = dust.js + grainJS(D) + "\n";
  js += `tl.fromTo("#${id}-z",{scale:1,transformOrigin:"50% 50%"},{scale:1.03,transformOrigin:"50% 50%",duration:${f3(D - (from ? grow : 0))},ease:"power1.inOut",immediateRender:true},${from ? grow : 0});\n`;
  if (!from) return { body: `<div style="position:absolute;left:0;top:0;width:1920px;height:1080px;overflow:hidden">${page}</div>`, js };
  const g = matchCutGrow(id, from, page, carry, grow);
  // bgIn / cIn (g02, review 2026-10-28): a faster backdrop keeps the face from ghosting through the grow, and
  // an earlier scene keeps the full frame from landing blank
  js += g.js + `tl.fromTo("#${id}-bg",{opacity:0},{opacity:1,duration:${bgIn ?? grow},ease:"power1.in",immediateRender:true},0);\n`;
  js += `tl.fromTo("#${id}-c",{opacity:0},{opacity:1,duration:0.35,ease:"power1.out",immediateRender:true},${f3(cIn ?? grow - 0.1)});\n`;
  const body = g.html;
  return { body, js };
};

// =================================================================== INTRO

// --------------------------------------------------------------- g01 hook
// Spot review 2026-10-17: enters on the first "Databricks" (style: the drawn object lands on the

// ---- 02 additions
// cue time RELATIVE to the part, from the plan's own resolved cues (make_plan.py), so a part never
// re-searches the transcript for a word the plan already placed. Throws on an unknown key.
const PLAN = JSON.parse(readFileSync("cutsheet.json", "utf8"));
export const planPart = id => [...PLAN.parts, ...(PLAN.alternates || [])].find(p => p.id === id);
export const cueRel = (id, key) => {
  const p = planPart(id); if (!p) throw new Error(`${id} not in cutsheet.json`);
  if (!(key in p.cues)) throw new Error(`${id}: no cue "${key}" in the plan (have ${Object.keys(p.cues)})`);
  return +(p.cues[key] - p.start).toFixed(3);
};
// measured zones for THIS job (zones.json): the card areas clear of the speaker on all four takes
export const HERO = { x: 48, y: 48, w: 592, h: 492 };     // wide card, upper left
export const COLUMN = { x: 48, y: 48, w: 432, h: 812 };   // tall narrow card
