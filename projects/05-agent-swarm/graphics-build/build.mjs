// 05-agent-swarm graphics build. One composition project per part under parts/<id>/,
// generated from here (never hand-written HTML per graphic). Adapted from
// 04-lightweight-ontology's build.mjs and lib.mjs.
//
// Every timing is DERIVED: part spans from cutsheet.json via span(), cue times from
// outputs/transcript-cut.json via cueIn(), punch-in geometry from demo-spec.json and
// screen-ocr.json. Nothing is typed in.
//
// GSAP contract (graphics skill, part C): one paused timeline per part registered on
// window.__timelines[id]; absolute seconds; every entrance a fromTo whose destination
// states the VISIBLE end; no random, no timers; no CSS transform on a property GSAP also
// tweens; clip-path wipes, never blur; instant changes take >= 0.2s; svgOrigin for SVG
// rotation; visibility by opacity tween, never a callback.
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { C, emit, span, frames, cueIn, panelClass, fg, dim, JAR, LIMB,
         LEFT_X0, wipeUp, wipeDown, exitAt, GRAIN_HTML, grainJS, brainInJar,
         mapZoom, plateau, zoomItem, markSVG, insetLeftDuring,
         robot, robotRoll, robotArm, robotHand, robotIdle, robotPoint, robotReach, robotHoldOff, ROBOT_GEOM, wheelAngle, spokeBlur, struck, strikeIn } from "./lib.mjs";

const ONLY = process.argv[2] || "";
const want = id => !ONLY || ONLY.split(",").includes(id);
const dur = id => frames(id) / 30;
const f3 = v => (+v).toFixed(3);
const OCR = JSON.parse(readFileSync("screen-ocr.json", "utf8"));
const FFC = JSON.parse(readFileSync("ff-clock.json", "utf8"));

// ------------------------------------------------------------- shared drawing
const drawAll = (sel, t, d = 0.4) =>
  `tl.fromTo(${JSON.stringify(sel)},{strokeDashoffset:1},{strokeDashoffset:0,duration:${d},ease:"power2.out"},${f3(t)});\n`;
const show = (sel, t, d = 0.3, extra = "") =>
  `tl.fromTo(${JSON.stringify(sel)},{opacity:0${extra ? "," + extra.split("|")[0] : ""}},{opacity:1${extra ? "," + extra.split("|")[1] : ""},duration:${d},ease:"power2.out"},${f3(t)});\n`;
const hide = (sel, t, d = 0.3, to = 0) =>
  `tl.fromTo(${JSON.stringify(sel)},{opacity:1},{opacity:${to},duration:${d},immediateRender:false},${f3(t)});\n`;
const wipeIn = (sel, t, d = 0.45) =>
  `tl.fromTo(${JSON.stringify(sel)},{clipPath:"inset(-40px 100% -60px 0)"},{clipPath:"inset(-40px 0% -60px 0)",duration:${d},ease:"power2.out"},${f3(t)});\n`;
const ruleIn = (sel, t) =>
  `tl.fromTo(${JSON.stringify(sel)},{scaleX:0,transformOrigin:"left center"},{scaleX:1,duration:0.45,ease:"power2.out"},${f3(t)});\n`;
const countUp = (sel, from, to, t0, d0, dec = 0, prefix = "", suffix = "") => `
(function(){ const el=document.querySelector(${JSON.stringify(sel)}); const o={v:${from}};
  const f=v=>${JSON.stringify(prefix)}+v.toFixed(${dec}).replace(/\\B(?=(\\d{3})+(?!\\d))/g,",")+${JSON.stringify(suffix)};
  el.textContent=f(${from});
  tl.fromTo(o,{v:${from}},{v:${to},duration:${d0},ease:"power2.out",onUpdate:()=>{el.textContent=f(o.v);}},${f3(t0)});
  tl.fromTo(o,{v:${to}},{v:${to},duration:0.2,onUpdate:()=>{el.textContent=f(o.v);}},${f3(+t0 + +d0 + 0.05)});
})();`;
// a mm:ss clock counting linearly; the colon lives in its own span (the accent)
const clockUp = (mSel, sSel, from, to, t0, d0) => `
(function(){ const m=document.querySelector(${JSON.stringify(mSel)}), s=document.querySelector(${JSON.stringify(sSel)}); const o={v:${from}};
  const f=v=>{const t=Math.floor(v); m.textContent=Math.floor(t/60); s.textContent=String(t%60).padStart(2,"0");};
  f(${from});
  tl.fromTo(o,{v:${from}},{v:${to},duration:${d0},ease:"none",onUpdate:()=>f(o.v)},${f3(t0)});
})();`;
// a clock face: outline, a sweep arc (pathLength 1, starts at 12 o'clock) and a hand
const clockSVG = (id, r, stroke, sweepCol = null, sw = 3) => `
<svg id="${id}" viewBox="${-r - 8} ${-r - 8} ${2 * r + 16} ${2 * r + 16}" width="${2 * r + 16}" height="${2 * r + 16}" style="overflow:visible;color:${stroke}">
  <circle class="dr" cx="0" cy="0" r="${r}" pathLength="1" fill="none" stroke="currentColor" stroke-width="${sw}"/>
  ${[0,1,2,3,4,5,6,7,8,9,10,11].map(k => { const a = k * Math.PI / 6;
    return `<line x1="${(Math.sin(a) * r * 0.84).toFixed(1)}" y1="${(-Math.cos(a) * r * 0.84).toFixed(1)}" x2="${(Math.sin(a) * r * 0.94).toFixed(1)}" y2="${(-Math.cos(a) * r * 0.94).toFixed(1)}" stroke="currentColor" stroke-width="${k % 3 ? 1.6 : 2.6}"/>`; }).join("")}
  <circle id="${id}-sw" cx="0" cy="0" r="${r * 0.5}" pathLength="1" fill="none" stroke="${sweepCol || "currentColor"}"
    stroke-width="${r}" stroke-opacity="${sweepCol ? 0.9 : 0.18}" transform="rotate(-90)" style="stroke-dasharray:1;stroke-dashoffset:1"/>
  <line id="${id}-h" x1="0" y1="0" x2="0" y2="${-r * 0.8}" stroke="currentColor" stroke-width="${sw + 1}" stroke-linecap="round"/>
  <circle cx="0" cy="0" r="${sw + 2}" fill="currentColor"/>
</svg>`;
const sweep = (id, from, to, t, d, ease = "none") =>
  `tl.fromTo("#${id}-sw",{strokeDashoffset:${1 - from}},{strokeDashoffset:${1 - to},duration:${d},ease:"${ease}"},${f3(t)});
tl.fromTo("#${id}-h",{rotation:${from * 360},svgOrigin:"0 0"},{rotation:${to * 360},svgOrigin:"0 0",duration:${d},ease:"${ease}"},${f3(t)});\n`;
// six line-art tokens: candidate answers the jar sorts through
const TOKEN_D = [
  "M-22,0 A22,22 0 1,1 22,0 A22,22 0 1,1 -22,0 Z",                       // circle
  "M-20,-20 L20,-20 L20,20 L-20,20 Z",                                      // square
  "M0,-24 L22,18 L-22,18 Z",                                                // triangle
  "M0,-24 L24,0 L0,24 L-24,0 Z",                                            // diamond
  "M-12,-21 L12,-21 L24,0 L12,21 L-12,21 L-24,0 Z",                        // hexagon
  "M0,-24 L6,-8 L23,-8 L9,3 L14,20 L0,10 L-14,20 L-9,3 L-23,-8 L-6,-8 Z", // star
];
const tokenSVG = (id, k, stroke) => `<svg id="${id}" viewBox="-30 -30 60 60" width="60" height="60" style="position:absolute;overflow:visible;color:${stroke}">
  <path id="${id}-p" d="${TOKEN_D[k]}" fill="${C.bg}" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/></svg>`;
// a small waiting person
const personSVG = (id, stroke) => `<svg id="${id}" viewBox="0 0 60 120" width="60" height="120" style="overflow:visible;color:${stroke}">
  <circle class="dr" cx="30" cy="18" r="13" pathLength="1" fill="none" stroke="currentColor" stroke-width="3"/>
  <path class="dr" d="M30,32 L30,78 M30,44 L12,64 M30,44 L48,64 M30,78 L16,114 M30,78 L44,114" pathLength="1" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`;
// the exam paper: n stacked sections, each with pencil lines that fill on cue
const PAPER_LINES = 4;
const sectionHTML = (id, i, x, y, w, h, stroke) => `
<div id="${id}" style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px">
  <svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="position:absolute;overflow:visible;color:${stroke}">
    <rect x="0" y="0" width="${w}" height="${h}" rx="4" fill="${C.bg}" stroke="currentColor" stroke-width="2.4"/>
    <text x="12" y="26" font-family="SatoshiBold" font-size="18" fill="currentColor">${i + 1}</text>
    ${[...Array(PAPER_LINES).keys()].map(k => `<line id="${id}-l${k}" x1="${40}" y1="${22 + k * (h - 30) / PAPER_LINES}" x2="${w - 16 - (k % 2) * 30}" y2="${22 + k * (h - 30) / PAPER_LINES}"
      pathLength="1" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>`).join("")}
  </svg>
</div>`;
const fillSection = (id, t, d) => [...Array(PAPER_LINES).keys()].map(k =>
  drawAll(`#${id}-l${k}`, t + k * d / PAPER_LINES, d / PAPER_LINES)).join("");
// the jar-with-limbs, drawn fully on arrival (the art library's .dr strokes start hidden)
const jarLimbs = (id, x, y, s) => brainInJar(id, x, y, s, true);
const jarOn = (id, t = 0, d = 0.6) => drawAll(`#${id} .dr`, t, d);
// forearm working: a small oscillation on the limbs, off the timeline
const limbWork = (id, t0, t1, amp = 12, period = 0.5) => {
  const n = Math.max(1, Math.floor((t1 - t0) / period));
  return `tl.fromTo(["#${id}-l1-fore","#${id}-l2-fore"],{rotation:0},{rotation:${amp},duration:${period / 2},yoyo:true,repeat:${n},ease:"sine.inOut"},${f3(t0)});\n`;
};
const cueRel = (id, phrase, which) => cueIn(id, phrase, which);

// ============================================================== g01 opening card
// Human addition 1 (2026-09-29), redrawn with the ROBOT agent (human + daughter, 2026-09-29):
// full face on "Agents are like humans", then on "when it comes to thinking" the card wipes up.
// M1 short time: the dial runs out in ~1s, the robot grabs the nearest token, a cross.
// M2 more time: the token drops back, the dial grows and sweeps slowly.
// M3 figuring things out: the tokens sort into two rows while its arms work.
// M4 ruling out: three tokens go into the bin, the right arm swinging at each.
// M5 "better responses" (14.4): BINGO. The right arm lifts the triangle, which becomes the one
// $accent element, with rays and a tick. It never exits: g02 match-cuts out of its last frame.
const G01 = { x: LEFT_X0, y: 150, w: 664, h: 600 };
// Robot-animation QA 2026-09-29 (F1-F3): tokens used to float to the gripper and fly through the
// robot's body. Now every token the robot moves is HELD: a copy rides in the forearm group
// (robot hold), poses come from robotReach (IK on the held token's centre), and the robot ROLLS
// to each token before picking it. Layout: robot home on the left, pile and grid to its right,
// bin at the far right; discards are tossed over the head into the bin.
const G01R = { x: 30, s: 0.55 };                                   // home, panel coords
G01R.y = 548 - 540 * G01R.s;                                       // wheels on the table line
// r9 layout (final robot QA): tokens draw at 80% (G01_TS) so the pile, the grid and the bin get
// separate ground within the robot's reach. Pile nearer the robot, grid beyond it, bin at the edge.
// The pile's top row is offset right, so the token nearest the robot (tok1, M1's pick) has nothing
// above it. M3 lifts the pile top-down and fills the grid bottom-up: nothing ever sits above a token
// that moves, or below one that arrives.
//   pile bottom (y 508): tok1 234, tok5 276, tok0 318     pile top (y 466): tok3 297, tok2 339, tok4 381
//   grid cols (x 432, 476, 520): [tok1 top, tok3 bottom] [tok5 top, tok2 bottom] [tok0 top, tok4 bottom]
const G01_TS = 0.8;
const TOK_START = [[318, 508], [234, 508], [339, 466], [297, 466], [381, 466], [276, 508]];
const TOK_ROWS = [[520, 452], [432, 452], [476, 514], [432, 514], [520, 514], [476, 452]];
const G01_SORT = [3, 2, 4, 1, 5, 0];                               // M3 order (see above)
const G01_BIN_D = "M578,470 L578,548 M634,470 L634,548 M566,470 L646,470", G01_BIN_X = 566, G01_BIN = [606, 524];
const tokSmall = (id, k, stroke) => tokenSVG(id, k, stroke).replace(`<path id="${id}-p"`, `<path transform="scale(${G01_TS})" id="${id}-p"`);
const G01_OFF = [0, 22 + 6 / G01R.s];
const G01_REACHX = 370;                                            // held centre, robot-space x, when picking
const g01Left = tx => tx - G01_REACHX * G01R.s;                    // robot left edge that puts tx in reach
const g01RS = (left, [x, y]) => [(x - left) / G01R.s, (y - G01R.y) / G01R.s];
const g01W = (left, [x, y]) => [left + x * G01R.s, G01R.y + y * G01R.s];
const G01_REST = { a: 0, b: 0, g: 0 };
// IK that PREFERS poses with the elbow outside the jar (r8: the tucked arm was drawn across the
// glass). A preference, not a rule: with this arm some high poses beside the jar have no continuous
// elbow-outside path (surveyed), and an arm drawn in front of the glass is legitimate.
const g01Elbow = ({ a }) => robotPoint("R", { a, b: 0 }, [-18, -39]);
// The elbow preference applies when CHOOSING a pose (global solve); frame-to-frame tracking is pure
// continuity, since a preference there made the arm flip configuration mid-move (86 deg in a frame).
const g01Cost = (p, target, prefer, w = 0.01, elbowPref = true) => {
  const [x, y] = robotPoint("R", p, G01_OFF), e = Math.hypot(x - target[0], y - target[1]), [ex, ey] = g01Elbow(p);
  return { e, cost: (e > 3 ? 1000 + e : e) + (elbowPref && ex > 30 && ex < 292 && ey < 380 ? 30 : 0) + w * (Math.abs(p.a - prefer.a) + Math.abs(p.b - prefer.b)) };
};
const g01IK = (target, prefer = { a: -60, b: -40 }, win = null) => {
  let best = null;
  const [a0, a1, b0, b1] = win ? [prefer.a - win, prefer.a + win, prefer.b - win, prefer.b + win] : [-180, 180, -165, 165];
  for (let a = a0; a <= a1; a++) for (let b = b0; b <= b1; b++) {
    const r = g01Cost({ a, b }, target, prefer, win ? 0.6 : 0.01, !win); if (!best || r.cost < best.cost) best = { a, b, ...r };
  }
  if (best.e > 3) throw new Error(`g01 IK: [${target.map(v => v.toFixed(0))}] out of reach (miss ${best.e.toFixed(1)})`);
  return { a: best.a, b: best.b };
};
const G01_THROW_PT = [335, 285];
// r11: where a held token may be swung up to (robot space), best first; the planner takes the
// first whose whole move stays clear of the jar and the other tokens
const G01_THROW_CANDS = [[345, 300], [360, 310], [370, 330], [380, 345], [390, 360], [335, 285]];
const G01_LIFT_CANDS = [[350, 300], [360, 310], [370, 325], [380, 340], [390, 355], [400, 370], [385, 380], [410, 390], [345, 292]];
const G01_LIFT_PT = [345, 292];   // r10: clear of the kept column and of the jar (collision-checked)
const G01_LIFT = { ...g01IK(G01_LIFT_PT, { a: -110, b: -50 }), g: 1 };  // the bingo pose
const G01_LEFTF = g01Left(TOK_ROWS[2][0]);                         // where the robot stands at the end
const G01_DXF = G01_LEFTF - G01R.x;
const G01_BINGO = g01W(G01_LEFTF, robotPoint("R", G01_LIFT, G01_OFF));   // the held triangle's centre
// rays fan out on the side away from the head only; the tick sits clear of them on the right
const G01_RAYS = [6, 7, 0, 2];
const heldTok = k => ({ id: `h${k}`, svg: `<path id="h${k}-p" d="${TOKEN_D[k]}" fill="${C.bg}" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>` });
// Token outlines as polygons (canvas px, token centred at 0,0, unscaled), for the build-time
// collision check and for where a gripper meets a token's rim. The circle is a 24-gon.
const TOKEN_POLY = TOKEN_D.map((d, k) => k === 0
  ? [...Array(24).keys()].map(i => [22 * Math.cos(i * Math.PI / 12), 22 * Math.sin(i * Math.PI / 12)])
  : [...d.matchAll(/(-?\d+),(-?\d+)/g)].map(m => [+m[1], +m[2]]));
const polyWorld = (k, [cx, cy], rot = 0, grow = 1.5) => { const c = Math.cos(rot * Math.PI / 180), sn = Math.sin(rot * Math.PI / 180);
  return TOKEN_POLY[k].map(([x, y]) => { const r = Math.hypot(x, y), f = (r * G01_TS + grow) / (r || 1); const X = x * f, Y = y * f; return [cx + X * c - Y * sn, cy + X * sn + Y * c]; }); };
