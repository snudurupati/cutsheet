// Scenes A: the intro, g01-g08.
import { C, emit, span, frames, cueIn, fg, dim, wipeUp, wipeDown, boxOf, struck, strikeIn } from "./lib.mjs";
import { T, EYEBROW, statLine, cardHTML, chipHTML, show, hide, drawOn, rowUp, ruleIn, pop,
         countUp, tickSVG, tickIn, slashSVG, A, f3, exitIfFree, wOf, hOf, TI } from "./hb.mjs";
import { humanoid, humWalk, humIdle, humWalkEnd } from "./hum.mjs";
import { readFileSync } from "node:fs";
import { want } from "./only.mjs";
const dur = id => frames(id) / 30;
const BRAND = JSON.parse(readFileSync("../../../brand.md", "utf8").match(/```json\s*(\{[\s\S]*\})\s*```/)[1]);

// =================================================================== g01
// Hook, drawn, per PLAN.md (human sign-off 2026-11-12: rebuild faithful to plan).
// Beats: opensOnMotion (already walking frame 1, NO type); the series humanoid
// (human request 2026-11-12: wears the cowboy hat here too) walks the rail to the
// control lever and grips it; on "completely deterministic" an accent LOCK clicks
// onto the rail (the scene's ONE accent); on "cannot learn" its grip slackens and
// the lever drops; on "baseline of chaos" the rail SHATTERS into drifting dots,
// DETERMINISTIC wipes out and "You need a baseline of chaos" wipes in; on "real
// world" it steps off the broken rail onto uneven ground and keeps walking.
// Lower third wipes up 2.0s in, out 7.6s (band x40-380 y880-990).
if (want("g01")) {
  const id = "g01", D = dur(id), [x, y, w, h] = boxOf(id);
  const F = fg(id), M = dim(id);
  const tDet = cueIn(id, "completely deterministic");
  const tLearn = cueIn(id, "it cannot learn");
  const tChaos = cueIn(id, "baseline of chaos");
  const tReal = cueIn(id, "real world");
  // Right-plate reflow (human sign-off 2026-11-12: cards sit on the RIGHT wall,
  // box 500x480 via boxOf). The hero-canvas drawing (railY 442, scale 0.42, lever
  // 332/358, ground ~540) was rescaled to sit inside a 500x480 card with the 14px
  // interior padding. Feet/rail line lands at F = 330; the plate/line2 label slot
  // runs below it; the step-off (+66, kept) puts the feet on the ground path.
  const railY = 316;                                     // rail top line (feet land at railY + 14 = 330)
  const HUM_LEFT = 0, HUM_SCALE = 0.32, HUM_TOP = Math.round(railY + 14 - 504 * HUM_SCALE);
  const hum = humanoid("h1", HUM_LEFT, HUM_TOP, HUM_SCALE, { fill: C.bg, visor: C.rule, hat: true });
  // rail: two segments + tick stamps landing at the feet; lock glyph (accent);
  // 14 shatter dots (muted, drifting); control lever; uneven ground (hidden till 9.1s)
  const ticks = [0, 1, 2, 3, 4].map(k => `<rect class="tick" x="${56 + k * 56}" y="${railY - 2}" width="44" height="6" rx="3" fill="${M}" opacity="0"/>`).join("");
  const dots = [...Array(14).keys()].map(k =>
    `<circle class="dot" cx="${46 + k * 29}" cy="${railY + 18}" r="${3 + (k % 3)}" fill="${M}" opacity="0"/>`).join("");
  const rail = `<svg style="position:absolute;left:0;top:0;overflow:visible" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <line id="rail-a" x1="40" y1="${railY + 14}" x2="266" y2="${railY + 14}" pathLength="1" stroke="${F}" stroke-width="5" stroke-linecap="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>
      <line id="rail-b" x1="294" y1="${railY + 14}" x2="460" y2="${railY + 14}" pathLength="1" stroke="${F}" stroke-width="5" stroke-linecap="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>
      <g id="lock" style="opacity:0">
        <rect x="262" y="${railY + 6}" width="26" height="20" rx="4" fill="${C.accent}"/>
        <path d="M267,${railY + 6} L267,${railY - 4} C267,${railY - 12} 283,${railY - 12} 283,${railY - 4} L283,${railY + 6}" fill="none" stroke="${C.accent}" stroke-width="5" stroke-linecap="round"/>
      </g>
      <g id="lever" style="transform:none">
        <line x1="280" y1="${railY + 14}" x2="280" y2="268" stroke="${F}" stroke-width="5" stroke-linecap="round"/>
        <circle cx="280" cy="261" r="10" fill="${F}"/>
      </g>
      ${dots}${ticks}
      <path id="ground" d="M28,410 L96,400 L164,414 L232,402 L300,416 L368,404 L436,414 L472,406" fill="none" stroke="${M}" stroke-width="5" stroke-linecap="round" style="opacity:0"/>
    </svg>`;
  const plate = T("DETERMINISTIC", 14, 344, 28, { w: w - 28, align: "center", weight: 900, cls: "disp", color: M, id: "plate" });
  const hook = T(`If your system is ${A("completely deterministic")},<br/>it cannot learn.`, 14, 16, 36, { w: w - 28, weight: 900, cls: "disp", id: "hook", lh: 1.1 });
  const line2 = T("You need a baseline of chaos", 14, 424, 26, { w: w - 28, weight: 700, color: M, id: "line2", lh: 1.15 });
  // lower third: RIGHT wall per the human sign-off 2026-11-12 (cutsheet boxes.lower
  // = [1540,880,340,110]). Opaque over the lamp zone; bottom 990 is clear of the
  // LAMP gate (which only checks cards whose id matches the part).
  const [lx, ly, lw, lh] = [1540, 880, 340, 110];
  const lt = `<div id="lt" class="opaque" style="position:absolute;left:${lx}px;top:${ly}px;width:${lw}px;height:${lh}px;border-radius:6px">
      ${T(BRAND.presenter.name, 18, 10, 30, { weight: 900, cls: "disp", lh: 1.1 })}
      ${T(BRAND.presenter.role, 18, 48, 19, { weight: 500, color: "#B9B2A8", lh: 1.15 })}
      ${T(BRAND.channel.handle, 18, 80, 18, { weight: 700, color: C.accent, lh: 1.1 })}</div>`;
  const body = cardHTML(id, x, y, w, h, rail + hum + plate + hook + line2) + lt;
  let js = wipeUp(`#${id}`, 0, 0.4);
  js += humWalk("h1", -60, 225, 0, 2.6, 0.32);           // frame 1: mid-stride (opensOnMotion); ends x=220, right grip (220+59) at the lever (280)
  // idle: LEFT arm + head only (humIdle's right-arm yoyo would snap back the
  // grip-slack drop at "cannot learn")
  {
    const n = 3;
    js += `tl.fromTo("#h1-armL",{rotation:0,svgOrigin:"72 134"},{rotation:2.5,svgOrigin:"72 134",duration:0.8,yoyo:true,repeat:${2 * n - 1},ease:"sine.inOut",immediateRender:false},2.9);\n`;
    js += `tl.fromTo("#h1-head",{rotation:0,svgOrigin:"120 104"},{rotation:3,svgOrigin:"120 104",duration:0.8,yoyo:true,repeat:${2 * n - 1},ease:"sine.inOut",immediateRender:false},2.9);\n`;
  }
  js += drawOn("rail-a", 0.1, 0.4) + drawOn("rail-b", 0.1, 0.4);
  // tick stamps land with the steps (DETERMINISTIC ticks at its feet)
  [0, 1, 2, 3, 4].forEach(k => { js += `tl.fromTo("#g01 .tick:nth-of-type(${k + 1})",{opacity:0},{opacity:0.7,duration:0.12,immediateRender:false},${(0.5 + k * 0.42).toFixed(3)});\n`; });
  js += show("#plate", 0.55, 0.3);
  js += wipeUp("#hook", 0.45, 0.4);                      // NO type in frame 1
  // "completely deterministic": the accent LOCK clicks onto the rail (one accent)
  js += `tl.fromTo("#lock",{opacity:0,scale:1.7,transformOrigin:"50% 60%"},{opacity:1,scale:1,duration:0.18,ease:"back.out(2.4)",immediateRender:false},${f3(tDet + 0.5)});\n`;
  // "cannot learn": grip slackens (right arm drops, gripper opens), lever falls
  js += `tl.fromTo("#h1-armR",{rotation:0,svgOrigin:"168 134"},{rotation:20,svgOrigin:"168 134",duration:0.4,ease:"power2.in",immediateRender:false},${f3(tLearn)});\n`;
  js += `tl.fromTo("#h1-gripR",{scaleX:1,svgOrigin:"184 288"},{scaleX:1.5,svgOrigin:"184 288",duration:0.25,immediateRender:false},${f3(tLearn + 0.15)});\n`;
  js += `tl.fromTo("#lever",{rotation:-5,svgOrigin:"280 330"},{rotation:14,svgOrigin:"280 330",duration:0.35,ease:"bounce.out",immediateRender:false},${f3(tLearn + 0.1)});\n`;
  // "baseline of chaos": rail shatters into drifting dots; label swap
  js += hide("#rail-b", tChaos, 0.18) + hide("#rail-a", tChaos + 0.05, 0.18);
  js += hide("#lock", tChaos, 0.15) + hide("#plate", tChaos, 0.25);
  js += `tl.fromTo("#g01 .tick",{opacity:0.7},{opacity:0,duration:0.25,immediateRender:false},${f3(tChaos)});\n`;
  js += [...Array(14).keys()].map(k =>
    `tl.fromTo("#g01 .dot:nth-of-type(${k + 1})",{opacity:0,y:0,x:0},{opacity:0.85,y:${-10 - (k % 5) * 4},x:${14 + (k % 7) * 4},duration:0.3,immediateRender:false},${(tChaos + 0.08 + k * 0.03).toFixed(3)});
tl.fromTo("#g01 .dot:nth-of-type(${k + 1})",{opacity:0.85,y:${-10 - (k % 5) * 4},x:${14 + (k % 7) * 4}},{opacity:0,y:${-24 - (k % 5) * 6},x:${30 + (k % 7) * 5},duration:3.2,ease:"none",immediateRender:false},${(tChaos + 0.38 + k * 0.03).toFixed(3)});\n`).join("");
  js += wipeUp("#line2", tChaos + 0.25, 0.4);
  // "real world": steps off onto the uneven ground and keeps walking
  js += `tl.fromTo("#ground",{opacity:0},{opacity:1,duration:0.01,immediateRender:false},${f3(tReal - 0.1)});\n`;
  js += `tl.fromTo("#h1",{y:0},{y:66,duration:0.5,ease:"power1.in",immediateRender:false},${f3(tReal)});\n`;
  js += humWalk("h1", 220, 262, tReal + 0.15, 0.85, 0.32, 66);   // ends x=254, still on the ground path (28-472)
  js += wipeUp("#lt", 2.0, 0.35);
  js += wipeDown("#lt", 7.6, 0.3);
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}

