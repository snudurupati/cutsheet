// g02: rental store vs streaming, a full-frame CONTRAST takeover (class segment). Hard cut in, hard
// cut out. Both worlds are on the page from the first frame; the streaming side is dimmed until
// "Netflix". No real logo or brand mark anywhere: a generic ticket-shaped VIDEO RENTAL sign, a
// generic shelf of tapes, a generic tile grid. The one accent is the tallest bar ("read the data").
//   0      hard cut: shelf, door, sign on the left; screen grid and chart at 30% on the right
//   remember  a tape is pulled half out of the shelf (someone browsing), slides back
//   netflix   right side lifts to full ink, the chart's bars grow, the accent bar last on "data";
//             a selection frame starts stepping across the tiles (continuous motion)
//   didnt     the shelf greys (colour tween toward $muted, never a filter)
//   bankrupt  a CLOSED card swings onto the door's nail (0.6s back.out), the left fades to 40%
// Dust, grain and the 1.00 -> 1.03 drift come from takeoverScene.
import { C, emit, frames } from "../lib.mjs";
import { T, EYEBROW, takeoverScene, prng, cueRel, f3, HERO } from "../common.mjs";
import { vhs } from "./_vhs.mjs";

const ID = "g02";
export default function build() {
  const D = frames(ID) / 30;
  const tRem = cueRel(ID, "remember"), tNet = cueRel(ID, "netflix"), tDid = cueRel(ID, "didnt"), tBk = cueRel(ID, "bankrupt");
  const tData = tNet + 0.75;                       // "read the data": "data" lands 0.75s after "Netflix"
  const W = 1600, H = 900, HW = 800, FLOOR = 800;
  const F = C.ink, M = C.muted;
  const s = (w = 4) => `fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;

  // ---------------------------------------------------------------- left: the rental store
  // ticket-shaped sign: notched corners, perforation line, generic words
  const SX0 = 300, SX1 = 740, SY0 = 108, SY1 = 200, NR = 16;
  const sign = `<path d="M${SX0 + NR},${SY0} H${SX1 - NR} A${NR},${NR} 0 0 0 ${SX1},${SY0 + NR} V${SY1 - NR} A${NR},${NR} 0 0 0 ${SX1 - NR},${SY1} H${SX0 + NR} A${NR},${NR} 0 0 0 ${SX0},${SY1 - NR} V${SY0 + NR} A${NR},${NR} 0 0 0 ${SX0 + NR},${SY0} Z" fill="${C.bg}" ${s(4).replace('fill="none" ', "")}/>
    <path d="M${SX0 + 64},${SY0 + 12} V${SY1 - 12}" ${s(3)} stroke-dasharray="6 9"/>
    <path d="M${SX0 + 26},${(SY0 + SY1) / 2 - 12} l12,12 l-12,12" ${s(4)}/>`;
  // door with glass, handle and the nail the CLOSED card will hang on
  const DX0 = 56, DX1 = 250, DY0 = 250, NAIL = [153, 318];
  const door = `<rect x="${DX0}" y="${DY0}" width="${DX1 - DX0}" height="${FLOOR - DY0}" rx="6" fill="${C.bg}" ${s(4).replace('fill="none" ', "")}/>
    <rect x="${DX0 + 22}" y="${DY0 + 24}" width="${DX1 - DX0 - 44}" height="260" rx="4" ${s(3)}/>
    <path d="M${DX0 + 40},${DY0 + 60} l40,-26 M${DX0 + 40},${DY0 + 96} l70,-46" ${s(2.5)} opacity="0.5"/>
    <path d="M${DX1 - 26},${DY0 + 330} v56" ${s(6)}/>
    <circle cx="${NAIL[0]}" cy="${NAIL[1]}" r="5" fill="currentColor"/>`;
  // the shelf: a case with three boards, tapes standing on each (seeded heights and gaps)
  const CX0 = 280, CX1 = 760, CY0 = 236, BOARDS = [400, 560, 720];
  const r = prng(11);
  let tapes = "", pulled = null;
  BOARDS.forEach((by, row) => {
    let x = CX0 + 18;
    for (let i = 0; i < 12; i++) {
      const w = 30, h = 118 + Math.round(r() * 22);
      const gap = r() < 0.12 && i > 0 ? 18 : 6;
      x += i ? gap : 0;
      if (x + w > CX1 - 14) break;
      const tagId = row === 1 && i === 5 ? ` id="${ID}-ptag"` : "";
      const tag = `<rect${tagId} x="${x + 7}" y="${by - h + 16}" width="${w - 14}" height="34" rx="2" ${s(2.5)}/><path d="M${x + 9},${by - 26} h${w - 18}" ${s(2.5)}/>`;
      const tape = `<rect x="${x}" y="${by - h}" width="${w}" height="${h}" rx="3" fill="${C.bg}" ${s(3.5).replace('fill="none" ', "")}/>${tag}`;
      if (row === 1 && i === 5) { pulled = { x, y: by - h, w, h }; tapes += `<g id="${ID}-pull">${tape}</g>`; }
      else tapes += tape;
      x += w;
    }
  });
  const shelf = `<rect x="${CX0}" y="${CY0}" width="${CX1 - CX0}" height="${FLOOR - CY0}" rx="4" ${s(4)}/>
    ${BOARDS.map(y => `<path d="M${CX0},${y} H${CX1}" ${s(5)}/>`).join("")}
    ${tapes}`;
  const LEFT = `<svg style="position:absolute;left:0;top:0;overflow:visible" width="${HW}" height="${H}" viewBox="0 0 ${HW} ${H}">
      <path d="M30,${FLOOR} H${HW - 30}" ${s(4)}/>${door}${shelf}${sign}</svg>
    ${T("VIDEO RENTAL", SX0 + 70, SY0 + 24, 40, { w: SX1 - SX0 - 86, align: "center", weight: 900, color: "currentColor", ls: 0.04 })}`;
  // the CLOSED card on two strings from the nail, swung about the nail
  const CW = 178, CH = 60, CY = NAIL[1] + 56;
  const CLOSED = `<svg id="${ID}-closed" style="position:absolute;left:0;top:0;overflow:visible;opacity:0" width="${HW}" height="${H}" viewBox="0 0 ${HW} ${H}">
      <g id="${ID}-cg"><path d="M${NAIL[0]},${NAIL[1]} L${NAIL[0] - CW / 2 + 14},${CY} M${NAIL[0]},${NAIL[1]} L${NAIL[0] + CW / 2 - 14},${CY}" fill="none" stroke="${F}" stroke-width="3" stroke-linecap="round"/>
        <rect x="${NAIL[0] - CW / 2}" y="${CY}" width="${CW}" height="${CH}" rx="6" fill="${C.bg}" stroke="${F}" stroke-width="4"/>
        <text x="${NAIL[0]}" y="${CY + 40}" text-anchor="middle" font-family="Satoshi" style="font-variation-settings:'wght' 900" font-size="28" letter-spacing="1.5" fill="${F}">CLOSED</text></g></svg>`;

  // ---------------------------------------------------------------- right: the same shelf as a screen
  const DESK = 720, MX0 = 846, MX1 = 1326, MY0 = 236, MY1 = 620;
  const GX0 = MX0 + 20, GY0 = MY0 + 22, TW = 98, TH = 100, TG = 16, RG = 18;
  const tile = (c, rw) => { const x = GX0 + c * (TW + TG), y = GY0 + rw * (TH + RG);
    return `<rect x="${x}" y="${y}" width="${TW}" height="${TH}" rx="6" fill="${C.bg}" ${s(3).replace('fill="none" ', "")}/>
      <path d="M${x + 14},${y + 22} h${TW - 28}" ${s(2.5)}/><path d="M${x + 14},${y + TH - 20} h${TW - 46}" ${s(2.5)}/>
      <path d="M${x + TW / 2 - 9},${y + 40} v26 l22,-13 Z" ${s(3)}/>`; };
  let grid = "";
  for (let rw = 0; rw < 3; rw++) for (let c = 0; c < 4; c++) grid += tile(c, rw);
  // the chart is a chart, not furniture: its own axis and baseline, clear of the desk
  const CB = 600, BX = [1406, 1456, 1506, 1556], BH = [70, 112, 150, 236], BW = 34;
  const bars = BX.map((x, i) => `<rect id="${ID}-b${i}" x="${x - BW / 2}" y="${CB - BH[i]}" width="${BW}" height="${BH[i]}" rx="3" fill="${i === 3 ? C.accent : C.bg}" stroke="${F}" stroke-width="3.5"/>`).join("");
  const RIGHT = `<svg style="position:absolute;left:0;top:0;overflow:visible" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <path d="M${HW + 40},${DESK} H${MX1 + 30} M${HW + 90},${DESK} V${FLOOR} M${MX1 - 10},${DESK} V${FLOOR}" ${s(4)}/>
      <path d="M${HW + 30},${FLOOR} H${W - 10}" ${s(4)}/>
      <rect x="${MX0}" y="${MY0}" width="${MX1 - MX0}" height="${MY1 - MY0 + 18}" rx="12" ${s(4)}/>
      <path d="M${(MX0 + MX1) / 2},${MY1 + 18} V${DESK - 14} M${(MX0 + MX1) / 2 - 70},${DESK - 6} H${(MX0 + MX1) / 2 + 70}" ${s(5)}/>
      ${grid}
      <rect id="${ID}-sel" x="${GX0 - 6}" y="${GY0 - 6}" width="${TW + 12}" height="${TH + 12}" rx="9" fill="none" stroke="${F}" stroke-width="5" opacity="0"/>
      <path d="M1374,${CB - 290} V${CB} H1590" ${s(3)}/>${[1, 2, 3].map(k => `<path d="M1368,${CB - k * 80} h6" ${s(3)}/>`).join("")}
      ${bars}</svg>`;

  const inner = `
    <svg style="position:absolute;left:${HW - 1}px;top:30px" width="2" height="${H - 60}"><line x1="1" y1="0" x2="1" y2="${H - 60}" stroke="${C.rule}" stroke-width="2"/></svg>
    ${EYEBROW("Rental store", 56, 36, M, `${ID}-eL`)}
    <div id="${ID}-L" style="position:absolute;left:0;top:0;width:${HW}px;height:${H}px;color:${F}">${LEFT}</div>
    ${CLOSED}
    <div id="${ID}-R" style="position:absolute;left:0;top:0;width:${W}px;height:${H}px;color:${F};opacity:0.3">
      ${EYEBROW("Streaming", HW + 56, 36, M)}${RIGHT}</div>`;
  // 2026-10-28 (opening rework): g02 MATCH-CUTS out of g01a's card instead of hard-cutting from a corner
  // card to the full page. Round 2 review: the carried tape must not dissolve in place. It flies with the
  // grow from its card position into the very shelf slot that is pulled out on "remember", shrinking and
  // fading as it lands, and that spine's label takes the accent until it is slid back. The backdrop goes
  // opaque in 0.25s (no face ghosting through the grow) and the store arrives mid-grow (never blank).
  if (!pulled) throw new Error(`${ID}: no pulled tape on the shelf`);
  const k = Math.min(1600 / W, 900 / H), L0 = Math.round((1920 - W * k) / 2), T0 = Math.round((1080 - H * k) / 2);
  const FROM = { x: HERO.x + 6 + 290, y: HERO.y + 6 + 248 };                     // the tape's centre in g01a's card
  const TO = { x: L0 + k * (pulled.x + pulled.w / 2), y: T0 + k * (pulled.y + pulled.h / 2) };
  const fly = `<svg style="position:absolute;left:0;top:0;overflow:visible;pointer-events:none" width="1" height="1"><g id="${ID}-fly">${vhs(`${ID}k`, FROM.x, FROM.y, { written: true, accent: true, opacity: 1 })}</g></svg>`;
  const TK = takeoverScene(ID, D, W, H, inner, { from: [HERO.x, HERO.y, HERO.w, HERO.h], carry: "", bgIn: 0.25, cIn: 0.25 });
  // the fly tweens go AFTER the takeover's own (the check's sweep reads the timeline's first tweens)
  let js = TK.js;

  // remember: one tape slides half out and back
  js += `tl.fromTo("#${ID}-pull",{y:0},{y:-46,duration:0.45,ease:"power2.out",immediateRender:false},${f3(tRem)});\n`;
  js += `tl.fromTo("#${ID}-pull",{y:-46},{y:0,duration:0.5,ease:"power2.inOut",immediateRender:false},${f3(tRem + 1.7)});\n`;
  // Netflix: the right side lifts, the bars grow from the desk, the accent bar on "data"
  js += `tl.fromTo("#${ID}-R",{opacity:0.3},{opacity:1,duration:0.35,ease:"power2.out",immediateRender:false},${f3(tNet - 0.05)});\n`;
  [tNet + 0.05, tNet + 0.3, tNet + 0.55, tData].forEach((t, i) => {
    js += `tl.fromTo("#${ID}-b${i}",{scaleY:0,svgOrigin:"${BX[i]} ${CB}"},{scaleY:1,svgOrigin:"${BX[i]} ${CB}",duration:${i === 3 ? 0.6 : 0.4},ease:"power3.out",immediateRender:true},${f3(t)});\n`;
  });
  // the selection frame steps across the tiles from "Netflix" to the end (continuous motion)
  const order = [[0, 0], [1, 0], [2, 0], [2, 1], [1, 1], [3, 1], [3, 2], [2, 2], [0, 2], [0, 1], [1, 0], [3, 0], [2, 1], [1, 2]];
  js += `tl.fromTo("#${ID}-sel",{opacity:0},{opacity:1,duration:0.25,immediateRender:true},${f3(tNet + 0.4)});\n`;
  let prev = [0, 0];
  for (let k = 1, t = tNet + 1.1; t < D - 0.3 && k < order.length; k++, t += 0.75) {
    const [c, rw] = order[k];
    const pdx = prev[0] * (TW + TG), pdy = prev[1] * (TH + RG), dx = c * (TW + TG), dy = rw * (TH + RG);
    js += `tl.fromTo("#${ID}-sel",{x:${pdx},y:${pdy}},{x:${dx},y:${dy},duration:0.28,ease:"power2.inOut",immediateRender:false},${f3(t)});\n`;
    prev = [c, rw];
  }
  // didn't: the shelf greys (colour tween; filters do not survive the render)
  js += `tl.fromTo("#${ID}-L",{color:"${F}"},{color:"${M}",duration:0.6,ease:"power1.inOut",immediateRender:false},${f3(tDid)});\n`;
  // bankrupt: the CLOSED card swings onto the nail, then the left side fades to 40%
  js += `tl.fromTo("#${ID}-closed",{opacity:0},{opacity:1,duration:0.2,immediateRender:true},${f3(tBk)});\n`;
  js += `tl.fromTo("#${ID}-cg",{rotation:-38,svgOrigin:"${NAIL.join(" ")}"},{rotation:0,svgOrigin:"${NAIL.join(" ")}",duration:0.6,ease:"back.out(3)",immediateRender:true},${f3(tBk)});\n`;
  js += `tl.fromTo(["#${ID}-L","#${ID}-eL"],{opacity:1},{opacity:0.4,duration:0.5,ease:"power1.inOut",immediateRender:false},${f3(tBk + 0.6)});\n`;
  // ---- the flying tape (added last)
  js += `tl.fromTo("#${ID}-fly",{x:0,y:0,scale:1,opacity:1,transformOrigin:"50% 50%"},{x:${f3(TO.x - FROM.x)},y:${f3(TO.y - FROM.y)},scale:0.16,transformOrigin:"50% 50%",duration:0.6,ease:"power2.inOut",immediateRender:true},0);\n`;
  js += `tl.fromTo("#${ID}-fly",{opacity:1},{opacity:0,duration:0.3,ease:"power1.inOut",immediateRender:false},0.36);\n`;
  js += `tl.fromTo("#${ID}-ptag",{fill:"${C.bg}"},{fill:"${C.accent}",duration:0.24,immediateRender:true},0.4);\n`;
  js += `tl.fromTo("#${ID}-ptag",{fill:"${C.accent}"},{fill:"${C.bg}",duration:0.3,immediateRender:false},${f3(Math.min(tRem + 2.3, tNet - 0.4))});\n`;
  emit(ID, D, TK.body + fly, js, ["grain.png"]);
}
