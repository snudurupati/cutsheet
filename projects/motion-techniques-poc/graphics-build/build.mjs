// motion-techniques-poc graphics build: the NEW parts (d1, m2, s1, l1) and the running headline rail
// (r<host>). Reused parts are copied unchanged by reuse_parts.py, never rebuilt here.
//
// Round 2 (2026-10-25), after the composition review and the human's four decisions: the opening is
// restored as shipped, so the map's first visit is m2; the rail is trimmed to the new graphics, one
// line per section, lit in $ink; the face badge is a drawn "you" pin; l1 enters on "the data is".
//
// The seven reference techniques, by part:
//   1 running headline ............ RAIL below, one part per new card (track "rail")
//   2 one recurring shape ......... the MOTIF: a stream line with ticks or dots (d1, m2, s1, l1)
//   3 a map revisited ............. MAP: m2 builds it, s1 returns to it with changed state
//   4 lens instead of a cut ....... m2: ROBOTICS opens into a lens, tied to its node by a leader
//   5 counting with dots .......... d1, with a "1 dot = 100" key
//   6 the speaker on the data ..... s1: a drawn "you" pin (the face is always on screen in this room)
//   7 cards that build in steps ... m2: one chip per cue into a container that fills
//
// Same contract as 01-robotics-as-de's build.mjs (graphics skill, part C): one paused timeline per
// part registered on window.__timelines[id]; absolute seconds; every entrance a fromTo; no random
// (seeded at build time); no timers; clip-path wipes, never blur; visibility by opacity tween;
// svgOrigin for SVG rotation. Every span from cutsheet.json, every cue from the cut transcript.
//
// Geometry: the measured clear wall (zones-a.json): x 0-540 full height, x 540-780 above y 660.
// Cards sit at x 48 with width 700 and end above y 660; the rail pill sits above them at y 16.
import { C, emit, frames, cueIn, panelClass, wipeUp, wipeDown, exitAt, struck, strikeIn,
         assertClear } from "./lib.mjs";
import { readFileSync } from "node:fs";

const ONLY = process.argv[2] || "";
const want = id => !ONLY || ONLY.split(",").includes(id);
const dur = id => frames(id) / 30;
const f3 = v => (+v).toFixed(3);

// ------------------------------------------------------------- helpers (from 01's build.mjs)
const drawAll = (sel, t, d = 0.4) =>
  `tl.fromTo(${JSON.stringify(sel)},{strokeDashoffset:1},{strokeDashoffset:0,duration:${d},ease:"power2.out"},${f3(t)});\n`;
const show = (sel, t, d = 0.3, from = "", to = "") =>
  `tl.fromTo(${JSON.stringify(sel)},{opacity:0${from ? "," + from : ""}},{opacity:1${to ? "," + to : ""},duration:${d},ease:"power2.out"},${f3(t)});\n`;
const hide = (sel, t, d = 0.3) =>
  `tl.fromTo(${JSON.stringify(sel)},{opacity:1},{opacity:0,duration:${d},immediateRender:false},${f3(t)});\n`;
const fade = (sel, a, b, t, d = 0.4) =>
  `tl.fromTo(${JSON.stringify(sel)},{opacity:${a}},{opacity:${b},duration:${d},ease:"power1.inOut",immediateRender:false},${f3(t)});\n`;
const rowUp = (sel, t, d = 0.35) =>
  `tl.fromTo(${JSON.stringify(sel)},{opacity:0,y:14},{opacity:1,y:0,duration:${d},ease:"power3.out"},${f3(t)});\n`;
const pop = (sel, t, d = 0.35) =>
  `tl.fromTo(${JSON.stringify(sel)},{opacity:0,scale:0.6,transformOrigin:"50% 50%"},{opacity:1,scale:1,transformOrigin:"50% 50%",duration:${d},ease:"back.out(2)"},${f3(t)});\n`;
const pulse = (sel, t, s = 1.3, d = 0.25) =>
  `tl.fromTo(${JSON.stringify(sel)},{scale:1,transformOrigin:"50% 50%"},{scale:${s},transformOrigin:"50% 50%",duration:${d},yoyo:true,repeat:1,ease:"sine.inOut",immediateRender:false},${f3(t)});\n`;
const countUp = (sel, from, to, t0, d0, dec = 0, prefix = "", suffix = "") => `
(function(){ const el=document.querySelector(${JSON.stringify(sel)}); const o={v:${from}};
  const f=v=>${JSON.stringify(prefix)}+v.toFixed(${dec}).replace(/\\B(?=(\\d{3})+(?!\\d))/g,",")+${JSON.stringify(suffix)};
  el.textContent=f(${from});
  tl.fromTo(o,{v:${from}},{v:${to},duration:${d0},ease:"power2.out",immediateRender:false,onUpdate:()=>{el.textContent=f(o.v);}},${f3(t0)});
})();`;
// one looping linear tween, seek-safe; ends on a whole period so a pattern rests in phase.
// Tick tracks move by x, not dash offset: HyperFrames' seek sweep reads geometry, not paint.
const loop = (sel, prop, from, to, t0, t1, period) => {
  const n = Math.max(1, Math.floor((t1 - t0) / period));
  return `tl.fromTo(${JSON.stringify(sel)},{${prop}:${from}},{${prop}:${to},duration:${f3(period)},ease:"none",repeat:${n - 1},immediateRender:false},${f3(t0)});\n`;
};
const card = (id, x, y, w, h, inner, extra = "") =>
  `<div id="${id}" class="${panelClass(id.split("-")[0])}" style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;${extra}">${inner}</div>`;
const T = (txt, x, y, size, opts = {}) => {
  const { w = null, weight = 700, color = "currentColor", id = "", align = "left", lh = 1.12, ls = 0, upper = false, style = "" } = opts;
  return `<div ${id ? `id="${id}"` : ""} style="position:absolute;left:${x}px;top:${y}px;${w ? `width:${w}px;` : "white-space:nowrap;"}font-family:Satoshi,sans-serif;font-variation-settings:'wght' ${weight};font-size:${size}px;line-height:${lh};color:${color};text-align:${align};letter-spacing:${ls}em;${upper ? "text-transform:uppercase;" : ""}${style}">${txt}</div>`;
};
// The centring transform lives on a WRAPPER; the id (the thing GSAP tweens) is on the inner element.
// A CSS transform and a GSAP tween on the same element is the gsap_css_transform_conflict bug.
const Tc = (txt, cx, y, size, opts = {}) => `<div style="position:absolute;left:${cx}px;top:${y}px;transform:translateX(-50%)">${T(txt, 0, 0, size, { ...opts, style: (opts.style || "") + "position:relative;" })}</div>`;
const Tr = (txt, rx, y, size, opts = {}) => `<div style="position:absolute;left:${rx}px;top:${y}px;transform:translateX(-100%)">${T(txt, 0, 0, size, { ...opts, style: (opts.style || "") + "position:relative;" })}</div>`;
const pill = (id, txt, x, y, { fill = C.ink, color = C.bg, size = 20, border = null, centre = true, hidden = true, ls = 0.16 } = {}) =>
  `<div style="position:absolute;left:${x}px;top:${y}px;${centre ? "transform:translateX(-50%);" : ""}"><div id="${id}" style="position:relative;padding:4px 14px;border-radius:999px;background:${fill};${border ? `border:2.5px solid ${border};` : ""}font-family:SatoshiBold,Satoshi;font-weight:700;font-size:${size}px;letter-spacing:${ls}em;text-transform:uppercase;color:${color};white-space:nowrap;${hidden ? "opacity:0;" : ""}">${txt}</div></div>`;
