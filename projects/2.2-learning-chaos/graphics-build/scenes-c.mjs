// Scenes C: the cowboy beat through the profiler. Drawn over-screen cards (hero
// box, opaque), the two right-plate mini cards, and the gZ15b/gZ15c punch marks.
import { C, emit, span, frames, cueIn, panelClass, fg, dim, wipeUp, boxOf } from "./lib.mjs";
import { T, EYEBROW, statLine, cardHTML, chipHTML, show, hide, drawOn, rowUp, pop, countUp,
         tickSVG, tickIn, barHTML, barIn, vbars, vbarIn, ruleIn, spin, wobble, f3,
         exitIfFree, underlineM, boxM, leaderM, leaderIn, zm, TI } from "./hb.mjs";
import { plateau } from "./lib.mjs";
import { humanoid, humIdle, humHatSpin, HUM } from "./hum.mjs";
import { want } from "./only.mjs";
const dur = id => frames(id) / 30;
const W = "#FFFFFF";

const markLife = (sel, p0, t = 0.15, p1 = null, w = 0.25) =>
  `tl.fromTo(${JSON.stringify(sel)},{strokeDashoffset:1},{strokeDashoffset:0,duration:0.3,ease:"power2.out",immediateRender:false},${f3(p0 + t)});\n`
  + (p1 === null ? "" : `tl.fromTo(${JSON.stringify(sel)},{opacity:1},{opacity:0,duration:${f3(w)},immediateRender:false},${f3(Math.max(p0 + t + 0.3, p1 - w))});\n`);

// the Push-T board used by the cowboy pair: pusher dot + T block, both drawn
// in a 260x260 frame with the T's spin pivot at (130,150).
const boardFrame = (id, col) => `
  <rect x="10" y="10" width="240" height="240" rx="14" fill="none" stroke="${col}" stroke-width="3" opacity=".85"/>`;

// =================================================================== gZ9
// The comic beat: the T starts circling, the rope loop arcs over it, the pusher
// swings it down, and the humanoid wears the cowboy hat (human request
// 2026-11-12; costume for this beat only). The spin runs a full extra cycle
// past the last 'cowboy'.
if (want("gZ9")) {
  const id = "gZ9", D = dur(id), [x, y, w, h] = boxOf(id);
  const F = fg(id), M = dim(id);
  const tU = cueIn(id, "unexpected happens");
  const tC = cueIn(id, "circling");
  const tCow = cueIn(id, "call this a cowboy");
  const tSwing = cueIn(id, "swinging it down");
  const tCow2 = cueIn(id, "call this policy a cowboy");
  const spinEnd = tCow2 + 1.2;                       // extra cycle past the last 'cowboy'
  const svg = `<svg id="brd" style="position:absolute;left:44px;top:130px;overflow:visible;opacity:0" width="260" height="260" viewBox="0 0 260 260">
      ${boardFrame("b", F)}
      <g id="tBlk"><path d="M85,125 L175,125 M130,125 L130,195" fill="none" stroke="${F}" stroke-width="16" stroke-linecap="round"/></g>
      <g id="rope" style="opacity:0">
        <path id="ropeP" d="M130,215 C60,170 52,92 108,72 C150,58 186,84 178,120" pathLength="1" fill="none" stroke="${C.accent}" stroke-width="5" stroke-linecap="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>
        <ellipse id="ropeE" cx="146" cy="88" rx="44" ry="24" fill="none" stroke="${C.accent}" stroke-width="5" transform="rotate(-18 146 88)" pathLength="1" style="stroke-dasharray:1;stroke-dashoffset:1"/>
        <circle cx="130" cy="215" r="13" fill="${F}"/>
      </g>
    </svg>`;
  const body = cardHTML(id, x, y, w, h,
      T("the unexpected happens", 44, 34, 38, { w: 520, weight: 900, cls: "disp", id: "hd" }) +
      T("the T just... circles", 44, 84, 24, { weight: 500, color: M, id: "sub" }) +
      svg +
      `<div id="chipC" style="position:absolute;left:296px;top:150px;padding:10px 20px;border:3px solid ${C.accent};border-radius:26px;opacity:0">
         ${TI("the cowboy policy", 21, { weight: 900, cls: "disp", color: C.accent })}</div>` +
      humanoid("hm", 420, 300, 0.52, { fill: C.bg, hat: true }) +
      T("cowboy policy", 420, 590, 20, { w: 140, align: "center", weight: 700, color: M, id: "lbl" }));
  let js = wipeUp(`#${id}`, 0, 0.35) + rowUp("#hd", tU, 0.3);
  js += `tl.fromTo("#brd",{opacity:0},{opacity:1,duration:0.3,immediateRender:false},${f3(tU + 0.2)});\n`;
  js += rowUp("#sub", tC, 0.3);
  // the circling: one continuous rotation from 'circling' past the last 'cowboy'
  js += spin("tBlk", tC + 0.3, Math.max(2, spinEnd - tC - 0.3), 360 * Math.max(2, Math.round((spinEnd - tC) / 1.9)), [130, 150], "none");
  js += `tl.fromTo("#rope",{opacity:0},{opacity:1,duration:0.01,immediateRender:false},${f3(tSwing)});\n`
      + drawOn("ropeP", tSwing, 0.45) + drawOn("ropeE", tSwing + 0.35, 0.3);
  js += wobble("rope", tSwing + 0.65, 0.55, -7, 9, [130, 215], 3);
  js += pop("#chipC", tCow, 0.3);
  // the hat: spin past the last 'cowboy' (this beat only, human 2026-11-12)
  js += humHatSpin("hm", tCow2 + 0.1, { turns: 1.5, d: 1.3, wobble: 12 });
  js += humIdle("hm", tU, D - 0.4, 3);
  js += show("#lbl", tCow2, 0.3);
  emit(id, D, body, js);
}

// =================================================================== gZ9b
// Attempt 1 verdict: the failure stamp lands on the spinning board, the rope
// dissolves, a ledger row ticks, then the humility chip on 'try AI'. The stamp is
// deliberately accent-free (human D2 decision 2026-11-12: the win beat gZ12b must
// stay the loudest stamp in the video; failures stay in the card's foreground
// ink, which on this measured opaque panel is fg(id) = $bg paper, the same
// treatment as gZ8's "0 / 100"). The hat stays on (same beat), spinning once on
// the verdict.
if (want("gZ9b")) {
  const id = "gZ9b", D = dur(id), [x, y, w, h] = boxOf(id);
  const F = fg(id), M = dim(id);
  const tA = cueIn(id, "attempt");
  const tFail = cueIn(id, "was a failure");
  const tAI = cueIn(id, "try AI");
  const svg = `<svg id="brd" style="position:absolute;left:44px;top:120px;overflow:visible" width="260" height="260" viewBox="0 0 260 260">
      ${boardFrame("b", M)}
      <g id="tBlk"><path d="M85,125 L175,125 M130,125 L130,195" fill="none" stroke="${M}" stroke-width="16" stroke-linecap="round"/></g>
      <g id="rope"><path d="M130,215 C60,170 52,92 108,72 C150,58 186,84 178,120" fill="none" stroke="${M}" stroke-width="5" stroke-linecap="round"/>
        <ellipse cx="146" cy="88" rx="44" ry="24" fill="none" stroke="${M}" stroke-width="5" transform="rotate(-18 146 88)"/></g>
      <g id="stamp" style="opacity:0" transform="rotate(-8 130 140)">
        <rect x="34" y="108" width="192" height="64" rx="8" fill="none" stroke="${F}" stroke-width="6"/>
        <text x="130" y="152" text-anchor="middle" font-family="Satoshi" font-variation-settings:'wght' 900" font-size="34" fill="${F}">was a failure</text>
      </g>
    </svg>`;
  const body = cardHTML(id, x, y, w, h,
      EYEBROW("attempt 1", 44, 36, M, "ey", 22) +
      T("deterministic, then the AI guess", 44, 66, 30, { w: 520, weight: 700, cls: "disp", id: "hd" }) +
      svg +
      `<div id="led" style="position:absolute;left:44px;top:410px;display:flex;align-items:center;gap:14px;opacity:0">
         <div style="width:30px;height:30px;border:3px solid ${M};border-radius:50%"></div>
         ${T("attempt 1: deterministic, failed", 44, 2, 28, { weight: 700, color: M, nowrap: true })}</div>` +
      `<div id="chipAI" style="position:absolute;left:44px;top:472px;padding:10px 20px;border:3px dashed ${M};border-radius:26px;opacity:0">
         ${TI("\u201cnot super smart. let me try AI\u201d", 22, { weight: 500, color: M })}</div>` +
      humanoid("hm", 476, 320, 0.5, { fill: C.bg, hat: true }));
  let js = wipeUp(`#${id}`, 0, 0.3) + rowUp("#hd", 0.1, 0.3);
  js += spin("tBlk", 0.2, 2.4, 200, [130, 150], "power2.out");      // winding down
  js += rowUp("#led", tA, 0.35);
  js += pop("#stamp", tFail, 0.28);                                   // ink stamp, accent-free (D2)
  js += hide("#rope", tFail + 0.5, 0.6);
  js += humHatSpin("hm", tFail + 0.1, { turns: 1, d: 1.1, wobble: 10 });
  js += humIdle("hm", tFail + 1.3, D - 0.4, 3);
  js += show("#chipAI", tAI, 0.35);
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}

