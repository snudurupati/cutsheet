// 04-lightweight-ontology graphics build. One composition project per part under
// parts/<id>/, generated from here (never hand-written HTML per graphic).
//
// Every timing is DERIVED: part spans from cutsheet.json via span(), cue times from
// outputs/transcript-cut.json via cueIn(). Nothing is typed in, so a plan change
// or a re-splice cannot leave a part rendering at a stale time with every gate green.
//
// GSAP contract (graphics skill, part C): one paused timeline per part registered
// on window.__timelines[id]; absolute seconds; every entrance a fromTo whose
// destination states the VISIBLE end; no random, no timers; no CSS transform on a
// property GSAP also tweens; clip-path wipes instead of blur; instant changes take
// >= 0.2s.
import { execFileSync } from "child_process";
import { readFileSync } from "node:fs";
const OCR_ALL = JSON.parse(readFileSync("screen-ocr.json", "utf8"));
import { C, emit, span, frames, cue, cueIn, panelClass, fg, dim, ART_CSS, DOC,
         LEFT_X0, CARD_W, assertClear, wipeUp, wipeDown, exitAt, GRAIN_HTML, grainJS,
         brainInJar, ocrBox, mapZoom, plateau, zoomItem, markSVG, insetLeftDuring } from "./lib.mjs";

const ONLY = process.argv[2] || "";
const want = id => !ONLY || ONLY.split(",").includes(id);
const dur = id => frames(id) / 30;          // whole frames, see lib.mjs

// ------------------------------------------------------------- shared drawing
// Revised 2026-09-22 after the early spot review (technical + composition passes).
const graphSVG = (id, nodes, edges, stroke, big = -1, bigR = 30) => `
<svg id="${id}" viewBox="0 0 ${Math.max(...nodes.map(n => n[0])) + 60} ${Math.max(...nodes.map(n => n[1])) + 60}"
  width="${Math.max(...nodes.map(n => n[0])) + 60}" height="${Math.max(...nodes.map(n => n[1])) + 60}" style="overflow:visible;color:${stroke}">
  ${nodes.map((n, k) => edges[k] === null ? "" :
    `<line id="${id}-e${k}" x1="${nodes[edges[k]][0]}" y1="${nodes[edges[k]][1]}" x2="${n[0]}" y2="${n[1]}"
      pathLength="1" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"
      style="stroke-dasharray:1;stroke-dashoffset:1"/>`).join("")}
  ${nodes.map((n, k) =>
    `<circle id="${id}-n${k}" cx="${n[0]}" cy="${n[1]}" r="${k === big ? bigR : 13}" pathLength="1"
      fill="${C.bg}" fill-opacity="0" stroke="currentColor" stroke-width="${k === big ? 4 : 2.6}"
      style="stroke-dasharray:1;stroke-dashoffset:1"/>`).join("")}
</svg>`;
// A node is DRAWN (stroke on + fill so edges pass behind it). No placeholder dots:
// until this runs, the node does not exist on screen (composition finding 4).
const drawNode = (g, k, t, upto = 0) =>
  `tl.fromTo("#${g}-n${k}",{strokeDashoffset:1,fillOpacity:0},{strokeDashoffset:${upto},fillOpacity:1,duration:0.3,ease:"power2.out"},${(+t).toFixed(3)});\n`;
const drawEdge = (g, k, t, upto = 0) =>
  `tl.fromTo("#${g}-e${k}",{strokeDashoffset:1},{strokeDashoffset:${upto},duration:0.3,ease:"power2.out"},${(+t).toFixed(3)});\n`;
// STALE reads as decay, never as "not drawn yet" (finding 4, 8): full stroke
// weight, $muted, dashed. Nothing fades toward the background.
const stale = (sels, t, col = C.muted) =>
  `tl.fromTo(${JSON.stringify(sels)},{stroke:"${C.ink}",strokeDasharray:"1"},{stroke:"${col}",strokeDasharray:"0.05 0.035",duration:0.35},${(+t).toFixed(3)});\n`;
// A sign-off item: a small document with a checkbox. The first gets ticked; the
// rest wait (finding 7: stamps must read as approvals, and a queue must look queued).
const signoffSVG = (id, stroke) => `
<svg id="${id}" viewBox="0 0 80 96" width="80" height="96" style="overflow:visible;color:${stroke}">
  <path d="M8,4 L56,4 L72,20 L72,90 L8,90 Z" pathLength="1" fill="${C.bg}" stroke="currentColor" stroke-width="2.6"
    stroke-linejoin="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>
  <rect x="22" y="40" width="30" height="30" rx="5" pathLength="1" fill="none" stroke="currentColor" stroke-width="2.6"
    style="stroke-dasharray:1;stroke-dashoffset:1"/>
  <path id="${id}-tick" d="M27,55 L35,63 L50,45" pathLength="1" fill="none" stroke="currentColor" stroke-width="4"
    stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>
</svg>`;
const drawAll = (sel, t, d = 0.4) =>
  `tl.fromTo(${JSON.stringify(sel)},{strokeDashoffset:1},{strokeDashoffset:0,duration:${d},ease:"power2.out"},${(+t).toFixed(3)});\n`;

// ------------------------------------------------------------------- g01 hook
// "Confidently wrong" (human choice 2026-09-22, over the half-built graph and the
// confused brain). The series' model object, a brain in a jar, with rows of data
// streaming in and its context cable UNPLUGGED, answers "revenue = $7,449,106"
// with a tick. Just after "hallucinates" the tick breaks and the single $accent
// strike crosses the number: it is the demo's rookie-join figure, the real answer
// is $2,187,780, and the verdict (g19) shows the same jar wired up and right. On
// "business context" the dangling cable swings, pointing at the cause. Ticks in
// $ink, never green (human decision: no colour outside brand.md).
if (want("g01")) {
  const id = "g01", D = dur(id), c = p => cueIn(id, p);
  const tHal = c("hallucinates"), tBec = c("because"), tCtx = c("business context"), tBreak = c("your data.");
  const TABLE = `<svg style="position:absolute;left:34px;top:190px;overflow:visible" width="190" height="170">
    ${[0,1,2,3,4].map(r => [0,1,2].map(k => `<rect x="${k*62}" y="${r*32}" width="58" height="28" rx="4"
       fill="none" stroke="${dim(id)}" stroke-width="2"/>`).join("")).join("")}</svg>`;
  const ROWS = [0,1,2,3,4,5].map(i => `<div id="row${i}" style="position:absolute;left:40px;top:${198 + (i % 5) * 32}px;
    width:170px;height:14px;border-radius:7px;background:${fg(id)};opacity:0"></div>`).join("");
  const body = `
<div id="panel" class="${panelClass(id)}" style="position:absolute;left:${LEFT_X0}px;top:150px;width:${CARD_W}px;height:560px;overflow:hidden">
  ${TABLE}${ROWS}
  <svg style="position:absolute;left:0;top:0;overflow:visible" width="664" height="560">
    <path id="cab" d="M496,100 C496,56 450,36 380,44 C340,48 322,64 316,86" fill="none" stroke="${fg(id)}" stroke-width="4" stroke-linecap="round"/>
    <rect id="plug" x="302" y="84" width="24" height="30" rx="4" fill="${C.bg}" stroke="${fg(id)}" stroke-width="3"/>
    <rect x="150" y="96" width="44" height="34" rx="6" fill="none" stroke="${dim(id)}" stroke-width="3" stroke-dasharray="6 5"/>
  </svg>
  <div class="capt" style="position:absolute;left:112px;top:138px;width:120px;text-align:center;font-size:26px;color:${dim(id)}">context</div>
  <div style="position:absolute;left:0;top:0">${brainInJar("bj", 360, 96, 0.85)}</div>
  <div id="ans" style="position:absolute;left:150px;top:458px;width:470px;height:78px;border:3px solid ${fg(id)};border-radius:10px;background:${C.bg}">
    <div class="disp" style="position:absolute;left:24px;top:16px;font-size:38px;font-variation-settings:'wght' 700;color:${fg(id)}">revenue = $7,449,106</div>
  </div>
  <svg style="position:absolute;left:0;top:0;overflow:visible" width="664" height="560">
    <!-- the tick sits ABOVE the answer box: drawn before it, the box's opaque fill hid it -->
    <line x1="496" y1="436" x2="496" y2="458" stroke="${fg(id)}" stroke-width="3"/>
    <path id="tickL" d="M570,494 L584,510" stroke="${fg(id)}" stroke-width="7" stroke-linecap="round" fill="none"/>
    <path id="tickR" d="M584,510 L606,478" stroke="${fg(id)}" stroke-width="7" stroke-linecap="round" fill="none"/>
    <!-- y 503: measured on the render, the digits' body centre (y 497 sat 6px high, human 2026-09-23) -->
    <line id="strike" x1="166" y1="503" x2="556" y2="503" pathLength="1" stroke="${C.accent}" stroke-width="6" stroke-linecap="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>
  </svg>
</div>`;
  // enters on "because" (2.0s), not on the first frame (human 2026-09-23: awkward at 0)
  let js = wipeUp("#panel", Math.max(0, tBec - 0.2));
  js += `tl.fromTo("#panel .dr, #panel .s, #panel .o",{strokeDashoffset:0},{strokeDashoffset:0,duration:0.2},0);\n`;
  [0,1,2,3,4,5].forEach(i => {
    const t0 = +(i * 0.55).toFixed(2);
    js += `tl.fromTo("#row${i}",{x:0,y:0,opacity:0.9,scaleX:1},{x:360,y:${-70 + (i % 3) * 20},opacity:0,scaleX:0.35,duration:1.4,ease:"power1.in",repeat:${Math.floor((D - t0) / 3.3)},repeatDelay:1.9,immediateRender:false},${t0});\n`;
  });
  js += `tl.fromTo("#plug",{rotation:-6,svgOrigin:"314 86"},{rotation:6,svgOrigin:"314 86",duration:1.1,yoyo:true,repeat:${Math.floor(D / 1.1)},ease:"sine.inOut"},0);\n`;
  // review 2026-09-22: the answer resolved in the first second and then idled. It now
  // stays confidently ticked through "business context" (where the cable swings, the
  // cause), and the tick SNAPS and FALLS on "your data.", the failure cue.
  js += `tl.fromTo("#tickL",{rotation:0,x:0,y:0,opacity:1,svgOrigin:"584 510"},{rotation:-60,x:-24,y:70,opacity:0.3,svgOrigin:"584 510",duration:0.5,ease:"power2.in"},${(tBreak + 0.1).toFixed(3)});\n`;
  js += `tl.fromTo("#tickR",{rotation:0,x:0,y:0,opacity:1,svgOrigin:"584 510"},{rotation:50,x:30,y:84,opacity:0.3,svgOrigin:"584 510",duration:0.55,ease:"power2.in"},${(tBreak + 0.15).toFixed(3)});\n`;
  js += `tl.fromTo("#strike",{strokeDashoffset:1},{strokeDashoffset:0,duration:0.4,ease:"power2.out"},${(tBreak + 0.35).toFixed(3)});\n`;
  js += `tl.fromTo("#ans",{scale:1,transformOrigin:"50% 50%"},{scale:1.04,duration:0.25,yoyo:true,repeat:1,ease:"power2.out"},${(tBec + 0.4).toFixed(3)});\n`;
  js += `tl.fromTo("#cab",{strokeWidth:4},{strokeWidth:7,duration:0.3,yoyo:true,repeat:5,ease:"sine.inOut"},${tCtx.toFixed(3)});\n`;
  js += wipeDown("#panel", exitAt(D));
  emit(id, D, body, js);
}

// ----------------------------------------------------------- g02 lower third
if (want("g02")) {
  const id = "g02", D = dur(id);
  const body = `
<div id="lt" class="${panelClass(id)}" style="position:absolute;left:${LEFT_X0}px;top:630px;width:660px;height:164px">
  <div class="disp" style="position:absolute;left:36px;top:24px;font-size:44px;font-variation-settings:'wght' 700">Sreeram Nudurupati</div>
  <div id="rule" class="accentbar" style="position:absolute;left:36px;top:86px;width:400px;height:3px"></div>
  <div class="capt muted" style="position:absolute;left:36px;top:100px;font-size:36px">AI for the Working Data Engineer</div>
</div>`;
  let js = wipeUp("#lt", 0);
  js += `tl.fromTo("#rule",{scaleX:0,transformOrigin:"left center"},{scaleX:1,duration:0.45,ease:"power2.out"},0.4);\n`;
  js += wipeDown("#lt", exitAt(D));
  emit(id, D, body, js);
}

