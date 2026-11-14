// Build-side helpers shared by the scene modules: typed text, cards, chips, glyph
// primitives, counters, and the punch-in mark kit. Timing helpers come from
// lib.mjs (span/frames/cueIn/wipeUp/wipeDown/exitAt); nothing here re-derives them.
import { readFileSync } from "node:fs";
import { C, panelClass, boxOf, markSVG, mapZoom, wipeDown } from "./lib.mjs";

export const f3 = v => (+v).toFixed(3);
export const A = s => `<span style="color:${C.accent}">${s}</span>`;
const CS = JSON.parse(readFileSync("cutsheet.json", "utf8")).parts;
// A card leaves with a 0.3s wipe when the next part does NOT abut this one
// (2.1 spot review: hand-offs must keep no exit or the card blinks at the cut).
export const exitIfFree = (id, D, sels) => {
  const i = CS.findIndex(p => p.id === id), nx = CS[i + 1];
  if (nx && Math.abs(nx.start - CS[i].end) < 0.02) return "";
  return sels.map(sel => wipeDown(sel, +(D - 0.3 - 1 / 30).toFixed(3), 0.3)).join("\n") + "\n";
};
export const wOf = id => boxOf(id)[2], hOf = id => boxOf(id)[3];

// -------------------------------------------------------------- typed text
export const T = (txt, x, y, size, opts = {}) => {
  const { w = null, weight = 700, color = "currentColor", cls = "", id = "", align = "left",
          lh = 1.12, ls = 0, upper = false, nowrap = false } = opts;
  const wide = w ? `width:${w}px;` : "white-space:nowrap;";
  return `<div ${id ? `id="${id}"` : ""} class="${cls}" style="position:absolute;left:${x}px;top:${y}px;${wide}font-family:Satoshi,sans-serif;font-variation-settings:'wght' ${weight};font-size:${size}px;line-height:${lh};color:${color};text-align:${align};letter-spacing:${ls}em;${upper ? "text-transform:uppercase;" : ""}">${txt}</div>`;
};
// In-flow text for INSIDE a shrink-wrapped parent (chips, pills, ledger rows).
// T() positions absolutely, which makes an auto-sized bordered parent collapse
// to padding and HyperFrames' layout audit then reports every child as overflow.
// TI renders a <span> that contributes to the parent's box instead.
export const TI = (txt, size, opts = {}) => {
  const { weight = 700, color = "currentColor", cls = "", ls = 0, upper = false, lh = 1.12 } = opts;
  const fam = cls === "disp" ? "font-family:Satoshi,sans-serif;font-variation-settings:'wght' 900;"
    : cls === "capt" ? "font-family:SatoshiBold,Satoshi,sans-serif;font-weight:700;"
    : `font-family:Satoshi,sans-serif;font-variation-settings:'wght' ${weight};`;
  return `<span class="${cls}" style="display:block;${fam}font-size:${size}px;line-height:${lh};color:${color};white-space:nowrap;letter-spacing:${ls}em;${upper ? "text-transform:uppercase;" : ""}">${txt}</span>`;
};
// ls (letter-spacing em) is overridable for eyebrows that run out of card width
// when floored to 20px (composition pass 2 F1); the default keeps the house tracking.
export const EYEBROW = (txt, x, y, color, id = "", size = 24, ls = 0.16) =>
  T(txt, x, y, size, { weight: 700, color, ls, upper: true, id });
// The stat size floor is style.json statMinFontPx 160 (display 900).
export const statLine = (id, txt, x, y, opts = {}) =>
  T(txt, x, y, opts.size || 160, { weight: 900, cls: "disp", color: opts.color || "currentColor", id: opts.id, w: opts.w });

export const cardHTML = (id, x, y, w, h, inner, extra = "") =>
  `<div id="${id}" class="${panelClass(id)}" style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;${extra}">${inner}</div>`;
export const chipHTML = (id, x, y, inner, extra = "") =>
  `<div id="${id}" class="opaque" style="position:absolute;left:${x}px;top:${y}px;padding:10px 20px;font-family:SatoshiBold,Satoshi;font-weight:700;font-size:26px;white-space:nowrap;box-shadow:0 6px 18px rgba(0,0,0,.35);opacity:0;${extra}">${inner}</div>`;