// =================================================================== gZ10
// AI interlude: a terminal types the prompt, then a small board where the pusher
// walks into a corner and sits; the X marks the spot (one accent: the X).
// Composition pass 2026-11-12: the dashed chip's right edge sat on the mini-board
// frame, and the card held ~160px of dead bottom. Board redrawn at 0.63 scale
// below-left of the chip (26px vertical gap), the note moved right of the board,
// and the card's visual height trimmed 620->580 inside the cutsheet box (the box
// is gen_cutsheet.py's, not touched here).
if (want("gZ10")) {
  const id = "gZ10", D = dur(id), [x, y, w, h] = boxOf(id);
  const F = fg(id), M = dim(id);
  const tW = cueIn(id, "write me a policy");
  const tG = cueIn(id, "goal is 400 by 400");
  const tS = cueIn(id, "sits in a corner");
  const term = `<svg style="position:absolute;left:44px;top:110px;overflow:visible" width="512" height="188" viewBox="0 0 512 188">
      <rect x="2" y="2" width="508" height="184" rx="12" fill="none" stroke="${F}" stroke-width="3.5"/>
      <line x1="2" y1="34" x2="510" y2="34" stroke="${F}" stroke-width="2" opacity=".5"/>
      <circle cx="24" cy="18" r="4" fill="${M}"/><circle cx="40" cy="18" r="4" fill="${M}"/><circle cx="56" cy="18" r="4" fill="${M}"/>
    </svg>` +
    T(">", 60, 168, 26, { weight: 900, color: F, id: "p1" }) +
    T("write me a policy", 84, 168, 26, { weight: 700, color: F, id: "p1b" }) +
    T("that wins at Push-T.", 84, 206, 26, { weight: 700, color: F, id: "p2" }) +
    T("goal is 400 by 400.", 84, 244, 26, { weight: 500, color: M, id: "p3" });
  const board = `<svg id="b2" style="position:absolute;left:445px;top:400px;overflow:visible;opacity:0" width="94" height="94" viewBox="0 0 180 180">
      ${boardFrame("c", F)}
      <circle id="dot" cx="44" cy="200" r="12" fill="${F}" style="opacity:0"/>
      <g id="xx" style="opacity:0"><path d="M148,148 L176,176 M176,148 L148,176" pathLength="1" fill="none" stroke="${C.accent}" stroke-width="7" stroke-linecap="round"/></g>
    </svg>`;
  const body = cardHTML(id, x, y, w, 540,
      EYEBROW("the ai interlude", 44, 34, M, "ey", 22) +
      T("\u201cwrite me a policy\u201d", 44, 62, 34, { w: 520, weight: 900, cls: "disp", id: "hd" }) +
      term + board +
      `<div id="g400" style="position:absolute;left:44px;top:332px;padding:9px 18px;border:3px dashed ${M};border-radius:22px;opacity:0">
         ${TI("assumed the goal was 400 x 400", 22, { weight: 700, color: M })}</div>` +
      T("it parked in the corner, waiting", 44, 402, 24, { weight: 500, color: M, id: "note" }));
  let js = wipeUp(`#${id}`, 0, 0.3);
  js += rowUp("#hd", Math.max(0.05, tW - 0.6), 0.3);
  js += show("#p1", tW, 0.15) + show("#p1b", tW + 0.12, 0.25) + show("#p2", tW + 0.7, 0.3);
  js += show("#p3", tG, 0.3) + show("#g400", tG + 0.3, 0.3);
  js += `tl.fromTo("#b2",{opacity:0},{opacity:1,duration:0.3,immediateRender:false},${f3(tG + 0.9)});\n`;
  js += `tl.fromTo("#dot",{opacity:0,x:0,y:0},{opacity:1,x:112,y:-64,duration:1.1,ease:"power1.inOut",immediateRender:false},${f3(Math.max(0, tS - 0.9))});\n`.replace(");", ");");
  js += `tl.fromTo("#xx",{opacity:0},{opacity:1,duration:0.01,immediateRender:false},${f3(tS + 0.35)});\n`
      + drawOn("xx", tS + 0.35, 0.35);
  js += rowUp("#note", tS + 0.8, 0.35);
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}