// =================================================================== g02
// The opening statement, right plate (human treatment). Eyebrow THE CLAIM; verbatim
// build; ONE accent: 'stochasticity'. Attribution lands on "Dennis Noble"; the card
// ENDS at 'quoting Alan Turing.' (human sign-off 2026-11-12: the 'back to' hung).
// The card prints '1950' (human D1 decision 2026-11-12: locked plan; this card is
// the only place the year appears).
if (want("g02")) {
  const id = "g02", D = dur(id), [x, y, w, h] = boxOf(id);
  const M = dim(id);
  const lines = [
    { id: "q0", c: cueIn(id, "introduce stochasticity"), txt: `Unless you introduce ${A("stochasticity")}` },
    { id: "q1", c: cueIn(id, "into the learning"), txt: "into the learning process," },
    { id: "q2", c: cueIn(id, "you cannot get"), txt: "you cannot get a machine" },
    { id: "q3", c: cueIn(id, "handle the real"), txt: "to handle the real world." },
  ];
  const flow = `<div style="position:absolute;left:26px;top:64px;width:448px;font-family:Satoshi,sans-serif;font-variation-settings:'wght' 900;font-size:32px;line-height:1.18">` +
    lines.map(l => `<div id="${l.id}" style="margin-bottom:14px">${l.txt}</div>`).join("") + `</div>`;
  const body = cardHTML(id, x, y, w, h,
    EYEBROW("THE CLAIM", 26, 24, M, "eyebrow") + flow +
    `<div id="rule" style="position:absolute;left:26px;top:322px;width:70px;height:5px;background:${C.rule};border-radius:2px;transform:scaleX(0);transform-origin:left center"></div>` +
    T("Dennis Noble", 26, 340, 28, { weight: 900, cls: "disp", id: "a1" }) +
    T("on biological intelligence,", 26, 378, 21, { weight: 500, color: M, id: "a2" }) +
    T("quoting Alan Turing.", 26, 406, 21, { weight: 700, color: M, id: "a3" }) +
    T("1950", 26, 434, 21, { weight: 700, color: M, id: "a4" }));
  let js = wipeUp(`#${id}`, 0, 0.4) + show("#eyebrow", 0.15, 0.3);
  lines.forEach(l => { js += wipeUp(`#${l.id}`, l.c, 0.35); });
  js += ruleIn("#rule", cueIn(id, "Dennis Noble said that"), 0.4);
  js += rowUp("#a1", cueIn(id, "Dennis Noble said that"), 0.35);
  js += rowUp("#a2", cueIn(id, "biological intelligence"), 0.35);
  js += rowUp("#a3", cueIn(id, "quoting Alan Turing"), 0.35);
  // 1950 (human D1 decision 2026-11-12: locked plan, the card is the only place
  // the year appears). Lands with the attribution, one stagger behind a3.
  js += rowUp("#a4", cueIn(id, "quoting Alan Turing") + 0.2, 0.35);
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}

