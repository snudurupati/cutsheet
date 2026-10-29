// Shared by the close (g24, g26; small helpers used by g25, g28, g29). Not a part.
// The SERIES MAP's geometry is IMPORTED from g12 (its first visit), never retyped, so the returns are
// the same map with the state changed. g12's end state (frame 0 of g24): PUSH-T and ALOHA lit ink with
// the PUSH-T -> ALOHA edge lit and dots travelling it, THIS WEEK bracket
// over the two sims, the dashed arrow ALOHA -> SO-101 with marching dashes, SO-101 an unlit node with a
// dashed $accent ring (the map's one accent) and NEXT WEEK under it.
// The returns add (all card-local px, constants below): a tick above each done node, the LEROBOT v3
// bracket under all three, and a card as tall as HERO to hold it. g12's WEEK 1 line is dropped on the
// returns (composition review 2026-10-28: PUSH-T already sits under the THIS WEEK bracket).
import { C, fg, dim } from "../lib.mjs";
import { f3, show } from "../common.mjs";
import { MAP } from "./g12.mjs";

export { MAP };
export const CARD = { ...MAP.card, h: 492 };                     // 592 x 492 at x48 y48: the full HERO
export const TICK_Y = MAP.N.pusht[1] - 34;                      // ticks between the THIS WEEK bracket and the nodes
export const LR = { x0: MAP.BRACKET.x0, x1: 500, y: 386, tick: 14, labelY: 398 };   // LEROBOT v3 bracket

// ------------------------------------------------------------------ small helpers
export const fade = (sel, a, b, t, d = 0.4) =>
  `tl.fromTo(${JSON.stringify(sel)},{opacity:${a}},{opacity:${b},duration:${d},ease:"power1.inOut",immediateRender:false},${f3(t)});\n`;
export const hold = (sel, op = 1, t = 0) =>
  `tl.fromTo(${JSON.stringify(sel)},{opacity:${op}},{opacity:${op},duration:0.2,immediateRender:true},${f3(t)});\n`;
export const drawn = sel =>               // a .dr stroke shown fully drawn from frame 0
  `tl.fromTo(${JSON.stringify(sel)},{strokeDashoffset:0},{strokeDashoffset:0,duration:0.2,immediateRender:true},0);\n`;
export const popSvg = (sel, cx, cy, t, d = 0.35) =>
  `tl.fromTo(${JSON.stringify(sel)},{opacity:0,scale:0.4,svgOrigin:"${cx} ${cy}"},{opacity:1,scale:1,svgOrigin:"${cx} ${cy}",duration:${d},ease:"back.out(2)"},${f3(t)});\n`;
export const pulse = (sel, t, s = 1.15, d = 0.3, reps = 1) =>
  `tl.fromTo(${JSON.stringify(sel)},{scale:1,transformOrigin:"50% 50%"},{scale:${s},transformOrigin:"50% 50%",duration:${d},yoyo:true,repeat:${2 * reps - 1},ease:"sine.inOut",immediateRender:false},${f3(t)});\n`;
// A centred text block: fixed-width wrapper with text-align centre, so no CSS transform is needed and
// GSAP can move the element freely. The visible text is an inline-block span (its own measured box).
export const Tc = (id, txt, cx, y, size, { w = 300, weight = 700, color = C.ink, ls = 0, upper = false, backing = false, hidden = false, lh = 1.15 } = {}) =>
  `<div ${id ? `id="${id}"` : ""} style="position:absolute;left:${Math.round(cx - w / 2)}px;top:${y}px;width:${w}px;text-align:center;${hidden ? "opacity:0;" : ""}">
    <span style="display:inline-block;${backing ? `background:${C.bg};padding:3px 12px;border-radius:8px;` : ""}font-family:Satoshi,sans-serif;font-variation-settings:'wght' ${weight};font-size:${size}px;line-height:${lh};letter-spacing:${ls}em;${upper ? "text-transform:uppercase;" : ""}color:${color};white-space:nowrap">${txt}</span></div>`;
export const lbl = (id, txt, cx, y, opts = {}) => Tc(id, txt, cx, y, 22, { weight: 700, ls: 0.14, upper: true, backing: true, ...opts });

