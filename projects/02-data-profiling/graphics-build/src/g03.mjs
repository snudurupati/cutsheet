// g03: the fun old times (the good old data days), step-built in HERO (light card over the face).
//   0.0-1.1    the card arrives with its title; four source glyphs (table, log page, CSV sheet, cylinder)
//              drop in one by one along the top on "a plethora of data sources"
//   0.9-2.0    tubes draw from each glyph into one channel; records start flowing (and never stop)
//   cleansing  the channel widens into a short chamber and a slotted screen draws across it. Clean
//              records pass through the slots; each broken record stops against the screen and arcs
//              along a hairline into the reject tray (four over the beat, stacked neatly)
//   curating   the channel splits into three lanes; each record takes the lane of its kind
//   aggregating  the lanes stop short of a bar chart; the bars grow
//   thanksgiving one bar rises taller in $accent (the one accent), its label right above it
//   forecasting  the pipeline dims to 40%; a fine dotted line and two faint outline bars extend the
//              chart; on "future" the line reaches the card edge
//
// Redesigned 2026-10-28. The human's feedback: the dots through the old mesh bowl read as "poo or germs".
// The independent composition review of the first redesign (dash records) then found them reading as
// bugs and ants, all 8 findings fixed here:
//  1 records are OBJECTS, not strokes: 22x8 blocks (1px radius), one row per tube at a fixed spacing,
//    merging single file at the junction (each record reaches the junction its own 0.57s slot later);
//    a broken record is the same block as a hollow $muted outline with one clean diagonal break.
//  2 the glyphs are two thirds the size so the channel, chamber and screen get the room.
//  3 a chamber and a slotted screen; a visible stop and a 0.35s arc into the tray; tray on the other
//    side of the channel from CLEANSE; four rejections spread over the hold.
//  4 no dash collisions: records are blocks, the pipeline dims on "forecasting".
//  5 THANKSGIVING sits right above its bar with a short leader, clear of the pipeline's labels; no leaf.
//  6 cue sync kept; the rejections play through the hold.
//  7 the title comes with the card, the glyphs one by one from 0.12s.
//  8 lanes end 12px short of the first bar.
// Round 2 review (all 8 fixed): every good record is ONE style (solid ink), only broken records are outlines
// (break 4px), so the screen's rule is visible; a reject is held 0.3s against the screen with a small
// shake and an $accent-soft tick, its arc is 2px, the tray is 1.5x; the pipeline art (glyphs, tubes,
// chamber, tray, labels) is scaled 1.2x about the glyph row and the chart moved right and shortened to
// fit; the screen's slots are fewer and bolder (they flickered to a solid bar); the future bars land on
// "future".
// Round 3 (all 7 fixed): exit is a linear 0.5s wipe from the card edge; broken records 1.2x with a 2.8px
// ink outline; forecast dots 5px ink at 80%, future bars 2px dashed $muted; the stream above the screen
// pauses while a reject is held; the screen is opaque so records pass behind it; 24px right padding;
// records fade in 2 frames at the lane ends.
import { C, emit, frames, panelClass, fg, dim, wipeUp, SHADOW_PAD } from "../lib.mjs";
import { T, EYEBROW, rowUp, show, drawAll, cueRel, exitIfFree, HERO, f3 } from "../common.mjs";

const ID = "g03";

// ---------------------------------------------------------------- path sampling (build time)
const cubic = (p0, p1, p2, p3, t) => { const u = 1 - t;
  return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
          u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]; };