const prng = seed => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };

// The plan's MAIN track decides hand-offs (the rail and push tracks overlap it by design).
const PLAN = JSON.parse(readFileSync("cutsheet.json", "utf8")).parts;
const MAIN = PLAN.filter(p => p.track === "main").sort((a, b) => a.start - b.start);
// Reused parts whose card enters well after their window opens: abutting one is not a hand-off, so
// the part before it still exits (technical review 2026-10-25: s1 vanished, then 1.2s of nothing).
const LATE_ENTRY = new Set(["g11"]);
const abutsNext = id => { const i = MAIN.findIndex(p => p.id === id), nx = MAIN[i + 1];
  return !!(nx && Math.abs(nx.start - MAIN[i].end) < 0.02 && !LATE_ENTRY.has(nx.id)); };
const exitIfFree = (id, D, sels, host = id) => abutsNext(host) ? ""
  : sels.map(sel => wipeDown(sel, exitAt(D, 0.3), 0.3)).join("\n") + "\n";

// ================================================================== the MAP (technique 3)
// Card-local coordinates inside the card's padding box (700x540 card, 6px border: 688x528).
const MAPCARD = { x: 48, y: 96, w: 700, h: 540 };
const N = { ent: [210, 330], web: [400, 150], iot: [400, 455], rob: [600, 330] };
const LABEL = { ent: "Enterprise", web: "Web text", iot: "Industrial IoT", rob: "Robotics" };
const EDGES = { ew: ["ent", "web"], ei: ["ent", "iot"], wr: ["web", "rob"], ir: ["iot", "rob"], er: ["ent", "rob"] };
const NODE_R = 15, TRIM = 22;                                  // edges stop short of the nodes
const mid = e => { const [a, b] = EDGES[e].map(k => N[k]); return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
const ends = e => { const [[x1, y1], [x2, y2]] = EDGES[e].map(k => N[k]); const L = Math.hypot(x2 - x1, y2 - y1);
  const ux = (x2 - x1) / L, uy = (y2 - y1) / L;
  return [[x1 + ux * TRIM, y1 + uy * TRIM], [x2 - ux * TRIM, y2 - uy * TRIM]]; };

// the motif on an edge: a line plus three dots that travel it (motifRun)
const edgeSVG = (id, e, { dashed = false, color = C.rule } = {}) => {
  const [[x1, y1], [x2, y2]] = ends(e);
  return `<g id="${id}-e${e}" opacity="0"><line x1="${f3(x1)}" y1="${f3(y1)}" x2="${f3(x2)}" y2="${f3(y2)}" stroke="${color}" stroke-width="3" ${dashed ? `stroke-dasharray="8 9"` : ""} stroke-linecap="round"/>
    ${[0, 1, 2].map(k => `<circle id="${id}-d${e}${k}" cx="${f3(x1)}" cy="${f3(y1)}" r="5" fill="${C.muted}" opacity="0"/>`).join("")}</g>`;
};
const motifRun = (id, e, t0, t1, period = 2.4) => {
  const [[x1, y1], [x2, y2]] = ends(e);
  return [0, 1, 2].map(k => { const s = t0 + k * period / 3;
    return show(`#${id}-d${e}${k}`, s, 0.2) + `tl.fromTo("#${id}-d${e}${k}",{attr:{cx:${f3(x1)},cy:${f3(y1)}}},{attr:{cx:${f3(x2)},cy:${f3(y2)}},duration:${period},ease:"none",repeat:${Math.max(0, Math.floor((t1 - s) / period) - 1)},immediateRender:false},${f3(s)});\n`; }).join("");
};
const nodeSVG = (id, k, fill = k === "rob" ? C.accent : C.ink) => { const [x, y] = N[k];
  return `<g id="${id}-n${k}" opacity="0"><circle cx="${x}" cy="${y}" r="${NODE_R}" fill="${C.bg}" stroke="${C.muted}" stroke-width="3.5"/>
    <circle id="${id}-nf${k}" cx="${x}" cy="${y}" r="${NODE_R}" fill="${fill}" opacity="0"/></g>`; };
// Labels sit on a paper backing so an edge or a travelling dot passes BEHIND them (composition
// review 2026-10-25: edges ended inside "ENTERPRISE", dots sat on the letters). ENTERPRISE sits
// left of its node, WEB TEXT above it, the other two below: each clear of the edges into its node.
const LBL_STYLE = `background:${C.bg};padding:3px 12px;border-radius:8px;`;
const nodeLabel = (id, k, lit = true) => { const [x, y] = N[k];
  const o = { weight: 700, color: lit ? C.ink : C.muted, upper: true, ls: 0.14, id: `${id}-l${k}`, style: LBL_STYLE + "opacity:0;" };
  if (k === "ent") return Tr(LABEL[k], x - NODE_R - 10, y - 17, 22, o);
  if (k === "web") return Tc(LABEL[k], x, y - NODE_R - 44, 22, o);
  return Tc(LABEL[k], x, y + NODE_R + 10, 22, o); };
const ne = (id, e) => { const [x, y] = mid(e);
  return `<div id="${id}-ne${e}" style="position:absolute;left:${x - 19}px;top:${y - 19}px;width:38px;height:38px;border-radius:50%;background:${C.bg};border:2.5px solid ${C.ink};font-family:Satoshi;font-variation-settings:'wght' 900;font-size:26px;line-height:33px;text-align:center;color:${C.ink};opacity:0">≠</div>`; };
const nodeIn = (id, k, t) => pop(`#${id}-n${k}`, t) + fade(`#${id}-nf${k}`, 0, 1, t, 0.3) + rowUp(`#${id}-l${k}`, t + 0.1);
const nodeOn = (id, k) => `tl.fromTo("#${id}-n${k},#${id}-nf${k},#${id}-l${k}",{opacity:1},{opacity:1,duration:0.2,immediateRender:true},0);\n`;

// geometry guard: the labels the map declares must never touch (graphics skill, habit 2)
assertClear("map", [
  { t: "Enterprise", x0: N.ent[0] - NODE_R - 10 - 170, x1: N.ent[0] - NODE_R - 10, y0: N.ent[1] - 17, y1: N.ent[1] + 15 },
  { t: "Web text", x0: N.web[0] - 70, x1: N.web[0] + 70, y0: N.web[1] - NODE_R - 44, y1: N.web[1] - NODE_R - 12 },
  { t: "Industrial IoT", x0: N.iot[0] - 115, x1: N.iot[0] + 115, y0: N.iot[1] + NODE_R + 10, y1: N.iot[1] + NODE_R + 42 },
  { t: "Robotics", x0: N.rob[0] - 75, x1: N.rob[0] + 75, y0: N.rob[1] + NODE_R + 10, y1: N.rob[1] + NODE_R + 42 },
]);

// ------------------------------------------------- the moment's five streams (m2 and l1)
const STREAMS = ["wrist cam", "front cam", "joints", "commands", "timestamp"];
const RATE = [0.55, 0.62, 0.38, 0.47, 0.71];
const TICK = 30;
const streamRow = (id, k, x, y, labelW, trackW, size = 20) => `
  <div id="${id}-r${k}" style="position:absolute;left:${x}px;top:${y}px;width:${labelW + trackW}px;height:28px;opacity:0">
    ${T(STREAMS[k], 0, 2, size, { weight: 700, color: C.ink })}
    <svg id="${id}-sv${k}" style="position:absolute;left:${labelW}px;top:0;overflow:hidden" width="${trackW}" height="28">
      <line id="${id}-tk${k}" x1="${-TICK * 2}" y1="14" x2="${trackW + TICK * 4}" y2="14" stroke="${C.ink}" stroke-width="18" stroke-dasharray="4 ${TICK - 4}"/>
      <line id="${id}-tf${k}" x1="${-TICK * 2}" y1="14" x2="${trackW + TICK * 4}" y2="14" stroke="${C.ink}" stroke-width="18" stroke-dasharray="4 ${2 * TICK - 4}" opacity="0"/>
    </svg></div>`;
const tile = (id, x, y, w = 90, h = 56, hidden = true) => `<div id="${id}" style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;border:3px solid ${C.ink};border-radius:6px;${hidden ? "opacity:0;" : ""}">
  <svg width="${w - 6}" height="${h - 6}" viewBox="0 0 94 58" preserveAspectRatio="none"><path d="M12,46 L36,20 L52,36 L64,26 L84,46 Z" fill="none" stroke="${C.ink}" stroke-width="3" stroke-linejoin="round"/></svg></div>`;

// ------------------------------- m2: the map's first visit, a lens opens, a card builds
if (want("m2")) {
  const id = "m2", D = dur(id);
  const tRb = cueIn(id, "robotics"), tEn = cueIn(id, "enterprise"), tWe = cueIn(id, "web"), tIo = cueIn(id, "industrial"),
        tPh = cueIn(id, "physical"), tSi = cueIn(id, "single"), tCa = cueIn(id, "camera"), tJo = cueIn(id, "joints"),
        tCo = cueIn(id, "commands"), tTs = cueIn(id, "timestamp"), tSe = cueIn(id, "sensors"), tDn = cueIn(id, "downsampling"),
        tLk = cueIn(id, "streams"), tDr = cueIn(id, "drift"), tCr = cueIn(id, "crashes"), tFr = cueIn(id, "frontier");
  // The lens, about 15% smaller than round 1 and placed so ENTERPRISE, IoT and ROBOTICS (with their
  // labels) all stay readable around it; a leader ties it to the node it grew out of.
  const L = { cx: 400, cy: 240, d: 330 }, Li = L.d / 2 - 6, R = L.d / 2;
  const ux = (N.rob[0] - L.cx), uy = (N.rob[1] - L.cy), ul = Math.hypot(ux, uy);
  const rim = [L.cx + ux / ul * R, L.cy + uy / ul * R], nodeEdge = [N.rob[0] - ux / ul * (NODE_R + 4), N.rob[1] - uy / ul * (NODE_R + 4)];
  const CHIPS = [["camera frames", tCa], ["joints", tJo], ["commands", tCo], ["timestamp", tTs]];
  const chipY = k => 120 + k * 40, BOX = { x: Li - 100, y: 112, w: 200, h: 4 * 40 + 8 };
  const ROWY = k => 112 + k * 30, LBLW = 108, TRKW = 142, ROWX = Li - 125;
  const guides = [...Array(Math.ceil(TRKW / TICK) + 5).keys()].map(i => `<line x1="${2 + i * TICK}" y1="0" x2="${2 + i * TICK}" y2="${ROWY(4) + 34 - ROWY(0) + 8}" stroke="${C.muted}" stroke-width="2" stroke-dasharray="4 6"/>`).join("");
  const lens = `<div id="${id}-lens" style="position:absolute;left:${L.cx - R}px;top:${L.cy - R}px;width:${L.d}px;height:${L.d}px;border-radius:50%;overflow:hidden;background:${C.bg};border:6px solid #FFFFFF;box-shadow:0 16px 52px rgba(0,0,0,.38);opacity:0">
      <svg style="position:absolute;left:0;top:0;overflow:visible" width="${2 * Li}" height="${2 * Li}">
        <circle id="${id}-ring" cx="${Li}" cy="${Li}" r="${Li - 9}" fill="none" stroke="${C.rule}" stroke-width="2.5" stroke-dasharray="3 11"/></svg>
      <svg id="${id}-gw" style="position:absolute;left:${ROWX + LBLW}px;top:${ROWY(0) - 4}px;overflow:hidden;opacity:0" width="${TRKW}" height="${ROWY(4) - ROWY(0) + 40}"><g id="${id}-gd">${guides}</g></svg>
      <div id="${id}-box" style="position:absolute;left:${BOX.x}px;top:${BOX.y}px;width:${BOX.w}px;height:${BOX.h}px;border:2.5px solid ${C.rule};border-radius:14px;opacity:0"></div>
      ${tile(`${id}-tile`, Li - 45, 22)}
      ${Tc("t = 12.400 s", Li, 82, 20, { weight: 700, color: C.muted, id: `${id}-t`, style: "opacity:0;" })}
      ${CHIPS.map(([s], k) => pill(`${id}-ch${k}`, s, Li, chipY(k), { size: 20, ls: 0.06 })).join("")}
      <div id="${id}-rows" style="position:absolute;inset:0;opacity:0">${STREAMS.map((_, k) => streamRow(id, k, ROWX, ROWY(k), LBLW, TRKW, 20)).join("")}</div>
      <div style="position:absolute;left:${Li}px;top:${ROWY(4) + 34}px;transform:translateX(-50%)"><div id="${id}-ok" style="position:relative;display:flex;align-items:center;gap:8px;padding:2px 12px;border:2px solid ${C.rule};border-radius:999px;background:${C.bg};opacity:0">
        <span style="font-family:SatoshiBold,Satoshi;font-weight:700;font-size:20px;color:${C.muted};white-space:nowrap">no errors</span></div></div>
    </div>`;
  const body = card(`${id}-c`, MAPCARD.x, MAPCARD.y, MAPCARD.w, MAPCARD.h, `
    <div id="${id}-map" style="position:absolute;inset:0">
      <svg style="position:absolute;left:0;top:0;overflow:visible" width="688" height="528">
        ${edgeSVG(id, "ew")}${edgeSVG(id, "ei")}${edgeSVG(id, "wr", { dashed: true })}${edgeSVG(id, "ir", { dashed: true })}${edgeSVG(id, "er", { dashed: true })}
        ${["ent", "web", "iot"].map(k => `<circle id="${id}-gh${k}" cx="${N[k][0]}" cy="${N[k][1]}" r="${NODE_R}" fill="none" stroke="${C.rule}" stroke-width="3" stroke-dasharray="5 5" opacity="0"/>`).join("")}
        ${["ent", "web", "iot", "rob"].map(k => nodeSVG(id, k)).join("")}
        <circle id="${id}-halo" cx="${N.rob[0]}" cy="${N.rob[1]}" r="20" fill="none" stroke="${C.accent}" stroke-width="3" opacity="0"/>
      </svg>
      ${["ent", "web", "iot", "rob"].map(k => nodeLabel(id, k)).join("")}
      ${ne(id, "er")}${ne(id, "wr")}${ne(id, "ir")}
    </div>
    <svg style="position:absolute;left:0;top:0;overflow:visible" width="688" height="528"><line id="${id}-lead" x1="${f3(nodeEdge[0])}" y1="${f3(nodeEdge[1])}" x2="${f3(rim[0])}" y2="${f3(rim[1])}" stroke="${C.ink}" stroke-width="3" stroke-linecap="round" opacity="0"/></svg>
    ${lens}`);
  let js = wipeUp(`#${id}-c`, 0) + "\n";
  // the map builds: ROBOTICS on "robotics", then each field it is NOT like, with a "not equal" tag
  js += ["ent", "web", "iot"].map((k, i) => show(`#${id}-gh${k}`, 0.3 + i * 0.1, 0.4)).join("");   // the map is there from frame 1, unlit
  js += nodeIn(id, "rob", Math.max(0.15, tRb));
  js += `tl.fromTo("#${id}-halo",{opacity:0.9,attr:{r:16}},{opacity:0,attr:{r:40},duration:1.4,ease:"power1.out",repeat:${Math.floor((tEn - tRb - 0.5) / 1.4) - 1},immediateRender:false},${f3(tRb + 0.5)});\n`;
  js += nodeIn(id, "ent", tEn) + show(`#${id}-eer`, tEn + 0.2, 0.4) + pop(`#${id}-neer`, tEn + 0.4);
  js += nodeIn(id, "web", tWe) + show(`#${id}-eew`, tWe + 0.1, 0.4) + show(`#${id}-ewr`, tWe + 0.2, 0.4) + pop(`#${id}-newr`, tWe + 0.4);
  js += nodeIn(id, "iot", tIo) + show(`#${id}-eei`, tIo + 0.1, 0.4) + show(`#${id}-eir`, tIo + 0.2, 0.4) + pop(`#${id}-neir`, tIo + 0.4);
  js += motifRun(id, "ew", tWe + 0.4, tPh) + motifRun(id, "ei", tIo + 0.4, tPh);
  // "Physical telemetry": ROBOTICS opens into the lens; the map stays, dimmed, around it
  const dx = N.rob[0] - L.cx, dy = N.rob[1] - L.cy;
  js += pulse(`#${id}-nrob`, tPh - 0.55, 1.5, 0.2);
  js += `tl.fromTo("#${id}-lens",{opacity:0,x:${dx},y:${dy},scale:0.08,transformOrigin:"50% 50%"},{opacity:1,x:0,y:0,scale:1,transformOrigin:"50% 50%",duration:0.8,ease:"power3.inOut"},${f3(tPh - 0.3)});\n`;   // visibly opening on the word (QA: started 0.4s late)
  js += show(`#${id}-lead`, tPh + 0.7, 0.3);
  js += fade(`#${id}-map`, 1, 0.45, tPh, 0.6) + hide(`#${id}-lweb`, tPh, 0.3) + hide(`#${id}-neer`, tPh - 0.3, 0.3) + hide(`#${id}-newr`, tPh - 0.3, 0.3) + hide(`#${id}-neir`, tPh - 0.3, 0.3);
  js += `tl.fromTo("#${id}-ring",{rotation:0,svgOrigin:"${Li} ${Li}"},{rotation:90,svgOrigin:"${Li} ${Li}",duration:${f3(tFr - tPh)},ease:"none",immediateRender:false},${f3(tPh)});\n`;
  // the lens opens on "multimodal": the five streams are already running, faint, each at its own rate
  js += fade(`#${id}-rows`, 0, 0.3, tPh + 0.5, 0.5) + STREAMS.map((_, k) => `tl.fromTo("#${id}-r${k}",{opacity:1},{opacity:1,duration:0.2,immediateRender:true},0);\n`).join("");
  js += STREAMS.map((_, k) => loop(`#${id}-tk${k}`, "x", 0, -TICK, tPh + 0.5, k < 2 ? tDn : tLk, RATE[k])).join("");
  // the card builds (technique 7): the moment, then one part per cue into a container that fills
  js += fade(`#${id}-rows`, 0.3, 0, tCa - 0.2, 0.5);
  js += pop(`#${id}-tile`, tSi) + show(`#${id}-t`, tSi + 0.35);
  js += `tl.fromTo("#${id}-box",{opacity:0,clipPath:"inset(0 0 100% 0)"},{opacity:1,clipPath:"inset(0 0 100% 0)",duration:0.2,immediateRender:true},${f3(tCa - 0.25)});\n`;
  CHIPS.forEach(([, t], k) => {
    const from = k ? (chipY(k - 1) + 38 - BOX.y) / BOX.h * 100 : 0, to = (chipY(k) + 38 - BOX.y) / BOX.h * 100;
    // no overshoot: the chips sit 5px apart and a back.out pop touched the one above (DOM check)
    js += `tl.fromTo("#${id}-ch${k}",{opacity:0,scale:0.7,transformOrigin:"50% 50%"},{opacity:1,scale:1,transformOrigin:"50% 50%",duration:0.3,ease:"power3.out"},${f3(t)});\n`;
    js += `tl.fromTo("#${id}-box",{clipPath:"inset(0 0 ${f3(100 - from)}% 0)"},{clipPath:"inset(0 0 ${f3(Math.max(0, 100 - to))}% 0)",duration:0.3,ease:"power2.out",immediateRender:false},${f3(t - 0.05)});\n`;
  });
  // "sensors": the chips unspool into the five streams, now at full strength
  js += CHIPS.map((_, k) => hide(`#${id}-ch${k}`, tSe - 0.1, 0.25)).join("") + hide(`#${id}-box`, tSe - 0.1, 0.25);
  js += fade(`#${id}-rows`, 0, 1, tSe, 0.4);
  js += [0, 1].map(k => hide(`#${id}-tk${k}`, tDn, 0.35) + show(`#${id}-tf${k}`, tDn, 0.35) + loop(`#${id}-tf${k}`, "x", 0, -2 * TICK, tDn, tLk, RATE[k] * 2)).join("");
  // "streams": all five lock to one rate and keep scrolling, with the guides, to the lens close
  const P = 1.0, tGo = tLk + 0.05;
  js += show(`#${id}-gw`, tLk, 0.3) + loop(`#${id}-gd`, "x", 0, -2 * TICK, tGo, tFr, P);
  js += STREAMS.map((_, k) => loop(`#${id}-tk${k}`, "x", 0, -2 * TICK, tGo, tFr, P)).join("")
      + [0, 1].map(k => loop(`#${id}-tf${k}`, "x", 0, -2 * TICK, tGo, tFr, P)).join("");
  // "drift": only the joints row slips half a tick, and it is the one accent in the lens
  js += `tl.fromTo("#${id}-sv2",{x:0},{x:${TICK / 2},duration:0.35,ease:"power2.inOut",immediateRender:false},${f3(tDr)});\n`;
  js += `tl.fromTo("#${id}-tk2",{stroke:"${C.ink}"},{stroke:"${C.accent}",duration:0.3,immediateRender:false},${f3(tDr)});\n`;
  js += pop(`#${id}-ok`, tCr);
  // "frontier": the lens closes back into ROBOTICS and the map returns
  js += hide(`#${id}-lead`, tFr - 0.1, 0.2);
  // the lens contents fade as it starts to close, so nothing reads at a squashed size
  js += [`#${id}-rows`, `#${id}-gw`, `#${id}-ok`, `#${id}-tile`, `#${id}-t`].map(s => hide(s, tFr - 0.05, 0.2)).join("");
  js += `tl.fromTo("#${id}-lens",{opacity:1,x:0,y:0,scale:1,transformOrigin:"50% 50%"},{opacity:0,x:${dx},y:${dy},scale:0.08,transformOrigin:"50% 50%",duration:1.0,ease:"sine.inOut",immediateRender:false},${f3(tFr)});\n`;
  js += fade(`#${id}-map`, 0.45, 1, tFr + 0.1, 0.8) + fade(`#${id}-lweb`, 0, 1, tFr + 0.45, 0.3)
      + fade(`#${id}-neer`, 0, 1, tFr + 0.6, 0.3) + fade(`#${id}-newr`, 0, 1, tFr + 0.6, 0.3) + fade(`#${id}-neir`, 0, 1, tFr + 0.6, 0.3) + pulse(`#${id}-nrob`, tFr + 0.6, 1.35);
  js += ["ew", "ei"].map((e, i) => motifRun(id, e, tFr + 0.4 + i * 0.3, D)).join("");
  js += exitIfFree(id, D, [`#${id}-c`]);
  emit(id, D, body, js);
}

// ---------------------------------------------- s1: the map's second visit, with "you" on it
if (want("s1")) {
  const id = "s1", D = dur(id);
  const t13 = cueIn(id, "13"), tNo = cueIn(id, "not"), tRb = cueIn(id, "not a robot", "end"), tEg = cueIn(id, "engine"),
        tBg = cueIn(id, "background"), tEi = cueIn(id, "data engineer");   // travel starts here so the arrival holds ~2s (N1)
  const TOPICS = [["data engineering", cueIn(id, "concepts")], ["modern data stack", cueIn(id, "modern")], ["applied AI", cueIn(id, "applied")]];
  const x0 = N.ent[0] + 70, x1 = N.rob[0] - 40, y = N.ent[1];
  const ticks = [...Array(13).keys()].map(i => x0 + i * (x1 - x0) / 12);
  const SEG = [[0, 4], [4, 8], [8, 12]];
  // the "you" pin: an ink teardrop whose tip sits on (0,0) of its group
  const PIN = `<path d="M0,0 C-4,-10 -15,-20 -15,-31 A15,15 0 1 1 15,-31 C15,-20 4,-10 0,0 Z" fill="${C.ink}"/><circle cx="0" cy="-31" r="5.5" fill="${C.bg}"/>`;
  const pin0 = [N.ent[0], N.ent[1] - NODE_R - 3], pin1 = [ticks[0], y - 10];
  const body = card(`${id}-c`, MAPCARD.x, MAPCARD.y, MAPCARD.w, MAPCARD.h, `
    <svg style="position:absolute;left:0;top:0;overflow:visible" width="688" height="528">
      ${edgeSVG(id, "ew")}${edgeSVG(id, "ei")}${edgeSVG(id, "wr")}${edgeSVG(id, "ir")}
      <line id="${id}-path" class="dr" pathLength="1" x1="${N.ent[0] + TRIM}" y1="${y}" x2="${N.rob[0] - TRIM}" y2="${y}" stroke="${C.ink}" stroke-width="3.5"/>
      ${SEG.map(([a, b], i) => `<line id="${id}-sg${i}" x1="${ticks[a]}" y1="${y}" x2="${ticks[b]}" y2="${y}" stroke="${C.ink}" stroke-width="8" stroke-linecap="round" opacity="0"/>`).join("")}
      ${ticks.map((x, i) => `<circle id="${id}-k${i}" cx="${x}" cy="${y}" r="${i ? 6.5 : 9}" fill="${i ? C.bg : C.accent}" stroke="${i ? C.ink : C.accent}" stroke-width="3" opacity="0"/>`).join("")}
      <circle id="${id}-dot" cx="${x0}" cy="${y}" r="5" fill="${C.muted}" opacity="0"/>
      ${["ent", "web", "iot"].map(k => nodeSVG(id, k)).join("")}${nodeSVG(id, "rob", C.ink)}
      <g id="${id}-pin" opacity="0"><g id="${id}-pinb" transform="translate(${pin0[0]},${pin0[1]})">${PIN}</g></g>
    </svg>
    ${["ent", "web", "iot", "rob"].map(k => nodeLabel(id, k)).join("")}
    ${Tc("week 1", ticks[0], y + 18, 22, { weight: 700, color: C.ink, id: `${id}-w1`, style: LBL_STYLE + "opacity:0;" })}
    ${TOPICS.map(([s], i) => Tc(s, (ticks[SEG[i][0]] + ticks[SEG[i][1]]) / 2, i === 1 ? y - 84 : y - 48, 22, { weight: 700, color: C.muted, id: `${id}-tp${i}`, style: LBL_STYLE + "opacity:0;" })).join("")}
    <div id="${id}-nr" style="position:absolute;left:0;top:0;opacity:0">${Tr(struck(`${id}-st`, "a robot", C.ink, 3), 670, N.rob[1] + 66, 24, { weight: 700, color: C.ink, style: LBL_STYLE })}</div>
    ${Tr("the engine behind it", 670, N.rob[1] + 100, 24, { weight: 900, color: C.ink, id: `${id}-eng`, style: LBL_STYLE + "opacity:0;" })}
    ${Tr("you", pin0[0] - 24, pin0[1] - 50, 24, { weight: 900, color: C.ink, id: `${id}-you`, style: LBL_STYLE + "opacity:0;" })}`);
  let js = wipeUp(`#${id}-c`, 0) + "\n";
  js += ["ew", "ei", "wr", "ir"].map(e => `tl.fromTo("#${id}-e${e}",{opacity:1},{opacity:1,duration:0.2,immediateRender:true},0);\n`).join("");
  js += ["ent", "web", "iot", "rob"].map(k => nodeOn(id, k)).join("");
  js += ["ew", "ei", "wr", "ir"].map((e, i) => motifRun(id, e, 0.4 + i * 0.25, D, e[1] === "r" ? 2.8 : 2.4)).join("");
  // "13 weeks": the motif becomes a path from ENTERPRISE to ROBOTICS with 13 ticks, week 1 lit
  js += drawAll(`#${id}-path`, t13, 1.0) + ticks.map((_, i) => pop(`#${id}-k${i}`, t13 + 0.1 + i * 0.07, 0.25)).join("");
  js += show(`#${id}-w1`, t13 + 1.2);
  js += `tl.fromTo("#${id}-k0",{attr:{r:9}},{attr:{r:12},duration:0.7,yoyo:true,repeat:${Math.floor((D - t13 - 2.0) / 0.7)},ease:"sine.inOut",immediateRender:false},${f3(t13 + 1.6)});\n`;
  js += show(`#${id}-dot`, t13 + 1.4, 0.2) + `tl.fromTo("#${id}-dot",{attr:{cx:${x0}}},{attr:{cx:${x1}},duration:3.4,ease:"none",repeat:${Math.floor((D - t13 - 1.4) / 3.4) - 1},immediateRender:false},${f3(t13 + 1.4)});\n`;
  // "not a robot, but the engine behind it"
  js += rowUp(`#${id}-nr`, tNo - 0.1) + strikeIn(`${id}-st`, tRb - 0.15) + rowUp(`#${id}-eng`, tEg);
  // what the series covers: a stretch of the path lights for each, named on its cue
  TOPICS.forEach(([, t], i) => {
    js += show(`#${id}-sg${i}`, t, 0.35) + rowUp(`#${id}-tp${i}`, t);
    if (i < 2) js += fade(`#${id}-tp${i}`, 1, 0.55, TOPICS[i + 1][1], 0.3) + fade(`#${id}-sg${i}`, 1, 0.5, TOPICS[i + 1][1], 0.3);
  });
  // "no background in robotics": the "you" pin drops onto ENTERPRISE; on "either" it travels onto week 1
  // the topics have had their moment; they clear as the pin heads for week 1 (QA round 3: the pin landed on "data engineering")
  js += TOPICS.map((_, i) => hide(`#${id}-tp${i}`, tEi - 0.3, 0.3)).join("");
  js += `tl.fromTo("#${id}-pin",{opacity:0,y:-40},{opacity:1,y:0,duration:0.45,ease:"bounce.out"},${f3(tBg)});\n` + rowUp(`#${id}-you`, tBg + 0.3);
  js += `tl.fromTo("#${id}-pinb",{attr:{transform:"translate(${pin0[0]},${pin0[1]})"}},{attr:{transform:"translate(${pin1[0]},${pin1[1]})"},duration:0.6,ease:"power2.inOut",immediateRender:false},${f3(tEi)});\n`;
  js += `tl.fromTo("#${id}-you",{x:0,y:0},{x:${pin1[0] - pin0[0]},y:${pin1[1] - pin0[1]},duration:0.6,ease:"power2.inOut",immediateRender:false},${f3(tEi)});\n`;
  js += exitIfFree(id, D, [`#${id}-c`]);
  emit(id, D, body, js);
}

// ---------------------------------------------------------------- d1: counting with dots
if (want("d1")) {
  const id = "d1", D = dur(id);
  const t80 = cueIn(id, "80000"), t11 = cueIn(id, "1100"), t24 = cueIn(id, "2024"), tMi = cueIn(id, "million"),
        tRo = cueIn(id, "robots"), tTe = cueIn(id, "teleoperation"), tFl = cueIn(id, "fleet"), tMd = cueIn(id, "metadata");
  const W = 700, H = 560, COLS = 40, ROWS = 20, P = 15, GX = 40, GY = 196;
  // one dot per 100 datasets: 800 for 80,000. The 11 for 1,100 are a compact block at the top left
  // (4 x 3 less one), so they read as a group, not a line (composition review 2026-10-25).
  const FEW = new Set([...Array(11).keys()].map(i => `${i % 4},${Math.floor(i / 4)}`));
  const dots = few => { let s = ""; for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
    if (FEW.has(`${c},${r}`) !== few) continue; s += `<circle cx="${GX + c * P + 4}" cy="${GY + r * P + 4}" r="4.5"/>`; } return s; };
  const RG = { x: 40, y: 190, p: 20 };
  const robots = [...Array(100).keys()].map(i => `<rect x="${RG.x + (i % 10) * RG.p}" y="${RG.y + Math.floor(i / 10) * RG.p}" width="11" height="11" rx="3"/>`).join("");
  const SX0 = RG.x + 10 * RG.p + 18, SX1 = 660;
  const streams = [...Array(10).keys()].map(r => `<line id="${id}-sl${r}" x1="${SX0 - 40}" y1="${RG.y + r * RG.p + 5.5}" x2="${SX1}" y2="${RG.y + r * RG.p + 5.5}" stroke="${C.ink}" stroke-width="3" stroke-dasharray="3 9" stroke-linecap="round"/>`).join("");
  // teleop logs, fleet telemetry and metadata JOIN the flow as three more labelled streams
  const EXTRA = [["teleop logs", tTe], ["fleet telemetry", tFl], ["metadata", tMd]];
  const EY = k => 444 + k * 29;
  const extra = EXTRA.map(([s], k) => `<div id="${id}-x${k}" style="position:absolute;left:0;top:${EY(k)}px;width:${W}px;height:26px;opacity:0">
      ${T(s, 40, 0, 22, { weight: 700, color: C.ink })}
      <svg style="position:absolute;left:220px;top:0;overflow:hidden" width="${SX1 - 220}" height="26"><line id="${id}-xl${k}" x1="-40" y1="13" x2="${SX1 - 180}" y2="13" stroke="${C.ink}" stroke-width="3" stroke-dasharray="3 9" stroke-linecap="round"/></svg></div>`).join("");
  const body = card(`${id}-c`, 48, 80, W, H, `
    <div id="${id}-A" style="position:absolute;inset:0">
      <div id="${id}-n80" style="position:absolute;left:34px;top:22px;font-family:Satoshi;font-variation-settings:'wght' 900;font-size:120px;line-height:1;color:${C.ink}">0</div>
      ${T("LeRobot datasets on Hugging Face", 40, 150, 26, { weight: 500, color: C.muted })}
      <svg id="${id}-grid" style="position:absolute;left:0;top:0;overflow:visible" width="${W}" height="${H}">
        <g id="${id}-rest" fill="${C.ink}">${dots(false)}</g><g id="${id}-few" fill="${C.ink}">${dots(true)}</g></svg>
      <div id="${id}-sh" style="position:absolute;left:${GX - 60}px;top:${GY - 6}px;width:46px;height:${ROWS * P + 10}px;background:linear-gradient(90deg,${C.bg}00,${C.bg}AA,${C.bg}00);opacity:0"></div>
      <div id="${id}-key" style="position:absolute;left:40px;top:${GY + ROWS * P + 14}px;display:flex;align-items:center;gap:8px;opacity:0">
        <svg width="12" height="12"><circle cx="6" cy="6" r="4.5" fill="${C.ink}"/></svg>${T("= 100 datasets", 0, 0, 24, { weight: 700, color: C.muted, style: "position:relative;" })}</div>
      ${Tr("2024: 1,100", 660, GY + ROWS * P + 12, 26, { weight: 700, color: C.accent, id: `${id}-y24`, style: "opacity:0;" })}
    </div>
    <div id="${id}-B" style="position:absolute;inset:0;opacity:0">
      <div style="position:absolute;left:34px;top:22px;font-family:Satoshi;font-variation-settings:'wght' 900;font-size:110px;line-height:1;color:${C.ink}">1M+</div>
      ${T("trajectories in AgiBot World", 40, 142, 26, { weight: 500, color: C.muted })}
      <svg id="${id}-rob" style="position:absolute;left:0;top:0;overflow:visible;opacity:0" width="${W}" height="${H}"><g fill="${C.ink}">${robots}</g></svg>
      <svg id="${id}-str" style="position:absolute;left:0;top:0;overflow:hidden" width="${W}" height="${H}">${streams}</svg>
      ${T("from over 100 robots", 40, RG.y + 10 * RG.p + 8, 24, { weight: 700, color: C.ink, id: `${id}-rl`, style: "opacity:0;" })}
      ${extra}
    </div>`, "overflow:hidden");
  let js = wipeUp(`#${id}-c`, 0) + "\n";
  js += countUp(`#${id}-n80`, 0, 80000, t80 - 1.3, 1.3);
  js += `tl.fromTo("#${id}-grid",{clipPath:"inset(-10px 100% -10px 0px)"},{clipPath:"inset(-10px 0% -10px 0px)",duration:1.0,ease:"power1.inOut",immediateRender:true},${f3(t80 + 0.1)});\n`;
  js += rowUp(`#${id}-key`, t80 + 0.9);
  // "1,100": all but the eleven fall back; "2024": the rest re-light, so the gap is seen, not stated
  js += fade(`#${id}-rest`, 1, 0.14, t11, 0.4) + `tl.fromTo("#${id}-few",{fill:"${C.ink}"},{fill:"${C.accent}",duration:0.3,immediateRender:false},${f3(t11)});\n`;
  js += rowUp(`#${id}-y24`, t11 + 0.1);
  js += `tl.fromTo("#${id}-few",{scale:1,transformOrigin:"0% 0%"},{scale:1.12,transformOrigin:"0% 0%",duration:0.8,yoyo:true,repeat:${2 * Math.floor((tMi - t11 - 1.2) / 1.6) - 1},ease:"sine.inOut",immediateRender:false},${f3(t11 + 0.6)});\n`;
  js += loop(`#${id}-sh`, "x", 0, 680, t80 + 1.2, t11 - 0.2, 2.2) + show(`#${id}-sh`, t80 + 1.2, 0.3) + hide(`#${id}-sh`, t11 - 0.3, 0.2);
  // "million": the 80,000 block leaves the card (no miniature with unreadable labels); 1M+ lands ON the cue
  js += `tl.fromTo("#${id}-A",{y:0,opacity:1},{y:-${H},opacity:0,duration:0.5,ease:"power3.in",immediateRender:false},${f3(tMi - 0.5)});\n`;
  js += `tl.fromTo("#${id}-B",{opacity:0,y:30},{opacity:1,y:0,duration:0.4,ease:"power3.out"},${f3(tMi - 0.05)});\n`;
  // the robots wait faint until they are named, so the card is never half empty
  js += fade(`#${id}-rob`, 0, 0.22, tMi + 0.4, 0.5) + fade(`#${id}-rob`, 0.22, 1, tRo - 0.2, 0.35) + rowUp(`#${id}-rl`, tRo);
  js += `tl.fromTo("#${id}-str",{clipPath:"inset(-10px 100% -10px 0px)"},{clipPath:"inset(-10px 0% -10px 0px)",duration:0.8,ease:"power1.out",immediateRender:true},${f3(tRo + 0.3)});\n`;
  js += [...Array(10).keys()].map(r => loop(`#${id}-sl${r}`, "x", 0, -12, tRo + 0.3, D, 0.32 + (r % 4) * 0.07)).join("");
  js += EXTRA.map(([, t], k) => rowUp(`#${id}-x${k}`, t) + loop(`#${id}-xl${k}`, "x", 0, -12, t, D, 0.36 + k * 0.05)).join("");
  js += exitIfFree(id, D, [`#${id}-c`]);
  emit(id, D, body, js);
}