// =================================================================== gZ11
// 'five minutes' vs 'a whole week' in 2 seconds: clock glyph left ($accent
// hands), a 5-day strip of chips right that fills in ($accent-soft).
if (want("gZ11")) {
  const id = "gZ11", D = dur(id), [x, y, w, h] = boxOf(id);
  const M = dim(id);
  const t5 = cueIn(id, "five minutes");
  const tW = cueIn(id, "whole week");
  const clock = `<svg id="clk" style="position:absolute;left:44px;top:150px;overflow:visible;opacity:0" width="130" height="130" viewBox="0 0 130 130">
      <circle id="clkC" cx="65" cy="65" r="56" pathLength="1" fill="none" stroke="${M}" stroke-width="4" style="stroke-dasharray:1;stroke-dashoffset:1"/>
      <line id="hh" x1="65" y1="65" x2="65" y2="34" pathLength="1" stroke="${C.accent}" stroke-width="5" stroke-linecap="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>
      <line id="mh" x1="65" y1="65" x2="90" y2="65" pathLength="1" stroke="${C.accent}" stroke-width="4" stroke-linecap="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>
    </svg>`;
  const strip = [0, 1, 2, 3, 4].map(k =>
    `<rect id="d${k}" x="${236 + k * 66}" y="180" width="54" height="54" rx="10" fill="none" stroke="${M}" stroke-width="3" pathLength="1" style="stroke-dasharray:1;stroke-dashoffset:1"/>`).join("");
  const stripSvg = `<svg id="st" style="position:absolute;left:0;top:0;overflow:visible;opacity:0" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${strip}
      ${[0, 1, 2, 3, 4].map(k => `<rect id="df${k}" x="${240 + k * 66}" y="184" width="46" height="46" rx="7" fill="${C.accentSoft}" opacity="0"/>`).join("")}</svg>`;
  const body = cardHTML(id, x, y, w, h,
      T("5 minutes", 44, 60, 54, { weight: 900, cls: "disp", id: "t5" }) +
      T("of me expecting that", 316, 82, 24, { weight: 500, color: M, id: "tw" }) +
      clock + stripSvg +
      T("code + versions, back and forth", 236, 250, 22, { weight: 500, color: M, id: "cap" }));
  let js = wipeUp(`#${id}`, 0, 0.2) + rowUp("#t5", t5, 0.22);
  js += `tl.fromTo("#clk",{opacity:0},{opacity:1,duration:0.01,immediateRender:false},${f3(t5 + 0.05)});\n`;
  js += drawOn("clkC", t5 + 0.05, 0.3) + drawOn("hh", t5 + 0.2, 0.2) + drawOn("mh", t5 + 0.3, 0.2);
  js += rowUp("#tw", tW, 0.25) + `tl.fromTo("#st",{opacity:0},{opacity:1,duration:0.01,immediateRender:false},${f3(tW)});\n`;
  [0, 1, 2, 3, 4].forEach(k => { js += drawOn(`d${k}`, tW + k * 0.08, 0.18); js += `tl.fromTo("#df${k}",{opacity:0},{opacity:1,duration:0.15,immediateRender:false},${f3(tW + 0.12 + k * 0.08)});\n`; });
  js += rowUp("#cap", tW + 0.5, 0.25);
  // Human review 2026-11-13 finding 7: the part was 2.03s and the card hard-cut
  // out at the part end (no exit was scheduled: fine at 2s, a flash at 6s). The
  // hold now runs to D-0.33 and wipes.
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}

// =================================================================== gZ11b
// The thesis returns mid-demo as a mini quote card (right plate): 'to get a
// machine to learn ... you need some level of randomness', attribution chip
// Dennis Noble / Alan Turing. One accent: 'randomness'.
if (want("gZ11b")) {
  const id = "gZ11b", D = dur(id), [x, y, w, h] = boxOf(id);
  const M = dim(id);
  const t1 = cueIn(id, "get a machine to learn");
  const t2 = cueIn(id, "level of randomness");
  const body = cardHTML(id, x, y, w, h,
      EYEBROW("the thesis, again", 34, 34, M, "ey", 20) +
      T("to get a machine", 34, 84, 38, { weight: 900, cls: "disp", id: "l1" }) +
      T("to learn...", 34, 128, 38, { weight: 900, cls: "disp", id: "l2" }) +
      T("you need some level of", 34, 208, 32, { weight: 700, id: "l3" }) +
      T("randomness", 34, 246, 44, { weight: 900, cls: "disp", color: C.accent, id: "l4" }) +
      T("in the learning process", 34, 300, 26, { weight: 500, color: M, id: "l5" }) +
      `<div id="att" style="position:absolute;left:34px;top:380px;padding:8px 16px;border:2px solid ${M};border-radius:18px;opacity:0">
         ${TI("Dennis Noble / Alan Turing", 20, { weight: 700, color: M })}</div>`);
  let js = wipeUp(`#${id}`, 0, 0.3);
  js += rowUp("#l1", t1, 0.3) + rowUp("#l2", t1 + 0.35, 0.3);
  js += rowUp("#l3", Math.max(t1 + 0.6, t2 - 0.5), 0.3);
  js += rowUp("#l4", t2, 0.32) + rowUp("#l5", t2 + 0.3, 0.3);
  js += show("#att", t2 + 1.1, 0.35);
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}

// =================================================================== gZ12
// Hugging Face promise: '64-65%' as ONE 160px line: the count-up number plus a
// muted '%' directly after it; the caption hangs under the whole number+% line.
// A small check ticks under the caption on 'good chunk of successes' (the accent).
// Composition pass 2026-11-12: '%' used to sit orphaned below the number with the
// caption beside the number. Widths at 160px (Satoshi Black): widest count frame
// 0..64 is "40" = 220px, '%' = 158px; % pinned at left 272 (44 + 220 + 8) so no
// count frame ever touches it; line right edge 44+220+8+158 = 430, inside 600.
if (want("gZ12")) {
  const id = "gZ12", D = dur(id), [x, y, w, h] = boxOf(id);
  const M = dim(id);
  const tP = cueIn(id, "promised about");
  const tC = cueIn(id, "good chunk of successes");
  const body = cardHTML(id, x, y, w, h,
      EYEBROW("what hugging face promised", 44, 34, M, "ey", 22) +
      `<span id="num" style="position:absolute;left:44px;top:80px;font-family:Satoshi;font-variation-settings:'wght' 900;font-size:160px;line-height:1;white-space:nowrap;opacity:0">0</span>
       <span id="pc" style="position:absolute;left:272px;top:80px;font-family:Satoshi;font-variation-settings:'wght' 900;font-size:160px;line-height:1;white-space:nowrap;color:${M};opacity:0">%</span>` +
      T("success, on their eval", 44, 258, 30, { w: 320, weight: 700, color: M, id: "cap" }) +
      tickSVG("ck", 90, 484, 34, C.accent) +
      T("I did get a good chunk", 140, 470, 26, { weight: 700, color: fg(id), id: "gt" }));
  let js = wipeUp(`#${id}`, 0, 0.3);
  js += `tl.fromTo("#num",{opacity:0},{opacity:1,duration:0.01,immediateRender:false},${f3(tP)});\n`
      + countUp("#num", 0, 64, tP, 0.9) + show("#pc", tP + 0.5, 0.3) + rowUp("#cap", tP + 0.7, 0.3);
  js += tickIn("ck", tC, 0.5) + rowUp("#gt", tC + 0.15, 0.3);
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}

// =================================================================== gZ12b
// First success replay: the T slides onto the outline and the SUCCESS tick lands
// LOUD (bigger than any failure card: lesson from the 2.1 review), chip 'that was
// settled' on 'settled'. The first green light after three failed attempts.
if (want("gZ12b")) {
  const id = "gZ12b", D = dur(id), [x, y, w, h] = boxOf(id);
  const F = fg(id), M = dim(id);
  const tS = cueIn(id, "successfully pushes");
  const tSet = cueIn(id, "was settled");
  const svg = `<svg id="brd" style="position:absolute;left:44px;top:150px;overflow:visible" width="260" height="260" viewBox="0 0 260 260">
      ${boardFrame("d", M)}
      <path d="M96,140 L184,140 M140,140 L140,214" fill="none" stroke="${M}" stroke-width="16" stroke-linecap="round" stroke-dasharray="12 10" opacity=".8"/>
      <g id="tb"><path d="M96,88 L184,88 M140,88 L140,158" fill="none" stroke="${F}" stroke-width="16" stroke-linecap="round"/></g>
    </svg>`;
  const body = cardHTML(id, x, y, w, h,
      EYEBROW("first run of the diffusion policy", 44, 34, M, "ey", 22) +
      T("it actually pushes the T", 44, 62, 32, { w: 520, weight: 900, cls: "disp", id: "hd" }) +
      svg +
      `<span id="sw" style="position:absolute;left:44px;top:430px;white-space:nowrap;font-family:Satoshi;font-variation-settings:'wght' 900;font-size:110px;line-height:1.1;color:${C.accent};opacity:0">success</span>` +
      tickSVG("ck", 512, 480, 38, C.accent) +
      `<div id="settled" style="position:absolute;left:44px;top:566px;padding:8px 16px;border:2px solid ${M};border-radius:18px;opacity:0">
         ${TI("that was settled", 22, { weight: 700, color: M })}</div>`);
  let js = wipeUp(`#${id}`, 0, 0.3) + rowUp("#hd", 0.1, 0.3);
  js += `tl.fromTo("#tb",{y:0},{y:52,duration:0.9,ease:"power2.inOut",immediateRender:false},${f3(Math.max(0.2, tS - 0.5))});\n`;
  js += `tl.fromTo("#sw",{opacity:0,scale:1.6,transformOrigin:"0% 50%"},{opacity:1,scale:1,duration:0.35,ease:"back.out(2)",immediateRender:false},${f3(tS + 0.35)});\n`;
  js += tickIn("ck", tS + 0.55, 0.6);
  js += show("#settled", tSet, 0.3);
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}

