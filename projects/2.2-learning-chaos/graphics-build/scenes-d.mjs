// Scenes D: the tail of the demo (profiler verdicts), the takeaways, the quote
// echo pair, the next-episode preview, the ask, and the end card.
import { C, emit, span, frames, cueIn, panelClass, fg, dim, wipeUp, boxOf, struck, strikeIn } from "./lib.mjs";
import { T, EYEBROW, cardHTML, show, hide, drawOn, rowUp, pop, countUp,
         tickSVG, tickIn, ruleIn, f3, exitIfFree, TI } from "./hb.mjs";
import { want } from "./only.mjs";
const dur = id => frames(id) / 30;

// a line-art parrot on a perch, drawn from separate strokes so each can draw on.
// authored 220x240 frame; W/H scale the rendered size (viewBox keeps the
// geometry, right-plate cards at 500x480 draw it smaller, sw raised to keep
// the on-screen stroke weight). Position it by replacing the style at the call site.
const parrot = (id, col, sw = 5, W = 220, H = 240) => {
  const s = `fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"`;
  const p = (iid, d) => `<path id="${iid}" d="${d}" pathLength="1" ${s} style="stroke-dasharray:1;stroke-dashoffset:1"/>`;
  return `<svg id="${id}" style="position:absolute;overflow:visible;opacity:0" width="${W}" height="${H}" viewBox="0 0 220 240">
    ${p(id + "b", "M120,40 C70,48 48,96 62,140 C70,166 96,182 120,182 C150,182 168,160 168,128 C168,92 154,60 132,46")}
    ${p(id + "h", "M120,40 C128,22 148,18 158,30 C166,40 160,54 146,58")}
    ${p(id + "k", "M156,42 C176,44 186,56 180,66 C174,74 162,70 158,62")}
    ${p(id + "w", "M92,96 C118,108 128,140 116,168")}
    ${p(id + "t", "M62,150 C40,168 26,196 24,222")}
    ${p(id + "p", "M14,196 L206,196")}
    ${p(id + "f", "M104,182 L104,196 M130,180 L130,196")}
    <circle id="${id}e" cx="146" cy="40" r="4" fill="${col}" opacity="0"/>
  </svg>`;
};
const parrotIds = id => [id + "b", id + "h", id + "k", id + "w", id + "t", id + "p", id + "f"];
const place = (html, x, y) => html.replace('style="position:absolute;overflow:visible;opacity:0"',
  `style="position:absolute;left:${x}px;top:${y}px;overflow:visible;opacity:0"`);

// =================================================================== gZ19b
// '36 succeeded / 1,050' 160px with the reason line under it: '1,000 of them
// are random policies' landing on the explanation. The number that makes the
// low rate make sense.
if (want("gZ19b")) {
  const id = "gZ19b", D = dur(id), [x, y, w, h] = boxOf(id);
  const M = dim(id);
  const t3 = cueIn(id, "36 succeeded");
  const tR = cueIn(id, "1,000 of them are random policies");
  // Composition pass 2 F6 (dead bottom): the fixed 620 card ended ~48% filled.
  // Height-fit to the content (552, inside the declared box), and the type
  // grew into the space: "succeeded" 56->64, the reason line 30->34 (PIL
  // Satoshi: at 34 it wraps after "random", 2 lines inside w 500), plus wider
  // leading between the blocks. The stat stays at the 160 floor: it grew
  // nothing and lost nothing.
  const H = 552;
  const body = cardHTML(id, x, y, w, H,
      EYEBROW("so why 36 out of 1,050?", 44, 34, M, "ey", 22) +
      `<span id="n1" style="position:absolute;left:44px;top:92px;font-family:Satoshi;font-variation-settings:'wght' 900;font-size:160px;line-height:1;opacity:0">0</span>
       <span id="of" style="position:absolute;left:260px;top:124px;font-family:Satoshi;font-variation-settings:'wght' 900;font-size:88px;line-height:1;color:${M};opacity:0">/ 1,050</span>` +
      `<div id="su" style="position:absolute;left:44px;top:300px;font-family:Satoshi;font-variation-settings:'wght' 900;font-size:64px;color:${M};opacity:0">succeeded</div>` +
      T("1,000 of them are random policies", 44, 424, 34, { w: 500, weight: 700, color: M, id: "why" }));
  let js = wipeUp(`#${id}`, 0, 0.3);
  js += `tl.fromTo("#n1",{opacity:0},{opacity:1,duration:0.01,immediateRender:false},${f3(t3)});\n`
      + countUp("#n1", 0, 36, t3, 0.8) + rowUp("#of", t3 + 0.25, 0.3) + rowUp("#su", t3 + 0.45, 0.3);
  js += rowUp("#why", tR, 0.35);
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}

// =================================================================== gZ19c
// 'The profiler itself works' (right plate): same profiler, my own data. A mini
// filter diagram (one queue splits by policy) and the 'summary written to file
// system' footer tick. The profiler earns its keep before the takeaways.
if (want("gZ19c")) {
  const id = "gZ19c", D = dur(id), [x, y, w, h] = boxOf(id);
  const M = dim(id), F = fg(id);
  const tW = cueIn(id, "itself works");
  const tF = cueIn(id, "written down into the file system");
  // Composition pass 2 F1 (2026-11-13): every run was 15/18/19px. Floored to 20/22
  // and re-laid out inside the declared 340x400 (never clipped): eyebrow 15->20
  // (ls tightened 0.16->0.06 so it still fits the card width), chip 19->22, SVG
  // labels 17->20, diagram squashed 180->150 tall, fs row pulled to 344->336.
  // All widths PIL-measured on Satoshi-Black (an upper bound: the runs set
  // 500/700/900 wght). Card bottom 400 holds: lowest ink (fs row text) ~362.
  const diag = `<svg id="fl" style="position:absolute;left:34px;top:156px;overflow:visible;opacity:0" width="272" height="150" viewBox="0 0 272 150">
      <rect x="4" y="48" width="70" height="54" rx="8" fill="${M}" fill-opacity=".16" stroke="${M}" stroke-width="3"/>
      <text x="39" y="81" text-anchor="middle" font-family="Satoshi" font-variation-settings:'wght' 700" font-size="20" fill="${F}">data</text>
      <path id="f1" d="M74,60 C120,60 130,36 176,32" pathLength="1" fill="none" stroke="${F}" stroke-width="3.5" stroke-linecap="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>
      <path id="f2" d="M74,92 C120,92 130,114 176,118" pathLength="1" fill="none" stroke="${F}" stroke-width="3.5" stroke-linecap="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>
      <rect x="178" y="14" width="88" height="38" rx="8" fill="none" stroke="${F}" stroke-width="3"/>
      <rect x="178" y="100" width="88" height="38" rx="8" fill="none" stroke="${F}" stroke-width="3"/>
      <text x="222" y="39" text-anchor="middle" font-family="Satoshi" font-variation-settings:'wght' 700" font-size="20" fill="${F}">random</text>
      <text x="222" y="125" text-anchor="middle" font-family="Satoshi" font-variation-settings:'wght' 700" font-size="20" fill="${F}">diffusion</text>
    </svg>` +
    T("filter by task type", 34, 312, 20, { w: 272, align: "center", weight: 500, color: M, id: "cap" });
  const body = cardHTML(id, x, y, w, h,
      EYEBROW("before the takeaways", 34, 28, M, "ey", 20, 0.06) +
      `<div id="chip" style="position:absolute;left:34px;top:60px;padding:9px 18px;border:3px solid ${F};border-radius:22px;opacity:0">
         ${TI("the profiler itself works", 22, { weight: 900, cls: "disp" })}</div>` +
      T("same profiler, my own data", 34, 124, 22, { weight: 500, color: M, id: "sub" }) +
      diag +
      `<div id="fs" style="position:absolute;left:34px;top:336px;display:flex;gap:10px;align-items:center;opacity:0">
         ${tickSVG("ck", 18, 18, 15, M)}${T("written to file system", 44, 8, 20, { weight: 700, color: M, lh: 1.1 })}</div>`);
  let js = wipeUp(`#${id}`, 0, 0.3);
  js += pop("#chip", tW, 0.3) + rowUp("#sub", tW + 0.3, 0.3);
  js += `tl.fromTo("#fl",{opacity:0},{opacity:1,duration:0.3,immediateRender:false},${f3(tW + 0.7)});\n`;
  js += drawOn("f1", tW + 1.0, 0.4) + drawOn("f2", tW + 1.25, 0.4) + rowUp("#cap", tW + 1.6, 0.3);
  js += `tl.fromTo("#fs",{opacity:0},{opacity:1,duration:0.01,immediateRender:false},${f3(tF)});\n`;
  js += tickIn("ck", tF, 0.45);
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}