// ----------------------------------------------------- l1: the streams lock (technique 2)
if (want("l1")) {
  const id = "l1", D = dur(id);
  const tDs = cueIn(id, "dissect");   // the lock holds ~1.6s before the exit (N3)
  const W = 700, H = 420, LBLW = 190, TRKW = 440, ROWX = 36, ROWY = k => 96 + k * 62;
  // visibly out of step: the joints row by half a tick, the others by less (composition review)
  const OFF = [7, -6, TICK / 2, -4, 8];
  const body = card(`${id}-c`, 48, 96, W, H, `
    ${tile(`${id}-tile`, ROWX, 22, 80, 50, false)}
    ${T("t = 12.400 s", ROWX + 96, 34, 24, { weight: 700, color: C.muted })}
    <div id="${id}-now" style="position:absolute;left:${ROWX + LBLW + TICK * 7}px;top:${ROWY(0) - 10}px;width:3px;height:${ROWY(4) + 38 - ROWY(0)}px;background:${C.accent};transform-origin:50% 0%;opacity:0"></div>
    <div id="${id}-rows" style="position:absolute;inset:0;opacity:0">${STREAMS.map((_, k) => streamRow(id, k, ROWX, ROWY(k), LBLW, TRKW, 26)).join("")}</div>`, "overflow:hidden");
  let js = wipeUp(`#${id}-c`, 0) + "\n";
  js += `tl.fromTo("#${id}-rows",{opacity:0,y:24},{opacity:1,y:0,duration:0.45,ease:"power3.out"},0.12);\n`;
  js += STREAMS.map((_, k) => `tl.fromTo("#${id}-r${k}",{opacity:1},{opacity:1,duration:0.2,immediateRender:true},0);\n`
    + `tl.fromTo("#${id}-sv${k}",{x:${OFF[k]}},{x:${OFF[k]},duration:0.2,immediateRender:true},0);\n`).join("");
  js += STREAMS.map((_, k) => loop(`#${id}-tk${k}`, "x", 0, -TICK, 0.2, tDs, RATE[k])).join("");
  // "dissect the data": they snap into step and the playhead draws top to bottom
  js += STREAMS.map((_, k) => `tl.fromTo("#${id}-sv${k}",{x:${OFF[k]}},{x:0,duration:0.4,ease:"back.out(1.4)",immediateRender:false},${f3(tDs)});\n`).join("");
  js += `tl.fromTo("#${id}-now",{opacity:1,scaleY:0},{opacity:1,scaleY:1,duration:0.45,ease:"power2.out"},${f3(tDs + 0.3)});\n`;
  js += STREAMS.map((_, k) => loop(`#${id}-tk${k}`, "x", 0, -2 * TICK, tDs + 0.45, D, 1.0)).join("");
  js += exitIfFree(id, D, [`#${id}-c`]);
  emit(id, D, body, js);
}