// =================================================================== g03
// 'a deterministic robot policy' struck in $accent on "failed miserably" (the
// strike is the scene's ONE accent); '1 week' 160px + '0 successes' land under it.
if (want("g03")) {
  const id = "g03", D = dur(id), [x, y, w, h] = boxOf(id);
  const M = dim(id);
  const tFail = cueIn(id, "failed miserably");
  const body = cardHTML(id, x, y, w, h,
    T("the attempt:", 14, 14, 26, { weight: 500, color: M, id: "lead" }) +
    T("a deterministic robot", 14, 60, 34, { weight: 900, cls: "disp", lh: 1.1, nowrap: true, id: "term" }) +
    T(struck("stk", "policy", C.accent, 6), 14, 104, 34, { weight: 900, cls: "disp", lh: 1.1, nowrap: true, id: "term2" }) +
    // '1 week' keeps the 160px stat floor (style.json statMinFontPx). At 160px the
    // natural advance is 517px and the card interior is 472 (500 - 2x14 padding),
    // so it keeps its size and the tracking does the fitting: -0.07em measures
    // ~450px (PIL, Satoshi-Black). Never wrap, never below 160. (T() called with
    // the same args statLine would emit; statLine has no ls pass-through.)
    T("1 week", 14, 170, 160, { weight: 900, cls: "disp", id: "stat", ls: -0.07 }) +
    T("0 successes", 14, 360, 38, { weight: 700, color: M, id: "sub" }));
  let js = wipeUp(`#${id}`, 0, 0.35) + rowUp("#lead", 0.08, 0.3) + rowUp("#term", 0.26, 0.3) + rowUp("#term2", 0.34, 0.3);
  js += strikeIn("stk", tFail, 0.4);
  js += rowUp("#stat", tFail + 0.4, 0.4);
  js += rowUp("#sub", tFail + 0.8, 0.4);
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}