// =================================================================== gZ13
// '80-90 min for 50 episodes' + an M5 Pro chip. Only 0.87s: enter fast, no
// count-up (there is no time to count).
if (want("gZ13")) {
  const id = "gZ13", D = dur(id), [x, y, w, h] = boxOf(id);
  const M = dim(id);
  const body = cardHTML(id, x, y, w, h,
      `<span id="num" style="position:absolute;left:44px;top:100px;font-family:Satoshi;font-variation-settings:'wght' 900;font-size:160px;line-height:1;opacity:0">80-90</span>` +
      `<div id="mn" style="position:absolute;left:44px;top:288px;font-family:Satoshi;font-variation-settings:'wght' 900;font-size:88px;line-height:1;color:${M};opacity:0">min</div>` +
      `<div id="m5" style="position:absolute;left:236px;top:296px;padding:8px 18px;border:3px solid ${M};border-radius:20px;opacity:0">
         ${TI("50 episodes on an M5 Pro", 24, { weight: 700, color: M })}</div>`);
  let js = wipeUp(`#${id}`, 0, 0.18);
  js += show("#num", 0.06, 0.18) + show("#mn", 0.12, 0.18) + show("#m5", 0.18, 0.18);
  // composition pass 2026-11-12: the part window was extended to 1.8s but had no
  // exit; gZ14 next abuts 22.5s later, so the card blinked out at the cut.
  // exitIfFree adds the 0.3s wipe-down (starts D-0.333, done by 1.767 < 1.8).
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}

// =================================================================== gZ14
// His own eval: '36/50' with '74%' counting up on '74 percent' (one accent:
// the percent). Composition pass 2026-11-12: "36 / 50" at 160px measured 560px
// and its digits landed on the card border (row run x657 vs border 654-659), so
// the spaces come out: "36/50" measures 471px (Satoshi Black 160), 30px right of
// the border edge. Both stats keep the 160px floor.
if (want("gZ14")) {
  const id = "gZ14", D = dur(id), [x, y, w, h] = boxOf(id);
  const M = dim(id);
  const t7 = cueIn(id, "74 percent");
  // composition pass 2 (F6): content ends ~local 515 of 620 (~55% black). Card
  // trimmed to 540 inside the declared box (gZ10 precedent).
  const body = cardHTML(id, x, y, w, 540,
      EYEBROW("my own eval", 44, 34, M, "ey", 22) +
      `<span id="fr" style="position:absolute;left:44px;top:66px;white-space:nowrap;font-family:Satoshi;font-variation-settings:'wght' 900;font-size:160px;line-height:1.12;color:${M};opacity:0">36/50</span>` +
      `<span id="pc" style="position:absolute;left:44px;top:270px;font-family:Satoshi;font-variation-settings:'wght' 900;font-size:160px;line-height:1.12;color:${C.accent};opacity:0">0%</span>` +
      T("success on my machine", 44, 486, 26, { weight: 500, color: M, id: "cap" }));
  let js = wipeUp(`#${id}`, 0, 0.25) + show("#fr", 0.15, 0.3);
  js += `tl.fromTo("#pc",{opacity:0},{opacity:1,duration:0.01,immediateRender:false},${f3(t7)});\n`
      + countUp("#pc", 0, 74, t7, 0.8, 0, "", "%");
  js += rowUp("#cap", t7 + 0.5, 0.3);
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}

// =================================================================== gZ14b
// 'I built a profiler' enters as a character (right plate): lens glyph over a
// dataset tile, the two check rows he names, the community ticks, then the beat
// line 'now: my own data' in $accent (the one accent).
// Composition pass 2026-11-12: the magnifier and the checkbox squares sat ON the
// row text (the flex siblings were position:absolute T() spans, out of flow), so
// the text now starts 46px (rows) / 32px (ticks) right of the row origin: a 20px
// gap past the 26px square and the 22px tick. The cutsheet cap for the demo face
// inset landed in cutsheet.json during this pass: boxOf now returns [1548,120,
// 340,400], the whole stack re-spaced to end above y~392 (lens 84px, rows 42px
// apart, ticks 30px apart, pill h~46).
if (want("gZ14b")) {
  const id = "gZ14b", D = dur(id), [x, y, w, h] = boxOf(id);
  const M = dim(id);
  const rows = ["outliers?", "is the data good?"];
  const rowHtml = rows.map((a, k) =>
    `<div id="r${k}" style="position:absolute;left:34px;top:${202 + k * 42}px;display:flex;gap:12px;align-items:center;opacity:0">
       <div style="width:26px;height:26px;border:3px solid ${M};border-radius:6px"></div>
       ${T(a, 46, 0, 26, { weight: 700, color: fg(id) })}</div>`).join("");
  const ticks = ["Push-T community", "ALOHA community"];
  const tickHtml = ticks.map((a, k) =>
    `<div id="k${k}" style="position:absolute;left:34px;top:${284 + k * 30}px;display:flex;gap:10px;align-items:center;opacity:0">
       <svg width="22" height="22" viewBox="0 0 22 22"><path d="M4,12 L9,17 L18,6" fill="none" stroke="${M}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
       ${T(a, 32, 0, 20, { weight: 500, color: M })}</div>`).join("");
  const lens = `<svg id="lns" style="position:absolute;left:34px;top:110px;overflow:visible;opacity:0" width="84" height="84" viewBox="0 0 120 120">
      <rect id="lnsD" x="6" y="16" width="88" height="70" rx="8" fill="none" stroke="${M}" stroke-width="3" pathLength="1" style="stroke-dasharray:1;stroke-dashoffset:1"/>
      <circle id="lnsL" cx="72" cy="72" r="30" pathLength="1" fill="none" stroke="${fg(id)}" stroke-width="5" style="stroke-dasharray:1;stroke-dashoffset:1"/>
      <line id="lnsH" x1="94" y1="94" x2="112" y2="112" pathLength="1" stroke="${fg(id)}" stroke-width="6" stroke-linecap="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>
    </svg>`;
  const body = cardHTML(id, x, y, w, h,
      T("before the takeaways", 34, 28, 20, { weight: 700, color: M, ls: 0.06, upper: true, id: "ey" }) +
      T("I built a profiler", 34, 56, 36, { weight: 900, cls: "disp", id: "hd" }) +
      lens + rowHtml + tickHtml +
      `<div id="own" style="position:absolute;left:34px;top:344px;padding:6px 14px;border:3px solid ${C.accent};border-radius:20px;opacity:0">
         ${TI("now: my own data", 22, { weight: 900, cls: "disp", color: C.accent })}</div>`);
  const tB = cueIn(id, "built a profiler");
  let js = wipeUp(`#${id}`, 0, 0.3) + rowUp("#hd", tB, 0.3);
  js += `tl.fromTo("#lns",{opacity:0},{opacity:1,duration:0.01,immediateRender:false},${f3(tB + 0.2)});\n`;
  js += drawOn("lnsD", tB + 0.2, 0.35) + drawOn("lnsL", tB + 0.5, 0.35) + drawOn("lnsH", tB + 0.8, 0.2);
  js += rowUp("#r0", cueIn(id, "any outliers"), 0.3) + rowUp("#r1", cueIn(id, "data is good"), 0.3);
  js += rowUp("#k0", cueIn(id, "Push-T community data"), 0.3) + rowUp("#k1", cueIn(id, "Aloha community data"), 0.3);
  js += pop("#own", cueIn(id, "my own data"), 0.3);
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}