const inPolyPt = ([x, y], P) => { let o = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j];
  if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) o = !o; } return o; };
const segHitsPoly = (A, B, P) => { const n = Math.max(2, Math.ceil(Math.hypot(B[0] - A[0], B[1] - A[1]) / 1.5)); for (let i = 0; i <= n; i++) if (inPolyPt([A[0] + (B[0] - A[0]) * i / n, A[1] + (B[1] - A[1]) * i / n], P)) return true; return false; };
const polyHitsPoly = (P, Q) => P.some(p => inPolyPt(p, Q)) || Q.some(q => inPolyPt(q, P)) || P.some((a, i) => segHitsPoly(a, P[(i + 1) % P.length], Q));
// distance from a token's centre to its (scaled, stroked) rim along unit direction u, in its own frame
const rimAlong = (k, [ux, uy]) => { const P = polyWorld(k, [0, 0], 0, 1.5); let r = 0; while (r < 60 && inPolyPt([ux * r, uy * r], P)) r += 0.25; return r; };

// The opening's motion plan, shared: g01 renders it; g02 needs where and at what tilt the
// triangle ends and the arm's final pose, so both call this and it runs once.
// r10 (final robot QA): a 2-joint arm cannot choose which way its gripper points, so every pick
//  - solves BOTH arm branches for the pick and keeps the one reachable without a jump,
//  - approaches along the gripper's own axis and stops with the fingertips ON the token's rim
//    (never inside it), the token then turning rigidly with the hand (the contact point stays put),
//  - and every committed frame is collision-checked: arm, fingers and carried token against every
//    other token and the jar; the build fails on any overlap.
let _g01plan = null;
const planG01 = () => { if (_g01plan) return _g01plan;
  const id = "g01", D = dur(id), c = p => cueRel(id, p);
  const tLonger = c("longer"), tBetter = c("better"), tFig = c("figuring"), tRule = c("ruling"),
        tBingo = cueIn(id, "with better", "end") - 0.25;   // "coming up with BETTER responses" (14.4)
  const X0 = G01R.x, FT = [3, 21];                           // fingertip midpoint, forearm frame
  let js = "";
  let left = X0, pose = { a: 0, b: 0 }, lastT = 0;
  const S = ROBOT_GEOM.shoulder.R.join(" "), E = ROBOT_GEOM.elbow.R.join(" "), Wr = ROBOT_GEOM.wrist.R.join(" ");
  const roll = (toLeft, t, d) => { if (Math.abs(toLeft - left) < 4) { left = toLeft; return ""; }
    const s = robotRoll("jr", left - X0, toLeft - X0, t, d, G01R.s); left = toLeft; return s; };
  const RS = xy => g01RS(left, xy), WS = xy => g01W(left, xy);
  const ez = p => p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  // token state (world centre, tilt, visible) for the collision check
  const tok = TOK_START.map(([x, y]) => ({ x, y, rot: 0, vis: true }));
  const carried = {}, rot0 = {}, rotNow = {}, offK = {};
  const offOf = (k, xy) => [xy[0] - TOK_START[k][0], xy[1] - TOK_START[k][1]];
  const JAR = [[34, 20], [286, 20], [286, 376], [34, 376]];
  const ik = (target, off, prev, win) => {
    let best = null;
    for (let a = prev.a - win; a <= prev.a + win; a++) for (let b = prev.b - win; b <= prev.b + win; b++) {
      const [x, y] = robotPoint("R", { a, b }, off), e = Math.hypot(x - target[0], y - target[1]);
      const cost = e + 0.6 * (Math.abs(a - prev.a) + Math.abs(b - prev.b));
      if (!best || cost < best.cost) best = { a, b, e, cost };
    }
    return best;
  };
  // all distinct global solutions (arm branches) placing `off` at `target`
  const branches = (target, off) => { const sols = [];
    for (let a = -180; a <= 180; a++) for (let b = -170; b <= 170; b++) {
      const [x, y] = robotPoint("R", { a, b }, off); if (Math.hypot(x - target[0], y - target[1]) < 1.2) sols.push({ a, b }); }
    const out = []; for (const q of sols) if (!out.some(o => Math.abs(o.a - q.a) + Math.abs(o.b - q.b) < 30)) out.push(q);
    return out; };
  const armWorld = p => { const Sw = WS(ROBOT_GEOM.shoulder.R), Ew = WS(robotPoint("R", { a: p.a, b: 0 }, [-18, -39])),
      Ww = WS(robotPoint("R", p, [0, 0])), F1 = WS(robotPoint("R", p, [-6, 22])), F2 = WS(robotPoint("R", p, [12, 20]));
    return [[Sw, Ew], [Ew, Ww], [Ww, F1], [Ww, F2]]; };
  // plan a move of the point at `off` through waypoints; returns frames without committing
  const planMove = (pts, d, off, from, endPose = null) => {
    const start = robotPoint("R", from, off), path = [start, ...pts], L = []; let tot = 0;
    for (let i = 1; i < path.length; i++) { const l = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); L.push(l); tot += l; }
    const N = Math.max(1, Math.round(d * 30)), frames = []; let p = from, maxJump = 0, maxErr = 0;
    for (let f = 1; f <= N; f++) {
      let dist = ez(f / N) * tot, i = 0;
      while (i < L.length - 1 && dist > L[i]) { dist -= L[i]; i++; }
      const u = L[i] ? Math.min(1, dist / L[i]) : 1, A = path[i], B = path[i + 1];
      const pt = [A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u];
      let np;
      if (f === N && endPose) np = { a: endPose.a, b: endPose.b };
      else { const r = ik(pt, off, p, 45); np = { a: r.a, b: r.b }; maxErr = Math.max(maxErr, r.e); }
      maxJump = Math.max(maxJump, Math.abs(np.a - p.a) + Math.abs(np.b - p.b));
      frames.push(np); p = np;
    }
    return { frames, maxJump, maxErr };
  };
  // joint-space move (eased); the collision check decides whether its sweep is clear
  const jointMove = (from, to, d) => { const N = Math.max(1, Math.round(d * 30)), frames = []; let p = from, maxJump = 0;
    for (let f = 1; f <= N; f++) { const e = ez(f / N), np = { a: Math.round(from.a + (to.a - from.a) * e), b: Math.round(from.b + (to.b - from.b) * e) };
      if (f === N) { np.a = to.a; np.b = to.b; } maxJump = Math.max(maxJump, Math.abs(np.a - p.a) + Math.abs(np.b - p.b)); frames.push(np); p = np; }
    return { frames, maxJump, maxErr: 0 }; };
  const checkFrame = (p, t, carry, ignore) => {
    const segs = armWorld(p);
    { const J = JAR.map(WS); // r11: the arm lay across the glass whenever it held something up
      if (segs.slice(0, 2).some(([A, B]) => segHitsPoly(A, B, J))) throw new Error(`g01 collision: arm across the jar at t=${(t + 2.5).toFixed(3)}`); }
    tok.forEach((o, k) => { if (!o.vis || k === carry || k === ignore) return;
      const P = polyWorld(k, [o.x, o.y], o.rot);
      if (segs.some(([A, B]) => segHitsPoly(A, B, P))) throw new Error(`g01 collision: arm through tok${k} at t=${(t + 2.5).toFixed(3)}`);
      if (carry != null) { const c = tok[carry]; if (polyHitsPoly(polyWorld(carry, [c.x, c.y], c.rot), P)) throw new Error(`g01 collision: carried tok${carry} hits tok${k} at t=${(t + 2.5).toFixed(3)}`); } });
    if (carry != null) { const c = tok[carry], J = JAR.map(WS);
      if (polyHitsPoly(polyWorld(carry, [c.x, c.y], c.rot, 4), J)) throw new Error(`g01 collision: carried tok${carry} touches the jar at t=${(t + 2.5).toFixed(3)}`); }
  };
  const commit = (mv, t, carry = null, ignore = null) => {
    if (mv.maxJump > 85) throw new Error(`g01: arm jumps ${mv.maxJump} deg in a frame at ${(t + 2.5).toFixed(2)}`);
    let out = "";
    mv.frames.forEach((np, f) => {
      const tf = f3(t + f / 30);
      out += `tl.fromTo("#jr-armR",{rotation:${pose.a},svgOrigin:"${S}"},{rotation:${np.a},svgOrigin:"${S}",duration:0.0334,ease:"none",immediateRender:false},${tf});\n`;
      out += `tl.fromTo("#jr-foreR",{rotation:${pose.b},svgOrigin:"${E}"},{rotation:${np.b},svgOrigin:"${E}",duration:0.0334,ease:"none",immediateRender:false},${tf});\n`;
      if (carry != null) {
        const w = WS(robotPoint("R", np, offK[carry])), o = offOf(carry, w), p0 = carried[carry], r1 = (np.a + np.b) - rot0[carry];
        out += `tl.fromTo("#tw${carry}",{x:${p0[0].toFixed(1)},y:${p0[1].toFixed(1)},rotation:${rotNow[carry].toFixed(1)}},{x:${o[0].toFixed(1)},y:${o[1].toFixed(1)},rotation:${r1.toFixed(1)},duration:0.0334,ease:"none",immediateRender:false},${tf});\n`;
        carried[carry] = o; rotNow[carry] = r1; Object.assign(tok[carry], { x: w[0], y: w[1], rot: r1 });
      }
      pose = np; checkFrame(np, t + (f + 1) / 30, carry, ignore);
    });
    return out;
  };
  const grip = (close, t) => `tl.fromTo("#jr-gripR",{scaleX:${close ? 1 : 0.55},svgOrigin:"${Wr}"},{scaleX:${close ? 0.55 : 1},svgOrigin:"${Wr}",duration:0.08,immediateRender:false},${f3(t)});\n`;
  // pick token k (world P): try each arm branch; fingertips end ON the rim; approach along the axis
  const pick = (k, P, t, dApp = 0.14, dIn = 0.12, pace = 35) => {
    const tries = [], dbg = [];
    const Pr = RS(P);
    for (const guess of branches(Pr, [3, 21 + 19 / G01R.s])) {
      let q = guess, off;
      for (let it = 0; it < 4; it++) {
        const ang = (q.a + q.b) * Math.PI / 180, g = [-Math.sin(ang), Math.cos(ang)];   // world dir of the forearm's local +y
        const rim = rimAlong(k, [-g[0], -g[1]]);
        off = [3, 21 + rim / G01R.s];
        const r = ik(Pr, off, q, 40); if (r.e > 3) { dbg.push(`branch ${guess.a},${guess.b}: rim ${rim.toFixed(1)} miss ${r.e.toFixed(1)}`); q = null; break; } q = { a: r.a, b: r.b };
      }
      if (!q) continue;
      const ang = (q.a + q.b) * Math.PI / 180, g = [-Math.sin(ang), Math.cos(ang)];
      const tip = robotPoint("R", q, FT), app = [tip[0] - g[0] * 40, tip[1] - g[1] * 40];
      const ra = ik(app, FT, q, 40); if (ra.e > 3) { dbg.push(`branch ${guess.a},${guess.b}: approach miss ${ra.e.toFixed(1)}`); continue; }
      const qa = { a: ra.a, b: ra.b };
      const dA = Math.max(dApp, (Math.abs(qa.a - pose.a) + Math.abs(qa.b - pose.b)) / (pace * 30) * 1.6);
      const mvA = jointMove(pose, qa, dA), mvB = planMove([tip], dIn, FT, qa, q);
      const jump = Math.max(mvA.maxJump, mvB.maxJump), err = Math.max(mvA.maxErr, mvB.maxErr);
      tries.push({ q, off, mvA, mvB, jump, err, dA });
    }
    const down = x => { const ang = (x.q.a + x.q.b) * Math.PI / 180; return Math.cos(ang); };   // 1 = fingers straight down
    const ok = tries.filter(x => x.jump <= pace * 1.8 && x.err < 3).sort((a, b) => (down(b) > 0.3) - (down(a) > 0.3) || a.dA - b.dA);
    if (!ok.length) throw new Error(`g01: no smooth pick for tok${k} at ${(t + 2.5).toFixed(2)} (tried ${tries.map(x => `jump ${x.jump} err ${x.err.toFixed(1)}`).join("; ") || "no branch"}; ${dbg.join("; ")}; branches ${JSON.stringify(branches(Pr, [3, 21 + 19 / G01R.s]))})`);
    return firstOk(`pick of tok${k}`, ok, best => {
      let s = commit(best.mvA, t, null, k) + commit(best.mvB, t + best.dA, null, k) + grip(true, t + best.dA + dIn - 0.06);
      offK[k] = best.off; carried[k] = offOf(k, P); rot0[k] = best.q.a + best.q.b; rotNow[k] = 0;
      lastT = t + best.dA + dIn; return s; });
  };
  // a collision-checked joint move to a pose, paced at <= ~35 deg a frame; sets lastT
  const jointTo = (to, t) => { const d = Math.max(0.2, (Math.abs(to.a - pose.a) + Math.abs(to.b - pose.b)) / (35 * 30) * 1.6);
    const s = commit(jointMove(pose, to, d), t); lastT = t + d; return s; };
  const snap = () => JSON.stringify({ pose, left, lastT, carried, rot0, rotNow, offK, tok });
  const restore = z => { const o = JSON.parse(z); pose = o.pose; left = o.left; lastT = o.lastT;
    [carried, rot0, rotNow, offK].forEach((m, i) => { Object.keys(m).forEach(k => delete m[k]); Object.assign(m, [o.carried, o.rot0, o.rotNow, o.offK][i]); });
    o.tok.forEach((q, i) => Object.assign(tok[i], q)); };
  // try candidate moves in order; the first that plans and passes every collision check is committed
  const firstOk = (label, cands, fn) => { const errs = []; for (const c of cands) { const z = snap();
      try { return fn(c); } catch (e) { restore(z); errs.push(e.message); } }
    throw new Error(`g01: no clear ${label}: ${errs.join(" | ")}`); };
  const carryTo = (k, pts, t, d) => commit(planMove(pts, d, offK[k], pose), t, k);
  const moveTip = (pts, t, d, ignore = null) => commit(planMove(pts, d, FT, pose), t, null, ignore);
  const READY = [305, 300];
  const READY_POSE = (() => { let b = null; for (let a = -180; a <= 180; a++) for (let bb = -170; bb <= 170; bb++) { const [x, y] = robotPoint("R", { a, b: bb }, FT); const e = Math.hypot(x - READY[0], y - READY[1]); if (e < 1.5) { const [ex, ey] = robotPoint("R", { a, b: 0 }, [-18, -39]); const c = (ex > 30 && ex < 292 && ey < 380 ? 50 : 0) + 0.01 * Math.abs(a); if (!b || c < b.c) b = { a, b: bb, c }; } } return { a: b.a, b: b.b }; })();
  const joint = (to, t, d) => { const s = robotArm("jr", "R", { ...pose, g: 0 }, { ...to, g: 0 }, t, d).split("\n").filter(l => !l.includes("gripR")).join("\n") + "\n";
    pose = { a: to.a, b: to.b }; return s; };
  // M1 short time (4.6): the arm goes up while the tokens are still hidden (they show at 0.5); the
  // robot rolls up, reaches the nearest pile token along its gripper, grips its rim, lifts it:
  // the wrong answer, crossed out.
  js += sweep("ck-c", 0, 1, tLonger, 1.0);
  const K1 = 1, P0 = TOK_START[K1];
  js += joint(READY_POSE, 0.2, 0.3) + roll(g01Left(P0[0]), tLonger, 0.35);
  js += pick(K1, P0, tLonger + 0.35, 0.14, 0.14);
  const tUp = lastT + 0.04;
  js += firstOk("M1 lift", [[-10, -50], [-20, -46], [-30, -40], [0, -40], [4, -58], [-15, -30], [-25, -25], [-8, -28]],
    ([dx, dy]) => carryTo(K1, [RS([P0[0] + dx * 0.3, P0[1] + dy * 0.45]), RS([P0[0] + dx, P0[1] + dy])], tUp, 0.3));
  const [ux, uy] = [tok[K1].x, tok[K1].y];
  const XM = `M${ux - 16},${uy - 16} L${ux + 16},${uy + 16} M${ux + 16},${uy - 16} L${ux - 16},${uy + 16}`;
  if (tUp + 0.6 > tBetter - 0.1) throw new Error(`g01: M1 runs into M2 (${(tUp + 0.6).toFixed(2)} > ${(tBetter - 0.1).toFixed(2)})`);
  js += `tl.fromTo("#xm",{strokeDashoffset:1},{strokeDashoffset:0,duration:0.3},${f3(tUp + 0.32)});\n`;
  // M2 more time (6.2): the cross clears, the token goes back exactly where it was, the hand lets go
  // and backs off along its axis, the robot rolls home
  js += hide("#xm", tBetter - 0.1, 0.15);
  {
    js += carryTo(K1, [RS(P0)], tBetter + 0.08, 0.3) + grip(false, tBetter + 0.4);
    js += `tl.fromTo("#tw${K1}",{x:${carried[K1][0].toFixed(1)},y:${carried[K1][1].toFixed(1)},rotation:${rotNow[K1].toFixed(1)}},{x:0,y:0,rotation:0,duration:0.08,ease:"power1.out",immediateRender:false},${f3(tBetter + 0.4)});\n`;
    Object.assign(tok[K1], { x: P0[0], y: P0[1], rot: 0 });
    const ang = (pose.a + pose.b) * Math.PI / 180, g = [-Math.sin(ang), Math.cos(ang)], tip = robotPoint("R", pose, FT);
    js += firstOk("M2 back-off", [[40, 70, 0], [40, 50, 20], [30, 40, 30], [40, 0, 0], [25, 30, 45], [40, 20, 60]], ([bd, uh, ux]) => {
      const back = [tip[0] - g[0] * bd, tip[1] - g[1] * bd], up = [back[0] + ux / G01R.s, Math.min(back[1], RS([0, P0[1] - uh])[1])];
      return moveTip(uh ? [back, up] : [back], tBetter + 0.5, 0.22, K1); });
    // roll home with the hand held up, THEN settle: READY is a pose for home, where it clears the pile
    js += roll(X0, tBetter + 0.74, 0.45);
    js += jointTo(READY_POSE, tBetter + 1.2); }
  // the clock: more time (these tweens went missing in r9 and the dial popped small at the cut)
  js += `tl.fromTo("#ck",{scale:1,transformOrigin:"70% 30%"},{scale:1.55,transformOrigin:"70% 30%",duration:0.5,ease:"power2.out"},${f3(tBetter + 0.2)});\n`;
  js += sweep("ck-c", 0, 0.001, tBetter + 0.2, 0.2) + sweep("ck-c", 0.001, 0.62, tBetter + 0.5, D - tBetter - 0.6);
  // M3 figuring things out (10.3): one token at a time, up, across a lane above everything, down;
  // the robot nods along (r9's far-arm wave crossed the jar and was clipped by the card edge)
  { const LANE = 410, hopD = Math.min(0.24, (tRule - tFig - 0.1) / G01_SORT.length);
    G01_SORT.forEach((k, q) => { const [x, y] = TOK_START[k], [rx, ry] = TOK_ROWS[k], t = tFig + q * hopD, up = hopD * 0.3, across = hopD * 0.4;
      js += `tl.fromTo("#tw${k}",{y:0},{y:${LANE - y},duration:${f3(up)},ease:"power1.out",immediateRender:false},${f3(t)});\n`;
      js += `tl.fromTo("#tw${k}",{x:0},{x:${rx - x},duration:${f3(across)},ease:"power1.inOut",immediateRender:false},${f3(t + up)});\n`;
      js += `tl.fromTo("#tw${k}",{y:${LANE - y}},{y:${ry - y},duration:${f3(hopD - up - across)},ease:"power1.in",immediateRender:false},${f3(t + up + across)});\n`;
      Object.assign(tok[k], { x: rx, y: ry }); });
    const n = Math.max(1, Math.floor(G01_SORT.length * hopD / 0.5));
    js += `tl.fromTo("#jr-head",{y:0},{y:-16,duration:0.25,yoyo:true,repeat:${2 * n - 1},ease:"sine.inOut",immediateRender:false},${f3(tFig)});\n`; }
  // M4 ruling out (11.7): three discards, each gripped, lifted clear, swung up beside the jar,
  // released and arcing over the grid into the bin
  const THROW = G01_THROW_PT;
  const release = (k, t) => { const [ox, oy] = carried[k], [ex, ey] = offOf(k, G01_BIN); let s = grip(false, t);
    s += `tl.fromTo("#tw${k}",{x:${ox.toFixed(1)},rotation:${rotNow[k].toFixed(1)}},{x:${ex.toFixed(1)},rotation:${(rotNow[k] + 160).toFixed(1)},duration:0.55,ease:"sine.inOut",immediateRender:false},${f3(t)});\n`;
    s += `tl.fromTo("#tw${k}",{y:${oy.toFixed(1)}},{y:${(oy - 60).toFixed(1)},duration:0.24,ease:"sine.out",immediateRender:false},${f3(t)});\n`;
    s += `tl.fromTo("#tw${k}",{y:${(oy - 60).toFixed(1)}},{y:${ey.toFixed(1)},duration:0.31,ease:"power2.in",immediateRender:false},${f3(t + 0.24)});\n`;
    tok[k].vis = false;
    return s + hide(`#tw${k}`, t + 0.5, 0.25); };
  const toss = (k, t) => { const P = TOK_ROWS[k];
    let s = pick(k, P, t, 0.13, 0.12, 45); const t1 = lastT + 0.01;
    s += firstOk(`throw of tok${k}`, G01_THROW_CANDS, TH => carryTo(k, [RS([P[0], P[1] - 52]), TH], t1, 0.25));
    s += release(k, t1 + 0.25); lastT = t1 + 0.26; return s; };
  js += roll(g01Left(TOK_ROWS[1][0]), tRule - 0.2, 0.4);
  js += toss(1, tRule + 0.2); js += toss(3, lastT);
  { const tr = lastT; js += roll(g01Left(TOK_ROWS[5][0]), tr, 0.3); js += toss(5, tr + 0.3); }
  // M5 BINGO (14.4): the triangle, gripped and lifted beside the head, turning with the hand; the
  // kept pair fade away; it grows and lights $accent once the lift has landed
  let triRot, tLit;
  { const P = TOK_ROWS[2], tR = lastT;
    // the kept pair fade while it picks the triangle (they were still there, fading, as it lifted)
    [0, 4].forEach(k => { js += hide(`#tw${k}`, tR, 0.3); tok[k].vis = false; });
    js += pick(2, P, tR, 0.13, 0.12, 45);
    const tL = Math.max(lastT + 0.02, tBingo - 0.3);
    js += firstOk("bingo lift", G01_LIFT_CANDS, LP => carryTo(2, [LP], tL, 0.4));
    triRot = rotNow[2]; tLit = Math.max(tBingo + 0.15, tL + 0.45);
    js += `tl.fromTo("#tk2",{scale:1},{scale:1.25,transformOrigin:"50% 50%",duration:0.4,ease:"back.out(2)",immediateRender:false},${f3(tLit)});\n`;
    js += `tl.fromTo("#tk2-p",{fill:"${C.bg}",stroke:"${fg(id)}"},{fill:"${C.accent}",stroke:"${C.accent}",duration:0.3},${f3(tLit + 0.05)});\n`;
    G01_RAYS.forEach((k, q) => { js += drawAll(`#ray${k}`, tLit + 0.15 + q * 0.04, 0.25); });
    js += drawAll("#tick", tLit + 0.4, 0.3);
    if (tLit + 0.7 > D - 0.1) throw new Error(`g01: the bingo lands too late (${tLit.toFixed(2)} of ${D.toFixed(2)})`);
    if (Math.abs(left - G01_LEFTF) > 0.5) throw new Error(`g01 ends at ${left}, g02 expects ${G01_LEFTF}`); }
  const bingo = [tok[2].x, tok[2].y];
  _g01plan = { js, XM, triRot, pose: { ...pose }, bingo };
  return _g01plan;
};
if (want("g01")) {
  const id = "g01", D = dur(id), plan = planG01();
  const col = fg(id);
  const [bx, by] = plan.bingo;
  // tokens draw BEFORE the robot, so the gripper's fingers show on the token it holds (r8: the
  // opaque token hid them and the forearm read as stuck on)
  const body = `
<div id="panel" class="${panelClass(id)}" style="position:absolute;left:${G01.x}px;top:${G01.y}px;width:${G01.w}px;height:${G01.h}px;overflow:hidden">
  <svg style="position:absolute;left:0;top:0;overflow:visible" width="${G01.w}" height="${G01.h}">
    <line class="dr" x1="30" y1="548" x2="634" y2="548" pathLength="1" stroke="${col}" stroke-width="3"/>
    <path class="dr" d="${G01_BIN_D}" pathLength="1" fill="none" stroke="${dim(id)}" stroke-width="3" stroke-linecap="round"/>
  </svg>
  <div class="capt" style="position:absolute;left:${G01_BIN_X}px;top:556px;width:80px;text-align:center;font-size:18px;color:${dim(id)}">bin</div>
  <div id="ck" style="position:absolute;left:470px;top:34px">${clockSVG("ck-c", 46, col)}</div>
  ${TOK_START.map(([x, y], k) => `<div id="tw${k}" style="position:absolute;left:${x - 30}px;top:${y - 30}px;width:60px;height:60px">${tokSmall("tk" + k, k, col)}</div>`).join("")}
  <div style="position:absolute;left:0;top:0;color:${col}">${robot("jr", G01R.x, G01R.y, G01R.s)}</div>
  <svg style="position:absolute;left:0;top:0;overflow:visible;pointer-events:none" width="${G01.w - 12}" height="${G01.h - 12}">
    <path id="xm" d="${plan.XM}" pathLength="1" fill="none" stroke="${dim(id)}" stroke-width="4" stroke-linecap="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>
    ${G01_RAYS.map(k => { const a = k * Math.PI / 4;
      return `<line id="ray${k}" x1="${(bx + Math.cos(a) * 40).toFixed(1)}" y1="${(by + Math.sin(a) * 40).toFixed(1)}" x2="${(bx + Math.cos(a) * 60).toFixed(1)}" y2="${(by + Math.sin(a) * 60).toFixed(1)}" pathLength="1" stroke="${col}" stroke-width="3" stroke-linecap="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>`; }).join("")}
    <path id="tick" d="M${bx + 78},${by - 4} l14,14 l28,-34" pathLength="1" fill="none" stroke="${col}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>
  </svg>
</div>`;
  let js = wipeUp("#panel", 0);
  js += drawAll("#panel > svg .dr", 0.1, 0.5) + drawAll("#ck-c .dr", 0.3, 0.4);
  js += show("#jr", 0.15, 0.3) + show(TOK_START.map((_, k) => `#tw${k}`), 0.5, 0.35);
  js += plan.js;
  js += `tl.fromTo("#panel",{opacity:1},{opacity:1,duration:0.2},${f3(D - 0.2)});\n`;   // holds to the last frame
  emit(id, D, body, js);
}