// =================================================================== g04
// Community dataset rows land with their 'success' column a dashed empty slot
// ($accent-soft is the scene's ONE accent family: the missing-column slots).
if (want("g04")) {
  const id = "g04", D = dur(id), [x, y, w, h] = boxOf(id);
  const M = dim(id);
  const rows = [0, 1, 2].map(k => {
    const ry = 100 + k * 100;                             // three 86px rows inside the 480 card, miss line below
    return `<div id="row${k}" style="position:absolute;left:14px;top:${ry}px;width:472px;height:86px;border:3px solid ${M};border-radius:8px;opacity:0">
      ${T(`community dataset ${k + 1}`, 16, 12, 24, { weight: 700, color: M })}
      ${T("episodes   fps   features", 16, 48, 17, { weight: 500, color: M })}
      <div style="position:absolute;left:344px;top:12px;width:112px;text-align:center">
        ${T("success", 0, 0, 19, { weight: 900, color: C.accentSoft, nowrap: true })}
        <div style="margin:26px auto 0;width:94px;height:18px;border:3px dashed ${C.accentSoft};border-radius:4px"></div>
      </div></div>`;
  }).join("");
  const body = cardHTML(id, x, y, w, h,
    EYEBROW("COMMUNITY DATA", 14, 18, M, "eyebrow") +
    rows + T("success labels: missing", 14, 408, 28, { weight: 700, color: C.accentSoft, id: "miss" }));
  let js = wipeUp(`#${id}`, 0, 0.3) + show("#eyebrow", 0.05, 0.25);
  const t0 = cueIn(id, "missing success labels");
  // Quirk fix 2026-11-12 (lead): this part is 1.0s and the exit wipe starts at
  // D-0.3-1/30 = 0.667, but the old beats completed at 0.603/0.723 (rows) and
  // 1.043 (miss) so the miss line never fully landed. All four now COMPLETE at
  // least ~0.15s before the wipe (stagger 0.2 -> 0.12; rowUp 0.24 keeps the
  // 0.15 margin): last completion 0.493.
  [0, 1, 2].forEach(k => { js += rowUp(`#row${k}`, Math.max(0.02, t0 + 0.02 + k * 0.12), 0.24); });
  js += rowUp("#miss", Math.max(0.18, t0 + 0.18), 0.3);
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}