// =================================================================== gZ15
// Dataset card: push_t_sim / fps 10, the features list scrolling as he reads it,
// 'no video captured' dashed with the reason 'machine capacity', LeRobot chip.
if (want("gZ15")) {
  const id = "gZ15", D = dur(id), [x, y, w, h] = boxOf(id);
  const M = dim(id), F = fg(id);
  const tN = cueIn(id, "push_t underscore sim");
  const tF = cueIn(id, "FPS 10");
  const tV = cueIn(id, "did not collect any");
  const tM = cueIn(id, "machine capacity");
  const feats = ["observation.image", "observation.state", "action", "timestamp", "episode_index", "frame_index", "task"];
  const scroll = feats.map((f, k) =>
    T("\u00b7  " + f, 44, 190 + k * 30, 24, { weight: k < 3 ? 700 : 500, color: k < 3 ? F : M, nowrap: true, id: `f${k}` })).join("");
  const body = cardHTML(id, x, y, w, h,
      EYEBROW("the dataset", 44, 34, M, "ey", 22) +
      `<span id="nm" style="position:absolute;left:44px;top:74px;white-space:nowrap;font-family:Satoshi;font-variation-settings:'wght' 900;font-size:56px;line-height:1;color:${F};opacity:0">push_t_sim</span>` +
      `<div id="fps" style="position:absolute;left:420px;top:84px;padding:8px 18px;border:3px solid ${F};border-radius:18px;opacity:0">
         ${TI("fps 10", 24, { weight: 900, cls: "disp" })}</div>` +
      `<div id="lerobot" style="position:absolute;left:44px;top:142px;padding:6px 14px;border:2px solid ${M};border-radius:14px;opacity:0">
         ${TI("LeRobot dataset", 20, { weight: 700, color: M })}</div>` +
      scroll +
      `<div id="nv" style="position:absolute;left:44px;top:412px;padding:9px 18px;border:3px dashed ${M};border-radius:20px;opacity:0">
         ${TI("no video captured", 22, { weight: 700, color: M })}</div>` +
      T("reason: machine capacity", 300, 420, 22, { weight: 500, color: M, id: "why" }));
  let js = wipeUp(`#${id}`, 0, 0.3);
  js += show("#nm", tN, 0.3) + show("#fps", tF, 0.3) + show("#lerobot", tF + 0.5, 0.3);
  // rows land in sequence while he reads them
  feats.forEach((f, k) => { js += show(`#f${k}`, tF + 0.5 + k * ((tV - tF - 0.7) / feats.length), 0.25); });
  js += show("#nv", tV, 0.3) + rowUp("#why", tM, 0.3);
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}

// =================================================================== gZ15b
// Punch-in on the collection loop: underline 'ds.add_frame' (OCR line
// 1132,1182), tiny frame-stack glyph filling once, then the punch releases to
// full screen.
if (want("gZ15b")) {
  const id = "gZ15b", D = dur(id), [x, y, w, h] = boxOf(id);
  const zid = "gZ15b";
  const [p0, p1] = plateau(zid, span(id)[0]);
  const bAdd = zm(zid, [1132, 1182, 1361, 1227]);              // ds.add_frame (OCR)
  const stack = [0, 1, 2].map(k =>
    `<rect id="fs${k}" x="${Math.max(60, bAdd[0] - 10) + k * 8}" y="${Math.max(120, bAdd[1] - 96) + 54 - k * 10}" width="70" height="46" rx="6" pathLength="1" fill="none" stroke="${W}" stroke-width="3" style="stroke-dasharray:1;stroke-dashoffset:1"/>`).join("");
  // composition pass 2 (F4): the beat rendered NO text at all. A code chip
  // lands beside the stack (26px clear of its right edge at 887.8; stage-
  // absolute like the marks), spelling exact to the OCR'd line. No monospace
  // face exists in assets/fonts (brand ships Satoshi only; system fonts are
  // banned by CLAUDE.md), so the chip uses the project's established code-ish
  // treatment: .disp 900 like gZ5's terminal counter and gZ15's "fps 10".
  // composition pass 2 (F4): the beat rendered NO text at all. A code chip
  // lands beside the stack at stage level (same treatment as gZ15c's schema
  // chip and the zoom-mapped marks: canvas coords, painted over the card):
  // stack right edge 887.8 + 26px, chip 914-1120 x 448-492, card face spans
  // 560-1400 x 160-760, so all of it is on the card and clear of the
  // underline (y 566+). Spelling exact to the OCR'd line "ds.add_frame". No
  // monospace face exists in assets/fonts (brand ships Satoshi only; system
  // fonts banned by CLAUDE.md), so the chip uses the established code-ish
  // treatment: .disp 900 like gZ5's terminal counter and gZ15's "fps 10".
  const body = cardHTML(id, x, y, w, h,
      `<div id="chipA" style="position:absolute;left:354px;top:288px;padding:8px 18px;border:3px solid ${W};border-radius:18px;opacity:0">
         ${TI("ds.add_frame", 24, { weight: 900, cls: "disp" })}</div>`)
    + underlineM("uAdd", bAdd, W, 6)
    + `<svg id="fsStack" style="position:absolute;left:0;top:0;overflow:visible" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${stack}</svg>`;
  let js = markLife("#uAdd", p0, 0.1, p1);
  js += show("#chipA", 0.35, 0.3);
  [0, 1, 2].forEach(k => { js += drawOn(`fs${k}`, p0 + 0.35 + k * 0.12, 0.25); });
  // long ambient drift keeps the seek sweep advancing across the plateau
  js += `tl.fromTo("#fsStack",{y:0},{y:-10,duration:${f3(Math.max(2, (p1 - p0) - 1.4))},ease:"none",immediateRender:false},${f3(p0 + 1.2)});\n`;
  emit(id, D, body, js);
}