// ============================================================== g02 hook scene
// Human addition 2 + the match-cut (2026-09-29). Arrives by growing g01's panel to full
// frame over 0.6s (power2.inOut) while the jar walks to the desk: so this renders as a
// full-frame ALPHA overlay, transparent only outside the growing page. Then the exam
// analogy in seven movements on the spoken cues; one $accent element, the split lines.
if (want("g02")) {
  const id = "g02", D = dur(id), c = p => cueRel(id, p);
  const t30 = c("30"), tFare = c("wouldn't"), tThree = c("three"), tLat = c("latency"), tDiv = c("divide"),
        tGive = c("give"), tPar = c("parallelize"), tHave = cueRel(id, "have.");
  const GROW = 0.6, col = C.ink, mut = C.muted;
  // desk layout (canvas px). Paper: four stacked sections, later split into four columns
  const PX = 760, PY = 330, PW = 420, SH = 118, GAP = 10;
  const COLX = [120, 560, 1000, 1440];             // section x after the split (440 apart, 420 wide)
  const SPLIT_Y = 430;                              // the four sections, above the robots
  const DESK_Y = PY + 4 * (SH + GAP) + 26;          // 868
  const RS = 0.42, RW = 320 * RS;                   // swarm-size robots, standing on the desk
  const RTOP = DESK_Y - 540 * RS;
  const JARS = COLX.map(x => x + PW / 2 - RW / 2);  // one robot centred under each section
  // g01's LAST frame, re-drawn at the same pixels so the cut is invisible (match-cut)
  const clip0 = `inset(${G01.y}px ${1920 - G01.x - G01.w}px ${1080 - G01.y - G01.h}px ${G01.x}px round 4px)`;
  const G1P = planG01(), [bx, by] = G1P.bingo;
  const g1final = `
  <div id="g1f" style="position:absolute;left:${G01.x + 6}px;top:${G01.y + 6}px;width:${G01.w}px;height:${G01.h}px">
    <svg style="position:absolute;left:0;top:0;overflow:visible" width="${G01.w}" height="${G01.h}">
      <path d="${G01_BIN_D}" fill="none" stroke="${mut}" stroke-width="3" stroke-linecap="round"/>
    </svg>
    <div class="capt" style="position:absolute;left:${G01_BIN_X}px;top:556px;width:80px;text-align:center;font-size:18px;color:${mut}">bin</div>
    <div style="position:absolute;left:470px;top:34px;transform:scale(1.55);transform-origin:70% 30%">${clockSVG("fck", 46, col).replace('style="stroke-dasharray:1;stroke-dashoffset:1"', 'style="stroke-dasharray:1;stroke-dashoffset:0.38"').replace(`id="fck-h"`, `id="fck-h" transform="rotate(223)"`).replace('class="dr" ', '')}</div>
    <svg style="position:absolute;left:0;top:0;overflow:visible" width="${G01.w}" height="${G01.h}">
      ${G01_RAYS.map(k => { const a = k * Math.PI / 4;
        return `<line x1="${(bx + Math.cos(a) * 40).toFixed(1)}" y1="${(by + Math.sin(a) * 40).toFixed(1)}" x2="${(bx + Math.cos(a) * 60).toFixed(1)}" y2="${(by + Math.sin(a) * 60).toFixed(1)}" stroke="${col}" stroke-width="3" stroke-linecap="round"/>`; }).join("")}
      <path d="M${bx + 78},${by - 4} l14,14 l28,-34" fill="none" stroke="${col}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </div>
  <div id="g1line" style="position:absolute;left:${G01.x + 6}px;top:${G01.y + 6}px"><svg style="overflow:visible" width="${G01.w}" height="${G01.h}"><line x1="30" y1="548" x2="634" y2="548" stroke="${col}" stroke-width="3"/></svg></div>
`;
  // drawn AFTER the walker: robot QA r5 saw the tossed triangle slide behind the jar
  const bingoDiv = `<div id="bingo" style="position:absolute;left:${G01.x + 6 + bx - 30}px;top:${G01.y + 6 + by - 30}px;width:60px;height:60px">
    <svg viewBox="-30 -30 60 60" width="60" height="60" style="overflow:visible;transform:scale(${(G01_TS * 1.25).toFixed(2)})"><path d="${TOKEN_D[2]}" fill="${C.accent}" stroke="${C.accent}" stroke-width="3" stroke-linejoin="round"/></svg></div>`;
  const body = `
<div id="page" style="position:absolute;left:0;top:0;width:1920px;height:1080px;background:${C.bg}EB;clip-path:${clip0}">
  <div id="scene" style="position:absolute;left:0;top:0;width:1920px;height:1080px">
    <div id="deco1" style="position:absolute;inset:0;background:radial-gradient(ellipse at 40% 45%, ${C.accentSoft}14, transparent 60%)"></div>
    <svg id="deco2" style="position:absolute;left:0;top:0" width="1920" height="1080"><defs><pattern id="gr" width="60" height="60" patternUnits="userSpaceOnUse">
      <path d="M60,0 L0,0 0,60" fill="none" stroke="${C.rule}" stroke-width="1" opacity=".06"/></pattern></defs><rect width="1920" height="1080" fill="url(#gr)"/></svg>
    <div id="eb" class="capt eyebrow" style="position:absolute;left:120px;top:96px;font-size:28px;color:${mut}">GRE / GMAT</div>
    <svg style="position:absolute;left:0;top:0;overflow:visible" width="1920" height="1080">
      <line id="desk" class="dr" x1="180" y1="${PY + 4 * (SH + GAP) + 26}" x2="1760" y2="${PY + 4 * (SH + GAP) + 26}" pathLength="1" stroke="${col}" stroke-width="3"/>
      ${[0,1,2].map(k => `<line id="cut${k}" x1="${PX - 30}" y1="${PY + (k + 1) * (SH + GAP) - GAP / 2}" x2="${PX + PW + 30}" y2="${PY + (k + 1) * (SH + GAP) - GAP / 2}" pathLength="1" stroke="${C.accent}" stroke-width="4" style="stroke-dasharray:1;stroke-dashoffset:1;opacity:0"/>`).join("")}
    </svg>
    ${[0,1,2,3].map(i => sectionHTML(`sc${i}`, i, PX, PY + i * (SH + GAP), PW, SH, col)).join("")}
    <svg style="position:absolute;left:0;top:0;overflow:visible" width="1920" height="1080">
      <path id="ptk" d="M${PX + PW - 90},${PY + 4 * (SH + GAP) - 60} L${PX + PW - 66},${PY + 4 * (SH + GAP) - 36} L${PX + PW - 20},${PY + 4 * (SH + GAP) - 96}" pathLength="1" fill="none" stroke="${col}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>
    </svg>
    <div id="bigck" style="position:absolute;left:1280px;top:210px">${clockSVG("bc", 110, col, null, 4)}</div>
    <div id="cklab" class="disp" style="position:absolute;left:1270px;top:470px;width:250px;text-align:center;font-size:40px;font-variation-settings:'wght' 700">30 min</div>
    <div id="cklab3" class="disp" style="position:absolute;left:1270px;top:470px;width:250px;text-align:center;font-size:40px;font-variation-settings:'wght' 700;opacity:0">3 hours</div>
    <div id="queue" style="position:absolute;left:1560px;top:520px;width:240px;height:140px">
      ${[0,1,2].map(k => `<div style="position:absolute;left:${k * 70}px;top:0">${personSVG("pp" + k, mut)}</div>`).join("")}</div>
    ${[1,2,3].map(k => `<div id="mj${k}" style="position:absolute;left:0;top:0;color:${col}">${robot("mj" + k + "j", JARS[k], RTOP, RS)}</div>`).join("")}
    ${[0,1,2,3].map(k => `<div id="sck${k}" style="position:absolute;left:${COLX[k] + PW / 2 - 64}px;top:${SPLIT_Y - 170}px;opacity:0">${clockSVG("s" + k, 56, col, null, 3.5)}</div>`).join("")}
    <svg style="position:absolute;left:0;top:0;overflow:visible" width="1920" height="1080">
      ${[0,1,2].map(k => `<line id="vd${k}" x1="${COLX[k] + PW + 10}" y1="${SPLIT_Y - 20}" x2="${COLX[k] + PW + 10}" y2="${SPLIT_Y + SH + 20}" pathLength="1" stroke="${C.accent}" stroke-width="5" stroke-linecap="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>`).join("")}
    </svg>
    <div id="lab30" class="capt" style="position:absolute;left:120px;top:${DESK_Y + 40}px;width:1740px;text-align:center;font-size:36px;color:${mut};opacity:0">each section, a full 30 minutes</div>
    ${g1final}
    <div id="walker" style="position:absolute;left:0;top:0;color:${col}">${robot("jw", 0, 0, G01R.s)}</div>
    ${bingoDiv}
    ${GRAIN_HTML}
  </div>
  <div id="bord" style="position:absolute;left:${G01.x}px;top:${G01.y}px;width:${G01.w}px;height:${G01.h}px;border:6px solid #FFFFFF;border-radius:4px"></div>
</div>`;
  let js = "";
  // the page is on screen from frame 0, clipped to g01's rect (g01's last frame), then grows.
  // clip-path, not left/top/width/height: those snap to whole pixels and stutter (lint)
  // r9: g01's card is .sheet paper at 92% over the face; the page starts the same and firms up as it
  // grows, so the cut does not step 3.7 luma levels brighter
  // r11: the backdrop (glow, grid) fades in with the page; appearing on frame 1 it darkened the card
  js += `tl.fromTo(["#deco1","#deco2"],{opacity:0},{opacity:1,duration:${GROW},ease:"power1.in"},0);\n`;
  js += `tl.fromTo("#grain",{opacity:0},{opacity:0.03,duration:${GROW},ease:"power1.in"},0);\n`;
  js += `tl.fromTo("#page",{backgroundColor:"${C.bg}EB"},{backgroundColor:"${C.bg}",duration:${GROW},ease:"power2.inOut"},0);\n`;
  js += `tl.fromTo("#page",{clipPath:"${clip0}"},{clipPath:"inset(0px 0px 0px 0px round 0px)",duration:${GROW},ease:"power2.inOut"},0);\n`;
  js += hide("#bord", 0, 0.15);   // r10: the old card's border lingered as a ghost rectangle
  // g01's leftovers clear out as the page grows; the bingo token settles onto the paper
  // comp r2 #8: clear the bin and clock BEFORE the walker rolls past them (it overlapped the bin)
  js += hide("#g1f", 0.05, 0.25);
  // the bingo token travels onto the desk and settles where section 1 of the exam appears
  // r9: it starts at the tilt g01 left it (it turned with the hand) and straightens in flight; it
  // flies slower and section 1 grows from it only once the robot has hopped down and rolled clear
  const TFLY = 1.3;
  { // r10: up above the robot's head first, across above it, then down into section 1 (it used to
    // fly straight across the jar while the robot rolled under it)
    const sx = G01.x + 6 + bx, sy = G01.y + 6 + by, tx = PX + PW / 2, ty = PY + SH / 2, HIGH = 300;
    // r12: out to the right, clear of the jar, before it rises (it crossed the head going straight up)
    js += `tl.fromTo("#bingo",{x:0},{x:90,duration:0.22,ease:"sine.out"},0);\n`;
    js += `tl.fromTo("#bingo",{y:0},{y:${(HIGH - sy).toFixed(1)},duration:0.36,ease:"sine.inOut",immediateRender:false},0.1);\n`;
    js += `tl.fromTo("#bingo",{x:90},{x:${(tx - sx).toFixed(1)},duration:0.5,ease:"power2.inOut",immediateRender:false},0.24);\n`;
    js += `tl.fromTo("#bingo",{y:${(HIGH - sy).toFixed(1)}},{y:${(ty - sy).toFixed(1)},duration:0.35,ease:"power2.inOut",immediateRender:false},0.9);\n`;
    js += `tl.fromTo("#bingo",{scale:1,rotation:${G1P.triRot.toFixed(1)}},{scale:1.6,rotation:0,duration:${TFLY},ease:"power2.inOut"},0);\n`; }
  // comp r2 #8: the token becomes section 1. It lands, then shrinks into the section as the
  // section grows out of the same point; the other three sections follow. Previously the token
  // floated alone and vanished and the paper appeared from nothing 0.6s later.
  js += `tl.fromTo("#bingo",{opacity:1},{opacity:0,scale:0.9,duration:0.35,ease:"power2.in",immediateRender:false},${f3(TFLY)});\n`;
  js += `tl.fromTo("#sc0",{opacity:0,scale:0.2,transformOrigin:"50% 50%"},{opacity:1,scale:1,transformOrigin:"50% 50%",duration:0.45,ease:"power2.out"},${f3(TFLY - 0.25)});  /* QA r3: token floated alone 0.4s */\n`;
  // the robot hops from its g01 position down onto the desk, lowering the arm that held the
  // token; its wheels turn by the distance it travels
  // Robot QA 2026-09-29 (F4, F5): the walker starts exactly where g01 left its robot (after g01's
  // rolls, arm raised, gripper closed) on frame 0, with no 3-frame pop to a hanging arm. It ROLLS
  // along g01's table line, wheels turning, then HOPS down to the desk with the wheels still (it
  // used to sink straight down through the air with the wheels spinning).
  // r9: it rolls RIGHT off the end of g01's table line, hops down onto the desk (wheels still in the
  // air), then rolls left to its place. (r5 went left, but the desk starts right of that end, so the
  // "hop" drifted back over the ledge as it vanished.) Wheel angles continue from g01's.
  const W0 = [G01.x + 6 + G01R.x + G01_DXF, G01.y + 6 + G01R.y], W1 = [520, DESK_Y - 540 * G01R.s];
  const LINE_END = G01.x + 6 + 634, XR = LINE_END - 30, XLAND = XR + 40, A0 = wheelAngle(G01_DXF, G01R.s);
  const wa = x => (A0 + wheelAngle(x - W0[0], G01R.s)).toFixed(1);
  const wheels = (x0, x1, t, d, ir = false) => ["L", "R"].map(k => `tl.fromTo("#jw-wh${k}",{rotation:${wa(x0)},svgOrigin:"${k === "L" ? "96 520" : "224 520"}"},{rotation:${wa(x1)},svgOrigin:"${k === "L" ? "96 520" : "224 520"}",duration:${d},ease:"power2.inOut",immediateRender:${ir}},${f3(t)});\n`).join("");
  if (XR + 96 * G01R.s - 20 * G01R.s < LINE_END) throw new Error("g02: the walker's left wheel is still over the line when it hops");
  // r12: it waits for the triangle to lift clear before rolling (it overtook it and the triangle crossed the jar)
  const TW = 0.3;
  js += `tl.fromTo("#walker",{x:${W0[0]},y:${W0[1]}},{x:${XR},y:${W0[1]},duration:0.4,ease:"power2.inOut",immediateRender:true},${TW});\n` + wheels(W0[0], XR, TW, 0.4, true) + spokeBlur("jw", TW, 0.4);
  // r12: it rolls off the end and drops straight away (it rose and hung past the end for ~0.3s)
  js += `tl.fromTo("#walker",{x:${XR}},{x:${XLAND},duration:0.3,ease:"power1.out",immediateRender:false},${TW + 0.4});\n`;
  js += `tl.fromTo("#walker",{y:${W0[1]}},{y:${W1[1]},duration:0.3,ease:"power2.in",immediateRender:false},${TW + 0.4});\n`;
  js += `tl.fromTo("#walker",{x:${XLAND}},{x:${W1[0]},duration:0.5,ease:"power2.inOut",immediateRender:false},${TW + 0.74});\n` + wheels(XLAND, W1[0], TW + 0.74, 0.5) + spokeBlur("jw", TW + 0.74, 0.5);
  js += hide("#g1line", TW + 0.45, 0.2);
  const WA1 = wa(W1[0]);
  js += robotArm("jw", "R", { ...G1P.pose, g: 1 }, { a: 0, b: 0, g: 0 }, 0, 0.5).replace(/immediateRender:false/g, "immediateRender:true");
  // takeover drift 1.00 -> 1.03 over the whole beat (style.json takeoverDrift)
  js += `tl.fromTo("#scene",{scale:1,transformOrigin:"45% 50%"},{scale:1.03,transformOrigin:"45% 50%",duration:${f3(D - GROW)},ease:"power1.inOut"},${GROW});\n`;
  js += grainJS(D);
  // M1 Imagine: desk, paper, eyebrow, clock
  js += drawAll("#desk", 0.3, 0.5) + show("#eb", GROW + 0.2, 0.4);   // the desk is there before the walker hops onto it
  js += show([1,2,3].map(i => `#sc${i}`), TFLY + 0.1, 0.4, "y:14|y:0");
  js += show("#bigck", GROW + 0.45, 0.2) + drawAll("#bc .dr", GROW + 0.5, 0.5) + show("#cklab", GROW + 0.8, 0.3);
  js += robotIdle("jw", GROW + 1.0, tDiv + 0.4, 6);
  // M2 30 minutes: the hand goes round while sections 1 and half of 2 fill; it runs out
  const runOut = Math.max(tFare - 0.2, t30 + 2.4);
  js += sweep("bc", 0, 1, t30, runOut - t30);
  js += fillSection("sc0", t30 + 0.1, (runOut - t30) * 0.55);
  js += [0, 1].map(k => drawAll(`#sc1-l${k}`, t30 + 0.1 + (runOut - t30) * (0.6 + k * 0.2), (runOut - t30) * 0.18)).join("");
  js += `tl.fromTo("#bc-sw",{stroke:"${col}"},{stroke:"${mut}",duration:0.3},${f3(runOut)});\n`;
  // M3 three hours: the dial widens, all four sections finish, tick
  js += hide("#cklab", tThree, 0.2) + show("#cklab3", tThree + 0.1, 0.3);
  js += `tl.fromTo("#bigck",{scale:1,transformOrigin:"50% 50%"},{scale:1.35,transformOrigin:"50% 50%",duration:0.6,ease:"power2.out"},${f3(tThree)});\n`;
  js += sweep("bc", 1, 1.0001, tThree, 0.2) + sweep("bc", 0, 0.8, tThree + 0.3, 3.2, "power1.inOut");
  js += [2, 3].map(k => drawAll(`#sc1-l${k}`, tThree + 0.4 + k * 0.15, 0.2)).join("");
  js += fillSection("sc2", tThree + 0.9, 1.0) + fillSection("sc3", tThree + 1.8, 1.0);
  js += drawAll("#ptk", tThree + 2.9, 0.35);
  // M4 latency: a queue forms, the 3-hour dial greys out
  js += [0,1,2].map(k => drawAll(`#pp${k} .dr`, tLat + k * 0.3, 0.4)).join("");
  js += `tl.fromTo(["#bigck","#cklab3"],{opacity:1},{opacity:0.3,duration:0.5,immediateRender:false},${f3(tLat + 0.6)});\n`;
  // M5 divide: accent cut lines, the sections slide apart into four columns
  [0,1,2].forEach(k => {
    js += `tl.fromTo("#cut${k}",{opacity:0},{opacity:1,duration:0.2},${f3(tDiv + k * 0.12)});\n`;
    js += drawAll(`#cut${k}`, tDiv + k * 0.12, 0.35);
  });
  js += hide("#ptk", tDiv, 0.3);
  js += hide(["#bigck", "#cklab3", "#queue", "#eb"], tDiv + 0.2, 0.4);
  [0,1,2,3].forEach(i => {
    js += `tl.fromTo("#sc${i}",{x:0,y:0},{x:${COLX[i] - PX},y:${SPLIT_Y - (PY + i * (SH + GAP))},duration:0.8,ease:"power2.inOut",immediateRender:false},${f3(tDiv + 0.5)});\n`;
  });
  // the horizontal cuts fade as the paper splits; vertical $accent dividers take over between
  // the columns (the rotating cuts crossed the sections diagonally, review finding 12)
  js += hide(["#cut0", "#cut1", "#cut2"], tDiv + 0.5, 0.3);
  [0,1,2].forEach(k => { js += drawAll(`#vd${k}`, tDiv + 1.2 + k * 0.1, 0.35); });
  js += `tl.fromTo("#walker",{x:${W1[0]},y:${W1[1]},scale:1},{x:${JARS[0]},y:${RTOP},scale:${(RS / G01R.s).toFixed(3)},transformOrigin:"0 0",duration:0.8,ease:"power2.inOut",immediateRender:false},${f3(tDiv + 0.5)});\n`;
  js += ["L", "R"].map(k => `tl.fromTo("#jw-wh${k}",{rotation:${WA1},svgOrigin:"${k === "L" ? "96 520" : "224 520"}"},{rotation:${wa(JARS[0])},svgOrigin:"${k === "L" ? "96 520" : "224 520"}",duration:0.8,ease:"power2.inOut",immediateRender:false},${f3(tDiv + 0.5)});\n`).join("");
  js += spokeBlur("jw", tDiv + 0.5, 0.8);
  // M6 give each section to a different agent: three more jars, four small clocks
  // held off-screen right until each one's cue (a later-starting roll does not stamp its start)
  [1,2,3].forEach(k => { js += `tl.fromTo("#mj${k}j",{x:${1960 - JARS[k]}},{x:${1960 - JARS[k]},duration:0.1},0);\n`; });
  [1,2,3].forEach(k => { js += robotRoll(`mj${k}j`, 1960 - JARS[k], 0, tGive + (k - 1) * 0.25, 1.0, RS, "power2.out");
                              js += robotIdle(`mj${k}j`, tGive + 1.4, D - 0.2, 7); });
  js += robotIdle("jw", tGive + 1.4, D - 0.2, 7);
  [0,1,2,3].forEach(k => { js += show(`#sck${k}`, tGive + 0.3 + k * 0.2, 0.3) + drawAll(`#s${k} .dr`, tGive + 0.3 + k * 0.2, 0.4); });
  // M7 parallelize: all four sweep together, sections refill, all inside 30 minutes
  [0,1,2,3].forEach(i => { [0,1,2,3].forEach(k => {
    js += `tl.fromTo("#sc${i}-l${k}",{strokeDashoffset:0},{strokeDashoffset:1,duration:0.3,immediateRender:false},${f3(tGive + 1.0)});\n`; }); });
  [0,1,2,3].forEach(k => { js += sweep(`s${k}`, 0, 0.85, tPar, Math.min(3.0, tHave - tPar + 0.5)); });
  [0,1,2,3].forEach(i => { js += fillSection(`sc${i}`, tPar + 0.1, Math.min(2.8, tHave - tPar + 0.3)); });
  js += show("#lab30", tPar + 0.4, 0.4);
  emit(id, D, body, js, ["grain.png"]);
}

