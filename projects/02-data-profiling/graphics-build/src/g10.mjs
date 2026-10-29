// g10: the five words, step-built in the HERO card (analogy).
//   EPISODE  ("attempt"): a film strip draws left to right, six cells; the T starts far from its
//            outline in the first cell and sits on it in the last. An $accent playhead runs the strip.
//   FRAME    ("frame"):   cell 3 lifts out and enlarges below the strip; on "camera" viewfinder
//            corners draw round it.
//   ACTION / STATE ("action", "state"): the strip leaves and 01's leader
//            (filled) and follower (outline) SO-101 arms draw (common.mjs so101, as 01's g11b). The
//            leader moves from "action" (a human moving it); on "leader" an ACTION arrow draws from the
//            leader to the follower; from "state" the follower follows 0.4s behind (STATE).
//   JOINT    ("joint"):   the follower's shoulder ring pulses $accent, label JOINT; on "more" the
//            ALOHA's two arms land as a small separate pair top-right, a ring on each joint,
//            with the title slot reading "ALOHA  14 joints". The title slot carries a bold
//            word + gloss for every term: Episode, Frame, Action, State, Joint.
// One $accent at a time: the playhead (to "action"), the ACTION arrow ("leader" to "joint"), then
// the joint ring. Continuous motion: playhead loop, then the leader's motion to the end.
import { C, emit, frames, panelClass, fg, dim, wipeUp, cueIn } from "../lib.mjs";
import { T, EYEBROW, rowUp, show, hide, drawAll, cueRel, exitIfFree, HERO, f3, so101 } from "../common.mjs";
import { fade, pill, holdHidden } from "./_part2.mjs";

const ID = "g10";
// film strip, card-local
const SX = 20, SY = 150, CELL = 80, GAP = 12, NC = 6, SW = NC * CELL + (NC - 1) * GAP, SH = 116;
const cellX = i => SX + i * (CELL + GAP), CY = SY + 18;
// the T (bar 36x10, stem 10x24) about its own centre, and its pose per cell: far -> on the outline
const TPATH = "M-18,-14 H18 V-4 H5 V20 H-5 V-4 H-18 Z";
const POSE0 = [30, 32, -45], POSE1 = [44, 42, 0];
const pose = p => POSE0.map((v, k) => v + (POSE1[k] - v) * p);
const LIFT = 2;                                                   // the cell that becomes FRAME
const BIG = { x: 210, y: 284, s: 156 };                           // the enlarged frame
// arms (so101 boxes are 220x260; drawn extents x 40..206, y 66..242 inside the box)
const LEAD = [10, 170], FOLL = [300, 170];
// "more": ALOHA's two arms as a SEPARATE small pair top-right (round 2: ghosted behind the follower
// they ran through STATE and JOINT), facing each other, a ring on each joint.
const PAIR = { xl: 326, xr: 452, y: 24, s: 0.5 };
const JOINTS = [[91, 188], [91, 84], [187, 84]];
const PAIR_RINGS = [...JOINTS.map(([u, v]) => [PAIR.xl + u * PAIR.s, PAIR.y + v * PAIR.s]),
                    ...JOINTS.map(([u, v]) => [PAIR.xr + (220 - u) * PAIR.s, PAIR.y + v * PAIR.s])];
// the title slot: a bold word and a one-line gloss, swapped on each cue (Episode and Frame live in p1)
const TITLES = [["ta", "Action", "the command it was given", 124], ["ts", "State", "how the robot actually responded", 99],
                ["tj", "Joint", "one of the robot's moving parts", 97], ["tm", "ALOHA", "14 joints", 140]];