// ------------------------------------------- g03 committee vs lightweight ontology
// Full-frame takeover, 46s (human: keep as one scene). Rebuilt 2026-09-22 to the
// human's notes ("feels empty; show the committee approval; visualise data has
// moved on and AI making decisions on stale data; label the 3 files CONVENTIONS,
// STANDARDS and REQUIREMENTS") and the composition review:
//  M1  LEFT  the enterprise graph, stamped "snapshot 1 Jul", with the committee
//            queue under it (first approval ticked in $ink, the rest waiting).
//      RIGHT a live SOURCE DATA feed: new dated rows keep arriving and "today"
//            ticks forward from 1 Jul, the whole 46s. On "data has moved on" the
//            feed races ahead while the graph's snapshot date stays frozen and its
//            nodes go stale (muted, dashed, full weight).
//      BELOW the hook's brain in a jar, WIRED to the stale graph; on "making
//            decisions" it emits decision cards stamped "based on 1 Jul · stale".
//  M2  on "easier fix" the divider draws and M1 settles into the left half (inside
//            title-safe, headers at full size so the sides compare as states, not
//            as sizes). On "lightweight ontology" three clusters lift OUT of the
//            graph and become CONVENTIONS.md / STANDARDS.md / REQUIREMENTS.md
//            under one bracket, "owned by the project team"; a second jar on the
//            right is wired to them and emits "decision · based on today".
//            On "approval bottlenecks" the waiting approvals go grey.
// One $accent: the ownership bracket. Continuous motion: the feed never stops,
// plus the 1.00 -> 1.03 drift and grain.
if (want("g03")) {
  const id = "g03", D = dur(id), c = p => cueIn(id, p);
  const tCom = c("committee"), tProc = c("approval process"), tMoved = c("data has moved on"),
        tDec = c("making decisions"), tStale = c("stale data"), tEasy = c("easier fix"),
        tOnt = c("lightweight ontology"), tOwn = c("markdown files owned"), tBot = c("approval bottlenecks");
  // graph, 22 nodes, in its own 700x380 box
  const N = [[300,150],[400,90],[500,160],[360,240],[590,90],[460,260],[640,200],[560,290],
             [230,260],[330,330],[610,330],[200,160],[120,90],[680,110],[100,220],[260,70],
             [140,320],[420,370],[520,40],[40,150],[700,260],[480,340]];
  const E = [null,0,1,0,2,3,4,5,3,8,7,0,11,4,11,1,8,9,4,12,6,17];
  const CORE = 12, GROW0 = 4.0, GSTEP = (tMoved + 2 - GROW0) / (N.length - CORE);
  const born = k => k < CORE ? 0.1 + k * 0.25 : GROW0 + (k - CORE) * GSTEP;
  const GX = 140, GY = 170;                       // graph origin on the M1 canvas
  const DATES = Array.from({ length: 22 }, (_, i) => `${i + 1} Jul`);
  const FEED_ROWS = 18;                           // rows arrive over the whole 46s
  const tRow = i => i < 6 ? 0.6 + i * 1.6 : 10 + (i - 6) * ((D - 12) / (FEED_ROWS - 6)) * (i > 9 ? 0.8 : 1);
  const DECS = 3, tD = i => tDec + 0.2 + i * 0.9;
  const FILES = ["CONVENTIONS.md", "STANDARDS.md", "REQUIREMENTS.md"];
  const CL = [[0, 1, 2], [3, 5, 9], [6, 7, 10]];  // clusters lifted out as the files
  // M2: M1 scales 0.5 about (0,0), shifted to sit inside the left half's title-safe area
  // M2: the feed and queue fade; the graph -> jar -> decisions chain (bbox x 140-1780,
  // y 170-950) settles into the left half at 0.55, inside title-safe (x 107-932)
  const SC = 0.55, MX = 30, MY = 232;
  const m1pt = (x, y) => [x * SC + MX, y * SC + MY];
  const FX = [1060, 1310, 1560], FY = 330;
  const body = `
<div style="position:absolute;inset:0;background:${C.bg}"></div>
<div style="position:absolute;inset:0;opacity:.08;background:radial-gradient(ellipse at 60% 45%, ${C.accentSoft} 0%, transparent 62%)"></div>
<div style="position:absolute;inset:0;opacity:.06;background-image:linear-gradient(${C.rule} 1px,transparent 1px),linear-gradient(90deg,${C.rule} 1px,transparent 1px);background-size:60px 60px"></div>
<div id="drift" style="position:absolute;inset:0">
 <div id="m1" style="position:absolute;left:0;top:0;width:1920px;height:1080px">
  <div id="gtitle" class="disp" style="position:absolute;left:${GX}px;top:${GY - 90}px;font-size:40px;font-variation-settings:'wght' 700;color:${C.ink}">Enterprise knowledge graph</div>
  <div id="snap" class="capt" style="position:absolute;left:${GX}px;top:${GY - 38}px;font-size:28px;color:${C.muted}">snapshot: 1 Jul</div>
  <div style="position:absolute;left:${GX}px;top:${GY}px">${graphSVG("gb", N, E, C.ink)}</div>
  <div id="queue" style="position:absolute;left:${GX}px;top:${GY + 410}px;width:560px">
    <div class="capt eyebrow" style="font-size:24px;color:${C.muted}">Committee sign-off</div>
    ${[0,1,2,3,4].map(i => `<div id="so${i}" style="position:absolute;left:${i * 104}px;top:42px">${signoffSVG("sf" + i, C.ink)}</div>`).join("")}
  </div>
  <div id="feed" style="position:absolute;left:1120px;top:${GY - 90}px;width:660px;height:430px">
    <div class="disp" style="position:absolute;left:0;top:0;font-size:40px;font-variation-settings:'wght' 700;color:${C.ink}">Source data</div>
    <div data-layout-allow-overlap class="capt" style="position:absolute;left:0;top:52px;font-size:28px;color:${C.muted}">today:</div>
    ${Array.from({ length: FEED_ROWS + 1 }, (_, i) => `<div id="td${i}" data-layout-allow-overlap class="capt" style="position:absolute;left:110px;top:52px;font-size:28px;color:${C.ink};opacity:${i ? 0 : 1}">${DATES[Math.min(21, i)]}</div>`).join("")}
    <div style="position:absolute;left:0;top:100px;width:620px;height:336px;overflow:hidden;border-top:2px solid ${C.rule}">
      ${Array.from({ length: FEED_ROWS }, (_, i) => `<div id="fr${i}" style="position:absolute;left:0;top:0;width:620px;height:48px;border-bottom:2px solid ${C.rule};opacity:0">
        <div class="capt" style="position:absolute;left:8px;top:8px;font-size:26px;color:${C.ink}">${DATES[Math.min(21, i + 1)]}</div>
        <div style="position:absolute;left:150px;top:20px;width:${240 + (i * 53) % 180}px;height:10px;border-radius:5px;background:${C.muted}"></div></div>`).join("")}
    </div>
  </div>
  <svg style="position:absolute;left:0;top:0;overflow:visible" width="1920" height="1080">
    <path id="wire" d="M${GX + 700},${GY + 200} C${GX + 800},${GY + 260} 1060,640 1130,700" pathLength="1" fill="none" stroke="${C.ink}" stroke-width="3" style="stroke-dasharray:1;stroke-dashoffset:1"/>
  </svg>
  <div id="jar1" style="position:absolute;left:0;top:0;opacity:0">${brainInJar("j1", 1130, 640, 0.6)}</div>
  ${Array.from({ length: DECS }, (_, i) => `<div id="dc${i}" style="position:absolute;left:1340px;top:${690 + i * 96}px;width:440px;height:80px;border:3px dashed ${C.muted};border-radius:10px;background:${C.bg};opacity:0">
     <div class="capt" style="position:absolute;left:20px;top:10px;font-size:28px;color:${C.ink}">decision ${i + 1}</div>
     <div class="capt" style="position:absolute;left:20px;top:42px;font-size:26px;color:${C.muted}">based on 1 Jul · stale</div></div>`).join("")}
 </div>
 <div id="hL" class="disp" style="position:absolute;left:110px;top:196px;font-size:34px;font-variation-settings:'wght' 700;color:${C.ink};opacity:0">Enterprise graph · <span style="color:${C.muted}">snapshot 1 Jul</span></div>
 <div id="capL" style="position:absolute;left:110px;top:872px;width:780px;height:84px;border:3px dashed ${C.muted};border-radius:10px;background:${C.bg};opacity:0">
   <div class="capt" style="position:absolute;left:24px;top:20px;font-size:34px;color:${C.ink}">decisions based on 1 Jul · stale</div></div>
 <div id="divider" style="position:absolute;left:959px;top:110px;width:2px;height:860px;background:${C.rule}"></div>
 <div id="hR" class="disp" style="position:absolute;left:1040px;top:196px;font-size:34px;font-variation-settings:'wght' 700;color:${C.ink};opacity:0">Lightweight ontology · <span style="color:${C.muted}">today</span></div>
 ${CL.map((cl, i) => `<div id="cl${i}" style="position:absolute;left:0;top:0;width:1920px;height:1080px;opacity:0">
   <svg viewBox="0 0 1920 1080" width="1920" height="1080" style="overflow:visible">${cl.map(k => {
     const [x, y] = m1pt(GX + N[k][0], GY + N[k][1]);
     return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="8" fill="${C.bg}" stroke="${C.ink}" stroke-width="2.6"/>`; }).join("")}</svg></div>`).join("")}
 ${FILES.map((f, i) => `
 <div id="doc${i}" style="position:absolute;left:${FX[i]}px;top:${FY}px;width:128px;height:160px;color:${C.ink}">
   <div style="transform:scale(.8);transform-origin:top left">${DOC("d" + i)}</div></div>
 `).join("")}
 <svg style="position:absolute;left:0;top:0;overflow:visible" width="1920" height="1080">
   <path id="brk" d="M1030,${FY + 222} L1030,${FY + 244} L1768,${FY + 244} L1768,${FY + 222}" pathLength="1" fill="none" stroke="${C.accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>
   <path id="wire2" d="M1768,${FY + 244} C1792,${FY + 290} 1716,${FY + 300} 1652,662" pathLength="1" fill="none" stroke="${C.ink}" stroke-width="3" style="stroke-dasharray:1;stroke-dashoffset:1"/>
 </svg>
 <div id="own" class="disp" style="position:absolute;left:1030px;top:${FY + 256}px;width:540px;font-size:40px;font-variation-settings:'wght' 700;color:${C.ink};opacity:0">owned by the project team</div>
 <div id="jar2" style="position:absolute;left:0;top:0;opacity:0">${brainInJar("j2", 1560, 650, 0.55)}</div>
 <div id="dn" style="position:absolute;left:1040px;top:872px;width:500px;height:84px;border:3px solid ${C.ink};border-radius:10px;background:${C.bg};opacity:0">
   <div class="capt" style="position:absolute;left:24px;top:20px;font-size:34px;color:${C.ink}">decisions based on today</div></div>
</div>
${GRAIN_HTML}`;
  let js = `tl.fromTo("#drift",{scale:1},{scale:1.03,duration:${D},ease:"power1.inOut",transformOrigin:"50% 50%"},0);\n` + grainJS(D) + "\n";
  js += `tl.fromTo("#j1 .dr",{strokeDashoffset:0},{strokeDashoffset:0,duration:0.2},0);\n`;   // only the jar art is pre-drawn: "#hR ~ div .dr" also caught the file outlines and drew them 25s early (review 2026-09-22)
  N.forEach((_, k) => { const t = born(k); if (E[k] !== null) js += drawEdge("gb", k, t); js += drawNode("gb", k, t + 0.1); });
  // the feed: rows push in at the top, older rows slide down; "today" advances with them
  for (let i = 0; i < FEED_ROWS; i++) {
    const t = +tRow(i).toFixed(3);
    js += `tl.fromTo("#fr${i}",{y:-48,opacity:0},{y:0,opacity:1,duration:0.4,ease:"power2.out",immediateRender:false},${t});\n`;
    for (let j = 0; j < i; j++) js += `tl.fromTo("#fr${j}",{y:${(i - j - 1) * 48}},{y:${(i - j) * 48},duration:0.4,ease:"power2.out",immediateRender:false},${t});\n`;
    // seek-safe date change: one element per date, swapped by opacity (never a callback)
    js += `tl.fromTo("#td${i}",{opacity:1},{opacity:0,duration:0.2,immediateRender:false},${t});\n`;
    js += `tl.fromTo("#td${i + 1}",{opacity:0},{opacity:1,duration:0.2,immediateRender:false},${t});\n`;
  }
  // committee: queue lands on "committee"; ONE approval is ticked, in $ink
  // each sign-off box is hidden until it draws: undrawn outlines showed their start
  // points as dots from 22s (verification 2026-09-23)
  [0,1,2,3,4].forEach(i => { js += `tl.fromTo("#so${i}",{opacity:0},{opacity:1,duration:0.05},${(tCom + i * 0.4).toFixed(3)});\n` + drawAll(`#sf${i} path:not([id$=tick]), #sf${i} rect`, tCom + i * 0.4, 0.4); });
  js += drawAll("#sf0-tick", tCom + 2.4, 0.35);
  js += `tl.fromTo(["#so1","#so2","#so3","#so4"],{y:0},{y:-6,duration:0.5,yoyo:true,repeat:5,ease:"sine.inOut",stagger:0.15},${tProc.toFixed(3)});\n`;
  // data has moved on: the graph goes stale while its snapshot date stays frozen
  const order = N.map((_, k) => k).sort((a, b) => born(a) - born(b));
  order.forEach((k, i) => { js += stale([`#gb-n${k}`, `#gb-e${k}`], tMoved + i * ((tStale + 1 - tMoved) / N.length)); });
  js += `tl.fromTo("#snap",{color:"${C.muted}"},{color:"${C.ink}",duration:0.3,yoyo:true,repeat:3},${tMoved.toFixed(3)});\n`;
  // the AI decides on the stale graph
  js += `tl.fromTo("#jar1",{opacity:0},{opacity:1,duration:0.4},${tProc.toFixed(3)});\n`;   // fills the lower frame early (review)
  js += drawAll("#wire", c("your ai"), 0.6);
  for (let i = 0; i < DECS; i++) js += `tl.fromTo("#dc${i}",{opacity:0,x:-30},{opacity:1,x:0,duration:0.4,ease:"power2.out"},${tD(i).toFixed(3)});\n`;
  // M2
  js += `tl.fromTo("#divider",{scaleY:0,transformOrigin:"50% 0%"},{scaleY:1,duration:0.5,ease:"power2.inOut"},${tEasy.toFixed(3)});\n`;
  js += `tl.fromTo("#m1",{x:0,y:0,scale:1},{x:${MX},y:${MY},scale:${SC},duration:0.8,ease:"power2.inOut",transformOrigin:"0% 0%"},${tEasy.toFixed(3)});\n`;
  // M1's own title and its decision cards go too: #hL and #capL replace them, and the
  // cards ran past the divider at 0.55 (composition review 2026-09-23)
  js += `tl.fromTo(["#feed","#queue","#gtitle","#snap","#dc0","#dc1","#dc2"],{opacity:1},{opacity:0,duration:0.4,immediateRender:false},${tEasy.toFixed(3)});\n`;
  js += `tl.fromTo(["#hL","#hR"],{opacity:0},{opacity:1,duration:0.4,stagger:0.3},${(tEasy + 0.6).toFixed(3)});\n`;
  js += `tl.fromTo("#capL",{opacity:0,y:10},{opacity:1,y:0,duration:0.4},${(tEasy + 0.9).toFixed(3)});\n`;
  CL.forEach((cl, i) => {
    const pts = cl.map(k => m1pt(GX + N[k][0], GY + N[k][1]));
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    const dx = FX[i] + 64 - cx, dy = FY + 80 - cy, t = tOnt + i * 0.45;
    js += `tl.fromTo("#cl${i}",{x:0,y:0,opacity:0},{x:0,y:0,opacity:1,duration:0.2},${(t - 0.2).toFixed(3)});\n`;
    js += `tl.fromTo("#cl${i}",{x:0,y:0},{x:${dx.toFixed(1)},y:${dy.toFixed(1)},duration:0.7,ease:"power2.inOut"},${t.toFixed(3)});\n`;
    js += `tl.fromTo("#cl${i}",{opacity:1},{opacity:0,duration:0.3},${(t + 0.6).toFixed(3)});\n`;
    // hidden until its outline starts: an undrawn round-capped path still shows a dot
    // at its start point, three of them sat on the feed from 21s (technical review 2026-09-23)
    js += `tl.fromTo("#doc${i}",{opacity:0},{opacity:1,duration:0.05},${(t + 0.55).toFixed(3)});\n`;
    js += drawAll(`#d${i} .dr`, t + 0.55, 0.5) + drawAll(`#d${i} .ln`, t + 0.9, 0.4);
    // no file names here (human decision 2026-09-23): g04 names the three files 23s later
  });
  js += drawAll("#brk", tOwn, 0.6) + `tl.fromTo("#own",{opacity:0,clipPath:"inset(0 100% 0 0)"},{opacity:1,clipPath:"inset(0 0% 0 0)",duration:0.5},${(tOwn + 0.4).toFixed(3)});\n`;
  js += `tl.fromTo("#jar2",{opacity:0},{opacity:1,duration:0.4},${(tOwn + 1.4).toFixed(3)});\n`;
  js += `tl.fromTo("#wire2",{opacity:0},{opacity:1,duration:0.05},${(tOwn + 1.6).toFixed(3)});\n` + drawAll("#wire2", tOwn + 1.6, 0.6);
  js += `tl.fromTo("#jar2 .dr, #jar2 .s, #jar2 .o",{strokeDashoffset:0},{strokeDashoffset:0,duration:0.2},${(tOwn + 1.4).toFixed(3)});\n`;
  js += `tl.fromTo("#dn",{opacity:0,x:-30},{opacity:1,x:0,duration:0.4,ease:"power2.out"},${(tOwn + 2.4).toFixed(3)});\n`;
  js += `tl.fromTo(["#sf1","#sf2","#sf3","#sf4"],{color:"${C.ink}"},{color:"${C.rule}",duration:0.4,stagger:0.12},${tBot.toFixed(3)});\n`;
  js += `tl.fromTo(["#doc0","#doc1","#doc2"],{y:0},{y:-6,duration:2.2,yoyo:true,repeat:${Math.max(1, Math.floor((D - tOwn - 2) / 2.2))},ease:"sine.inOut",stagger:0.5},${(tOwn + 1.5).toFixed(3)});\n`;
  emit(id, D, body, js, ["grain.png"]);
}

// --------------------------------------------------------- g04 the context files
// Starts ON the first row (review: no header-only flash), grows by height (never
// cropped), leaves after "build my data pipeline" and returns on "one extra file"
// (human decision), where the third file arrives as a full-weight drawn outline
// with a "new" tag, named ON "requirements for". One $accent: the header rule.
if (want("g04")) {
  const id = "g04", D = dur(id), c = p => cueIn(id, p);
  const tR0 = c("business context"), tR1 = c("coding standards"),
        tOut = cueIn(id, "data pipeline", "end") + 0.25, tBack = c("one extra file"), tName = c("requirements for");
  const rows = [["CONVENTIONS.md", "business context"], ["STANDARDS.md", "data and coding standards"],
                ["REQUIREMENTS.md", "what the marts must answer"]];
  const HEAD = 100, RH = 142, H = n => HEAD + n * RH + 16;
  const body = `
<div id="card" class="${panelClass(id)}" style="position:absolute;left:${LEFT_X0}px;top:200px;width:680px;height:${H(1)}px;overflow:hidden">
  <div class="capt eyebrow muted" style="position:absolute;left:36px;top:28px;font-size:26px">The context files</div>
  <div id="hrule" class="accentbar" style="position:absolute;left:36px;top:68px;width:240px;height:2px"></div>
  ${rows.map(([f, sub], i) => `
  <div id="r${i}" style="position:absolute;left:36px;top:${HEAD + i * RH}px;width:540px;height:${RH - 8}px">
    <div id="ic${i}" style="position:absolute;left:0;top:6px;width:64px;height:80px;color:${fg(id)}">
      <div style="transform:scale(.4);transform-origin:top left">${DOC("f" + i)}</div></div>
    <div id="nm${i}" class="disp" style="position:absolute;left:96px;top:8px;font-size:42px;font-variation-settings:'wght' 700">${f}</div>
    <div id="sb${i}" class="capt muted" style="position:absolute;left:96px;top:64px;font-size:34px">${sub}</div>
    ${i === 2 ? `<div id="nw" class="capt" style="position:absolute;left:88px;top:22px;padding:2px 12px;border:2px solid ${fg(id)};border-radius:14px;font-size:26px">new</div>` : ""}
  </div>`).join("")}
</div>`;
  let js = wipeUp("#card", Math.max(0, tR0 - 0.05));
  js += `tl.fromTo("#hrule",{scaleX:0,transformOrigin:"left center"},{scaleX:1,duration:0.45,ease:"power2.out"},${(tR0 + 0.2).toFixed(3)});\n`;
  const row = (i, t) => `tl.fromTo("#r${i}",{clipPath:"inset(100% 0 0 0)"},{clipPath:"inset(0% 0 0 0)",duration:0.35,ease:"power3.out"},${t.toFixed(3)});\n`
                       + drawAll(`#f${i} .dr`, t + 0.1, 0.4) + drawAll(`#f${i} .ln`, t + 0.3, 0.4);
  js += row(0, Math.max(0, tR0));
  js += `tl.fromTo("#card",{height:${H(1)}},{height:${H(2)},duration:0.35,ease:"power3.out"},${tR1.toFixed(3)});\n` + row(1, tR1);
  js += `tl.fromTo("#r2",{opacity:0},{opacity:0,duration:0.2},0);\n`;
  js += wipeDown("#card", tOut);
  js += `tl.fromTo("#card",{height:${H(2)}},{height:${H(3)},duration:0.2},${(tBack - 0.25).toFixed(3)});\n`;
  js += wipeUp("#card", tBack, 0.35, true);
  js += `tl.fromTo("#r2",{opacity:0,clipPath:"inset(0% 0 0 0)"},{opacity:1,clipPath:"inset(0% 0 0 0)",duration:0.25},${tBack.toFixed(3)});\n`;
  js += `tl.fromTo(["#nm2","#sb2"],{opacity:0},{opacity:0,duration:0.2},${tBack.toFixed(3)});\n`;
  js += drawAll("#f2 .dr", tBack + 0.1, 0.45);
  js += `tl.fromTo("#nw",{opacity:0,scale:0.6,transformOrigin:"0% 50%"},{opacity:1,scale:1,duration:0.35,ease:"back.out(2)"},${(tBack + 0.5).toFixed(3)});\n`;
  js += `tl.fromTo("#ic2",{scale:1},{scale:1.1,duration:0.3,yoyo:true,repeat:1,ease:"power2.out",transformOrigin:"50% 50%"},${(tBack + 0.5).toFixed(3)});\n`;
  // on "requirements for": the tag makes way for the name
  js += `tl.fromTo("#nw",{opacity:1},{opacity:0,duration:0.25},${(tName - 0.1).toFixed(3)});\n`;
  js += `tl.fromTo(["#nm2","#sb2"],{opacity:0,clipPath:"inset(0 100% 0 0)"},{opacity:1,clipPath:"inset(0 0% 0 0)",duration:0.5,ease:"power2.out",stagger:0.4},${tName.toFixed(3)});\n`;
  js += drawAll("#f2 .ln", tName + 0.2, 0.4);
  js += wipeDown("#card", exitAt(D));
  emit(id, D, body, js);
}

// ======================================================= demo-scene overlays
// All OPAQUE (over the screen recording, style.md). Positions from the free-space
// map of screen-ocr.json over each part's window, clear of the inset. Every
// element lands ON its cue; nothing is typed that could be drawn; nothing under
// 28px (review lessons from g01-g04, 2026-09-22).
const cueAfter = (id, phrase, after, which = "start") => {
  const [s] = span(id); return +((cue(phrase, s + after, which)) - s).toFixed(3);
};
const countUp = (sel, from, to, t0, d0, dec = 0, prefix = "", suffix = "") => {
  const t = +t0, d = +d0;                      // accept numbers or formatted strings
  return `
(function(){ const el=document.querySelector(${JSON.stringify(sel)}); const o={v:${from}};
  const f=v=>${JSON.stringify(prefix)}+v.toFixed(${dec}).replace(/\\B(?=(\\d{3})+(?!\\d))/g,",")+${JSON.stringify(suffix)};
  el.textContent=f(${from});
  tl.fromTo(o,{v:${from}},{v:${to},duration:${d},ease:"power2.out",onUpdate:()=>{el.textContent=f(o.v);}},${t.toFixed(3)});
  tl.fromTo(o,{v:${to}},{v:${to},duration:0.2,onUpdate:()=>{el.textContent=f(o.v);}},${(t + d + 0.05).toFixed(3)});
})();`; };

// ---------------------------------------------------------- g05 model + date
// Requested by the human: the model and date on screen because models change so
// often. Date WITHOUT a weekday (spoken "Thursday", 22 Sep 2026 was a Tuesday).
if (want("g05")) {
  const id = "g05", D = dur(id), c = p => cueIn(id, p);
  const tDate = c("september"), tS = c("sonnet 4.5"), tO5 = c("used opus"), tNow = c("i'm using opus");
  const L = [["Sonnet 4.5", tS], ["Opus 5", tO5], ["Opus 5.5", tNow]];
  const body = `
<div id="card" class="${panelClass(id)}" style="position:absolute;left:300px;top:420px;width:600px;height:180px;overflow:hidden">
  <div class="capt eyebrow" style="position:absolute;left:40px;top:32px;font-size:22px;color:${dim(id)}">This run</div>
  <div class="disp" style="position:absolute;left:40px;top:70px;font-size:48px;font-variation-settings:'wght' 900">Claude Opus 5.5</div>
  <div class="capt" style="position:absolute;left:40px;top:132px;font-size:30px;color:${dim(id)}">effort: medium</div>
  <div id="date" class="capt" style="position:absolute;left:40px;top:178px;font-size:30px;color:${dim(id)}">recorded 22 Sep 2026</div>
  <svg style="position:absolute;left:40px;top:250px;overflow:visible" width="520" height="110">
    <line id="lad" x1="90" y1="30" x2="430" y2="30" pathLength="1" stroke="${dim(id)}" stroke-width="2.4" style="stroke-dasharray:1;stroke-dashoffset:1"/>
    ${L.map((_, i) => `<circle id="ld${i}" cx="${90 + i * 170}" cy="30" r="${i === 2 ? 12 : 9}" fill="${i === 2 ? C.accent : fg(id)}" opacity="0"/>`).join("")}
  </svg>
  ${L.map(([n], i) => `<div id="lt${i}" class="capt" style="position:absolute;left:${40 + 90 + i * 170 - 85}px;width:170px;text-align:center;top:300px;font-size:28px;color:${i === 2 ? fg(id) : dim(id)}">${n}</div>`).join("")}
</div>`;
  let js = wipeUp("#card", 0);
  js += `tl.fromTo("#card",{height:180},{height:236,duration:0.35,ease:"power3.out"},${(tDate - 0.05).toFixed(3)});\n`;
  js += `tl.fromTo("#date",{clipPath:"inset(0 100% 0 0)"},{clipPath:"inset(0 0% 0 0)",duration:0.45,ease:"power2.out"},${tDate.toFixed(3)});\n`;
  js += `tl.fromTo("#card",{height:236},{height:400,duration:0.4,ease:"power3.out"},${(tS - 0.3).toFixed(3)});\n`;
  js += drawAll("#lad", tS - 0.2, 0.9);
  L.forEach(([, t], i) => {
    js += `tl.fromTo("#ld${i}",{opacity:0,scale:0.4,transformOrigin:"50% 50%"},{opacity:1,scale:1,duration:0.3,ease:"back.out(2)"},${t.toFixed(3)});\n`;
    js += `tl.fromTo("#lt${i}",{clipPath:"inset(100% 0 0 0)"},{clipPath:"inset(0% 0 0 0)",duration:0.35,ease:"power3.out"},${t.toFixed(3)});\n`;
  });
  js += wipeDown("#card", exitAt(D));
  emit(id, D, body, js);
}

// -------------------------------------------------------- g07 build summary
// Revised 2026-09-22 (composition review): LOWER-LEFT, where the terminal is empty
// most of this window (text in 23/53 OCR samples there vs 45/53 top right); the
// card enters WITH "18 20 minutes" (it had landed 3.9s early on "came back"); the
// counts are stat-size (160px floor, style.md) and finish ON their words in the
// second read-out. Inside title-safe (y <= 972).
if (want("g07")) {
  const id = "g07", D = dur(id), c = p => cueIn(id, p);
  const tMin = c("18 20 minutes"), t17 = cueAfter(id, "17 models", 25), t228 = cueAfter(id, "228", 25),
        t489 = cueAfter(id, "489 macros", 25), tWeek = c("a week");
  const R = [["17", "models", t17], ["228", "tests", t228], ["489", "macros", t489]];
  const COLX = [40, 40 + 159 + 80, 40 + 159 + 80 + 301 + 80];          // measured widths + 80px gutters
  // H1/H2 leave the 30px label row clear of the bottom border: at 448 the labels were
  // sliced through for 14s (composition review 2026-09-23)
  const H0 = 214, H1 = 472, H2 = 536;
  const body = `
<div id="card" class="${panelClass(id)}" style="position:absolute;left:96px;top:${972 - H2}px;width:1020px;height:${H0}px;overflow:hidden">
  <div class="capt eyebrow" style="position:absolute;left:40px;top:26px;font-size:26px;color:${dim(id)}">One long-horizon run</div>
  <div class="disp" style="position:absolute;left:36px;top:62px;font-size:110px;font-variation-settings:'wght' 900;line-height:1.1">~18-20 min</div>
  <div id="rl" class="accentbar" style="position:absolute;left:40px;top:192px;width:320px;height:4px"></div>
  ${R.map(([, lab], i) => `
  <div id="n${i}" class="disp" style="position:absolute;left:${COLX[i]}px;top:202px;font-size:160px;font-variation-settings:'wght' 900;line-height:1.2;opacity:0">0</div>
  <div id="l${i}" class="capt" style="position:absolute;left:${COLX[i] + 4}px;top:404px;font-size:30px;color:${dim(id)};opacity:0">${lab}</div>`).join("")}
  <div id="wk" class="capt" style="position:absolute;left:40px;top:454px;font-size:34px">one engineer: a week, if not weeks</div>
</div>`;
  let js = wipeUp("#card", Math.max(0, tMin - 0.2));
  js += `tl.fromTo("#rl",{scaleX:0,transformOrigin:"left center"},{scaleX:1,duration:0.45,ease:"power2.out"},${(tMin + 0.3).toFixed(3)});\n`;
  js += `tl.fromTo("#card",{height:${H0},y:${H2 - H0}},{height:${H1},y:${H2 - H1},duration:0.4,ease:"power3.out"},${(t17 - 1.2).toFixed(3)});\n`;
  js += `tl.fromTo("#card",{height:${H1},y:${H2 - H1}},{height:${H2},y:0,duration:0.35,ease:"power3.out"},${(tWeek - 0.3).toFixed(3)});\n`;
  js += `tl.fromTo("#card",{y:${H2 - H0}},{y:${H2 - H0},duration:0.2},0);\n`;
  R.forEach(([v, , t], i) => {
    js += `tl.fromTo(["#n${i}","#l${i}"],{opacity:0},{opacity:1,duration:0.2},${(t - 1.0).toFixed(3)});\n`;
    js += countUp(`#n${i}`, 0, +v, t - 1.0, 1.0);
  });
  js += `tl.fromTo("#wk",{clipPath:"inset(0 100% 0 0)"},{clipPath:"inset(0 0% 0 0)",duration:0.5,ease:"power2.out"},${tWeek.toFixed(3)});\n`;
  js += wipeDown("#card", exitAt(D));
  emit(id, D, body, js);
}

// ------------------------------------------------ g09 the double count, drawn
// RIGHT half: one $100 order fans out to three lines and sums to $300 (landing
// just after "double or triple counting"). LEFT half: the real terminal, zoomed in
// demo_scene; the single $accent is an underline under the REAL 7,449,106.52,
// placed through the zoom mapping and drawn ON "inflated", so the evidence
// outranks the drawing (composition review 2026-09-22).
if (want("g09")) {
  const id = "g09", D = dur(id), c = p => cueIn(id, p), [S0] = span(id);
  const tJoin = c("join order with order line"), tDbl = c("double or triple"), tInf = c("inflated"), tFor = c("fortunately");
  const b1 = ocrBox(553.6, /^7449106/), b2 = ocrBox(553.6, /7\.45 million/);
  const u = mapZoom("g08+g09", [Math.min(b1[0], b2[0]), b1[1], Math.max(b1[2], b2[2]), b2[3]]), [p0, p1] = plateau("g08+g09", S0);
  const box = (bid, x, y, w, h) => `<rect id="${bid}" x="${x}" y="${y}" width="${w}" height="${h}" rx="10" pathLength="1" fill="none" stroke="${fg(id)}" stroke-width="3" style="stroke-dasharray:1;stroke-dashoffset:1"/>`;
  const body = `
<div id="half" class="${panelClass(id)}" style="position:absolute;left:966px;top:0px;width:954px;height:1080px;border-radius:0;border-width:0 0 0 6px">
  <div class="capt eyebrow" style="position:absolute;left:60px;top:60px;font-size:26px;color:${dim(id)}">Why the rookie join inflates revenue</div>
  <svg style="position:absolute;left:0;top:0;overflow:visible" width="948" height="1068">
    ${box("ob", 324, 150, 300, 110)}
    ${[0,1,2].map(i => box("lb" + i, 64 + i * 290, 470, 240, 110)).join("")}
    ${[0,1,2].map(i => `<line id="cn${i}" x1="474" y1="260" x2="${184 + i * 290}" y2="470" pathLength="1" stroke="${dim(id)}" stroke-width="2.6" style="stroke-dasharray:1;stroke-dashoffset:1"/>`).join("")}
  </svg>
  <div id="ot" class="disp" style="position:absolute;left:324px;width:300px;text-align:center;top:164px;font-size:30px;line-height:1.2;font-variation-settings:'wght' 700">1 order</div>
  <div id="ov" class="disp" style="position:absolute;left:324px;width:300px;text-align:center;top:204px;font-size:40px;line-height:1.1;font-variation-settings:'wght' 900">$100</div>
  ${[0,1,2].map(i => `<div id="lt${i}" class="capt" style="position:absolute;left:${64 + i * 290}px;width:240px;text-align:center;top:480px;font-size:28px;line-height:1.1;color:${dim(id)}">line ${i + 1}</div>
  <div id="lv${i}" class="disp" style="position:absolute;left:${64 + i * 290}px;width:240px;text-align:center;top:524px;font-size:36px;line-height:1.1;font-variation-settings:'wght' 900;opacity:0">$100</div>`).join("")}
  <div id="sum" style="position:absolute;left:60px;top:660px;width:830px;text-align:center">
    <div class="capt" style="font-size:30px;line-height:1.3;margin-bottom:12px;color:${dim(id)}">summed after the join</div>
    <div id="tot" class="disp" style="font-size:130px;font-variation-settings:'wght' 900;line-height:1.2">$300</div>
    <div class="capt" style="font-size:30px;line-height:1.3;margin-top:8px;color:${dim(id)}">for a $100 order</div>
  </div>
</div>
${markSVG(u[0] - 12, u[1] - 12, u[2] + 12, u[3] + 12, `<rect id="ul" x="${(u[0] - 12).toFixed(1)}" y="${(u[1] - 12).toFixed(1)}" width="${(u[2] - u[0] + 24).toFixed(1)}" height="${(u[3] - u[1] + 24).toFixed(1)}" rx="10" pathLength="1"
    fill="none" stroke="${C.accent}" stroke-width="6" style="stroke-dasharray:1;stroke-dashoffset:1"/>`)}
<div id="real" class="disp" style="position:absolute;left:1026px;top:960px;width:840px;text-align:center;font-size:40px;font-variation-settings:'wght' 700;color:${C.bg};opacity:0">real: 7.45M against 2.19M</div>
<div id="won" class="disp" style="position:absolute;left:1026px;top:960px;width:840px;text-align:center;font-size:40px;font-variation-settings:'wght' 900;color:${C.bg};opacity:0">my agent counted it once: 2.19M</div>`;
  let js = `tl.fromTo("#half",{clipPath:"inset(0 0 0 100%)"},{clipPath:"inset(0 0 0 0%)",duration:0.35,ease:"power3.out"},0);\n`;
  js += `tl.fromTo("#ob",{strokeDashoffset:1},{strokeDashoffset:0,duration:0.5,ease:"power2.out"},0.6);\n`;
  js += `tl.fromTo(["#ot","#ov"],{opacity:0},{opacity:1,duration:0.3},0.9);\n`;
  [0,1,2].forEach(i => {
    js += drawAll(`#cn${i}`, tJoin + i * 0.25, 0.4) + drawAll(`#lb${i}`, tJoin + 0.35 + i * 0.25, 0.4);
    js += `tl.fromTo("#lt${i}",{opacity:0},{opacity:1,duration:0.25},${(tJoin + 0.6 + i * 0.25).toFixed(3)});\n`;
    js += `tl.fromTo("#lv${i}",{opacity:0,scale:0.7,transformOrigin:"50% 50%"},{opacity:1,scale:1,duration:0.3,ease:"back.out(2)"},${(tDbl - 0.6 + i * 0.25).toFixed(3)});\n`;
  });
  js += `tl.fromTo("#sum",{clipPath:"inset(100% 0 0 0)"},{clipPath:"inset(0% 0 0 0)",duration:0.4,ease:"power3.out"},${(tDbl + 0.3).toFixed(3)});\n`;
  js += countUp("#tot", 100, 300, tDbl + 0.3, 1.0, 0, "$");
  if (!(tInf > p0 && tInf < p1)) throw new Error(`g09: "inflated" at ${tInf} is outside the full-zoom window ${p0}-${p1}`);
  js += `tl.fromTo("#ul",{strokeDashoffset:1},{strokeDashoffset:0,duration:0.45,ease:"power2.out"},${tInf.toFixed(3)});\n`;
  js += `tl.fromTo("#real",{opacity:0,y:10},{opacity:1,y:0,duration:0.4},${(tInf + 0.3).toFixed(3)});\n`;
  js += `tl.fromTo("#sum",{opacity:1},{opacity:0.45,duration:0.4},${(tInf + 0.3).toFixed(3)});\n`;
  // the WIN, as loud as the miss (composition review 2026-09-23: "my agent understood
  // the nuance" never reached the screen): the line swaps on "Fortunately"
  js += `tl.fromTo("#real",{opacity:1},{opacity:0,duration:0.25,immediateRender:false},${tFor.toFixed(3)});\n`;
  js += `tl.fromTo("#won",{opacity:0,y:10},{opacity:1,y:0,duration:0.35,ease:"power2.out"},${(tFor + 0.2).toFixed(3)});\n`;
  js += `tl.fromTo("#ul",{opacity:1},{opacity:0,duration:0.2},${Math.min(p1 - 0.2, D - 0.25).toFixed(3)});\n`;
  js += `tl.fromTo("#half",{clipPath:"inset(0 0 0 0%)"},{clipPath:"inset(0 0 0 100%)",duration:0.3,ease:"power2.in"},${exitAt(D).toFixed(3)});\n`;
  emit(id, D, body, js);
}

// -------------------------------------------------- g11 the demo's payoff
// Revised 2026-09-22 (composition review + human: no green): the two figures at
// stat size, side by side, as the screen states them ("(0.49 million)" is the
// mart's 492,928.18; "(2.19 million)" is fct_order's 2,187,780.17), over ONE share
// bar: the mart's solid slice, and the rest hatched in the single $accent, landing
// on "missing a whole chunk". Caption in $muted. "Every test passed" lands on
// "everything was green", in the panel's own dim ink.
if (want("g11")) {
  const id = "g11", D = dur(id), c = p => cueIn(id, p);
  const t500 = c("500k"), tShort = c("way too short"), tGreen = c("everything was green"), tGap = c("whole chunk");
  const A = 2187780.17, B = 492928.18, BW = 1044, wB = Math.round(BW * B / A);
  const body = `
<div id="card" class="${panelClass(id)}" style="position:absolute;left:700px;top:54px;width:1124px;height:462px">
  <div id="eb" class="capt eyebrow" style="position:absolute;left:40px;top:28px;font-size:26px;color:${dim(id)};opacity:0">dbt build: every test passed</div>
  <div class="capt" style="position:absolute;left:40px;top:68px;font-size:28px;color:${dim(id)}">fct_daily_branch_sales</div>
  <div id="vB" class="disp" style="position:absolute;left:36px;top:124px;font-size:160px;font-variation-settings:'wght' 900;line-height:1.2">0.00M</div>
  <div id="la" class="capt" style="position:absolute;left:630px;top:68px;font-size:28px;color:${dim(id)};opacity:0">fct_order</div>
  <div id="vA" class="disp" style="position:absolute;left:626px;top:124px;font-size:160px;font-variation-settings:'wght' 900;line-height:1.2;opacity:0">0.00M</div>
  <div style="position:absolute;left:40px;top:340px;width:${BW}px;height:44px;border:2px solid ${dim(id)}"></div>
  <div id="bB" style="position:absolute;left:40px;top:340px;width:${wB}px;height:44px;background:${fg(id)}"></div>
  <div id="gap" style="position:absolute;left:${40 + wB}px;top:340px;width:${BW - wB}px;height:44px;
       background:repeating-linear-gradient(135deg, ${C.accent} 0 10px, transparent 10px 20px);opacity:0"></div>
  <div id="gl" class="capt" style="position:absolute;left:${40 + wB + 10}px;top:394px;font-size:28px;color:${dim(id)};opacity:0">not in the mart</div>
</div>`;
  let js = wipeUp("#card", Math.max(0, t500 - 0.9));
  js += `tl.fromTo("#bB",{scaleX:0,transformOrigin:"left center"},{scaleX:1,duration:0.8,ease:"power2.out"},${(t500 - 0.8).toFixed(3)});\n`;
  js += countUp("#vB", 0, 0.49, t500 - 0.8, 0.8, 2, "", "M");
  js += `tl.fromTo(["#la","#vA"],{opacity:0},{opacity:1,duration:0.2},${(tShort - 0.2).toFixed(3)});\n`;
  js += countUp("#vA", 0, 2.19, tShort, 1.2, 2, "", "M");
  js += `tl.fromTo("#eb",{opacity:0,clipPath:"inset(0 100% 0 0)"},{opacity:1,clipPath:"inset(0 0% 0 0)",duration:0.5,ease:"power2.out"},${tGreen.toFixed(3)});\n`;
  js += `tl.fromTo("#gap",{opacity:0,clipPath:"inset(0 100% 0 0)"},{opacity:1,clipPath:"inset(0 0% 0 0)",duration:0.7,ease:"power2.out"},${tGap.toFixed(3)});\n`;
  js += `tl.fromTo("#gl",{opacity:0},{opacity:1,duration:0.3},${(tGap + 0.6).toFixed(3)});\n`;
  js += `tl.fromTo("#gap",{opacity:1},{opacity:0.7,duration:1.2,yoyo:true,repeat:${Math.max(1, Math.floor((D - tGap - 2) / 1.2))},ease:"sine.inOut"},${(tGap + 1).toFixed(3)});\n`;
  js += wipeDown("#card", exitAt(D));
  emit(id, D, body, js);
}

// ======================================================== punch-in marks
// Marks on the ZOOMED terminal, one part per punch-in (the zoom itself is FFmpeg
// geometry in demo_scene.py). Every mark is located by OCR at mid-hold and mapped
// through that punch-in's own zoom (lib.mapZoom), drawn in a box-sized SVG, and
// shown only while the zoom is fully in. One $accent per part; supporting marks
// in $muted. Composition review 2026-09-22: the evidence needed marking (g10,
// g13, g14), a before number was missing (g15a), the void had nothing (g16b), and
// g12's label had sat on the wrong number.
const MARKS = {
  // the repo starts clean (human decision 2026-09-23: the optional git-status punch-in)
  g05a: { at: 184.3, cue: "is clean", marks: [
    { re: /^You're on ep0?4-demo/, sub: "the working tree is clean", kind: "under", col: "accent", trimL: 25 } ] },   // trimL: the pane is proportional type, so the char-interpolated start landed under "and" (measured on the render, 2026-09-23)
  // WINS get marks as loud as the misses (composition review 2026-09-23: the misses
  // had strikes, accent boxes and labels while "matches to the T" had nothing)
  g08: { at: 527.0, cue: "matches to the t", zoom: "g08+g09", marks: [
    { box: [128, 1598, 334, 1627], kind: "box", col: "muted", pad: 6 },
    { box: [167, 1944, 379, 1970], kind: "box", col: "accent", pad: 4, label: "files = warehouse, to the cent" } ] },
  g06b: { at: 330.0, cue: "report at the end", marks: [
    { re: /^If a missing business decision/, kind: "under", col: "accent", label: "why it reports instead of guessing" } ] },
  g07b: { at: 478.0, cue: "daily branch sales", marks: [
    { box: [83, 1386, 560, 1422], kind: "tab", col: "accent", label: "the mart the agent named" } ] },
  g10: { at: 569.5, cue: null, marks: [
    { re: /^Table with name/, sub: "fct_branch_daily_sales", kind: "strike", col: "muted" },
    { re: /^Did you mean/, sub: "fct_daily_branch_sales", kind: "under", col: "accent", dy: 10 } ] },   // no label: the error text is dense to its edges, every chip or leader covered words (verification 2026-09-23); the direction never asked for one
  g12: { at: 672.0, cue: null, marks: [
    { re: /^1861558\.08$/, kind: "box", col: "accent", label: "non-web branch orders: 1.86M" } ] },
  g13: { at: 740.0, cue: "point number three", marks: [
    { box: [2131, 1008, 3712, 1228], kind: "box", col: "accent", tick: true, labelCue: "found an ambiguity" } ] },
  g14: { at: 836.0, cue: null, marks: [
    { re: /^40\.5$/, pick: "lowest", kind: "strike", col: "muted", cue: "doesn't average" },
    { re: /^33\.3$/, pick: "lowest", kind: "box", col: "accent", cue: "average percentage", label: "the real blended margin" } ] },
  g15a: { at: 917.0, cue: "1,845", marks: [ { re: /^1845$/, kind: "box", col: "muted", label: "before: 1,845 rows" } ] },
  g15: { at: 981.0, cue: "2773", marks: [ { re: /^2773$/, kind: "box", col: "accent", label: "2,773: appended, not doubled" } ] },
  g16: { at: 1020.0, cue: null, marks: [
    { re: /^-380\.52$/, kind: "box", col: "accent", label: "refund: negative amount" }, { re: /^-1$/, kind: "box", col: "muted" } ] },
  g16b: { at: 1045.0, cue: "void transaction", marks: [ { re: /^0\.00$/, pick: "lowest", kind: "box", col: "accent", label: "void: amount 0.00" } ] },
  // the terminal scrolls between OCR samples 1093.07 and 1093.30: marks leave first
  // (verification 2026-09-23: they sat on the wrong rows for 1.3s)
  g17: { at: 1091.0, cue: null, until: 1093.0, marks: [
    { re: /^81$/, kind: "box", col: "muted" }, { re: /^24$/, kind: "box", col: "muted" },
    { re: /^105$/, pick: "lowest", kind: "box", col: "accent", cue: "105", label: "81 + 24 = 105 delivered" } ] },
  // the payoff of the incremental-load check: the same 105 arrived in the mart
  g17b: { at: 1099.3, cue: "fact daily branch sales", marks: [
    { box: [1613, 1981, 1685, 2014], kind: "box", col: "accent", label: "all 105 in the mart" } ] },
};
// the LOWEST match on screen (results printed twice: the newest copy is lowest).
// Scans every run of the nearest OCR frame; the first version sampled one frame six
// times and so always returned the first (upper) copy (g14, review 2026-09-22).
const ocrLowest = (t, re) => {
  const d = OCR_ALL.reduce((a, b) => Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a);
  const hits = d.runs.filter(r => re.test(r[4])).sort((a, b) => b[1] - a[1]);
  if (!hits.length) return null;
  const [x, y, w, h] = hits[0]; return [x, y, x + w, y + h];
};
// Label width from the REAL font (Satoshi Bold, the .capt face), never a per-char
// estimate: style.md "measured glyph widths". One python call measures every label.
const LABEL_W = (() => {
  const labels = [...new Set(Object.values(MARKS).flatMap(s => s.marks.map(m => m.label).filter(Boolean)))];
  const out = execFileSync("python3", ["-c", `
import json,sys
from PIL import ImageFont
f=ImageFont.truetype("fonts/Satoshi-Bold.otf",34)
print(json.dumps({t:f.getlength(t) for t in json.load(sys.stdin)}))`], { input: JSON.stringify(labels) });
  return JSON.parse(out.toString());
})();
// Pixel detail (edge energy) of the REAL zoomed demo frame at each marks part's
// sample time, on a 10px canvas grid. OCR sees text but not table rules, borders or
// dividers; chips sat across them in g07b, g08, g12, g16b and g17 (verification
// 2026-09-23). Read from demo-scene.mp4, which must be newer than demo-spec.json.
const DETAIL = (() => {
  const need = Object.entries(MARKS).filter(([id]) => want(id)).map(([id, sp]) => [id, sp.at]);
  if (!need.length) return {};
  const ds = JSON.parse(readFileSync("demo-scene.json", "utf8"));
  const out = execFileSync("python3", ["-c", `
import json, sys, os, subprocess, tempfile
from PIL import Image, ImageFilter
v = "../outputs/demo-scene.mp4"
if os.path.getmtime(v) < os.path.getmtime("demo-spec.json"):
    sys.exit("demo-scene.mp4 is older than demo-spec.json: re-render the demo scene first")
need, d0 = json.load(sys.stdin)
res = {}
for pid, t in need:
    f = tempfile.mktemp(suffix=".png")
    subprocess.run(["ffmpeg","-nostdin","-v","error","-y","-ss",f"{t-d0:.3f}","-i",v,"-frames:v","1","-vf","scale=1920:1080,format=gray",f],check=True)
    e = Image.open(f).filter(ImageFilter.FIND_EDGES).resize((192,108), Image.BOX)
    b = list(e.tobytes())
    res[pid] = [b[r*192:(r+1)*192] for r in range(108)]
    os.remove(f)
print(json.dumps(res))`], { input: JSON.stringify([need, ds.enters.cutSeconds]), maxBuffer: 64 << 20 });
  return JSON.parse(out.toString());
})();
const detailIn = (id, [x0, y0, x1, y1]) => {
  const g = DETAIL[id]; if (!g) return 0;
  let s = 0;
  for (let r = Math.floor(y0 / 10); r < Math.ceil(y1 / 10); r++)
    for (let c = Math.floor(x0 / 10); c < Math.ceil(x1 / 10); c++) s += (g[r]?.[c] || 0);
  return s;
};
// Every OCR text run on screen at t, mapped into this punch-in's canvas coordinates
// and kept only where it is visible. Labels are placed against these.
const textOnScreen = (id, t) => {
  const d = OCR_ALL.reduce((a, b) => Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a);
  return d.runs.map(([x, y, w, h]) => mapZoom(id, [x, y, x + w, y + h]))
    .filter(([x0, y0, x1, y1]) => x1 > 0 && y1 > 0 && x0 < 1920 && y0 < 1080);
};
const overlapArea = (a, b) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0]))
                            * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
// The label goes where it covers the LEAST text, then as close to its mark as that
// allows. Composition review 2026-09-23: a fixed "above the mark" rule put labels on
// the very words being read in 8 parts (g10's sat on the name he was reading aloud,
// g16b's hid the 257.50 the void is compared against). Kept out of the inset corner.
const placeLabel = (id, t, mark, w, h, taken) => {
  const text = textOnScreen(MARKS[id].zoom || id, t), inLeft = insetLeftDuring(id);
  // the marked span itself is not "crossed"; the rest of its line is (g10's leader cut
  // the "?" after the marked name, verification 2026-09-23)
  const other = text.flatMap(q => overlapArea(q, mark) === 0 ? [q]
    : [[q[0], q[1], mark[0], q[3]], [mark[2], q[1], q[2], q[3]]].filter(r => r[2] - r[0] > 2));
  const inset = inLeft ? [0, 760, 330, 1080] : [1590, 760, 1920, 1080];
  let best = null;
  for (let y = 40; y + h <= 1040; y += 10)
    for (let x = 60; x + w <= 1860; x += 10) {
      const r = [x, y, x + w, y + h];
      if (overlapArea(r, inset) > 0 || taken.some(o => overlapArea(r, o) > 0)) continue;
      // text boxes inflated by 14px: a chip squeezed between table columns sat on the
      // column rules (g12, verification 2026-09-23)
      const cover = text.reduce((a, b) => a + overlapArea(r, b), 0);
      const near = text.reduce((a, b) => a + overlapArea(r, [b[0] - 14, b[1] - 14, b[2] + 14, b[3] + 14]), 0) - cover;
      const dx = Math.max(0, mark[0] - r[2], r[0] - mark[2]), dy = Math.max(0, mark[1] - r[3], r[1] - mark[3]);
      // a leader that has to cross text is as bad as a chip on text: g13's cut through
      // three words and pointed at the wrong item (verification 2026-09-23)
      let cross = 0, ruleCross = 0;
      if (Math.hypot(dx, dy) > 30) {
        const lc = [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2], mc = [(mark[0] + mark[2]) / 2, (mark[1] + mark[3]) / 2];
        const a = [Math.max(r[0], Math.min(r[2], mc[0])), Math.max(r[1], Math.min(r[3], mc[1]))];
        const b = [Math.max(mark[0], Math.min(mark[2], lc[0])), Math.max(mark[1], Math.min(mark[3], lc[1]))];
        for (let k = 1; k < 20; k++) {
          const px = a[0] + (b[0] - a[0]) * k / 20, py = a[1] + (b[1] - a[1]) * k / 20;
          if (other.some(q => px > q[0] - 4 && px < q[2] + 4 && py > q[1] - 4 && py < q[3] + 4)) cross++;
          // table rules and borders are not OCR text: a leader over strong edges crosses them
          const g = DETAIL[id]; if (g && (g[Math.floor(py / 10)]?.[Math.floor(px / 10)] || 0) > 20) ruleCross++;
        }
      }
      const score = cover * 50 + near * 0.5 + cross * 4000 + ruleCross * 1500 + detailIn(id, r) * 0.5 + Math.hypot(dx, dy);
      if (!best || score < best.score) best = { r, cover, near, cross, ruleCross, score, dist: Math.hypot(dx, dy) };
    }
  if (!best) throw new Error(`${id}: no room for a label`);
  return best;
};
for (const [id, spec] of Object.entries(MARKS)) {
  if (!want(id)) continue;
  const zid = spec.zoom || id;       // a part inside a shared punch-in names that zoom
  const D = dur(id), [S0] = span(id), [p0, p1] = plateau(zid, S0);
  const tIn = Math.max(p0 + 0.1, spec.cue ? cueIn(id, spec.cue) : p0 + 0.1);
  // marks leave BEFORE the zoom-out starts: fixed marks over a moving zoom drift onto
  // the wrong lines (g10, technical review 2026-09-23)
  const tOut = Math.min(p1 - 0.25, D - 0.35, spec.until ? spec.until - S0 : Infinity);
  if (!(tIn < tOut - 0.8)) throw new Error(`${id}: mark window ${tIn}-${tOut} is too short to read`);
  const pad = 10;
  // resolve every mark's canvas box first, so colliding boxes can be merged
  let M = spec.marks.map(m => {
    let src = m.box || (m.pick === "lowest" ? ocrLowest(spec.at, m.re) : ocrBox(spec.at, m.re, m.sub));
    if (!src) throw new Error(`${id}: OCR could not find ${m.re}`);
    // An OCR line box is not a baseline: adjacent terminal lines' boxes overlap (the
    // pitch is ~35px source), so an underline at the box bottom landed on the NEXT
    // row and read as a strike through the right name (g10, review 2026-09-22).
    // Clamp every text mark to one line: top + the measured 35px pitch.
    if (!m.box) src = [src[0], src[1], src[2], Math.min(src[3], src[1] + 35)];
    const b = mapZoom(zid, src);
    if (m.trimL) b[0] += m.trimL;
    return { ...m, b };
  });
  // two padded boxes of the same colour that touch become ONE box around both: g17's
  // 81 and 24 overlapped into a double line (composition review 2026-09-23)
  for (let i = 0; i < M.length; i++) for (let j = i + 1; j < M.length; j++) {
    const a = M[i], b = M[j], P = pad * 2 + 8;
    if (a && b && a.kind === "box" && b.kind === "box" && a.col === b.col
        && overlapArea([a.b[0] - P, a.b[1] - P, a.b[2] + P, a.b[3] + P], b.b) > 0) {
      a.b = [Math.min(a.b[0], b.b[0]), Math.min(a.b[1], b.b[1]), Math.max(a.b[2], b.b[2]), Math.max(a.b[3], b.b[3])];
      a.label = a.label || b.label; a.cue = a.cue || b.cue; M[j] = null;
    }
  }
  M = M.filter(Boolean);
  let body = "", js = "", nAccent = 0;
  const taken = M.map(m => [m.b[0] - pad - 8, m.b[1] - pad - 8, m.b[2] + pad + 8, m.b[3] + pad + 18]);
  M.forEach((m, i) => {
    const [x0, y0, x1, y1] = m.b, col = m.col === "accent" ? C.accent : C.muted, pad = m.pad ?? 10;
    if (m.col === "accent") nAccent++;
    // dash pattern a little LONGER than the path: an exact 1/1 dash left a visible
    // seam where a rect's path starts, the "broken top-left corner" on g15a/g15
    // (composition review 2026-09-23)
    const DA = `stroke-dasharray:1.02 1.02;stroke-dashoffset:1.02`;
    const shape = m.kind === "box"
      ? `<rect id="mk${i}" x="${(x0 - pad).toFixed(1)}" y="${(y0 - pad).toFixed(1)}" width="${(x1 - x0 + 2 * pad).toFixed(1)}" height="${(y1 - y0 + 2 * pad).toFixed(1)}" rx="10" pathLength="1" fill="none" stroke="${col}" stroke-width="6" stroke-linejoin="round" style="${DA}"/>`
      : m.kind === "tab"
      ? `<line id="mk${i}" x1="${(x0 - 16).toFixed(1)}" y1="${(y0 - 2).toFixed(1)}" x2="${(x0 - 16).toFixed(1)}" y2="${(y1 + 2).toFixed(1)}" pathLength="1" stroke="${col}" stroke-width="8" stroke-linecap="round" style="${DA}"/>`
      : m.kind === "under"
      ? `<line id="mk${i}" x1="${x0.toFixed(1)}" y1="${(y1 + 6 + (m.dy || 0)).toFixed(1)}" x2="${x1.toFixed(1)}" y2="${(y1 + 6 + (m.dy || 0)).toFixed(1)}" pathLength="1" stroke="${col}" stroke-width="6" stroke-linecap="round" style="${DA}"/>`
      : `<line id="mk${i}" x1="${(x0 - 8).toFixed(1)}" y1="${((y0 + y1) / 2).toFixed(1)}" x2="${(x1 + 8).toFixed(1)}" y2="${((y0 + y1) / 2).toFixed(1)}" pathLength="1" stroke="${col}" stroke-width="6" stroke-linecap="round" style="${DA}"/>`;
    // the mark's own SVG settles 6px on entrance: dash offset and opacity are not
    // geometry, so a part made only of line marks read as frozen to the seek check
    // (g10 once its label went, 2026-09-23)
    body += markSVG(x0 - pad, y0 - pad, x1 + pad, y1 + pad + 10, shape).replace("<svg ", `<svg id="mw${i}" `);
    const t = m.cue ? Math.max(tIn, cueIn(id, m.cue)) : tIn + i * 0.5;
    if (t > tOut - 0.8) throw new Error(`${id}: mark ${i} lands at ${t}, too late in its window`);
    js += `tl.fromTo("#mk${i}",{strokeDashoffset:1.02,opacity:1},{strokeDashoffset:0,opacity:1,duration:0.45,ease:"power2.out"},${t.toFixed(3)});\n`;
    js += `tl.fromTo("#mw${i}",{y:6},{y:0,duration:0.45,ease:"power2.out"},${t.toFixed(3)});\n`;
    js += `tl.fromTo("#mk${i}",{opacity:1},{opacity:0,duration:0.2},${tOut.toFixed(3)});\n`;
    if (m.tick) {
      // a tick chip on the box's top-right corner: g13's pane is solid text, so no
      // label position could avoid covering it or crossing it with a leader
      // (verification 2026-09-23). The win reads as "handled" without words.
      const tt = m.labelCue ? Math.max(t + 0.45, cueIn(id, m.labelCue)) : t + 0.45;
      if (tt > tOut - 0.8) throw new Error(`${id}: tick lands at ${tt}, too late to read`);
      const cx = x1 + pad, cy = y0 - pad;
      body += `<div id="tk${i}" class="opaque" style="position:absolute;left:${(cx - 36).toFixed(0)}px;top:${(cy - 36).toFixed(0)}px;width:72px;height:72px;border-radius:36px;opacity:0">
        <svg style="position:absolute;left:10px;top:12px;overflow:visible" width="40" height="36"><path id="tkp${i}" d="M3,19 L15,31 L38,5" pathLength="1" fill="none" stroke="${C.bg}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray:1.02 1.02;stroke-dashoffset:1.02"/></svg></div>`;
      js += `tl.fromTo("#tk${i}",{opacity:0,scale:0.6,transformOrigin:"50% 50%"},{opacity:1,scale:1,duration:0.3,ease:"back.out(2)"},${tt.toFixed(3)});\n`;
      js += `tl.fromTo("#tkp${i}",{strokeDashoffset:1.02},{strokeDashoffset:0,duration:0.3,ease:"power2.out"},${(tt + 0.2).toFixed(3)});\n`;
      js += `tl.fromTo("#tk${i}",{opacity:1},{opacity:0,duration:0.2,immediateRender:false},${tOut.toFixed(3)});\n`;
    }
    if (m.label) {
      // 34px on an opaque chip, placed on the least text (placeLabel), with a leader
      // line to its mark when it cannot sit right beside it
      const w = Math.ceil(LABEL_W[m.label] + 48), h = 70;
      const L = placeLabel(id, spec.at, [x0 - pad, y0 - pad, x1 + pad, y1 + pad], w, h, taken);
      taken.push([L.r[0] - 12, L.r[1] - 12, L.r[2] + 12, L.r[3] + 12]);
      console.log(`    ${id} label "${m.label}" at ${L.r.map(Math.round)}: covers ${Math.round(L.cover)}px2 of text (${Math.round(L.near)}px2 of margin), leader crosses text at ${L.cross}/19 and strong edges at ${L.ruleCross}/19 points, ${Math.round(L.dist)}px from its mark`);
      if (L.cross) throw new Error(`${id}: every label position's leader crosses text`);
      if (L.dist > 30) {
        // leader: from the label's nearest edge midpoint to the mark's nearest edge midpoint
        const lc = [(L.r[0] + L.r[2]) / 2, (L.r[1] + L.r[3]) / 2], mc = [(x0 + x1) / 2, (y0 + y1) / 2];
        const edge = (r, toward) => [Math.max(r[0], Math.min(r[2], toward[0])), Math.max(r[1], Math.min(r[3], toward[1]))];
        const a = edge(L.r, mc), b = edge([x0 - pad - 6, y0 - pad - 6, x1 + pad + 6, y1 + pad + 6], lc);
        body += markSVG(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1]),
          `<line id="ld${i}" x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" pathLength="1" stroke="${col}" stroke-width="4" stroke-linecap="round" style="${DA}"/>`);
        const tld = m.labelCue ? Math.max(t + 0.3, cueIn(id, m.labelCue) - 0.15) : t + 0.3;
        js += `tl.fromTo("#ld${i}",{strokeDashoffset:1.02,opacity:1},{strokeDashoffset:0,opacity:1,duration:0.3,ease:"power2.out"},${tld.toFixed(3)});\n`;
        js += `tl.fromTo("#ld${i}",{opacity:1},{opacity:0,duration:0.2},${tOut.toFixed(3)});\n`;
      }
      body += `<div id="lb${i}" class="opaque" style="position:absolute;left:${L.r[0]}px;top:${L.r[1]}px;width:${w}px;height:${h}px;opacity:0">
        <div class="capt" style="position:absolute;left:0;top:0;width:${w - 12}px;height:${h - 12}px;display:flex;align-items:center;justify-content:center;font-size:34px;line-height:1;white-space:nowrap">${m.label}</div></div>`;
      const tl0 = m.labelCue ? Math.max(t + 0.45, cueIn(id, m.labelCue)) : t + 0.45;
      if (tl0 > tOut - 0.8) throw new Error(`${id}: label lands at ${tl0}, too late to read`);
      js += `tl.fromTo("#lb${i}",{opacity:0,y:10},{opacity:1,y:0,duration:0.35,ease:"power2.out"},${tl0.toFixed(3)});\n`;
      js += `tl.fromTo("#lb${i}",{opacity:1},{opacity:0,duration:0.2},${tOut.toFixed(3)});\n`;
    }
  });
  if (nAccent > 1) throw new Error(`${id}: ${nAccent} accent marks; one per part`);
  // a gentle breath on the marks so a held zoom is never a still over a still screen
  const breath = Math.max(1, Math.floor((tOut - tIn - 1.2) / 0.6));
  js += `tl.fromTo(${JSON.stringify(M.map((_, i) => "#mk" + i))},{strokeWidth:6},{strokeWidth:8,duration:0.3,yoyo:true,repeat:${breath},ease:"sine.inOut"},${(tIn + 0.9).toFixed(3)});\n`;
  emit(id, D, body, js);
}