// ============================================================== g03 Spark vs agent team
// CONTRAST takeover. Divider first; left: a Spark driver fanning out to four executors,
// each with a partition; right: the SAME geometry, a lead jar and four jars-with-limbs,
// each holding an exam section. One $accent: the right eyebrow's rule.
if (want("g03")) {
  const id = "g03", D = dur(id), c = p => cueRel(id, p);
  const tApp = c("applied"), tSwarm = c("swarm"), tTeam = cueRel(id, "agent team.");
  const col = C.ink, mut = C.muted;
  const side = (ox, spark) => {
    const top = spark
      ? `<div style="position:absolute;left:${ox + 370}px;top:230px;width:220px;height:90px;border:3px solid ${col};border-radius:10px;background:${C.bg}">
           <div class="disp" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:32px;font-variation-settings:'wght' 700">driver</div></div>`
      : `<div id="lead" style="position:absolute;left:0;top:0;color:${col}">${robot("lj", ox + 480 - 51, 200, 0.32, { icon: true, name: "LEAD" })}</div>`;
    const kids = [0,1,2,3].map(k => {
      const x = ox + 150 + k * 170;
      return spark
        ? `<div style="position:absolute;left:${x}px;top:560px;width:150px;height:110px;border:3px solid ${col};border-radius:10px;background:${C.bg}">
             <div class="capt" style="position:absolute;left:0;top:10px;width:150px;text-align:center;font-size:24px">executor</div>
             <div style="position:absolute;left:30px;top:52px;width:90px;height:40px;border:2px solid ${mut};border-radius:4px;background:${C.accentSoft}33"></div></div>`
        : `<div style="position:absolute;left:0;top:0;color:${col}">${robot("kj" + k, x + 75 - 43, 480, 0.27, { icon: true })}</div>
           <div style="position:absolute;left:${x + 30}px;top:640px;width:90px;height:40px;border:2px solid ${mut};border-radius:4px;background:${C.bg}">
             <div class="capt" style="position:absolute;inset:0;text-align:center;line-height:36px;font-size:24px">${k + 1}</div></div>`;
    }).join("");
    const edges = [0,1,2,3].map(k => `<line id="${spark ? "se" : "te"}${k}" x1="${ox + 480}" y1="${spark ? 320 : 380}" x2="${ox + 225 + k * 170}" y2="${spark ? 560 : 480}" pathLength="1" stroke="${col}" stroke-width="2.4" style="stroke-dasharray:1;stroke-dashoffset:1"/>`).join("");
    const dot = `<circle id="${spark ? "sd" : "td"}" cx="${ox + 480}" cy="${spark ? 320 : 380}" r="9" fill="${col}" opacity="0"/>`;
    // scaled 1.22x about the half's centre and moved down so it fills the half (review finding
    // 14: it sat in the top 55% at ~17px labels). Static CSS on an INNER wrapper; GSAP moves the outer.
    return `<div id="${spark ? "L" : "R"}" style="position:absolute;left:0;top:0;width:1920px;height:1080px">
      <div style="position:absolute;left:0;top:0;width:1920px;height:1080px;transform:translate(0px,70px) scale(1.22);transform-origin:${ox + 480}px 450px">${top}${kids}
      <svg style="position:absolute;left:0;top:0;overflow:visible" width="1920" height="1080">${edges}${dot}</svg></div></div>`;
  };
  const body = `
<div id="bg" style="position:absolute;inset:0;background:${C.bg}">
  <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 45%, ${C.accentSoft}14, transparent 60%)"></div>
  <div id="scene" style="position:absolute;inset:0">
    <svg style="position:absolute;left:0;top:0" width="1920" height="1080"><line id="div" x1="960" y1="90" x2="960" y2="990" pathLength="1" stroke="${C.rule}" stroke-width="2" style="stroke-dasharray:1;stroke-dashoffset:1"/></svg>
    <div id="ebL" class="capt eyebrow" style="position:absolute;left:120px;top:110px;font-size:30px;color:${mut}">Apache Spark</div>
    <div id="ebR" class="capt eyebrow" style="position:absolute;left:1080px;top:110px;font-size:30px;color:${mut}">Agent swarm</div>
    <div id="ebR2" class="capt eyebrow" style="position:absolute;left:1080px;top:110px;font-size:30px;color:${col};opacity:0">Agent team</div>
    <div id="ebRs" class="med" style="position:absolute;left:1080px;top:152px;font-size:28px;color:${mut};opacity:0">in Claude Code</div>
    <div id="ebRule" class="accentbar" style="position:absolute;left:1080px;top:148px;width:260px;height:4px"></div>
    ${side(0, true)}${side(960, false)}
  </div>
  ${GRAIN_HTML}
</div>`;
  let js = drawAll("#div", 0, 0.5);
  js += show("#ebL", 0.4, 0.3) + show("#L", 0.5, 0.4, "y:12|y:0");
  js += [0,1,2,3].map(k => drawAll(`#se${k}`, 0.8 + k * 0.1, 0.3)).join("");
  // dots run the fan continuously, driver -> executor k -> back
  // ONE dot per side hops driver -> executor k -> driver, strictly one tween at a time
  // (the lint flagged overlapping repeats on the same element)
  const loopDot = (dot, ox, y0, y1, t0) => {
    let out = "", t = t0, k = 0, first = true;
    while (t + 1.2 < D - 0.1) {
      const x0 = ox + 480, x1 = ox + 225 + (k % 4) * 170;
      out += `tl.fromTo("#${dot}",{attr:{cx:${x0},cy:${y0}}},{attr:{cx:${x1},cy:${y1}},duration:0.6,ease:"power1.inOut",immediateRender:${first}},${f3(t)});\n`;
      out += `tl.fromTo("#${dot}",{attr:{cx:${x1},cy:${y1}}},{attr:{cx:${x0},cy:${y0}},duration:0.6,ease:"power1.inOut",immediateRender:false},${f3(t + 0.6)});\n`;
      t += 1.3; k++; first = false;
    }
    return out;
  };
  js += show("#sd", 1.1, 0.15) + loopDot("sd", 0, 320, 560, 1.3);
  js += show("#ebR", tApp, 0.3) + show("#R", tApp + 0.1, 0.4, "y:12|y:0");
  // Robot QA 2026-09-29 (F8): they faded in at their slots and then shuffled 60px, bunching up.
  // Now each waits off the right edge from frame 0 and rolls all the way in, the leftmost (the
  // front of the line) first, so the gaps only ever open up.
  const KOFF = 820;
  // r6: LEAD rolls in too (it faded in place), ahead of its four teammates
  js += `tl.fromTo("#lj",{x:${KOFF}},{x:${KOFF},duration:0.01,immediateRender:true},0);\n` + robotRoll("lj", KOFF, 0, tApp + 0.05, 0.8, 0.32, "power2.out");
  js += [0,1,2,3].map(k => `tl.fromTo("#kj${k}",{x:${KOFF}},{x:${KOFF},duration:0.01,immediateRender:true},0);\n`
    + robotRoll(`kj${k}`, KOFF, 0, tApp + 0.2 + k * 0.1, 0.8, 0.27, "power2.out")).join("");
  js += [0,1,2,3].map(k => drawAll(`#te${k}`, tApp + 0.6 + k * 0.1, 0.3)).join("");
  js += show("#td", tApp + 0.9, 0.15) + loopDot("td", 960, 380, 480, tApp + 1.1);
  js += `tl.fromTo("#ebR",{color:"${mut}"},{color:"${col}",duration:0.3},${f3(tSwarm)});\n` + ruleIn("#ebRule", tSwarm);
  js += `tl.fromTo("#ebR",{clipPath:"inset(0 0% 0 0)"},{clipPath:"inset(0 100% 0 0)",duration:0.3,immediateRender:false},${f3(tTeam - 0.3)});\n`;
  js += wipeIn("#ebR2", tTeam, 0.35);
  js += `tl.fromTo("#ebR2",{opacity:0},{opacity:1,duration:0.2},${f3(tTeam)});\n` + show("#ebRs", tTeam + 0.3, 0.3);
  js += `tl.fromTo("#ebRule",{y:0},{y:40,duration:0.3,ease:"power2.out",immediateRender:false},${f3(tTeam + 0.2)});\n`;
  js += robotIdle("lj", tApp + 1, D - 0.2, 5) + [0,1,2,3].map(k => robotIdle(`kj${k}`, tApp + 1.2 + k * 0.1, D - 0.2, 8)).join("");
  js += grainJS(D);
  emit(id, D, body, js, ["grain.png"]);
}