// -------------------------------------------------------------- motion bits
export const show = (sel, t, d = 0.3, from = "", to = "") =>
  `tl.fromTo(${JSON.stringify(sel)},{opacity:0${from ? "," + from : ""}},{opacity:1${to ? "," + to : ""},duration:${d},ease:"power2.out"},${f3(t)});\n`;
export const hide = (sel, t, d = 0.3) =>
  `tl.fromTo(${JSON.stringify(sel)},{opacity:1},{opacity:0,duration:${d},immediateRender:false},${f3(t)});\n`;
// draw ONE element by id (children of a group are drawn individually: a parent
// group is not stroke-animatable as one)
export const drawOn = (id, t, d = 0.4) =>
  `tl.fromTo("#${id}",{strokeDashoffset:1},{strokeDashoffset:0,duration:${d},ease:"power2.out"},${f3(t)});\n`;
export const rowUp = (sel, t, d = 0.35) =>
  `tl.fromTo(${JSON.stringify(sel)},{opacity:0,y:14},{opacity:1,y:0,duration:${d},ease:"power3.out"},${f3(t)});\n`;
export const ruleIn = (sel, t, d = 0.45) =>
  `tl.fromTo(${JSON.stringify(sel)},{scaleX:0,transformOrigin:"left center"},{scaleX:1,duration:${d},ease:"power2.out"},${f3(t)});\n`;
// pop-in stamp: scales down onto its mark (hidden-scaled before its cue)
export const pop = (sel, t, d = 0.25) =>
  `tl.fromTo(${JSON.stringify(sel)},{scale:2.1,opacity:0,transformOrigin:"50% 50%"},{scale:1,opacity:1,duration:${d},ease:"back.out(2)"},${f3(t)});\n`;
// continuous rotation about a user-space pivot (spin loops: the circling T)
export const spin = (id, t, d, deg, pivot, ease = "power1.inOut") =>
  `tl.fromTo("#${id}",{rotation:0,svgOrigin:"${pivot.join(" ")}"},{rotation:${deg},svgOrigin:"${pivot.join(" ")}",duration:${f3(d)},ease:"${ease}",immediateRender:false},${f3(t)});\n`;
// linear ping-pong (rope swing)
export const wobble = (id, t, d, from, to, pivot, n = 2) =>
  `tl.fromTo("#${id}",{rotation:${from},svgOrigin:"${pivot.join(" ")}"},{rotation:${to},svgOrigin:"${pivot.join(" ")}",duration:${f3(d)},ease:"sine.inOut",yoyo:true,repeat:${n},immediateRender:false},${f3(t)});\n`;
// Count-up. The element starts at `from` (init writes it) and is held until t0 by
// the caller's show(); it never flashes the end value (2.1 review 2026-10-17).
export const countUp = (sel, from, to, t0, d0, dec = 0, prefix = "", suffix = "", init = true) => `
(function(){ const el=document.querySelector(${JSON.stringify(sel)}); const o={v:${from}};
  const f=v=>${JSON.stringify(prefix)}+v.toFixed(${dec}).replace(/\\B(?=(\\d{3})+(?!\\d))/g,",")+${JSON.stringify(suffix)};
  ${init ? `el.textContent=f(${from});` : ""}
  tl.fromTo(o,{v:${from}},{v:${to},duration:${d0},ease:"power2.out",immediateRender:false,onUpdate:()=>{el.textContent=f(o.v);}},${f3(t0)});
})();`;

// -------------------------------------------------------------- glyph kit
export const tickSVG = (id, cx, cy, r, col) =>
  `<svg id="${id}-w" style="position:absolute;left:${cx - r - 6}px;top:${cy - r - 6}px;overflow:visible;opacity:0"
     width="${2 * r + 12}" height="${2 * r + 12}" viewBox="${cx - r - 6} ${cy - r - 6} ${2 * r + 12} ${2 * r + 12}">
     <circle id="${id}-c" cx="${cx}" cy="${cy}" r="${r}" pathLength="1" fill="none" stroke="${col}" stroke-width="4" style="stroke-dasharray:1;stroke-dashoffset:1"/>
     <path id="${id}-m" d="M${cx - r * 0.5},${cy + 1} L${cx - r * 0.12},${cy + r * 0.42} L${cx + r * 0.55},${cy - r * 0.45}" pathLength="1" fill="none" stroke="${col}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>
   </svg>`;