const cellSVG = (id, i, big = false) => {
  const [x, y, r] = pose(i / (NC - 1));
  const out = `<path d="${TPATH}" transform="translate(${POSE1[0]},${POSE1[1]})" fill="none" stroke="${C.muted}" stroke-width="${big ? 1.4 : 2}" stroke-dasharray="${big ? "2.5 2.5" : "4 3"}"/>`;
  const t = `<g transform="translate(${f3(x)},${f3(y)}) rotate(${f3(r)})"><path d="${TPATH}" fill="${C.ink}" stroke="${C.ink}" stroke-width="1" stroke-linejoin="round"/><circle cx="0" cy="${30}" r="4.5" fill="${C.ink}"/></g>`;
  return `<svg id="${id}" style="position:absolute;left:${big ? BIG.x : cellX(i)}px;top:${big ? BIG.y : CY}px;overflow:visible" width="${big ? BIG.s : CELL}" height="${big ? BIG.s : CELL}" viewBox="0 0 ${CELL} ${CELL}">
    <rect x="0.75" y="0.75" width="${CELL - 1.5}" height="${CELL - 1.5}" rx="4" fill="#FFFFFF" stroke="${C.ink}" stroke-width="${big ? 1.2 : 2.5}"/>${out}${t}</svg>`;
};