// ============================================================== g04 lower third
if (want("g04")) {
  const id = "g04", D = dur(id);
  const body = `
<div id="lt" class="${panelClass(id)}" style="position:absolute;left:${LEFT_X0}px;top:630px;width:700px;height:164px">
  <div class="disp" style="position:absolute;left:36px;top:24px;font-size:44px;font-variation-settings:'wght' 700">Sreeram Nudurupati</div>
  <div id="rule" class="accentbar" style="position:absolute;left:36px;top:86px;width:400px;height:3px"></div>
  <div class="capt muted" style="position:absolute;left:36px;top:102px;font-size:28px;white-space:nowrap">AI for the Working Data Engineer · Episode 5</div>
</div>`;
  let js = wipeUp("#lt", 0) + ruleIn("#rule", 0.4) + wipeDown("#lt", exitAt(D));
  emit(id, D, body, js);
}

// ============================================================== demo overlays
// Cards over the screen recording are OPAQUE (style.md: mean luma cannot see a terminal's
// detail density). The inset sits bottom-RIGHT except 757-925 (demo-spec reposition),
// where cards move to the right column so they do not stack on it.
const colX = id => insetLeftDuring(id) ? 1160 : LEFT_X0;

// ---- OCR lookup for marks: nearest sample that actually has the match (the board log's
// small text defeats OCR on some samples, so an empty nearest sample is skipped)
const ocrFind = (t, re, sub = null, nth = 0, within = 4, shift = 0) => {
  const cands = OCR.filter(d => Math.abs(d.t - t) <= within)
    .sort((a, b) => Math.abs(a.t - t) - Math.abs(b.t - t));
  for (const d of cands) {
    const hits = d.runs.filter(r => re.test(r[4])).sort((a, b) => a[1] - b[1]);
    if (hits.length > nth) {
      let [x, y, w, h, txt] = hits[nth];
      if (sub) {
        // a RegExp sub tolerates OCR misreads ("TEAMS-1", "feammate"); a string must match exactly
        const m = sub instanceof RegExp ? txt.match(sub) : (txt.indexOf(sub) >= 0 ? { index: txt.indexOf(sub), 0: sub } : null);
        if (!m) throw new Error(`OCR: ${sub} not inside "${txt}" at ${d.t}`);
        const cw = w / txt.length; x = x + (m.index + shift) * cw; w = m[0].length * cw;  // shift: chars, where OCR dropped spaces or the font is proportional
      }
      return [x, y, x + w, y + h];
    }
  }
  throw new Error(`OCR: /${re.source}/ (#${nth}) not on screen within ${within}s of ${t}`);
};

// ---- marks over punch-ins. Each mark: {zid, re, sub, nth, at (cut s), kind box|ul, accent,
// label}. Shown from max(cue, plateau start) to the plateau end (marks leave BEFORE the zoom
// does, and before the screen under them changes); a small positional settle on entry so
// the seek check sees geometry move (04 lesson).
// ---- marks snap to the pixels (human 2026-09-30: boxes cut through "crm" and "marts", "needs
// fixing once and for all"). A mark's extent from OCR is a character-count estimate that drifts
// whenever OCR drops a space. The build writes every box/underline it needs to mark-requests.json;
// snap_marks.py looks at the actual screen frame and moves each edge to the true end of the word it
// falls in; the build then uses mark-snap.json. A mark with no snap fails the build (MARKS_STRICT).
const MARK_REQ_FILE = "mark-requests.json", MARK_SNAP_FILE = "mark-snap.json";
const MARK_SNAP = existsSync(MARK_SNAP_FILE) ? JSON.parse(readFileSync(MARK_SNAP_FILE, "utf8")) : {};
const MARK_REQ = existsSync(MARK_REQ_FILE) ? JSON.parse(readFileSync(MARK_REQ_FILE, "utf8")) : {};
process.on("exit", () => { writeFileSync(MARK_REQ_FILE, JSON.stringify(MARK_REQ, null, 1)); });
const marksPart = (id, marks, extraBody = "", extraJS = "") => {
  if (!want(id)) return;
  const D = dur(id), [S] = span(id);
  let body = "", js = "";
  marks.forEach((m, i) => {
    const [p0, p1] = plateau(m.zid, S);
    const t = Math.max(p0 + 0.15, m.at != null ? m.at - S : p0 + 0.3);
    const tOff = Math.min(p1 - 0.1, m.until != null ? m.until - S : p1 - 0.1);
    if (t >= tOff - 0.3) throw new Error(`${id}: mark ${i} (${m.re}) has no time on its plateau (${f3(t)}-${f3(tOff)})`);
    const src = ocrFind(Math.max(m.at ?? 0, zoomItem(m.zid).start + 0.5), m.re, m.sub, m.nth ?? 0, m.within ?? 4, m.shift ?? 0);
    // dy: a row OCR cannot read, placed from a neighbouring row it can (source px)
    if (m.dy) { src[1] += m.dy; src[3] += m.dy; }
    // tickX: one source x for a whole column of ticks (the quoted 'crm' started 5px left of the
    // other names, so the column read ragged)
    if (m.tickX != null) { const w = src[2] - src[0]; src[0] = m.tickX; src[2] = m.tickX + w; }
    if (m.kind === "box" || m.kind === "ul") {
      const key = `${id}#${i}|${m.re.source}|${m.sub instanceof RegExp ? m.sub.source : (m.sub ?? "")}|${(m.shift ?? 0)}|${(m.at ?? 0).toFixed(2)}`;
      MARK_REQ[key] = { part: id, t: +(S + (t + tOff) / 2).toFixed(3), box: src.slice(0, 4).map(v => +(+v).toFixed(1)) };
      const sn = MARK_SNAP[key];
      if (sn && sn.box) { src[0] = sn.box[0]; src[2] = sn.box[2]; }
      else if (process.env.MARKS_STRICT) throw new Error(`${id}: mark ${i} (${m.re}) has no pixel snap; run snap_marks.py`);
    }
    let [x0, y0, x1, y1] = mapZoom(m.zid, src);
    // comp r2 #7: OCR line boxes run 33-44px on a 39px line pitch (source px), so an 8px pad
    // put box edges and underlines through the neighbouring lines, which reads as a strike.
    // Normalise to the pitch: text height 0.72 of it, vertical pad at most half the leading.
    const P = (m.pitch ?? (/^g(05|06|08|09|10|18)/.test(m.zid) ? 34 : 39)) * zoomItem(m.zid).zoom / 2  /* terminal 34, editor 39, measured from OCR row spacing */, yc = (y0 + y1) / 2;
    y0 = yc - 0.36 * P; y1 = yc + 0.36 * P;
    const padY = Math.min(m.pad ?? 8, 0.13 * P);
    // the screens here are dark (terminal and editor, luma ~50): an $ink mark vanished (QA
    // 2026-09-29), so non-accent marks are paper-coloured
    const pad = m.pad ?? 8, col = m.accent ? C.accent : C.bg;
    const shape = m.kind === "tick"
      ? `<path id="mk${i}" d="${m.tickLeft
          // tickLeft: in the gutter between the line numbers and the table's opening pipe (QA r4:
          // right of the name the tick sat on the "|" and, on the lead row, on "Shared")
          ? `M${x0 - 72},${(y0 + y1) / 2} l7,7 l14,-16` : `M${x1 + 18},${(y0 + y1) / 2} l10,10 l20,-22`}" pathLength="1" fill="none" stroke="${col}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>`
      : m.kind === "ul"
      ? `<line id="mk${i}" x1="${x0}" y1="${y1 + 0.12 * P}" x2="${x1}" y2="${y1 + 0.12 * P}" pathLength="1" stroke="${col}" stroke-width="${m.accent ? 6 : 4}" stroke-linecap="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>`
      : `<rect id="mk${i}" x="${x0 - pad}" y="${y0 - padY}" width="${x1 - x0 + 2 * pad}" height="${y1 - y0 + 2 * padY}" rx="8" pathLength="1" fill="none" stroke="${col}" stroke-width="${m.accent ? 6 : 4}" style="stroke-dasharray:1;stroke-dashoffset:1"/>`;
    body += `<div id="mw${i}" style="position:absolute;left:0;top:0;opacity:0">${markSVG(x0 - pad - (m.tickLeft ? 80 : 0), y0 - pad, x1 + pad + (m.kind === "tick" ? 60 : 0), y1 + pad + 8, shape, 24)}`;
    if (m.label) {
      // labelRight: beside the box, for a value with a sub-line under it (g18's "(2.19 million)")
      const ly = m.labelXY ? m.labelXY[1] : m.labelLeft ? y0 - 60 : m.labelRight ? y0 - 4 : m.labelAbove ? y0 - 70 : y1 + 26;
      const lx = m.labelXY ? m.labelXY[0] : m.labelLeft ? Math.max(24, x0 - m.labelW - 64) : m.labelRight ? x1 + 28 + (m.labelDx ?? 0) + (m.kind === "tick" ? 60 : 0) : Math.max(24, Math.min(x0, 1920 - 24 - m.labelW));
      body += `<div id="ml${i}" class="opaque capt" style="opacity:${m.labelAt != null ? 0 : 1};position:absolute;left:${lx}px;top:${ly}px;width:${m.labelW}px;padding:10px 18px;font-size:${m.labelSize || 26}px;line-height:1.25">${m.label}${m.labelSub ? `<div class="muted" style="font-size:20px;margin-top:4px">${m.labelSub}</div>` : ""}</div>`;
    }
    body += `</div>`;
    js += `tl.fromTo("#mw${i}",{opacity:0,y:6},{opacity:1,y:0,duration:0.25,ease:"power2.out"},${f3(t)});\n`;
    js += drawAll(`#mk${i}`, t, 0.35);
    if (m.label && m.labelAt != null)
      js += `tl.fromTo("#ml${i}",{opacity:0,y:-6},{opacity:1,y:0,duration:0.3},${f3(Math.max(t, m.labelAt - S))});\n`;
    js += `tl.fromTo("#mw${i}",{opacity:1},{opacity:0,duration:0.2,immediateRender:false},${f3(tOff - 0.2)});\n`;
  });
  emit(id, D, body + extraBody, js + extraJS);
};
const at = (id, phrase, which) => span(id)[0] + cueIn(id, phrase, which);