// =================================================================== gZ20
// Takeaway lead-in: 'LLMs are just parrots?' Parrot silhouette (line art) left;
// right, a search-thread glyph: 'AI parrot', 'LLM star parrot'. One accent: the
// search box. Sets up gZ21.
if (want("gZ20")) {
  const id = "gZ20", D = dur(id), [x, y, w, h] = boxOf(id);
  const M = dim(id), F = fg(id);
  const tP = cueIn(id, "parrots");
  const tC = cueIn(id, "whole corpus");
  const tS = cueIn(id, "massive search");
  const tA = cueIn(id, "AI parrot");
  const tL = cueIn(id, "LLM star parrot");
  const search = `<svg id="sr" style="position:absolute;left:228px;top:112px;overflow:visible;opacity:0" width="232" height="232" viewBox="0 0 240 240">
      <rect id="sbox" x="4" y="8" width="232" height="52" rx="26" pathLength="1" fill="none" stroke="${C.accent}" stroke-width="4" style="stroke-dasharray:1;stroke-dashoffset:1"/>
      <circle id="smag" cx="210" cy="34" r="12" pathLength="1" fill="none" stroke="${C.accent}" stroke-width="3.5" style="stroke-dasharray:1;stroke-dashoffset:1"/>
      <line id="shnd" x1="219" y1="43" x2="230" y2="54" pathLength="1" stroke="${C.accent}" stroke-width="3.5" stroke-linecap="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>
      <line id="sr1" x1="10" y1="118" x2="230" y2="118" pathLength="1" stroke="${M}" stroke-width="3" stroke-linecap="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>
      <line id="sr2" x1="10" y1="152" x2="180" y2="152" pathLength="1" stroke="${M}" stroke-width="3" stroke-linecap="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>
      <line id="sr3" x1="10" y1="206" x2="230" y2="206" pathLength="1" stroke="${M}" stroke-width="3" stroke-linecap="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>
      <line id="sr4" x1="10" y1="240" x2="150" y2="240" pathLength="1" stroke="${M}" stroke-width="3" stroke-linecap="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>
    </svg>`;
  // 500x480 right plate: header full width, parrot scaled to a 114x125 column
  // bottom-left, search glyph as a 232 column right. Query labels sit just
  // above the result lines AT REST AFTER the ambient drift (-7), so the
  // pairing lands where drawn. One accent: the search box.
  const body = cardHTML(id, x, y, w, h,
      EYEBROW("takeaway, coming up", 34, 30, M, "ey", 20) +
      T("LLMs are just parrots?", 34, 62, 36, { w: 432, weight: 900, cls: "disp", id: "hd" }) +
      place(parrot("prt", F, 7, 114, 125), 34, 140) +
      search +
      T("it recites the whole corpus", 34, 292, 22, { w: 200, weight: 500, color: M, id: "cp" }) +
      T("AI parrot", 250, 194, 20, { weight: 700, color: M, id: "q1" }) +
      T("LLM star parrot", 250, 279, 20, { weight: 700, color: M, id: "q2" }));
  let js = wipeUp(`#${id}`, 0, 0.3) + rowUp("#hd", 0.1, 0.3);
  js += `tl.fromTo("#prt",{opacity:0},{opacity:1,duration:0.01,immediateRender:false},${f3(tP)});\n`;
  parrotIds("prt").forEach((pn, k) => { js += drawOn(pn, tP + k * 0.14, 0.35); });
  js += `tl.fromTo("#prt" + "e",{opacity:0},{opacity:1,duration:0.2,immediateRender:false},${f3(tP + 0.9)});\n`;
  js += rowUp("#cp", tC, 0.3);
  js += `tl.fromTo("#sr",{opacity:0},{opacity:1,duration:0.01,immediateRender:false},${f3(tS)});\n`;
  js += drawOn("sbox", tS, 0.4) + drawOn("smag", tS + 0.25, 0.25) + drawOn("shnd", tS + 0.45, 0.15);
  js += drawOn("sr1", tA, 0.3) + drawOn("sr2", tA + 0.15, 0.3) + show("#q1", tA + 0.1, 0.25);
  js += drawOn("sr3", tL, 0.3) + drawOn("sr4", tL + 0.15, 0.3) + show("#q2", tL + 0.1, 0.25);
  // sweep_static: 15.6s part, nothing moves 6.9-13.7. One ambient lift of the
  // search glyph across the dead middle, done before the queries land.
  js += `tl.fromTo("#sr",{y:0},{y:-7,duration:6,ease:"sine.inOut",immediateRender:false},7.2);\n`;
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}