// ============================================================ outro overlays
// Left column, light panel (measured 103-106 luma under each box). Clear zone
// y <= 820 (zones.json), silhouette from x ~780.

// the recap card and g18 are ONE box across their cut (verification 2026-09-23)
const RECAP_W = 600, RECAP_H = 670;
// ------------------------------------------------ g17r the recap
// Human decision 2026-09-23: the recap (18:47-20:20) was 124s with no graphic and the
// 1.06 push under it could not be seen. A card in the measured primary zone (x 0-780,
// zones.json) that GROWS row by row on his words, in two phases:
//   "What I did": the run, the model, the inputs, the ask.
//   "What I got": 60-70% (spoken, 19:36; the human's note said 60-80, the audio
//   wins), the core code not just boilerplate, conventions followed, caveats handled,
//   a few misses (muted, smaller: g18 shows them next), 17 models, and the verdict
//   "Very useful: faster time to value" on "improve my time to value".
// Wins are ink with drawn ticks; the miss is $muted with a drawn cross. One $accent:
// the rule under the stat. Holds to its last frame: g18 wipes in over it.
if (want("g17r")) {
  const id = "g17r", D = dur(id), c = p => cueIn(id, p);
  // x 96-760, the standard left column: at 780 the edge touched his temple when he
  // leaned left at 19:48 (verification 2026-09-23). The stat keeps 160px with -5px
  // tracking and a 20px side margin of its own.
  const X = 96, W = RECAP_W, PAD = 26, INNER = W - 2 * PAD, TOP = 116;   // W 600 (x 96-696): at 740 his head still met the edge for 0.4s when he leans at 19:48 (verification 2026-09-23, twice). TOP and the final height are shared with g18 so the handoff is one card
  const P1 = [["one long-horizon run", c("long horizon")], ["Opus 5.5, medium effort", c("opus 5.5")],
              ["an empty repo + the source files", c("empty repository")], ["+ three markdown context files", c("markdown files")],
              ["build: ingestion to the marts", c("ingestion all")]];
  const t60 = c("60 to 70"), tSwap = t60 - 0.6, tWay = c("of the way");
  const P2 = [["followed the conventions", c("understood the conventions"), "win"],
              ["caveats handled, not guessed", c("all the right things"), "win"],
              ["a few misses (next)", c("few misses but"), "miss"],
              ["17 models: a week of work", c("17 models"), "win"]];
  const tV = c("improve my time");
  const W38 = execFileSync("python3", ["-c", `
import json,sys
from PIL import ImageFont
b=ImageFont.truetype("fonts/Satoshi-Bold.otf",34); s=ImageFont.truetype("fonts/Satoshi-Bold.otf",34)
v=ImageFont.truetype("fonts/Satoshi-Variable.ttf",160); v.set_variation_by_axes([900])
k=ImageFont.truetype("fonts/Satoshi-Variable.ttf",32); k.set_variation_by_axes([900])
d=json.load(sys.stdin)
print(json.dumps({"p1":[b.getlength(t) for t in d[0]],"p2":[s.getlength(t) for t in d[1]],"stat":v.getlength("60-70")-4*5+ImageFont.truetype("fonts/Satoshi-Variable.ttf",90).getlength("%"),"lab":ImageFont.truetype("fonts/Satoshi-Bold.otf",32).getlength(d[2]),"v":k.getlength(d[3])}))`],
    { input: JSON.stringify([P1.map(r => r[0]), P2.map(r => r[0]), "of the core code, not just boilerplate", "Very useful: faster time to value"]) });
  const M = JSON.parse(W38.toString());
  M.p1.forEach((w, i) => { if (w > INNER) throw new Error(`g17r: "${P1[i][0]}" ${w}px > ${INNER}px`); });
  M.p2.forEach((w, i) => { if (w + 60 > INNER) throw new Error(`g17r: "${P2[i][0]}" ${w}px + icon > ${INNER}px`); });
  if (M.stat > W - 40) throw new Error(`g17r: stat ${M.stat}px > ${W - 40}px`);
  if (M.lab > W - 12 - PAD - 20 || M.v + 40 > INNER - 12) throw new Error("g17r: label or verdict too wide");
  const H1 = 84, R1 = 62, h1 = n => H1 + n * R1 + 16;
  // the panel is border-box with a 6px border: the band's width and the bottom padding
  // are measured from INSIDE it (verification 2026-09-23: 55px left vs 31 right, 16 below)
  const S2 = 338, R2 = 56, h2 = n => S2 + n * R2 + 12, HV = 96, HS = 284;   // HS: through the rule
  const tick = (tid) => `<svg style="position:absolute;left:0;top:6px;overflow:visible" width="40" height="36"><path id="${tid}" d="M3,19 L15,31 L38,5" pathLength="1" fill="none" stroke="${fg(id)}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray:1.02 1.02;stroke-dashoffset:1.02"/></svg>`;
  const cross = (tid) => `<svg style="position:absolute;left:4px;top:8px;overflow:visible" width="30" height="30"><path id="${tid}" d="M3,3 L27,27 M27,3 L3,27" pathLength="1" fill="none" stroke="${dim(id)}" stroke-width="5" stroke-linecap="round" style="stroke-dasharray:1.02 1.02;stroke-dashoffset:1.02"/></svg>`;
  const body = `
<div id="card" class="${panelClass(id)}" style="position:absolute;left:${X}px;top:${TOP}px;width:${W}px;height:${h1(1)}px;overflow:hidden">
 <div id="ph1">
  <div class="capt eyebrow muted" style="position:absolute;left:${PAD}px;top:28px;font-size:26px">What I did</div>
  ${P1.map(([t], i) => `<div id="a${i}" class="disp" style="position:absolute;left:${PAD}px;top:${H1 + i * R1}px;font-size:34px;line-height:1.2;font-variation-settings:'wght' 700;white-space:nowrap">${t}</div>`).join("")}
 </div>
 <div id="ph2" style="opacity:0">
  <div class="capt eyebrow muted" style="position:absolute;left:${PAD}px;top:28px;font-size:26px">What I got</div>
  <div id="st" class="disp" style="position:absolute;left:${PAD - 6}px;top:96px;font-size:160px;line-height:1.0;letter-spacing:-5px;font-variation-settings:'wght' 900">60-70<span style="font-size:90px;letter-spacing:0">%</span></div>
  <div id="sr" class="accentbar" style="position:absolute;left:${PAD}px;top:266px;width:240px;height:4px"></div>
  <div id="sl" class="capt" style="position:absolute;left:${PAD}px;top:284px;font-size:32px;line-height:1.2;white-space:nowrap">of the core code, not just boilerplate</div>
  ${P2.map(([t, , k], i) => `<div id="b${i}" style="position:absolute;left:${PAD}px;top:${S2 + i * R2}px;width:${INNER}px;height:${R2 - 4}px">
     ${k === "win" ? tick("bk" + i) : cross("bk" + i)}
     <div class="${k === "win" ? "disp" : "capt"}" style="position:absolute;left:60px;top:2px;font-size:${k === "win" ? 34 : 30}px;line-height:1.3;${k === "win" ? "font-variation-settings:'wght' 700;" : `color:${dim(id)};`}white-space:nowrap">${t}</div></div>`).join("")}
  <div id="vb" style="position:absolute;left:${PAD}px;top:${h2(P2.length) + 4}px;width:${INNER - 12}px;height:60px;box-sizing:border-box;border-radius:10px;background:${C.accentSoft};display:flex;align-items:center;justify-content:center">
    <div class="disp" style="font-size:32px;line-height:1;font-variation-settings:'wght' 900;color:${C.ink};white-space:nowrap">Very useful: faster time to value</div></div>
 </div>
</div>`;
  let js = wipeUp("#card", Math.max(0, P1[0][1] - 0.3));
  P1.forEach(([, t], i) => {
    // the row opens WITH its text, never as an empty slot first (verification 2026-09-23)
    if (i) js += `tl.fromTo("#card",{height:${h1(i)}},{height:${h1(i + 1)},duration:0.25,ease:"power3.out",immediateRender:false},${(t - 0.03).toFixed(3)});\n`;
    js += `tl.fromTo("#a${i}",{opacity:0,clipPath:"inset(0 100% 0 0)"},{opacity:1,clipPath:"inset(0 0% 0 0)",duration:0.45,ease:"power2.out"},${t.toFixed(3)});\n`;
  });
  // the swap: phase 1 out, the card resizes to the stat block, "60-70%" lands ON "60"
  // (it had typed in on "from", 0.7s early, after a 0.23s blank card; verification 2026-09-23)
  js += `tl.fromTo("#ph1",{opacity:1},{opacity:0,duration:0.25,immediateRender:false},${tSwap.toFixed(3)});\n`;
  js += `tl.fromTo("#card",{height:${h1(P1.length)}},{height:${HS},duration:0.4,ease:"power3.inOut",immediateRender:false},${(tSwap + 0.1).toFixed(3)});\n`;
  js += `tl.fromTo("#ph2",{opacity:0},{opacity:1,duration:0.15},${(tSwap + 0.25).toFixed(3)});\n`;
  js += `tl.fromTo("#st",{clipPath:"inset(-20px 100% -30px 0)"},{clipPath:"inset(-20px 0% -30px 0)",duration:0.4,ease:"power2.out"},${(t60 - 0.1).toFixed(3)});\n`;
  js += `tl.fromTo("#sr",{scaleX:0,transformOrigin:"left center"},{scaleX:1,duration:0.45,ease:"power2.out"},${(t60 + 0.3).toFixed(3)});\n`;
  js += `tl.fromTo("#card",{height:${HS}},{height:${S2},duration:0.3,ease:"power3.out",immediateRender:false},${(tWay - 0.1).toFixed(3)});\n`;
  js += `tl.fromTo("#sl",{opacity:0,clipPath:"inset(0 100% 0 0)"},{opacity:1,clipPath:"inset(0 0% 0 0)",duration:0.5,ease:"power2.out"},${tWay.toFixed(3)});\n`;
  P2.forEach(([, t], i) => {
    js += `tl.fromTo("#card",{height:${i ? h2(i) : S2}},{height:${h2(i + 1)},duration:0.25,ease:"power3.out",immediateRender:false},${(t - 0.03).toFixed(3)});\n`;
    js += `tl.fromTo("#b${i}",{opacity:0,y:8},{opacity:1,y:0,duration:0.35,ease:"power2.out"},${t.toFixed(3)});\n`;
    js += `tl.fromTo("#bk${i}",{strokeDashoffset:1.02},{strokeDashoffset:0,duration:0.35,ease:"power2.out"},${(t + 0.15).toFixed(3)});\n`;
  });
  js += `tl.fromTo("#card",{height:${h2(P2.length)}},{height:${h2(P2.length) + HV},duration:0.25,ease:"power3.out",immediateRender:false},${(tV - 0.03).toFixed(3)});\n`;
  js += `tl.fromTo("#vb",{opacity:0,clipPath:"inset(0 100% 0 0)"},{opacity:1,clipPath:"inset(0 0% 0 0)",duration:0.5,ease:"power2.out"},${tV.toFixed(3)});\n`;
  js += `tl.fromTo("#card",{opacity:1},{opacity:1,duration:0.2,immediateRender:false},${(D - 0.2).toFixed(3)});\n`;   // holds: g18 wipes in over it
  if (h2(P2.length) + HV !== RECAP_H) throw new Error(`g17r: final height ${h2(P2.length) + HV} != RECAP_H ${RECAP_H}`);
  if (TOP + h2(P2.length) + HV > 840) throw new Error("g17r: card leaves the primary zone");
  emit(id, D, body, js);
}