// ---- g05: the three context files, underlined as named; REQUIREMENTS.md is the accent
marksPart("g05", [
  { zid: "g05", re: /^CONVENTIONS\.md/, at: at("g05", "conventions.md"), kind: "ul" },
  { zid: "g05", re: /^STANDARDS\.md/, at: at("g05", "standards"), kind: "ul" },
  { zid: "g05", re: /^REQUIREMENTS\.md/, at: at("g05", "requirements"), kind: "ul", accent: true },
]);

// ---- g06: the launch command. Accent box on the flag, and two tags (human addition 4)
marksPart("g06", [
  { zid: "g06", re: /EXPERIMENTAL_AGENT_TEAMS/, sub: /CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS.1/, at: at("g06", "experimental"), kind: "box", accent: true,
    label: "EXPERIMENTAL · off by default", labelSub: "Claude Code docs", labelW: 520, labelSize: 28,
    labelAt: span("g06")[0] + cueIn("g06", "experimental,") },
  { zid: "g06", re: /EXPERIMENTAL_AGENT_TEAMS/, sub: /--.eammate-mode tmux/, at: at("g06", "teammate"), kind: "box",
    label: "each teammate in its own tmux pane", labelW: 520, labelSize: 26 },
]);

// ---- g08: the prompt. One $ink underline per instruction as it is paraphrased; the
// accent is the last one, 'what it could not infer' (the line the whole series is about)
marksPart("g08", [
  { zid: "g08a", re: /^Read CONVENTIONS\.md/, at: at("g08", "conventions"), kind: "ul" },
  { zid: "g08a", re: /^Use an agent team/, at: at("g08", "agent", "start"), kind: "ul" },
  { zid: "g08a", re: /^Plan the work/, at: at("g08", "plan"), kind: "ul" },
  { zid: "g08a", re: /^When a teammate needs a change/, at: at("g08", "messages"), kind: "ul" },
  { zid: "g08b", re: /^List every business decision/, at: at("g08", "report"), kind: "ul", accent: true },
]);

// ---- g10: the board log. Boxes on sender > receiver as they are named
marksPart("g10", [
  // comp r2 #6: the team-lead > pos box is gone; the speaker names only ecom > crm and erp > pos
  { zid: "g10a", re: /^ecom\s*>\s*crm/, within: 16, sub: /ecom\s*.\s*crm:?/, at: at("g10", "ecom"), until: at("g10", "erp"), kind: "box", accent: true },
  { zid: "g10a", re: /^ecom\s*>\s*crm/, within: 16, sub: /ecom\s*.\s*crm:?/, at: at("g10", "erp"), kind: "box" },
  { zid: "g10a", re: /^erp\s*>\s*pos/, within: 16, sub: /erp\s*.\s*pos:?/, at: at("g10", "erp"), kind: "box", accent: true },
]);

