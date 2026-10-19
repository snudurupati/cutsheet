// 01-robotics-as-de graphics build. One composition project per part under parts/<id>/,
// generated from here, never hand-written per graphic. Adapted from 05-agent-swarm.
//
// Every timing is DERIVED: part spans from cutsheet.json (span/frames), cue times from
// outputs/transcript-cut.json (cueIn), punch-in geometry from demo-spec.json + screen-ocr.json.
//
// GSAP contract (graphics skill, part C): one paused timeline per part on window.__timelines[id];
// absolute seconds; every entrance a fromTo; no random (dust is a seeded PRNG evaluated at BUILD
// time), no timers; no CSS transform on a property GSAP tweens; clip-path wipes, never blur;
// instant changes >= 0.2s; svgOrigin for SVG rotation; visibility by opacity tween.
//
// Geometry, measured on this job (zones-a/b.json, 2026-10-16), canvas px:
//   clear wall x 0-540 at every height, and x 540-780 above y 660. So a WIDE card (up to 700px)
//   sits in the upper left (y <= 640), a TALL card stays inside x 48-528. Nothing below y 1000.
import { C, emit, span, frames, cueIn, cue, panelClass, fg, dim, wipeUp, wipeDown, exitAt,
         GRAIN_HTML, grainJS, markSVG, mapZoom, plateau, zoomItem, ocrBox, struck, strikeIn,
         DATABASE } from "./lib.mjs";
import { humanoid, humArm, humWalk, humWalkEnd, humIdle, humReach, humHand, HUM } from "./hum.mjs";
import { readFileSync } from "node:fs";

const ONLY = process.argv[2] || "";
const want = id => !ONLY || ONLY.split(",").includes(id);
const dur = id => frames(id) / 30;
const f3 = v => (+v).toFixed(3);
const BRAND = JSON.parse(readFileSync("../../../brand.md", "utf8").match(/```json\s*(\{[\s\S]*\})\s*```/)[1]);

// ------------------------------------------------------------- shared helpers
const drawAll = (sel, t, d = 0.4) =>
  `tl.fromTo(${JSON.stringify(sel)},{strokeDashoffset:1},{strokeDashoffset:0,duration:${d},ease:"power2.out"},${f3(t)});\n`;
const show = (sel, t, d = 0.3, from = "", to = "") =>
  `tl.fromTo(${JSON.stringify(sel)},{opacity:0${from ? "," + from : ""}},{opacity:1${to ? "," + to : ""},duration:${d},ease:"power2.out"},${f3(t)});\n`;
const hide = (sel, t, d = 0.3) =>
  `tl.fromTo(${JSON.stringify(sel)},{opacity:1},{opacity:0,duration:${d},immediateRender:false},${f3(t)});\n`;
const wipeIn = (sel, t, d = 0.45) =>
  `tl.fromTo(${JSON.stringify(sel)},{clipPath:"inset(-20px 100% -20px 0)"},{clipPath:"inset(-20px 0% -20px 0)",duration:${d},ease:"power2.out"},${f3(t)});\n`;
// A row RISES in (opacity + 14px), never a clip-path wipe: composition review 2026-10-17 found the
// clip measured against containers whose text is absolutely positioned, so the box was 0px tall and
// the mask cut every row of g19/g21 in half and let descenders show early in g10/g20.
const rowUp = (sel, t, d = 0.35) =>
  `tl.fromTo(${JSON.stringify(sel)},{opacity:0,y:14},{opacity:1,y:0,duration:${d},ease:"power3.out"},${f3(t)});\n`;
const ruleIn = (sel, t, d = 0.45) =>
  `tl.fromTo(${JSON.stringify(sel)},{scaleX:0,transformOrigin:"left center"},{scaleX:1,duration:${d},ease:"power2.out"},${f3(t)});\n`;
// Count-ups: the element shows `from` on frame 0, never the end value (review 2026-10-17: g07 and g12
// showed their final number before counting, because the hold tween rendered at creation). Only the
// FIRST counter on an element sets its starting text (init); a chained counter passes init=false.
const countUp = (sel, from, to, t0, d0, dec = 0, prefix = "", suffix = "", init = true) => `
(function(){ const el=document.querySelector(${JSON.stringify(sel)}); const o={v:${from}};
  const f=v=>${JSON.stringify(prefix)}+v.toFixed(${dec}).replace(/\\B(?=(\\d{3})+(?!\\d))/g,",")+${JSON.stringify(suffix)};
  ${init ? `el.textContent=f(${from});` : ""}
  tl.fromTo(o,{v:${from}},{v:${to},duration:${d0},ease:"power2.out",immediateRender:false,onUpdate:()=>{el.textContent=f(o.v);}},${f3(t0)});
})();`;
// a looping linear tween for continuous motion, seek-safe (one tween, repeat)
const loop = (sel, prop, from, to, t0, t1, period) => {
  const n = Math.max(1, Math.floor((t1 - t0) / period));
  return `tl.fromTo(${JSON.stringify(sel)},{${prop}:${from}},{${prop}:${to},duration:${f3(period)},ease:"none",repeat:${n - 1},immediateRender:false},${f3(t0)});\n`;
};
const card = (id, x, y, w, h, inner, extra = "") =>
  `<div id="${id}" class="${panelClass(id.split("-")[0])}" style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;${extra}">${inner}</div>`;
const T = (txt, x, y, size, opts = {}) => {
  const { w = null, weight = 700, color = "currentColor", cls = "", id = "", align = "left", lh = 1.12, ls = 0, upper = false } = opts;
  return `<div ${id ? `id="${id}"` : ""} class="${cls}" style="position:absolute;left:${x}px;top:${y}px;${w ? `width:${w}px;` : "white-space:nowrap;"}font-family:Satoshi,sans-serif;font-variation-settings:'wght' ${weight};font-size:${size}px;line-height:${lh};color:${color};text-align:${align};letter-spacing:${ls}em;${upper ? "text-transform:uppercase;" : ""}">${txt}</div>`;
};
const EYEBROW = (txt, x, y, color, id = "") => T(txt, x, y, 28, { weight: 700, color, ls: 0.18, upper: true, id });
// A card leaves with a 0.3s wipe when the next part does NOT start on this part's last frame
// (spot review 2026-10-17: every card vanished in a single frame). Hand-offs keep no exit.
const PLANP = JSON.parse(readFileSync("cutsheet.json", "utf8")).parts;
const exitIfFree = (id, D, sels) => {
  const i = PLANP.findIndex(p => p.id === id), nx = PLANP[i + 1];
  if (nx && Math.abs(nx.start - PLANP[i].end) < 0.02) return "";
  return sels.map(sel => wipeDown(sel, exitAt(D, 0.3), 0.3)).join("\n") + "\n";
};
// seeded PRNG at build time: deterministic numbers baked into the composition
const prng = seed => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };

// -------------------------------------------------------------- takeover page
// analogy/takeover background (style.md Texture): $bg, $rule grid 60px at 6%, $accent-soft radial 8%
const PAGE = `<div style="position:absolute;inset:0;background:${C.bg}"></div>
<div style="position:absolute;inset:0;opacity:.08;background:radial-gradient(ellipse at 30% 35%, ${C.accentSoft} 0%, transparent 60%)"></div>
<svg style="position:absolute;inset:0;opacity:.06" width="1920" height="1080">${[...Array(33).keys()].map(i => `<line x1="${i * 60}" y1="0" x2="${i * 60}" y2="1080" stroke="${C.rule}" stroke-width="2"/>`).join("")}${[...Array(19).keys()].map(i => `<line x1="0" y1="${i * 60}" x2="1920" y2="${i * 60}" stroke="${C.rule}" stroke-width="2"/>`).join("")}</svg>`;