// =================================================================== gZ20b
// Quote echo card (g02's voice returns, right plate): the biological
// intelligence half, attribution Dennis Noble. Aside chip: his own joke.
if (want("gZ20b")) {
  const id = "gZ20b", D = dur(id), [x, y, w, h] = boxOf(id);
  const M = dim(id);
  const tB = cueIn(id, "In biological intelligence");
  const tC = cueIn(id, "cellular processes");
  const tJ = cueIn(id, "not a biologist");
  const body = cardHTML(id, x, y, w, h,
      EYEBROW("dennis noble, again", 34, 34, M, "ey", 20) +
      T("In biological intelligence,", 34, 86, 30, { w: 400, weight: 900, cls: "disp", lh: 1.16, id: "l1" }) +
      T("the cellular processes", 34, 190, 30, { w: 400, weight: 900, cls: "disp", lh: 1.16, id: "l2" }) +
      T("are stochastic.", 34, 232, 30, { w: 400, weight: 900, cls: "disp", lh: 1.16, color: C.accent, id: "l3" }) +
      T("There is a certain level", 34, 300, 28, { w: 400, weight: 500, lh: 1.2, id: "l4" }) +
      T("of randomness...", 34, 342, 28, { w: 400, weight: 500, lh: 1.2, id: "l5" }) +
      `<div id="att" style="position:absolute;left:34px;top:396px;font-family:Satoshi;font-variation-settings:'wght' 700;font-size:22px;color:${M};opacity:0">Dennis Noble</div>` +
      // pass 2 F1 (2026-11-13): chip 18->20px. PIL (Satoshi, wght 500, the run's
      // real weight; Black-measured 238 as the bound): the line is ~229 at 20,
      // chip right edge 34+28+4+238=304 inside 494, bottom 444+14+4+22=484...
      // pulled up to 438 for the 2px taller line.
      `<div id="joke" style="position:absolute;left:34px;top:428px;padding:7px 14px;border:2px dashed ${M};border-radius:16px;opacity:0">
         ${TI("not a biologist, no AP bio", 20, { weight: 500, color: M })}</div>`);
  let js = wipeUp(`#${id}`, 0, 0.3);
  js += rowUp("#l1", tB, 0.35);
  js += rowUp("#l2", tC, 0.35) + rowUp("#l3", tC + 0.3, 0.35);
  // fixd pass 2026-11-13: tC lands 16.73 of 18.33 and the wipe-out starts
  // 17.97, so the old tC+1.4/+1.7/+2.3 entrances (l4, l5, attribution) never
  // held on screen. Clamped to land by D-1.0 with a 0.25s stagger (verified on
  // the render: all three hold fully before the wipe).
  const tLate = Math.min(tC + 1.4, D - 1.5);
  js += rowUp("#l4", tLate, 0.35) + rowUp("#l5", tLate + 0.25, 0.35);
  js += show("#att", tLate + 0.5, 0.3);
  js += show("#joke", tJ, 0.35);
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}

// =================================================================== gZ20c
// The Turing half of the quote: the learning process has to have randomness,
// stochasticity built in. Attribution Alan Turing. The two cards together
// re-state the thesis at the moment his data proves it.
if (want("gZ20c")) {
  const id = "gZ20c", D = dur(id), [x, y, w, h] = boxOf(id);
  const M = dim(id);
  const tT = cueIn(id, "Alan Turing");
  const tS = cueIn(id, "stochasticity built in");
  const body = cardHTML(id, x, y, w, h,
      EYEBROW("the other half", 34, 34, M, "ey", 20) +
      T("to make a machine learn,", 34, 86, 30, { w: 400, weight: 900, cls: "disp", lh: 1.16, id: "l1" }) +
      T("especially learn", 34, 172, 30, { w: 400, weight: 900, cls: "disp", lh: 1.16, id: "l2" }) +
      T("in a real world,", 34, 214, 30, { w: 400, weight: 900, cls: "disp", lh: 1.16, id: "l3" }) +
      T("the learning process has to", 34, 282, 26, { w: 400, weight: 500, lh: 1.25, id: "l4" }) +
      T("have a level of randomness,", 34, 320, 26, { w: 400, weight: 500, lh: 1.25, id: "l5" }) +
      T("stochasticity built in.", 34, 362, 28, { w: 400, weight: 900, cls: "disp", lh: 1.2, color: C.accent, id: "l6" }) +
      `<div id="att" style="position:absolute;left:34px;top:438px;font-family:Satoshi;font-variation-settings:'wght' 700;font-size:22px;color:${M};opacity:0">Alan Turing</div>`);
  let js = wipeUp(`#${id}`, 0, 0.3);
  js += rowUp("#l1", 0.2, 0.35) + rowUp("#l2", 0.8, 0.35) + rowUp("#l3", 1.3, 0.35);
  js += rowUp("#l4", 2.4, 0.35) + rowUp("#l5", 3.2, 0.35);
  js += rowUp("#l6", tS, 0.35);
  js += show("#att", tT + 0.3, 0.3);
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}