// ------------------------------------------------ g18 two misses, two fixes
// The EXACT g04 stack returns (header, three rows) and the fixes land ON their
// words as bold $ink lines: the mart-name fix under REQUIREMENTS.md (human decision
// 2026-09-22, matching how he framed it in the demo), the derived-% fix under
// STANDARDS.md. One $accent: the header rule.
if (want("g18")) {
  const id = "g18", D = dur(id), c = p => cueIn(id, p);
  const tA = c("mart table names"), tB = c("derived metrics");
  // review 2026-09-22: the wrapped STANDARDS line sat on REQUIREMENTS, and the fixes
  // (the whole point of the beat) were the smallest type. Rows now reserve their
  // fix's real height (measured: 683px at 34px, so two lines in a 560px column),
  // the fixes are 34px bold on an $accent-soft highlight band (decoration only),
  // and the card fills the zone.
  const R = [["CONVENTIONS.md", "business context", null, null, 0],
             ["STANDARDS.md", "data and coding standards", "+ store numerator and denominator, never the %", tB, 2],
             ["REQUIREMENTS.md", "what the marts must answer", "+ exact mart table names", tA, 1]];
  // Review 2026-09-23: the reserved fix rows sat EMPTY for ~35s, so the card looked
  // broken, and the type was smaller than g04's so the stack read as a different
  // object. Now names/subs match g04 (42/34px) and each row OPENS on its fix's word:
  // the card grows and the rows below slide down (height, never a clip-path crop).
  const HEAD = 100, BASE = 124, LINE = 44, ext = r => (r[4] ? r[4] * LINE + 16 : 0);
  const Hmin = HEAD + 3 * BASE + 12, Htot = Hmin + R.reduce((a, r) => a + ext(r), 0);
  const TOP = 116;   // same box as g17r, which it replaces in place (verification 2026-09-23: a 16px jump)
  const body = `
<div id="card" class="${panelClass(id)}" style="position:absolute;left:${LEFT_X0}px;top:${TOP}px;width:${RECAP_W}px;height:${Hmin}px;overflow:hidden">
  <div class="capt eyebrow muted" style="position:absolute;left:26px;top:28px;font-size:26px">The context files</div>
  <div id="hrule" class="accentbar" style="position:absolute;left:26px;top:68px;width:240px;height:2px"></div>
  ${R.map(([f, sub, fix, , lines], i) => `
  <div id="rw${i}" style="position:absolute;left:26px;top:${HEAD + i * BASE}px;width:548px;height:${BASE - 8 + ext(R[i])}px">
    <div style="position:absolute;left:0;top:6px;width:64px;height:80px;color:${fg(id)}">
      <div style="transform:scale(.4);transform-origin:top left">${DOC("q" + i)}</div></div>
    <div class="disp" style="position:absolute;left:96px;top:8px;font-size:42px;font-variation-settings:'wght' 700">${f}</div>
    <div class="capt muted" style="position:absolute;left:96px;top:64px;font-size:34px">${sub}</div>
    ${fix ? `<div id="fx${i}" class="disp" style="position:absolute;left:84px;top:114px;width:432px;padding:4px 12px;border-radius:8px;background:${C.accentSoft};font-size:34px;line-height:1.25;font-variation-settings:'wght' 700;color:${C.ink};opacity:0">${fix}</div>` : ""}
  </div>`).join("")}
</div>`;
  // present from frame 0: g17r holds to its last frame and this panel replaces it in
  // place; a wipe from frame 0 left 2 empty frames between them (verification 2026-09-23)
  // arrives at the recap card's final height and settles to its own, so the cut reads
  // as one card changing; the file icons are drawn from frame 0 (verification 2026-09-23)
  // fix rows that open during the 0.8s settle are folded into ONE ease from the recap's
  // height: settling to Hmin and regrowing 0.4s later read as a bounce (verification 2026-09-23)
  const early = R.map((r, i) => ({ i, t: r[3], e: ext(r) })).filter(x => x.e && x.t < 0.8);
  const Hstart = Hmin + early.reduce((a, x) => a + x.e, 0);
  let js = `tl.fromTo("#card",{height:${RECAP_H}},{height:${Hstart},duration:0.45,ease:"power3.inOut"},0);\n` + `tl.fromTo("#hrule",{scaleX:0,transformOrigin:"left center"},{scaleX:1,duration:0.45,ease:"power2.out"},0.2);\n`;
  [0,1,2].forEach(i => { js += `tl.fromTo("#q${i} .dr, #q${i} .ln",{strokeDashoffset:0},{strokeDashoffset:0,duration:0.1},0);\n`; });
  // open each fix's row in time order: the card grows, the rows below move down
  const ev = R.map((r, i) => ({ i, t: r[3], e: ext(r) })).filter(x => x.e).sort((a, b) => a.t - b.t);
  let H = Hmin; const shift = [0, 0, 0];
  ev.forEach(({ i, t, e }) => {
    const folded = t < 0.8;         // already in the opening ease
    if (!folded) js += `tl.fromTo("#card",{height:${H}},{height:${H + e},duration:0.4,ease:"power3.out",immediateRender:false},${(t - 0.4).toFixed(3)});\n`;
    for (let j = i + 1; j < 3; j++) {
      js += `tl.fromTo("#rw${j}",{y:${shift[j]}},{y:${shift[j] + e},duration:0.4,ease:"power3.out"},${(t - 0.4).toFixed(3)});\n`;
      shift[j] += e;
    }
    H += e;
  });
  if (H !== Htot) throw new Error(`g18: card grows to ${H}, expected ${Htot}`);
  R.forEach(([, , fix, t], i) => { if (fix) js += `tl.fromTo("#fx${i}",{opacity:0,clipPath:"inset(-6px 100% -10px 0)"},{opacity:1,clipPath:"inset(-6px 0% -10px 0)",duration:0.6,ease:"power2.out"},${t.toFixed(3)});\n`; });
  // no drift: cards over live footage do not drift (style.json takeoverDrift is for
  // full-frame parts only; verification 2026-09-23 caught g21 and this card rising)
  js += wipeDown("#card", exitAt(D));
  emit(id, D, body, js);
}