// =================================================================== gZ15c
// Punch-in on the printed schema: the SQL key aliases are underlined as they
// appear (marks ONLY inside the plateau: the cell scrolls before 786.6). The
// convention is the point: he writes nothing, the format is already right.
// Composition pass 2026-11-12: the marks and the chip are zoom-mapped canvas
// coords (y659-806, x433-1485) while the opaque card spans y160-760 / x560-1360,
// so the two lower underlines and the chip hung BELOW the card's bottom edge and
// both ends ran past the card sides onto raw footage. The card's inner face is a
// dark rectangle with nothing drawn on it, so the stack is brought inside it:
// rows lifted 128px (canvas y531-678) and their x squeezed to 0.65 about the
// card's left inset (x640-1323), chip fully inside at (596,452). Every mark and
// the chip stay left of x1360 (D3 inset clearance; panel box [560,160,800,600]).
if (want("gZ15c")) {
  const id = "gZ15c", D = dur(id), [x, y, w, h] = boxOf(id);
  const zid = "gZ15c";
  const [p0, p1] = plateau(zid, span(id)[0]);
  // the four AS aliases OCR inside the zoom viewport (SQL lines y 1796-1948),
  // lifted into the card and re-scaled in x (composition pass 2026-11-12)
  const LIFT = 128, X0 = 640, XS = 0.65;
  const keys = [
    [1255, 1796, 2064, 1835], [1255, 1836, 2053, 1874],
    [1255, 1875, 1886, 1915], [1255, 1914, 1868, 1948]];
  let body = cardHTML(id, x, y, w, h, "");
  let js = "";
  keys.forEach((sb, k) => {
    const b = zm(zid, sb);
    const x0 = X0, x1 = X0 + (b[2] - b[0]) * XS;
    body += underlineM("k" + k, [x0, b[1] - LIFT, x1, b[3] - LIFT], W, 4);
    // composition pass 2 (F5): the rules are card content (lifted/re-scaled in
    // pass 1, they no longer track live screen lines), so they draw from 0.32s
    // staggered and STAY: the card is never bare. No plateau fade.
    js += drawOn("k" + k, 0.32 + k * 0.18, 0.4);
  });
  // two rules carry their field names (exact spellings, as read aloud in gZ15).
  // 24px, in the 50px gutters between rules: k0 label 537.5-564.4 vs k1 line
  // 582.2 (18px), k1 label 588.5-615.4 vs k2 line 635.5 (20px). No accent.
  body += `<span id="lb0" style="position:absolute;left:652px;top:537px;font-family:Satoshi,sans-serif;font-variation-settings:'wght' 700;font-size:24px;color:${W};white-space:nowrap;opacity:0">observation.state</span>`;
  body += `<span id="lb1" style="position:absolute;left:652px;top:588px;font-family:Satoshi,sans-serif;font-variation-settings:'wght' 700;font-size:24px;color:${W};white-space:nowrap;opacity:0">action</span>`;
  const tS = cueIn(id, "schema");
  const chip = `<div id="sch" style="position:absolute;left:596px;top:452px;padding:8px 16px;border:3px solid ${W};border-radius:20px;opacity:0">
      ${TI("LeRobot schema: it just follows it", 22, { weight: 700, color: W })}</div>`;
  body += chip;
  // F5: the chip no longer waits for the plateau (it waited to 2.9s of a 5.3s
  // part while the card sat bare); it lands with the seeded rules.
  js += show("#sch", Math.max(0.6, tS + 0.3), 0.3)
      + show("#lb0", 0.9, 0.3) + show("#lb1", 1.35, 0.3);
  emit(id, D, body, js);
}

// =================================================================== gZ16
// Dataset size: '1,050 episodes' 160px; the split lands beneath on 'a thousand
// ... 50': 1,000 random muted + 50 diffusion as the accent sliver of one bar.
if (want("gZ16")) {
  const id = "gZ16", D = dur(id), [x, y, w, h] = boxOf(id);
  const M = dim(id);
  const t1 = cueIn(id, "1,050 episodes");
  const tR = cueIn(id, "1,000 are purely");
  const tD = cueIn(id, "50 of them");
  const body = cardHTML(id, x, y, w, h,
      EYEBROW("what he collected", 44, 34, M, "ey", 22) +
      `<span id="ep" style="position:absolute;left:44px;top:80px;font-family:Satoshi;font-variation-settings:'wght' 900;font-size:160px;line-height:1;opacity:0">0</span>` +
      `<div id="epw" style="position:absolute;left:44px;top:266px;font-family:Satoshi;font-variation-settings:'wght' 900;font-size:64px;color:${M};opacity:0">episodes</div>` +
      `<div id="b1" style="position:absolute;left:44px;top:380px;width:488px;height:36px;background:${M};border-radius:6px;opacity:0"></div>
       <div id="b2" style="position:absolute;left:44px;top:380px;width:488px;height:36px;background:${C.accent};border-radius:6px;transform:scaleX(0);transform-origin:left center;opacity:0"></div>` +
      T("1,000 random policies", 44, 428, 24, { weight: 700, color: M, id: "c1" }) +
      T("50 diffusion", 300, 428, 24, { weight: 900, cls: "disp", color: C.accent, id: "c2" }));
  let js = wipeUp(`#${id}`, 0, 0.3);
  js += `tl.fromTo("#ep",{opacity:0},{opacity:1,duration:0.01,immediateRender:false},${f3(t1)});\n`
      + countUp("#ep", 0, 1050, t1, 0.9) + rowUp("#epw", t1 + 0.4, 0.3);
  js += show("#b1", tR, 0.3) + rowUp("#c1", tR + 0.1, 0.3);
  js += `tl.fromTo("#b2",{opacity:0},{opacity:1,duration:0.01,immediateRender:false},${f3(tD)});\n`
      + `tl.fromTo("#b2",{scaleX:0},{scaleX:1,duration:0.5,ease:"power2.out",immediateRender:false},${f3(tD)});\n`
      + rowUp("#c2", tD + 0.25, 0.3);
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}

// =================================================================== gZ16b
// '~300k frames' 160px beside a frame-stack glyph, caption '1,000 x 300 steps'
// (all the random ones ran the full 300).
if (want("gZ16b")) {
  const id = "gZ16b", D = dur(id), [x, y, w, h] = boxOf(id);
  const M = dim(id);
  const tK = cueIn(id, "300 uh k plus frames");
  // composition pass 2 (F2): the stack used to start at local x430 and the
  // leftmost rect drew THROUGH the "k" of "300k" (stat ends at 456). Base moved
  // 430 -> 478: nearest rect edge 478, 22px clear of the glyph (>=20 rule);
  // rightmost 478+21+90 = 589 inside the card face (594).
  const stack = [0, 1, 2, 3].map(k =>
    `<rect x="${478 + (3 - k) * 7}" y="${120 + k * 14}" width="90" height="56" rx="8" fill="none" stroke="${M}" stroke-width="3"/>`).join("");
  const body = cardHTML(id, x, y, w, h,
      `<span id="k" style="position:absolute;left:44px;top:88px;font-family:Satoshi;font-variation-settings:'wght' 900;font-size:160px;line-height:1;opacity:0">0</span>
       <div id="kw" style="position:absolute;left:44px;top:274px;font-family:Satoshi;font-variation-settings:'wght' 900;font-size:64px;color:${M};opacity:0">frames</div>` +
      `<svg style="position:absolute;left:0;top:0;overflow:visible" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${stack}</svg>` +
      T("1,000 episodes x 300 steps", 44, 380, 26, { weight: 500, color: M, id: "cap" }));
  let js = wipeUp(`#${id}`, 0, 0.25);
  js += `tl.fromTo("#k",{opacity:0},{opacity:1,duration:0.01,immediateRender:false},${f3(tK)});\n`
      + countUp("#k", 0, 300, tK, 0.8, 0, "", "k") + rowUp("#kw", tK + 0.3, 0.3) + rowUp("#cap", tK + 0.6, 0.3);
  emit(id, D, body, js);
}