const quad = (p0, p1, p2, t) => { const u = 1 - t; return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]; };
const dense = (segs) => {                    // segs: [["c", p0,p1,p2,p3] | ["l", a, b]] -> points every ~1px
  const pts = [];
  for (const s of segs) {
    const N = 400;
    for (let i = pts.length ? 1 : 0; i <= N; i++) { const t = i / N;
      pts.push(s[0] === "c" ? cubic(s[1], s[2], s[3], s[4], t) : [s[1][0] + (s[2][0] - s[1][0]) * t, s[1][1] + (s[2][1] - s[1][1]) * t]); }
  }
  // arc length
  const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, L, len: L[L.length - 1] };
};
const at = (r, d) => {                       // position and heading (deg) at distance d
  d = Math.max(0, Math.min(r.len, d));
  let lo = 0, hi = r.L.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (r.L[m] < d) lo = m; else hi = m; }
  const a = r.pts[lo], b = r.pts[hi], f = (d - r.L[lo]) / Math.max(1e-9, r.L[hi] - r.L[lo]);
  const i0 = Math.max(0, lo - 3), i1 = Math.min(r.pts.length - 1, hi + 3);
  return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f,
           h: Math.atan2(r.pts[i1][1] - r.pts[i0][1], r.pts[i1][0] - r.pts[i0][0]) * 180 / Math.PI };
};
const unwrap = (prev, h) => { while (h - prev > 180) h -= 360; while (h - prev < -180) h += 360; return h; };

