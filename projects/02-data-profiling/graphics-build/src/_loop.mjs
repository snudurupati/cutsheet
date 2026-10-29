// The hypothesis loop (BUILDER-BRIEF "The hypothesis loop"): shared by g07 (planted, full size) and its
// returns g13, g14 (60% scale). Four nodes clockwise from the top: OBSERVE, HUNCH, TEST, DATA ANSWERS.
// Ring radius 120, nodes 15px circles with a 3.5px dim ring, filled fg when lit, accent when current.
// A dot travels the ring, one lap per 4s. Everything here is scaled by `s`.
import { C, panelClass, fg, dim } from "../lib.mjs";
import { f3 } from "../common.mjs";

export const LOOP_LABELS = ["Observe", "Hunch", "Test", "Data answers"];
export const ringGeom = (cx, cy, s = 1) => {
  const R = 120 * s, r = 15 * s;
  const node = i => [[cx, cy - R], [cx + R, cy], [cx, cy + R], [cx - R, cy]][i];
  return { cx, cy, R, r, s, node };
};

// a short trail behind the travelling dot (it travels clockwise): a 28-degree arc fading toward its tail,
// so the dot reads as moving on the ring rather than a stray speck (demo review 2026-10-28)
const trail = (g, F) => { const { cx, cy, R } = g, pt = th => [cx + R * Math.sin(th), cy - R * Math.cos(th)];
  return [[-30, -17, 0.3], [-17, -6, 0.6]].map(([a, b, o]) => { const [x0, y0] = pt(a * Math.PI / 180), [x1, y1] = pt(b * Math.PI / 180);
    return `<path d="M${f3(x0)},${f3(y0)} A${f3(R)},${f3(R)} 0 0 1 ${f3(x1)},${f3(y1)}" fill="none" stroke="${F}" stroke-width="${f3(Math.max(4, 5 * g.s))}" stroke-linecap="round" opacity="${o}"/>`; }).join(""); };

// SVG markup of the ring (ghost placeholder, drawn ring, travelling dot, four nodes). Card-local coords.
export const ringSVG = (id, g, PID) => {
  const F = fg(PID), M = dim(PID), paper = panelClass(PID) === "opaque" ? C.ink : C.bg;
  const { cx, cy, R, r, s } = g, sw = Math.max(2.5, 3.5 * s);
  const d = `M${f3(cx)},${f3(cy - R)} A${f3(R)},${f3(R)} 0 1 1 ${f3(cx)},${f3(cy + R)} A${f3(R)},${f3(R)} 0 1 1 ${f3(cx)},${f3(cy - R)}`;
  const nodes = [0, 1, 2, 3].map(i => { const [x, y] = g.node(i);
    return `<g id="${id}-n${i}" opacity="0"><circle cx="${f3(x)}" cy="${f3(y)}" r="${f3(r)}" fill="${paper}" stroke="${M}" stroke-width="${f3(sw)}"/>
      <circle id="${id}-nf${i}" cx="${f3(x)}" cy="${f3(y)}" r="${f3(r)}" fill="${F}" opacity="0"/>
      <circle id="${id}-na${i}" cx="${f3(x)}" cy="${f3(y)}" r="${f3(r)}" fill="${C.accent}" opacity="0"/></g>`; }).join("");
  return `<svg id="${id}-ringsvg" style="position:absolute;left:0;top:0;overflow:visible" width="10" height="10">
    <circle id="${id}-ghost" cx="${f3(cx)}" cy="${f3(cy)}" r="${f3(R)}" fill="none" stroke="${M}" stroke-width="2" stroke-dasharray="5 9" opacity="0"/>
    <path id="${id}-ring" class="dr" pathLength="1" d="${d}" fill="none" stroke="${M}" stroke-width="${f3(sw)}" stroke-linecap="round"/>
    <g id="${id}-dotg" opacity="0">${trail(g, F)}<circle cx="${f3(cx)}" cy="${f3(cy - R)}" r="${f3(Math.max(5, 6 * s))}" fill="${F}"/></g>
    ${nodes}</svg>`;
};

// a node pops in (unlit), on svgOrigin so the scale is about its own centre
export const nodeIn = (id, g, i, t) => { const [x, y] = g.node(i);
  return `tl.fromTo("#${id}-n${i}",{opacity:0,scale:0.5,svgOrigin:"${f3(x)} ${f3(y)}"},{opacity:1,scale:1,svgOrigin:"${f3(x)} ${f3(y)}",duration:0.35,ease:"back.out(2)"},${f3(t)});\n`; };
// lit states: accent (current), fg (visited), each an opacity change of its own fill disc
const op = (sel, a, b, t, d = 0.3) => `tl.fromTo("${sel}",{opacity:${a}},{opacity:${b},duration:${d},ease:"power2.out",immediateRender:false},${f3(t)});\n`;
export const accentOn = (id, i, t) => op(`#${id}-na${i}`, 0, 1, t);
export const toFg = (id, i, t) => op(`#${id}-na${i}`, 1, 0, t) + op(`#${id}-nf${i}`, 0, 1, t);
// accent off, back to the unlit muted ring (the loop anatomy: only the current node is filled)
export const accentOff = (id, i, t) => op(`#${id}-na${i}`, 1, 0, t);
export const fgOn = (id, i, t) => op(`#${id}-nf${i}`, 0, 1, t);
// state held from frame 0 (a return shows the loop as it was left)
export const holdOn = (sel) => `tl.fromTo("${sel}",{opacity:1},{opacity:1,duration:0.2,immediateRender:true},0);\n`;
// the travelling dot, one lap per 4s from t0 to t1
export const dotRun = (id, g, t0, t1, lap = 4) => {
  const n = Math.max(1, Math.ceil((t1 - t0) / lap)), o = `${f3(g.cx)} ${f3(g.cy)}`;
  return `tl.fromTo("#${id}-dotg",{opacity:0},{opacity:1,duration:0.3,ease:"power2.out"},${f3(t0)});\n`
    + `tl.fromTo("#${id}-dotg",{rotation:0,svgOrigin:"${o}"},{rotation:360,svgOrigin:"${o}",duration:${lap},ease:"none",repeat:${n - 1},immediateRender:false},${f3(t0)});\n`;
};
// The dot travels ONLY on cues (round 3 review: a nonstop orbit read as a loading spinner). It rests
// hidden under a node (the node disc covers it) and appears only while it moves between nodes:
// clockwise from node a to node b (b < a wraps), or counter-clockwise when ccw is set.
export const dotMove = (id, g, a, b, t, ccw = false) => {
  const r0 = 90 * a; let r1 = 90 * b;
  if (!ccw && r1 <= r0) r1 += 360;
  if (ccw && r1 >= r0) r1 -= 360;
  const d = 0.35 + 0.0025 * Math.abs(r1 - r0), o = `${f3(g.cx)} ${f3(g.cy)}`;
  return `tl.fromTo("#${id}-dotg",{opacity:0},{opacity:1,duration:0.15,ease:"power1.out",immediateRender:false},${f3(t)});\n`
    + `tl.fromTo("#${id}-dotg",{rotation:${r0},svgOrigin:"${o}"},{rotation:${r1},svgOrigin:"${o}",duration:${f3(d)},ease:"power2.inOut",immediateRender:false},${f3(t)});\n`
    + `tl.fromTo("#${id}-dotg",{opacity:1},{opacity:0,duration:0.2,ease:"power1.in",immediateRender:false},${f3(t + d - 0.1)});\n`;
};