// =================================================================== g05
// 'physics has its own mind': hand-coded if/then flowchart; the runaway squiggle
// off the chart is the scene's ONE accent; dashed 'can't hand-code this' chip.
if (want("g05")) {
  const id = "g05", D = dur(id), [x, y, w, h] = boxOf(id);
  const F = fg(id), M = dim(id);
  // id on the PATH, not a wrapping <g>: drawOn animates strokeDashoffset on the
  // element it selects, and the path's inline dashoffset would outrank an inherited
  // value from a parent group (hb.mjs drawOn: a parent group is not stroke-
  // animatable as one; the diamond was invisible under the group id).
  const dia = `<path id="f3" d="M145,204 L189,236 L145,268 L101,236 Z" pathLength="1" fill="none" stroke="${F}" stroke-width="3.5" stroke-linejoin="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>`;
  const flow = `<svg style="position:absolute;left:0;top:0;overflow:visible" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect id="f1" x="70" y="110" width="150" height="48" rx="8" pathLength="1" fill="none" stroke="${F}" stroke-width="3.5" style="stroke-dasharray:1;stroke-dashoffset:1"/>
      <line id="f2" x1="145" y1="158" x2="145" y2="202" pathLength="1" stroke="${F}" stroke-width="3.5" style="stroke-dasharray:1;stroke-dashoffset:1"/>
      ${dia}
      <line id="f4" x1="145" y1="268" x2="145" y2="300" pathLength="1" stroke="${F}" stroke-width="3.5" style="stroke-dasharray:1;stroke-dashoffset:1"/>
      <rect id="f5" x="70" y="300" width="150" height="48" rx="8" pathLength="1" fill="none" stroke="${F}" stroke-width="3.5" style="stroke-dasharray:1;stroke-dashoffset:1"/>
      <path id="run" d="M225,236 C280,214 300,270 350,244 C400,218 400,300 458,276" pathLength="1" fill="none" stroke="${C.accent}" stroke-width="5" stroke-linecap="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>
    </svg>`;
  const body = cardHTML(id, x, y, w, h,
    T("physics has its own mind", 14, 16, 36, { w: w - 28, weight: 900, cls: "disp", id: "head" }) +
    flow + T("can't hand-code this", 252, 310, 22, { weight: 700, color: M, id: "chip" }) +
    `<div id="chipd" style="position:absolute;left:236px;top:302px;width:238px;height:40px;border:3px dashed ${M};border-radius:22px;opacity:0"></div>`);
  let js = wipeUp(`#${id}`, 0, 0.35) + rowUp("#head", 0.1, 0.3);
  js += drawOn("f1", 0.3, 0.3) + drawOn("f2", 0.5, 0.2) + drawOn("f3", 0.62, 0.35) + drawOn("f4", 0.92, 0.2) + drawOn("f5", 1.02, 0.3);
  js += drawOn("run", cueIn(id, "physics has its own mind") + 0.25, 0.9);
  // Quirk fix 2026-11-12 (lead): 'own mind' ends AT the part end, so the old
  // cue (+0.2) scheduled the chip at 1.9s in a 1.7s part and it never rendered.
  // Clamp so the chip is fully landed a beat before the exit wipe at
  // D-0.3-1/30 = 1.367: start at D-0.65, show 0.3 (completes 1.35).
  const tChip = Math.min(cueIn(id, "own mind", "end") + 0.2, D - 0.65);
  js += show("#chipd", tChip, 0.3) + show("#chip", tChip, 0.3);
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}