// =================================================================== gZ20d
// 'exactly what LLM training tries to emulate': corpus block feeds a network
// glyph, 'learns patterns' ticks out. Plain drawing (same family as gZ21's
// right side) so gZ21's contrast reads. One accent: the output chip.
if (want("gZ20d")) {
  const id = "gZ20d", D = dur(id), [x, y, w, h] = boxOf(id);
  const M = dim(id), F = fg(id);
  const tC = cueIn(id, "corpus of data");
  const tN = cueIn(id, "large neural network");
  const tL = cueIn(id, "learn patterns");
  // 500x480 right plate: two-line header, corpus column left (label above),
  // network right, feed between at mid height, output chip bottom-right.
  // One accent: the output chip.
  const corpus = `<g id="cor" style="opacity:0">
      ${[0, 1, 2, 3, 4].map(k => `<rect x="60" y="${190 + k * 32}" width="150" height="20" rx="4" fill="none" stroke="${M}" stroke-width="3"/>`).join("")}
    </g>`;
  const net = `<g id="net" style="opacity:0">
      ${[[306, 220], [306, 270], [306, 320]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="13" fill="none" stroke="${F}" stroke-width="3.5"/>`).join("")}
      ${[[400, 195], [400, 247], [400, 299], [400, 351]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="13" fill="none" stroke="${F}" stroke-width="3.5"/>`).join("")}
      ${[[306, 220], [306, 270], [306, 320]].map(([a, b]) => [[400, 195], [400, 247], [400, 299], [400, 351]].map(([c, d]) => `<line x1="${a + 13}" y1="${b}" x2="${c - 13}" y2="${d}" stroke="${M}" stroke-width="2.5"/>`).join("")).join("")}
    </g>`;
  const feed = `<line id="fd" x1="214" y1="267" x2="292" y2="267" pathLength="1" stroke="${M}" stroke-width="4" stroke-linecap="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>`;
  const svg = `<svg style="position:absolute;left:0;top:0;overflow:visible" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${corpus}${net}${feed}</svg>`;
  const body = cardHTML(id, x, y, w, h,
      // pass 2 F1 (2026-11-13): eyebrow 17->20 (ls 0.16->0.10 so 20px still
      // fits 454: 447 PIL), column captions 18->20. PIL (Satoshi, wght 700;
      // Black bound 214): "a large neural network" ~202 centered at 357 spans
      // 256-458 inside 494; the corpus box (60-210) clears the 256 start.
      EYEBROW("the same thing, on the other side", 34, 30, M, "ey", 20, 0.10) +
      T("exactly what LLM training does", 34, 58, 28, { w: 432, weight: 900, cls: "disp", id: "hd" }) +
      T("a corpus of data", 60, 150, 20, { w: 160, align: "center", weight: 700, color: M, id: "cl" }) +
      T("a large neural network", 243, 150, 20, { w: 220, align: "center", weight: 700, color: M, id: "nl" }) +
      svg +
      `<div id="lp" style="position:absolute;left:268px;top:410px;padding:9px 18px;border:3px solid ${C.accent};border-radius:22px;opacity:0">
         ${TI("learns patterns", 20, { weight: 900, cls: "disp", color: C.accent })}</div>`);
  let js = wipeUp(`#${id}`, 0, 0.3) + rowUp("#hd", 0.1, 0.3);
  js += `tl.fromTo("#cor",{opacity:0},{opacity:1,duration:0.4,immediateRender:false},${f3(tC)});\n` + rowUp("#cl", tC, 0.3);
  js += drawOn("fd", Math.max(tC + 0.3, tN - 0.4), 0.4);
  js += `tl.fromTo("#net",{opacity:0},{opacity:1,duration:0.4,immediateRender:false},${f3(tN)});\n` + rowUp("#nl", tN, 0.3);
  // sweep_static: dead middle 5.3-8.9 (corpus lands 5.3, chip pops 8.9). One
  // ambient lift of the network glyph across it.
  js += `tl.fromTo("#net",{y:0},{y:-7,duration:3.2,ease:"sine.inOut",immediateRender:false},5.6);\n`;
  js += pop("#lp", tL, 0.3);
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}

// =================================================================== gZ21
// Parrot vs pattern-learner. Left: the parrot mirroring two author tiles
// (Hemingway, Emerson: spelled correctly, the transcript mishears are not
// screen copy). Right: the same tiles feed a network glyph that emits a NEW
// tile. On 'create something new' the right side wins: the new tile lifts, the
// parrot dims. Chip: 'same for code'.
if (want("gZ21")) {
  const id = "gZ21", D = dur(id), [x, y, w, h] = boxOf(id);
  const M = dim(id), F = fg(id);
  const tH = cueIn(id, "Hemingway");
  const tE = cueIn(id, "Emerson");
  const tP = cueIn(id, "learned patterns");
  const tN = cueIn(id, "create something new");
  const tS = cueIn(id, "something new");
  // pass 2 F1 (2026-11-13): eyebrow 18->20 (ls 0.16->0.10: 382 PIL, fits 454);
  // tile text 19->20 (PIL Black: "Hemingway" 114 inside the 128 tile), new tile
  // 16->20 ("something new" 139 inside 126? no: Black-measured bound 147, the
  // run is wght 900 -> widen that tile 126->150), code chip 19->20.
  const tile = (iid, ix, iy, txt) => `<g id="${iid}" style="opacity:0"><rect x="${ix}" y="${iy}" width="128" height="40" rx="6" fill="none" stroke="${F}" stroke-width="3.5"/>
      <text x="${ix + 64}" y="${iy + 27}" text-anchor="middle" font-family="Satoshi" font-variation-settings:'wght' 700" font-size="20" fill="${F}">${txt}</text></g>`;
  const netG = `<g id="net" style="opacity:0">
      ${[[258, 214], [258, 256], [258, 298]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="11" fill="none" stroke="${F}" stroke-width="3"/>`).join("")}
      ${[[316, 232], [316, 278]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="11" fill="none" stroke="${F}" stroke-width="3"/>`).join("")}
      ${[[258, 214], [258, 256], [258, 298]].map(([a, b]) => [[316, 232], [316, 278]].map(([c, d]) => `<line x1="${a + 11}" y1="${b}" x2="${c - 11}" y2="${d}" stroke="${M}" stroke-width="2.5"/>`).join("")).join("")}
    </g>`;
  const feeds = `<g id="fds" style="opacity:0">
      <line x1="154" y1="140" x2="245" y2="220" stroke="${M}" stroke-width="3" stroke-linecap="round"/>
      <line x1="154" y1="196" x2="245" y2="292" stroke="${M}" stroke-width="3" stroke-linecap="round"/>
    </g>`;
  const newTile = `<g id="nt" style="opacity:0"><rect x="328" y="234" width="150" height="40" rx="6" fill="${C.bg}" stroke="${F}" stroke-width="3.5"/>
      <text x="403" y="260" text-anchor="middle" font-family="Satoshi" font-variation-settings:'wght' 900" font-size="20" fill="${F}">something new</text></g>`;
  const svg = `<svg style="position:absolute;left:0;top:0;overflow:visible" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      ${tile("tH", 24, 120, "Hemingway")}${tile("tE", 24, 176, "Emerson")}
      ${netG}${feeds}${newTile}
    </svg>`;
  // 500x480 right plate: tiles top-left (x24-152), network columns at 286/344,
  // new tile 356-482 (clear of the 'learned patterns' row at y322 and the code
  // chip at y404), parrot scaled to a 112x123 column bottom-left. Ink-only.
  const body = cardHTML(id, x, y, w, h,
      EYEBROW("parrot or pattern-learner?", 34, 28, M, "ey", 20, 0.10) +
      T("two authors, two outcomes", 34, 58, 32, { w: 432, weight: 900, cls: "disp", id: "hd" }) +
      place(parrot("prt2", F, 7, 112, 123), 30, 296) + svg +
      T("mirrors", 26, 430, 20, { w: 120, align: "center", weight: 500, color: M, id: "lft" }) +
      T("learned patterns", 210, 322, 20, { w: 170, align: "center", weight: 500, color: M, id: "rgt" }) +
      `<div id="code" style="position:absolute;left:310px;top:408px;padding:8px 16px;border:2px solid ${M};border-radius:18px;opacity:0">
         ${TI("same for code", 20, { weight: 700, color: M })}</div>`);
  let js = wipeUp(`#${id}`, 0, 0.35) + rowUp("#hd", 0.1, 0.3);
  const tShow = Math.max(0.4, tH - 1.5);
  js += `tl.fromTo("#prt2",{opacity:0},{opacity:1,duration:0.01,immediateRender:false},${f3(tShow)});\n`;
  parrotIds("prt2").forEach((pn, k) => { js += drawOn(pn, tShow + k * 0.1, 0.3); });
  js += rowUp("#tH", tH, 0.3) + rowUp("#tE", tE, 0.3);
  js += `tl.fromTo("#fds",{opacity:0},{opacity:1,duration:0.3,immediateRender:false},${f3(Math.max(tE + 0.3, tP - 0.7))});\n`;
  js += `tl.fromTo("#net",{opacity:0},{opacity:1,duration:0.4,immediateRender:false},${f3(Math.max(tE + 0.5, tP - 0.4))});\n`;
  js += rowUp("#rgt", tP, 0.3);
  js += `tl.fromTo("#nt",{opacity:0,y:14},{opacity:1,y:0,duration:0.45,ease:"back.out(1.8)",immediateRender:false},${f3(tN)});\n`;
  js += hide("#prt2", tN + 0.2, 0.8);                    // the parrot dims away
  js += `tl.fromTo("#lft",{opacity:1},{opacity:0.25,duration:0.8,immediateRender:false},${f3(tN + 0.2)});\n`;
  js += show("#code", tS + 0.6, 0.3);
  // sweep_static: 27s part; after the chip lands (tS+0.9) nothing moves until
  // the network enters (23.7). One ambient lift of the parrot (the only thing
  // on screen in the dead middle) across 12-20s, done before it dims away.
  js += `tl.fromTo("#prt2",{y:0},{y:-7,duration:7.4,ease:"sine.inOut",immediateRender:false},12.6);\n`;
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}

// =================================================================== g22
// Takeaway one as a counted row: rises on 'On the contrary'.
if (want("g22")) {
  const id = "g22", D = dur(id), [x, y, w, h] = boxOf(id);
  const M = dim(id);
  const tC = cueIn(id, "On the contrary");
  // 500x480 right plate: headline pair at 44px (395w measured), muted pair
  // under it, the 64px takeaway numeral in the top-right corner (x400 keeps
  // its advance inside the card). Ink-only.
  const body = cardHTML(id, x, y, w, h,
      EYEBROW("takeaway 01", 34, 30, M, "ey", 22) +
      T("Stochastic training", 34, 96, 44, { w: 440, weight: 900, cls: "disp", lh: 1.14, id: "l1" }) +
      T("is not a bug.", 34, 148, 44, { w: 440, weight: 900, cls: "disp", lh: 1.14, id: "l2" }) +
      T("a model that can be wrong", 34, 250, 30, { w: 440, weight: 500, color: M, id: "l3" }) +
      T("can be right.", 34, 292, 30, { w: 440, weight: 500, color: M, id: "l4" }) +
      `<div id="num" style="position:absolute;left:400px;top:14px;font-family:Satoshi;font-variation-settings:'wght' 900;font-size:64px;line-height:1;color:${C.rule};opacity:0">01</div>`);
  let js = wipeUp(`#${id}`, 0, 0.3);
  js += show("#num", tC, 0.4) + rowUp("#l1", tC + 0.1, 0.35) + rowUp("#l2", tC + 0.4, 0.35);
  js += rowUp("#l3", tC + 1.3, 0.35) + rowUp("#l4", tC + 1.6, 0.35);
  // sweep_static: 25s part, every entrance lands by tC+2 (9.7s), then 15s of
  // stillness. One ambient lift of the corner numeral across the dead middle.
  js += `tl.fromTo("#num",{y:0},{y:-7,duration:10,ease:"sine.inOut",immediateRender:false},12);\n`;
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}

// =================================================================== g22b
// The AI-collapse aside (right plate) as a lighter quote card: a mood beat, not
// an argument. One accent: 'here to stay'. ESCALATED at the checkpoint for tone.
if (want("g22b")) {
  const id = "g22b", D = dur(id), [x, y, w, h] = boxOf(id);
  const M = dim(id);
  const tD = cueIn(id, "AI downturn");
  const tB = cueIn(id, "bubble may burst");
  const tH = cueIn(id, "here to stay");
  const tF = cueIn(id, "hopeful about the future");
  const body = cardHTML(id, x, y, w, h,
      EYEBROW("a note on the moment", 40, 36, M, "ey", 22) +
      T("AI downturn?", 40, 88, 46, { w: 420, weight: 700, cls: "disp", id: "l1", lh: 1.05 }) +
      T("AI collapse?", 40, 144, 46, { w: 420, weight: 700, cls: "disp", id: "l2", lh: 1.05 }) +
      T("The bubble may burst.", 40, 222, 32, { w: 420, weight: 500, color: M, id: "l3" }) +
      T("AI is here to stay", 40, 288, 40, { w: 420, weight: 900, cls: "disp", color: C.accent, id: "l4" }) +
      T("and only going to improve.", 40, 342, 30, { w: 420, weight: 500, id: "l5" }) +
      `<div id="sig" style="position:absolute;left:40px;top:382px;border-top:3px solid ${M};padding-top:10px;opacity:0">
         ${TI("hopeful about the future", 22, { weight: 700, color: M, nowrap: true })}
         ${TI("of CS and robotics", 22, { weight: 500, color: M, nowrap: true })}</div>`);
  let js = wipeUp(`#${id}`, 0, 0.3);
  js += rowUp("#l1", tD, 0.3) + rowUp("#l2", tD + 0.4, 0.3);
  js += rowUp("#l3", tB, 0.35);
  js += rowUp("#l4", tH, 0.35) + rowUp("#l5", tH + 0.35, 0.35);
  js += show("#sig", tF, 0.4);
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}

// =================================================================== g23
// Takeaway two: 'policy = f(data)' types itself on 'policy is a function of
// data'; then 'garbage in, garbage out' stamps beneath on the spoken line, the
// one accent on the first 'garbage'. Curation chip last.
if (want("g23")) {
  const id = "g23", D = dur(id), [x, y, w, h] = boxOf(id);
  const M = dim(id), F = fg(id);
  const tP = cueIn(id, "policy is a function of data");
  const tG = cueIn(id, "garbage and garbage out");
  const tC = cueIn(id, "curated clean");
  const formula = "policy = f(data)";
  const chars = formula.split("").map((ch, k) =>
    `<span id="c${k}" style="opacity:0">${ch === " " ? "&nbsp;" : ch}</span>`).join("");
  const body = cardHTML(id, x, y, w, h,
      EYEBROW("takeaway 02", 34, 30, M, "ey", 22) +
      `<div id="num" style="position:absolute;left:372px;top:14px;font-family:Satoshi;font-variation-settings:'wght' 900;font-size:64px;line-height:1;color:${C.rule};opacity:0">02</div>` +
      `<div id="fml" class="disp" style="position:absolute;left:34px;top:104px;font-size:48px;line-height:1.05;color:${F};white-space:pre">${chars}</div>` +
      `<div id="gb" style="position:absolute;left:34px;top:270px;opacity:0">
         ${TI("garbage in,", 44, { weight: 900, cls: "disp", color: C.accent, lh: 1.12 })}
         ${TI("garbage out.", 44, { weight: 900, cls: "disp", color: F, lh: 1.12 })}
       </div>` +
      // pass 2 F1 (2026-11-13): chip 18->20px. PIL (Satoshi, wght 700; Black
      // bound 397): chip right edge 34+18+397+18+6=473 inside 494, one line.
      `<div id="cur" style="position:absolute;left:34px;top:386px;padding:9px 18px;border:3px dashed ${M};border-radius:22px;opacity:0">
         ${TI("curated, clean, indicative: that is the work", 20, { weight: 700, color: M })}</div>`);
  let js = wipeUp(`#${id}`, 0, 0.3) + show("#num", tP, 0.35);
  const n = formula.length;
  for (let k = 0; k < n; k++) {
    js += `tl.fromTo("#c${k}",{opacity:0},{opacity:1,duration:0.05,immediateRender:false},${f3(tP + 0.15 + k * (1.6 / n))});\n`;
  }
  js += pop("#gb", tG, 0.3);
  js += show("#cur", tC, 0.35);
  // sweep_static: 23.7s part, last entrance lands 19.8; one ambient lift of
  // the corner numeral across the dead middle and tail.
  js += `tl.fromTo("#num",{y:0},{y:-7,duration:9,ease:"sine.inOut",immediateRender:false},7);
`;
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}

// =================================================================== g23b
// 'treat policy as a black box': an opaque rounded box, 'data' arrow in,
// 'action' arrow out, and 'our life becomes easy'. On 'falls into place' the
// arrows snap straight. The abstraction a data engineer gets to use.
if (want("g23b")) {
  const id = "g23b", D = dur(id), [x, y, w, h] = boxOf(id);
  const M = dim(id), F = fg(id);
  const tB = cueIn(id, "black box");
  const tP = cueIn(id, "falls into place");
  const tE = cueIn(id, "life becomes easy");
  const svg = `<svg style="position:absolute;left:0;top:0;overflow:visible" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <g id="bx" style="opacity:0">
        <rect x="150" y="196" width="200" height="108" rx="18" fill="${C.ink}" stroke="${F}" stroke-width="4"/>
        <text x="250" y="258" text-anchor="middle" font-family="Satoshi" font-variation-settings:'wght' 900" font-size="24" fill="${C.bg}">black box</text>
      </g>
      <g id="aIn" style="opacity:0"><path id="aIn-p" d="M52,250 L134,250" pathLength="1" fill="none" stroke="${F}" stroke-width="5" stroke-linecap="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>
        <path id="aIn-h" d="M124,240 L138,250 L124,260" pathLength="1" fill="none" stroke="${F}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray:1;stroke-dashoffset:1"/></g>
      <g id="aOut" style="opacity:0"><path id="aOut-p" d="M366,250 L448,250" pathLength="1" fill="none" stroke="${F}" stroke-width="5" stroke-linecap="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>
        <path id="aOut-h" d="M438,240 L452,250 L438,260" pathLength="1" fill="none" stroke="${F}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray:1;stroke-dashoffset:1"/></g>
    </svg>`;
  const body = cardHTML(id, x, y, w, h,
      // pass 2 F1 (2026-11-13): eyebrow 18->20 (ls 0.16->0.10: 421 PIL Black
      // bound at x34 ends 455, inside the 488 inner width).
      EYEBROW("the abstraction you get to use", 34, 30, M, "ey", 20, 0.10) +
      T("treat policy as a black box", 34, 60, 30, { w: 432, weight: 900, cls: "disp", id: "hd" }) +
      svg +
      T("data", 44, 214, 24, { w: 80, align: "center", weight: 700, color: M, id: "dL" }) +
      T("action", 388, 214, 24, { w: 80, align: "center", weight: 700, color: M, id: "aL" }) +
      `<div id="ez" style="position:absolute;left:34px;top:390px;padding:9px 18px;border:3px solid ${M};border-radius:24px;opacity:0">
         ${TI("our life becomes easy", 22, { weight: 700, color: M })}</div>`);
  let js = wipeUp(`#${id}`, 0, 0.3) + rowUp("#hd", 0.1, 0.3);
  js += `tl.fromTo("#bx",{opacity:0,scale:0.9,transformOrigin:"50% 50%"},{opacity:1,scale:1,duration:0.35,ease:"back.out(1.7)",immediateRender:false},${f3(tB)});\n`;
  js += `tl.fromTo("#aIn",{opacity:0,rotation:-4,svgOrigin:"52 250"},{opacity:1,rotation:-4,svgOrigin:"52 250",duration:0.01,immediateRender:false},${f3(tB + 0.4)});\n`;
  js += drawOn("aIn-p", tB + 0.4, 0.4) + drawOn("aIn-h", tB + 0.7, 0.2) + show("#dL", tB + 0.4, 0.25);
  js += `tl.fromTo("#aOut",{opacity:0,rotation:-9,svgOrigin:"366 250"},{opacity:1,rotation:-9,svgOrigin:"366 250",duration:0.01,immediateRender:false},${f3(tB + 0.9)});\n`;
  js += drawOn("aOut-p", tB + 0.9, 0.4) + drawOn("aOut-h", tB + 1.2, 0.2) + show("#aL", tB + 0.9, 0.25);
  js += `tl.to("#aOut",{rotation:0,duration:0.2,ease:"back.out(3)",immediateRender:false},${f3(tP)});\n`;
  js += `tl.to("#aIn",{rotation:0,duration:0.2,ease:"back.out(3)",immediateRender:false},${f3(tP)});\n`;
  js += show("#ez", tE, 0.35);
  // sweep_static: dead middle 4.0-8.1 (box lands 8.1). One ambient lift of the
  // 'easy' chip, the only ink on screen across it.
  js += `tl.fromTo("#ez",{y:0},{y:-7,duration:3.7,ease:"sine.inOut",immediateRender:false},4.3);
`;
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}

// =================================================================== g24
// Takeaway three, the compute wall drawn: '90 min' for 50 episodes on an M5 Pro
// counts on '90 minutes'; a 1,000 / 2,000 / 100k stack grows on the spoken
// numbers and stops unresolved: 'imagine'.
if (want("g24")) {
  const id = "g24", D = dur(id), [x, y, w, h] = boxOf(id);
  const M = dim(id);
  const t9 = cueIn(id, "90 minutes");
  const tT = cueIn(id, "thousand two thousand");
  const tK = cueIn(id, "100k episodes");
  const stackRow = (iy, label, frac, iid) => `
    <div id="${iid}" style="position:absolute;left:44px;top:${iy}px;display:flex;align-items:center;gap:14px;opacity:0">
      ${TI(label, 24, { weight: 900, cls: "disp", color: M })}
      <div style="width:${Math.round(frac * 220)}px;height:18px;border-radius:5px;background:${M};opacity:.75"></div></div>`;
  const body = cardHTML(id, x, y, w, h,
      EYEBROW("takeaway 03", 34, 30, M, "ey", 22) +
      `<div id="num" style="position:absolute;left:372px;top:14px;font-family:Satoshi;font-variation-settings:'wght' 900;font-size:64px;line-height:1;color:${C.rule};opacity:0">03</div>` +
      `<span id="mn" style="position:absolute;left:34px;top:84px;font-family:Satoshi;font-variation-settings:'wght' 900;font-size:160px;line-height:1;opacity:0">0</span>
       <div id="mu" style="position:absolute;left:34px;top:250px;width:432px;font-family:Satoshi;font-variation-settings:'wght' 900;font-size:36px;line-height:1.25;color:${M};opacity:0">min for 50 episodes, on an M5 Pro</div>` +
      stackRow(356, "1,000", 0.14, "s1") + stackRow(396, "2,000", 0.26, "s2") + stackRow(436, "100k", 0.86, "s3") +
      `<div id="im" style="position:absolute;left:348px;top:434px;font-family:Satoshi;font-variation-settings:'wght' 900;font-size:30px;color:${M};opacity:0">imagine</div>`);
  let js = wipeUp(`#${id}`, 0, 0.3) + show("#num", 0.1, 0.35);
  js += `tl.fromTo("#mn",{opacity:0},{opacity:1,duration:0.01,immediateRender:false},${f3(t9)});\n`
      + countUp("#mn", 0, 90, t9, 0.8) + rowUp("#mu", t9 + 0.4, 0.3);
  js += rowUp("#s1", tT, 0.3) + rowUp("#s2", tT + 0.4, 0.3);
  js += rowUp("#s3", tK, 0.35) + show("#im", tK + 0.5, 0.35);
  // sweep_static: dead middle 1.0-7.5 (stat counts by 0.8, stack grows at 7.8).
  // One ambient lift of the sub-head across it.
  js += `tl.fromTo("#mu",{y:0},{y:-7,duration:5,ease:"sine.inOut",immediateRender:false},2);
`;
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}

// =================================================================== g24b
// The misleading-names lesson: a dataset tile reads 'success_v2', its success
// metric counts to 0, a strike lands on the tile name. One line: on face
// value, no. This is the profiler's reason to exist.
if (want("g24b")) {
  const id = "g24b", D = dur(id), [x, y, w, h] = boxOf(id);
  const M = dim(id), F = fg(id);
  const t0 = cueIn(id, "zero");
  const tM = cueIn(id, "misleading");
  const body = cardHTML(id, x, y, w, h,
      EYEBROW("names lie", 34, 30, M, "ey", 22) +
      // pass 2 F1 (2026-11-13): the tile name inherited the 16px body default
      // (frame probe: name ink only 12px tall) and the caption was 18. Name
      // 16->24 (PIL: "success_v2" wght 700 @24 = 124, x18..142, the 48px "0"
      // starts at ~381), caption 18->20 (111 wide, tile left inset 18).
      `<div id="tile" style="position:absolute;left:34px;top:84px;width:432px;height:116px;border:3px solid ${F};border-radius:12px">
         <div style="position:absolute;left:18px;top:14px;font-family:Satoshi,sans-serif;font-variation-settings:'wght' 700;font-size:24px;line-height:1">${struck("nm", "success_v2", F, 5)}</div>
         ${T("success rate", 18, 70, 20, { weight: 500, color: M })}
         <span id="zr" style="position:absolute;right:18px;top:26px;font-family:Satoshi;font-variation-settings:'wght' 900;font-size:48px;color:${F}">0</span>
       </div>` +
      T("curated, many successes inside", 34, 236, 24, { weight: 700, color: F, id: "tr" }) +
      `<div id="chip" style="position:absolute;left:34px;top:300px;padding:9px 18px;border:3px dashed ${M};border-radius:22px;opacity:0">
         ${TI("naming misleads", 22, { weight: 700, color: M })}</div>`);
  let js = wipeUp(`#${id}`, 0, 0.3);
  js += countUp("#zr", 100, 0, t0, 1.0);
  js += strikeIn("nm", t0 + 1.1, 0.35);
  js += rowUp("#tr", t0 + 1.5, 0.3);
  js += show("#chip", tM, 0.35);
  // sweep_static: dead middle 6.7-11.9 (only motion is the 11.9 chip). One
  // ambient lift of the dataset tile across it.
  js += `tl.fromTo("#tile",{y:0},{y:-7,duration:4.5,ease:"sine.inOut",immediateRender:false},7);
`;
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}

// =================================================================== g25
// Next episode as three route chips that light in turn as he names them. Right
// plate. No accent (the accent budget stays unspent here; chips light ink).
if (want("g25")) {
  const id = "g25", D = dur(id), [x, y, w, h] = boxOf(id);
  const M = dim(id), F = fg(id);
  const tT = cueIn(id, "transfer my simulations");
  const tA = cueIn(id, "maybe aloha");
  const tO = cueIn(id, "so101");
  const tL = cueIn(id, "teleop");
  const chip = (iid, iy, main, sub) => `<g id="${iid}" style="opacity:0">
      <rect x="40" y="${iy}" width="420" height="82" rx="12" fill="none" stroke="${F}" stroke-width="3.5"/>
      <circle cx="70" cy="${iy + 41}" r="11" fill="none" stroke="${M}" stroke-width="3"/>
      <text x="98" y="${iy + 37}" font-family="Satoshi" font-variation-settings:'wght' 900" font-size="24" fill="${F}">${main}</text>
      <text x="98" y="${iy + 64}" font-family="Satoshi" font-variation-settings:'wght' 500" font-size="20" fill="${M}">${sub}</text>
    </g>`;
  const svg = `<svg style="position:absolute;left:0;top:0;overflow:visible" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <line id="rt" x1="70" y1="132" x2="70" y2="412" stroke="${M}" stroke-width="3" stroke-dasharray="9 8" opacity=".6"/>
      ${chip("c1", 132, "Spark box", "transfer the sims")}
      ${chip("c2", 232, "ALOHA / SO-101", "real robot, real episodes")}
      ${chip("c3", 332, "teleop episodes", "human-led collection")}
    </svg>`;
  const body = cardHTML(id, x, y, w, h,
      EYEBROW("next week", 34, 34, M, "ey", 20) +
      T("where this goes next", 34, 62, 30, { w: 272, weight: 900, cls: "disp", id: "hd" }) +
      svg);
  let js = wipeUp(`#${id}`, 0, 0.3) + rowUp("#hd", 0.1, 0.3);
  js += `tl.fromTo("#c1",{opacity:0,x:-16},{opacity:1,x:0,duration:0.35,ease:"power3.out",immediateRender:false},${f3(tT)});\n`;
  js += `tl.fromTo("#c2",{opacity:0,x:-16},{opacity:1,x:0,duration:0.35,ease:"power3.out",immediateRender:false},${f3(Math.max(tT + 0.6, Math.min(tA, tO)))});\n`;
  js += `tl.fromTo("#c3",{opacity:0,x:-16},{opacity:1,x:0,duration:0.35,ease:"power3.out",immediateRender:false},${f3(Math.min(tL, D - 0.8))});\n`;
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}

// =================================================================== g26
// The ask: a comment bubble lands on 'leave me a comment'. One accent: bubble.
if (want("g26")) {
  const id = "g26", D = dur(id), [x, y, w, h] = boxOf(id);
  const M = dim(id);
  const tH = cueIn(id, "hugging face");
  const tC = cueIn(id, "leave me a comment");
  const bubble = `<svg id="bub" style="position:absolute;left:34px;top:210px;overflow:visible;opacity:0" width="150" height="130" viewBox="0 0 140 120">
      <path id="bubP" d="M10,14 C10,6 16,2 26,2 L114,2 C124,2 130,6 130,14 L130,70 C130,78 124,84 114,84 L58,84 L34,108 L38,84 L26,84 C16,84 10,78 10,70 Z"
        pathLength="1" fill="none" stroke="${C.accent}" stroke-width="5" stroke-linejoin="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>
      <circle id="b1" cx="44" cy="44" r="6" fill="${C.accent}" opacity="0"/><circle id="b2" cx="70" cy="44" r="6" fill="${C.accent}" opacity="0"/><circle id="b3" cx="96" cy="44" r="6" fill="${C.accent}" opacity="0"/>
    </svg>`;
  const body = cardHTML(id, x, y, w, h,
      EYEBROW("one ask", 34, 34, M, "ey", 20) +
      T("know a way to filter", 34, 84, 30, { w: 420, weight: 900, cls: "disp", lh: 1.15, id: "l1" }) +
      T("datasets on Hugging Face?", 34, 130, 30, { w: 420, weight: 900, cls: "disp", lh: 1.15, id: "l2" }) +
      bubble +
      T("leave a comment", 66, 366, 26, { weight: 700, color: C.accent, id: "lc" }));
  let js = wipeUp(`#${id}`, 0, 0.25);
  js += rowUp("#l1", Math.max(0.05, tH - 0.8), 0.3) + rowUp("#l2", Math.max(0.3, tH - 0.4), 0.3);
  // composition pass (human 2026-11-12): the ask appeared only in the last
  // ~0.5s of a 3.1s card. The bubble + CTA now enter 1.3s ahead of their cue
  // so the ask holds ~1.5s before the cut. Part timing untouched.
  const tB2 = Math.max(tH, tC - 1.5);
  js += `tl.fromTo("#bub",{opacity:0},{opacity:1,duration:0.01,immediateRender:false},${f3(tB2)});\n`;
  js += drawOn("bubP", tB2, 0.35) + show("#b1", tB2 + 0.3, 0.12) + show("#b2", tB2 + 0.38, 0.12) + show("#b3", tB2 + 0.46, 0.12);
  js += show("#lc", tB2 + 0.35, 0.3);
  emit(id, D, body, js);
}

// =================================================================== g27
// End card (human sign-off 2026-11-12: the video ends at 24:09.0 on this card,
// two frames after 'you.'; no face-turn tail). Five brand rows from brand.md
// rise 0.4s apart on 'goodbye', hold to the last frame. One $accent rule under
// the first row.
if (want("g27")) {
  const id = "g27", D = dur(id), [x, y, w, h] = boxOf(id);
  // opaque-forced card (see body): palette from the opaque tokens directly,
  // not dim()/fg() which follow panels.json.
  const M = "#B9B2A8", F = C.bg;
  const tG = cueIn(id, "goodbye");
  // Pass 2 fix 2026-11-13 (final review): the sub label was pinned left at x400
  // and "youtube" (PIL 78.5px at 20) ran to the panel border. Labels now
  // RIGHT-align inside a 410px box (right edge 444 card-relative, ~58px clear of
  // the border); rows drop 26->24px so the widest main ("linkedin..." 354*24/26)
  // keeps a 34px gutter to its label start (review bar >=20).
  const row = (iy, main, sub, iid) => `<div id="${iid}" style="position:absolute;left:34px;top:${iy}px;opacity:0">
      ${T(main, 0, 0, 24, { weight: 900, cls: "disp", color: F, nowrap: true })}
      ${sub ? T(sub, 0, 3, 20, { weight: 500, color: M, w: 410, align: "right" }) : ""}</div>`;
  // human direction 2026-11-12: the end card moves to the RIGHT plate; its
  // bottom (640+380=1020) crosses the lamp zone, so the panel is HARD OPAQUE
  // (the over-screen rule), not the measured sheet. 512x380 reflow: rows on a
  // ~56px rhythm inside 34px padding; one accent (the rule under r1).
  // Composition pass 2 F1 (2026-11-13): eyebrow 17->20, channel line 19->20,
  // row labels 18->20 (all PIL-measured on Satoshi-Black: the widest row
  // "linkedin.com/in/snudurupati" 26px = 361 + the 20px label at x400 ends
  // 448, inside 480; channel line 315 inside 480). r5 bottom lands ~465,
  // inside 380 (opaque, exempt from the lamp cap).
  const body = `<div id="${id}" class="opaque" style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px">${
      EYEBROW("links", 34, 24, M, "ey", 20) +
      `<div id="chan" style="position:absolute;left:34px;top:52px;font-family:Satoshi;font-variation-settings:'wght' 700;font-size:20px;color:${M};opacity:0">AI for the Working Data Engineer</div>` +
      row(82, "@snudurupati", "youtube", "r1") +
      `<div id="rule" style="position:absolute;left:34px;top:124px;width:240px;height:4px;background:${C.accent};transform:scaleX(0);transform-origin:left center"></div>` +
      row(144, "nudurupati.co", "blog", "r2") +
      row(200, "github.com/snudurupati", "code", "r3") +
      row(256, "linkedin.com/in/snudurupati", "work", "r4") +
      row(312, "@srnudurupati", "x", "r5")}</div>`;
  let js = wipeUp(`#${id}`, 0, 0.3);
  js += show("#ey", tG + 0.05, 0.3) + show("#chan", tG + 0.1, 0.3);
  const t0 = Math.max(0.3, tG + 0.2);
  js += rowUp("#r1", t0, 0.3);
  js += `tl.fromTo("#rule",{scaleX:0},{scaleX:1,duration:0.4,ease:"power2.out",immediateRender:false},${f3(t0 + 0.3)});\n`;
  ["r2", "r3", "r4", "r5"].forEach((r, k) => { js += rowUp("#" + r, t0 + 0.4 + k * 0.4, 0.3); });
  // sweep_static: rows land ~2.2, the card holds to the last frame at 5.23.
  // One ambient float of the accent rule across the dead tail.
  js += `tl.fromTo("#rule",{y:0},{y:-7,duration:2.2,ease:"sine.inOut",immediateRender:false},2.6);
`;
  // hold to the last frame (no exit: the human chose the 24:09 end on this card)
  emit(id, D, body, js);
}
