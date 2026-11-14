// g05 + g05x: the same brain in a jar, now the centre of a construction site. ONE scene on one beat
// clock (seconds from g05's start), split across two parts (plan 2026-10-28, human-reviewed hybrid):
//   g05  (card, HERO)       guardrails  a rail with four posts draws along the jar's ground, behind it
//                           connectors  cables run out of the jar; on "databases" three cylinders land
//                                       on the cables' ends and dots start running along them
//   g05x (takeover, g05x.mjs, match-cut from this card's rect)
//                           retrieval   an index-card file draws on the left with two arrows into the jar
//                           vector      a scatter of dots lands on its front card
//                           context     the accent pipe (the one accent) runs from the file over the top
//                                       into the lid; the liquid level rises; paper dots flow down it
//                           chore       the engineer walks to stand in front of a two-legged bench,
//                                       turns, and sits down on it
// A small stick-figure engineer in a hard hat walks between the pieces on the front ground line,
// carrying a claw hammer (one stroke per 0.6s when he works), never at the data and never overlapping the
// fence or the jar.
//
// sceneOf(ID, D, { shift, open, frozen }) builds the scene for a part that starts `shift` seconds into
// the beat. Anything that finished before the part starts is emitted as ONE static end state per
// property at t=0 (so nothing replays and no tweens overlap); anything after the part's end is
// dropped. frozen: only those static states (g05x's match-cut carry = g05's last frame).
import { C, emit, frames, panelClass, fg, dim, wipeUp, brainInJar, DATABASE } from "../lib.mjs";
import { EYEBROW, exitIfFree, HERO, f3, planPart } from "../common.mjs";

const ID = "g05";
const BEAT0 = planPart("g05").start;
const beatCue = (id, k) => { const p = planPart(id); if (!(k in p.cues)) throw new Error(`${id}: no cue ${k}`); return +(p.cues[k] - BEAT0).toFixed(3); };