export default function build() {
  const D = frames(ID) / 30;
  const tCl = cueRel(ID, "cleansing"), tCu = cueRel(ID, "curating"), tAg = cueRel(ID, "aggregating"),
        tTh = cueRel(ID, "thanksgiving"), tFc = cueRel(ID, "forecasting"), tFu = cueRel(ID, "future");
  const F = fg(ID), M = dim(ID);
  const { x: X, y: Y, w: W, h: H } = HERO;
  const s = (w = 3) => `fill="none" stroke="${F}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
  const LAB = (txt, x, y, id, o = {}) => T(txt, x, y, 22, { weight: 700, color: M, ls: 0.14, upper: true, id, ...o });

  // ---- source glyphs at two thirds size (48 x 43), centred on GX at top GY
  const GX = [76, 186, 296, 406], GY = 66, GW = 48, GH = 43;
  const glyph = [
    `<rect x="2" y="4" width="68" height="56" rx="4" ${s(3)}/><path d="M2,18 H70 M2,32 H70 M2,46 H70 M26,4 V60 M48,4 V60" ${s(2.2)}/><path d="M2,11 H70" stroke="${F}" stroke-width="12" opacity="0.18"/>`,
    `<path d="M12,2 H48 L62,16 V62 H12 Z M48,2 V16 H62" ${s(3)}/><path d="M20,26 H52 M20,36 H44 M20,46 H54 M20,56 H38" ${s(2.4)}/>`,
    `<path d="M10,2 H52 L64,14 V62 H10 Z M52,2 V14 H64" ${s(3)}/><text x="37" y="46" text-anchor="middle" font-family="Satoshi" style="font-variation-settings:'wght' 900" font-size="20" fill="${F}">CSV</text>`,
    `<path d="M10,14 C10,6 62,6 62,14 C62,22 10,22 10,14 Z M10,14 V52 C10,60 62,60 62,52 V14 M10,33 C10,41 62,41 62,33" ${s(3)}/>`,
  ].map((g, i) => `<svg id="${ID}-g${i}" style="position:absolute;left:${GX[i] - GW / 2}px;top:${GY}px;overflow:visible;opacity:0" width="${GW}" height="${GH}" viewBox="0 0 72 64">${g}</svg>`).join("");

  // ---- the pipeline geometry (card-inner px)
  const SC = 1.2;                                             // the pipeline art's scale (round 2)
  const CX = 130, MPY = 160, SPY = 292;                      // channel x, junction y, split y
  const SCR = { x0: CX - 28, x1: CX + 28, y0: 214, y1: 228 }; // the screen
  const CH = { x0: CX - 22, x1: CX + 22, y0: 194, y1: 248 };  // the chamber
  const TRAY = { x0: 26, x1: 101, y0: 232, y1: 298 };          // reject tray, left of the channel (1.5x)
  const LY = [318, 342, 366], LX1 = 229;                       // lanes (scaled 1.2x they end 12px before the first bar's edge, 287)
  const F0 = GY + GH + 4;
  const feedSeg = gx => ["c", [gx, F0], [gx, F0 + 28], [CX, MPY - 34], [CX, MPY]];
  const laneSegs = y => [["c", [CX, SPY], [CX, SPY + 26], [CX + 30, y], [CX + 70, y]], ["l", [CX + 70, y], [LX1, y]]];
  const segD = segs => segs.map((g, i) => (i ? "" : `M${g[1][0]},${g[1][1]} `) + (g[0] === "c" ? `C${g[2]} ${g[3]} ${g[4]}` : `L${g[2]}`)).join(" ");
  const feedD = GX.map(gx => segD([feedSeg(gx)]));
  const chanD = `M${CX},${MPY} V${SPY}`;
  const laneD = LY.map(y => segD(laneSegs(y)));
  const tube = (d, id) => `<path id="${id}" class="dr" pathLength="1" d="${d}" fill="none" stroke="${C.rule}" stroke-width="16" stroke-linecap="butt"/>`;

  // ---- the records: scheduled so they reach the junction single file, one every GAP seconds
  const SPD = 60, GAP = 34 / SPD, T0 = 2.45, FLOW0 = 1.9;
  const KIND = [0, 1, 2, 0];                                   // which lane a source's records take (they all look alike)
  const BAD = new Set([1, 5, 11, 15]);                         // from the log and the cylinder; four rejections
  const tScreen = tCl + 0.35;                                  // the screen is in place from here
  const tLanes = tCu + 0.45;                                   // the lanes are drawn from here
  const recs = [], js0 = [];
  let html = "";
  // Round 3: while a reject is held against the screen, the whole stream above the screen PAUSES (the
  // records queue behind it), then releases. A record's progress therefore runs on a stream clock that
  // stops for every hold beginning before the record has passed the screen. Holds are found in order.
  const BADH = 13, GOODH = 11;                                 // half-lengths of a broken / good record
  const HOLD = 0.32, ARC = 0.42;
  const holds = [];                                            // [{start, dur}], wall-clock
  const shift = (t0, upTo) => { let t = t0; for (const h of holds) if (h.start < t + 1e-9 && h.start < upTo) t += h.dur; return t; };
  for (let k = 0; ; k++) {
    const tk = T0 + k * GAP, i = k % 4;                        // reaches the junction at tk (unpaused clock)
    const feed = dense([feedSeg(GX[i])]);
    const tStart = tk - feed.len / SPD;
    if (tStart >= D) break;
    const bad = BAD.has(k), kind = bad ? "bad" : KIND[i];
    const dScreen = feed.len + (SCR.y0 - (bad ? BADH : GOODH) - MPY);   // distance at which its front meets the screen
    // wall time it meets the screen, after every earlier hold that started before then
    let tS = tStart + dScreen / SPD; for (const h of holds) if (h.start < tS) tS += h.dur;
    let segs = [feedSeg(GX[i])], end = "fade";
    if (bad && tS >= tScreen) { segs.push(["l", [CX, MPY], [CX, SCR.y0 - BADH]]); end = "reject"; holds.push({ start: tS, dur: HOLD + 0.12 }); }
    else {
      segs.push(["l", [CX, MPY], [CX, SPY]]);
      const atSplit = tS + (SPY - SCR.y0) / SPD;
      if (!bad && atSplit >= tLanes) segs.push(...laneSegs(LY[kind]));
    }
    recs.push({ k, i, tStart, kind, end, dScreen, route: dense(segs) });
  }
  if (recs.filter(r => r.end === "reject").length !== 4) throw new Error(`${ID}: expected 4 rejections, got ${recs.filter(r => r.end === "reject").length}`);

  // record markup: absolutely placed divs centred on (0,0), moved by x/y/rotation. A broken record is
  // 1.2x a good one with a 2.8px INK outline and a $bg break (round 3: the pale grey one vanished on a phone)
  const recDiv = (id, kind) => {
    if (kind === "bad") return `<div id="${id}" style="position:absolute;left:-13px;top:-5px;width:26px;height:10px;border-radius:1px;box-sizing:border-box;opacity:0;border:2.8px solid ${F};"><div style="position:absolute;left:8px;top:-6px;width:5px;height:20px;background:${C.bg};transform:rotate(28deg)"></div></div>`;
    return `<div id="${id}" style="position:absolute;left:-11px;top:-4px;width:22px;height:8px;border-radius:1px;box-sizing:border-box;opacity:0;background:${F};"></div>`;
  };
  const STEP = 8;
  let rejN = 0;
  const slots = [0, 1, 2, 3].map(n => [(TRAY.x0 + TRAY.x1) / 2, TRAY.y1 - 11 - n * 15]);   // rejects land at 1.2x of their 1.2x
  let guides = "";
  recs.forEach(r => {
    const id = `${ID}-r${r.k}`;
    html += recDiv(id, r.kind);
    const t1 = Math.max(r.tStart, FLOW0), d0 = (t1 - r.tStart) * SPD;
    if (d0 >= r.route.len - 4) return;
    // waypoints: move at SPD, stop in place for each hold that starts before it passes the screen
    const pts = [[d0, t1]];
    let d = d0, t = t1;
    for (const h of holds) {
      const tPass = t + Math.max(0, r.dScreen - d) / SPD;
      if (h.start >= tPass - 1e-6) continue;                                      // starts after it has passed (or is its own hold)
      if (h.start < t) { t += h.dur; pts[pts.length - 1][1] = t; continue; }     // (before it is moving: its start slides)
      d += (h.start - t) * SPD; t = h.start; pts.push([d, t]); t += h.dur; pts.push([d, t]);
    }
    const tEnd = t + (r.route.len - d) / SPD;
    pts.push([r.route.len, tEnd]);
    const tFirst = pts[0][1];
    let p = at(r.route, d0), hd = p.h;
    const kf = [];
    for (let j = 1; j < pts.length; j++) {
      const [da, ta] = pts[j - 1], [db, tb] = pts[j];
      if (db - da < 1e-6) { if (tb - ta > 1e-6) { const q = at(r.route, da); kf.push(`{x:${f3(q.x)},y:${f3(q.y)},rotation:${f3(hd)},duration:${f3(tb - ta)},ease:"none"}`); } continue; }
      for (let dd = da + STEP; ; dd += STEP) {
        const de = Math.min(dd, db), q = at(r.route, de); hd = unwrap(hd, q.h);
        kf.push(`{x:${f3(q.x)},y:${f3(q.y)},rotation:${f3(hd)},duration:${f3((de - Math.max(da, dd - STEP)) / SPD)},ease:"none"}`);
        if (de >= db) break;
      }
    }
    js0.push(`tl.set("#${id}",{x:${f3(p.x)},y:${f3(p.y)},rotation:${f3(p.h)}},${f3(tFirst)});`);
    js0.push(`tl.fromTo("#${id}",{opacity:0},{opacity:1,duration:${tFirst <= FLOW0 + 1e-6 ? 0.3 : 0.15},ease:"none",immediateRender:false},${f3(tFirst)});`);
    js0.push(`tl.to("#${id}",{keyframes:[${kf.join(",")}]},${f3(tFirst)});`);
    if (r.end === "fade") {
      // round 3: a 2-frame fade where it merges into the bars (a 0.2s fade read as a grey second style)
      if (tEnd < D) js0.push(`tl.to("#${id}",{opacity:0,duration:0.067,ease:"none"},${f3(tEnd - 0.067)});`);
    } else {
      // reject: held against the screen with a small shake (the stream behind it paused), then it arcs
      // along a 2px line into the tray, turning flat
      const n = rejN++, [sx, sy] = slots[n], from = [CX, SCR.y0 - BADH], ctl = [CX - 46, SCR.y0 - 40], to = [sx, sy];
      const tA = tEnd + HOLD, dA = ARC;
      guides += `<path id="${ID}-gd${n}" class="dr" pathLength="1" d="M${from} Q${ctl} ${to}" fill="none" stroke="${M}" stroke-width="2" stroke-dasharray="1" opacity=".8"/>`;
      js0.push(`tl.to("#${id}",{x:"+=2.5",duration:0.05,ease:"sine.inOut",yoyo:true,repeat:3},${f3(tEnd + 0.04)});`);
      js0.push(`tl.fromTo("#${ID}-tick",{opacity:0},{opacity:0.9,duration:0.06,ease:"none",immediateRender:false},${f3(tEnd)});`);
      js0.push(`tl.to("#${ID}-tick",{opacity:0,duration:0.2,ease:"none"},${f3(tEnd + 0.12)});`);
      js0.push(`tl.fromTo("#${ID}-gd${n}",{strokeDashoffset:1,opacity:0.8},{strokeDashoffset:0,opacity:0.8,duration:${dA},ease:"power1.inOut",immediateRender:true},${f3(tA)});`);
      js0.push(`tl.to("#${ID}-gd${n}",{opacity:0,duration:0.4,ease:"none"},${f3(tA + dA + 0.25)});`);
      const N = 10, akf = [];
      for (let j = 1; j <= N; j++) { const u = j / N, e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2, [qx, qy] = quad(from, ctl, to, e);
        akf.push(`{x:${f3(qx)},y:${f3(qy)},rotation:${f3(hd + (180 - hd) * e)},scale:${f3(1 + 0.2 * e)},duration:${f3(dA / N)},ease:"none"}`); }
      js0.push(`tl.to("#${id}",{keyframes:[${akf.join(",")}]},${f3(tA)});`);
      if (Math.abs((tEnd) - holds[n].start) > 0.02) throw new Error(`${ID}: reject ${n} reaches the screen at ${tEnd.toFixed(2)}, its hold was booked at ${holds[n].start.toFixed(2)}`);
    }
  });

  // ---- the chart (bars at 80% of the old height, so the label fits above the accent bar)
  const BASE = 440, BXS = [300, 332, 364, 396, 428, 460], BW = 24, BH = [56, 76, 66, 96, 82, 104], TK = 4, TKH = 132;   // round 3: >= 24px right padding
  const bars = BXS.map((x, i) => `<rect id="${ID}-b${i}" x="${x - BW / 2}" y="${BASE - BH[i]}" width="${BW}" height="${BH[i]}" rx="3" fill="${C.bg}" stroke="${F}" stroke-width="3"/>`).join("");
  const tkBar = `<rect id="${ID}-tk" x="${BXS[TK] - BW / 2}" y="${BASE - TKH}" width="${BW}" height="${TKH}" rx="3" fill="${C.accent}" stroke="${F}" stroke-width="3" opacity="0"/>`;
  const GH2 = [112, 120], GXS = [492, 524], XEND = W - 12 - 24;
  const ghosts = GXS.map((x, i) => `<rect x="${x - BW / 2}" y="${BASE - GH2[i]}" width="${BW}" height="${GH2[i]}" rx="3" fill="none" stroke="${M}" stroke-width="2" stroke-dasharray="5 4"/>`).join("");
  const fcEnd = (BASE - GH2[1]) + (XEND - GXS[1]) * ((GH2[0] - GH2[1]) / (GXS[1] - GXS[0]));
  const fcLine = `M${BXS[5]},${BASE - BH[5]} L${GXS[0]},${BASE - GH2[0]} L${GXS[1]},${BASE - GH2[1]} L${XEND},${fcEnd.toFixed(1)}`;
  const chart = `<path id="${ID}-ax" class="dr" pathLength="1" d="M${BXS[0] - BW / 2 - 6},${BASE} H${XEND}" ${s(3)}/>${bars}${tkBar}`;
  const tkLabel = `<div id="${ID}-tkl" style="position:absolute;left:${BXS[TK] - 150}px;top:${BASE - TKH - 44}px;width:300px;text-align:center;opacity:0"><span style="font-family:SatoshiBold,Satoshi;font-weight:700;font-size:22px;letter-spacing:.14em;color:${F}">THANKSGIVING</span></div>`;
  const tkLead = `<path id="${ID}-tkld" class="dr" pathLength="1" d="M${BXS[TK]},${BASE - TKH - 16} V${BASE - TKH - 4}" ${s(2)}/>`;

  const body = `
<div id="${ID}-card" class="${panelClass(ID)}" style="position:absolute;left:${X}px;top:${Y}px;width:${W}px;height:${H}px">
  ${EYEBROW("The fun old times", 32, 20, M, `${ID}-eb`)}
  <div id="${ID}-scl" style="position:absolute;left:0;top:0;width:${W - 12}px;height:${H - 12}px;transform:scale(${SC});transform-origin:0px ${GY}px">
  <div id="${ID}-pipe" style="position:absolute;left:0;top:0;width:${W - 12}px;height:${H - 12}px">
    <svg style="position:absolute;left:0;top:0;overflow:visible" width="${W - 12}" height="${H - 12}" viewBox="0 0 ${W - 12} ${H - 12}">
      ${feedD.map((d, i) => tube(d, `${ID}-f${i}`)).join("")}
      ${tube(chanD, `${ID}-ch`)}
      ${laneD.map((d, i) => tube(d, `${ID}-l${i}`)).join("")}
      <rect id="${ID}-chm" x="${CH.x0}" y="${CH.y0}" width="${CH.x1 - CH.x0}" height="${CH.y1 - CH.y0}" rx="10" fill="${C.rule}" opacity="0"/>
      <path id="${ID}-tray" class="dr" pathLength="1" d="M${TRAY.x0},${TRAY.y0} V${TRAY.y1} H${TRAY.x1} V${TRAY.y0}" ${s(2.5)}/>
      ${guides}
    </svg>
    <div style="position:absolute;left:0;top:0">${html}</div>
    <svg style="position:absolute;left:0;top:0;overflow:visible" width="${W - 12}" height="${H - 12}" viewBox="0 0 ${W - 12} ${H - 12}">
      <g id="${ID}-scr" opacity="0">
        <rect x="${SCR.x0}" y="${SCR.y0}" width="${SCR.x1 - SCR.x0}" height="${SCR.y1 - SCR.y0}" rx="2" fill="${C.bg}"/>
        <rect id="${ID}-tick" x="${SCR.x0}" y="${SCR.y0}" width="${SCR.x1 - SCR.x0}" height="${SCR.y1 - SCR.y0}" rx="2" fill="${C.accentSoft}" opacity="0"/>
        <rect x="${SCR.x0}" y="${SCR.y0}" width="${SCR.x1 - SCR.x0}" height="${SCR.y1 - SCR.y0}" rx="2" fill="none" stroke="${F}" stroke-width="2.5"/>
        <path d="${[...Array(7).keys()].map(j => `M${SCR.x0 + 7 + j * 7},${SCR.y0 + 2.5} V${SCR.y1 - 2.5}`).join(" ")}" stroke="${F}" stroke-width="2" stroke-linecap="butt"/>
      </g>
    </svg>
    ${LAB("cleanse", SCR.x1 + 14, SCR.y0 - 6, `${ID}-lcl`)}
    ${LAB("curate", 6, 330, `${ID}-lcu`, { w: 102, align: "right" })}
  </div>
  ${glyph}
  </div>
  <svg style="position:absolute;left:0;top:0;overflow:visible" width="${W - 12}" height="${H - 12}" viewBox="0 0 ${W - 12} ${H - 12}">
    ${chart}
    <g id="${ID}-gh" opacity="0">${ghosts}</g>
    <path id="${ID}-fc" d="${fcLine}" fill="none" stroke="${F}" stroke-width="5" stroke-dasharray="0.1 11" stroke-linecap="round" stroke-linejoin="round" opacity=".8"/>
    ${tkLead}
  </svg>
  ${LAB("aggregate", BXS[0] - BW / 2, BASE + 6, `${ID}-lag`)}
  ${tkLabel}
</div>`;

  let js = "";
  js += wipeUp(`#${ID}-card`, 0, 0.35);
  // the sources drop in one by one, starting while the card arrives
  [0.12, 0.42, 0.72, 1.02].forEach((t, i) => { js += `tl.fromTo("#${ID}-g${i}",{opacity:0,y:-20},{opacity:1,y:0,duration:0.4,ease:"back.out(1.6)",immediateRender:true},${f3(t)});\n`; });
  // tubes draw from the glyphs into the channel
  [0, 1, 2, 3].forEach(i => { js += drawAll(`#${ID}-f${i}`, 0.9 + i * 0.15, 0.55); });
  js += drawAll(`#${ID}-ch`, 1.6, 0.4);
  js += js0.join("\n") + "\n";
  // cleansing: the chamber opens and the screen draws across it; the tray beside it
  js += `tl.fromTo("#${ID}-chm",{opacity:0,scaleX:0.4,svgOrigin:"${CX} ${(CH.y0 + CH.y1) / 2}"},{opacity:1,scaleX:1,svgOrigin:"${CX} ${(CH.y0 + CH.y1) / 2}",duration:0.35,ease:"power2.out",immediateRender:true},${f3(tCl - 0.05)});\n`;
  js += `tl.fromTo("#${ID}-scr",{opacity:0,scaleX:0,svgOrigin:"${CX} ${(SCR.y0 + SCR.y1) / 2}"},{opacity:1,scaleX:1,svgOrigin:"${CX} ${(SCR.y0 + SCR.y1) / 2}",duration:0.35,ease:"power2.out",immediateRender:true},${f3(tCl)});\n`;
  js += drawAll(`#${ID}-tray`, tCl + 0.1, 0.4);
  js += rowUp(`#${ID}-lcl`, tCl);
  // curating: three lanes
  [0, 1, 2].forEach(i => { js += drawAll(`#${ID}-l${i}`, tCu + i * 0.08, 0.4); });
  js += rowUp(`#${ID}-lcu`, tCu);
  // aggregating: the axis draws and the bars grow
  js += drawAll(`#${ID}-ax`, tAg - 0.1, 0.4);
  BXS.forEach((x, i) => { js += `tl.fromTo("#${ID}-b${i}",{scaleY:0,svgOrigin:"${x} ${BASE}"},{scaleY:1,svgOrigin:"${x} ${BASE}",duration:0.4,ease:"power3.out",immediateRender:true},${f3(tAg + i * 0.1)});\n`; });
  js += rowUp(`#${ID}-lag`, tAg + 0.2);
  // Thanksgiving: one bar rises taller in accent, its label right above it
  js += `tl.fromTo("#${ID}-tk",{opacity:1,scaleY:${(BH[TK] / TKH).toFixed(3)},svgOrigin:"${BXS[TK]} ${BASE}"},{opacity:1,scaleY:1,svgOrigin:"${BXS[TK]} ${BASE}",duration:0.55,ease:"back.out(1.6)",immediateRender:false},${f3(tTh)});\n`;
  js += `tl.fromTo("#${ID}-tk",{opacity:0},{opacity:0,duration:${f3(tTh)},immediateRender:true},0);\n`;
  js += `tl.fromTo("#${ID}-b${TK}",{opacity:1},{opacity:0,duration:0.2,immediateRender:false},${f3(tTh)});\n`;
  js += rowUp(`#${ID}-tkl`, tTh + 0.35) + drawAll(`#${ID}-tkld`, tTh + 0.45, 0.25);
  // forecasting: the pipeline steps back; faint outline bars and the dotted trend line
  js += `tl.fromTo("#${ID}-pipe",{opacity:1},{opacity:0.4,duration:0.5,ease:"power1.out",immediateRender:false},${f3(tFc - 0.1)});\n`;
  js += show(`#${ID}-gh`, tFu - 0.15, 0.4);                       // the future bars land on "future"
  js += `tl.fromTo("#${ID}-fc",{clipPath:"inset(-20px 100% -20px 0)"},{clipPath:"inset(-20px 0% -20px 0)",duration:${f3(tFu - tFc + 0.1)},ease:"power1.inOut",immediateRender:true},${f3(tFc)});\n`;
  // exit, complete on the last frame (round 2: the shared exit read as a snap)
  if (exitIfFree(ID, D, [`#${ID}-card`])) {
    // round 3: linear over 0.5s from the card's own top edge (0px, not the -90px shadow pad) to past its
    // shadow (125%), so it visibly travels ~12 frames
    const tX = +(D - 0.5 - 1 / 30).toFixed(3);
    js += `tl.fromTo("#${ID}-card",{clipPath:"inset(0px -90px -110px -90px)"},{clipPath:"inset(125% -90px -110px -90px)",duration:0.5,ease:"none",immediateRender:false},${tX});\n`;
  }
  emit(ID, D, body, js);
}