// ===================================================== the RAIL: running headline (technique 1)
// Trimmed (human 2026-10-25): only over the new graphics, ONE line held per section that only
// accumulates. Text is $muted; [word] lights to $ink with an ink underline on its cue, {word} was lit
// earlier and stays $ink. No accent: the card owns the scene's one accent.
// Each entry: [copy, show cue or null (= with the card), light cue (default: the show cue)].
const RAIL = {
  d1: [["AN INFLUX OF ROBOT DATA", "80000"], ["AN INFLUX OF ROBOT DATA · [BIG DATA]", "big"]],
  m2: [["NOT THE SAME PROBLEMS", "not the same"], ["NOT THE SAME PROBLEMS · [ONE FRAME OFF]", "drift", "frame"]],
  s1: [["[13 WEEKS]", "13"], ["{13 WEEKS} · [IN PUBLIC]", "public"], ["{13 WEEKS} · {IN PUBLIC} · THE [ENGINE]", "engine"]],
  l1: [["THE STAR IS THE [DATA]", null, "data"]],
};
for (const [host, states] of Object.entries(RAIL)) {
  const id = "r" + host;
  if (!want(id)) continue;
  const D = dur(id);
  const plain = c => c.replace(/[\[\]{}]/g, "");
  const at = states.map(([copy, sc, ac]) => {
    let s = sc ? cueIn(id, sc) : 0.15;
    const lit = copy.includes("[");
    let a = lit ? cueIn(id, ac || sc) : null;
    if (lit && a < s + 0.3) s = Math.max(0.1, a - 0.35);
    if (lit) a = Math.max(a, s + 0.3);
    return { copy, s, a };
  });
  at.forEach((x, i) => {
    if (i && !plain(x.copy).startsWith(plain(at[i - 1].copy))) throw new Error(`${id}: state ${i} does not accumulate`);
    if (i && x.s < at[i - 1].s + 0.4) throw new Error(`${id}: state ${i} at ${x.s} crowds state ${i - 1}`);
  });
  const html = at.map((x, i) => {
    const inner = x.copy.replace(/\{(.+?)\}/g, `<span style="color:${C.ink}">$1</span>`)
      .replace(/\[(.+?)\]/, `<span id="${id}-a${i}" style="position:relative;color:${C.muted}">$1<span id="${id}-u${i}" style="position:absolute;left:0;right:0.18em;bottom:-3px;height:2px;background:${C.ink};transform:scaleX(0);transform-origin:left center"></span></span>`);
    return `<div id="${id}-p${i}" class="sheet" style="position:absolute;left:48px;top:16px;border-radius:999px;padding:7px 18px 6px;white-space:nowrap;font-family:SatoshiBold,Satoshi;font-weight:700;font-size:20px;letter-spacing:.18em;color:${C.muted};opacity:0">${inner}</div>`;
  }).join("");
  let js = "";
  at.forEach((x, i) => {
    js += i ? fade(`#${id}-p${i}`, 0, 1, x.s, 0.25) : show(`#${id}-p0`, x.s, 0.35, "y:-10", "y:0");
    if (i) js += hide(`#${id}-p${i - 1}`, x.s, 0.25);
    if (x.a != null) js += `tl.fromTo("#${id}-a${i}",{color:"${C.muted}"},{color:"${C.ink}",duration:0.25,immediateRender:false},${f3(x.a)});\n`
      + `tl.fromTo("#${id}-u${i}",{scaleX:0},{scaleX:1,duration:0.35,ease:"power2.out"},${f3(x.a)});\n`;
  });
  if (!abutsNext(host)) js += hide(`#${id}-p${at.length - 1}`, exitAt(D, 0.3), 0.3);
  emit(id, D, html, js);
}