// a drawn check mark, pathLength 1 so drawAll draws it
export const tickPath = (id, cx, cy, F, s = 1, w = 4) =>
  `<path id="${id}" class="dr" pathLength="1" d="M${f3(cx - 13 * s)},${f3(cy + 1 * s)} L${f3(cx - 4 * s)},${f3(cy + 10 * s)} L${f3(cx + 14 * s)},${f3(cy - 11 * s)}" fill="none" stroke="${F}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

// ------------------------------------------------------------------ the map at the return
// Two layers so a lens can dim the map while SO-101 stays at full strength: `map` (everything but
// SO-101) and `so` (SO-101's node, accent rings, label, kind, NEXT WEEK). opts.after24 = g24's end
// state (ticks drawn, LEROBOT v3 bracket drawn; SO-101 still the dashed accent ring, g26 owns its change).
export const seriesMap = (id, { after24 = false } = {}) => {
  const F = fg(id), M = dim(id);
  const { N, R, TRIM, LABEL_Y, KIND_Y, WEEK_Y, BRACKET: B, LABEL, KIND } = MAP;
  const IW = CARD.w - 12, IH = CARD.h - 12;
  const [px, py] = N.pusht, [ax, ay] = N.aloha, [sx, sy] = N.so101;
  const e1 = [px + TRIM, ax - TRIM], e2 = [ax + TRIM, sx - TRIM];
  const node = k => { const [x, y] = N[k];
    return `<g id="${id}-n${k}"><circle cx="${x}" cy="${y}" r="${R}" fill="${C.bg}" stroke="${M}" stroke-width="3.5"/><circle cx="${x}" cy="${y}" r="${R}" fill="${F}"/></g>`; };
  const kind = (k) => Tc(`${id}-k${k}`, KIND[k], N[k][0], KIND_Y, 20, { w: 160, weight: 700, ls: 0.14, upper: true, color: M });
  const wk = (eid, txt, x, dx = 0) => Tc(eid, txt, x + dx, WEEK_Y, 20, { w: 160, weight: 700, ls: 0.12, upper: true, color: F });
  const map = `
    <svg style="position:absolute;left:0;top:0;overflow:visible;pointer-events:none" width="${IW}" height="${IH}">
      <g id="${id}-e1"><line x1="${e1[0]}" y1="${py}" x2="${e1[1]}" y2="${py}" stroke="${C.rule}" stroke-width="3" stroke-linecap="round"/>