// ---- g14: TEAM_PLAN.md. Not six ticks: OCR sees only three roster rows (the table
// scrolls), so a chip lands on 'six agents' instead of ticking rows that are not there
// Rows are ticked where OCR actually reads them (ecom, erp, pos, marts at 697.5-699.5; the
// crm row is never read, so it is not ticked rather than guessed); the chip carries the count.
marksPart("g14", [
  // QA r2: crm reads as "'crm'" (quoted) and ecom misreads "CCOm" near the cue, where the only
  // exact "ecom" was the ownership table below the zoom: tolerant patterns, topmost hit wins
  // comp r2 #3: every row ticked; "lead" (line 13) never OCRs, so it sits one row (39px) above crm
  // QA r3: the recording scrolls at ~700.4 (frames 700.0 vs 700.5), so every g14a mark leaves then
  { zid: "g14a", re: /^'?crm'?$/, dy: -39, at: at("g14", "four") - 0.8, until: 700.4, kind: "tick", tickLeft: true, tickX: 831, within: 3 },
  { zid: "g14a", re: /^'?crm'?$/, at: at("g14", "four") - 0.6, until: 700.4, kind: "tick", tickLeft: true, tickX: 831, within: 3 },
  { zid: "g14a", re: /^'?(ecom|ccom)'?$/i, at: at("g14", "four") - 0.4, until: 700.4, kind: "tick", tickLeft: true, tickX: 831, within: 3 },
  { zid: "g14a", re: /^erp$/, at: at("g14", "four") - 0.2, until: 700.4, kind: "tick", tickLeft: true, tickX: 831, within: 3 },
  { zid: "g14a", re: /^pos$/, at: at("g14", "four"), until: 700.4, kind: "tick", tickLeft: true, tickX: 831, within: 3 },
  // the chip sits on the empty right half of the "## The team" heading line (canvas ~338 in the
  // g14a zoom): right of the table it hid row 18, below it the File ownership heading, and the
  // file tree to the left is outside this zoom
  { zid: "g14a", re: /^marts'?$/, at: at("g14", "two,"), until: 700.4, kind: "tick", tickLeft: true, tickX: 831, accent: true, within: 3,
    label: "4 source teammates + marts + lead = 6", labelW: 600, labelSize: 30, labelXY: [520, 300], labelAt: at("g14", "six") },
  { zid: "g14b", re: /^## File ownership/, at: at("g14", "ownership"), kind: "ul", accent: true },
  { zid: "g14b", re: /^One owner per file/, sub: /One owner per file/, at: at("g14", "ownership") + 0.4, kind: "box" },  // QA r2: box end touched "To"; stop before the full stop
]);

// ---- g16: the negotiation over point 2. Boxes on each line; a tally chip, top LEFT (the inset
// is top-right in this span, human 2026-09-29),
// tracks point 2 through proposed -> pushed back -> agreed. The accent is the final box.
{
  const id = "g16";
  if (want(id)) {
    const [S] = span(id);
    const tA = cueIn(id, "nine"), tB = at(id, "23") - S, tC = at(id, "39") - S;
    const tally = `
<div id="ty" class="opaque" style="position:absolute;left:96px;top:96px;width:400px;height:250px;opacity:0">
  <div class="capt eyebrow muted" style="position:absolute;left:28px;top:22px;font-size:22px">Point 2</div>
  ${["proposed", "pushed back", "agreed"].map((w, k) => `<div id="ty${k}" class="disp" style="position:absolute;left:28px;top:${64 + k * 56}px;font-size:34px;font-variation-settings:'wght' 700;opacity:0.3">${k ? "→ " : ""}${w}</div>`).join("")}
</div>`;
    let tj = `tl.fromTo("#ty",{opacity:0,y:-8},{opacity:1,y:0,duration:0.3},${f3(tA + 0.2)});\n`;
    [tA + 0.4, tB + 0.4, tC + 0.4].forEach((t, k) => { tj += `tl.fromTo("#ty${k}",{opacity:0.3},{opacity:1,duration:0.3},${f3(t)});\n`; });
    marksPart(id, [
      { zid: "g16a", re: /ecom\s*[>-]+\s*crm.*[Pp]ropos/, sub: /ecom\s*.{1,2}\s*crm/, at: S + tA, kind: "box" },
      { zid: "g16b", re: /crm\s*>\s*ecom.*agree/, sub: /points 1, 3, 4, 5 and 6/, at: S + tB, kind: "ul" },
      // comp r2 #1: the pushback itself gets the box, not only the agreement. Cued on "opinion":
      // "pushing" lands 0.5s before this stop ends, so the box only flashed (verify 2026-09-30)
      { zid: "g16b", re: /crm\s*>\s*ecom.*agree/, sub: /point 2 differently/, at: S + cueIn(id, "opinion"), kind: "box" },
      // comp r2 #1: the box framed "your point" and left the 2 out (OCR "nowmatches")
      { zid: "g16c", re: /matches your point 2/, sub: /point 2/, shift: 4, at: S + tC, kind: "box", accent: true },
    ], tally, tj);
  }
}

// ---- g17: line 53, the lead relays erp's new column to marts
marksPart("g17", [
  { zid: "g17", re: /team-lead\s*>\s*marts/, sub: /team-lead\s*.\s*marts/, at: at("g17", "53"), kind: "box" },
  { zid: "g17", re: /team-lead\s*>\s*marts/, sub: /source.order.date/, at: at("g17", "passing"), kind: "ul", accent: true,
    label: "the lead relays erp's new column to marts", labelW: 620, labelSize: 28 },
]);

// ---- g17b: BUILD_REPORT, the website is the branch with no city
marksPart("g17b", [
  { zid: "g17b", re: /POS: the we.site is the ERP branch/, at: at("g17b", "web"), until: at("g17b", "city."), kind: "box" },
  { zid: "g17b", re: /POS: the we.site is the ERP branch/, sub: /no city/, at: at("g17b", "city."), kind: "ul", accent: true },
  // comp r2 #5: line 216 wraps; its second visual line ("branch_id <> 'WEB'") is part of the sentence
  { zid: "g17b", re: /^branch_id\s*\S{1,2}\s*'WEB/, at: at("g17b", "web") + 0.3, kind: "box" },
]);

// ---- g18: 2.19 million from the files, then the mart total matching to the cent. The
// win is marked as loudly as a miss would be (04 lesson): the accent is the match.
marksPart("g18", [
  { zid: "g18", re: /^2187780\.17/, nth: 0, at: at("g18", "2.19"), until: at("g18", "all", "start"), kind: "box", label: "from the source files", labelW: 400, labelSize: 28, labelRight: true, labelDx: 48 },
  { zid: "g18", re: /^2187780\.17/, nth: 1, at: at("g18", "cent"), until: at("g18", "all", "start"), kind: "box", accent: true, label: "from the data mart: matches to the cent", labelW: 620, labelSize: 28, labelRight: true, labelDx: 48 },
  { zid: "g18", re: /^166706\.09/, at: at("g18", "all", "start"), kind: "box", within: 3,
    label: "web sales excluded: the check matches too", labelW: 620, labelSize: 28 },
]);

// ============================================================== gT tmux dictionary card
// Human addition 3. Definition quoted verbatim from Wikipedia (checked 2026-09-29).
if (want("gT")) {
  const id = "gT", D = dur(id), c = p => cueRel(id, p);
  const tMux = c("tmux."), tPanes = cueIn(id, "tmux screen,", "start");
  const X = colX(id);
  const body = `
<div id="card" class="${panelClass(id)}" style="position:absolute;left:${X}px;top:330px;width:700px;height:500px">
  <div class="disp" style="position:absolute;left:40px;top:30px;font-size:96px;line-height:1.1">tmux</div>
  <div class="med muted" style="position:absolute;left:300px;top:78px;font-size:26px;font-style:italic">noun</div>
  <div style="position:absolute;left:40px;top:150px;width:620px;height:1px;background:${C.rule}"></div>
  <div class="med" style="position:absolute;left:40px;top:172px;width:620px;font-size:31px;line-height:1.35">An open-source terminal multiplexer for Unix-like operating systems. It allows multiple terminal sessions to be accessed simultaneously in a single window.</div>
  <div class="capt muted" style="position:absolute;left:40px;top:392px;font-size:22px">Wikipedia</div>
  <svg style="position:absolute;left:520px;top:360px;overflow:visible" width="140" height="100">
    <rect class="dr" x="0" y="0" width="140" height="100" rx="8" pathLength="1" fill="none" stroke="${fg(id)}" stroke-width="3"/>
    <line id="sp1" x1="70" y1="0" x2="70" y2="100" pathLength="1" stroke="${C.accent}" stroke-width="4" style="stroke-dasharray:1;stroke-dashoffset:1"/>
    <line id="sp2" x1="0" y1="50" x2="140" y2="50" pathLength="1" stroke="${C.accent}" stroke-width="4" style="stroke-dasharray:1;stroke-dashoffset:1"/>
  </svg>
</div>`;
  let js = wipeUp("#card", Math.max(0, tMux - 0.1));
  js += drawAll("#card .dr", tMux + 0.3, 0.4);
  js += drawAll("#sp1", tPanes, 0.35) + drawAll("#sp2", tPanes + 0.25, 0.35);
  js += wipeDown("#card", exitAt(D));
  emit(id, D, body, js);
}

// ============================================================== g07 model card
// Human addition 5 (a must). Values from the Claude Code banner on screen (OCR 276.8):
// "Claude Code v2.1.283 / Opus 5.5 · Claude Pro", status line "medium · /effort".
if (want("g07")) {
  const id = "g07", D = dur(id), c = p => cueRel(id, p);
  const tOpus = c("opus"), tPro = cueIn(id, "claude pro");
  const body = `
<div id="card" class="${panelClass(id)}" style="position:absolute;left:${LEFT_X0}px;top:520px;width:640px;height:360px">
  <div class="capt eyebrow muted" style="position:absolute;left:40px;top:30px;font-size:24px">Recorded with</div>
  <div id="r1" class="disp" style="position:absolute;left:38px;top:66px;font-size:56px;line-height:1.2">Claude Opus 5.5</div>
  <div id="ru" class="accentbar" style="position:absolute;left:40px;top:140px;width:300px;height:4px"></div>
  <div id="r2" class="disp" style="position:absolute;left:40px;top:162px;font-size:32px;font-variation-settings:'wght' 700">medium effort</div>
  <div id="r3" class="disp" style="position:absolute;left:40px;top:212px;font-size:32px;font-variation-settings:'wght' 700">Claude Pro subscription</div>
  <div class="capt muted" style="position:absolute;left:40px;top:290px;font-size:24px">Claude Code v2.1.283 · 29 Sep 2026</div>
</div>`;
  // enters with "this fired up Claude Code"; each row still lands on its own cue
  let js = wipeUp("#card", 0.1);
  js += `tl.fromTo(["#r1","#r2","#r3"],{clipPath:"inset(-40px 100% -60px 0)"},{clipPath:"inset(-40px 100% -60px 0)",duration:0.2},0);\n`;
  js += wipeIn("#r1", tOpus) + ruleIn("#ru", tOpus + 0.4) + wipeIn("#r2", tOpus + 0.8);
  js += wipeIn("#r3", Math.max(tPro, tOpus + 1.2));
  js += wipeDown("#card", exitAt(D));
  emit(id, D, body, js);
}

// ============================================================== gF1-gF3 fast-forwards
// One sound-effect length each (human 2026-09-29). Inset hidden (demo-spec). The clock
// counts WALL time from the /usage panel's own origin (ff-clock.json), so the last clock
// and the panel's 20m 34s agree. The colon is the one $accent element.
FFC.fastForwards.forEach((ff, i) => {
  const id = `gF${i + 1}`;
  if (!want(id)) return;
  const D = dur(id), [S] = span(id);
  if (Math.abs(S - ff.cutStart) > 0.04) throw new Error(`${id}: part starts ${S}, fast-forward ${ff.cutStart}`);
  const lab = ["the lead plans the work", "teammates build staging", "the marts agent builds"][i];
  const body = `
<div id="card" class="${panelClass(id)}" style="position:absolute;left:${LEFT_X0}px;top:96px;width:600px;height:390px">
  <svg style="position:absolute;left:40px;top:40px" width="70" height="40"><path d="M0,0 L30,20 L0,40 Z M34,0 L64,20 L34,40 Z" fill="${fg(id)}"/></svg>
  <div class="disp" style="position:absolute;left:124px;top:30px;font-size:44px;font-variation-settings:'wght' 700">${Math.round(ff.speed)}x</div>
  <div class="disp" style="position:absolute;left:36px;top:96px;font-size:160px;line-height:1.05;white-space:nowrap"><span id="mm">0</span><span style="color:${C.accent}">:</span><span id="ss">00</span></div>
  <div class="capt muted" style="position:absolute;left:40px;top:286px;width:520px;font-size:24px;line-height:1.3">since Claude Code started<br>${lab}</div>
</div>`;
  let js = wipeUp("#card", 0, 0.3);
  js += clockUp("#mm", "#ss", ff.wallStart, ff.wallEnd, 0, D);
  js += wipeDown("#card", exitAt(D));
  emit(id, D, body, js);
});

// ============================================================== g09 labels on the tmux panes
// Pane geometry MEASURED from screen-ocr.json at 372-388: the lead fills the left pane
// (source x 0-1180), four teammates stack on the right, each ~520px tall, their OCR'd
// pane titles in order erp, ecom, (crm), pos. Canvas = source / 2.
if (want("g09")) {
  const id = "g09", D = dur(id), c = p => cueRel(id, p);
  const T = { lead: 0.1, erp: c("erp"), ecom: c("e-commerce"), crm: c("crm"), pos: c("pos"), marts: c("fifth") };
  const PANES = [["erp", 0], ["ecom", 260], ["crm", 520], ["pos", 780]];
  const tab = (id2, x, y, txt, dashed = false) => `<div id="${id2}" class="${dashed ? "" : "opaque"} capt" style="position:absolute;left:${x}px;top:${y}px;padding:8px 18px;font-size:28px;${dashed ? `border:3px dashed ${C.muted};color:${C.bg};background:${C.ink}CC;border-radius:4px` : ""};opacity:0">${txt}</div>`;
  const body = `
<svg style="position:absolute;left:0;top:0;overflow:visible" width="1920" height="1080">
  <rect id="olead" x="12" y="12" width="570" height="1016" rx="6" pathLength="1" fill="none" stroke="${C.accent}" stroke-width="5" style="stroke-dasharray:1;stroke-dashoffset:1"/>
  ${PANES.map(([n, y]) => `<rect id="o${n}" x="594" y="${y + 4}" width="1322" height="252" rx="6" pathLength="1" fill="none" stroke="${C.bg}" stroke-width="4" style="stroke-dasharray:1;stroke-dashoffset:1"/>`).join("")}
</svg>
${tab("tlead", 30, 28, "lead")}
${PANES.map(([n, y]) => tab("t" + n, 612, y + 18, n)).join("")}
${tab("tmarts", 24, 940, "marts · standby", true)}`;
  let js = drawAll("#olead", T.lead, 0.5) + show("#tlead", T.lead + 0.1, 0.25, "y:-6|y:0");
  PANES.forEach(([n]) => { js += drawAll(`#o${n}`, T[n], 0.45) + show(`#t${n}`, T[n] + 0.05, 0.25, "y:-6|y:0"); });
  js += show("#tmarts", T.marts, 0.3, "y:8|y:0");
  js += hide(["#olead", ...PANES.map(([n]) => `#o${n}`), "#tlead", ...PANES.map(([n]) => `#t${n}`), "#tmarts"], exitAt(D), 0.3);
  emit(id, D, body, js);
}

// ============================================================== gA what an agent team is
// Human addition 4. Wording from code.claude.com/docs/en/agent-teams (architecture table).
const iconSVG = (kind, col) => ({
  lead: `<svg width="44" height="44" viewBox="0 0 44 44"><rect x="6" y="10" width="32" height="28" rx="6" fill="none" stroke="${col}" stroke-width="3"/><path d="M12,10 L16,3 L22,9 L28,3 L32,10" fill="none" stroke="${col}" stroke-width="3" stroke-linejoin="round"/></svg>`,
  mate: `<svg width="44" height="44" viewBox="0 0 44 44"><rect x="12" y="8" width="20" height="26" rx="5" fill="none" stroke="${col}" stroke-width="3"/><path d="M12,22 L2,16 M32,22 L42,16 M18,34 L16,42 M26,34 L28,42" stroke="${col}" stroke-width="3" stroke-linecap="round"/></svg>`,
  list: `<svg width="44" height="44" viewBox="0 0 44 44"><rect x="6" y="4" width="32" height="36" rx="4" fill="none" stroke="${col}" stroke-width="3"/><path d="M12,14 L15,17 L20,11 M12,26 L15,29 L20,23 M24,15 L32,15 M24,27 L32,27" fill="none" stroke="${col}" stroke-width="2.6" stroke-linecap="round"/></svg>`,
  mail: `<svg width="44" height="44" viewBox="0 0 44 44"><rect x="4" y="10" width="36" height="26" rx="3" fill="none" stroke="${col}" stroke-width="3"/><path d="M4,12 L22,26 L40,12" fill="none" stroke="${col}" stroke-width="3" stroke-linejoin="round"/></svg>`,
})[kind];
if (want("gA")) {
  const id = "gA", D = dur(id), c = p => cueRel(id, p);
  const t0 = c("team");
  const ROWS = [["lead", "Team lead", "the session that spawns and coordinates"],
                ["mate", "Teammates", "separate Claude Code instances, each with its own context window"],
                ["list", "Shared task list", "teammates claim the work"],
                ["mail", "Mailbox", "agents message each other directly"]];
  const rows = ROWS.map(([k, h, sub], i) => `
  <div id="ar${i}" style="position:absolute;left:36px;top:${104 + i * 118}px;width:640px;height:108px">
    <div style="position:absolute;left:0;top:${k === "lead" || k === "mate" ? -2 : 6}px;color:${fg(id)}">${
      // comp r2 #12: the card that names the roles uses the series' agent, the jar robot
      k === "lead" ? robot("ga" + i, 0, 0, 0.16, { icon: true, fill: C.ink })
      : k === "mate" ? robot("ga" + i, 0, 0, 0.16, { icon: true, fill: C.ink })
      : iconSVG(k, fg(id))}</div>
    <div class="disp" style="position:absolute;left:66px;top:0;font-size:34px;font-variation-settings:'wght' 700">${h}</div>
    <div class="med muted" style="position:absolute;left:66px;top:44px;width:560px;font-size:24px;line-height:1.3">${sub}</div>
  </div>`).join("");
  const body = `
<div id="card" class="${panelClass(id)}" style="position:absolute;left:${colX(id)}px;top:150px;width:700px;height:640px">
  <div class="capt eyebrow" style="position:absolute;left:36px;top:30px;font-size:24px">Agent team · Claude Code</div>
  <div id="hr" class="accentbar" style="position:absolute;left:36px;top:70px;width:260px;height:4px"></div>
  ${rows}
  <div class="capt muted" style="position:absolute;left:36px;top:596px;font-size:20px">Claude Code docs</div>
</div>`;
  let js = wipeUp("#card", Math.max(0, t0 - 0.3)) + ruleIn("#hr", t0 + 0.2);
  ROWS.forEach((_, i) => { js += `tl.fromTo("#ar${i}",{clipPath:"inset(100% 0 0 0)"},{clipPath:"inset(0% 0 -10px 0)",duration:0.35,ease:"power3.out"},${f3(t0 + 0.5 + i * 0.4)});\n`; });
  js += wipeDown("#card", exitAt(D));
  emit(id, D, body, js);
}

// ============================================================== g11 lead + four teammates
// LOOP. Delegation arrows on "plan was designed", sideways arcs on "talk to the different
// agents"; one message dot travels the arcs continuously and IS the one accent element.
if (want("g11")) {
  const id = "g11", D = dur(id), c = p => cueRel(id, p);
  const tPlan = c("plan"), tTalk = cueIn(id, "talk");
  const col = fg(id), W = 664, H = 640;
  const NODES = [["lead", 332, 110], ["ERP", 110, 380], ["ECOM", 258, 380], ["CRM", 406, 380], ["POS", 554, 380]];
  // robots with name bands (human 2026-09-29): the band IS the label
  const node = ([n, x, y], i) => `
  <div id="nd${i}" style="position:absolute;left:${x - 56}px;top:${y - 82}px;width:112px;height:180px;opacity:0;color:${col}">
    ${robot("nj" + i, 12, 0, 0.275, { icon: true, name: n.toUpperCase(), fill: C.ink })}</div>`;
  // comp r2 #9: the nested under-arcs read as a smiley and stopped short of the robots. ECOM<->CRM
  // is a short double arrow between the adjacent bodies; ERP<->POS a squared trace that leaves
  // each body and runs under the row. Bodies span x+-24, y+26..y+53; wheels end at y+66.
  const BY = 420, TY = 474;
  const link0 = `<path id="ac0" d="M312,${BY} L352,${BY} M322,${BY - 10} L312,${BY} L322,${BY + 10} M342,${BY - 10} L352,${BY} L342,${BY + 10}" pathLength="1" fill="none" stroke="${col}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>`;
  // robot QA r4: the posts ran through the ERP/POS grippers; they now drop from each body's
  // underside, between the wheels (body bottom y+53, wheels at x-18 and x+18)
  const link1 = `<path id="ac1" d="M110,433 V${TY} H554 V433" pathLength="1" fill="none" stroke="${col}" stroke-width="3" stroke-linejoin="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>`;
  const body = `
<div id="card" class="${panelClass(id)}" style="position:absolute;left:${colX(id)}px;top:260px;width:${W}px;height:${H}px;overflow:hidden">
  <svg style="position:absolute;left:0;top:0;overflow:visible" width="${W}" height="${H}">
    ${[1,2,3,4].map(k => `<line id="dl${k}" x1="332" y1="190" x2="${NODES[k][1]}" y2="${NODES[k][2] - 70}" pathLength="1" stroke="${col}" stroke-width="2.6" style="stroke-dasharray:1;stroke-dashoffset:1"/>`).join("")}
    ${link0}${link1}
    <circle id="dot" cx="332" cy="190" r="9" fill="${col}" opacity="0"/>
  </svg>
  ${NODES.map(node).join("")}
</div>`;
  let js = wipeUp("#card", 0.1);
  NODES.forEach((_, i) => { js += show(`#nd${i}`, 0.3 + i * 0.12, 0.25) + robotIdle(`nj${i}`, 1.0 + i * 0.2, D - 0.3, 6); });
  [1,2,3,4].forEach(k => { js += drawAll(`#dl${k}`, tPlan + (k - 1) * 0.2, 0.35); });
  js += drawAll("#ac0", tTalk, 0.45) + drawAll("#ac1", tTalk + 0.4, 0.5);
  // the dot: lead -> each teammate, then ECOM <-> CRM and ERP <-> POS, one hop at a time
  const P = i => [NODES[i][1], NODES[i][2] - 70];
  const hops = [[[332, 190], P(1)], [[332, 190], P(2)], [[332, 190], P(3)], [[332, 190], P(4)]];
  const hops2 = [[[316, BY], [348, BY]], [[348, BY], [316, BY]], [[110, TY], [554, TY]], [[554, TY], [110, TY]]];
  let t = tPlan + 0.2, k = 0, first = true;
  js += show("#dot", t - 0.1, 0.1);
  while (t + 0.7 < D - 0.3) {
    const set = t < tTalk + 0.6 ? hops : hops2; const [[x0, y0], [x1, y1]] = set[k % 4];
    js += `tl.fromTo("#dot",{attr:{cx:${x0},cy:${y0}}},{attr:{cx:${x1},cy:${y1}},duration:0.6,ease:"power1.inOut",immediateRender:${first}},${f3(t)});\n`;
    // the path carrying the message is the one accent element while it carries it
    const path = set === hops ? `#dl${(k % 4) + 1}` : `#ac${k % 4 < 2 ? 0 : 1}`;
    js += `tl.fromTo("${path}",{stroke:"${col}"},{stroke:"${C.accent}",duration:0.1,immediateRender:false},${f3(t)});\n`;
    js += `tl.fromTo("${path}",{stroke:"${C.accent}"},{stroke:"${col}",duration:0.1,immediateRender:false},${f3(t + 0.6)});\n`;
    t += 0.75; k++; first = false;
  }
  js += wipeDown("#card", exitAt(D));
  emit(id, D, body, js);
}

// ============================================================== g12 stat stack
// Numbers as spoken; 149 confirmed on screen (OCR 528.8: "149 (118 generic, 31 singular").
// Two columns so every numeral keeps the 160px stat floor inside the left column.
if (want("g12")) {
  const id = "g12", D = dur(id), c = p => cueRel(id, p);
  const R = [["5", "teammates", c("five")], ["8", "sources", c("eight")], ["5", "intermediate models", cueIn(id, "five intermediate")],
             ["6", "marts", c("six")], ["149", "tests", c("149")]];
  const POS = [[40, 70], [340, 70], [40, 270], [340, 270], [40, 470]];
  const body = `
<div id="card" class="${panelClass(id)}" style="position:absolute;left:${colX(id)}px;top:110px;width:664px;height:680px;overflow:hidden">
  <div class="capt eyebrow muted" style="position:absolute;left:40px;top:28px;font-size:24px">What the team built</div>
  ${R.map(([v, l], i) => `
  <div id="s${i}" style="position:absolute;left:${POS[i][0]}px;top:${POS[i][1]}px;width:${i === 4 ? 560 : 280}px;height:196px;opacity:0">
    <div id="n${i}" class="disp" style="position:absolute;left:0;top:0;font-size:160px;line-height:0.9">0</div>
    <div class="capt muted" style="position:absolute;left:${i === 4 ? 300 : 112}px;top:62px;width:${i === 4 ? 240 : 160}px;font-size:26px;line-height:1.2">${l}</div>
  </div>`).join("")}
  <div id="u4" class="accentbar" style="position:absolute;left:44px;top:630px;width:270px;height:5px"></div>
</div>`;
  let js = wipeUp("#card", Math.max(0.1, R[0][2] - 0.6));  // comp r2 #13: enter with the first row, not 2.6s ahead of it
  R.forEach(([v], i) => { const t = R[i][2]; js += show(`#s${i}`, t - 0.5, 0.2) + countUp(`#n${i}`, 0, +v, t - 0.5, 0.55); });
  js += ruleIn("#u4", R[4][2] + 0.2);
  js += wipeDown("#card", exitAt(D));
  emit(id, D, body, js);
}

// ============================================================== g13 the /usage figures
// Human 2026-09-29: show both, honestly. Every figure from the /usage frame (OCR ~597):
// Total cost $4.56, Total duration (API) 11m 7s, Total duration (wall) 20m 34s. The card
// sits BELOW the real panel (top-left) so the evidence stays visible beside it.
if (want("g13")) {
  const id = "g13", D = dur(id), c = p => cueRel(id, p);
  const tCost = c("$4.56"), tApi = c("11"), tSingle = cueIn(id, "single agent");
  const body = `
<div id="card" class="${panelClass(id)}" style="position:absolute;left:${colX(id)}px;top:280px;width:664px;height:600px;overflow:hidden">
  <div class="capt eyebrow muted" style="position:absolute;left:40px;top:28px;font-size:24px">/usage · the agent team</div>
  <div id="cost" class="disp" style="position:absolute;left:36px;top:84px;font-size:160px;line-height:0.9">$0.00</div>
  <div id="api" style="position:absolute;left:40px;top:250px;width:590px;height:60px;opacity:0">
    <div class="capt muted" style="position:absolute;left:0;top:14px;font-size:28px">API time</div>
    <div class="disp" style="position:absolute;left:200px;top:0;font-size:48px;font-variation-settings:'wght' 700">11m 7s</div></div>
  <div id="wall" style="position:absolute;left:40px;top:318px;width:590px;height:70px;opacity:0">
    <div class="capt muted" style="position:absolute;left:0;top:14px;font-size:28px">wall time</div>
    <div class="disp" style="position:absolute;left:200px;top:0;font-size:48px;font-variation-settings:'wght' 700">20m 34s</div>
    <div id="wu" class="accentbar" style="position:absolute;left:200px;top:62px;width:190px;height:5px"></div></div>
  <div id="dv" style="position:absolute;left:40px;top:420px;width:584px;height:2px;background:${C.bg}33"></div>
  <div id="one" style="position:absolute;left:40px;top:444px;width:590px;height:120px;opacity:0">
    <div class="capt muted" style="position:absolute;left:0;top:0;font-size:24px">single agent, episode 4</div>
    <div class="disp" style="position:absolute;left:0;top:36px;font-size:48px;font-variation-settings:'wght' 700">~20 min wall</div></div>
</div>`;
  let js = wipeUp("#card", Math.max(0, tCost - 0.3));
  js += countUp("#cost", 0, 4.56, Math.max(0.1, tCost - 0.3), 0.8, 2, "$");
  js += show("#api", tApi, 0.3, "y:8|y:0") + show("#wall", tApi + 0.4, 0.3, "y:8|y:0") + ruleIn("#wu", tApi + 0.7);
  js += `tl.fromTo("#dv",{scaleX:0,transformOrigin:"left center"},{scaleX:1,duration:0.4},${f3(tSingle - 0.2)});\n`;
  js += show("#one", tSingle, 0.35, "y:8|y:0");
  js += wipeDown("#card", exitAt(D));
  emit(id, D, body, js);
}

// ============================================================== g15 strike-list
// Right column: the inset sits bottom-left here (demo-spec reposition 757-925).
if (want("g15")) {
  const id = "g15", D = dur(id), c = p => cueRel(id, p);
  const R = [["English", c("english"), false], ["a new invented language", c("invented"), true],
             ["binary", c("binary"), true], ["tokens", c("tokens"), true]];
  const body = `
<div id="card" class="${panelClass(id)}" style="position:absolute;left:${colX(id)}px;top:160px;width:664px;height:470px">
  <div class="capt eyebrow" style="position:absolute;left:40px;top:30px;font-size:24px">How the agents talk</div>
  <div id="hr" class="accentbar" style="position:absolute;left:40px;top:70px;width:240px;height:4px"></div>
  ${R.map(([w, , strike], i) => `
  <div id="r${i}" style="position:absolute;left:40px;top:${100 + i * 88}px;width:584px;height:80px">
    <div id="w${i}" class="disp" style="position:absolute;left:0;top:10px;font-size:40px;font-variation-settings:'wght' 700;white-space:nowrap">${strike ? struck(`k${i}`, w, "#B9B2A8") : w}</div>
    ${strike ? ""
             : `<svg style="position:absolute;left:170px;top:14px;overflow:visible" width="50" height="50"><path id="tk" d="M4,24 L18,38 L44,8" pathLength="1" fill="none" stroke="${fg(id)}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray:1;stroke-dashoffset:1"/></svg>`}
  </div>`).join("")}
</div>`;
  let js = wipeUp("#card", Math.max(0, R[0][1] - 0.3)) + ruleIn("#hr", R[0][1]);
  R.forEach(([, t, strike], i) => {
    js += `tl.fromTo("#r${i}",{clipPath:"inset(100% 0 0 0)"},{clipPath:"inset(0% 0 -10px 0)",duration:0.35,ease:"power3.out"},${f3(t)});\n`;
    js += strike ? strikeIn(`k${i}`, t + 0.3) : drawAll("#tk", t + 0.3, 0.3);
  });
  js += wipeDown("#card", exitAt(D));
  emit(id, D, body, js);
}

// ============================================================== gB the aha moment
// Human addition 6. Five jars in a ring pass message dots; a bulb draws on "watching agents
// communicate" and LIGHTS on "aha" (its fill is the one $accent element). Right column
// (inset bottom-left here). 22s: the dots never stop.
if (want("gB")) {
  const id = "gB", D = dur(id), c = p => cueRel(id, p);
  const tCol = c("collaborate,"), tWatch = c("watching"), tAha = c("aha");
  const col = fg(id), CX = 332, CY = 360, RR = 190;
  const P = [...Array(5).keys()].map(k => { const a = -Math.PI / 2 + k * 2 * Math.PI / 5; return [CX + RR * Math.cos(a), CY + 40 + RR * 0.8 * Math.sin(a) - (k === 0 ? 30 : 0)]; });
  // Robot QA 2026-09-29 (F7): LEAD sits 30px higher and the bulb 20px lower with shorter rays, so
  // the rays no longer cross LEAD's lowered forearms (they read as extra limbs)
  const body = `
<div id="card" class="${panelClass(id)}" style="position:absolute;left:${colX(id)}px;top:120px;width:664px;height:780px;overflow:hidden">
  <div class="capt eyebrow muted" style="position:absolute;left:40px;top:28px;font-size:24px">The aha moment!</div>
  <svg style="position:absolute;left:0;top:0;overflow:visible" width="664" height="780">
    ${P.map(([x, y], i) => P.map(([x2, y2], j) => j > i ? `<line x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${x2.toFixed(0)}" y2="${y2.toFixed(0)}" stroke="${col}" stroke-opacity=".25" stroke-width="2"/>` : "").join("")).join("")}
    <g id="bulb" transform="translate(${CX},${CY + 40})">
      <path id="bg0" d="M0,-70 C-44,-70 -60,-36 -54,-8 C-48,18 -26,26 -24,50 L24,50 C26,26 48,18 54,-8 C60,-36 44,-70 0,-70 Z" pathLength="1" fill="${C.accent}" fill-opacity="0" stroke="${col}" stroke-width="4" style="stroke-dasharray:1;stroke-dashoffset:1"/>
      <path id="bg1" d="M-20,62 L20,62 M-16,74 L16,74 M-12,86 L12,86" pathLength="1" fill="none" stroke="${col}" stroke-width="4" stroke-linecap="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>
      <path id="bg2" d="M-12,48 L-12,6 L-4,-8 L4,6 L12,-8 L12,48" pathLength="1" fill="none" stroke="${col}" stroke-width="3" style="stroke-dasharray:1;stroke-dashoffset:1"/>
      ${[0,1,2,3,4,5,6].map(k => { const a = Math.PI + k * Math.PI / 6; return `<line id="br${k}" x1="${(Math.cos(a) * 70).toFixed(1)}" y1="${(-20 + Math.sin(a) * 70).toFixed(1)}" x2="${(Math.cos(a) * 90).toFixed(1)}" y2="${(-20 + Math.sin(a) * 90).toFixed(1)}" pathLength="1" stroke="${col}" stroke-width="4" stroke-linecap="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>`; }).join("")}
    </g>
    ${[0,1,2].map(k => `<circle id="md${k}" cx="${P[0][0]}" cy="${P[0][1]}" r="8" fill="${col}" opacity="0"/>`).join("")}
  </svg>
  ${P.map(([x, y], i) => `<div style="position:absolute;left:0;top:0;color:${col}">${robot("aj" + i, x - 40, y - 80, 0.25, { icon: true, name: ["LEAD", "ERP", "ECOM", "CRM", "POS"][i], fill: C.ink })}</div>`).join("")}
</div>`;
  let js = wipeUp("#card", 0.1);
  // idle, paused for the arms-up on "aha" (overlapping tweens on the same arm), then idle again
  P.forEach((_, i) => { js += robotIdle(`aj${i}`, 0.4 + i * 0.15, tAha - 0.2, 6)
                           + robotIdle(`aj${i}`, tAha + 2.1 + i * 0.05, D - 0.3, 6); });
  // on "aha" every robot throws both arms up, once
  P.forEach((_, i) => { ["L", "R"].forEach(k => {
    // F7: at a=120 the upper arm lay across the glass and vanished into the jar's outline. This
    // pose (searched: elbow outside the jar, gripper highest) raises the arms BESIDE the head.
    const UP = k === "L" ? { a: 60, b: 145 } : { a: -60, b: -145 };   // r6: upper arm passes UNDER the jar's corner, not through it   // r5: forearm ~40 units clear of the glass (was 2-5 px at 4K)
    js += robotArm(`aj${i}`, k, { a: 0, b: 0 }, UP, tAha + 0.1 + i * 0.05, 0.35);
    js += robotArm(`aj${i}`, k, UP, { a: 0, b: 0 }, tAha + 1.4 + i * 0.05, 0.5); }); });
  // three dots hop between random-looking but FIXED pairs, one tween at a time per dot
  const PAIRS = [[0, 2], [2, 4], [4, 1], [1, 3], [3, 0], [0, 4], [4, 2], [2, 1], [1, 0], [0, 3], [3, 2], [2, 0]];
  [0,1,2].forEach(d => {
    js += show(`#md${d}`, tCol + d * 0.25, 0.15);
    let t = tCol + d * 0.25, k = d * 4, first = true;
    while (t + 0.8 < D - 0.3) {
      const [a, b] = PAIRS[k % PAIRS.length], [x0, y0] = P[a], [x1, y1] = P[b];
      js += `tl.fromTo("#md${d}",{attr:{cx:${x0.toFixed(0)},cy:${y0.toFixed(0)}}},{attr:{cx:${x1.toFixed(0)},cy:${y1.toFixed(0)}},duration:0.7,ease:"power1.inOut",immediateRender:${first}},${f3(t)});\n`;
      t += 0.8; k++; first = false;
    }
  });
  js += drawAll("#bg0", tWatch, 0.6) + drawAll("#bg1", tWatch + 0.4, 0.4) + drawAll("#bg2", tWatch + 0.6, 0.5);
  js += `tl.fromTo("#bg0",{fillOpacity:0},{fillOpacity:0.95,duration:0.35,ease:"power2.out"},${f3(tAha)});\n`;
  [0,1,2,3,4,5,6].forEach(k => { js += drawAll(`#br${k}`, tAha + 0.15 + k * 0.04, 0.25); });
  js += `tl.fromTo("#bulb",{scale:1,svgOrigin:"${CX} ${CY + 30}"},{scale:1.08,svgOrigin:"${CX} ${CY + 30}",duration:0.25,yoyo:true,repeat:1},${f3(tAha)});\n`;
  js += wipeDown("#card", exitAt(D));
  emit(id, D, body, js);
}