// g19's card: before "Works." (subject + the jar row), and after it grows into the word
const G19_H0 = 330, G19_H1 = 330 + 236;
// ---------------------------------------------------------- g19 the verdict
// The biggest type in the video at 180px (human decision 2026-09-22; style.md now
// says so in both places). "It works." at 180px is 746px, wider than the clear
// wall (x <= ~780), so the SAME words break over two lines: "It" / "works.". The
// subject sits above at 56px. Reveals use masks with room for descenders (the
// "g" and "y" had their tails clipped, composition review). Beneath, the hook's
// payoff: the same brain in a jar, now WIRED to the three files, answering
// "revenue = $2,187,780" with an intact tick. One $accent: the rule under "works.".
if (want("g19")) {
  const id = "g19", D = dur(id), c = p => cueIn(id, p);
  const tLO = c("lightweight ontology"), tW = c("works"), tMd = c("markdown files");
  // Human decision 2026-09-23: "Works." on ONE line at 180px (608px measured), not
  // "It" / "works.". Order top to bottom: the subject, the hook's jar row (wrong
  // answer, then the files wire in), and "Works." with its rule, which the card GROWS
  // into on the word, so nothing is reserved empty. g20 continues from this height.
  const FX0 = 34, FDX = 60, JX = 236, VAX = 392, RY = 120;
  const body = `
<div id="card" class="${panelClass(id)}" style="position:absolute;left:${LEFT_X0}px;top:120px;width:664px;height:${G19_H0}px;overflow:hidden">
  <div id="h0" class="disp" style="position:absolute;left:34px;top:26px;font-size:56px;line-height:1.25;font-variation-settings:'wght' 700">A lightweight ontology</div>
  ${[0,1,2].map(i => `<div id="vf${i}" style="position:absolute;left:${FX0 + i * FDX}px;top:${RY + 26}px;width:52px;height:64px;color:${fg(id)}">
     <div style="transform:scale(.4);transform-origin:top left">${DOC("vD" + i)}</div></div>`).join("")}
  <svg style="position:absolute;left:0;top:0;overflow:visible" width="664" height="700">
    <path id="vw" d="M${FX0 + 2 * FDX + 56},${RY + 62} C${JX - 12},${RY + 62} ${JX - 8},${RY + 58} ${JX + 8},${RY + 58}" pathLength="1" fill="none" stroke="${fg(id)}" stroke-width="3" style="stroke-dasharray:1;stroke-dashoffset:1;opacity:0"/>
  </svg>
  <div style="position:absolute;left:0;top:0">${brainInJar("vj", JX, RY, 0.45)}</div>
  <div id="va" style="position:absolute;left:${VAX}px;top:${RY + 14}px;width:240px;height:180px">
    <div id="vwrong" class="capt" style="position:absolute;left:0;top:0;font-size:36px;color:${dim(id)};white-space:nowrap;opacity:0">$7,449,106</div>
    <svg style="position:absolute;left:0;top:0;overflow:visible" width="200" height="48">
      <line id="vx" x1="-4" y1="24" x2="190" y2="24" pathLength="1" stroke="${dim(id)}" stroke-width="4" style="stroke-dasharray:1;stroke-dashoffset:1"/></svg>
    <div id="vright" class="disp" style="position:absolute;left:0;top:56px;font-size:40px;font-variation-settings:'wght' 900;white-space:nowrap;opacity:0">$2,187,780</div>
    <svg style="position:absolute;left:60px;top:118px;overflow:visible" width="60" height="50">
      <path id="vt" d="M4,26 L20,42 L52,6" pathLength="1" fill="none" stroke="${fg(id)}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray:1;stroke-dashoffset:1"/></svg>
  </div>
  <div id="h2" class="disp" style="position:absolute;left:28px;top:${G19_H0 + 8}px;font-size:180px;line-height:1.0;font-variation-settings:'wght' 900;white-space:nowrap">Works.</div>
  <div id="hr" class="accentbar" style="position:absolute;left:34px;top:${G19_H0 + 200}px;width:420px;height:5px"></div>
</div>`;
  if (VAX + 206 > 664 - 34) throw new Error("g19: $2,187,780 at 40px (206px measured) overruns the card");
  if (28 + 608 > 664 - 28) throw new Error("g19: Works. at 180px (608px measured) overruns the card");
  let js = wipeUp("#card", Math.max(0, tLO - 0.35));
  js += `tl.fromTo("#vj .dr, #vj .o",{strokeDashoffset:0},{strokeDashoffset:0,duration:0.2},0);\n`;
  js += `tl.fromTo("#h0",{clipPath:"inset(-20px 100% -30px 0)"},{clipPath:"inset(-20px 0% -30px 0)",duration:0.6,ease:"power2.out"},${(tLO - 0.1).toFixed(3)});\n`;
  // the hook's jar, still confidently wrong, until the files wire in
  js += `tl.fromTo("#vwrong",{opacity:0},{opacity:1,duration:0.3},${(tLO + 1.0).toFixed(3)});\n`;
  [0,1,2].forEach(i => { js += drawAll(`#vD${i} .dr`, tMd + i * 0.15, 0.35) + drawAll(`#vD${i} .ln`, tMd + 0.15 + i * 0.15, 0.3); });
  js += `tl.fromTo("#vw",{opacity:0},{opacity:1,duration:0.05},${(tMd + 0.5).toFixed(3)});\n` + drawAll("#vw", tMd + 0.5, 0.35);
  // "Works." arrives WITH the word: the card grows into it
  js += `tl.fromTo("#card",{height:${G19_H0}},{height:${G19_H1},duration:0.3,ease:"power3.out"},${(tW - 0.15).toFixed(3)});\n`;
  js += `tl.fromTo("#h2",{clipPath:"inset(-30px 100% -60px 0)"},{clipPath:"inset(-30px 0% -60px 0)",duration:0.45,ease:"power2.out"},${(tW - 0.05).toFixed(3)});\n`;
  js += drawAll("#vx", tW, 0.3);
  js += `tl.fromTo("#vright",{opacity:0,y:10},{opacity:1,y:0,duration:0.35},${(tW + 0.1).toFixed(3)});\n` + drawAll("#vt", tW + 0.35, 0.3);
  js += `tl.fromTo("#hr",{scaleX:0,transformOrigin:"left center"},{scaleX:1,duration:0.45,ease:"power2.out"},${(tW + 0.4).toFixed(3)});\n`;
  // content leaves in the last 0.15s so g20's header is already arriving: a full 0.3s
  // exit left one empty panel frame at the swap (verification 2026-09-23)
  js += `tl.fromTo(["#h0","#h2","#hr","#vf0","#vf1","#vf2","#vw","#va","#vj"],{opacity:1},{opacity:0.25,duration:0.1,immediateRender:false},${(D - 0.1).toFixed(3)});\n`;   // still faintly there on the LAST frame: ending the fade early left one blank panel (verification 2026-09-23)
  js += `tl.fromTo("#card",{opacity:1},{opacity:1,duration:0.2,immediateRender:false},${(D - 0.2).toFixed(3)});\n`;   // the panel stays: g20 swaps in
  emit(id, D, body, js);
}