// =================================================================== g06 + g07
// Today's map: numbered stops draw as a route, each landing on its spoken word.
// Stop 1 lands grey and is struck (that attempt already failed on camera). ONE
// accent: stop 4 'success'. g07 adds stop 5 + the handoff chip, map exits before
// the demo starts.
const STOPS = [["deterministic policy", true], ["what failed", false],
               ["learning from data", false], ["success", false], ["profiling my data", false]];
// Right-plate reflow (500x480 card): stop column rescaled from the 620 hero
// (118 + k*102, dots r24) to start 96-118 with 76-88px pitch, dots r21, labels at
// x146 (PIL: widest label 'deterministic policy' @26 = 236px -> 146+236 = 382 < 486
// interior). Pitch/start differ between g06 (4 stops, roomier) and g07 (5 + ask).
const routeMap = (id, F, M, n, drawn, start, gap) => {
  const CY = k => start + k * gap;
  let s = "", setJs = "";
  for (let k = 0; k < n; k++) {
    const seg = `<line id="seg${k}" x1="112" y1="${k ? CY(k - 1) + 25 : CY(0) - 52}" x2="112" y2="${CY(k) - 25}" pathLength="1" stroke="${M}" stroke-width="4" style="stroke-dasharray:1;stroke-dashoffset:1"/>`;
    const dot = `<circle id="dot${k}" cx="112" cy="${CY(k)}" r="21" pathLength="1" fill="none" stroke="${k === 3 ? C.accent : F}" stroke-width="5" style="stroke-dasharray:1;stroke-dashoffset:1"/>`;
    const num = `<text id="num${k}" x="112" y="${CY(k) + 9}" text-anchor="middle" font-family="Satoshi" font-variation-settings:'wght' 900" font-size="24" fill="${k === 3 ? C.accent : F}" opacity="0">${k + 1}</text>`;
    s += seg + dot + num;
    if (drawn[k]) setJs += `tl.set("#seg${k}",{strokeDashoffset:0},0);tl.set("#dot${k}",{strokeDashoffset:0},0);tl.set("#num${k}",{opacity:1},0);\n`;
  }
  return { svg: `<svg style="position:absolute;left:0;top:0;overflow:visible" width="${wOf(id)}" height="${hOf(id)}" viewBox="0 0 ${wOf(id)} ${hOf(id)}">${s}</svg>`, setJs, CY };
};
const stopLabel = (k, CY, big = false) =>
  // Pass 2 fix 2026-11-13 (final review): the strike rendered accent next to the
  // accent stop-4 ring, two accents in a one-accent scene (style.json
  // accentElementsPerScene). The part's own direction already says stop 1 lands
  // GREY and is struck; g07 bakes the same strike at rest.
  T(STOPS[k][1] ? struck(`st${k}`, STOPS[k][0], C.muted, 5) : STOPS[k][0], 146, CY(k) - 15, big ? 30 : 26,
    { w: 340, weight: k === 3 ? 900 : 700, cls: k === 3 ? "disp" : "", id: `lb${k}` });