// g19 (the 170px 'To what use?' verdict card) removed 2026-09-30 at the human's request:
// vestigial; g21's use-case list carries the question and answers it.

// ============================================================== g20 Am I still relevant?
if (want("g20")) {
  const id = "g20", D = dur(id);
  const t0 = cueIn(id, "am i still", "start"), tAns = cueIn(id, "is still relevant.", "start");
  const body = `
<div id="card" class="${panelClass(id)}" style="position:absolute;left:${LEFT_X0}px;top:170px;width:704px;height:580px">
  <div class="capt eyebrow muted" style="position:absolute;left:32px;top:28px;font-size:26px">The series question</div>
  <div id="l1" class="disp" style="position:absolute;left:30px;top:80px;font-size:120px;line-height:0.95;white-space:nowrap">Am I still</div>
  <div id="l2" class="disp" style="position:absolute;left:30px;top:204px;font-size:120px;line-height:0.95;white-space:nowrap">relevant?</div>
  <div id="rl" class="accentbar" style="position:absolute;left:34px;top:348px;width:300px;height:5px"></div>
  <div id="ans" class="med" style="position:absolute;left:34px;top:376px;width:600px;font-size:34px;line-height:1.3;color:${C.muted}">“that years of building data pipeline … is still relevant.”</div>
</div>`;
  // the panel is already there on frame 0 (g19's box): only the content arrives
  // frame 0 matches g19's 704x580 box; it then fits its content and grows for the answer
  let js = `tl.fromTo("#card",{opacity:1,height:580},{opacity:1,height:370,duration:0.4,ease:"power2.inOut"},0.2);\n`;
  js += `tl.fromTo("#card",{height:370},{height:520,duration:0.35,ease:"power3.out",immediateRender:false},${f3(tAns - 0.15)});\n`;
  js += `tl.fromTo(["#l1","#l2"],{clipPath:"inset(-40px 100% -60px 0)"},{clipPath:"inset(-40px 100% -60px 0)",duration:0.05},0);\n`;
  js += wipeIn("#l1", Math.max(0.05, t0 - 0.05), 0.35) + wipeIn("#l2", t0 + 0.3, 0.35) + ruleIn("#rl", t0 + 0.7);
  js += show("#ans", tAns, 0.4, "y:8|y:0");
  js += wipeDown("#card", exitAt(D));
  emit(id, D, body, js);
}

// ============================================================== g21 the answer: use cases
// Header is the verdict again, so the answer sits under the question. Revised after the
// composition review (finding 11): real jars-with-limbs as the team icon (the rounded
// squares read as unticked checkboxes), the two numbers as 56px count-ups in the row's right
// column, and the panel GROWS with its rows instead of sitting 70% empty. ~137s over the
// face: the active row's marker pulses and a message dot runs between its three jars.
if (want("g21")) {
  const id = "g21", D = dur(id), c = p => cueRel(id, p);
  const tM = c("migrations."), tPct = c("60"), tN = cueIn(id, "second use case"), tPl = c("10,000"), tT = cueIn(id, "time to value");
  const R = [["Migrations", "time-bound; prevent burnout", tM, ["60-80%", "code completion"]],
             ["Niche skills", "the talent you cannot hire", tN, ["10,000", "PL/SQL files"]],
             ["Time to value", "mission-critical", tT, null]];
  // comp r2 #11: icons at ~84px (0.15), not ~55px; the message is a hollow ring above the heads
  // r13 (human 2026-09-30): the rows read crowded; more air between them and a hairline divider
  const ROWH = 226, TOP = 146, H = n => TOP + n * ROWH + 16;
  const JX = [410, 476, 542], RT = st => st ? 118 : 70, RS = 0.15;
  const body = `
<div id="card" class="${panelClass(id)}" style="position:absolute;left:${LEFT_X0}px;top:130px;width:664px;height:${H(0)}px;overflow:hidden">
  <div class="disp" style="position:absolute;left:32px;top:28px;font-size:72px;line-height:1.1;white-space:nowrap">To what use?</div>
  <div id="hr" class="accentbar" style="position:absolute;left:36px;top:118px;width:240px;height:5px"></div>
  ${R.map(([h, sub, , st], i) => `
  <div id="r${i}" style="position:absolute;left:32px;top:${TOP + i * ROWH}px;width:600px;height:${ROWH - 30}px">
    ${i ? `<div style="position:absolute;left:4px;top:-14px;width:592px;height:2px;background:${C.rule}"></div>` : ""}
    <div id="dt${i}" style="position:absolute;left:4px;top:24px;width:14px;height:14px;border-radius:7px;background:${C.ink}"></div>
    <div class="disp" style="position:absolute;left:30px;top:0;font-size:52px;font-variation-settings:'wght' 800;white-space:nowrap">${h}</div>
    <div class="med muted" style="position:absolute;left:32px;top:72px;width:300px;font-size:26px;line-height:1.25">${sub}</div>
    ${st ? `<div id="sv${i}" class="disp" style="position:absolute;left:350px;top:0;font-size:56px;line-height:1.1;white-space:nowrap;opacity:0">${i === 0 ? `<span id="pa">0</span>-<span id="pb">0</span>%` : "0"}</div>
            <div id="sl${i}" class="capt muted" style="position:absolute;left:352px;top:66px;font-size:22px;white-space:nowrap;opacity:0">${st[1]}</div>` : ""}
    ${JX.map(x => `<div style="position:absolute;left:0;top:0;color:${C.ink}">${robot(`rj${i}_${x}`, x - 24, RT(st), RS, { icon: true })}</div>`).join("")}
  </div>`).join("")}
</div>`;
  let js = wipeUp("#card", 0.1) + ruleIn("#hr", 0.5);
  R.forEach(([, , t, st], i) => {
    js += `tl.fromTo("#card",{height:${H(i)}},{height:${H(i + 1)},duration:0.35,ease:"power3.out",immediateRender:${i === 0}},${f3(t - 0.1)});\n`;
    js += `tl.fromTo("#r${i}",{clipPath:"inset(100% -40px -16px -16px)"},{clipPath:"inset(-16px -40px -16px -16px)",duration:0.35,ease:"power3.out"},${f3(t)});\n`;
    // Robot QA 2026-09-29 (F6): they appeared in place (headless for a frame under the row's
    // bottom-up reveal), then jostled 30px and touched. Now they wait past the card's right edge
    // and roll in once the row is revealed, the leftmost first so the gaps only open up.
    const ROFF = 260;
    js += JX.map((x, q) => `tl.fromTo("#rj${i}_${x}",{x:${ROFF}},{x:${ROFF},duration:0.01,immediateRender:true},0);\n`
      + robotRoll(`rj${i}_${x}`, ROFF, 0, t + 0.4 + q * 0.12, 0.8, RS, "power2.out")).join("");
    const tEnd = i < 2 ? R[i + 1][2] : D - 0.4;
    const n = Math.max(1, Math.floor((tEnd - t - 0.5) / 1.2));
    js += `tl.fromTo("#dt${i}",{scale:1},{scale:1.6,duration:0.6,yoyo:true,repeat:${n * 2 - 1},ease:"sine.inOut"},${f3(t + 0.4)});\n`;
    // robot QA r5: the travelling ring read as a stray object; the robots alone carry the row
  });
  // the two numbers count up ON their words (style: numbers count up, never appear)
  js += show(["#sv0", "#sl0"], tPct - 0.5, 0.2) + countUp("#pa", 0, 60, tPct - 0.5, 0.8) + countUp("#pb", 0, 80, tPct - 0.5, 0.8);
  js += show(["#sv1", "#sl1"], tPl - 0.6, 0.2) + countUp("#sv1", 0, 10000, tPl - 0.6, 0.8);
  js += wipeDown("#card", exitAt(D, 0.25), 0.25);   // g23 wipes up from its first frame
  emit(id, D, body, js);
}

// ============================================================== g23 end card
// tech-video-editor anatomy: overlay beside the face, x 96 -> 680, rows accumulate and
// hold to the last frame. Channels from brand.md links. Only LinkedIn is cued ("connect",
// 'do connect to me on one of the various channels'); every other row takes noCueFallback
// and lands with it, 0.4s apart. The panel enters on "details on the screen right here".
if (want("g23")) {
  const id = "g23", D = dur(id), c = p => cueRel(id, p);
  const brand = JSON.parse(readFileSync("../../../brand.md", "utf8").match(/```json\s*(\{[\s\S]*\})\s*```/)[1]);
  const links = brand.links.filter(l => l.id);
  const tDet = Math.max(0, c("details")), tCon = c("connect");
  // the first row (the channel itself) lands with the card; the rest on "connect", 0.4s apart
  const T = links.map((l, i) => i === 0 ? 0.25 : tCon + (i - 1) * 0.4);
  const PAD = 28, INNER = 680 - 96 - 2 * PAD, WIDEST = 519;
  if (WIDEST > INNER) throw new Error(`g23: widest value ${WIDEST}px exceeds ${INNER}px`);
  const RH = 100, TOP = 150, HEAD = 70, H = n => HEAD + n * RH + 24;
  const body = `
<div id="card" class="${panelClass(id)}" style="position:absolute;left:96px;top:${TOP}px;width:584px;height:${H(0)}px;overflow:hidden">
  <div class="capt eyebrow muted" style="position:absolute;left:${PAD}px;top:28px;font-size:20px">${brand.channel.name}</div>
  ${links.map((l, i) => `
  <div id="e${i}" style="position:absolute;left:${PAD}px;top:${HEAD + i * RH}px;width:${INNER}px;height:${RH - 4}px">
    <div class="med muted" style="position:absolute;left:0;top:2px;font-size:32px">${l.label}</div>
    <div class="disp" style="position:absolute;left:0;top:42px;font-size:36px;font-variation-settings:'wght' 700;white-space:nowrap">${l.value}</div>
    ${i === 0 ? `<div id="ar" class="accentbar" style="position:absolute;left:0;top:${RH - 10}px;width:220px;height:3px"></div>` : ""}
  </div>`).join("")}
</div>`;
  let js = wipeUp("#card", 0, 0.3);
  links.forEach((_, i) => {
    js += `tl.fromTo("#card",{height:${H(i)}},{height:${H(i + 1)},duration:0.35,ease:"power3.out",immediateRender:${i === 0}},${f3(T[i])});\n`;
    js += `tl.fromTo("#e${i}",{clipPath:"inset(100% 0 0 0)"},{clipPath:"inset(0% 0 0 0)",duration:0.35,ease:"power3.out"},${f3(T[i])});\n`;
  });
  js += ruleIn("#ar", T[0] + 0.3);
  js += `tl.fromTo("#card",{opacity:1},{opacity:1,duration:0.2},${f3(D - 0.2)});\n`;
  emit(id, D, body, js);
}