// =================================================================== gZ16b2
// Metadata vs data check: two stacked tiles with counters; on 'they match
// exactly' an = lights between them; on 'count of zero' a check stamp. Verify,
// don't assume: the data-engineering discipline beat.
// Composition pass 2026-11-12: content ended near y446 of the 620 box, a ~30%
// dead bottom. Tiles grew 110 to 130 tall (counters vertically centered), the
// gap + = moved with them, and the check row dropped to 470: content now runs to
// ~518, and the widest row (the check line, 60+324 = 384 inside 600) is clear.
if (want("gZ16b2")) {
  const id = "gZ16b2", D = dur(id), [x, y, w, h] = boxOf(id);
  const M = dim(id), F = fg(id);
  const tM = cueIn(id, "they match exactly");
  const tZ = cueIn(id, "count of zero");
  const tile = (iy, name, cid) => `<div style="position:absolute;left:44px;top:${iy}px;width:512px;height:130px;border:3px solid ${M};border-radius:12px">
      ${T(name, 18, 20, 24, { weight: 700, color: M, upper: true, ls: 0.12 })}
      <span id="${cid}" style="position:absolute;right:20px;top:42px;font-family:Satoshi;font-variation-settings:'wght' 900;font-size:56px;color:${F}">0</span></div>`;
  // composition pass 2 (F6): check row bottom ~local 509 of 620; trimmed to 540
  // inside the declared box (gZ10/gZ14 precedent).
  const body = cardHTML(id, x, y, w, 540,
      EYEBROW("verify, don't assume", 44, 34, M, "ey", 22) +
      T("metadata vs data", 44, 62, 34, { w: 500, weight: 900, cls: "disp", id: "hd" }) +
      tile(120, "metadata count", "m1") + tile(308, "data count", "m2") +
      `<span id="eq" style="position:absolute;left:284px;top:250px;font-family:Satoshi;font-variation-settings:'wght' 900;font-size:52px;color:${C.accent};opacity:0">=</span>` +
      `<div id="ok" style="position:absolute;left:44px;top:470px;display:flex;gap:12px;align-items:center;opacity:0">
         ${tickSVG("ck", 24, 24, 20, C.accent)}${T("everything matches", 60, 10, 26, { weight: 700, color: F })}</div>`);
  let js = wipeUp(`#${id}`, 0, 0.3) + rowUp("#hd", 0.1, 0.3);
  const t0 = Math.max(0.4, Math.min(tM - 2.2, D - 4));
  js += countUp("#m1", 0, 1050, t0, 1.0) + countUp("#m2", 0, 1050, t0 + 0.35, 1.0);
  js += pop("#eq", tM, 0.25);
  js += `tl.fromTo("#ok",{opacity:0},{opacity:1,duration:0.01,immediateRender:false},${f3(tZ)});\n`;
  js += tickIn("ck", tZ, 0.45);
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}

// =================================================================== gZ17
// Two datasets, one task: left '1,000 random / all failures', right '50
// diffusion / 36 successes'; on 'would skew my data' the left tile slides
// behind a split line. 'split by task' chip closes the beat.
if (want("gZ17")) {
  const id = "gZ17", D = dur(id), [x, y, w, h] = boxOf(id);
  const M = dim(id), F = fg(id);
  const tF = cueIn(id, "all have failures");
  const tS = cueIn(id, "would skew my data");
  const tile = (iid, ix, name, cnt, note, good) => `<div id="${iid}" style="position:absolute;left:${ix}px;top:140px;width:240px;height:240px;border:3px solid ${good ? F : M};border-radius:14px">
      ${T(name, 16, 14, 22, { weight: 700, color: M, upper: true, ls: 0.1 })}
      <span style="position:absolute;left:16px;top:56px;white-space:nowrap;font-family:Satoshi;font-variation-settings:'wght' 900;font-size:52px;color:${F}">${cnt}</span>
      ${T(note, 16, 160, 22, { w: 208, weight: 500, color: M })}</div>`;
  const body = cardHTML(id, x, y, w, h,
      EYEBROW("one task, two policies", 44, 34, M, "ey", 22) +
      T("they cannot share a training set", 44, 62, 32, { w: 520, weight: 900, cls: "disp", id: "hd" }) +
      tile("tl", 44, "random", "1,000", "all failures", false) + tile("tr", 316, "diffusion", "36 / 50", "successes", true) +
      `<div id="split" style="position:absolute;left:300px;top:132px;width:4px;height:256px;background:${F};transform:scaleY(0);transform-origin:center;opacity:0"></div>` +
      `<div id="chipS" style="position:absolute;left:44px;top:420px;padding:9px 18px;border:3px solid ${F};border-radius:22px;opacity:0">
         ${TI("split by task", 24, { weight: 900, cls: "disp" })}</div>`);
  let js = wipeUp(`#${id}`, 0, 0.3) + rowUp("#hd", 0.1, 0.3);
  js += rowUp("#tl", Math.min(0.5, tF - 1.2), 0.35) + rowUp("#tr", Math.min(0.8, tF - 0.8), 0.35);
  // slow ambient lift keeps geometry advancing through the long middle (sweep_static)
  js += `tl.fromTo("#tr",{y:0},{y:-7,duration:${f3(Math.max(3, tS - 3))},ease:"sine.inOut",immediateRender:false},2.4);\n`;
  // composition pass 2026-11-12: the divider used to scale in AT tS, the same
  // frame the random tile starts sliding right, so for ~0.5s the line sliced
  // through the "1,000" digits mid-move. It is pinned to the gutter x (300, the
  // 284-316 gap) for its whole life, and its entrance waits until the tile has
  // settled. The slide lead-in also moved 0.15s ahead of the cue (a normal
  // reaction lead) so the settled beat + divider + chip land BEFORE the part's
  // exit wipe (starts D-0.333 = 20.44). The slide is 110 to 84px: "1,000"
  // measures 149px at 52, so the faded digits rest at 144-293 (frame 128-368,
  // behind the gutter: the intended read) and sweep at most 60-293 while
  // moving. The divider at 300-304 never crosses the digits, 7px clear.
  js += `tl.fromTo("#split",{scaleY:0,opacity:0},{scaleY:1,opacity:1,duration:0.3,ease:"power2.out",immediateRender:false},${f3(tS + 0.42)});\n`;
  js += `tl.fromTo("#tl",{x:0,opacity:1},{x:84,opacity:0.25,duration:0.5,ease:"power2.inOut",immediateRender:false},${f3(tS - 0.15)});\n`;
  js += show("#chipS", tS + 0.55, 0.3);
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}

// =================================================================== gZ17b
// The episode-length picture over the real histogram: random rows pin at the
// 300 cap (flat ceiling), diffusion rows spread 50-300 with early finishers
// $accent-soft; a marker at 250 'success sooner'.
if (want("gZ17b")) {
  const id = "gZ17b", D = dur(id), [x, y, w, h] = boxOf(id);
  const M = dim(id), F = fg(id);
  const t3 = cueIn(id, "all have 300 frames");
  const t5 = cueIn(id, "50 to 300");
  const tS = cueIn(id, "succeed");
  const X0 = 60, XW = 470, baseY = 470;
  const barX = v => X0 + (v / 300) * XW;
  const random = [296, 300, 300, 298, 300, 300].map((v, k) =>
    `<rect id="r${k}" x="${barX(2)}" y="${baseY - 26 * (k + 1) - 4 * k}" width="${barX(v) - barX(2)}" height="26" fill="${M}" opacity=".8"/>`).join("");
  const diff = [52, 96, 148, 210, 258, 300].map((v, k) =>
    `<rect id="d${k}" x="${barX(2)}" y="${baseY - 26 * (k + 1) - 4 * k}" width="${barX(v) - barX(2)}" height="26" fill="${k < 4 ? C.accentSoft : F}"/>`).join("");
  const svg = `<svg style="position:absolute;left:0;top:0;overflow:visible" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <line x1="${X0}" y1="${baseY + 4}" x2="${X0 + XW}" y2="${baseY + 4}" stroke="${M}" stroke-width="3"/>
      ${random}${diff}
      <line id="mk" x1="${barX(250)}" y1="${baseY - 186}" x2="${barX(250)}" y2="${baseY + 4}" pathLength="1" stroke="${F}" stroke-width="3" stroke-dasharray="8 7"/>
    </svg>`;
  const body = cardHTML(id, x, y, w, h,
      EYEBROW("episode length, 1,050 rolls", 44, 34, M, "ey", 22) +
      T("random: every episode pinned at the cap", 44, 62, 28, { w: 520, weight: 700, cls: "disp", id: "hd" }) +
      svg +
      T("300", barX(300) - 20, baseY + 12, 20, { weight: 700, color: M, id: "l300" }) +
      T("success sooner", barX(250) - 30, baseY - 214, 22, { w: 130, weight: 700, color: F, id: "ms" }) +
      T("diffusion: 50 to 300", 44, baseY + 40, 22, { weight: 500, color: M, id: "l5" }));
  let js = wipeUp(`#${id}`, 0, 0.3) + rowUp("#hd", Math.max(0.1, t3 - 1.2), 0.3);
  [0, 1, 2, 3, 4, 5].forEach(k => {
    js += `tl.fromTo("#r${k}",{scaleX:0,transformOrigin:"left center"},{scaleX:1,duration:0.25,ease:"power2.out",immediateRender:false},${f3(t3 + k * 0.1)});\n`;
  });
  [0, 1, 2, 3, 4, 5].forEach(k => {
    js += `tl.fromTo("#d${k}",{scaleX:0,transformOrigin:"left center"},{scaleX:1,duration:0.25,ease:"power2.out",immediateRender:false},${f3(t5 + k * 0.12)});\n`;
  });
  js += rowUp("#l5", t5, 0.3) + rowUp("#l300", t3 + 0.5, 0.3);
  js += drawOn("mk", tS, 0.3) + rowUp("#ms", tS + 0.2, 0.3);
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}