if (want("g06")) {
  const id = "g06", D = dur(id), [x, y, w, h] = boxOf(id);
  const F = fg(id), M = dim(id);
  const cues = [cueIn(id, "deterministic policy"), cueIn(id, "what failed"),
                cueIn(id, "learning from data"), cueIn(id, "met success")];
  const r = routeMap(id, F, M, 4, [false, false, false, false], 100, 88);
  const body = cardHTML(id, x, y, w, h,
    EYEBROW("TODAY", 14, 18, M, "eyebrow") + r.svg +
    [0, 1, 2, 3].map(k => stopLabel(k, r.CY, k === 3)).join(""));
  let js = wipeUp(`#${id}`, 0, 0.4) + show("#eyebrow", 0.1, 0.3);
  for (let k = 0; k < 4; k++) {
    js += drawOn(`seg${k}`, Math.max(0.15, cues[k] - 0.25), 0.3) + drawOn(`dot${k}`, cues[k], 0.35)
      + show(`#num${k}`, cues[k] + 0.15, 0.2) + rowUp(`#lb${k}`, cues[k] + 0.1, 0.3);
    if (STOPS[k][1]) js += strikeIn(`st${k}`, cues[k] + 0.9, 0.35);
  }
  // ONE ambient drift: the stop2->stop3 stretch (7.15-10.5s) has no motion in the
  // middle of an 11.4s part (sweep_static rule). The stop-2 label breathes up 7px
  // and settles back (yoyo), so nothing is left displaced at the wipe.
  js += `tl.fromTo("#lb2",{y:0},{y:-7,duration:1.65,ease:"sine.inOut",yoyo:true,repeat:1,immediateRender:false},7.65);\n`;
  js += exitIfFree(id, D, [`#${id}`]);   // g07 is NOT adjacent (2.6s gap): the map wipes
  emit(id, D, body, js);
}
if (want("g07")) {
  const id = "g07", D = dur(id), [x, y, w, h] = boxOf(id);
  const F = fg(id), M = dim(id);
  const tProf = cueIn(id, "profiling");
  const r = routeMap(id, F, M, 5, [true, true, true, true, false], 96, 76);
  // Pass-2 F7 (g06->g07 continuity): g06 strikes 'deterministic policy' (st0) on
  // cue and wipes OUT with it struck; struck spans are authored at rest
  // (scaleX(0)), so g07 used to lose the strike at the cut (non-monotonic across
  // the join). Fix: g07 ENTERS with stop 1 already struck — the strike span is
  // baked struck in the markup (scaleX(1) inline, scoped replace on lb0 only, so
  // no GSAP tween ever touches st0 here: no re-animation, no CSS/GSAP transform
  // conflict, and a seek to any t shows it struck). Stops 2-4 were struck through
  // on g06's own cues; only stop 5 steps on cue, as before.
  const label = k => { const s = stopLabel(k, r.CY, k === 3);
    return k === 0 ? s.replace("transform:scaleX(0)", "transform:scaleX(1)") : s; };
  const body = cardHTML(id, x, y, w, h,
    r.svg + [0, 1, 2, 3, 4].map(label).join("") +
    // ask line 19->20px (pass-2 F1: stepBuild.minFontPx 20 floor, style.json
    // editorial); at 20 Medium it measures 181.5px (PIL) from x146, inside 486.
    T("what did I measure?", 146, r.CY(4) + 26, 20, { weight: 500, color: M, id: "ask" }));
  let js = wipeUp(`#${id}`, 0, 0.3) + r.setJs;
  js += drawOn("seg4", Math.max(0.1, tProf - 0.2), 0.25) + drawOn("dot4", tProf, 0.3)
      + show("#num4", tProf + 0.12, 0.2) + rowUp("#lb4", tProf + 0.08, 0.3)
      + rowUp("#ask", cueIn(id, "what did I measure"), 0.3);
  js += wipeDown(`#${id}`, +(D - 0.3 - 1 / 30).toFixed(3), 0.3);   // leaves before 'let's get started'
  emit(id, D, body, js);
}