// takeoverDust (style.json graphics.takeoverDust, human 2026-10-16). ~500 flecks, ink and muted,
// 6-12% opacity, median 2px, drifting up-right ~35px/s with low-frequency wander. Positions are a
// pure function of (seed, index, t): each fleck is a div whose x/y are tweened linearly across the
// part from a seeded start to a seeded end, plus one slow sine wobble; flecks that leave the frame
// wrap by being split into two linear legs. Behind every drawn element.
const dustHTML = (id, D, seed = 7) => {
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
const so101 = (id, x, y, filled, F) => {
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
const matchCutGrow = (id, rect, inner, carry, grow = 0.6) => {
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
const takeoverScene = (id, D, W, H, inner, { from = null, carry = "", grow = 0.6 } = {}) => {
  const k = Math.min(1600 / W, 900 / H), L = Math.round((1920 - W * k) / 2), T0 = Math.round((1080 - H * k) / 2), B = 6;
  const dust = dustHTML(id, D, 5);
  const page = `<div id="${id}-bg" style="position:absolute;inset:0">${PAGE}${dust.html}${GRAIN_HTML}</div>
    <div id="${id}-z" style="position:absolute;inset:0">
      <div id="${id}-c" style="position:absolute;left:${L}px;top:${T0}px;width:${W}px;height:${H}px;transform:scale(${k.toFixed(4)});transform-origin:0 0">${inner}</div></div>`;
  let js = dust.js + grainJS(D) + "\n";
  js += `tl.fromTo("#${id}-z",{scale:1,transformOrigin:"50% 50%"},{scale:1.03,transformOrigin:"50% 50%",duration:${f3(D - (from ? grow : 0))},ease:"power1.inOut",immediateRender:true},${from ? grow : 0});\n`;
  if (!from) return { body: `<div style="position:absolute;left:0;top:0;width:1920px;height:1080px;overflow:hidden">${page}</div>`, js };
  const g = matchCutGrow(id, from, page, carry, grow);
  js += g.js + `tl.fromTo("#${id}-bg",{opacity:0},{opacity:1,duration:${grow},ease:"power1.in",immediateRender:true},0);\n`;
  js += `tl.fromTo("#${id}-c",{opacity:0},{opacity:1,duration:0.35,ease:"power1.out",immediateRender:true},${f3(grow - 0.1)});\n`;
  const body = g.html;
  return { body, js };
};

// =================================================================== INTRO

// --------------------------------------------------------------- g01 hook
// Spot review 2026-10-17: enters on the first "Databricks" (style: the drawn object lands on the
// first clause break), the CHECK is the one accent, the lower third exits at 7.0 on its own, and
// the sheet holds to the second "Databricks" where g01b swaps contents in the same rect.
const SHEET = { x: 48, y: 96, w: 560, h: 420 };
if (want("g01")) {
  // HOOK, from the human's script (2026-10-17): "The WiFi login screen: network 'Databricks', password
  // field typing out MakeBigDataSimple. A green checkmark. Then the text dissolves and the word
  // 'Simple?' stays on screen." The password TYPES (letters, not dots), each word on its spoken word.
  // Ends on the card holding "Simple?" alone: g01b's first frame redraws exactly this, then grows to
  // full frame (style: card-to-takeover is a match-cut).
  const id = "g01", D = dur(id), F = fg(id), M = dim(id);
  const tDb = cueIn(id, "databricks"), tPw = cueIn(id, "password", "end");
  const WORDS = ["Make", "Big", "Data", "Simple"];
  const wt = WORDS.map(w => [cueIn(id, w.toLowerCase()), cueIn(id, w.toLowerCase(), "end")]);
  const net = (y, name, sel, lock) => `
    <div style="position:absolute;left:32px;top:${y}px;width:496px;height:58px;border-radius:10px;${sel ? `background:${C.rule}66;` : ""}">
      <svg style="position:absolute;left:14px;top:13px" width="40" height="32" viewBox="0 0 40 32">
        <path d="M4,12 C14,2 26,2 36,12" fill="none" stroke="${sel ? C.ink : M}" stroke-width="3" stroke-linecap="round"/>
        <path d="M10,18 C16,12 24,12 30,18" fill="none" stroke="${sel ? C.ink : M}" stroke-width="3" stroke-linecap="round"/>
        <circle cx="20" cy="25" r="3.5" fill="${sel ? C.ink : M}"/></svg>
      ${T(name, 66, 10, 34, { weight: sel ? 700 : 500, color: sel ? F : M })}
      ${lock ? `<svg style="position:absolute;right:16px;top:14px" width="22" height="28" viewBox="0 0 22 28"><rect x="2" y="12" width="18" height="14" rx="3" fill="none" stroke="${M}" stroke-width="2.6"/><path d="M6,12 V8 a5,5 0 0 1 10,0 V12" fill="none" stroke="${M}" stroke-width="2.6"/></svg>` : ""}
    </div>`;
  // the typed password: one span per letter, in the field; "Simple" letters carry ids so they can stay
  const LX = 18, LW = 23;                                         // letter pitch, measured for Satoshi 700 30px caps+lower
  let k = 0;
  const letters = WORDS.map((w, wi) => [...w].map((ch, ci) => `<span id="${id}-L${wi}-${ci}" style="display:none">${ch}</span>`).join("")).join("");
  const body = card(`${id}-wifi`, SHEET.x, SHEET.y, SHEET.w, SHEET.h, `
      <div id="${id}-ui">
        ${EYEBROW("Wi-Fi", 32, 24, M)}
        ${net(68, "Databricks", true, true)}${net(132, "Guest", false, false)}${net(196, "Lab-5G", false, true)}
        ${T("Password", 32, 268, 32, { weight: 500, color: M })}
        <div id="${id}-field" style="position:absolute;left:32px;top:310px;width:496px;height:62px;border:2px solid ${C.rule};border-radius:10px;background:#FFFFFF"></div>
        <svg id="${id}-tick" style="position:absolute;left:${32 + 496 - 52}px;top:322px" width="40" height="38" viewBox="0 0 40 38"><path class="dr" d="M4,20 L15,31 L36,6" pathLength="1" fill="none" stroke="${C.accent}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <div id="${id}-pw" style="position:absolute;left:${32 + LX}px;top:322px;font-family:Satoshi;font-variation-settings:'wght' 700;font-size:30px;line-height:38px;color:${F};white-space:nowrap">${letters}<span id="${id}-caret" style="display:inline-block;width:3px;height:30px;margin-left:2px;background:${F};vertical-align:-4px"></span></div>
      <div id="${id}-simple" style="position:absolute;left:0;top:${Math.round(SHEET.h / 2 - 62)}px;width:${SHEET.w}px;text-align:center;font-family:Satoshi;font-variation-settings:'wght' 900;font-size:104px;line-height:124px;color:${F};white-space:nowrap;opacity:0">Simple<span style="color:${C.accent}">?</span></div>`)
    + card(`${id}-lt`, 48, 548, 460, 112, `
      ${T(BRAND.presenter.name, 26, 18, 40, { weight: 900, color: F })}
      ${T(BRAND.presenter.role, 26, 70, 24, { weight: 500, color: M })}`);
  let js = wipeUp(`#${id}-wifi`, tDb - 0.1) + "\n" + wipeUp(`#${id}-lt`, tDb + 0.5) + "\n";
  js += `tl.fromTo("#${id}-caret",{opacity:1},{opacity:0,duration:0.4,yoyo:true,repeat:${Math.floor(wt[0][0] / 0.8)},ease:"steps(1)",immediateRender:true},${f3(tDb + 0.3)});\n`;
  // each word types across its own spoken duration, letter by letter
  WORDS.forEach((w, wi) => { const [a, b] = wt[wi], per = Math.max(0.03, (b - a) / w.length);
    [...w].forEach((_, ci) => { js += `tl.set("#${id}-L${wi}-${ci}",{display:"inline"},${f3(a + ci * per)});\n`; }); });   // display, not opacity: the caret follows the text end
  js += `tl.set("#${id}-caret",{opacity:0},${f3(wt[3][1] + 0.6)});\n`;
  js += drawAll(`#${id}-tick .dr`, tPw - 0.25, 0.35);
  js += wipeDown(`#${id}-lt`, 7.0, 0.3) + "\n";
  // the text dissolves; "Simple?" stays: the UI and the first three words fade, and "Simple?" lands at
  // the card's centre at its full size (it is the object g01b carries across the match-cut)
  const tDis = tPw + 0.45;
  js += `tl.to("#${id}-ui",{opacity:0,duration:0.5,ease:"power1.in"},${f3(tDis)});\n`;
  js += `tl.to("#${id}-pw",{opacity:0,duration:0.35,ease:"power1.in"},${f3(tDis + 0.15)});\n`;
  js += `tl.fromTo("#${id}-simple",{opacity:0,y:52,scale:0.42,transformOrigin:"50% 50%"},{opacity:1,y:0,scale:1,transformOrigin:"50% 50%",duration:0.6,ease:"power3.out",immediateRender:false},${f3(tDis + 0.5)});\n`;   // after the UI has gone
  // no exit: g01b's first frame is this card, then it grows to full frame
  emit(id, D, body, js);
}

// --------------------------------------------------- g01b full-frame hook takeover
// From the human's script (2026-10-17): "A quick montage of icons sliding off screen: warehouse,
// dashboard, ETL pipeline. Then a robot ... stops center frame"; the robot is the series humanoid
// lifting a cup (human 2026-10-17, as in the previous version), not an arm. Arrives
// by MATCH-CUT from g01 (standing rule, 05-agent-swarm): frame 0 redraws g01's last frame, the card
// holding "Simple?", and the card grows to full frame from that rect; dust and grain fade in WITH the
// grow, never on frame 1. Full frame, so takeoverDust and the 1.00 -> 1.03 drift apply. A hard cut
// back to the face at "And hear me out" keeps the takeover under 20s and gives the 0:32 beat to the face.
if (want("g01b")) {
  const id = "g01b", D = dur(id), F = C.ink, M = C.muted;
  const tPl = cueIn(id, "platforms"), tSn = cueIn(id, "snowflake"), tRe = cueIn(id, "redshift");
  const tSol = cueIn(id, "solved"), tPr = cueIn(id, "problems"), tW = cueIn(id, "where");
  const tFr = cueIn(id, "frontier"), tR = cueIn(id, "robotics"), tTh = cueIn(id, "think"), tIts = cueIn(id, "it's");
  const GROW = 0.6, B = 6;                                         // grow time; the sheet's border width
  const dust = dustHTML(id, D, 3);
  const s_ = `fill="none" stroke="${F}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"`;
  const ICONS = [
    ["warehouse", `<path d="M14,64 L100,18 L186,64" ${s_}/><rect x="26" y="64" width="148" height="86" ${s_}/>
      <rect x="74" y="94" width="52" height="56" ${s_}/><path d="M74,108 H126 M74,122 H126 M74,136 H126" ${s_} stroke-width="3"/>
      <rect x="38" y="80" width="24" height="18" ${s_} stroke-width="3"/><rect x="138" y="80" width="24" height="18" ${s_} stroke-width="3"/>`],
    ["dashboard", `<rect x="12" y="14" width="176" height="112" rx="10" ${s_}/><path d="M100,126 V146 M66,148 H134" ${s_}/>
      <path d="M36,104 V82 M60,104 V66 M84,104 V74" ${s_} stroke-width="9"/>
      <path d="M118,98 A32,32 0 0 1 172,98" ${s_}/><path d="M145,98 L160,74" ${s_}/><path d="M30,36 H96" ${s_} stroke-width="3"/>`],
    ["ETL pipeline", `<rect x="8" y="54" width="46" height="46" rx="8" ${s_}/><rect x="77" y="54" width="46" height="46" rx="8" ${s_}/><rect x="146" y="54" width="46" height="46" rx="8" ${s_}/>
      <path d="M56,77 H74 M68,70 L75,77 L68,84 M125,77 H143 M137,70 L144,77 L137,84" ${s_} stroke-width="4"/>
      <text x="31" y="87" text-anchor="middle" font-family="Satoshi" font-weight="900" font-size="26" fill="${F}">E</text>
      <text x="100" y="87" text-anchor="middle" font-family="Satoshi" font-weight="900" font-size="26" fill="${F}">T</text>
      <text x="169" y="87" text-anchor="middle" font-family="Satoshi" font-weight="900" font-size="26" fill="${F}">L</text>`]];
  const IX = [440, 960, 1480], IY = 250, IW = 420, IH = 336;     // full-frame scale (checkpoint: 300px read small)
  const icon = (k) => `<div id="${id}-i${k}" style="position:absolute;left:${IX[k] - IW / 2}px;top:${IY}px;width:${IW}px;height:${IH + 90}px;opacity:0">
      <svg style="position:absolute;left:0;top:0;overflow:visible" width="${IW}" height="${IH}" viewBox="0 0 200 160">${ICONS[k][1]}</svg>
      <div style="position:absolute;left:0;top:${IH + 18}px;width:${IW}px;text-align:center;font-family:SatoshiBold,Satoshi;font-weight:700;font-size:46px;color:${M}">${ICONS[k][0]}</div>
      <svg id="${id}-t${k}" style="position:absolute;left:${IW - 44}px;top:-24px;overflow:visible;opacity:0" width="80" height="80" viewBox="0 0 60 60"><circle cx="30" cy="30" r="26" fill="${C.bg}" stroke="${F}" stroke-width="4"/><path class="dr" d="M17,31 L26,40 L44,20" pathLength="1" fill="none" stroke="${F}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`;
  const HZ = 900, SC = 1.1;                                          // horizon y; humanoid scale
  // the humanoid side-steps in from the right and stops beside a small table on its left; the group
  // (table at user x -130..30, humanoid 0..240) is centred on the frame
  // XE: -65 measured with the cup lifted
  const X0 = 1960, XE = humWalkEnd(X0, 960 - 55 * SC - 65, SC), HT = Math.round(HZ - 506 * SC);
  const U = (u, v) => [XE + u * SC, HT + v * SC];                  // humanoid user space -> stage, at rest
  const CUP = [2, 266], LIFT = [30, 176];                           // cup centre on the table; lifted to the chest
  const reach = humReach("L", CUP, { a: 20, b: 20 }, 4), lift = humReach("L", LIFT, { a: 60, b: 60 }, 4);
  const [tx0] = U(-130, 0), [tx1] = U(34, 0), [, ty] = U(0, 284);
  const [cx, cy] = U(...CUP), [lx, ly] = U(...LIFT);
  // stage coordinates inside the card: the card's padding box sits at (SHEET.x + B, SHEET.y + B)
  const INNER = `<div id="${id}-in" style="position:absolute;left:0;top:0;width:1920px;height:1080px">
      <div id="${id}-bg" style="position:absolute;inset:0;opacity:0">${PAGE}${dust.html}${GRAIN_HTML}</div>
      <div id="${id}-z" style="position:absolute;inset:0">
        <svg id="${id}-hzw" style="position:absolute;left:0;top:${HZ - 10}px;overflow:visible" width="1920" height="20">
          <line id="${id}-hz" x1="-80" y1="10" x2="2000" y2="10" stroke="${M}" stroke-width="4" stroke-dasharray="26 18" stroke-linecap="round"/>
          <line id="${id}-hzA" x1="520" y1="10" x2="1400" y2="10" stroke="${C.accent}" stroke-width="7" stroke-linecap="round"/></svg>
        ${[0, 1, 2].map(icon).join("")}
        <svg id="${id}-tbl" style="position:absolute;left:0;top:0;overflow:visible;opacity:0" width="1920" height="1080">
          <path d="M${tx0},${ty} H${tx1} M${tx0 + 22},${ty} V${HZ} M${tx1 - 22},${ty} V${HZ}" fill="none" stroke="${M}" stroke-width="5" stroke-linecap="round"/></svg>
        <svg id="${id}-cup" style="position:absolute;left:${cx - 36}px;top:${cy - 40}px;overflow:visible;opacity:0" width="72" height="72" viewBox="0 0 52 52">
          <path d="M10,10 H38 L35,44 H13 Z" fill="${C.bg}" stroke="${F}" stroke-width="4.5" stroke-linejoin="round"/>
          <path d="M37,18 C50,18 50,34 36,34" fill="none" stroke="${F}" stroke-width="4.5" stroke-linecap="round"/></svg>
        <div id="${id}-hw" style="position:absolute;left:0;top:${HT}px;opacity:0">${humanoid(`${id}-h`, 0, 0, SC, { stroke: F, visor: C.ink })}</div>

      </div>
    </div>`;
  const CARRY = `<div id="${id}-simple" style="position:absolute;left:0;top:${Math.round(SHEET.h / 2 - 62)}px;width:${SHEET.w}px;text-align:center;font-family:Satoshi;font-variation-settings:'wght' 900;font-size:104px;line-height:124px;color:${F};white-space:nowrap">Simple<span style="color:${C.accent}">?</span></div>`;
  const MC = matchCutGrow(id, [SHEET.x, SHEET.y, SHEET.w, SHEET.h], INNER, CARRY, GROW);
  const body = MC.html;
  let js = dust.js + grainJS(D) + "\n";
  // the match-cut: the sheet grows from g01's rect to the full frame; its contents stay put in stage coords
  js += MC.js;
  js += `tl.fromTo("#${id}-bg",{opacity:0},{opacity:1,duration:${GROW},ease:"power1.in",immediateRender:true},0);\n`;
  js += `tl.fromTo("#${id}-z",{scale:1,transformOrigin:"50% 50%"},{scale:1.03,transformOrigin:"50% 50%",duration:${f3(D - GROW)},ease:"power1.inOut",immediateRender:true},${GROW});\n`;
  // "Simple?" stays its size and fades as the sheet grows: the full frame opens on blank paper, and the
  // warehouse lands into that space (human 2026-10-17: "dont make simple bigger")
  // "Simple?" is the carried object: matchCutGrow fades it with the grow (it stays its size)
  // the montage: each icon lands on a platform being named, ticks on "solved", slides off on "problems"
  [tPl, tSn, tRe].forEach((t, k) => { js += `tl.fromTo("#${id}-i${k}",{opacity:0,y:30},{opacity:1,y:0,duration:0.4,ease:"power3.out",immediateRender:false},${f3(t)});\n`; });
  [0, 1, 2].forEach(k => { js += show(`#${id}-t${k}`, tSol + 0.25 * k, 0.2) + drawAll(`#${id}-t${k} .dr`, tSol + 0.25 * k, 0.3); });
  [0, 1, 2].forEach(k => { js += `tl.to("#${id}-i${k}",{x:${-(IX[k] + IW)},duration:0.7,ease:"power2.in"},${f3(tPr + 0.12 * k)});\n` + `tl.set("#${id}-i${k}",{opacity:0},${f3(tPr + 0.12 * k + 0.72)});\n`; });   // fully past the edge, then hidden
  // the horizon draws in as the icons leave; on "where" a stretch of it turns accent (the one accent)
  js += `tl.fromTo("#${id}-hz",{opacity:0},{opacity:1,duration:0.5,immediateRender:true},${f3(tPr + 0.4)});\n` + loop(`#${id}-hz`, "strokeDashoffset", 0, 88, tPr + 0.4, D, 1.2);
  js += `tl.fromTo("#${id}-hzA",{scaleX:0,transformOrigin:"520px 10px"},{scaleX:1,transformOrigin:"520px 10px",duration:0.8,ease:"power2.out",immediateRender:true},${f3(tW)});\n`;
  // a small table and cup arrive with the horizon; the humanoid side-steps in from the right and stands
  // beside it by "think"; it reaches on "think", grips on "it's", and lifts the cup on "robotics"
  // off frame right until it walks (it stood at the left edge through the montage); nothing new arrives
  // until the icons have fully cleared (~1.0s after "problems")
  js += `tl.set("#${id}-h",{x:${X0}},0);\n` + `tl.set("#${id}-hw",{opacity:1},${f3(tPr + 1.2)});\n`;
  js += `tl.fromTo(["#${id}-tbl","#${id}-cup"],{opacity:0},{opacity:1,duration:0.4,immediateRender:true},${f3(tPr + 1.1)});\n`;
  js += humWalk(`${id}-h`, X0, XE, tPr + 1.2, Math.max(2.0, tTh - 0.3 - (tPr + 1.2)), SC);
  js += humArm(`${id}-h`, "L", { a: 0, b: 0, g: 0 }, { ...reach, g: 0 }, tTh - 0.15, 0.5);
  js += humArm(`${id}-h`, "L", { ...reach, g: 0 }, { ...reach, g: 1 }, tIts - 0.05, 0.25);
  js += humArm(`${id}-h`, "L", { ...reach, g: 1 }, { ...lift, g: 1 }, tR, 0.6);
  // what it moves, it holds: the cup rides with the fingertips over the same tween
  js += `tl.fromTo("#${id}-cup",{x:0,y:0},{x:${(lx - cx).toFixed(1)},y:${(ly - cy).toFixed(1)},duration:0.6,ease:"power2.inOut",immediateRender:false},${f3(tR)});\n`;
  // no humIdle here: it sways both arms from 0 and would drop the lifted cup; the drift and dust carry motion
  emit(id, D, body, js, ["grain.png"]);
}

// --------------------------------------------------------- g03 rules vs data
// Spot review: the card enters on "rule-based" (not before), labels sit inside the left column with
// padding at 32px, data falls from the top into a scatter (no marquee), the curve lands on "data",
// and the unspoken "patterns, learned" line is gone.
if (want("g03")) {
  const id = "g03", D = dur(id), F = fg(id), M = dim(id);
  const tRule = cueIn(id, "rule-based"), tSense = cueIn(id, "sense"), tPlan = cueIn(id, "plan"), tAct = cueIn(id, "act"),
        tL = cueIn(id, "learning"), tData = cueIn(id, "data");
  const W = 700, H = 500, HW = W / 2, cx = 172, cy = 260, R = 92;
  const nodes = [["sense", -90], ["plan", 30], ["act", 150]].map(([n, a]) => [n, cx + R * Math.cos(a * Math.PI / 180), cy + R * Math.sin(a * Math.PI / 180)]);
  const lab = [[-42, -72], [-34, 26], [-26, 26]];
  // "learning patterns from data": a small neural network, not a curve fit (human 2026-10-17: modern
  // robot policies are neural networks trained on demonstrations). Layers 4-5-5-2, data streaming in.
  const r = prng(3);
  const LX = [HW + 34, HW + 128, HW + 222, HW + 294], LN = [4, 5, 5, 2], NR = 12;   // 24px left: room for "action" under the outputs
  const LY = LN.map(n => [...Array(n).keys()].map(i => 262 + (i - (n - 1) / 2) * 64));
  const edges = [];
  for (let l = 0; l < 3; l++) LY[l].forEach((y0, i) => LY[l + 1].forEach((y1, j) => edges.push([l, i, j, LX[l], y0, LX[l + 1], y1])));
  // a few activation paths input -> output, each a chain of three edges
  const paths = [...Array(9).keys()].map(() => { const a = Math.floor(r() * 4), b = Math.floor(r() * 5), c = Math.floor(r() * 5), d = Math.floor(r() * 2);
    return [[LX[0], LY[0][a]], [LX[1], LY[1][b]], [LX[2], LY[2][c]], [LX[3], LY[3][d]]]; });
  const body = card(`${id}-c`, 48, 96, W, H, `
    <svg id="${id}-div" style="position:absolute;left:${HW}px;top:24px" width="4" height="${H - 48}"><line x1="2" y1="0" x2="2" y2="${H - 48}" stroke="${C.rule}" stroke-width="2"/></svg>
    ${EYEBROW("rules", 36, 26, M, `${id}-eL`)}${EYEBROW("data", HW + 36, 26, M, `${id}-eR`)}
    <svg id="${id}-ring" style="position:absolute;left:0;top:0;overflow:visible;color:${F}" width="${HW}" height="${H}" viewBox="0 0 ${HW} ${H}">
      <circle class="dr" cx="${cx}" cy="${cy}" r="${R}" pathLength="1" fill="none" stroke="currentColor" stroke-width="3"/>
      ${nodes.map(([n, x, y], k) => `<g id="${id}-n${k}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="15" fill="${C.bg}" stroke="currentColor" stroke-width="3"/></g>`).join("")}
      <circle id="${id}-dot" cx="${cx}" cy="${cy - R}" r="7" fill="currentColor"/>
    </svg>
    ${nodes.map(([n, x, y], k) => T(n, x + lab[k][0], y + lab[k][1], 32, { weight: 700, color: F, id: `${id}-l${k}` })).join("")}
    <svg id="${id}-nn" style="position:absolute;left:0;top:0;overflow:visible" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <g id="${id}-edges">${edges.map(([l, i, j, x0, y0, x1, y1], k) => `<line class="dr" x1="${x0}" y1="${y0.toFixed(1)}" x2="${x1}" y2="${y1.toFixed(1)}" pathLength="1" stroke="${M}" stroke-width="2" stroke-opacity="0.55"/>`).join("")}</g>
      ${LY.map((ys, l) => ys.map((y, i) => `<circle id="${id}-nd${l}-${i}" cx="${LX[l]}" cy="${y.toFixed(1)}" r="${NR}" fill="${l === 3 && i === 0 ? C.bg : C.bg}" stroke="${F}" stroke-width="3"/>`).join("")).join("")}
      ${[...Array(6).keys()].map(k => `<circle id="${id}-in${k}" cx="${HW + 14}" cy="${LY[0][k % 4].toFixed(1)}" r="5" fill="${M}"/>`).join("")}
      ${paths.map((_, k) => `<circle id="${id}-ac${k}" cx="0" cy="0" r="6" fill="${F}" opacity="0"/>`).join("")}
    </svg>
    <div id="${id}-out" style="position:absolute;left:${LX[3] - 60}px;top:${LY[2][4] + 30}px;width:120px;text-align:center">
      <svg style="position:absolute;left:58px;top:${-(LY[2][4] + 30 - LY[3][1] - NR - 6)}px;overflow:visible" width="4" height="${LY[2][4] + 30 - LY[3][1] - NR - 12}"><line x1="2" y1="0" x2="2" y2="${LY[2][4] + 30 - LY[3][1] - NR - 12}" stroke="${M}" stroke-width="2.5" stroke-dasharray="4 6"/></svg>
      ${T("action", 0, 0, 28, { weight: 700, color: M, w: 120, align: "center" })}</div>`);
  let js = wipeUp(`#${id}-c`, tRule - 0.35) + "\n";
  js += `tl.fromTo("#${id}-div",{clipPath:"inset(0 0 100% 0)"},{clipPath:"inset(0 0 0% 0)",duration:0.5,ease:"power2.out"},${f3(tRule - 0.2)});\n`;
  js += show(`#${id}-eL`, tRule) + drawAll(`#${id}-ring .dr`, tRule, 1.0);
  js += [tSense, tPlan, tAct].map((t, k) => show(`#${id}-n${k}`, t, 0.3, "scale:0.4,transformOrigin:'50% 50%'", "scale:1") + show(`#${id}-l${k}`, t, 0.3)).join("");
  js += show(`#${id}-dot`, tRule + 0.5, 0.3);
  const laps = Math.max(1, Math.floor((D - tRule) / 2.4));
  js += `tl.fromTo("#${id}-dot",{rotation:0,svgOrigin:"${cx} ${cy}"},{rotation:${360 * laps},svgOrigin:"${cx} ${cy}",duration:${f3(2.4 * laps)},ease:"none",immediateRender:false},${f3(tRule + 0.5)});\n`;
  js += show(`#${id}-eR`, tL - 0.2);
  // on "learning" the network draws itself, layer by layer; data streams into the inputs from then on
  js += LY.map((ys, l) => ys.map((_, k) => show(`#${id}-nd${l}-${k}`, tL + l * 0.18 + k * 0.04, 0.25, "scale:0.3,transformOrigin:'50% 50%'", "scale:1")).join("")).join("");
  js += drawAll(`#${id}-edges .dr`, tL + 0.3, 0.8) + show(`#${id}-out`, tL + 0.9);
  const loopN = Math.max(1, Math.floor((D - tL - 0.4) / 1.2));
  js += [...Array(6).keys()].map(k => `tl.fromTo("#${id}-in${k}",{attr:{cx:${HW + 14}},opacity:0},{attr:{cx:${LX[0] - NR}},opacity:1,duration:1.2,ease:"none",repeat:${loopN},immediateRender:false},${f3(tL + 0.4 + k * 0.2)});\n`).join("");
  // on "data" activations run through the layers: each pulse travels input -> hidden -> hidden -> output
  // and the output node flashes $accent as it arrives (the scene's one accent); the pulses keep cycling
  const hop = 0.32, cyc = 3 * hop + 0.6, nCyc = Math.max(1, Math.floor((D - tData - 0.2) / cyc));
  paths.forEach((pp, k) => {
    const t0 = tData + (k % 5) * 0.26 + Math.floor(k / 5) * 0.13;
    js += `tl.set("#${id}-ac${k}",{attr:{cx:${pp[0][0]},cy:${pp[0][1].toFixed(1)}},opacity:1},${f3(t0)});\n`;
    for (let c = 0; c < nCyc; c++) for (let h = 0; h < 3; h++)
      js += `tl.fromTo("#${id}-ac${k}",{attr:{cx:${pp[h][0]},cy:${pp[h][1].toFixed(1)}}},{attr:{cx:${pp[h + 1][0]},cy:${pp[h + 1][1].toFixed(1)}},duration:${hop},ease:"power1.inOut",immediateRender:false},${f3(t0 + c * cyc + h * hop)});\n`;
  });
  js += `tl.fromTo("#${id}-nd3-0",{fill:"${C.bg}"},{fill:"${C.accent}",duration:0.25,yoyo:true,repeat:${Math.max(1, Math.floor((D - tData - 1) / 0.6))},ease:"sine.inOut",immediateRender:false},${f3(tData + 0.96)});\n`;
  js += `tl.fromTo(["#${id}-ring","#${id}-l0","#${id}-l1","#${id}-l2"],{opacity:1},{opacity:0.38,duration:0.5,immediateRender:false},${f3(tL)});\n`;
  js += exitIfFree(id, D, [`#${id}-c`]);
  emit(id, D, body, js);
}

// --------------------------------------------------------------- g04 thesis
// Spot review: 72px, lines revealed whole (opacity + rise, no clip that shows glyph stubs),
// "data engineering problem." lands ON "data", the accent is the words "data engineering".
// g04's card: g05 redraws it on its first frame and grows from it (match-cut)
const G04_RECT = [48, 110, 660, 420];
const G04_LINES = (F, pid = "g04") => { const A = s => `<span style="color:${C.accent}">${s}</span>`;
  return ["Modern robotics", `is a ${A("data")}`, A("engineering"), "problem."].map((l, k) => T(l, 40, 36 + k * 86, 72, { weight: 900, color: F, id: `${pid}-L${k}` })).join(""); };
if (want("g04")) {
  const id = "g04", D = dur(id), F = fg(id);
  const tData = cueIn(id, "data"), tEng = cueIn(id, "engineering");
  const A = s => `<span style="color:${C.accent}">${s}</span>`;
  const at = [0.05, Math.max(0.2, tData - 0.25), Math.max(0.35, tEng - 0.2), Math.max(0.5, tEng + 0.2)];
  const body = card(`${id}-c`, ...G04_RECT, G04_LINES(F, id));
  let js = wipeUp(`#${id}-c`, 0) + "\n";
  js += at.map((t, k) => show(`#${id}-L${k}`, t, 0.3, "y:18", "y:0")).join("");
  js += exitIfFree(id, D, [`#${id}-c`]);
  emit(id, D, body, js);
}

// ------------------------------------------------------------ g05 factory/home
// Spot review rework. Factory: the arm is bolted to the floor beside the belt and only its joints
// move, stamping each part at the same spot; parts spawn on the belt and leave through a clip at
// the column edge; the counter climbs and passes 10,000 on "tens of thousands", then keeps going.
// Home: the humanoid reaches (IK) for the mug where it is, the mug fades away to another spot just
// before the grip, the gripper closes on nothing and the head turns to the new spot. Objects never
// spawn inside the robot's footprint and it never ends holding the mug.
if (want("g05")) {
  const id = "g05", D = dur(id), F = fg(id), M = dim(id);
  const tFa = cueIn(id, "falls"), tTens = cueIn(id, "tens");
  const W = 700, H = 500, HW = W / 2;
  const s = `fill="none" stroke="${F}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"`;
  const SPOT = 196, BELT_Y = 356;                                 // stamp position (x) and belt top
  const belt = `<rect x="24" y="${BELT_Y}" width="300" height="30" rx="15" ${s}/><circle cx="39" cy="${BELT_Y + 15}" r="9" ${s}/><circle cx="309" cy="${BELT_Y + 15}" r="9" ${s}/>`;
  // floor-mounted arm: base at (96, 470), shoulder at (96, 420); upper arm to elbow, forearm to a press
  const arm = `<path d="M70,470 H122 M84,470 V438 H108 V470" ${s}/>
    <g id="${id}-u"><path d="M96,430 L150,300" ${s} stroke-width="9"/><path d="M96,430 L150,300" fill="none" stroke="${C.bg}" stroke-width="3"/><circle cx="96" cy="430" r="9" fill="${C.bg}" ${s}/>
      <g id="${id}-f"><path d="M150,300 L${SPOT},300 L${SPOT},318" ${s} stroke-width="8"/><path d="M150,300 L${SPOT},300 L${SPOT},318" fill="none" stroke="${C.bg}" stroke-width="2.5"/><circle cx="150" cy="300" r="8" fill="${C.bg}" ${s}/>
        <path d="M${SPOT - 18},320 H${SPOT + 18}" ${s} stroke-width="5"/></g></g>`;
  const NB = 6, boxes = [...Array(NB).keys()].map(i => `<rect id="${id}-b${i}" x="0" y="${BELT_Y - 30}" width="30" height="30" rx="4" fill="${C.bg}" ${s}/>`).join("");
  // home side, FRONT VIEW like the robot (review 2026-10-17: a top-down room around a front-view robot
  // mixed perspectives, and at 0.36 the head turn could not be seen). A floor, the humanoid at 0.5,
  // a hip-height table to its right. The mug only ever sits on the table, clear of the body.
  const HS = 0.5, FLOOR = H - 40;
  const hx = HW + 24, hy = Math.round(FLOOR - 506 * HS);
  const mugAt = (u, v) => [hx + u * HS, hy + v * HS];             // humanoid user space -> card px
  const TABLE_V = 302;                                           // table top, humanoid space
  const NEAR = [[236, 286], [226, 286], [244, 286]];             // reachable, on the table, clear of the hand at rest
  const tableX0 = hx + 196 * HS, tableX1 = W - 30, tableY = hy + TABLE_V * HS;
  const FAR = [[tableX1 - 30, tableY - 14], [W - 120, FLOOR - 14], [tableX1 - 80, tableY - 14]];
  const TK = takeoverScene(id, D, W, H, `
    <svg id="${id}-div" style="position:absolute;left:${HW}px;top:24px" width="4" height="${H - 48}"><line x1="2" y1="0" x2="2" y2="${H - 48}" stroke="${C.rule}" stroke-width="2"/></svg>
    ${EYEBROW("factory", 36, 26, M)}${EYEBROW("home", HW + 36, 26, M, `${id}-eR`)}
    <div style="position:absolute;left:0;top:0;width:${HW - 6}px;height:${H}px;overflow:hidden">
      <svg style="position:absolute;left:0;top:0;overflow:visible" width="${HW}" height="${H}" viewBox="0 0 ${HW} ${H}">${belt}${boxes}${arm}
        <path d="M${SPOT},${BELT_Y + 40} v14 M${SPOT - 6},${BELT_Y + 48} h12" stroke="${M}" stroke-width="2.5"/></svg></div>
    <div style="position:absolute;left:36px;top:70px;font-family:Satoshi;font-variation-settings:'wght' 700;font-size:30px;line-height:1.25;color:${M};white-space:nowrap">same spot,<br><span id="${id}-n" style="color:${F}">0</span> times</div>
    <div id="${id}-R" style="position:absolute;left:0;top:0;width:${W}px;height:${H}px">
      <svg style="position:absolute;left:0;top:0;overflow:visible" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
        <line x1="${HW + 16}" y1="${FLOOR}" x2="${W - 16}" y2="${FLOOR}" stroke="${M}" stroke-width="3"/>
        <path d="M${tableX0},${tableY} H${tableX1} M${tableX0 + 14},${tableY} V${FLOOR} M${tableX1 - 14},${tableY} V${FLOOR}" fill="none" stroke="${M}" stroke-width="3.5" stroke-linecap="round"/>
        <g id="${id}-ghost" opacity="0"><circle cx="0" cy="0" r="22" fill="none" stroke="${M}" stroke-width="2.5" stroke-dasharray="6 6"/></g>
        <g id="${id}-mug" opacity="0"><path d="M-13,-15 h26 v26 a6,6 0 0 1 -6,6 h-14 a6,6 0 0 1 -6,-6 Z" fill="${C.accent}" stroke="${F}" stroke-width="3"/><path d="M13,-8 c11,0 11,16 0,16" fill="none" stroke="${F}" stroke-width="3"/></g>
        <g id="${id}-toy" opacity="0"><rect x="-14" y="-14" width="28" height="28" rx="4" fill="none" stroke="${F}" stroke-width="3"/><circle cx="0" cy="0" r="5" fill="${F}"/></g>
        <g id="${id}-book" opacity="0"><rect x="-22" y="-8" width="44" height="16" rx="2" fill="none" stroke="${F}" stroke-width="3"/></g>
      </svg>
      <div style="position:absolute;left:${hx}px;top:${hy}px">${humanoid(`${id}-h`, 0, 0, HS, { stroke: F })}</div>
    </div>`, { from: G04_RECT, carry: G04_LINES(C.ink, `${id}-carryL`) });
  const body = TK.body;
  // g04 hands straight to g05: the card is there on frame 0 and only its contents build
  let js = TK.js;
  js += `tl.fromTo("#${id}-div",{clipPath:"inset(0 0 100% 0)"},{clipPath:"inset(0 0 0% 0)",duration:0.5,ease:"power2.out"},0.15);\n`;
  // belt: one part every P seconds; it rolls from x=-30 to the stamp spot, waits for the stamp,
  // rolls on to x=360 (clipped by the column). Boxes are reused round-robin, each tween absolute.
  const P = 1.5, n = Math.ceil(D / P) + 2;
  for (let i = 0; i < n; i++) {
    const b = `#${id}-b${i % NB}`, tA = -1.0 + i * P;            // arrival at the spot
    const t0 = tA - 1.0, t2 = tA + 0.5;
    if (t2 + 1.2 < 0 || t0 > D) continue;
    js += `tl.fromTo("${b}",{x:-30},{x:${SPOT - 15},duration:1.0,ease:"none",immediateRender:${i < NB}},${f3(Math.max(0, t0))});\n`;
    js += `tl.fromTo("${b}",{x:${SPOT - 15}},{x:${SPOT - 15},duration:0.5,ease:"none",immediateRender:false},${f3(Math.max(0, tA))});\n`;
    js += `tl.fromTo("${b}",{x:${SPOT - 15}},{x:380,duration:1.2,ease:"none",immediateRender:false},${f3(Math.max(0, t2))});\n`;
    // stamp: the shoulder dips and the elbow follows, press touches the part, back up
    js += `tl.fromTo("#${id}-u",{rotation:0,svgOrigin:"96 430"},{rotation:6,svgOrigin:"96 430",duration:0.22,yoyo:true,repeat:1,ease:"power2.inOut",immediateRender:false},${f3(Math.max(0, tA + 0.03))});\n`;
    js += `tl.fromTo("#${id}-f",{rotation:0,svgOrigin:"150 300"},{rotation:-6,svgOrigin:"150 300",duration:0.22,yoyo:true,repeat:1,ease:"power2.inOut",immediateRender:false},${f3(Math.max(0, tA + 0.03))});\n`;
  }
  // the counter: passes 10,000 ON "tens of thousands", then keeps ticking
  const tFac = cueIn(id, "factory");
  js += countUp(`#${id}-n`, 0, 10000, tFac, tTens - tFac);
  js += `(function(){ const el=document.querySelector("#${id}-n"); const o={v:10000};
  tl.fromTo(o,{v:10000},{v:${10000 + Math.round((D - tTens) * 1300)},duration:${f3(D - tTens - 0.1)},ease:"none",immediateRender:false,onUpdate:()=>{el.textContent=Math.round(o.v).toLocaleString("en-US");}},${f3(tTens + 0.05)}); })();\n`;
  // home, from "falls"
  // full frame: the home side is present, dimmed, from the moment the page lands (a half-empty frame for
  // 6.5s otherwise), and comes up to full on "falls"
  js += `tl.fromTo(["#${id}-R","#${id}-eR"],{opacity:0},{opacity:0.3,duration:0.4,immediateRender:true},0.6);\n`;
  js += `tl.fromTo(["#${id}-R","#${id}-eR"],{opacity:0.3},{opacity:1,duration:0.4,immediateRender:false},${f3(tFa - 0.2)});\n`;
  js += `tl.fromTo("#${id}-toy",{opacity:0,x:${W - 60},y:${FLOOR - 14}},{opacity:1,x:${W - 60},y:${FLOOR - 14},duration:0.3},${f3(tFa)});\n`;
  js += `tl.fromTo("#${id}-book",{opacity:0,x:${tableX0 + 70},y:${tableY - 8}},{opacity:1,x:${tableX0 + 70},y:${tableY - 8},duration:0.3},${f3(tFa + 0.2)});\n`;
  const cyc = 3.2, nc = Math.max(1, Math.floor((D - tFa - 0.2) / cyc));
  let pose = { a: 0, b: 0, g: 0 };
  for (let k = 0; k < nc; k++) {
    const t = tFa + 0.2 + k * cyc, near = NEAR[k % 3], far = FAR[k % 3];
    const [mx, my] = mugAt(near[0] + 6, TABLE_V - 30);
    const reach = humReach("R", [near[0], near[1] - 4], { a: -40, b: -40 }, 4);
    // the mug is there (fade in), the robot reaches, the mug fades away to the far spot just before
    // the grip, the gripper closes on nothing over the ghost, the head turns toward the new spot
    js += `tl.fromTo("#${id}-mug",{opacity:0,x:${mx.toFixed(1)},y:${my.toFixed(1)}},{opacity:1,x:${mx.toFixed(1)},y:${my.toFixed(1)},duration:0.3,immediateRender:${k === 0}},${f3(t)});\n`;
    js += humArm(`${id}-h`, "R", pose, { ...reach, g: 0 }, t + 0.4, 0.9);
    js += `tl.fromTo("#${id}-mug",{opacity:1},{opacity:0,duration:0.25,immediateRender:false},${f3(t + 1.15)});\n`;
    js += `tl.fromTo("#${id}-ghost",{opacity:0,x:${mx.toFixed(1)},y:${my.toFixed(1)}},{opacity:1,x:${mx.toFixed(1)},y:${my.toFixed(1)},duration:0.2,immediateRender:${k === 0}},${f3(t + 1.15)});\n`;
    js += `tl.fromTo("#${id}-mug",{opacity:0,x:${far[0]},y:${far[1]}},{opacity:1,x:${far[0]},y:${far[1]},duration:0.3,immediateRender:false},${f3(t + 1.4)});\n`;
    js += humArm(`${id}-h`, "R", { ...reach, g: 0 }, { ...reach, g: 1 }, t + 1.3, 0.3);
    js += `tl.fromTo("#${id}-h-head",{rotation:0,svgOrigin:"120 104"},{rotation:-12,svgOrigin:"120 104",duration:0.4,ease:"power2.out",immediateRender:false},${f3(t + 1.7)});\n`;
    js += humArm(`${id}-h`, "R", { ...reach, g: 1 }, { a: 0, b: 0, g: 0 }, t + 2.3, 0.6);
    js += `tl.fromTo("#${id}-h-head",{rotation:-12,svgOrigin:"120 104"},{rotation:0,svgOrigin:"120 104",duration:0.4,ease:"power2.inOut",immediateRender:false},${f3(t + 2.5)});\n`;
    js += `tl.fromTo("#${id}-ghost",{opacity:1},{opacity:0,duration:0.3,immediateRender:false},${f3(t + 2.6)});\n`;
    js += `tl.fromTo("#${id}-mug",{opacity:1},{opacity:0,duration:0.25,immediateRender:false},${f3(t + cyc - 0.3)});\n`;
    pose = { a: 0, b: 0, g: 0 };
  }
  // a takeover ends on a hard cut back to the face
  emit(id, D, body, js, ["grain.png"]);
}

// ------------------------------------------------------------- g06 the bike
// Spot review: a real adult hand and forearm in ink entering from the card's left edge, a visible
// close on "holding", the release on "let", and 1.2s more so the bike visibly pulls away alone.
if (want("g06")) {
  const id = "g06", D = dur(id), F = fg(id), M = dim(id);
  const tH = cueIn(id, "holding"), tGo = cueIn(id, "let");
  const W = 600, H = 380, gy = 310;
  const s = `fill="none" stroke="${F}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"`;
  const WX = [230, 400], R = 46;
  const wheel = (k) => `<g id="${id}-w${k}"><circle cx="${WX[k]}" cy="${gy - R}" r="${R}" ${s}/><path d="M${WX[k] - R},${gy - R} H${WX[k] + R} M${WX[k]},${gy - 2 * R} V${gy}" ${s} stroke-width="2.5"/></g>`;
  const BB = [312, gy - R];                                       // bottom bracket (pedals)
  const bike = `<g id="${id}-bike">${wheel(0)}${wheel(1)}
    <path d="M${WX[0]},${gy - R} L${BB[0]},${BB[1]} L${BB[0] - 14},${gy - 128} M${WX[0]},${gy - R} L${BB[0] - 14},${gy - 128} L${WX[1] - 22},${gy - 122} L${BB[0]},${BB[1]} M${WX[1] - 22},${gy - 122} L${WX[1]},${gy - R}" fill="none" stroke="${C.accent}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M${BB[0] - 30},${gy - 136} H${BB[0] + 2} M${WX[1] - 22},${gy - 122} L${WX[1] - 28},${gy - 150} H${WX[1] - 6}" ${s}/>
    <g id="${id}-crank"><path d="M${BB[0] - 18},${BB[1]} L${BB[0] + 18},${BB[1]}" ${s} stroke-width="5"/><circle cx="${BB[0]}" cy="${BB[1]}" r="8" fill="${C.bg}" ${s}/></g>
    <g id="${id}-kid"><circle cx="${BB[0] - 6}" cy="${gy - 250}" r="21" fill="${C.bg}" ${s}/><path d="M${BB[0] - 10},${gy - 228} L${BB[0] - 22},${gy - 150} M${BB[0] - 14},${gy - 206} L${WX[1] - 30},${gy - 154} M${BB[0] - 22},${gy - 150} L${BB[0] + 4},${gy - 104} L${BB[0] - 4},${BB[1]}" ${s}/></g></g>`;
  // the adult forearm comes in from the card's left edge and the hand cups the back of the seat
  // round 3: the grip point is the SADDLE itself, not the seat post. The palm sits behind and under the
  // saddle's rear; three finger strokes curl up and over it when closed and splay back when open.
  const SEAT = [BB[0] - 30, gy - 136];                           // saddle rear
  const hand = `<g id="${id}-hand">
    <path d="M-460,${SEAT[1] + 6} C40,${SEAT[1] - 2} 140,${SEAT[1] + 10} ${SEAT[0] - 44},${SEAT[1] + 14}" fill="none" stroke="${F}" stroke-width="30" stroke-linecap="round"/>
    <path d="M-460,${SEAT[1] + 6} C40,${SEAT[1] - 2} 140,${SEAT[1] + 10} ${SEAT[0] - 44},${SEAT[1] + 14}" fill="none" stroke="${C.bg}" stroke-width="22" stroke-linecap="round"/>
    <path d="M${SEAT[0] - 54},${SEAT[1]} C${SEAT[0] - 40},${SEAT[1] - 6} ${SEAT[0] - 14},${SEAT[1] - 4} ${SEAT[0] - 6},${SEAT[1] + 10} C${SEAT[0] - 2},${SEAT[1] + 22} ${SEAT[0] - 30},${SEAT[1] + 32} ${SEAT[0] - 54},${SEAT[1] + 26} Z" fill="${C.bg}" ${s}/>
    <g id="${id}-fing">${[0, 1, 2].map(k => `<path d="M${SEAT[0] - 10 - k * 9},${SEAT[1] + 4 + k * 2} C${SEAT[0] - 6 - k * 9},${SEAT[1] - 12} ${SEAT[0] + 10 - k * 9},${SEAT[1] - 14} ${SEAT[0] + 14 - k * 9},${SEAT[1] - 2}" fill="none" stroke="${F}" stroke-width="7" stroke-linecap="round"/><path d="M${SEAT[0] - 10 - k * 9},${SEAT[1] + 4 + k * 2} C${SEAT[0] - 6 - k * 9},${SEAT[1] - 12} ${SEAT[0] + 10 - k * 9},${SEAT[1] - 14} ${SEAT[0] + 14 - k * 9},${SEAT[1] - 2}" fill="none" stroke="${C.bg}" stroke-width="2.5" stroke-linecap="round"/>`).join("")}</g></g>`;
  const TK = takeoverScene(id, D, W, H, `<div style="position:absolute;inset:0">
    <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="overflow:visible">
      <line id="${id}-g" x1="-460" y1="${gy}" x2="${W + 460}" y2="${gy}" stroke="${M}" stroke-width="3" stroke-dasharray="26 16"/>
      ${bike}${hand}
    </svg></div>`);
  const body = TK.body;
  let js = TK.js;
  const v = 90;                                                  // ground speed, px/s
  js += `tl.fromTo("#${id}-g",{strokeDashoffset:0},{strokeDashoffset:${(v * D).toFixed(0)},duration:${f3(D)},ease:"none",immediateRender:true},0);\n`;
  const turn = v * D / (2 * Math.PI * R) * 360;
  js += [0, 1].map(k => `tl.fromTo("#${id}-w${k}",{rotation:0,svgOrigin:"${WX[k]} ${gy - R}"},{rotation:${turn.toFixed(0)},svgOrigin:"${WX[k]} ${gy - R}",duration:${f3(D)},ease:"none",immediateRender:true},0);\n`).join("");
  js += `tl.fromTo("#${id}-crank",{rotation:0,svgOrigin:"${BB[0]} ${BB[1]}"},{rotation:${(turn * 0.6).toFixed(0)},svgOrigin:"${BB[0]} ${BB[1]}",duration:${f3(D)},ease:"none",immediateRender:true},0);\n`;
  // "holding": the fingers close round the seat; "let": they open and the hand stays in the world
  // open (tipped up) until "holding", curled over the seat while holding, tipped up again on "let"
  // fingers: half-curled before "holding", curled over the saddle while holding, splayed back on "let"
  const FO = `${SEAT[0] - 14} ${SEAT[1] + 6}`;
  js += `tl.fromTo("#${id}-fing",{rotation:-25,svgOrigin:"${FO}"},{rotation:-25,svgOrigin:"${FO}",duration:0.2},0);\n`;
  js += `tl.fromTo("#${id}-fing",{rotation:-25,svgOrigin:"${FO}"},{rotation:8,svgOrigin:"${FO}",duration:0.35,ease:"power2.out",immediateRender:false},${f3(tH)});\n`;
  js += `tl.fromTo("#${id}-fing",{rotation:8,svgOrigin:"${FO}"},{rotation:-80,svgOrigin:"${FO}",duration:0.25,ease:"power2.out",immediateRender:false},${f3(tGo)});\n`;
  js += `tl.fromTo("#${id}-hand",{x:0},{x:${(-v * (D - tGo) - 30).toFixed(0)},duration:${f3(D - tGo - 0.1)},ease:"power1.in",immediateRender:false},${f3(tGo + 0.1)});\n`;
  js += `tl.fromTo("#${id}-bike",{rotation:0,svgOrigin:"${BB[0]} ${gy}"},{rotation:3,svgOrigin:"${BB[0]} ${gy}",duration:0.2,yoyo:true,repeat:1,ease:"sine.inOut",immediateRender:false},${f3(tGo + 0.3)});\n`;
  js += `tl.fromTo("#${id}-bike",{x:0},{x:150,duration:${f3(D - tGo - 0.1)},ease:"power2.in",immediateRender:false},${f3(tGo + 0.1)});\n`;
  // a takeover ends on a hard cut back to the face
  emit(id, D, body, js, ["grain.png"]);
}

// ---------------------------------------------------------------- g07 stats
if (want("g07")) {
  const id = "g07", D = dur(id), F = fg(id), M = dim(id);
  const t80 = cueIn(id, "80000"), t11 = cueIn(id, "1100"), tM = cueIn(id, "million"), tR = cueIn(id, "100"),
        tT = cueIn(id, "teleoperation"), tF = cueIn(id, "fleet"), tMd = cueIn(id, "metadata");
  const W = 700, H = 560;
  const chip = (k, txt, x, y) => `<div id="${id}-ch${k}" style="position:absolute;left:${x}px;top:${y}px;padding:10px 18px;border:2.5px solid ${F};border-radius:30px;font-family:SatoshiBold,Satoshi;font-weight:700;font-size:32px;color:${F};white-space:nowrap">${txt}</div>`;
  const body = card(`${id}-c`, 48, 80, W, H, `
    <div id="${id}-A" style="position:absolute;inset:0">
      <div id="${id}-n80" style="position:absolute;left:36px;top:30px;font-family:Satoshi;font-variation-settings:'wght' 900;font-size:160px;line-height:1;color:${F}">0</div>
      ${T("LeRobot datasets on Hugging Face", 40, 206, 28, { weight: 500, color: M })}
      <div style="position:absolute;left:40px;top:262px;width:620px;height:22px;border-radius:11px;background:${C.rule}"></div>
      <div id="${id}-bar" style="position:absolute;left:40px;top:262px;width:620px;height:22px;border-radius:11px;background:${C.accent}"></div>
      <div id="${id}-was" style="position:absolute;left:40px;top:296px">
        <div style="position:absolute;left:0;top:-34px;width:9px;height:22px;border-radius:4px;background:${F}"></div>
        ${T("1,100 in 2024", 0, 2, 32, { weight: 700, color: M })}</div>
    </div>
    <div id="${id}-B" style="position:absolute;inset:0">
      <div style="position:absolute;left:36px;top:30px;font-family:Satoshi;font-variation-settings:'wght' 900;font-size:160px;line-height:1;color:${F}">1M+</div>
      ${T("trajectories in AgiBot World", 40, 206, 28, { weight: 500, color: M })}
      ${T("from over 100 robots", 40, 250, 28, { weight: 700, color: F, id: `${id}-robots` })}
      <div id="${id}-rule" class="accentbar" style="position:absolute;left:40px;top:300px;width:300px;height:5px"></div>
    </div>
    ${T("and before that:", 40, H - 236, 30, { weight: 500, color: M, id: `${id}-pre` })}
    ${chip(0, "teleop logs", 36, H - 190)}${chip(1, "fleet telemetry", 268, H - 190)}${chip(2, "metadata", 36, H - 118)}
    <svg id="${id}-st" style="position:absolute;left:0;top:${H - 28}px" width="${W}" height="10"><line x1="0" y1="5" x2="${W}" y2="5" stroke="${M}" stroke-width="3" stroke-dasharray="4 14" stroke-linecap="round"/></svg>`);
  let js = wipeUp(`#${id}-c`, 0) + "\n";
  js += countUp(`#${id}-n80`, 0, 80000, t80 - 1.3, 1.3);
  js += `tl.fromTo("#${id}-bar",{scaleX:0,transformOrigin:"left center"},{scaleX:1,duration:1.3,ease:"power2.out"},${f3(t80 - 1.3)});\n`;
  js += show(`#${id}-was`, t11, 0.35, "y:10", "y:0");
  js += hide(`#${id}-A`, tM - 0.25, 0.2);
  js += `tl.fromTo("#${id}-B",{opacity:0,clipPath:"inset(100% 0 0 0)"},{opacity:1,clipPath:"inset(0% 0 0 0)",duration:0.35,ease:"power3.out"},${f3(tM - 0.1)});\n`;
  js += show(`#${id}-robots`, tR, 0.3, "y:10", "y:0") + ruleIn(`#${id}-rule`, tR + 0.4);
  js += show(`#${id}-pre`, tT - 0.4) + [tT, tF, tMd].map((t, k) => show(`#${id}-ch${k}`, t, 0.3, "y:12", "y:0")).join("");
  js += show(`#${id}-st`, tT, 0.4) + loop(`#${id}-st line`, "strokeDashoffset", 0, -36, tT, D, 0.9);
  js += exitIfFree(id, D, [`#${id}-c`]);
  emit(id, D, body, js);
}

// the humanoid at a hip-height table with a block on it. Block centre in the humanoid's own user
// space is BLOCK; the fingertips' target for a hit is BLOCK, for a miss one tick to the left.
const BLOCK = [236, 286];
const tableScene = (id, left, top, sc, F, M) => `
  <div style="position:absolute;left:${left}px;top:${top}px">${humanoid(`${id}-h`, 0, 0, sc, { stroke: F })}
    <svg style="position:absolute;left:0;top:0;overflow:visible" width="${Math.round(360 * sc)}" height="${Math.round(520 * sc)}" viewBox="0 0 360 520">
      <path d="M190,302 H340 M212,302 V506 M320,302 V506" fill="none" stroke="${M}" stroke-width="${3 / sc * 0.6}" stroke-linecap="round"/>
      <rect id="${id}-blk" x="${BLOCK[0] - 16}" y="${BLOCK[1] - 14}" width="32" height="32" rx="3" fill="${C.bg}" stroke="${F}" stroke-width="${3.5}"/>
    </svg></div>`;
const reachFor = (hit) => humReach("R", hit ? BLOCK : [BLOCK[0] - 30, BLOCK[1]], { a: -30, b: -40 }, 4);

// ------------------------------------------------- g08 / g09 the streams
// Review 2026-10-17: the tile now sits above the rows (its edge crossed "wrist camera"); the rows
// share one track column (x 250-470) so g09 can give the humanoid its own column at 0.5 scale, and
// the slip in g09 is shown against dashed alignment guides so a one-frame offset reads at size.
const STREAMS = ["wrist camera", "front camera", "joint positions", "commands", "timestamps"];
const RATE = [0.55, 0.62, 0.38, 0.47, 0.71];              // seconds per tick cycle once desynced
const ROW0 = 176, ROWP = 58, TICK = 30;
let TRK = [290, 480];
const streamRows = (id, F, M, trk = TRK, acc = 4) => STREAMS.map((n, k) => `
  <div id="${id}-r${k}" style="position:absolute;left:0;top:${ROW0 + k * ROWP}px;width:${trk[1] + 10}px;height:46px">
    ${T(n, 36, 6, 32, { weight: 700, color: k === acc ? C.accent : F })}
    <svg id="${id}-sv${k}" style="position:absolute;left:${trk[0]}px;top:6px;overflow:hidden" width="${trk[1] - trk[0]}" height="34">
      <line id="${id}-tk${k}" x1="${-TICK * 2}" y1="17" x2="${trk[1] - trk[0] + TICK * 2}" y2="17" stroke="${k === acc ? C.accent : F}" stroke-width="22" stroke-dasharray="4 ${TICK - 4}"/>
      <line id="${id}-tf${k}" x1="${-TICK * 2}" y1="17" x2="${trk[1] - trk[0] + TICK * 2}" y2="17" stroke="${k === acc ? C.accent : F}" stroke-width="22" stroke-dasharray="4 ${2 * TICK - 4}" opacity="0"/>
    </svg></div>`).join("");
const tileHTML = (F, M, idAttr = "") => `<div ${idAttr} style="position:absolute;left:36px;top:66px;width:132px;height:88px;border:3px solid ${F};border-radius:6px">
      <svg width="126" height="82"><path d="M16,64 L50,28 L72,50 L88,36 L114,64 Z" fill="none" stroke="${F}" stroke-width="3" stroke-linejoin="round"/></svg></div>`;

if (want("g08")) {
  const id = "g08", D = dur(id), F = fg(id), M = dim(id);
  const tS = cueIn(id, "single"), tC = cueIn(id, "camera"), tJ = cueIn(id, "joints"), tCo = cueIn(id, "commands"),
        tTs = cueIn(id, "timestamp"), tDf = cueIn(id, "different"), tDn = cueIn(id, "downsampling");
  const W = 700, H = 500;
  const body = card(`${id}-c`, 48, 80, W, H, `
    ${EYEBROW("one moment", 36, 22, M)}
    ${tileHTML(F, M, `id="${id}-tile"`)}
    ${T("t = 12.400 s", 194, 92, 32, { weight: 700, color: M, id: `${id}-t` })}
    ${streamRows(id, F, M, [290, 660])}`, "overflow:hidden");   // rows slide in from x -120: inside the card's edge (checkpoint 2026-10-17)
  let js = wipeUp(`#${id}-c`, 0) + "\n" + show(`#${id}-tile`, tS, 0.35, "scale:0.6", "scale:1") + show(`#${id}-t`, tS + 0.4);
  const at = [tC, tC + 0.45, tJ, tCo, tTs];
  js += at.map((t, k) => `tl.fromTo("#${id}-r${k}",{opacity:0,x:-120},{opacity:1,x:0,duration:0.45,ease:"power3.out"},${f3(t)});\n`).join("");
  js += STREAMS.map((_, k) => loop(`#${id}-tk${k}`, "strokeDashoffset", 0, -TICK, tDf, D, RATE[k])).join("");
  js += [0, 1].map(k => hide(`#${id}-tk${k}`, tDn, 0.4) + show(`#${id}-tf${k}`, tDn, 0.4) + loop(`#${id}-tf${k}`, "strokeDashoffset", 0, -2 * TICK, tDn, D, RATE[k] * 2)).join("");
  js += exitIfFree(id, D, [`#${id}-c`]);
  emit(id, D, body, js);
}

if (want("g09")) {
  const id = "g09", D = dur(id), F = fg(id), M = dim(id);
  const tSy = cueIn(id, "sync"), tCr = cueIn(id, "crashes"), tQ = cueIn(id, "quietly");
  const W = 700, H = 560, SC = 0.5;
  // all five streams stitched to one clock, ticks on the same verticals; dashed guides mark them
  const guides = [...Array(Math.floor((TRK[1] - TRK[0]) / TICK) + 1).keys()].map(i => `<line x1="${TRK[0] + 2 + i * TICK}" y1="${ROW0 - 8}" x2="${TRK[0] + 2 + i * TICK}" y2="${ROW0 + 5 * ROWP - 4}" stroke="${M}" stroke-width="2" stroke-dasharray="4 6"/>`).join("");
  const body = card(`${id}-c`, 48, 80, W, H, `
    ${EYEBROW("one moment", 36, 22, M)}
    ${tileHTML(F, M)}
    ${T("t = 12.400 s", 194, 92, 32, { weight: 700, color: M })}
    <svg id="${id}-gd" style="position:absolute;left:0;top:0;overflow:visible" width="${W}" height="${H}">${guides}</svg>
    ${streamRows(id, F, M, TRK, 2)}
    <div id="${id}-ok" style="position:absolute;left:36px;top:${H - 76}px;display:flex;align-items:center;gap:12px">
      <svg width="34" height="34" viewBox="0 0 34 34"><circle cx="17" cy="17" r="15" fill="none" stroke="${F}" stroke-width="3"/><path d="M10,17 L15,22 L24,12" fill="none" stroke="${F}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <span style="font-family:SatoshiBold,Satoshi;font-weight:700;font-size:34px;color:${F}">no errors</span></div>
    ${tableScene(id, 500, H - 30 - Math.round(506 * SC), SC, F, M)}
    <svg id="${id}-ms" style="position:absolute;left:0;top:0;overflow:visible;opacity:0" width="${W}" height="${H}"><circle cx="${500 + BLOCK[0] * SC}" cy="${H - 30 - Math.round(506 * SC) + BLOCK[1] * SC}" r="24" fill="none" stroke="${F}" stroke-width="3" stroke-dasharray="5 6"/></svg>
    <div id="${id}-mt" style="position:absolute;left:0;top:0">
      ${T("missed", 600, H - 30 - Math.round(506 * SC) - 46, 28, { weight: 700, color: F })}
      <svg style="position:absolute;left:0;top:0;overflow:visible" width="${W}" height="${H}"><line x1="650" y1="${H - 30 - Math.round(506 * SC) - 8}" x2="650" y2="${H - 30 - Math.round(506 * SC) + BLOCK[1] * SC - 28}" stroke="${F}" stroke-width="2.5" stroke-dasharray="4 6"/></svg></div>`);
  let js = `tl.fromTo("#${id}-c",{opacity:1},{opacity:1,duration:0.2},0);\n` + show(`#${id}-gd`, 0, 0.3);
  // "sync": the joint row slips half a tick off the guides and stays there; nothing turns red
  js += `tl.fromTo("#${id}-sv2",{x:0},{x:${TICK / 2},duration:0.35,ease:"power2.inOut",immediateRender:false},${f3(tSy)});\n`;
  js += show(`#${id}-ok`, tCr, 0.35, "y:10", "y:0");
  const reach = reachFor(false);
  js += humIdle(`${id}-h`, 0, tQ - 0.8, 3);
  js += humArm(`${id}-h`, "R", { a: 0, b: 0, g: 0 }, { ...reach, g: 0 }, tQ - 0.6, 0.7) + humArm(`${id}-h`, "R", { ...reach, g: 0 }, { ...reach, g: 1 }, tQ + 0.5, 0.3);
  // the gripper closes on nothing: mark where the block is, and say so (checkpoint call 5, 2026-10-17)
  js += show(`#${id}-ms`, tQ + 0.85, 0.3) + show(`#${id}-mt`, tQ + 0.95, 0.3, "y:8", "y:0");
  js += exitIfFree(id, D, [`#${id}-c`]);
  emit(id, D, body, js);
}

// --------------------------------------------------------------- g10 series
if (want("g10")) {
  const id = "g10", D = dur(id), F = fg(id), M = dim(id);
  const tW = cueIn(id, "13"), tN = cueIn(id, "not"), tE = cueIn(id, "engine");
  // what the series covers, each on its words (human 2026-10-17)
  const CH = [["Concepts of DE", cueIn(id, "concepts")], ["Modern Data Stack", cueIn(id, "modern")], ["Applied AI", cueIn(id, "applied")]];
  const W = 700, H = 500, x0 = 50, x1 = 650;
  const ticks = [...Array(13).keys()].map(i => x0 + i * (x1 - x0) / 12);
  const body = card(`${id}-c`, 48, 120, W, H, `
    ${T("13 weeks", 40, 28, 72, { weight: 900, color: F, id: `${id}-h` })}
    <svg id="${id}-line" style="position:absolute;left:0;top:130px;overflow:visible" width="${W}" height="70">
      <line class="dr" x1="${x0}" y1="20" x2="${x1}" y2="20" pathLength="1" stroke="${F}" stroke-width="3"/>
      ${ticks.map((x, i) => `<circle id="${id}-k${i}" cx="${x}" cy="20" r="${i ? 7 : 11}" fill="${i ? C.bg : C.accent}" stroke="${i ? F : C.accent}" stroke-width="3"/><text id="${id}-kt${i}" x="${x}" y="62" text-anchor="middle" font-family="SatoshiBold" font-size="28" fill="${M}">${i % 3 === 0 ? i + 1 : ""}</text>`).join("")}
    </svg>
    <div id="${id}-l1" style="position:absolute;left:40px;top:236px;font-family:Satoshi;font-variation-settings:'wght' 700;font-size:38px;color:${F};white-space:nowrap">${struck(`${id}-s`, "a robot", F, 4)} data platform, in public</div>
    ${T("the engine behind it", 40, 296, 38, { weight: 900, color: F, id: `${id}-l2` })}
    <div style="position:absolute;left:40px;top:390px;display:flex;gap:12px">${CH.map(([t], k) => `<div id="${id}-ch${k}" style="padding:9px 12px;border:3px solid ${F};border-radius:10px;font-family:SatoshiBold,Satoshi;font-weight:700;font-size:24px;color:${F};white-space:nowrap">${t}</div>`).join("")}</div>`);
  let js = wipeUp(`#${id}-c`, 0) + "\n" + rowUp(`#${id}-h`, tW - 0.3);
  js += drawAll(`#${id}-line .dr`, tW, 1.2) + ticks.map((_, i) => show(`#${id}-k${i}`, tW + i * 0.09, 0.2) + show(`#${id}-kt${i}`, tW + i * 0.09, 0.2)).join("");
  js += `tl.fromTo("#${id}-k0",{scale:1,transformOrigin:"50% 50%"},{scale:1.35,transformOrigin:"50% 50%",duration:0.7,yoyo:true,repeat:${Math.floor((D - tW - 1.5) / 0.7)},ease:"sine.inOut",immediateRender:false},${f3(tW + 1.5)});\n`;
  js += rowUp(`#${id}-l1`, tW + 1.6) + strikeIn(`${id}-s`, tN) + rowUp(`#${id}-l2`, tE);
  js += CH.map(([, t], k) => show(`#${id}-ch${k}`, t - 0.1, 0.3, "y:14", "y:0")).join("");
  js += exitIfFree(id, D, [`#${id}-c`]);
  emit(id, D, body, js);
}

// ------------------------------------------------------------- g11 the kit
if (want("g11")) {
  const id = "g11", D = dur(id), F = fg(id), M = dim(id);
  const tI = cueIn(id, "invested"), tL = cueIn(id, "leader"), tY = cueIn(id, "yantra");
  const W = 700, H = 560, pw = 636, ph = 424;
  const photo = (k, f) => `<div id="${id}-ph${k}" style="position:absolute;left:32px;top:32px;width:${pw}px;height:${ph}px;overflow:hidden;border-radius:4px">
      <img id="${id}-im${k}" src="assets/${f}" style="position:absolute;left:0;top:0;width:${pw}px;height:${ph}px;object-fit:cover"/></div>`;
  const body = card(`${id}-c`, 48, 80, W, H, `
    ${photo(0, "kitbox.jpg")}${photo(1, "kitparts.jpg")}
    ${T("SO-ARM101 Pro, a leader and a follower", 36, ph + 50, 26, { weight: 700, color: F, id: `${id}-cap` })}
    <div id="${id}-chip" style="position:absolute;left:36px;top:${ph + 88}px;font-family:Satoshi;font-variation-settings:'wght' 700;font-size:26px;color:${M};white-space:nowrap"><span style="color:${C.accent}">Yantra</span>: machine, in Sanskrit</div>`, "");
  let js = wipeUp(`#${id}-c`, Math.max(0, tI - 0.3)) + "\n";
  js += `tl.fromTo("#${id}-im0",{scale:1.0,transformOrigin:"50% 50%"},{scale:1.06,transformOrigin:"50% 50%",duration:${f3(tL - tI + 0.6)},ease:"none"},${f3(Math.max(0, tI - 0.3))});\n`;
  js += show(`#${id}-ph1`, tL, 0.4) + `tl.fromTo("#${id}-im1",{scale:1.0,transformOrigin:"50% 50%"},{scale:1.06,transformOrigin:"50% 50%",duration:${f3(D - tL)},ease:"none"},${f3(tL)});\n`;
  js += show(`#${id}-cap`, tL + 0.4) + show(`#${id}-chip`, tY, 0.35, "y:10", "y:0");
  js += exitIfFree(id, D, [`#${id}-c`]);
  emit(id, D, body, js, ["kitbox.jpg", "kitparts.jpg"]);
}

// ------------------------------------------------- g11b leader -> follower
if (want("g11b")) {
  const id = "g11b", D = dur(id), F = fg(id), M = dim(id);
  const tWh = cueIn(id, "white"), tFo = cueIn(id, "follows");
  const W = 700, H = 440;
  const body = card(`${id}-c`, 48, 120, W, H, `
    ${EYEBROW("leader", 60, 30, M)}${EYEBROW("follower", 410, 30, M, `${id}-e2`)}
    <div id="${id}-A">${so101(`${id}-a`, 30, 90, true, F)}</div>
    <div id="${id}-B">${so101(`${id}-b`, 380, 90, false, F)}</div>
    <svg id="${id}-link" style="position:absolute;left:250px;top:200px;overflow:visible" width="140" height="40">
      <line x1="0" y1="20" x2="130" y2="20" stroke="${M}" stroke-width="3" stroke-dasharray="2 14" stroke-linecap="round"/>
      <path d="M122,12 L134,20 L122,28" fill="none" stroke="${M}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
    ${T("joint angles", 226, 248, 32, { weight: 700, color: M, id: `${id}-lbl` })}`);
  let js = `tl.fromTo("#${id}-c",{opacity:1},{opacity:1,duration:0.2},0);\n` + show(`#${id}-B`, tWh, 0.35) + show(`#${id}-e2`, tWh);
  js += show(`#${id}-link`, tFo - 0.2) + show(`#${id}-lbl`, tFo) + loop(`#${id}-link line`, "strokeDashoffset", 0, -32, tFo, D, 0.5);
  const cyc = 1.8, n = Math.max(1, Math.floor((D - tFo) / cyc));
  const pose = (who, lag) => `tl.fromTo("#${id}-${who}-u",{rotation:0,svgOrigin:"91 188"},{rotation:-22,svgOrigin:"91 188",duration:${cyc / 2},yoyo:true,repeat:${2 * n - 1},ease:"sine.inOut",immediateRender:false},${f3(tFo + lag)});\n`
    + `tl.fromTo("#${id}-${who}-f",{rotation:0,svgOrigin:"91 84"},{rotation:30,svgOrigin:"91 84",duration:${cyc / 2},yoyo:true,repeat:${2 * n - 1},ease:"sine.inOut",immediateRender:false},${f3(tFo + lag)});\n`;
  js += pose("a", 0) + pose("b", 0.3);
  js += exitIfFree(id, D, [`#${id}-c`]);
  emit(id, D, body, js);
}

// ---------------------------------------------------------- g12 the dataset loop
if (want("g12")) {
  // Review 2026-10-17: the counter showed 12,000 for 12s, then dropped and climbed, and 12,000 is never
  // said. Now it starts at 0, climbs while rows stack, and becomes the word he says: "thousands".
  // The frame and the command visibly travel INTO the accent row before each row drops on the stack.
  const id = "g12", D = dur(id), F = fg(id), M = dim(id);
  const tSa = cueIn(id, "saw"), tTo = cueIn(id, "told"), tTh = cueIn(id, "thousands");
  const W = 700, H = 520;
  const thumb = (pid, x, y, kind) => `<div id="${pid}" style="position:absolute;left:${x}px;top:${y}px;width:110px;height:72px;border:3px solid ${F};border-radius:6px;background:${C.bg}">
      <svg width="104" height="66">${kind === "frame" ? `<path d="M12,52 L40,24 L58,42 L72,30 L94,52 Z" fill="none" stroke="${F}" stroke-width="3" stroke-linejoin="round"/>` : `<path d="M18,33 H80 M66,20 L82,33 L66,46" fill="none" stroke="${F}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`}</svg></div>`;
  const stackRows = [...Array(7).keys()].map(i => `<div id="${id}-row${i}" style="position:absolute;left:490px;top:${440 - i * 30}px;width:176px;height:24px;border:2.5px solid ${F};border-radius:4px;background:${C.bg}"></div>`).join("");
  const body = card(`${id}-c`, 48, 96, W, H, `
    ${EYEBROW("one row of training data", 36, 22, M)}
    <div style="position:absolute;left:40px;top:84px;width:110px;height:72px;border:2.5px dashed ${C.rule};border-radius:6px"></div>
    <div style="position:absolute;left:40px;top:190px;width:110px;height:72px;border:2.5px dashed ${C.rule};border-radius:6px"></div>
    ${thumb(`${id}-fr`, 40, 84, "frame")}${thumb(`${id}-ar`, 40, 190, "arrow")}
    ${T("what the robot saw", 170, 100, 30, { weight: 700, color: F, id: `${id}-l1` })}
    ${T("what it was told to do", 170, 206, 30, { weight: 700, color: F, id: `${id}-l2` })}
    <div id="${id}-pair" style="position:absolute;left:40px;top:318px;width:256px;height:96px;border:3px solid ${C.accent};border-radius:8px"></div>
    ${stackRows}
    <div id="${id}-cnt" style="position:absolute;left:40px;top:${H - 74}px;font-family:Satoshi;font-variation-settings:'wght' 900;font-size:36px;color:${F};white-space:nowrap"><span id="${id}-n">0</span> <span style="font-variation-settings:'wght' 500;font-size:34px;color:${M}">rows</span></div>`);
  // review round 2: the card held only "0 rows" for ~13s. The frame and the command are there, dimmed,
  // from the entrance; each comes up to full on its own words; the counter appears when rows start.
  let js = `tl.fromTo("#${id}-c",{opacity:1},{opacity:1,duration:0.2},0);\n`;
  // labels quote the line, so they appear ON it; a dimmed label readable 5.6s early was a spoiler (checkpoint 2026-10-17)
  js += `tl.fromTo(["#${id}-fr","#${id}-ar"],{opacity:0},{opacity:0.3,duration:0.4},0.3);\n` + `tl.set(["#${id}-l1","#${id}-l2"],{opacity:0},0);\n`;
  js += `tl.fromTo("#${id}-fr",{opacity:0.3},{opacity:1,duration:0.3,immediateRender:false},${f3(tSa)});\n` + `tl.fromTo("#${id}-l1",{opacity:0},{opacity:1,duration:0.3,immediateRender:false},${f3(tSa)});\n`;
  js += `tl.fromTo("#${id}-ar",{opacity:0.3},{opacity:1,duration:0.3,immediateRender:false},${f3(tTo)});\n` + `tl.fromTo("#${id}-l2",{opacity:0},{opacity:1,duration:0.3,immediateRender:false},${f3(tTo)});\n`;
  js += show(`#${id}-pair`, tTo + 0.5, 0.3);
  js += `tl.fromTo("#${id}-fr",{scale:1,transformOrigin:"50% 50%"},{scale:1.04,transformOrigin:"50% 50%",duration:0.8,yoyo:true,repeat:${Math.max(1, Math.floor((tSa - 0.5) / 0.8))},ease:"sine.inOut",immediateRender:false},0.5);\n`;
  // the two snap into the pair box, side by side
  js += `tl.fromTo("#${id}-fr",{x:0,y:0},{x:12,y:246,duration:0.5,ease:"power2.inOut",immediateRender:false},${f3(tTo + 0.9)});\n`;
  js += `tl.fromTo("#${id}-ar",{x:0,y:0},{x:134,y:140,duration:0.5,ease:"power2.inOut",immediateRender:false},${f3(tTo + 1.0)});\n`;
  // then the filled pair pulses and a row lands on the stack each beat
  const c0 = tTo + 1.7, cyc = 0.9, n = Math.max(1, Math.floor((D - c0) / cyc));
  js += [...Array(7).keys()].map(i => show(`#${id}-row${i}`, c0 + i * cyc * 0.6, 0.25, "y:-40", "y:0")).join("");
  js += `tl.fromTo(["#${id}-pair","#${id}-fr","#${id}-ar"],{scale:1,transformOrigin:"50% 50%"},{scale:0.96,transformOrigin:"50% 50%",duration:${cyc / 2},yoyo:true,repeat:${2 * n - 1},ease:"sine.inOut",immediateRender:false},${f3(c0)});\n`;
  js += show(`#${id}-cnt`, c0, 0.3) + countUp(`#${id}-n`, 0, 999, c0, Math.max(0.5, tTh - c0 - 0.1));
  js += `(function(){ const el=document.querySelector("#${id}-n"); const o={v:0};
  tl.fromTo(o,{v:0},{v:1,duration:0.25,immediateRender:false,onUpdate:()=>{ if (o.v > 0.5) el.textContent="thousands of"; }},${f3(tTh)}); })();\n`;
  js += exitIfFree(id, D, [`#${id}-c`]);
  emit(id, D, body, js);
}

// ------------------------------------------------------------- g13 two cameras
if (want("g13")) {
  // Review 2026-10-17: small photos, cameras hard to find, half the card empty for 8s. Now each photo
  // fills the card on its own cue with an accent ring on the camera; on "eyes" both sit side by side.
  const id = "g13", D = dur(id), F = fg(id), M = dim(id);
  const tW = cueIn(id, "wrist"), tS = cueIn(id, "sidelines"), tE = cueIn(id, "eyes");
  const W = 700, H = 560, PW = 636, PH = 420;
  // object-fit:cover geometry: where an image point (u, v) lands in the box, given object-position
  const cover = (iw, ih, bw, bh, px, py, u, v) => { const k = Math.max(bw / iw, bh / ih), dw = iw * k, dh = ih * k;
    return [u * dw - (dw - bw) * px, v * dh - (dh - bh) * py]; };
  const ring = (rid, x, y, r) => `<svg id="${rid}" style="position:absolute;left:${(x - r - 6).toFixed(0)}px;top:${(y - r - 6).toFixed(0)}px;overflow:visible" width="${2 * r + 12}" height="${2 * r + 12}"><circle class="dr" cx="${r + 6}" cy="${r + 6}" r="${r}" pathLength="1" fill="none" stroke="${C.accent}" stroke-width="6"/></svg>`;
  const [wx, wy] = cover(1350, 1800, PW, PH, 0.5, 0.78, 0.71, 0.68), [fx, fy] = cover(648, 810, PW, PH, 0.5, 0.12, 0.25, 0.20);
  const body = card(`${id}-c`, 48, 80, W, H, `
    <div id="${id}-A" style="position:absolute;left:32px;top:32px;width:${PW}px;height:${PH}px;overflow:hidden;border-radius:4px">
      <img id="${id}-i0" src="assets/wristcam.jpg" style="width:${PW}px;height:${PH}px;object-fit:cover;object-position:50% 78%"/>${ring(`${id}-ra`, wx, wy, 62)}</div>
    <div id="${id}-B" style="position:absolute;left:32px;top:32px;width:${PW}px;height:${PH}px;overflow:hidden;border-radius:4px">
      <img id="${id}-i1" src="assets/frontcam.jpg" style="width:${PW}px;height:${PH}px;object-fit:cover;object-position:50% 12%"/>${ring(`${id}-rb`, fx, fy, 70)}</div>
    ${T("wrist camera: the details", 34, PH + 52, 32, { weight: 900, color: F, id: `${id}-a` })}
    ${T("front camera: the big picture", 34, PH + 52, 32, { weight: 900, color: F, id: `${id}-b` })}
    <div id="${id}-AB" style="position:absolute;left:32px;top:32px;width:${PW}px;height:${PH}px">
      <div style="position:absolute;left:0;top:0;width:310px;height:${PH}px;overflow:hidden;border-radius:4px"><img src="assets/wristcam.jpg" style="width:310px;height:${PH}px;object-fit:cover;object-position:62% 70%"/></div>
      <div style="position:absolute;left:326px;top:0;width:310px;height:${PH}px;overflow:hidden;border-radius:4px"><img src="assets/frontcam.jpg" style="width:310px;height:${PH}px;object-fit:cover;object-position:20% 10%"/></div></div>
    ${T("hands", 34, PH + 52, 32, { weight: 900, color: F, id: `${id}-h1` })}${T("eyes", 360, PH + 52, 32, { weight: 900, color: F, id: `${id}-h2` })}`);
  // g12 hands straight to g13 (review round 2: ~0.9s of bare wall between them): the card and the
  // wrist photo are present from frame 0; the label and the ring land on "wrist"
  let js = `tl.fromTo("#${id}-c",{opacity:1},{opacity:1,duration:0.2},0);\n` + show(`#${id}-a`, tW) + drawAll(`#${id}-ra .dr`, tW + 0.4, 0.5);
  js += `tl.fromTo("#${id}-i0",{scale:1.0,transformOrigin:"50% 50%"},{scale:1.05,transformOrigin:"50% 50%",duration:${f3(tS)},ease:"none"},0);\n`;
  js += show(`#${id}-B`, tS, 0.35) + hide(`#${id}-a`, tS, 0.2) + show(`#${id}-b`, tS + 0.25) + drawAll(`#${id}-rb .dr`, tS + 0.4, 0.5);
  js += `tl.fromTo("#${id}-i1",{scale:1.0,transformOrigin:"50% 50%"},{scale:1.05,transformOrigin:"50% 50%",duration:${f3(tE - tS)},ease:"none"},${f3(tS)});\n`;
  js += show(`#${id}-AB`, tE - 0.2, 0.35) + hide(`#${id}-b`, tE - 0.2, 0.2) + show(`#${id}-h1`, tE + 0.5) + show(`#${id}-h2`, tE + 0.05);
  js += exitIfFree(id, D, [`#${id}-c`]);
  emit(id, D, body, js, ["wristcam.jpg", "frontcam.jpg"]);
}

// ==================================================================== DEMO
// Overlays over the screen sit on OPAQUE panels (panels.json). Marks on a punch-in are mapped
// through demo-spec.json's zoom with mapZoom, from screen-ocr.json boxes. The terminal in this
// recording is LIGHT (cream), so marks are INK, not paper (style.md 2026-09-29's paper rule was
// for dark terminals; the measured background decides). One $accent mark per part.
const INK = C.ink;
const chipOpaque = (id, x, y, txt, extra = "") => `<div id="${id}" class="opaque" style="position:absolute;left:${x}px;top:${y}px;padding:14px 22px;font-family:SatoshiBold,Satoshi;font-weight:700;font-size:28px;white-space:nowrap;${extra}">${txt}</div>`;
const underline = (id, [x0, y0, x1, y1], col = INK, w = 4) => markSVG(x0, y1, x1, y1 + 6, `<line id="${id}" x1="${x0}" y1="${y1 + 3}" x2="${x1}" y2="${y1 + 3}" pathLength="1" stroke="${col}" stroke-width="${w}" stroke-linecap="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>`);
const boxMark = (id, [x0, y0, x1, y1], col = INK, w = 4, pad = 6) => markSVG(x0 - pad, y0 - pad, x1 + pad, y1 + pad, `<rect id="${id}" x="${x0 - pad}" y="${y0 - pad}" width="${x1 - x0 + 2 * pad}" height="${y1 - y0 + 2 * pad}" rx="6" pathLength="1" fill="none" stroke="${col}" stroke-width="${w}" style="stroke-dasharray:1;stroke-dashoffset:1"/>`);
const OCRD = JSON.parse(readFileSync("screen-ocr.json", "utf8"));
// the text's box at the OCR sample nearest t that actually contains it, searching outward up to 6s
// (OCR misses a line on some samples: robot_type reads on 7 of 33 in gZ5)
const ocrAt = (t, re) => {
  const c = OCRD.filter(d => Math.abs(d.t - t) <= 6).sort((a, b) => Math.abs(a.t - t) - Math.abs(b.t - t));
  for (const d of c) { const r = d.runs.find(r => re.test(r[4])); if (r) return [r[0], r[1], r[0] + r[2], r[1] + r[3]]; }
  throw new Error(`OCR: /${re.source}/ not found within 6s of ${t}`);
};

// ---- marks on punch-ins follow the measured LINE PITCH, never the OCR box edges (style.md
// 2026-09-29 "marks follow the line pitch"; technical review 2026-10-17 found every underline half
// a row low on this job, because Vision's boxes here run 44-65px tall on a 47px terminal pitch).
// A line's centre is its OCR box centre; an underline sits 0.40 pitch below it; a box spans half a
// pitch above its first row's centre to half a pitch below its last.
const PITCH = 47;                                                // terminal line pitch, source px (OCR'd)
const lineGeo = (zid, b) => { const [x0, y0, x1, y1] = mapZoom(zid, b), k = zoomItem(zid).zoom / 2;
  // the line's centre is a fixed 0.40 pitch below the glyph tops (OCR box TOP), not the box centre:
  // second technical pass 2026-10-17 measured gZ6/gZ7 boxes ~15px low because those runs are 50-65px tall
  return { x0, x1, yc: y0 + 0.40 * PITCH * k, P: PITCH * k }; };
const underlineL = (id, zid, b, col = INK, w = 5) => { const g = lineGeo(zid, b), y = g.yc + 0.40 * g.P;
  return markSVG(g.x0, y - 3, g.x1, y + 3, `<line id="${id}" x1="${g.x0.toFixed(1)}" y1="${y.toFixed(1)}" x2="${g.x1.toFixed(1)}" y2="${y.toFixed(1)}" pathLength="1" stroke="${col}" stroke-width="${w}" stroke-linecap="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>`); };
const boxRowsGeo = (zid, boxes, padX = 10) => { const gs = boxes.map(b => lineGeo(zid, b));
  return [Math.min(...gs.map(g => g.x0)) - padX, Math.min(...gs.map(g => g.yc)) - 0.46 * gs[0].P,
          Math.max(...gs.map(g => g.x1)) + padX, Math.max(...gs.map(g => g.yc)) + 0.46 * gs[0].P]; };
const boxRows = (id, geo, col = C.accent, w = 5) => { const [x0, y0, x1, y1] = geo;
  return markSVG(x0, y0, x1, y1, `<rect id="${id}" x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" width="${(x1 - x0).toFixed(1)}" height="${(y1 - y0).toFixed(1)}" rx="6" pathLength="1" fill="none" stroke="${col}" stroke-width="${w}" style="stroke-dasharray:1;stroke-dashoffset:1"/>`); };
// all OCR runs at the sample nearest t that match re inside an x range and below a y
const ocrRuns = (t, re, [xa, xb] = [0, 3840], ymin = 0) => {
  const d = OCRD.reduce((a, b) => Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a);
  return d.runs.filter(r => re.test(r[4]) && r[0] >= xa && r[0] <= xb && r[1] >= ymin).map(r => [r[0], r[1], r[0] + r[2], r[1] + r[3]]);
};
// ---- marks from MEASURED INK (snap_ink.py -> ink.json), never from OCR boxes (three review rounds,
// 2026-10-17: OCR-derived marks sat through the glyphs or on the next line). An underline sits 3 source
// px under the ink's bottom (descenders included); a box pads the ink by 4 source px, which leaves a
// gap between boxes on consecutive 47px rows. A missing key FAILS the build.
const INKD = JSON.parse(readFileSync("ink.json", "utf8"));
const inkC = (zid, key, pad = 0) => { const b = INKD[key]; if (!b) throw new Error(`ink.json has no ${key}: run snap_ink.py`);
  return mapZoom(zid, [b[0] - pad, b[1] - pad, b[2] + pad, b[3] + pad]); };
const underlineInk = (id, zid, key, col = INK, w = 4) => { const [x0, , x1, y1] = inkC(zid, key), y = y1 + 2 * zoomItem(zid).zoom / 2 + w / 2;
  return markSVG(x0, y - 3, x1, y + 3, `<line id="${id}" x1="${x0.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y.toFixed(1)}" pathLength="1" stroke="${col}" stroke-width="${w}" stroke-linecap="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>`); };
const boxInkGeo = (zid, keys, pad = 4) => { const bs = keys.map(k => inkC(zid, k, pad));
  return [Math.min(...bs.map(b => b[0])), Math.min(...bs.map(b => b[1])), Math.max(...bs.map(b => b[2])), Math.max(...bs.map(b => b[3]))]; };
const chipOver = (id, x, y, txt, extra = "") => `<div id="${id}" class="opaque" style="position:absolute;left:${x}px;top:${y}px;padding:12px 22px;font-family:SatoshiBold,Satoshi;font-weight:700;font-size:34px;white-space:nowrap;box-shadow:0 6px 18px rgba(0,0,0,.35);${extra}">${txt}</div>`;

if (want("gZ2")) {
  const id = "gZ2", D = dur(id);
  const tS = cueIn(id, "stands");
  // the zoom window ends below the reply's last line: the chip sits in that blank band, not on text
  const body = chipOver(`${id}-chip`, 96, 972, `<span style="color:${C.accent}">paida</span> = physical AI data architect`);
  let js = show(`#${id}-chip`, tS, 0.35, "y:16", "y:0");
  js += exitIfFree(id, D, [`#${id}-chip`]);
  emit(id, D, body, js);
}

if (want("g14")) {
  const id = "g14", D = dur(id), F = fg(id), M = dim(id);
  const tP = cueIn(id, "push-t"), tR = cueIn(id, "robotics"), tD = cueIn(id, "download");
  const W = 760, H = 380, X = 900, Y = 110;
  const body = card(`${id}-c`, X, Y, W, H, `
    <div style="position:absolute;left:32px;top:30px;width:340px;height:220px;border:2.5px solid ${M};border-radius:8px">
      <div style="position:absolute;left:0;top:0;right:0;height:30px;border-bottom:2px solid ${M}"></div>
      <div style="position:absolute;left:18px;top:52px;font-family:Satoshi;font-variation-settings:'wght' 500;font-size:30px;color:${F}">&gt; print("Hello, World")</div>
      <div id="${id}-out" style="position:absolute;left:18px;top:104px;font-family:Satoshi;font-variation-settings:'wght' 500;font-size:30px;color:${M}">Hello, World</div></div>
    ${T("programming", 32, 262, 34, { weight: 700, color: M })}
    <svg style="position:absolute;left:400px;top:30px;overflow:visible" width="320" height="220" viewBox="0 0 320 220">
      <rect x="0" y="0" width="320" height="220" rx="8" fill="none" stroke="${M}" stroke-width="2.5"/>
      <path d="M150,60 h90 v26 h-32 v70 h-26 v-70 h-32 Z" fill="none" stroke="${F}" stroke-width="2.5" stroke-dasharray="7 6"/>
      <g id="${id}-T"><path d="M0,0 h90 v26 h-32 v70 h-26 v-70 h-32 Z" fill="${F}" fill-opacity="0.35" stroke="${F}" stroke-width="3"/></g>
      <circle id="${id}-dot" cx="0" cy="0" r="12" fill="${C.accent}"/>
    </svg>
    ${T("robotics: Push-T", 400, 262, 34, { weight: 700, color: M, id: `${id}-l2` })}
    <div id="${id}-dl" style="position:absolute;left:32px;top:${H - 58}px;display:flex;gap:12px;align-items:center">
      <svg width="30" height="30" viewBox="0 0 30 30"><path d="M15,3 V21 M7,14 L15,22 L23,14 M5,27 H25" fill="none" stroke="${F}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <span style="font-family:SatoshiBold,Satoshi;font-weight:700;font-size:24px;color:${F}">lerobot/pusht from Hugging Face</span></div>`);
  let js = wipeUp(`#${id}-c`, 0.1) + "\n" + show(`#${id}-out`, 0.9);
  // the T starts off-target (rotated, low-left); on "robotics" the dot pushes it into the outline
  js += `tl.fromTo("#${id}-T",{x:70,y:110,rotation:-28,svgOrigin:"45 13"},{x:70,y:110,rotation:-28,svgOrigin:"45 13",duration:0.2},0);\n`;
  js += `tl.fromTo("#${id}-dot",{x:40,y:200},{x:40,y:200,duration:0.2},0);\n`;
  js += show(`#${id}-l2`, tP);
  js += `tl.fromTo("#${id}-dot",{x:40,y:200},{x:118,y:168,duration:0.8,ease:"power2.inOut",immediateRender:false},${f3(tR - 0.8)});\n`;
  js += `tl.fromTo("#${id}-T",{x:70,y:110,rotation:-28,svgOrigin:"45 13"},{x:150,y:60,rotation:0,svgOrigin:"45 13",duration:2.2,ease:"power2.inOut",immediateRender:false},${f3(tR)});\n`;
  js += `tl.fromTo("#${id}-dot",{x:118,y:168},{x:200,y:166,duration:2.2,ease:"power2.inOut",immediateRender:false},${f3(tR)});\n`;
  js += `tl.fromTo("#${id}-dot",{scale:1,transformOrigin:"50% 50%"},{scale:1.25,transformOrigin:"50% 50%",duration:0.6,yoyo:true,repeat:${Math.floor((D - tR - 2.4) / 0.6)},ease:"sine.inOut",immediateRender:false},${f3(tR + 2.4)});\n`;
  js += show(`#${id}-dl`, tD, 0.35, "y:10", "y:0");
  js += exitIfFree(id, D, [`#${id}-c`]);
  emit(id, D, body, js);
}

if (want("gZ3")) {
  // the stat at statMinFontPx 160 (review 2026-10-17: it was ~90px), left of the zoomed sim panel
  const id = "gZ3", D = dur(id);
  const t206 = cueIn(id, "206"), tE = cueIn(id, "episode");
  const body = `<div id="${id}-chip" class="opaque" style="position:absolute;left:60px;top:560px;padding:20px 30px;width:440px;box-shadow:0 6px 18px rgba(0,0,0,.35)">
      <div id="${id}-n" style="font-family:Satoshi;font-variation-settings:'wght' 900;font-size:160px;line-height:1">0</div>
      <div style="font-family:Satoshi;font-variation-settings:'wght' 700;font-size:34px;margin-top:22px">episodes</div>
      <div id="${id}-sub" style="font-family:SatoshiBold,Satoshi;font-weight:700;font-size:28px;color:#B9B2A8;margin-top:6px">one human attempt each</div></div>`;
  let js = show(`#${id}-chip`, t206 - 0.9, 0.3, "y:16", "y:0") + countUp(`#${id}-n`, 0, 206, t206 - 0.9, 0.9) + show(`#${id}-sub`, tE, 0.3);
  js += exitIfFree(id, D, [`#${id}-chip`]);
  emit(id, D, body, js);
}

if (want("gZ4")) {
  const id = "gZ4", D = dur(id);
  const tS = cueIn(id, "state"), tA = cueIn(id, "action"), tI = cueIn(id, "identical"), tP = cueIn(id, "pushes back");   // the phrase: a bare "pushes" lands 2.2s early on "a robot pushes on"
  // top-right, over each panel's own header icons, not its axis labels (technical review 2026-10-17)
  const R = (txt, k, y) => chipOver(`${id}-c${k}`, 0, y, txt, "right:96px;left:auto;");
  const body = R("state: where the pusher is", 1, 60) + R("action: where it was told to go", 2, 60)
    + R("almost identical, never exact", 3, 60) + R(`<span style="color:${C.accent}">the object pushes back</span>`, 4, 140);
  // no deviation brackets: the speaker points at the difference on screen himself (human 2026-10-17)
  let js = show(`#${id}-c1`, tS, 0.3, "y:14", "y:0") + hide(`#${id}-c1`, tA - 0.3, 0.25)
         + show(`#${id}-c2`, tA, 0.3, "y:14", "y:0") + hide(`#${id}-c2`, tI - 0.4, 0.25)
         + show(`#${id}-c3`, tI, 0.3, "y:14", "y:0") + show(`#${id}-c4`, tP, 0.3, "y:14", "y:0");
  js += exitIfFree(id, D, [`#${id}-c3`, `#${id}-c4`]);
  emit(id, D, body, js);
}

if (want("g15")) {
  const id = "g15", D = dur(id), F = fg(id), M = dim(id);
  const tM = cueIn(id, "missing");
  const W = 800, H = 420, X = 560, Y = 120;
  const rows = [["camera", 0, 66], ["state", 22, 52], ["action", 9, 40]];
  const body = card(`${id}-c`, X, Y, W, H, `
    ${EYEBROW("three sources, three clocks", 40, 28, M)}
    ${rows.map(([n, off, pitch], k) => `<div id="${id}-r${k}" style="position:absolute;left:0;top:${80 + k * 70}px;width:${W}px;height:50px">
        ${T(n, 40, 10, 26, { weight: 700, color: F })}
        <svg style="position:absolute;left:170px;top:6px;overflow:hidden" width="580" height="40">
          <g id="${id}-tk${k}">${[...Array(Math.ceil(620 / pitch)).keys()].map(i => `<rect x="${off + i * pitch}" y="4" width="6" height="32" rx="2" fill="${F}"/>`).join("")}</g></svg></div>`).join("")}
    <div id="${id}-mrg" style="position:absolute;left:0;top:${80 + 3 * 70 + 10}px;width:${W}px;height:60px">
      ${T("one row", 40, 14, 26, { weight: 900, color: C.accent, id: `${id}-or` })}
      <svg style="position:absolute;left:170px;top:8px" width="580" height="44">${[...Array(12).keys()].map(i => `<rect id="${id}-m${i}" x="${i * 48}" y="2" width="40" height="40" rx="4" fill="none" stroke="${C.accent}" stroke-width="3.5"/>`).join("")}</svg></div>`);
  let js = wipeUp(`#${id}-c`, 0.1) + "\n";
  js += rows.map((r, k) => loop(`#${id}-tk${k}`, "x", 0, -r[2], 0, tM, [0.9, 0.7, 0.5][k])).join("");
  // on "missing": the three snap to one shared grid, then stitch into one row; one cell is the gap
  js += rows.map((r, k) => `tl.fromTo("#${id}-tk${k}",{x:${-r[1]},scaleX:1},{x:${-r[1]},scaleX:${(48 / r[2]).toFixed(3)},transformOrigin:"${r[1]}px 0px",duration:0.6,ease:"power2.inOut",immediateRender:false},${f3(tM)});\n`).join("");
  js += [...Array(12).keys()].map(i => show(`#${id}-m${i}`, tM + 0.7 + i * 0.07, 0.2)).join("");
  js += `tl.set("#${id}-or",{opacity:0},0);\n` + show(`#${id}-or`, tM + 0.7, 0.3);   // with the row (checkpoint 2026-10-17)
  js += `tl.fromTo("#${id}-m6",{opacity:1},{opacity:0.15,duration:0.25,yoyo:true,repeat:3,immediateRender:false},${f3(tM + 1.7)});\n`;
  js += `tl.fromTo("#${id}-m6",{fill:"rgba(0,0,0,0)"},{fill:"${C.accent}",duration:0.3,immediateRender:false},${f3(tM + 2.9)});\n`;
  js += loop(`#${id}-mrg svg`, "x", 0, -48, tM + 3.3, D, 1.2);
  js += exitIfFree(id, D, [`#${id}-c`]);
  emit(id, D, body, js);
}

if (want("g16")) {
  const id = "g16", D = dur(id), F = fg(id), M = dim(id);
  const tMe = cueIn(id, "metadata"), tTa = cueIn(id, "tabular"), tMp = cueIn(id, "mp4");
  const W = 640, H = 400, X = 1200, Y = 90;
  const folder = (k, y, name, kind, what) => `<div id="${id}-f${k}" style="position:absolute;left:32px;top:${y}px;width:${W - 64}px;height:96px">
      <svg width="80" height="64" viewBox="0 0 80 64" style="position:absolute;left:0;top:12px"><path d="M4,10 h24 l8,8 h40 v40 h-72 Z" fill="none" stroke="${F}" stroke-width="4" stroke-linejoin="round"/></svg>
      <div style="position:absolute;left:100px;top:8px;font-family:Satoshi;font-variation-settings:'wght' 700;font-size:30px;color:${F}">${name}</div>
      <div style="position:absolute;left:100px;top:50px;font-family:SatoshiBold,Satoshi;font-weight:700;font-size:24px;color:${M}">${kind}: ${what}</div></div>`;
  const body = card(`${id}-c`, X, Y, W, H, `
    ${EYEBROW("a LeRobot dataset", 32, 26, M)}
    ${folder(0, 64, "meta/", "JSON", "what the data is")}
    ${folder(1, 168, "data/", "Parquet", "every number, every frame")}
    ${folder(2, 272, "videos/", "MP4", "every camera frame")}
    <div id="${id}-hl" style="position:absolute;left:20px;top:64px;width:6px;height:96px;border-radius:3px;background:${C.accent}"></div>`);
  let js = wipeUp(`#${id}-c`, 0.1) + "\n";
  js += [tMe, tTa, tMp].map((t, k) => rowUp(`#${id}-f${k}`, t)).join("");
  // the accent marker sits on the part being narrated, and walks with the speaker
  js += show(`#${id}-hl`, tMe, 0.3) + `tl.fromTo("#${id}-hl",{y:0},{y:104,duration:0.4,ease:"power2.inOut",immediateRender:false},${f3(tTa)});\n`
      + `tl.fromTo("#${id}-hl",{y:104},{y:208,duration:0.4,ease:"power2.inOut",immediateRender:false},${f3(tMp)});\n`;
  js += `tl.fromTo("#${id}-c",{y:0},{y:-6,duration:2.5,yoyo:true,repeat:${Math.floor(D / 2.5) - 1},ease:"sine.inOut",immediateRender:false},0.6);\n`;
  js += exitIfFree(id, D, [`#${id}-c`]);
  emit(id, D, body, js);
}

if (want("gZ5")) {
  const id = "gZ5", D = dur(id), [s] = span(id);
  const tU = cueIn(id, "robot type"), t206 = cueIn(id, "206"), tF = cueIn(id, "25650"), tFps = cueIn(id, "10");
  const [p0, p1] = plateau("gZ5a", s);
  // the terminal scrolls at ~683.0: the first framing's marks are gone before it (review round 2)
  const off1 = Math.min(p1, 682.6 - s) - 0.25;
  const lines = [["gZ5/robot_type", tU], ["gZ5/total_episodes", t206], ["gZ5/total_frames", tF], ["gZ5/fps", tFps]];
  let body = "", js = "";
  lines.forEach(([key, t], k) => { body += underlineInk(`${id}-u${k}`, "gZ5a", key, k === 3 ? C.accent : INK, 5);
    js += drawAll(`#${id}-u${k}`, Math.max(t, p0), 0.35) + hide(`#${id}-u${k}`, off1, 0.25)
      + `tl.fromTo("#${id}-u${k}",{y:3},{y:0,duration:0.35,ease:"power2.out",immediateRender:false},${f3(Math.max(t, p0))});\n`; });
  const [q0, q1] = plateau("gZ5c", s);
  const tDP = cueIn(id, "data path"), tVP = cueIn(id, "video path");
  [["gZ5/data_path", tDP], ["gZ5/video_path", tVP]].forEach(([key, t], k) => {
    body += underlineInk(`${id}-v${k}`, "gZ5c", key, INK, 5);
    js += drawAll(`#${id}-v${k}`, Math.max(q0, t), 0.35) + hide(`#${id}-v${k}`, Math.min(q1, 689.3 - s) - 0.25, 0.2)
      + `tl.fromTo("#${id}-v${k}",{y:3},{y:0,duration:0.35,ease:"power2.out",immediateRender:false},${f3(Math.max(q0, t))});\n`; });
  // A marks-only overlay: each mark's own SVG box appears with its mark and goes with it, so the page's
  // layout changes over time (HyperFrames' sweep compares layout; animating only the line inside an
  // always-present SVG read as "timeline did not advance under seek").
  ["u0", "u1", "u2", "u3", "v0", "v1"].forEach(m => { js += `tl.set("svg:has(> #${id}-${m})",{opacity:0},0);\n`; });
  lines.forEach(([, t], k) => { js += `tl.set("svg:has(> #${id}-u${k})",{opacity:1},${f3(Math.max(t, p0))});\n` + `tl.set("svg:has(> #${id}-u${k})",{opacity:0},${f3(off1 + 0.25)});\n`; });
  [tDP, tVP].forEach((t, k) => { js += `tl.set("svg:has(> #${id}-v${k})",{opacity:1},${f3(Math.max(q0, t))});\n`; });
  emit(id, D, `<div style="position:absolute;inset:0">${body}</div>`, js);
}

if (want("gZ6")) {
  const id = "gZ6", D = dur(id), [s] = span(id);
  const tF = cueIn(id, "features"), tM = cueIn(id, "missing");
  const [p0, p1] = plateau("gZ6", s);
  const names = ["observation.state", "action", "episode_index", "frame_index", "timestamp"].map(n => `gZ6/${n}`);
  let body = "", js = "";
  const X0 = Math.min(...names.map(k => inkC("gZ6", k)[0]));
  // each box lands ON its spoken word (round 3: OCR order ran 0.7-1.2s ahead of the reading)
  const said = [cueIn(id, "state"), cueIn(id, "action"), cueIn(id, "episode"), cueIn(id, "frame"), cueIn(id, "timestamp")];
  names.forEach((key, k) => { const g = boxInkGeo("gZ6", [key], 4);
    body += boxRows(`${id}-u${k}`, [X0 - 6, g[1], g[2] + 8, g[3]], INK, 4);
    js += drawAll(`#${id}-u${k}`, Math.max(p0, said[k]), 0.3); });
  // the missing column: an OUTLINED dashed marker, as quiet as the five present ones (review round 2:
  // a solid dark chip made the miss louder than the wins), right of the table, level with its first row
  const first = inkC("gZ6", names[0]);
  const xR = mapZoom("gZ6", [1460, 0, 1460, 0])[0];
  body += `<div id="${id}-slot" style="position:absolute;left:${xR.toFixed(0)}px;top:${(first[1] - 10).toFixed(0)}px;padding:10px 18px;border:4px dashed ${INK};border-radius:8px;background:${C.bg};color:${INK};font-family:SatoshiBold,Satoshi;font-weight:700;font-size:30px;white-space:nowrap;line-height:1.3">observation.image?<br><span style="color:${C.muted};font-size:32px">not here: video lives in MP4</span></div>`;
  js += show(`#${id}-slot`, Math.max(p0, tM), 0.35, "x:20", "x:0");
  js += [...names.keys()].map(k => hide(`#${id}-u${k}`, p1 - 0.3, 0.25)).join("") + hide(`#${id}-slot`, p1 - 0.3, 0.25);
  emit(id, D, `<div style="position:absolute;inset:0">${body}</div>`, js);
}

if (want("gZ7")) {
  const id = "gZ7", D = dur(id), [s] = span(id);
  const tFirst = cueIn(id, "first");
  const [p0, p1] = plateau("gZ7", s);
  const g0 = boxInkGeo("gZ7", ["gZ7/first_ts", "gZ7/zeros"], 8), geo = [g0[0], g0[1], g0[2] + 6, g0[3]];
  const body = boxRows(`${id}-b`, geo, C.accent, 5)
    + chipOver(`${id}-lbl`, Math.round(geo[0]), Math.round(geo[3] + 44), "resets to 0.0 every episode");
  // the box marks the column as it is named ("first"); the label paraphrases "is always 0.0", so it
  // lands on "always", not before it (style: copy that quotes speech lands on its cue; 2026-10-17 QA)
  const tAlw = cueIn(id, "always");
  let js = drawAll(`#${id}-b`, Math.max(p0, tFirst), 0.4) + show(`#${id}-lbl`, Math.max(p0, tFirst + 0.4, tAlw), 0.3);
  js += hide(`#${id}-b`, p1 - 0.2, 0.2) + hide(`#${id}-lbl`, p1 - 0.2, 0.2);
  emit(id, D, `<div style="position:absolute;inset:0">${body}</div>`, js);
}

// ---------------------------------------------------- g16b the relational join
// Checkpoint call 3 (2026-10-17): "the json metadata behaves like a relational join ... helps you join
// these two data". The paths are off screen by then, so the join is drawn: Parquet rows on the left,
// MP4 files on the right, an $accent line between the episode_index columns (the one accent).
if (want("g16b")) {
  const id = "g16b", D = dur(id), F = fg(id), M = dim(id);
  const tRel = cueIn(id, "relational"), tJ = cueIn(id, "join");
  const W = 1060, H = 420, X = 560, Y = 120;          // wide enough for "episode_index" whole; clear of the inset (y < 600)
  const cell = (x, y, w, txt, k, hl) => `<div ${hl ? `id="${id}-${hl}"` : ""} style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:40px;border:2px solid ${C.rule};${k ? "" : `background:${C.rule}55;`}font-family:SatoshiBold,Satoshi;font-weight:700;font-size:24px;line-height:40px;padding-left:10px;box-sizing:border-box;color:${k ? F : M};white-space:nowrap">${txt}</div>`;
  const PR = [["frame", "timestamp", "episode_index"], ["0", "0.0", "0"], ["1", "0.1", "0"], ["0", "0.0", "1"]];
  const VR = [["episode_index", "file", "from"], ["0", "file-000.mp4", "0.0 s"], ["1", "file-000.mp4", "16.1 s"]];
  const PW = [80, 144, 212], VW = [212, 172, 96], KEY = { p: 2, v: 0 }, VX = 540;
  const tbl = (x0, rows, ws, tag) => rows.map((r, k) => r.map((c, j) => cell(x0 + ws.slice(0, j).reduce((a, b) => a + b, 0), 96 + k * 40, ws[j], c, k, j === KEY[tag] && k > 0 ? `${tag}${k}` : "")).join("")).join("");
  const body = card(`${id}-c`, X, Y, W, H, `
    ${EYEBROW("the metadata joins the two", 36, 26, M)}
    ${T("data/ · Parquet", 36, 58, 24, { weight: 700, color: F })}${T("videos/ · MP4", VX, 58, 24, { weight: 700, color: F })}
    ${tbl(36, PR, PW, "p")}${tbl(VX, VR, VW, "v")}
    <svg id="${id}-jn" style="position:absolute;left:0;top:0;overflow:visible" width="${W}" height="${H}">
      ${[[1, 1], [2, 1], [3, 2]].map(([pr, vr]) => { const x0 = 36 + PW.reduce((a, b) => a + b, 0), y0 = 96 + pr * 40 + 20, y1 = 96 + vr * 40 + 20;
        return `<path class="dr" d="M${x0 + 4},${y0} C${x0 + 52},${y0} ${VX - 52},${y1} ${VX - 4},${y1}" pathLength="1" fill="none" stroke="${C.accent}" stroke-width="5" stroke-linecap="round"/>`; }).join("")}</svg>
    ${T("join on episode_index", 36, 300, 30, { weight: 900, color: F, id: `${id}-lab` })}
    ${T("then seek to from + timestamp", 36, 346, 24, { weight: 500, color: M, id: `${id}-sub` })}`);
  let js = wipeUp(`#${id}-c`, 0.1) + "\n";
  js += drawAll(`#${id}-jn .dr`, tRel, 0.6) + show(`#${id}-lab`, tRel + 0.3, 0.3, "y:10", "y:0");
  // on "join" the matching episode_index cells light up together, in step
  js += ["p1", "p2", "v1", "p3", "v2"].map((c, k) => `tl.fromTo("#${id}-${c}",{backgroundColor:"rgba(0,0,0,0)"},{backgroundColor:"${C.accentSoft}",duration:0.3,immediateRender:false},${f3(tJ + (c.endsWith("3") || c === "v2" ? 0.5 : 0))});\n`).join("");
  js += show(`#${id}-sub`, tJ + 1.2, 0.3);
  js += exitIfFree(id, D, [`#${id}-c`]);
  emit(id, D, body, js);
}

// ------------------------------------------------ g17 + gZ8 the film strip
const STRIP = { X: 1150, Y: 40, W: 700, H: 440 };   // Y 80 -> 40: the card sat 10px above the face inset (checkpoint 2026-10-17)
const stripHTML = (id, F, M) => {
  const sx = 40, sw = STRIP.W - 80, sy = 150;
  const holes = [...Array(30).keys()].map(i => `<rect x="${sx + 8 + i * 21}" y="${sy + 6}" width="9" height="7" rx="1.5" fill="${M}"/><rect x="${sx + 8 + i * 21}" y="${sy + 67}" width="9" height="7" rx="1.5" fill="${M}"/>`).join("");
  const eps = [[0, 0, 0.28], [1, 0.28, 0.62], [2, 0.62, 1.0]];
  return `${EYEBROW("file-000.mp4", 40, 30, M)}
    <svg id="${id}-strip" style="position:absolute;left:0;top:0;overflow:visible" width="${STRIP.W}" height="${STRIP.H}">
      <rect class="dr" x="${sx}" y="${sy}" width="${sw}" height="80" rx="6" pathLength="1" fill="none" stroke="${F}" stroke-width="3.5"/>
      <g id="${id}-holes">${holes}</g>
      ${eps.map(([k, a, b]) => `<g id="${id}-ep${k}"><rect x="${sx + a * sw + 3}" y="${sy + 18}" width="${(b - a) * sw - 6}" height="44" rx="4" fill="${k === 1 ? C.rule : C.rule}" fill-opacity="${k === 1 ? 0.9 : 0.5}" stroke="${F}" stroke-width="2"/>
          <text x="${sx + (a + b) / 2 * sw}" y="${sy + 48}" text-anchor="middle" font-family="SatoshiBold" font-size="24" fill="${C.ink}">episode ${k}</text>
          <line x1="${sx + a * sw}" y1="${sy + 86}" x2="${sx + a * sw}" y2="${sy + 104}" stroke="${F}" stroke-width="3"/>
          <text x="${sx + a * sw + (k ? -4 : 0)}" y="${sy + 132}" text-anchor="${k ? "middle" : "start"}" font-family="SatoshiBold" font-size="24" fill="${M}">${["0.0", "16.1", "27.9"][k]}</text></g>`).join("")}
      <line x1="${sx + sw}" y1="${sy + 86}" x2="${sx + sw}" y2="${sy + 104}" stroke="${F}" stroke-width="3"/>
      <text x="${sx + sw}" y="${sy + 132}" text-anchor="end" font-family="SatoshiBold" font-size="24" fill="${M}">42.0 s</text>
      <text x="${sx}" y="${sy + 166}" font-family="SatoshiBold" font-size="30" fill="${M}">v_from / v_to, seconds into the file</text>
      <g id="${id}-mk"><line x1="${sx + 0.28 * sw + 18}" y1="${sy - 26}" x2="${sx + 0.28 * sw + 18}" y2="${sy + 70}" stroke="${C.accent}" stroke-width="5" stroke-linecap="round"/><circle cx="${sx + 0.28 * sw + 18}" cy="${sy - 30}" r="8" fill="${C.accent}"/></g>
    </svg>
    <div id="${id}-fx" style="position:absolute;left:40px;top:336px;font-family:Satoshi;font-variation-settings:'wght' 700;font-size:30px;color:${F};white-space:nowrap">video position = <span style="font-variation-settings:'wght' 900">v_from</span> + <span style="font-variation-settings:'wght' 900">timestamp</span></div>
    <div id="${id}-ex" style="position:absolute;left:40px;top:384px;font-family:SatoshiBold,Satoshi;font-weight:700;font-size:30px;color:${M};white-space:nowrap">episode 1, frame 1: 16.1 + 0.1 = 16.2 s</div>`;
};
if (want("g17")) {
  const id = "g17", D = dur(id), F = fg(id), M = dim(id);
  const tB = cueIn(id, "big"), tS = cueIn(id, "second");
  const body = card(`${id}-c`, STRIP.X, STRIP.Y, STRIP.W, STRIP.H, stripHTML(id, F, M));
  let js = wipeUp(`#${id}-c`, Math.max(0, tB - 0.4)) + "\n" + drawAll(`#${id}-strip .dr`, tB, 0.8) + show(`#${id}-holes`, tB + 0.5, 0.4);
  js += [0, 1, 2].map(k => show(`#${id}-ep${k}`, tS + k * 0.45, 0.3, "y:8", "y:0")).join("");
  js += `tl.set("#${id}-mk",{opacity:0},0);\n` + `tl.set("#${id}-fx",{opacity:0},0);\n` + `tl.set("#${id}-ex",{opacity:0},0);\n`;
  js += loop(`#${id}-holes`, "x", 0, -21, tB + 0.9, D, 0.8);
  emit(id, D, body, js);
}
if (want("gZ8")) {
  const id = "gZ8", D = dur(id), F = fg(id), M = dim(id), [s] = span(id);
  const tJ = cueIn(id, "join"), tSt = cueIn(id, "start");
  const [p0, p1] = plateau("gZ8", s);
  const body = card(`${id}-c`, STRIP.X, STRIP.Y, STRIP.W, STRIP.H, stripHTML(id, F, M))
    + boxRows(`${id}-b`, (g => [g[0] - 6, g[1], g[2] + 4, g[3] + 10])(boxInkGeo("gZ8", ["gZ8/video_position", "gZ8/values"], 8)), C.accent, 5);
  // carried over from g17 with no entrance (its last frame), then the formula and the marker
  let js = `tl.fromTo("#${id}-c",{opacity:1},{opacity:1,duration:0.2},0);\n` + `tl.fromTo("#${id}-strip .dr",{strokeDashoffset:0},{strokeDashoffset:0,duration:0.2},0);\n`;
  js += show(`#${id}-fx`, tJ, 0.35, "y:10", "y:0") + show(`#${id}-mk`, tJ + 0.6, 0.3, "y:-30", "y:0") + show(`#${id}-ex`, tJ + 1.2, 0.3);
  js += loop(`#${id}-holes`, "x", 0, -21, 0, tSt, 0.8);
  // the punch-in on the real result takes over at "start": the card steps aside, the column is boxed
  // the card is gone BEFORE the zoom starts (final check: it overlapped the zoom's first 0.4s)
  js += wipeDown(`#${id}-c`, Math.max(0.5, zoomItem("gZ8").start - s - 0.4), 0.3) + "\n";
  js += drawAll(`#${id}-b`, Math.max(p0, tSt) + 0.2, 0.4) + hide(`#${id}-b`, p1 - 0.3, 0.25);
  emit(id, D, body, js);
}

// =================================================================== OUTRO

// ------------------------------------------------- g18 edit-timeline takeover
if (want("g18")) {
  const id = "g18", D = dur(id), F = C.ink, M = C.muted;
  const tC = cueIn(id, "cameras"), tL = cueIn(id, "lips"), tN = cueIn(id, "nothing"), tLate = cueIn(id, "late");
  const dust = dustHTML(id, D, 11);
  const X0 = 300, X1 = 1760, rowH = 120;
  const mouth = (x, open, k) => `<g transform="translate(${x},0)"><rect x="0" y="0" width="96" height="78" rx="8" fill="${C.bg}" stroke="${F}" stroke-width="3"/>
      <circle cx="48" cy="30" r="16" fill="none" stroke="${F}" stroke-width="3"/>
      ${open ? `<ellipse cx="48" cy="58" rx="12" ry="8" fill="${F}"/>` : `<line x1="38" y1="58" x2="58" y2="58" stroke="${F}" stroke-width="3" stroke-linecap="round"/>`}</g>`;
  const OPEN = [1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 1];
  const vclips = OPEN.map((o, i) => mouth(i * 108, o, i)).join("");
  const wave = OPEN.map((o, i) => { const x = i * 108 + 48; const a = o ? 30 : 6;
    return `<path d="M${x - 40},40 ${[...Array(9).keys()].map(j => `L${x - 40 + j * 10},${40 + (j % 2 ? -a : a) * (1 - Math.abs(j - 4) / 5)}`).join(" ")}" fill="none" stroke="${F}" stroke-width="3" stroke-linejoin="round"/>`; }).join("");
  const guides = OPEN.map((o, i) => o ? `<line x1="${i * 108 + 48}" y1="0" x2="${i * 108 + 48}" y2="${2 * rowH + 40}" stroke="${M}" stroke-width="2" stroke-dasharray="4 6"/>` : "").join("");
  // the robot track carries DISCRETE events, a gripper close on each beat a mouth opens, so its slip
  // visibly misses the same dashed guides the audio misses (review 2026-10-17: a smooth sine had
  // nothing to fall out of step)
  const robotTrace = OPEN.map((o, i) => o ? `<g transform="translate(${i * 108 + 48},40)"><rect x="-14" y="-24" width="28" height="48" rx="6" fill="${F}"/><path d="M-8,-30 v-8 M8,-30 v-8" stroke="${F}" stroke-width="4" stroke-linecap="round"/></g>` : `<line x1="${i * 108 + 20}" y1="40" x2="${i * 108 + 76}" y2="40" stroke="${F}" stroke-width="3"/>`).join("");
  const body = PAGE + dust.html + GRAIN_HTML + `
  <div id="${id}-zoom" style="position:absolute;inset:0">
    ${T("picture and sound, recorded apart, stitched by time", 300, 120, 34, { weight: 700, color: M, id: `${id}-t` })}
    <div style="position:absolute;left:120px;top:250px;width:1680px;height:640px;border:3px solid ${F};border-radius:14px;background:${C.bg}"></div>
    ${["V2", "V1", "A1", "ROBOT"].map((n, k) => `<div id="${id}-lab${k}" style="position:absolute;left:150px;top:${330 + k * rowH + 20}px;font-family:SatoshiBold,Satoshi;font-weight:700;font-size:34px;color:${M}">${n}</div>`).join("")}
    <svg style="position:absolute;left:${X0}px;top:330px;overflow:hidden" width="${X1 - X0}" height="${4 * rowH + 40}">
      <g id="${id}-scroll">
        <g id="${id}-v2" transform="translate(0,0)">${vclips}</g>
        <g transform="translate(0,${rowH})">${vclips}</g>
        <g id="${id}-guides" transform="translate(0,${rowH})">${guides}</g>
        <g id="${id}-a1" transform="translate(0,${2 * rowH})"><rect x="-4" y="0" width="${OPEN.length * 108}" height="80" rx="8" fill="${C.rule}" fill-opacity="0.5"/>${wave}</g>
        <g id="${id}-rb" transform="translate(0,${3 * rowH})"><rect x="-4" y="0" width="${OPEN.length * 108}" height="80" rx="8" fill="${C.rule}" fill-opacity="0.5"/>${robotTrace}</g>
        <g id="${id}-guides2" transform="translate(0,${2 * rowH})">${OPEN.map((o, i) => o ? `<line x1="${i * 108 + 48}" y1="0" x2="${i * 108 + 48}" y2="${2 * rowH}" stroke="${M}" stroke-width="2" stroke-dasharray="4 6"/>` : "").join("")}</g>
      </g>
      <line id="${id}-ph" x1="40" y1="0" x2="40" y2="${4 * rowH + 40}" stroke="${C.accent}" stroke-width="5"/>
    </svg>
    <div id="${id}-ok" style="position:absolute;left:1380px;top:956px;font-family:SatoshiBold,Satoshi;font-weight:700;font-size:40px;color:${F}">status: no errors</div>
  </div>`;
  let js = dust.js + grainJS(D) + "\n";
  js += `tl.fromTo("#${id}-zoom",{scale:1,transformOrigin:"50% 50%"},{scale:1.03,transformOrigin:"50% 50%",duration:${f3(D)},ease:"power1.inOut",immediateRender:true},0);\n`;
  js += show(`#${id}-t`, 0.3) + show(`#${id}-lab1`, 0.5) + show(`#${id}-lab2`, 0.7);
  js += `tl.fromTo("#${id}-ph",{x:0},{x:${X1 - X0 - 120},duration:${f3(D)},ease:"none",immediateRender:true},0);\n`;
  js += `tl.fromTo("#${id}-scroll",{x:0},{x:-260,duration:${f3(D)},ease:"none",immediateRender:true},0);\n`;
  js += `tl.fromTo(["#${id}-v2","#${id}-lab0"],{opacity:0},{opacity:1,duration:0.4,immediateRender:true},${f3(tC)});\n`;
  js += `tl.fromTo("#${id}-guides",{opacity:0},{opacity:1,duration:0.4,immediateRender:true},${f3(tC + 1.5)});\n`;
  // "lips ... voice from elsewhere": the audio clip slips right by a few frames; peaks miss the mouths
  js += `tl.fromTo("#${id}-a1",{x:0},{x:96,duration:0.6,ease:"power2.inOut",immediateRender:false},${f3(tL)});\n`;
  js += `tl.fromTo(["#${id}-rb","#${id}-lab3","#${id}-guides2"],{opacity:0},{opacity:1,duration:0.4,immediateRender:true},${f3(tN - 0.8)});\n`;
  js += `tl.fromTo("#${id}-ok",{opacity:0},{opacity:1,duration:0.3,immediateRender:true},${f3(tN)});\n`;
  // "with the robot, nothing fails": the robot track slips the same way; nothing changes colour
  js += `tl.fromTo("#${id}-rb",{x:0},{x:44,duration:0.6,ease:"power2.inOut",immediateRender:false},${f3(tN + 0.4)});\n`;
  emit(id, D, body, js, ["grain.png"]);
}

// ---------------------------------------------------------- g19 takeaways
if (want("g19")) {
  const id = "g19", D = dur(id), F = fg(id), M = dim(id);
  const t1 = cueIn(id, "one"), t2 = cueIn(id, "two");
  // row 3 lands on "And three," : the third "three" in the part ("three things", "three parts", "three,")
  const t3 = +(cue("three", t2 + span(id)[0] + 5) - span(id)[0]).toFixed(3);
  const W = 680, H = 500;
  const row = (k, y, txt) => `<div id="${id}-r${k}" style="position:absolute;left:40px;top:${y}px;width:${W - 80}px">
      <div style="position:absolute;left:0;top:0;font-family:Satoshi;font-variation-settings:'wght' 900;font-size:44px;color:${F}">${k + 1}</div>
      <div style="position:absolute;left:62px;top:4px;width:${W - 150}px;font-family:Satoshi;font-variation-settings:'wght' 700;font-size:34px;line-height:1.2;color:${F}">${txt}</div></div>`;
  const body = card(`${id}-c`, 48, 80, W, H, `
    ${EYEBROW("three things to take away", 40, 30, M)}
    <div id="${id}-rule" class="accentbar" style="position:absolute;left:40px;top:70px;width:180px;height:5px"></div>
    ${row(0, 110, "Robots learn from data, not handwritten rules.")}
    ${row(1, 250, "A dataset is three parts: metadata, Parquet, MP4.")}
    ${row(2, 390, "The hardest part of robotics data.")}`);   // complete, points at g20's answer (human 2026-10-17: row 3 read half-written)
  let js = wipeUp(`#${id}-c`, 0) + "\n" + ruleIn(`#${id}-rule`, 0.4);
  js += rowUp(`#${id}-r0`, t1) + rowUp(`#${id}-r1`, t2) + rowUp(`#${id}-r2`, t3);
  emit(id, D, body, js);
}

// -------------------------------------------------------------- g20 verdict
if (want("g20")) {
  // Review 2026-10-17: re-timed ("It's" on "but", "stitching" on "stitching", "it together." on "it"),
  // "stitching" set at 150px, the widest the measured left column takes (626px in a 740px card), and
  // the payoff drawing enlarged to 0.5 so the grip reads. The verdict-vs-stat size conflict is raised.
  const id = "g20", D = dur(id), F = fg(id), M = dim(id);
  const tBut = cueIn(id, "but"), tSt = cueIn(id, "stitching"), tIt = cueIn(id, "it");
  const W = 740, H = 588;
  const body = card(`${id}-c`, 40, 70, W, H, `
    ${T("The hard part is not storing the data.", 40, 34, 32, { weight: 700, color: M, id: `${id}-pre` })}
    ${T("It's", 40, 110, 64, { weight: 900, color: F, id: `${id}-L0`, lh: 1 })}
    ${T("stitching", 34, 196, 150, { weight: 900, color: C.accent, id: `${id}-L1`, lh: 1 })}
    ${T("it together.", 40, 384, 64, { weight: 900, color: F, id: `${id}-L2`, lh: 1 })}
    <div id="${id}-streams" style="position:absolute;left:0;top:466px;width:${W}px;height:96px">
      ${["camera", "joints", "timestamps"].map((n, k) => `${T(n, 40, k * 32 - 4, 28, { weight: 700, color: M })}<svg style="position:absolute;left:250px;top:${k * 32}px;overflow:hidden" width="430" height="26"><line id="${id}-sl${k}" x1="-60" y1="13" x2="490" y2="13" stroke="${F}" stroke-width="18" stroke-dasharray="4 26"/></svg>`).join("")}
      <svg style="position:absolute;left:250px;top:-6px;overflow:visible" width="430" height="110">${[...Array(15).keys()].map(i => `<line x1="${2 + i * 30}" y1="0" x2="${2 + i * 30}" y2="104" stroke="${M}" stroke-width="2" stroke-dasharray="4 6"/>`).join("")}</svg></div>`)
    + card(`${id}-s`, 48, 682, 380, 256, `${tableScene(id, 40, 256 - 14 - Math.round(506 * 0.44), 0.44, F, M)}
      <div id="${id}-got" style="position:absolute;left:206px;top:104px;display:flex;align-items:center;gap:10px;opacity:0">
        <svg width="26" height="23" viewBox="0 0 34 30"><path d="M3,16 L12,25 L31,4" fill="none" stroke="${F}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span style="font-family:Satoshi;font-variation-settings:'wght' 700;font-size:28px;color:${F};white-space:nowrap">got it</span></div>`);
  // g19 hands straight to g20: a content swap, so the card and its first line are present on frame 0
  let js = `tl.fromTo("#${id}-c",{opacity:1},{opacity:1,duration:0.2},0);\n`;
  js += rowUp(`#${id}-L0`, Math.max(0.3, tBut - 0.1)) + rowUp(`#${id}-L1`, tSt - 0.15) + rowUp(`#${id}-L2`, tIt - 0.1);
  js += wipeUp(`#${id}-s`, tIt + 0.4) + "\n";
  // the three streams from g08/g09, out of step, lock onto one clock: offsets ease to zero on the guides
  js += show(`#${id}-streams`, tIt + 0.5, 0.35);
  js += [13, -9, 6].map((o, k) => `tl.fromTo("#${id}-sl${k}",{x:${o}},{x:0,duration:0.9,ease:"power3.inOut",immediateRender:true},${f3(tIt + 1.2)});\n`).join("");
  // the humanoid reaches and closes its grip ON the block this time (the payoff of g09's miss)
  const reach = reachFor(true);
  js += humIdle(`${id}-h`, tIt + 0.4, tIt + 1.6, 3);
  js += humArm(`${id}-h`, "R", { a: 0, b: 0, g: 0 }, { ...reach, g: 0 }, tIt + 1.6, 0.8) + humArm(`${id}-h`, "R", { ...reach, g: 0 }, { ...reach, g: 1 }, tIt + 2.4, 0.35);
  js += show(`#${id}-got`, tIt + 2.85, 0.3, "y:8", "y:0");   // matched with g09's "missed"
  js += exitIfFree(id, D, [`#${id}-c`, `#${id}-s`]);
  emit(id, D, body, js);
}

// ---------------------------------------------------------------- g21 end card
if (want("g21")) {
  // End card in the 05-agent-swarm anatomy (human 2026-10-17: "g21 card is not right, refer to the
  // previous episode"): the channel NAME as a small eyebrow, then uniform rows (label 32px muted over
  // value 36px), one $accent rule under the first row, and the card growing as each row lands. Rows
  // are 92px (05 used 100) so five rows clear the 660 line where the clear wall narrows to 540.
  const id = "g21", D = dur(id), F = fg(id), M = dim(id);
  const tSee = cueIn(id, "see");
  const links = BRAND.links.filter(l => l.id);
  const X = 96, TOP = 96, Wc = 584, PAD = 28, INNER = Wc - 2 * PAD, RH = 92, HEAD = 70, Hn = n => HEAD + n * RH + 24;
  if (TOP + Hn(links.length) > 660) throw new Error(`g21: card reaches y ${TOP + Hn(links.length)}, past the 660 line`);
  const T0 = Math.max(0.05, tSee - 0.4), at = links.map((_, k) => T0 + 0.15 + k * 0.4);
  const body = card(`${id}-c`, X, TOP, Wc, Hn(0), `
    ${T(BRAND.channel.name.toUpperCase(), PAD, 28, 20, { weight: 700, color: M })}
    ${links.map((l, k) => `<div id="${id}-r${k}" style="position:absolute;left:${PAD}px;top:${HEAD + k * RH}px;width:${INNER}px;height:${RH - 4}px">
      ${T(l.label, 0, 0, 32, { weight: 500, color: M })}${T(l.value, 0, 40, 36, { weight: 700, color: F })}
      ${k === 0 ? `<div id="${id}-rule" class="accentbar" style="position:absolute;left:0;top:${RH - 10}px;width:220px;height:3px"></div>` : ""}</div>`).join("")}`, "overflow:hidden");
  let js = wipeUp(`#${id}-c`, T0, 0.3) + "\n";
  links.forEach((_, k) => {
    js += `tl.fromTo("#${id}-c",{height:${Hn(k)}},{height:${Hn(k + 1)},duration:0.35,ease:"power3.out",immediateRender:${k === 0}},${f3(at[k])});\n`;
    js += `tl.fromTo("#${id}-r${k}",{clipPath:"inset(0 0 100% 0)"},{clipPath:"inset(0 0 0% 0)",duration:0.3,ease:"power3.out",immediateRender:true},${f3(at[k] + 0.36)});\n`;
  });
  js += ruleIn(`#${id}-rule`, at[0] + 0.3);
  emit(id, D, body, js);
}
