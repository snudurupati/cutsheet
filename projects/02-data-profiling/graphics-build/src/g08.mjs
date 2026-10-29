// g08: garbage in, garbage out, then why profiling exists (analogy, HERO card), three movements.
//   1 "garbage" (part start) .. "exploratory": a funnel; a bent bolt then a crumpled page appear whole
//     below the eyebrow, drop in, and the SAME shape falls out of the spout (the bolt on "out") to rest
//     beside GARBAGE OUT, where both pulse slowly. On "exploratory" the funnel's mouth morphs into the lens.
//   2 "exploratory" .. "robotics": the funnel gives way to a scatter with the small lens scanning it;
//     "plot" draws the fitted curve, "outliers" rings the one far-off dot $accent, "curve" pulses the
//     ring, "proper" drops the outlier (the data that trains the model is the representative sample).
//   3 "robotics" .. end: the series humanoid at a table with a cup; on "policy" it reaches and misses
//     (honest motion: the cup stays put; the open gripper stops ~50px short and closes on air), MISSED; on "robot"
//     it looks down at its empty gripper.
import { C, emit, frames, panelClass, fg, dim, wipeUp } from "../lib.mjs";
import { T, EYEBROW, rowUp, show, hide, drawAll, cueRel, exitIfFree, HERO, f3, prng } from "../common.mjs";
import { humanoid, humArm, humIdle, humReach } from "../hum.mjs";
import { fade, holdHidden } from "./_part2.mjs";

const ID = "g08";
const W = 592, H = 492, IW = W - 12;
// funnel (card-local)
const FX = 300, RIM_Y = 168, RIM_RX = 124, RIM_RY = 18, SPOUT_Y = 320, SPOUT_W = 36, SPOUT_END = 356;
// scraps: 72x88 boxes. They appear whole inside the card below the eyebrow (lane y 64..rim), fall
// into the mouth, and the SAME shape drops out of the spout to rest beside GARBAGE OUT.
const SCW = 72, SCH = 88, LANE_TOP = 64, REST = { bolt: 288, page: 384 };
// scatter
const AX = { x0: 64, x1: 540, y0: 96, y1: 420 };
const curveY = x => AX.y1 - 20 - 250 * (1 - Math.exp(-(x - AX.x0) / 150));
const OUT = [440, 388];
const L0 = [150, 200], LR = 46;                         // where the lens appears (the funnel mouth morphs to it)                                  // the outlier, far below the curve
// humanoid scene: user space 360x520 (as 01's tableScene), cup on the table at CUP
// Round 2: the beat was tiny (cup ~30px). Robot and table at 0.9 (1.25x), the cup itself 1.5x larger
// (46 user px wide, ~41 canvas px), the whole scene centred; the eyebrow moves top-right, clear of the head.
const SC = 0.9, HUM_X = 128, HUM_Y = 18, CW = 23, CH = 24, CUP = [272, 302 - CH];
const MISS = 56, MISS_AT = [CUP[0] - CW - MISS, CUP[1] + 2];   // fingertips' stop, user space: ~50 canvas px short

const BOLT = `<g fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
  <path d="M6,6 L18,2 L28,8 L28,18 L16,22 L6,16 Z"/><path d="M18,20 L22,34 L34,40 L40,52"/>
  <path d="M15,26 L25,24 M18,32 L28,30"/></g>`;
const PAGE = `<g fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
  <path d="M4,10 L14,2 L26,8 L38,4 L42,18 L36,28 L42,40 L28,46 L16,40 L4,44 L8,28 Z"/>
  <path d="M14,12 L22,24 L18,36 M28,14 L30,30"/></g>`;
const scrap = (id, art, color, x, y) =>
  `<svg id="${id}" style="position:absolute;left:${x}px;top:${y}px;overflow:visible" width="${SCW}" height="${SCH}" viewBox="0 0 46 56" stroke="${color}">${art}</svg>`;