// =================================================================== g08
// Notebook ID card over the opening cells (opaque, over screen). Chip prints the
// OCR'd file name exactly; 'kernel attached' ticks on "attached" (ONE accent: the
// tick); the import list lands as he names gymnasium.
// Human review 2026-11-13 finding 5: the MuJoCo grey-out / 'not MuJoCo' footer is
// GONE. He does not say the word yet at 01:50 (first MuJoCo on the cut timeline is
// 2:11), and a grey MuJoCo line read as the card's headline. The MuJoCo-vs-Pymunk
// argument now lives ONLY in gZ1's pills, timed to the line where he actually says
// "does not make use of MuJoCo, ... makes use of Pymunk 2D physics" (2:13).
if (want("g08")) {
  const id = "g08", D = dur(id), [x, y, w, h] = boxOf(id);
  const M = dim(id);
  const tKernel = cueIn(id, "attached to the appropriate kernel");
  const tGym = cueIn(id, "gymnasium");
  const body = cardHTML(id, x, y, w, h,
    EYEBROW("THE NOTEBOOK", 26, 24, M, "eyebrow") +
    T("sim_pushTV2.ipynb", 26, 62, 30, { w: 288, weight: 900, cls: "disp", id: "nb" }) +
    `<div id="kb" style="position:absolute;left:26px;top:126px;opacity:0">` +
      T("kernel attached", 52, 2, 26, { weight: 700, color: M }) + `</div>` +
    tickSVG("kbTick", 34, 140, 15) +
    `<div id="imp" style="position:absolute;left:26px;top:196px;opacity:0">` +
      T("IMPORTS", 0, 0, 20, { weight: 700, color: M, ls: 0.16, upper: false }) +
      T("gymnasium", 0, 30, 33, { w: 288, weight: 900, cls: "disp" }) +
      T("gym_pusht", 0, 74, 27, { w: 288, weight: 700 }) + `</div>`);
  let js = wipeUp(`#${id}`, 0, 0.4) + show("#eyebrow", 0.1, 0.3) + wipeUp("#nb", cueIn(id, "called SIM Push-T V2"), 0.35);
  js += show("#kb", tKernel, 0.3) + tickIn("kbTick", tKernel + 0.15, 0.4);
  js += show("#imp", tGym, 0.35);
  js += `tl.fromTo("#kb",{opacity:1},{opacity:0,duration:0.25,immediateRender:false},${f3(tGym - 0.1)});\n`
      + `tl.fromTo("#kbTick-w",{opacity:1},{opacity:0,duration:0.25,immediateRender:false},${f3(tGym - 0.1)});\n`;
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}