// =================================================================== gZ18
// 'IQR = 161' 160px; a whisker band under it marks the 139-300 outlier window as
// he says 'below 139'. Composition pass 2026-11-12: the whisker track crossed the
// digits mid-glyph. The stat is now a flex row (like gZ13's "80-90"/"min"):
// 'IQR' 88px muted + '161' 160px in-flow (the number keeps the 160 floor,
// measured 233px; 'IQR' 173px at 88, row 44+173+14+233 = 464 inside 594). The
// whisker band moved to y345-375, 96px below the digits' ink bottom (249+20
// clearance met: 338 tick top, 89px past the ink). Labels sit under the bar.
if (want("gZ18")) {
  const id = "gZ18", D = dur(id), [x, y, w, h] = boxOf(id);
  const M = dim(id);
  const tI = cueIn(id, "IQR is 161");
  const tB = cueIn(id, "below 139");
  const X0 = 44, XW = 480;
  const bx = v => X0 + (v / 300) * XW;
  const body = cardHTML(id, x, y, w, h,
      EYEBROW("spread of the diffusion rollouts", 44, 34, M, "ey", 22) +
      `<div id="iqrRow" style="position:absolute;left:44px;top:84px;display:flex;align-items:baseline;gap:14px;opacity:0">
         ${TI("IQR", 88, { weight: 900, cls: "disp", color: M })}
         <span id="iqr" style="white-space:nowrap;font-family:Satoshi;font-variation-settings:'wght' 900;font-size:160px;line-height:1">0</span>
       </div>` +
      `<svg style="position:absolute;left:0;top:0;overflow:visible" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
         <line x1="${X0}" y1="360" x2="${X0 + XW}" y2="360" stroke="${M}" stroke-width="3"/>
         <line id="w1" x1="${bx(139)}" y1="338" x2="${bx(139)}" y2="382" stroke="${M}" stroke-width="4" opacity="0"/>
         <line id="w2" x1="${bx(300)}" y1="338" x2="${bx(300)}" y2="382" stroke="${M}" stroke-width="4" opacity="0"/>
         <rect id="band" x="${bx(139)}" y="345" width="${bx(300) - bx(139)}" height="30" rx="6" fill="${M}" opacity="0"/>
       </svg>` +
      T("139", bx(139) - 14, 394, 22, { weight: 700, color: M, id: "v139" }) +
      T("300", bx(300) - 14, 394, 22, { weight: 700, color: M, id: "v300" }) +
      T("outlier window", 44, 448, 22, { weight: 500, color: M, id: "ow" }));
  let js = wipeUp(`#${id}`, 0, 0.3);
  js += `tl.fromTo("#iqrRow",{opacity:0},{opacity:1,duration:0.01,immediateRender:false},${f3(tI)});\n`
      + countUp("#iqr", 0, 161, tI, 0.8);
  js += `tl.fromTo("#band",{opacity:0,scaleX:0,transformOrigin:"left center"},{opacity:1,scaleX:1,duration:0.5,ease:"power2.out",immediateRender:false},${f3(tB)});\n`;
  js += `tl.fromTo("#w1",{opacity:0},{opacity:1,duration:0.2,immediateRender:false},${f3(tB)});\n`;
  js += `tl.fromTo("#w2",{opacity:0},{opacity:1,duration:0.2,immediateRender:false},${f3(tB + 0.35)});\n`;
  js += show("#v139", tB, 0.25) + show("#v300", tB + 0.35, 0.25) + rowUp("#ow", tB + 0.6, 0.3);
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}

// =================================================================== gZ19
// The profiler checklist over the report: five rows tick as he clears them. All
// ticks muted except the last ('no cameras'), which carries the one accent.
// Composition pass 2026-11-12: the circled icons sat ON the first 2-4 characters
// of every row (the row text is an absolute span, so it ignored the flex gap and
// started at left 0). Text now starts at x60 inside each row: the 40px circle
// plus a 20px gap. Icons, ticks, and copy unchanged.
if (want("gZ19")) {
  const id = "gZ19", D = dur(id), [x, y, w, h] = boxOf(id);
  const M = dim(id), F = fg(id);
  const rows = [
    ["idle episodes", cueIn(id, "idle episodes"), false],
    ["no dead joints", cueIn(id, "no dead joints"), false],
    ["no null values", cueIn(id, "null values"), false],
    ["no nan values", cueIn(id, "nan values"), false],
    ["no cameras, I didn't record them", cueIn(id, "No cameras"), true],
  ];
  const rowHtml = rows.map(([txt, , acc], k) =>
    `<div id="row${k}" style="position:absolute;left:44px;top:${150 + k * 74}px;display:flex;align-items:center;gap:16px;opacity:0">
       <svg width="40" height="40" viewBox="0 0 40 40"><circle id="tc${k}" cx="20" cy="20" r="17" pathLength="1" fill="none" stroke="${acc ? C.accent : M}" stroke-width="3.5" style="stroke-dasharray:1;stroke-dashoffset:1"/>
         <path id="tm${k}" d="M11,20 L17,27 L29,13" pathLength="1" fill="none" stroke="${acc ? C.accent : M}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray:1;stroke-dashoffset:1"/></svg>
       ${T(txt, 60, 4, 28, { weight: acc ? 900 : 500, cls: acc ? "disp" : "", color: acc ? F : M })}</div>`).join("");
  // composition pass 2 (F6): five rows end ~local 486 of 620 on a 31.7s part
  // (worst offender); card trimmed to 520 inside the declared box.
  const body = cardHTML(id, x, y, w, 520,
      EYEBROW("the profiler, on my own data", 44, 34, M, "ey", 22) +
      T("what did I measure?", 44, 62, 38, { w: 520, weight: 900, cls: "disp", id: "hd" }) + rowHtml);
  let js = wipeUp(`#${id}`, 0, 0.3) + rowUp("#hd", 0.1, 0.3);
  rows.forEach(([, t], k) => {
    const tt = Math.min(t, D - 1.2);
    js += `tl.fromTo("#row${k}",{opacity:0},{opacity:1,duration:0.25,immediateRender:false},${f3(tt)});\n`;
    js += drawOn(`tc${k}`, tt + 0.1, 0.3) + drawOn(`tm${k}`, tt + 0.35, 0.3);
  });
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}