export default function build() {
  const D = frames(ID) / 30;
  const F = fg(ID), M = dim(ID);
  const c = k => cueRel(ID, k);
  const tOut = c("out"), tEx = c("exploratory"), tPl = c("plot"), tOl = c("outliers"), tCu = c("curve"),
        tPr = c("proper"), tRo = c("robotics"), tPo = c("policy"), tRb = c("robot");

  // ---------------------------------------------------------------- 1 the funnel
  const funnel = `<svg id="${ID}-fun" style="position:absolute;left:0;top:0;overflow:visible" width="${IW}" height="${H}">
      <ellipse id="${ID}-rim" class="dr" pathLength="1" cx="${FX}" cy="${RIM_Y}" rx="${RIM_RX}" ry="${RIM_RY}" fill="none" stroke="${F}" stroke-width="3.5"/>
      <path id="${ID}-cone" class="dr" pathLength="1" d="M${FX - RIM_RX},${RIM_Y} L${FX - SPOUT_W / 2},${SPOUT_Y} V${SPOUT_END} M${FX + RIM_RX},${RIM_Y} L${FX + SPOUT_W / 2},${SPOUT_Y} V${SPOUT_END}" fill="none" stroke="${F}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>
    </svg>`;
  // the drop-in lane is clipped at the rim, the fall-out lane starts at the spout: a scrap vanishes
  // into the funnel and the same scrap appears out of the spout
  const inLane = `<div id="${ID}-li" style="position:absolute;left:0;top:${LANE_TOP}px;width:${IW}px;height:${RIM_Y - 2 - LANE_TOP}px;overflow:hidden">
      ${scrap(`${ID}-ib`, BOLT, F, FX - SCW / 2, 4)}${scrap(`${ID}-ip`, PAGE, F, FX - SCW / 2, 4)}</div>`;
  const outLane = `<div id="${ID}-lo" style="position:absolute;left:0;top:${SPOUT_END}px;width:${IW}px;height:${H - 12 - SPOUT_END}px;overflow:hidden">
      ${scrap(`${ID}-ob`, BOLT, F, FX - SCW / 2, 0)}${scrap(`${ID}-op`, PAGE, F, FX - SCW / 2, 0)}</div>`;
  const p1 = `<div id="${ID}-p1" style="position:absolute;inset:0">
      ${funnel}${inLane}${outLane}
      ${T("Garbage in", 28, 24, 28, { weight: 700, color: F, ls: 0.18, upper: true, id: `${ID}-gi` })}
      ${T("Garbage out", 28, 412, 28, { weight: 700, color: F, ls: 0.18, upper: true, id: `${ID}-go` })}
      <div id="${ID}-gou" style="position:absolute;left:28px;top:452px;width:120px;height:5px;border-radius:3px;background:${C.accent}"></div>
    </div>`;

  // ---------------------------------------------------------------- 2 the scatter
  const r = prng(208);
  const pts = [];
  for (let i = 0; i < 26; i++) { const x = AX.x0 + 24 + i * (AX.x1 - AX.x0 - 44) / 25 + (r() - 0.5) * 10;
    pts.push([x, curveY(x) + (r() - 0.5) * 44]); }
  const curveD = (() => { let d = ""; for (let x = AX.x0 + 6; x <= AX.x1; x += 8) d += `${d ? "L" : "M"}${x},${f3(curveY(x))} `; return d; })();
  const p2 = `<div id="${ID}-p2" style="position:absolute;inset:0">
      ${EYEBROW("Exploratory analysis", 28, 24, M, `${ID}-eb2`)}
      <svg style="position:absolute;left:0;top:0;overflow:visible" width="${IW}" height="${H}">
        <path class="dr" pathLength="1" d="M${AX.x0},${AX.y0} V${AX.y1} H${AX.x1}" fill="none" stroke="${M}" stroke-width="3" stroke-linecap="round"/>
        <g id="${ID}-pts">${pts.map(([x, y], i) => `<circle id="${ID}-pt${i}" cx="${f3(x)}" cy="${f3(y)}" r="7" fill="${F}"/>`).join("")}</g>
        <path id="${ID}-cv" class="dr" pathLength="1" d="${curveD}" fill="none" stroke="${F}" stroke-width="3" stroke-linecap="round"/>
        <circle id="${ID}-od" cx="${OUT[0]}" cy="${OUT[1]}" r="7" fill="${F}"/>
        <circle id="${ID}-oa" cx="${OUT[0]}" cy="${OUT[1]}" r="7" fill="${C.accent}"/>
        <circle id="${ID}-ring" cx="${OUT[0]}" cy="${OUT[1]}" r="18" fill="none" stroke="${C.accent}" stroke-width="4"/>
        <g id="${ID}-lens"><circle cx="0" cy="0" r="${LR}" fill="#FFFFFF" fill-opacity="0.18" stroke="${F}" stroke-width="4"/>
          <path d="M${f3(LR * 0.72)},${f3(LR * 0.72)} L${f3(LR * 0.72 + 30)},${f3(LR * 0.72 + 30)}" stroke="${F}" stroke-width="8" stroke-linecap="round"/></g>
      </svg>
    </div>`;

  // ---------------------------------------------------------------- 3 the humanoid misses the cup
  const p3 = `<div id="${ID}-p3" style="position:absolute;inset:0">
      ${EYEBROW("In robotics", 322, 24, M, `${ID}-eb3`)}
      <div style="position:absolute;left:${HUM_X}px;top:${HUM_Y}px">${humanoid(`${ID}-h`, 0, 0, SC, { stroke: F })}
        <svg style="position:absolute;left:0;top:0;overflow:visible" width="${Math.round(360 * SC)}" height="${Math.round(520 * SC)}" viewBox="0 0 360 520">
          <path d="M190,302 H340 M212,302 V506 M320,302 V506" fill="none" stroke="${M}" stroke-width="4" stroke-linecap="round"/>
          <path d="M${CUP[0] - CW},${CUP[1] - CH} H${CUP[0] + CW} L${CUP[0] + CW - 5},${CUP[1] + CH} H${CUP[0] - CW + 5} Z M${CUP[0] + CW - 1},${CUP[1] - 13} C${CUP[0] + CW + 18},${CUP[1] - 13} ${CUP[0] + CW + 18},${CUP[1] + 10} ${CUP[0] + CW - 3},${CUP[1] + 9}" fill="${C.bg}" stroke="${F}" stroke-width="4" stroke-linejoin="round"/>
          <circle id="${ID}-ms" cx="${MISS_AT[0]}" cy="${MISS_AT[1]}" r="26" fill="none" stroke="${C.accent}" stroke-width="4" stroke-dasharray="7 7"/>
        </svg></div>
      ${T("Missed", 376, 182, 28, { weight: 700, color: F, ls: 0.18, upper: true, id: `${ID}-mt` })}
    </div>`;

  const body = `
<div id="${ID}-card" class="${panelClass(ID)}" style="position:absolute;left:${HERO.x}px;top:${HERO.y}px;width:${W}px;height:${H}px;overflow:hidden">
  ${p1}${p2}${p3}
</div>`;

  let js = wipeUp(`#${ID}-card`, 0, 0.35) + "\n";
  // ---- 1: the funnel draws with the card, scrap cycles in and out until "exploratory"
  js += drawAll(`#${ID}-fun .dr`, 0.05, 0.5) + rowUp(`#${ID}-gi`, 0.1) + rowUp(`#${ID}-go`, tOut);
  js += `tl.fromTo("#${ID}-gou",{scaleX:0,transformOrigin:"left center"},{scaleX:1,transformOrigin:"left center",duration:0.4,ease:"power2.out"},${f3(tOut + 0.2)});\n`;
  // two drops on the opening line, then the scrap rests beside GARBAGE OUT with a slow pulse:
  // the bolt appears and falls in on "garbage in", drops out on "out"; the page follows a beat later
  const restY = H - 12 - SPOUT_END - SCH - 18;              // clear of the card's bottom border, rotation included
  const drop = (k, tSpawn, tIn, tOutK, rest, rot) =>
    `tl.fromTo("#${ID}-i${k}",{opacity:0,y:0},{opacity:1,y:0,duration:0.25,ease:"power1.out"},${f3(tSpawn)});\n`
    + `tl.fromTo("#${ID}-i${k}",{y:0,rotation:0},{y:${RIM_Y - LANE_TOP + 10},rotation:${rot},duration:0.55,ease:"power2.in",immediateRender:false},${f3(tIn)});\n`
    + `tl.fromTo("#${ID}-o${k}",{x:0,y:${-SCH - 4},rotation:${rot}},{x:${rest - (FX - SCW / 2)},y:${restY},rotation:${rot * 0.5},duration:0.6,ease:"power2.in",immediateRender:true},${f3(tOutK)});\n`;
  js += drop("b", 0.05, 0.4, tOut, REST.bolt, 20) + drop("p", 1.6, 2.0, 2.7, REST.page, -14);
  const pr = 2.2, prn = Math.max(1, Math.floor((tEx - 0.6 - 3.5) / pr));
  js += `tl.fromTo(["#${ID}-ob","#${ID}-op"],{scale:1,transformOrigin:"50% 80%"},{scale:1.07,transformOrigin:"50% 80%",duration:${pr / 2},yoyo:true,repeat:${2 * prn - 1},ease:"sine.inOut",immediateRender:false},3.5);\n`;
  // the funnel breathes while the scraps rest (round 2: ~14s otherwise static)
  const fb = 2.4, fbn = Math.max(1, Math.floor((tEx - 0.65 - 3.6) / fb));
  js += `tl.fromTo("#${ID}-fun",{scale:1,transformOrigin:"${FX}px ${RIM_Y}px"},{scale:1.035,transformOrigin:"${FX}px ${RIM_Y}px",duration:${fb / 2},yoyo:true,repeat:${2 * fbn - 1},ease:"sine.inOut",immediateRender:false},3.6);\n`;
  // "exploratory": the funnel's mouth becomes the lens ring; everything else in movement 1 leaves
  js += [`#${ID}-gi`, `#${ID}-go`, `#${ID}-gou`, `#${ID}-cone`, `#${ID}-li`, `#${ID}-lo`].map(sel => hide(sel, tEx - 0.55, 0.3)).join("");
  js += `tl.fromTo("#${ID}-rim",{attr:{cx:${FX},cy:${RIM_Y},rx:${RIM_RX},ry:${RIM_RY}},strokeWidth:3.5},{attr:{cx:${L0[0]},cy:${L0[1]},rx:${LR},ry:${LR}},strokeWidth:4,duration:0.6,ease:"power2.inOut",immediateRender:false},${f3(tEx - 0.5)});\n`;
  js += hide(`#${ID}-rim`, tEx + 0.1, 0.15);
  // ---- 2: the scatter, the lens scanning, the curve, the outlier
  js += holdHidden(`#${ID}-p2`) + fade(`#${ID}-p2`, 0, 1, tEx - 0.1, 0.3);
  js += drawAll(`#${ID}-p2 path.dr:not(#${ID}-cv)`, tEx - 0.1, 0.6);
  pts.forEach((_, i) => { js += show(`#${ID}-pt${i}`, tEx + 0.1 + i * 0.04, 0.2); });
  js += show(`#${ID}-od`, tEx + 0.6, 0.2);
  js += drawAll(`#${ID}-cv`, tPl, 0.9);
  js += holdHidden(`#${ID}-oa`) + holdHidden(`#${ID}-ring`);
  // the lens: scans the scatter, settles on the outlier just before "outliers", leaves on "proper"
  const L1 = [330, 170], L2 = [250, 300], LO = OUT;
  js += `tl.fromTo("#${ID}-lens",{opacity:0,x:${L0[0]},y:${L0[1]}},{opacity:1,x:${L0[0]},y:${L0[1]},duration:0.15,ease:"none"},${f3(tEx + 0.08)});\n`;   // takes over from the morphed rim
  const legs = [[L0, L1, tEx + 0.8, tPl - 0.2], [L1, L2, tPl + 0.2, tOl - 1.6], [L2, LO, tOl - 1.4, tOl - 0.2]];
  legs.forEach(([a, b, t0, t1]) => { js += `tl.fromTo("#${ID}-lens",{x:${a[0]},y:${a[1]}},{x:${b[0]},y:${b[1]},duration:${f3(t1 - t0)},ease:"sine.inOut",immediateRender:false},${f3(t0)});\n`; });
  js += fade(`#${ID}-oa`, 0, 1, tOl, 0.25) + `tl.fromTo("#${ID}-ring",{opacity:0,attr:{r:8}},{opacity:1,attr:{r:18},duration:0.35,ease:"back.out(2)",immediateRender:false},${f3(tOl)});\n`;
  const pn = Math.max(1, Math.floor((tPr - tCu) / 0.8));
  js += `tl.fromTo("#${ID}-ring",{attr:{r:18}},{attr:{r:26},duration:0.4,yoyo:true,repeat:${2 * pn - 1},ease:"sine.inOut",immediateRender:false},${f3(tCu)});\n`;
  // "proper": the outlier is dropped, the lens moves on along the curve (the representative sample)
  js += hide(`#${ID}-ring`, tPr, 0.3) + hide(`#${ID}-oa`, tPr, 0.3) + fade(`#${ID}-od`, 1, 0.15, tPr, 0.4);
  js += `tl.fromTo("#${ID}-lens",{x:${LO[0]},y:${LO[1]}},{x:200,y:${f3(curveY(200))},duration:${f3(tRo - tPr - 0.6)},ease:"sine.inOut",immediateRender:false},${f3(tPr + 0.2)});\n`;
  js += hide(`#${ID}-p2`, tRo - 0.3, 0.3);
  // ---- 3: the humanoid at the table; it reaches on "policy" and closes on air; looks on "robot"
  js += holdHidden(`#${ID}-p3`) + fade(`#${ID}-p3`, 0, 1, tRo, 0.35) + holdHidden(`#${ID}-ms`) + holdHidden(`#${ID}-mt`);
  js += humIdle(`${ID}-h`, tRo + 0.3, tPo - 0.8, 3);
  // the fingertips stop MISS user px (about 50 canvas px) short of the cup's near side with the gripper
  // held wide open, then close visibly on air
  const reach = humReach("R", MISS_AT, { a: -30, b: -40 }, 4);
  js += humArm(`${ID}-h`, "R", { a: 0, b: 0, g: 0 }, { ...reach, g: -0.8 }, tPo - 0.5, 0.75) + humArm(`${ID}-h`, "R", { ...reach, g: -0.8 }, { ...reach, g: 1 }, tPo + 0.45, 0.4);
  js += show(`#${ID}-ms`, tPo + 0.8, 0.3) + show(`#${ID}-mt`, tPo + 1.5, 0.3, "y:8", "y:0")   // the miss reads first;
  js += `tl.fromTo("#${ID}-h-head",{rotation:0,svgOrigin:"120 104"},{rotation:13,svgOrigin:"120 104",duration:0.6,ease:"power2.inOut",immediateRender:false},${f3(tRb)});\n`;
  js += `tl.fromTo("#${ID}-ms",{scale:1,svgOrigin:"${MISS_AT[0]} ${MISS_AT[1]}"},{scale:1.12,svgOrigin:"${MISS_AT[0]} ${MISS_AT[1]}",duration:0.7,yoyo:true,repeat:${2 * Math.max(1, Math.floor((D - tPo - 1.4) / 1.4)) - 1},ease:"sine.inOut",immediateRender:false},${f3(tPo + 1.2)});\n`;
  js += exitIfFree(ID, D, [`#${ID}-card`]);
  emit(ID, D, body, js);
}