export default function build() {
  const D = frames(ID) / 30;
  const F = fg(ID), M = dim(ID);
  const c = k => cueRel(ID, k);
  const tAt = c("attempt"), tFr = c("frame"), tCam = c("camera"), tAc = c("action"), tSt = c("state"),
        tLd = c("leader"), tFo = c("follower"), tJ = c("joint"), tMo = c("more");
  const tOutline = cueIn(ID, "outline");                          // "...onto the outline." (transcript-cut)
  const W = 592, H = 492, IW = W - 12;

  const holes = [...Array(24).keys()].map(i => { const x = SX + 10 + i * ((SW - 20) / 23);
    return `<rect x="${f3(x - 4)}" y="${SY + 5}" width="8" height="6" rx="1.5" fill="${M}"/><rect x="${f3(x - 4)}" y="${SY + SH - 11}" width="8" height="6" rx="1.5" fill="${M}"/>`; }).join("");
  const strip = `<div id="${ID}-strip" style="position:absolute;left:0;top:0;width:${IW}px;height:300px">
      <svg style="position:absolute;left:0;top:0;overflow:visible" width="${IW}" height="300">
        <rect class="dr" pathLength="1" x="${SX - 8}" y="${SY}" width="${SW + 16}" height="${SH}" rx="6" fill="none" stroke="${F}" stroke-width="3"/>
        <g id="${ID}-holes" opacity="0">${holes}</g></svg>
      ${[...Array(NC).keys()].map(i => cellSVG(`${ID}-c${i}`, i)).join("")}
      <div id="${ID}-ph" style="position:absolute;left:${SX - 6}px;top:${SY + 12}px;width:4px;height:${SH - 24}px;border-radius:2px;background:${C.accent}"></div>
    </div>`;
  const corners = (() => { const p = 14, a = 26, x0 = BIG.x - p, y0 = BIG.y - p, x1 = BIG.x + BIG.s + p, y1 = BIG.y + BIG.s + p;
    return `<svg id="${ID}-vf" style="position:absolute;left:0;top:0;overflow:visible" width="${IW}" height="${H}">
      ${[[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]].map(([x, y, sx, sy]) => `<path class="dr" pathLength="1" d="M${x},${y + sy * a} V${y} H${x + sx * a}" fill="none" stroke="${F}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`).join("")}
      <circle cx="${x1 - 12}" cy="${y0 + 12}" r="5" fill="${F}"/></svg>`; })();
  const arms = `<div id="${ID}-arms" style="position:absolute;left:0;top:0">
      <div id="${ID}-gh" style="position:absolute;left:0;top:0;opacity:0">
        <div style="position:absolute;left:${PAIR.xl}px;top:${PAIR.y}px;width:${Math.round(220 * PAIR.s)}px;height:${Math.round(260 * PAIR.s)}px"><div style="position:relative;width:220px;height:260px;transform:scale(${PAIR.s});transform-origin:0 0">${so101(`${ID}-g1`, 0, 0, false, F)}</div></div>
        <div style="position:absolute;left:${PAIR.xr}px;top:${PAIR.y}px;width:${Math.round(220 * PAIR.s)}px;height:${Math.round(260 * PAIR.s)}px;transform:scaleX(-1)"><div style="position:relative;width:220px;height:260px;transform:scale(${PAIR.s});transform-origin:0 0">${so101(`${ID}-g2`, 0, 0, false, F)}</div></div>
        <svg style="position:absolute;left:0;top:0;overflow:visible" width="${IW}" height="${H}">
          ${PAIR_RINGS.map(([x, y], i) => `<circle id="${ID}-gj${i}" cx="${f3(x)}" cy="${f3(y)}" r="8" fill="none" stroke="${F}" stroke-width="2.5"/>`).join("")}</svg></div>
      <div id="${ID}-A">${so101(`${ID}-a`, LEAD[0], LEAD[1], true, F)}</div>
      <div id="${ID}-B">${so101(`${ID}-b`, FOLL[0], FOLL[1], false, F)}</div>
      <svg id="${ID}-arrow" style="position:absolute;left:0;top:0;overflow:visible" width="${IW}" height="${H}">
        <line id="${ID}-arl" x1="232" y1="334" x2="352" y2="334" stroke="${C.accent}" stroke-width="4" stroke-dasharray="3 12" stroke-linecap="round"/>
        <path id="${ID}-arh" d="M342,324 L356,334 L342,344" fill="none" stroke="${C.accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <svg id="${ID}-ring" style="position:absolute;left:0;top:0;overflow:visible" width="${IW}" height="${H}">
        <circle id="${ID}-rc" cx="${FOLL[0] + 91}" cy="${FOLL[1] + 188}" r="19" fill="none" stroke="${C.accent}" stroke-width="5"/></svg>
      ${T("Leader", LEAD[0] + 43, 424, 22, { w: 160, align: "center", weight: 700, color: M, ls: 0.14, upper: true, id: `${ID}-ll` })}
      ${T("Follower", FOLL[0] + 43, 424, 22, { w: 160, align: "center", weight: 700, color: M, ls: 0.14, upper: true, id: `${ID}-lf` })}
      ${pill(`${ID}-pa`, "Action", 292, 282, { size: 24, w: 160 })}
      ${pill(`${ID}-ps`, "State", FOLL[0] + 150, 176, { size: 24, w: 160 })}
      ${pill(`${ID}-pj`, "Joint", FOLL[0] + 200, 338, { size: 24, w: 120 })}
      ${TITLES.map(([k, t, g, w]) => T(t, 28, 62, 40, { weight: 900, color: F, id: `${ID}-${k}` }) + T(g, 28 + w + 24, 76, 24, { weight: 500, color: M, id: `${ID}-${k}g` })).join("")}
    </div>`;

  const body = `
<div id="${ID}-card" class="${panelClass(ID)}" style="position:absolute;left:${HERO.x}px;top:${HERO.y}px;width:${W}px;height:${H}px;overflow:hidden">
  ${EYEBROW("Five words", 28, 22, M, `${ID}-eb`)}
  <div id="${ID}-p1">
    ${T("Episode", 28, 62, 40, { weight: 900, color: F, id: `${ID}-te` })}
    ${T("one attempt, start to finish", 210, 76, 24, { weight: 500, color: M, id: `${ID}-de` })}
    ${T("Frame", 28, 62, 40, { weight: 900, color: F, id: `${ID}-tf` })}
    ${T("one moment in time", 166, 76, 24, { weight: 500, color: M, id: `${ID}-df` })}
    ${cellSVG(`${ID}-big`, LIFT, true)}
    ${corners}
  </div>
  ${strip}
  ${arms}
</div>`;

  let js = wipeUp(`#${ID}-card`, 0, 0.35) + "\n" + rowUp(`#${ID}-eb`, 0.1);
  // ---- EPISODE: the term on "episode" (0.1), the strip draws and fills cell by cell to "outline"
  js += rowUp(`#${ID}-te`, 0.05) + rowUp(`#${ID}-de`, tAt);   // first content arrives with the card
  // the strip sits centred in the card until "frame", then rises to make room for the lifted cell
  const SDY = 62;
  js += `tl.fromTo("#${ID}-strip",{y:${SDY}},{y:0,duration:0.5,ease:"power2.inOut",immediateRender:true},${f3(tFr - 0.5)});\n`;
  js += drawAll(`#${ID}-strip .dr`, 0.15, 0.8) + show(`#${ID}-holes`, tAt + 0.4, 0.4);
  const cellT = i => tAt + 0.5 + i * (tOutline - tAt - 0.5) / (NC - 1);
  for (let i = 0; i < NC; i++) js += show(`#${ID}-c${i}`, cellT(i), 0.3, "y:10", "y:0");
  // the playhead leads the cells in, then loops the strip until "action"
  js += `tl.fromTo("#${ID}-ph",{opacity:0},{opacity:1,duration:0.3},${f3(tAt + 0.3)});\n`;
  js += `tl.fromTo("#${ID}-ph",{x:0},{x:${SW + 4},duration:${f3(tOutline - tAt + 0.2)},ease:"none",immediateRender:false},${f3(tAt + 0.3)});\n`;
  const pp = 3, pn = Math.max(1, Math.floor((tAc - 0.4 - (tOutline + 0.6)) / pp));
  js += `tl.fromTo("#${ID}-ph",{x:0},{x:${SW + 4},duration:${pp},ease:"none",repeat:${pn - 1},immediateRender:false},${f3(tOutline + 0.6)});\n`;
  // ---- FRAME: cell 3 lifts out and enlarges below the strip; corners draw on "camera"
  js += hide(`#${ID}-te`, tFr - 0.2, 0.2) + hide(`#${ID}-de`, tFr - 0.2, 0.2);
  js += rowUp(`#${ID}-tf`, tFr) + rowUp(`#${ID}-df`, tFr + 0.3);
  const k0 = CELL / BIG.s, dx = cellX(LIFT) - BIG.x, dy = CY - BIG.y;
  js += `tl.fromTo("#${ID}-big",{opacity:0,x:${dx},y:${dy},scale:${f3(k0)},transformOrigin:"0 0"},{opacity:1,x:0,y:0,scale:1,transformOrigin:"0 0",duration:0.6,ease:"power3.inOut"},${f3(tFr)});\n`;
  js += `tl.fromTo("#${ID}-c${LIFT}",{opacity:1},{opacity:0.25,duration:0.3,immediateRender:false},${f3(tFr)});\n`;
  js += drawAll(`#${ID}-vf .dr`, tCam - 0.1, 0.4) + `tl.fromTo("#${ID}-vf",{opacity:0},{opacity:1,duration:0.2},${f3(tCam - 0.1)});\n`;
  js += `tl.fromTo("#${ID}-vf",{scale:1,transformOrigin:"${BIG.x + BIG.s / 2}px ${BIG.y + BIG.s / 2}px"},{scale:1.04,transformOrigin:"${BIG.x + BIG.s / 2}px ${BIG.y + BIG.s / 2}px",duration:0.9,yoyo:true,repeat:${2 * Math.max(1, Math.floor((tAc - 0.4 - tCam - 0.5) / 1.8)) - 1},ease:"sine.inOut",immediateRender:false},${f3(tCam + 0.5)});\n`;
  // ---- ACTION / STATE: phase 1 and the strip clear, the arms draw
  js += hide(`#${ID}-p1`, tAc - 0.45, 0.3) + hide(`#${ID}-strip`, tAc - 0.45, 0.3);
  js += holdHidden(`#${ID}-A`) + holdHidden(`#${ID}-B`) + holdHidden(`#${ID}-ll`) + holdHidden(`#${ID}-lf`)
      + holdHidden(`#${ID}-pa`) + holdHidden(`#${ID}-ps`) + holdHidden(`#${ID}-pj`) + TITLES.map(([k]) => holdHidden(`#${ID}-${k}`) + holdHidden(`#${ID}-${k}g`)).join("")
      + holdHidden(`#${ID}-arrow`) + holdHidden(`#${ID}-ring`);
  js += fade(`#${ID}-A`, 0, 1, tAc, 0.35) + fade(`#${ID}-B`, 0, 1, tAc + 0.3, 0.35);
  js += fade(`#${ID}-ll`, 0, 1, tAc + 0.4, 0.3) + fade(`#${ID}-lf`, 0, 1, tAc + 0.6, 0.3);
  js += `tl.fromTo("#${ID}-pa",{opacity:0,y:12},{opacity:1,y:0,duration:0.35,ease:"power3.out",immediateRender:false},${f3(tAc + 0.1)});\n`;
  js += `tl.fromTo("#${ID}-ps",{opacity:0,y:12},{opacity:1,y:0,duration:0.35,ease:"power3.out",immediateRender:false},${f3(tSt)});\n`;
  // the leader moves from "action" to the end (a human moving it): one yoyo per joint, seek-safe
  const cyc = 1.8;
  const move = (who, t0) => { const n = Math.max(1, Math.floor((D - t0) / cyc));
    return `tl.fromTo("#${ID}-${who}-u",{rotation:0,svgOrigin:"91 188"},{rotation:-22,svgOrigin:"91 188",duration:${cyc / 2},yoyo:true,repeat:${2 * n - 1},ease:"sine.inOut",immediateRender:false},${f3(t0)});\n`
      + `tl.fromTo("#${ID}-${who}-f",{rotation:0,svgOrigin:"91 84"},{rotation:30,svgOrigin:"91 84",duration:${cyc / 2},yoyo:true,repeat:${2 * n - 1},ease:"sine.inOut",immediateRender:false},${f3(t0)});\n`; };
  const tMove = tAc + 0.7;
  js += move("a", tMove);
  // "leader": the ACTION arrow draws leader -> follower ($accent), dashes march toward the follower
  js += fade(`#${ID}-arrow`, 0, 1, tLd, 0.2) + `tl.fromTo("#${ID}-arrow",{clipPath:"inset(0 100% 0 0)"},{clipPath:"inset(0 0% 0 0)",duration:0.45,ease:"power2.out"},${f3(tLd)});\n`;
  js += `tl.fromTo("#${ID}-arl",{strokeDashoffset:0},{strokeDashoffset:-30,duration:0.6,ease:"none",repeat:${Math.max(0, Math.floor((D - tLd - 0.5) / 0.6) - 1)},immediateRender:false},${f3(tLd + 0.5)});\n`;
  // the follower follows from "state", 0.4s behind the leader's phase (review: it sat frozen for 11s)
  const lag = 0.4, tF0 = tMove + Math.max(0, Math.ceil((tSt - lag - tMove) / cyc)) * cyc + lag;
  js += move("b", tF0);
  // "joint": the arrow drops to $muted, the shoulder ring pulses $accent
  js += `tl.fromTo(["#${ID}-arl","#${ID}-arh"],{stroke:"${C.accent}"},{stroke:"${M}",duration:0.3,immediateRender:false},${f3(tJ - 0.1)});\n`;
  js += fade(`#${ID}-ring`, 0, 1, tJ, 0.25);
  const rp = 1.2, rn = Math.max(1, Math.floor((D - tJ) / rp));
  js += `tl.fromTo("#${ID}-rc",{attr:{r:17}},{attr:{r:24},duration:${rp / 2},yoyo:true,repeat:${2 * rn - 1},ease:"sine.inOut",immediateRender:false},${f3(tJ)});\n`;
  js += `tl.fromTo("#${ID}-pj",{opacity:0,x:-10},{opacity:1,x:0,duration:0.35,ease:"power3.out",immediateRender:false},${f3(tJ + 0.15)});\n`;
  // "more": the ALOHA pair ghosts in behind the follower, and its joint rings pop one by one
  js += fade(`#${ID}-gh`, 0, 1, tMo + 0.1, 0.35) + PAIR_RINGS.map(([x, y], i) => show(`#${ID}-gj${i}`, tMo + 0.4 + i * 0.1, 0.25, `scale:0.3,svgOrigin:"${f3(x)} ${f3(y)}"`, `scale:1,svgOrigin:"${f3(x)} ${f3(y)}"`)).join("");
  // the title slot swaps on each cue: Action, State, Joint, then ALOHA (14 joints)
  const tT = [tAc, tSt, tJ, tMo];
  TITLES.forEach(([k], i) => {
    const up = (sel, t) => `tl.fromTo("#${sel}",{opacity:0,y:14},{opacity:1,y:0,duration:0.35,ease:"power3.out",immediateRender:false},${f3(t)});\n`;
    js += up(`${ID}-${k}`, tT[i]) + up(`${ID}-${k}g`, tT[i] + 0.25);
    if (i < 3) js += fade(`#${ID}-${k}`, 1, 0, tT[i + 1] - 0.25, 0.2) + fade(`#${ID}-${k}g`, 1, 0, tT[i + 1] - 0.25, 0.2);
  });
  js += exitIfFree(ID, D, [`#${ID}-card`]);
  emit(ID, D, body, js);
}