// ---------------------------------------------------------- g20 conformed context
// Rebuilt after review: three PROJECTS, each with its own files (the drawing had
// said "owned by the project team" while he talks about sharing between teams).
// On "share context" their connectors reach for a shared point and STOP SHORT; on
// "conformed" the shared file lands and the connectors close on it; the "?" turns
// into the single $accent dot on "can be solved", held ~3s. Content from frame 0
// (the panel continues from g19).
if (want("g20")) {
  const id = "g20", D = dur(id), c = p => cueIn(id, p);
  const tShare = c("share context"), tGen = c("genuinely shared"), tConf = c("conformed context"), tSolved = c("can be solved");
  // Review 2026-09-23: the shared document was drawn no bigger than the stacks, the
  // stacks' three overlapping outlines read as noise, and the top half sat empty for
  // ~20s of the question. Now: stacks are TWO offset outlines at 0.5; the question is
  // ON screen as a large "?" where the connectors stop short; a dashed placeholder the
  // size of the shared file draws on "genuinely shared"; on "conformed context" the
  // real file (scale 1.0, the largest element) replaces it and the connectors close.
  // The "?" becomes the single $accent dot on "can be solved".
  const PX = [70, 272, 474], PY = 450, CX = 250, CY = 96, DW = 160, DH = 200;
  const body = `
<div id="card" class="${panelClass(id)}" style="position:absolute;left:${LEFT_X0}px;top:120px;width:664px;height:700px;overflow:hidden">
  <div class="capt eyebrow muted" style="position:absolute;left:34px;top:28px;font-size:28px">Context across teams?</div>
  ${PX.map((x, i) => `<div id="pj${i}" style="position:absolute;left:${x}px;top:${PY}px;width:120px;height:130px;color:${fg(id)}">
     ${[0,1].map(k => `<div style="position:absolute;left:${k * 26}px;top:${k * 22}px"><div style="transform:scale(.5);transform-origin:top left">${DOC("p" + i + "d" + k)}</div></div>`).join("")}</div>
   <div id="pl${i}" class="capt" style="opacity:0;position:absolute;left:${x - 22}px;width:170px;text-align:center;top:${PY + 150}px;font-size:30px;color:${fg(id)}">project ${"ABC"[i]}</div>`).join("")}
  <svg style="position:absolute;left:0;top:0;overflow:visible" width="664" height="700">
    ${PX.map((x, i) => `<path id="cx${i}" d="M${x + 66},${PY - 8} C${x + 66},${PY - 70} ${CX},${CY + DH + 80} ${CX},${CY + DH + 14}" pathLength="1" fill="none"
       stroke="${fg(id)}" stroke-width="4" stroke-linecap="round" stroke-dasharray="0.03 0.025" style="stroke-dashoffset:1"/>`).join("")}
    <rect id="ph" x="${CX - DW / 2}" y="${CY}" width="${DW}" height="${DH}" rx="14" pathLength="1" fill="none" stroke="${dim(id)}" stroke-width="4" stroke-dasharray="0.02 0.015" style="stroke-dashoffset:1"/>
  </svg>
  <div id="cdoc" style="position:absolute;left:${CX - DW / 2}px;top:${CY}px;width:${DW}px;height:${DH}px;color:${fg(id)};opacity:0">
    <div style="transform:scale(1);transform-origin:top left">${DOC("cD")}</div></div>
  <div id="q" class="disp" style="position:absolute;left:${CX - 34}px;top:${CY + 34}px;font-size:120px;line-height:1.1;font-variation-settings:'wght' 900;opacity:0">?</div>
  <div id="qd" style="position:absolute;left:${CX - 22}px;top:${CY + 78}px;width:44px;height:44px;border-radius:22px;background:${C.accent};opacity:0"></div>
  <div id="cl" class="disp" style="position:absolute;left:${CX + DW / 2 + 28}px;top:${CY + 50}px;width:230px;font-size:40px;line-height:1.2;font-variation-settings:'wght' 700;opacity:0">conformed context</div>
</div>`;
  // continues g19's panel: starts at its final height and grows to this card's own
  let js = `tl.fromTo("#card",{height:${G19_H1}},{height:700,duration:0.4,ease:"power3.inOut"},0);\n`;
  // the project labels wait until the growing panel has room for them (they read as
  // clipped at its bottom edge, verification 2026-09-23)
  js += `tl.fromTo(["#pl0","#pl1","#pl2"],{opacity:0},{opacity:1,duration:0.25,stagger:0.08},0.4);\n`;
  [0,1,2].forEach(i => { [0,1].forEach(k => { js += drawAll(`#p${i}d${k} .dr`, 0.05 + i * 0.12 + k * 0.08, 0.35) + drawAll(`#p${i}d${k} .ln`, 0.25 + i * 0.12, 0.3); }); });
  // they reach for each other and stop short; the question sits where they would meet
  // a DASHED stroke is visible at any dash offset, so dashed shapes are revealed by
  // opacity: the placeholder showed from the part's first frame (verification 2026-09-23)
  [0,1,2].forEach(i => { js += `tl.fromTo("#cx${i}",{strokeDashoffset:1,opacity:0},{strokeDashoffset:0.4,opacity:1,duration:0.9,ease:"power2.out"},${(tShare + i * 0.3).toFixed(3)});\n`; });
  js += `tl.fromTo("#q",{opacity:0,scale:0.6,transformOrigin:"50% 50%"},{opacity:1,scale:1,duration:0.35,ease:"back.out(2)"},${(tShare + 1.2).toFixed(3)});\n`;
  js += `tl.fromTo(["#cx0","#cx1","#cx2"],{opacity:1},{opacity:0.5,duration:1.2,immediateRender:false,yoyo:true,repeat:${Math.max(1, Math.floor((tConf - tShare - 3) / 1.2))},ease:"sine.inOut"},${(tShare + 1.5).toFixed(3)});\n`;
  js += `tl.fromTo("#ph",{opacity:0,scale:0.9,transformOrigin:"50% 50%"},{opacity:1,scale:1,duration:0.6,ease:"power2.out"},${tGen.toFixed(3)});\n`;
  // conformed: the placeholder becomes the real file, the connectors close on it
  js += `tl.fromTo("#ph",{opacity:1},{opacity:0,duration:0.3,immediateRender:false},${tConf.toFixed(3)});\n`;
  js += `tl.fromTo("#cdoc",{opacity:0},{opacity:1,duration:0.3},${tConf.toFixed(3)});\n` + drawAll("#cD .dr", tConf, 0.5) + drawAll("#cD .ln", tConf + 0.3, 0.4);
  js += `tl.fromTo("#q",{opacity:1},{opacity:0,duration:0.25,immediateRender:false},${tConf.toFixed(3)});\n`;
  js += `tl.fromTo(["#cx0","#cx1","#cx2"],{strokeDashoffset:0.4,opacity:0.5},{strokeDashoffset:0,opacity:1,duration:0.6,ease:"power2.out",immediateRender:false},${(tConf + 0.5).toFixed(3)});\n`;
  js += `tl.fromTo("#cl",{opacity:0,x:-10},{opacity:1,x:0,duration:0.35},${(tConf + 0.4).toFixed(3)});\n`;
  js += `tl.fromTo("#qd",{opacity:0,scale:0.3,transformOrigin:"50% 50%"},{opacity:1,scale:1,duration:0.4,ease:"back.out(2)"},${tSolved.toFixed(3)});\n`;
  js += wipeDown("#card", exitAt(D));
  emit(id, D, body, js);
}