</g>
      <g id="${id}-e2"><line id="${id}-e2l" x1="${e2[0]}" y1="${ay}" x2="${e2[1] - 4}" y2="${ay}" stroke="${M}" stroke-width="3" stroke-dasharray="8 9" stroke-linecap="round"/>
        <path d="M${e2[1] - 12},${ay - 8} L${e2[1]},${ay} L${e2[1] - 12},${ay + 8}" fill="none" stroke="${M}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        ${[0, 1, 2].map(k => `<circle id="${id}-sdot${k}" cx="${e2[0]}" cy="${ay}" r="5" fill="${M}" opacity="0"/>`).join("")}</g>
      ${node("pusht")}${node("aloha")}
      <g id="${id}-thisw"><path d="M${B.x0},${B.y + B.tick} V${B.y} H${B.x1} V${B.y + B.tick} M${(B.x0 + B.x1) / 2},${B.y} V${B.y - 12}" fill="none" stroke="${F}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></g>
      ${tickPath(`${id}-tpusht`, px, TICK_Y, F)}${tickPath(`${id}-taloha`, ax, TICK_Y, F)}
      <path id="${id}-lr" class="dr" pathLength="1" d="M${LR.x0},${LR.y - LR.tick} V${LR.y} H${LR.x1} V${LR.y - LR.tick}" fill="none" stroke="${F}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    ${[0, 1, 2].map(k => `<svg id="${id}-dot${k}" style="position:absolute;left:${e1[0] - 5}px;top:${py - 5}px;overflow:visible;opacity:0" width="10" height="10"><circle cx="5" cy="5" r="5" fill="${M}"/></svg>`).join("")}
    ${lbl(`${id}-lpusht`, LABEL.pusht, px, LABEL_Y, { w: 200 })}${lbl(`${id}-laloha`, LABEL.aloha, ax, LABEL_Y, { w: 200 })}
    ${kind("pusht")}${kind("aloha")}
    ${lbl(`${id}-thisl`, "This week", (B.x0 + B.x1) / 2, B.labelY, { w: 240 })}
    ${lbl(`${id}-lrl`, "LeRobot v3", (LR.x0 + LR.x1) / 2, LR.labelY, { w: 260, hidden: !after24 })}`;
  const so = `
    <svg style="position:absolute;left:0;top:0;overflow:visible;pointer-events:none" width="${IW}" height="${IH}">
      <circle cx="${sx}" cy="${sy}" r="${R}" fill="${C.bg}" stroke="${M}" stroke-width="3.5" stroke-dasharray="6 5"/>
      <circle id="${id}-acc" cx="${sx}" cy="${sy}" r="${R}" fill="none" stroke="${C.accent}" stroke-width="4" stroke-dasharray="6 5"/>
      <circle id="${id}-fill" cx="${sx}" cy="${sy}" r="${R + 2}" fill="${C.accent}" opacity="0"/>
      <circle id="${id}-halo" cx="${sx}" cy="${sy}" r="18" fill="none" stroke="${C.accent}" stroke-width="3" opacity="0"/>
    </svg>
    ${lbl(`${id}-lso101`, LABEL.so101, sx, LABEL_Y, { w: 200 })}
    ${kind("so101")}
    <div id="${id}-nwp" style="position:absolute;left:${sx - 80}px;top:${WEEK_Y}px;width:160px;height:24px">${Tc(`${id}-nw`, "Next week", 80, 0, 20, { w: 160, weight: 700, ls: 0.12, upper: true, color: F })}</div>`;
  return { map, so, e1, e2, ay, py };
};

// dots travel an edge by transform (HyperFrames' seek sweep reads geometry, not attributes). The PUSH-T
// -> ALOHA dots are their own small <svg> elements: the sweep fingerprints element boxes, and a part
// whose only motion is inside one SVG failed sweep_static (g24, twice).
export const dotsRun = (sels, x0, x1, t0, t1, period = 2.4) =>
  sels.map((sel, k) => { const s = t0 + k * period / 3;
    if (s + period > t1) return "";
    return show(sel, s, 0.2) + `tl.fromTo(${JSON.stringify(sel)},{x:0},{x:${f3(x1 - x0)},duration:${period},ease:"none",repeat:${Math.max(0, Math.floor((t1 - s) / period) - 1)},immediateRender:false},${f3(s)});\n`; }).join("");
// the dashed arrow's dashes march toward SO-101
export const marchDashes = (sel, t0, t1) =>
  `tl.fromTo(${JSON.stringify(sel)},{strokeDashoffset:0},{strokeDashoffset:-34,duration:0.9,ease:"none",repeat:${Math.max(0, Math.floor((t1 - t0) / 0.9) - 1)},immediateRender:false},${f3(t0)});\n`;

// The SO-101 arm (common.mjs so101) with a settable stroke, so it can be drawn small in a lens and still
// land at 2px on screen. Same geometry and pivots: upper arm about (91,188), forearm about (91,84).
export const so101k = (id, filled, F, sw = 4) => {
  const fill = filled ? F : C.bg, s = `stroke="${F}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"`;
  return `<svg style="position:absolute;left:0;top:0;overflow:visible;pointer-events:none" width="220" height="260" viewBox="0 0 220 260">
    <rect x="40" y="216" width="100" height="26" rx="6" fill="${fill}" ${s}/>
    <rect x="72" y="186" width="36" height="32" rx="6" fill="${fill}" ${s}/>
    <g id="${id}-u"><rect x="80" y="86" width="22" height="104" rx="8" fill="${fill}" ${s}/><circle cx="91" cy="188" r="10" fill="${C.bg}" ${s}/>
      <g id="${id}-f"><rect x="91" y="72" width="96" height="22" rx="8" fill="${fill}" ${s}/><circle cx="91" cy="84" r="10" fill="${C.bg}" ${s}/>
        <path d="M187,76 L206,66 M187,92 L206,100" fill="none" ${s}/></g></g></svg>`;
};

// g26's LAST frame, redrawn inside g27 so the hand-off can crossfade (review round 3): the map at full
// strength with ticks and the LeRobot bracket drawn (its label hidden), SO-101 lit $accent, the
// fallback tag. Returns { html, js }; html goes inside the card, js holds that state from frame 0.
export const g26EndState = id => {
  const M = dim(id);
  const { map, so } = seriesMap(id, { after24: true });
  const html = `<div id="${id}-out" style="position:absolute;inset:0">
    <div style="position:absolute;left:28px;top:24px;font-family:Satoshi,sans-serif;font-variation-settings:'wght' 700;font-size:28px;line-height:1.12;letter-spacing:0.18em;text-transform:uppercase;color:${M};white-space:nowrap">The datasets</div>
    <div style="position:absolute;inset:0">${map}</div>${so}
    <div style="position:absolute;left:24px;top:404px;padding:6px 14px;border:2px dashed ${M};border-radius:10px;background:${C.bg};font-family:Satoshi,sans-serif;font-variation-settings:'wght' 700;font-size:22px;line-height:1.2;letter-spacing:0.1em;text-transform:uppercase;color:${M};white-space:nowrap">or a public<br>SO-101 set</div></div>`;
  const js = drawn(`#${id}-tpusht`) + drawn(`#${id}-taloha`) + drawn(`#${id}-lr`)
    + hold(`#${id}-acc`, 0) + hold(`#${id}-fill`, 1) + hold(`#${id}-lrl`, 0);
  return { html, js };
};