export function sceneOf(ID, D, { shift = 0, open = 0.2, frozen = false } = {}) {
  const tGu = beatCue("g05", "guardrails"), tCo = beatCue("g05", "connectors"), tDb = beatCue("g05", "databases"),
        tRe = beatCue("g05x", "retrieval"), tVe = beatCue("g05x", "vector"), tCx = beatCue("g05x", "context"), tCh = beatCue("g05x", "chore");
  const F = fg("g05"), M = dim("g05");
  const s = (w = 3) => `fill="none" stroke="${F}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
  // drawn-on strokes take butt caps: a round cap renders as a dot before the draw starts
  const sb = (w = 3) => s(w).replace("round", "butt");

  // ---- the beat clock -> this part's timeline
  const statics = new Map();                       // sel -> merged end state for tweens already finished
  let js = "";
  const J = v => JSON.stringify(v);
  const tw = (sel, from, to, t, d, ease = "power2.out", extra = "") => {
    const tp = +(t - shift).toFixed(3);
    if (tp + d <= 0.001) { statics.set(sel, { ...(statics.get(sel) || {}), ...to }); return; }
    if (frozen || tp >= D) return;
    if (tp < 0) throw new Error(`${ID}: a tween on ${sel} straddles the part start (${t})`);
    js += `tl.fromTo(${J(sel)},${J(from)},${J({ ...to, duration: +f3(d), ease }).slice(0, -1)}${extra}},${f3(tp)});\n`;
  };
  const draw = (sel, t, d = 0.5) => tw(sel, { strokeDashoffset: 1 }, { strokeDashoffset: 0 }, t, d);
  const appear = (sel, t, d = 0.3, from = {}, to = {}) => tw(sel, { opacity: 0, ...from }, { opacity: 1, ...to }, t, d);
  // a seamless loop of `prop` from a to b every `per` seconds, started at beat time t0; phase-correct
  // when the part starts mid-loop (and as a static at the cut frame when frozen)
  const lp = (sel, prop, a, b, t0, per) => {
    const tp = t0 - shift, end = D;
    if (tp >= end) return;
    const ph = tp < 0 ? ((-tp) / per) % 1 : 0, v = a + (b - a) * ph;
    if (frozen) { if (tp < 0) statics.set(sel, { ...(statics.get(sel) || {}), [prop]: +v.toFixed(3) }); return; }
    let t = Math.max(0, tp);
    if (ph > 0) { js += `tl.fromTo(${J(sel)},{${prop}:${v.toFixed(3)}},{${prop}:${b},duration:${f3((1 - ph) * per)},ease:"none",immediateRender:true},0);\n`; t += (1 - ph) * per; }
    const n = Math.floor((end - t) / per);
    if (n >= 1) js += `tl.fromTo(${J(sel)},{${prop}:${a}},{${prop}:${b},duration:${f3(per)},ease:"none",repeat:${n - 1},immediateRender:false},${f3(t)});\n`;
  };

  // ---- jar at 0.6 in the centre: glass x 214-366, lid top y 124, glass bottom y 346
  const JS = 0.6, JL = 194, JT = 120;
  const jar = brainInJar(`${ID}-j`, JL, JT, JS);
  // a paper silhouette of the glass between the fence and the jar, so the rail passes BEHIND it
  const glassFill = `<svg style="position:absolute;left:${JL}px;top:${JT}px;overflow:visible" width="${320 * JS}" height="${400 * JS}" viewBox="0 0 320 400">
      <path d="M90,48 L90,72 C50,88 34,122 34,172 L34,318 C34,354 60,376 98,376 L222,376 C260,376 286,354 286,318 L286,172 C286,122 270,88 230,72 L230,48 Z" fill="${C.bg}"/></svg>`;
  // ---- the fence: ONE continuous rail on four posts along the jar's ground line, running behind the
  // jar and out past it on both sides. The engineer's bench stands on the FRONT ground line.
  const JG = 348, FG = 474, RAIL = 306;
  const FPOST = [146, 190, 390, 434];
  const fence = `<path id="${ID}-jg" class="dr" pathLength="1" d="M120,${JG} H460" ${sb(3)}/>
    <path id="${ID}-rl" class="dr" pathLength="1" d="M128,${RAIL} H452" ${sb(4)}/>
    ${FPOST.map(x => `<path class="dr ${ID}-fp" pathLength="1" d="M${x},${JG} V${RAIL - 14}" ${sb(5)}/>`).join("")}`;
  // two-legged bench, front ground plane, right
  const BX0 = 488, BX1 = 568, BSEAT = 444, BLEG = [500, 556];
  const ground = `<path id="${ID}-fg" class="dr" pathLength="1" d="M14,${FG} H566" stroke="${M}" stroke-width="2.5" fill="none" stroke-linecap="butt"/>`;
  const bench = `<g id="${ID}-bench">${BLEG.map(x => `<path class="dr" pathLength="1" d="M${x},${BSEAT} V${FG}" ${sb(4)}/>`).join("")}
    <path class="dr" pathLength="1" d="M${BX0},${BSEAT} H${BX1}" ${sb(6)}/></g>`;
  // ---- cables to three databases on the right; each cable ends ON its cylinder's left edge
  // (DATABASE's body edge is x 10 of its 130-wide viewBox: 5px into the 62px box)
  const DBP = [[488, 64], [502, 170], [488, 276]], DBW = 62, DBH = 66, EDGE = Math.round(10 / 130 * DBW);
  const cab = DBP.map(([x, y], i) => `M366,${196 + i * 22} C${420},${196 + i * 22} ${x - 36},${y + DBH / 2} ${x + EDGE},${y + DBH / 2}`);
  const cables = cab.map((d, i) => `<path id="${ID}-c${i}" class="dr" pathLength="1" d="${d}" ${sb(3)}/>`).join("");
  const cflow = `<g id="${ID}-cf" opacity="0">${cab.map(d => `<path class="${ID}-fl" d="${d}" fill="none" stroke="${F}" stroke-width="6" stroke-linecap="round" stroke-dasharray="0 18"/>`).join("")}</g>`;
  const dbs = DBP.map(([x, y], i) => `<div id="${ID}-db${i}" style="position:absolute;left:${x}px;top:${y}px;width:${DBW}px;height:${DBH}px;color:${F};opacity:0">${DATABASE(`${ID}-dbs${i}`).replace('viewBox="0 0 130 140"', `viewBox="0 0 130 140" width="${DBW}" height="${DBH}"`)}</div>`).join("");
  // ---- the index-card file on the left: a box with an inset front, a label holder and a pull
  // handle; two cards stand out of it with tabs; the vector scatter lands on the front card
  const DX0 = 24, DX1 = 152, DY0 = 214, DY1 = 290;
  const drawer = `<g id="${ID}-dr">
      <path class="dr" pathLength="1" d="M44,${DY0} V150 H104 V142 H128 V150 H148 V${DY0}" ${sb(2.5)}/>
      <path d="M36,${DY0} V160 H50 V152 H74 V160 H140 V${DY0} Z" fill="${C.bg}" stroke="none" id="${ID}-cardfill" opacity="0"/>
      <path class="dr" pathLength="1" d="M36,${DY0} V160 H50 V152 H74 V160 H140 V${DY0}" ${sb(3)}/>
      <path class="dr" pathLength="1" d="M${DX0},${DY0} H${DX1} V${DY1} H${DX0} Z" ${sb(3.5)}/>
      <path class="dr" pathLength="1" d="M${DX0 + 10},${DY0 + 9} H${DX1 - 10} V${DY1 - 9} H${DX0 + 10} Z" ${sb(2.2)}/>
      <path class="dr" pathLength="1" d="M70,${DY0 + 30} H106 V${DY0 + 44} H70 Z" ${sb(2.2)}/>
      <path class="dr" pathLength="1" d="M72,${DY1 - 30} V${DY1 - 22} H104 V${DY1 - 30}" ${sb(4)}/>
      <path class="dr" pathLength="1" d="M158,240 H200 M190,232 L200,240 L190,248 M158,266 H200 M190,258 L200,266 L190,274" ${sb(3)}/></g>`;
  const r = [[50, 172], [62, 184], [56, 198], [76, 170], [86, 190], [72, 204], [98, 176], [106, 198], [118, 172], [126, 188], [114, 206], [48, 206], [92, 206], [130, 202]];
  const vec = r.map(([x, y], i) => `<circle id="${ID}-v${i}" cx="${x}" cy="${y}" r="4" fill="${F}" opacity="0"/>`).join("");
  // ---- the context pipe, file to lid: the one accent
  const PIPE = `M116,140 V74 H290 V122`;
  const pipe = `<path id="${ID}-pp" class="dr" pathLength="1" d="${PIPE}" fill="none" stroke="${C.accent}" stroke-width="9" stroke-linecap="butt" stroke-linejoin="round"/>
    <path id="${ID}-pf" d="${PIPE}" fill="none" stroke="${C.bg}" stroke-width="4" stroke-linecap="round" stroke-dasharray="0 16" opacity="0"/>`;

  // ---- the engineer: side view, 64x92 box, feet on y 88; faces right at scaleX 1. The far leg and
  // far arm are $muted so the two legs read as two through every stride.
  const HIP = [30, 52], KNEE = [30, 70], SH = [30, 28];
  const ES = 1.3, ETOP = Math.round(FG - 2 - 88 * ES), EW = Math.round(64 * ES);
  // the claw hammer (the human, 2026-10-28: the spanner read as a protractor). Rigged in the arm's own
  // frame, arm straight forward at rotation 0, rotated about the shoulder (review 2026-10-28: the old
  // rest pose held it up by the head, so every stroke swung sideways at head height and read as waving):
  //   REST  65 deg   hanging forward-down at his side (walking, standing)
  //   WIND -50 deg   above the shoulder, clear of the hard hat (at -45 with the old rig it merged)
  //   HITA 31.5 deg  the striking face lands on the top of a stake at hip height, face pointing down
  // Handle from the hand at (49,28) to the head at HT; the head is solid across the handle: the face on
  // the leading side of the strike (p_), the claw behind it, curling back toward the hand (d_ = handle).
  const REST_A = 65, WIND_A = -50, HIT_A = 31.5;
  const HT = [64, 24], d_ = [0.966, -0.258], p_ = [0.258, 0.966];
  const at = (a, b) => `${f3(HT[0] + p_[0] * a + d_[0] * b)},${f3(HT[1] + p_[1] * a + d_[1] * b)}`;
  const HAMMER = `<path d="M49,28 L${f3(HT[0] - d_[0] * 1.5)},${f3(HT[1] - d_[1] * 1.5)}" fill="none" stroke="${F}" stroke-width="4.2" stroke-linecap="round"/>
          <path d="M${at(-1, 3.4)} L${at(9, 3.4)} L${at(9, -3.4)} L${at(-1, -3.4)} Z" fill="${F}" stroke="${F}" stroke-width="1" stroke-linejoin="round"/>
          <path d="M${at(-1, 3.2)} Q${at(-7, 3)} ${at(-11, -3)} L${at(-8.6, -3.8)} Q${at(-5, -1.2)} ${at(-1, -2.6)} Z" fill="${F}" stroke="${F}" stroke-width="1" stroke-linejoin="round"/>`;
  // where the face lands at HIT_A (local, unrotated): the stake's top sits just under it
  const rotP = ([x, y], a) => { const r = a * Math.PI / 180, dx = x - SH[0], dy = y - SH[1];
    return [SH[0] + dx * Math.cos(r) - dy * Math.sin(r), SH[1] + dx * Math.sin(r) + dy * Math.cos(r)]; };
  const CP = rotP([HT[0] + p_[0] * 9, HT[1] + p_[1] * 9], HIT_A);
  const STK = { x0: CP[0] - 2.8, x1: CP[0] + 2.8, top: CP[1] + 0.8 };
  // the strike: three short $ink ticks off the contact point, sideways and up-right (the handle comes
  // in from the upper left)
  const HIT = [[-165, 4, 9], [-15, 4, 9], [-50, 4.5, 9.5]].map(([ang, r0, r1]) => { const a = ang * Math.PI / 180;
    return `<path d="M${f3(CP[0] + Math.cos(a) * r0)},${f3(CP[1] + Math.sin(a) * r0)} L${f3(CP[0] + Math.cos(a) * r1)},${f3(CP[1] + Math.sin(a) * r1)}" fill="none" stroke="${C.ink}" stroke-width="2.2" stroke-linecap="round"/>`; }).join("");
  const leg = (k, col) => `<g id="${ID}-leg${k}"><path d="M30,52 L30,70" ${s(3)} stroke="${col}"/><g id="${ID}-shin${k}"><path d="M30,70 L30,88 L37,88" ${s(3)} stroke="${col}"/></g></g>`;
  const ENG = `<div id="${ID}-e" style="position:absolute;left:0;top:${ETOP}px;width:${EW}px;height:${Math.round(92 * ES)}px;opacity:0">
      <div id="${ID}-ef" style="position:absolute;left:0;top:0;width:${EW}px;height:${Math.round(92 * ES)}px">
      <svg style="position:absolute;left:0;top:0;overflow:visible" width="${EW}" height="${Math.round(92 * ES)}" viewBox="0 0 64 92">
        ${leg("B", M)}
        <path d="M30,28 L24,46" ${s(3)} stroke="${M}"/>
        <path d="M30,20 L30,52" ${s(3)}/>
        <circle cx="30" cy="12" r="7.5" fill="${C.bg}" ${s(3).replace('fill="none" ', "")}/>
        <path d="M20.5,10 Q20.5,1 30,1 Q39.5,1 39.5,10 Z M18.5,10 H46" fill="${F}" stroke="${F}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
        <!-- hard hat (review 2026-10-28 #7): domed shell, centre ridge, short back brim and a front peak -->
        <path d="M26.5,1.6 Q30,-2.6 33.5,1.6" fill="none" stroke="${F}" stroke-width="2.4" stroke-linecap="round"/>
        ${leg("A", F)}
        <g id="${ID}-arm"><path d="M30,28 L49,28" ${s(3)}/><g id="${ID}-hm">${HAMMER}</g></g>
        <g id="${ID}-hit" opacity="0">${HIT}</g>
      </svg></div></div>`;

  // the hammer laid on the bench's free right end when he sits (scene px; head upright, claw up-right)
  const LAID = `<g id="${ID}-lh" opacity="0"><path d="M${BX1 - 44},${BSEAT - 4} H${BX1 - 22}" fill="none" stroke="${F}" stroke-width="5.4" stroke-linecap="round"/>
    <path d="M${BX1 - 22},${BSEAT - 15} h9 v13 h-9 Z" fill="${F}"/><path d="M${BX1 - 13},${BSEAT - 15} q7,-1 9,6 l-3,1 q-2,-4 -6,-4 Z" fill="${F}"/></g>`;
  let STAKES = "";
  const SVG = inner => `<svg style="position:absolute;left:0;top:0;overflow:visible" width="580" height="480" viewBox="0 0 580 480">${inner}</svg>`;
  const inner = `
  ${EYEBROW("The job became", 24, 22, M, `${ID}-eb`)}
  ${SVG(`${pipe}${cables}${cflow}${drawer}${vec}`)}
  ${SVG(`${fence}`)}
  ${glassFill}
  ${jar}
  ${dbs}
  ${SVG(`${ground}${bench}${LAID}<!--STAKES-->`)}
  ${ENG}`;

  // ---- opening
  tw(`#${ID}-eb`, { opacity: 0, y: 14 }, { opacity: 1, y: 0 }, open, 0.35, "power3.out");
  draw(`#${ID}-j .dr`, open, 0.6);
  tw(`#${ID}-j-jar-liq`, { opacity: 0, y: 170 }, { opacity: 0.14, y: 170 }, open + 0.4, 0.4);
  draw(`#${ID}-fg`, open + 0.1, 0.6);
  // guardrails: ground, posts, then the one rail runs across behind the jar
  draw(`#${ID}-jg`, tGu - 0.1, 0.4);
  draw(`.${ID}-fp`, tGu + 0.1, 0.3);
  draw(`#${ID}-rl`, tGu + 0.35, 0.6);
  // connectors: cables; databases: cylinders land on the cable ends, dots run along the cables
  [0, 1, 2].forEach(i => draw(`#${ID}-c${i}`, tCo + i * 0.15, 0.6));
  [0, 1, 2].forEach(i => { appear(`#${ID}-db${i}`, tDb - 0.1 + i * 0.25, 0.4, { y: -18 }, { y: 0 }); draw(`#${ID}-dbs${i} .dr`, tDb - 0.1 + i * 0.25, 0.3); });
  appear(`#${ID}-cf`, tDb + 0.6, 0.3);
  lp(`.${ID}-fl`, "strokeDashoffset", 0, -18, tDb + 0.6, 0.5);
  // retrieval: the file and its arrows into the jar; vector: the scatter lands on the front card
  draw(`#${ID}-dr .dr`, tRe - 0.1, 0.6);
  appear(`#${ID}-cardfill`, tRe + 0.2, 0.3);
  r.forEach(([x, y], i) => tw(`#${ID}-v${i}`, { opacity: 0, scale: 0, svgOrigin: `${x} ${y}` }, { opacity: 1, scale: 1, svgOrigin: `${x} ${y}` }, tVe + i * 0.05, 0.25, "back.out(2)"));
  // context: the accent pipe; the liquid rises; dots flow to the end
  draw(`#${ID}-pp`, tCx - 0.1, 0.8);
  appear(`#${ID}-pf`, tCx + 0.7, 0.3);
  lp(`#${ID}-pf`, "strokeDashoffset", 0, -16, tCx + 0.7, 0.45);
  tw(`#${ID}-j-jar-liq`, { y: 170 }, { y: 20 }, tCx + 0.8, 3.2, "power1.inOut");
  // the bench is set out a little before he needs it
  draw(`#${ID}-bench .dr`, tCh - 3.2, 0.5);

  // ---- the engineer. Walk cycle: per half step the stance leg sweeps front -> back while the swing
  // leg sweeps back -> front with its knee bending and straightening; the body moves at the speed the
  // planted foot sweeps (about 27 user px per half step). Rest pose keeps the legs a little apart.
  const SPEED = 90 * ES, HS = 0.3, REST = { A: 13, B: -13 }, SW = 22;
  const rot = (sel, a0, a1, t, d, org, ease = "none") => tw(sel, { rotation: a0, svgOrigin: org.join(" ") }, { rotation: a1, svgOrigin: org.join(" ") }, t, d, ease);
  const FO = `${Math.round(32 * ES)}px 50%`;
  let ex = 40, face = 1;
  appear(`#${ID}-e`, open + 0.15, 0.3, { x: ex }, { x: ex });
  rot(`#${ID}-legA`, REST.A, REST.A, 0, 0.1, HIP); rot(`#${ID}-legB`, REST.B, REST.B, 0, 0.1, HIP);
  // a turn is a cut-flip on one frame (review 2026-10-28: a 0.2s scaleX tween squashed him edge-on through 0)
  const turn = (dir, t) => { tw(`#${ID}-ef`, { scaleX: face, transformOrigin: FO }, { scaleX: dir, transformOrigin: FO }, t, 0.034, "steps(1)", ",immediateRender:false"); face = dir; };
  rot(`#${ID}-arm`, REST_A, REST_A, 0, 0.05, SH);                // the hammer hangs at his side from the start
  const walks = [];
  const walk = (x1, t) => {
    const dir = Math.sign(x1 - ex), n = Math.max(2, Math.round(Math.abs(x1 - ex) / SPEED / HS));
    const hs = +(Math.abs(x1 - ex) / SPEED / n).toFixed(3), d = +(hs * n).toFixed(3);
    if (dir !== face) turn(dir, t - 0.22);
    tw(`#${ID}-e`, { x: ex }, { x: x1 }, t, d, "none");
    let a = { A: REST.A, B: REST.B };
    for (let i = 0; i < n; i++) {
      const ti = +(t + i * hs).toFixed(3);
      const stance = i % 2 ? "B" : "A", swing = i % 2 ? "A" : "B";
      rot(`#${ID}-leg${stance}`, a[stance], SW, ti, hs - 0.002, HIP);              // 2ms short: float rounding
      rot(`#${ID}-leg${swing}`, a[swing], -SW, ti, hs - 0.002, HIP, "sine.inOut");
      tw(`#${ID}-shin${swing}`, { rotation: 0, svgOrigin: KNEE.join(" ") }, { rotation: 38, svgOrigin: KNEE.join(" ") }, ti, hs / 2, "sine.out", ",yoyo:true,repeat:1");
      a[stance] = SW; a[swing] = -SW;
    }
    const te = +(t + d).toFixed(3);
    rot(`#${ID}-legA`, a.A, REST.A, te, 0.18, HIP, "power1.out"); rot(`#${ID}-legB`, a.B, REST.B, te, 0.18, HIP, "power1.out");
    ex = x1; walks.push([t - 0.25, te]);
    return te + 0.2;
  };
  // one hammer stroke per 0.6s: a slow wind-up to -30 degrees (0.36s; at -45 the head merged with the hard hat), a fast strike down
  // (0.16s, accelerating), ticks off the face on contact; n strokes per work spell
  const sched = [];
  let e;
  // g05x opens by match-cut: he keeps his card facing until about 2.0s into it (review 2026-10-28 #4)
  const X0 = +(planPart("g05x").start - BEAT0).toFixed(3);
  e = walk(230, tGu + 0.2); sched.push([e, 1, ex, face]);                     // to the fence
  e = walk(380, tCo + 0.3); sched.push([e, 2, ex, face]);                     // to the cables
  e = walk(170, Math.max(tRe + 0.4, X0 + 2.2)); sched.push([e, 3, ex, face], [e + 3.0, 3, ex, face]);   // under the file's arrows
  e = walk(300, tCx + 0.2); sched.push([e + 1.0, 3, ex, face]);               // under the pipe
  // chore: he walks to stand just in front of the bench's left end, turns away from it, and sits
  // back onto it: hip on the seat's left end, thighs forward (off the seat, to the left), shins down
  // in front of the seat edge, clear of the bench's legs
  const HIPX = BX0 + 10;                                         // where his hip lands on the seat
  const xSit = HIPX - (EW - HIP[0] * ES);                        // body left when facing left
  e = walk(xSit, tCh - 2.0);
  sched.forEach(([t, n], i) => { if (i && t < sched[i - 1][0] + sched[i - 1][1] * 0.6) throw new Error(`${ID}: hammer strokes overlap at ${t}`); });
  // never hammer while walking (review 2026-10-28 #2)
  sched.forEach(([t, n]) => { for (const [w0, w1] of walks) if (t < w1 && t + n * 0.6 > w0) throw new Error(`${ID}: strokes at ${t} overlap a walk ${w0}-${w1}`); });
  // a stake in front of him at each spot he works, set down as he arrives (one per spot)
  const stakeAt = new Map();
  sched.forEach(([t, , x, f]) => { const k = `${Math.round(x)}:${f}`; if (!stakeAt.has(k)) stakeAt.set(k, { t, x, f }); });
  STAKES = [...stakeAt.values()].map(({ t, x, f }, i) => {
    const lx0 = f > 0 ? STK.x0 : 64 - STK.x1, X = x + lx0 * ES, W = (STK.x1 - STK.x0) * ES, T = ETOP + STK.top * ES;
    appear(`#${ID}-stk${i}`, t - 0.15, 0.2, { y: -10 }, { y: 0 });
    return `<rect id="${ID}-stk${i}" x="${f3(X)}" y="${f3(T)}" width="${f3(W)}" height="${f3(FG - T)}" fill="${C.bg}" stroke="${F}" stroke-width="3" stroke-linejoin="round" opacity="0"/>`;
  }).join("");
  // one stroke per 0.6s: wind up above the shoulder (0.3s), strike DOWN onto the stake (0.12s,
  // accelerating), ticks at the contact point; after the spell the hammer drops back to his side.
  // immediateRender:false on every tween whose FROM differs from the rest state: a fromTo renders its
  // from at build time, which held the arm wound up and the ticks lit until the first stroke.
  const NI = ",immediateRender:false";
  sched.forEach(([t, n]) => { for (let k = 0; k < n; k++) { const tk = t + k * 0.6;
    rot(`#${ID}-arm`, k ? HIT_A : REST_A, WIND_A, tk, 0.3, SH, "sine.inOut");
    tw(`#${ID}-arm`, { rotation: WIND_A, svgOrigin: SH.join(" ") }, { rotation: HIT_A, svgOrigin: SH.join(" ") }, tk + 0.32, 0.12, "power2.in", NI);
    tw(`#${ID}-hit`, { opacity: 0 }, { opacity: 1 }, tk + 0.43, 0.03, "none", NI);
    tw(`#${ID}-hit`, { opacity: 1 }, { opacity: 0 }, tk + 0.5, 0.16, "power1.out", NI); }
    tw(`#${ID}-arm`, { rotation: HIT_A, svgOrigin: SH.join(" ") }, { rotation: REST_A, svgOrigin: SH.join(" ") }, t + (n - 1) * 0.6 + 0.5, 0.25, "power1.inOut", NI); });
  const tTurn = e + 0.05; turn(-1, tTurn);
  const tS = Math.max(tTurn + 0.3, tCh - 0.05), drop = Math.round(BSEAT - 3 - (ETOP + HIP[1] * ES));
  tw(`#${ID}-e`, { y: 0 }, { y: drop }, tS, 0.45, "power2.inOut");
  tw(`#${ID}-hm`, { opacity: 1 }, { opacity: 0 }, tS + 0.2, 0.08, "none", NI);
  appear(`#${ID}-lh`, tS + 0.24, 0.12);
  ["A", "B"].forEach((k, i) => { rot(`#${ID}-leg${k}`, REST[k], -85 + i * 6, tS, 0.45, HIP, "power2.inOut"); rot(`#${ID}-shin${k}`, 0, 85 - i * 6, tS, 0.45, KNEE, "power2.inOut"); });

  // the statics: one end state per selector, at t=0 (immediate), for everything already finished
  let pre = "";
  for (const [sel, st] of statics) pre += `tl.fromTo(${J(sel)},${J(st)},${J({ ...st, duration: 0.05, immediateRender: true })},0);\n`;
  return { inner: inner.replace("<!--STAKES-->", STAKES), js: pre + js };
}

export default function build() {
  const D = frames(ID) / 30;
  const { x: X, y: Y, w: W, h: H } = HERO;
  const sc = sceneOf(ID, D);
  const body = `<div id="${ID}-card" class="${panelClass(ID)}" style="position:absolute;left:${X}px;top:${Y}px;width:${W}px;height:${H}px">${sc.inner}</div>`;
  let js = wipeUp(`#${ID}-card`, 0, 0.35);
  js += sc.js;
  js += exitIfFree(ID, D, [`#${ID}-card`]);
  emit(ID, D, body, js);
}