// ------------------------------------------------------- g21 next-video poll
// Enters WITH row A (review: the panel had sat empty for ~2.8s).
if (want("g21")) {
  const id = "g21", D = dur(id), c = p => cueIn(id, p);
  const tA = c("spot check your"), tB = c("swarm of agents"), tC = c("leave a comment");
  const R = [["A", "Spot-check your agent's output", tA], ["B", "Build it with an agent swarm", tB]];
  const body = `
<div id="card" class="${panelClass(id)}" style="position:absolute;left:${LEFT_X0}px;top:250px;width:640px;height:220px;overflow:hidden">
  <div class="capt eyebrow muted" style="position:absolute;left:36px;top:28px;font-size:26px">Next video?</div>
  <div id="hrule" class="accentbar" style="position:absolute;left:36px;top:68px;width:200px;height:2px"></div>
  ${R.map(([k, t], i) => `
  <div id="p${i}" style="position:absolute;left:36px;top:${100 + i * 110}px;width:570px;height:96px">
    <div class="disp" style="position:absolute;left:0;top:10px;width:64px;height:64px;border:3px solid ${fg(id)};border-radius:32px;text-align:center;line-height:58px;font-size:36px">${k}</div>
    <div class="disp" style="position:absolute;left:88px;top:18px;width:480px;font-size:34px;font-variation-settings:'wght' 700;line-height:1.15">${t}</div>
  </div>`).join("")}
  <div id="cm" class="capt" style="position:absolute;left:36px;top:340px;font-size:30px;color:${fg(id)}">Tell me A or B in the comments</div>
</div>`;
  let js = wipeUp("#card", Math.max(0, tA - 0.3)) + `tl.fromTo("#hrule",{scaleX:0,transformOrigin:"left center"},{scaleX:1,duration:0.45,ease:"power2.out"},${tA.toFixed(3)});\n`;
  R.forEach(([, , t], i) => { js += `tl.fromTo("#p${i}",{clipPath:"inset(100% 0 0 0)"},{clipPath:"inset(0% 0 0 0)",duration:0.35,ease:"power3.out"},${t.toFixed(3)});\n`; });
  js += `tl.fromTo("#cm",{clipPath:"inset(0 100% 0 0)"},{clipPath:"inset(0 0% 0 0)",duration:0.5,ease:"power2.out"},${tC.toFixed(3)});\n`;
  // the card GROWS row by row, never reserving empty space (verification 2026-09-23:
  // the lower half sat empty for 13s waiting for row B and the footer)
  js += `tl.fromTo("#card",{height:220},{height:320,duration:0.35,ease:"power3.out"},${(tB - 0.35).toFixed(3)});\n`;
  js += `tl.fromTo("#card",{height:320},{height:420,duration:0.35,ease:"power3.out",immediateRender:false},${(tC - 0.35).toFixed(3)});\n`;
  // no drift over live footage (see g18); a 0.2s exit so the swap into g22's 0.2s
  // entrance leaves at most a frame or two empty (verification 2026-09-23: 3 frames)
  // holds to its LAST frame: g22 wipes in over it, so the swap never shows an empty
  // frame (verification 2026-09-23: exit + entrance left 2 empty frames)
  js += `tl.fromTo("#card",{opacity:1},{opacity:1,duration:0.2,immediateRender:false},${(D - 0.2).toFixed(3)});\n`;
  emit(id, D, body, js);
}