// reveal the hidden tick wrapper, then draw circle + mark
export const tickIn = (id, t, d = 0.4) =>
  `tl.fromTo("#${id}-w",{opacity:0},{opacity:1,duration:0.01,immediateRender:false},${f3(t)});\n`
  + drawOn(`${id}-c`, t, d * 0.55) + drawOn(`${id}-m`, t + d * 0.45, d * 0.55);
export const slashSVG = (id, x0, y0, x1, y1, col, w = 5) =>
  markSVG(x0, y0, x1, y1, `<path id="${id}" d="M${x0},${y0} L${x1},${y1}" pathLength="1" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>`);
export const dashBoxHTML = (id, x, y, w, h, col, r = 8) =>
  markSVG(x, y, x + w, y + h, `<rect id="${id}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="none" stroke="${col}" stroke-width="4" stroke-dasharray="10 8"/>`);
export const barHTML = (id, x, y, w, h, col) =>
  `<div id="${id}" style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:4px;background:${col};transform:scaleX(0);transform-origin:left center"></div>`;
export const barIn = (id, t, d = 0.45) =>
  `tl.fromTo("#${id}",{scaleX:0},{scaleX:1,duration:${d},ease:"power2.out",immediateRender:false},${f3(t)});\n`;
export const vbars = (id, x, baseY, specs, col) =>
  `<svg id="${id}-w" style="position:absolute;left:${x - 10}px;top:${baseY - 130}px;overflow:visible" width="560" height="150" viewBox="${x - 10} ${baseY - 130} 560 150">`
  + specs.map(([bx, bw, bh], i) => `<rect id="${id}-v${i}" x="${bx}" y="${baseY - bh}" width="${bw}" height="${bh}" fill="${col}"/>`).join("")
  + `</svg>`;
export const vbarIn = (id, n, t, stagger = 0.03, d = 0.2) => {
  let js = "";
  for (let i = 0; i < n; i++) js += `tl.fromTo("#${id}-v${i}",{scaleY:0,transformOrigin:"bottom"},{scaleY:1,duration:${f3(d)},ease:"power2.out",immediateRender:false},${f3(t + i * stagger)});\n`;
  return js;
};

// -------------------------------------------------------------- punch marks
// Every mark is its OWN absolutely-positioned SVG sized to its (padded) box.
// A single full-frame mark layer over a punch-in hid the frame under it from
// HyperFrames' seek check ("timeline did not advance", 05-agent-swarm).
export const underlineM = (id, box, col, w = 5) => {
  const [x0, y0, x1, y1] = box;
  return markSVG(x0, y1 - 6, x1, y1 + 8,
    `<line id="${id}" x1="${x0}" y1="${y1 + 2}" x2="${x1}" y2="${y1 + 2}" pathLength="1" stroke="${col}" stroke-width="${w}" stroke-linecap="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>`);
};
export const boxM = (id, box, col, w = 4, pad = 8) => {
  const [x0, y0, x1, y1] = box;
  return markSVG(x0, y0, x1, y1,
    `<rect id="${id}" x="${x0 - pad}" y="${y0 - pad}" width="${x1 - x0 + 2 * pad}" height="${y1 - y0 + 2 * pad}" rx="7" pathLength="1" fill="none" stroke="${col}" stroke-width="${w}" style="stroke-dasharray:1;stroke-dashoffset:1"/>`);
};
// leader line from a label anchor to a target point (gZ4's coord labels)
export const leaderM = (id, ax, ay, tx, ty, col) =>
  markSVG(Math.min(ax, tx), Math.min(ay, ty), Math.max(ax, tx), Math.max(ay, ty),
    `<line id="${id}" x1="${ax}" y1="${ay}" x2="${tx}" y2="${ty}" pathLength="1" stroke="${col}" stroke-width="3" stroke-linecap="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>
     <circle id="${id}-t" cx="${tx}" cy="${ty}" r="5" fill="${col}" opacity="0"/>`);
export const leaderIn = (id, t) => drawOn(id, t, 0.3) + `tl.fromTo("#${id}-t",{opacity:0},{opacity:1,duration:0.2,immediateRender:false},${f3(t + 0.25)});\n`;
// map an OCR source box through a punch-in's zoom to canvas coords
export const zm = (zid, srcBox) => mapZoom(zid, srcBox);
