// Shared helpers for g08-g12 (Part 2 of 02-data-profiling). Not a part (leading underscore).
// Only the parts g08..g12 import this file.
import { C } from "../lib.mjs";
import { T, f3 } from "../common.mjs";

// fade an element between two opacities (seek-safe fromTo)
export const fade = (sel, a, b, t, d = 0.3, ease = "power1.inOut") =>
  `tl.fromTo(${JSON.stringify(sel)},{opacity:${a}},{opacity:${b},duration:${d},ease:"${ease}",immediateRender:false},${f3(t)});\n`;
// hold an element hidden from frame 0 (pair with a later fade/show that has immediateRender:false)
export const holdHidden = sel => `tl.fromTo(${JSON.stringify(sel)},{opacity:0},{opacity:0,duration:0.2,immediateRender:true},0);\n`;
// a node pops in around its own centre (SVG user space, so svgOrigin, never transformOrigin)
export const popSvg = (sel, cx, cy, t, d = 0.35) =>
  `tl.fromTo(${JSON.stringify(sel)},{opacity:0,scale:0.4,svgOrigin:"${cx} ${cy}"},{opacity:1,scale:1,svgOrigin:"${cx} ${cy}",duration:${d},ease:"back.out(2)"},${f3(t)});\n`;
// a centred text block: a fixed-width wrapper with text-align centre, so no CSS transform is needed
export const Tc = (txt, cx, y, size, opts = {}) => {
  const w = opts.w || 420;
  return T(txt, Math.round(cx - w / 2), y, size, { ...opts, w, align: "center" });
};
// a tracked-caps label on a paper backing pill (map labels, style.md `map`): an edge or a dot passes
// BEHIND the letters. Positioned by its centre with a fixed-width wrapper (no CSS transform).
export const pill = (id, txt, cx, y, { size = 22, color = C.ink, w = 300, ls = 0.14, bg = C.bg } = {}) =>
  `<div id="${id}" style="position:absolute;left:${Math.round(cx - w / 2)}px;top:${y}px;width:${w}px;text-align:center">
    <span style="display:inline-block;background:${bg};padding:3px 12px;border-radius:8px;font-family:Satoshi,sans-serif;font-variation-settings:'wght' 700;font-size:${size}px;line-height:1.15;letter-spacing:${ls}em;text-transform:uppercase;color:${color};white-space:nowrap">${txt}</span></div>`;
// a gentle yoyo pulse (scale) for continuous motion, about an SVG point
export const pulseSvg = (sel, cx, cy, t0, t1, amp = 1.12, period = 1.6) => {
  const n = Math.max(1, Math.floor((t1 - t0) / period));
  return `tl.fromTo(${JSON.stringify(sel)},{scale:1,svgOrigin:"${cx} ${cy}"},{scale:${amp},svgOrigin:"${cx} ${cy}",duration:${f3(period / 2)},yoyo:true,repeat:${2 * n - 1},ease:"sine.inOut",immediateRender:false},${f3(t0)});\n`;
};