// ------------------------------------------------------------- g22 end card
// tech-video-editor anatomy: overlay beside the face, x 96 -> 680, rows land ON
// their cue words and accumulate, hold to the last frame. Channels and cues from
// brand.md links. "follow me on my other channels" names no channel, so blog,
// github, linkedin and x all land with that phrase, 0.4s apart (spoken order wins;
// noCueFallback). Label caption 500 28px $muted, value display 700 36px $ink.
// One $accent: the rule under the first row. Channel name above as the header,
// since the card has room for two lines (brand.md).
if (want("g22")) {
  const id = "g22", D = dur(id), c = p => cueIn(id, p);
  const brand = JSON.parse(readFileSync("../../../brand.md", "utf8").match(/```json\s*(\{[\s\S]*\})\s*```/)[1]);
  const links = brand.links.filter(l => l.id);
  const tSub = c("subscribe"), tOther = c("other channels");
  // the first row lands WITH the card (review 2026-09-23: a blank row sat under the
  // header for 0.2s); the rule sits INSIDE its row, whose clip box ends at RH - 4 (at
  // RH - 4 exactly it was clipped away and never showed)
  const T = links.map((l, i) => l.id === "youtube" ? 0 : tOther + (i - 1) * 0.4);
  // the longest value must fit the column: measured 519px for the github URL at 36px
  // Satoshi Bold, in 584 - 2*28 = 528px. Asserted here so a longer handle fails the build.
  const PAD = 28, INNER = 680 - 96 - 2 * PAD, WIDEST = 519;
  if (WIDEST > INNER) throw new Error(`g22: widest value ${WIDEST}px exceeds ${INNER}px`);
  const RH = 100, TOP = 150, HEAD = 70, H = n => HEAD + n * RH + 24;   // labels 32px (human decision 2026-09-23)
  const body = `
<div id="card" class="${panelClass(id)}" style="position:absolute;left:96px;top:${TOP}px;width:584px;height:${H(1)}px;overflow:hidden">
  <div class="capt eyebrow muted" style="position:absolute;left:${PAD}px;top:28px;font-size:20px">${brand.channel.name}</div>
  ${links.map((l, i) => `
  <div id="e${i}" style="position:absolute;left:${PAD}px;top:${HEAD + i * RH}px;width:${INNER}px;height:${RH - 4}px">
    <div class="med muted" style="position:absolute;left:0;top:2px;font-size:32px">${l.label}</div>
    <div class="disp" style="position:absolute;left:0;top:42px;font-size:36px;font-variation-settings:'wght' 700;white-space:nowrap">${l.value}</div>
    ${i === 0 ? `<div id="ar" class="accentbar" style="position:absolute;left:0;top:${RH - 10}px;width:220px;height:3px"></div>` : ""}
  </div>`).join("")}
</div>`;
  // on the part's first frame: g21 leaves on its last, so this is the swap (a 0.2s
  // later entrance left an empty beat, verification 2026-09-23)
  let js = wipeUp("#card", 0, 0.2);
  links.forEach((_, i) => {
    if (i) js += `tl.fromTo("#card",{height:${H(i)}},{height:${H(i + 1)},duration:0.35,ease:"power3.out"},${T[i].toFixed(3)});\n`;
    js += `tl.fromTo("#e${i}",{clipPath:"inset(100% 0 0 0)"},{clipPath:"inset(0% 0 0 0)",duration:0.35,ease:"power3.out"},${T[i].toFixed(3)});\n`;
  });
  js += `tl.fromTo("#ar",{scaleX:0,transformOrigin:"left center"},{scaleX:1,duration:0.45,ease:"power2.out"},${(tSub + 0.3).toFixed(3)});\n`;
  js += `tl.fromTo("#card",{opacity:1},{opacity:1,duration:0.2},${(D - 0.2).toFixed(3)});\n`;   // holds to the last frame
  emit(id, D, body, js);
}
