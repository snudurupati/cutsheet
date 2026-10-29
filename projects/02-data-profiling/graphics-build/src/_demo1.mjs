// Shared art for the demo-screen parts g15-g19 (one builder). Not a part: files starting with "_"
// are not built. Every card here sits over the VS Code notebook in the empty strip right of the code
// (x 1340-1890, y 56-496, measured on the screen OCR), above the face inset (y 528 down).
import { C, struck, SHADOW_PAD } from "../lib.mjs";
import { T, f3, drawAll } from "../common.mjs";
// A round-capped stroke hidden by its dash offset still shows a dot (the zero-length dash's caps),
// so every drawn stroke here also carries opacity="0" until its draw starts.
export const drawIn = (sel, t, d = 0.4) => drawAll(sel, t, d)
  + `tl.fromTo(${JSON.stringify(sel)},{opacity:0},{opacity:1,duration:0.2,ease:"none",immediateRender:false},${f3(t)});\n`;

// A card that is only on screen around its results SLIDES out to the right edge and back. One
// wrapper per card; its x is the only thing tweened (the card's own clip/opacity are untouched).
// 700px puts the card and its 52px shadow fully past x 1920 from x 1340.
export const OFF = 700;
// spans: [[tIn, tOut|null], ...] in part-relative seconds; tOut null = holds to the part's end.
export const slides = (sel, spans) => {
  const s = JSON.stringify(sel);
  let js = "";
  const t0 = spans[0][0];
  if (t0 > 0) js += `tl.fromTo(${s},{x:${OFF},opacity:0},{x:${OFF},opacity:0,duration:${f3(t0)},immediateRender:true},0);\n`;
  spans.forEach(([a, b], i) => {
    js += `tl.fromTo(${s},{x:${OFF},opacity:1},{x:0,opacity:1,duration:0.35,ease:"power3.out",immediateRender:${i === 0 && a <= 0}},${f3(a)});\n`;
    if (b != null) {
      js += `tl.fromTo(${s},{x:0,opacity:1},{x:${OFF},opacity:1,duration:0.35,ease:"power2.in",immediateRender:false},${f3(b)});\n`;
      js += `tl.fromTo(${s},{opacity:1},{opacity:0,duration:0.2,immediateRender:false},${f3(b + 0.35)});\n`;
    }
  });
  return js;
};

// colour state changes on SVG shapes, tracked so every fromTo starts from the state it is really in
export const stateTracker = (initial) => {
  const cur = { ...initial };
  return (sel, to, t, d = 0.25) => {
    const from = cur[sel]; cur[sel] = to;
    return `tl.fromTo(${JSON.stringify(sel)},${JSON.stringify(from)},{...${JSON.stringify(to)},duration:${d},ease:"power1.out",immediateRender:false},${f3(t)});\n`;
  };
};

// ------------------------------------------------------------------ hypothesis loop at 60%
// Shared geometry (brief): OBSERVE top, HUNCH right, TEST bottom, DATA ANSWERS left, clockwise.
// At 60%: ring r 72, nodes r 9. The node labels would be 13px at 60%, below the 20px floor, so the
// return names its nodes through the text beside them instead: the hunch block sits right of the
// HUNCH node, the answer row hangs off the DATA ANSWERS node by a leader.
export const RING = { cx: 100, cy: 100, r: 72, nr: 9, sw: 2.5 };
export const NODES = [[100, 28], [172, 100], [100, 172], [28, 100]];   // observe, hunch, test, data
export const loopSVG = (pre, left, top, F, M) => `
<svg id="${pre}-ring" style="position:absolute;left:${left}px;top:${top}px;overflow:visible" width="200" height="200" viewBox="0 0 200 200">
  <circle cx="100" cy="100" r="${RING.r}" fill="none" stroke="${M}" stroke-width="${RING.sw}"/>
  <g id="${pre}-dotg"><circle cx="100" cy="28" r="4.5" fill="${F}"/></g>
  ${NODES.map(([x, y], k) => `<circle id="${pre}-n${k}" cx="${x}" cy="${y}" r="${RING.nr}" fill="${C.ink}" stroke="${M}" stroke-width="${RING.sw}"/>`).join("")}
</svg>`;
// one lap per 4s, continuous while the card is on screen (seek-safe single repeating tween)
export const loopDot = (pre, t0, t1) => {
  const n = Math.max(1, Math.floor((t1 - t0) / 4));
  return `tl.fromTo("#${pre}-dotg",{rotation:0,svgOrigin:"100 100"},{rotation:360,svgOrigin:"100 100",duration:4,ease:"none",repeat:${n - 1},immediateRender:true},${f3(t0)});\n`;
};
export const NODE_OFF = M => ({ fill: C.ink, stroke: M });
export const NODE_LIT = F => ({ fill: F, stroke: F });
export const NODE_ACC = { fill: C.accent, stroke: C.accent };

// a drawn tick (the win mark), 5px, in its own small SVG
export const tickSVG = (id, x, y, color, s = 1) => `<svg id="${id}" style="position:absolute;left:${x}px;top:${y}px;overflow:visible" width="${40 * s}" height="${36 * s}" viewBox="0 0 40 36"><path class="dr" pathLength="1" opacity="0" d="M4,19 L15,30 L36,5" fill="none" stroke="${color}" stroke-width="${(5 / s).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// ------------------------------------------------------------------ SO-101 arm with a held object
// common.mjs so101() geometry (base, upper arm u pivoting at the shoulder 91,188, forearm f at the
// elbow 91,84) plus a WRIST w at the forearm's end (187,84) carrying two parallel jaws and the held
// object, so what the gripper moves it holds, and the wrist can keep it level while the arm bends.
// jaws: [top, bottom] y of the jaw lines, OPEN (they close on the object by a y tween on
// #id-jt / #id-jb). Fill is the card's own ink so it reads as line art on the opaque card.
export const arm = (id, x, y, F, held, mirror = false, jaws = [74, 94]) => {
  const s = `class="${id}-bp" stroke="${F}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"`, fill = C.ink;
  return `<div style="position:absolute;left:${x}px;top:${y}px;width:220px;height:260px;${mirror ? "transform:scaleX(-1);transform-origin:110px 130px;" : ""}">
  <svg style="position:absolute;left:0;top:0;overflow:visible" width="220" height="260" viewBox="0 0 220 260">
    <rect x="40" y="216" width="100" height="26" rx="6" fill="${fill}" ${s}/>
    <rect x="72" y="186" width="36" height="32" rx="6" fill="${fill}" ${s}/>
    <g id="${id}-u"><rect x="80" y="86" width="22" height="104" rx="8" fill="${fill}" ${s}/>
      <circle id="${id}-j0" cx="91" cy="188" r="10" fill="${fill}" ${s}/>
      <g id="${id}-f"><rect x="91" y="72" width="96" height="22" rx="8" fill="${fill}" ${s}/>
        <g id="${id}-w"><g id="${id}-obj">${held}</g>
          <path d="M184,74 V94" fill="none" ${s}/>
          <path id="${id}-jt" d="M184,${jaws[0]} H212" fill="none" ${s}/><path id="${id}-jb" d="M184,${jaws[1]} H212" fill="none" ${s}/></g>
        <circle id="${id}-j1" cx="91" cy="84" r="10" fill="${fill}" ${s}/></g></g></svg></div>`;
};

// ------------------------------------------------------------------ the hunch panel (g17, g18)
// One card returning with its state changed. Card-local layout, 540 x 440:
//   eyebrow (24,18); ring centre (110,136) r72; HUNCH block right of the HUNCH node from x 214.
//   Lower left (x 24-264): DATA ANSWERS eyebrow at y 236, hanging off the DATA ANSWERS node by a
//   leader; what the data proved (26px 700, y 264, optional 5px tick before it); then the
//   provisional reading (22px dim, "likely: ...", never ticked: review 2026-10-28, it is his
//   assumption, not a data answer).
//   Lower right (x 276-516): stat label (22px 700, y 238); the figure "≈ 0" at 96px 900 (review round
//   3: g22's peak must out-rank it), inset to x 296, glyphs ~287-361; the true correlation as a
//   sub-line (22px dim, y 372), true to the plot titles on screen, 60px above the card's bottom.
//   Short card (H 246) = ring + hunch only.
// hunches: [{ lines: [..], size, color }] stacked from y 106; each line is a struck() span so a
// strike is the line's own measured width (style: strikes sized by the text).
export const RING_AT = { left: 10, top: 36 };
export const hunchPanel = (pre, cls, F, M, { H, hunches, stat = null, answer = null, eyebrow = "Hypothesis loop" }) => {
  let y = 106;
  const hb = hunches.map((h, i) => h.lines.map((ln, j) => {
    const el = `<div id="${pre}-h${i}l${j}" style="position:absolute;left:214px;top:${y}px;white-space:nowrap;font-family:Satoshi,sans-serif;font-variation-settings:'wght' ${h.size >= 26 ? 700 : 500};font-size:${h.size}px;line-height:1.12;color:${h.color}">${struck(`${pre}-s${i}l${j}`, ln, M, 2.5)}</div>`;
    y += Math.round(h.size * 1.12) + (j === h.lines.length - 1 ? 6 : 0);
    return el;
  }).join("")).join("");
  let ans = "";
  if (answer) {
    const px = 24;   // flush left; the tick hangs in the card's left margin (review round 3)
    ans = `
    <svg style="position:absolute;left:0;top:0;overflow:visible" width="10" height="10"><path id="${pre}-lead" class="dr" pathLength="1" opacity="0" d="M38,146 V228" fill="none" stroke="${M}" stroke-width="2.5" stroke-linecap="round"/></svg>
    ${T("Data answers", 24, 236, 22, { weight: 700, color: M, ls: 0.14, upper: true, id: `${pre}-de` })}
    ${answer.tick ? tickSVG(`${pre}-tick`, 0, 272, C.accent, 0.5) : ""}
    ${answer.proven.map((ln, j) => T(ln, px, 264 + j * 29, 26, { weight: 700, color: F, id: `${pre}-pv${j}` })).join("")}
    ${answer.likely.map((ln, j) => T(ln, 24, 274 + answer.proven.length * 29 + j * 25, 22, { weight: 500, color: M, id: `${pre}-lk${j}` })).join("")}`;
  }
  const st = stat ? `
    ${T(stat.label, 276, 238, 22, { weight: 700, color: F, id: `${pre}-sl` })}
    <div id="${pre}-num" data-layout-allow-overlap style="position:absolute;left:296px;top:262px;white-space:nowrap;font-family:Satoshi,sans-serif;font-variation-settings:'wght' 900;font-size:96px;line-height:1.25;word-spacing:-0.12em;color:${F}">&#8776; 0</div>
    ${T(stat.sub, 296, 372, 22, { weight: 500, color: M, id: `${pre}-sub` })}` : "";
  return `<div id="${pre}" class="${cls}" style="position:absolute;left:0;top:0;width:540px;height:${H}px">
    ${T(eyebrow, 24, 18, 28, { weight: 700, color: M, ls: 0.18, upper: true })}
    ${loopSVG(pre, RING_AT.left, RING_AT.top, F, M)}
    ${T("Hunch", 214, 76, 22, { weight: 700, color: M, ls: 0.14, upper: true, id: `${pre}-hl` })}
    ${hb}${ans}${st}
  </div>`;
};
// the figure lands ON the spoken number with a left-to-right wipe; the slot is empty until then
export const figureIn = (sel, t, d = 0.35) =>
  `tl.fromTo(${JSON.stringify(sel)},{clipPath:"inset(-40px 100% -40px 0px)",opacity:1},{clipPath:"inset(-40px 0% -40px 0px)",opacity:1,duration:${d},ease:"power2.out"},${f3(t)});\n`;

// A card that builds in steps (style.md "Cards that build in steps"): it shows only its top HA px
// (clip, with a paper rule standing in for the bottom border) until tGrow, then grows down to its
// full H with the rule riding the clip edge. Returns the rule's HTML (put it last inside the card)
// and the timeline code. Layout motion is never tweened: only clip-path and a transform.
export const stepCard = (sel, ruleId, W, H, HA, tGrow, d = 0.45) => {
  const clipA = `inset(-90px -90px ${H - HA}px -90px)`, clipB = `inset(${SHADOW_PAD})`;
  const html = `<div id="${ruleId}" style="position:absolute;left:-6px;top:${HA - 12}px;width:${W}px;height:6px;background:${C.bg}"></div>`;
  let js = `tl.fromTo("${sel}",{clipPath:"${clipA}"},{clipPath:"${clipA}",duration:0.2,immediateRender:true},0);\n`;
  // the clip's bottom edge travels exactly with the rule (to inset 0), then opens to the shadow pad
  const clipM = `inset(-90px -90px 0px -90px)`;
  js += `tl.fromTo("${sel}",{clipPath:"${clipA}"},{clipPath:"${clipM}",duration:${d},ease:"power2.inOut",immediateRender:false},${f3(tGrow)});\n`;
  js += `tl.fromTo("${sel}",{clipPath:"${clipM}"},{clipPath:"${clipB}",duration:0.2,ease:"none",immediateRender:false},${f3(tGrow + d)});\n`;
  js += `tl.fromTo("#${ruleId}",{y:0,opacity:1},{y:${H - HA},opacity:1,duration:${d},ease:"power2.inOut",immediateRender:false},${f3(tGrow)});\n`;
  js += `tl.fromTo("#${ruleId}",{opacity:1},{opacity:0,duration:0.2,immediateRender:false},${f3(tGrow + d)});\n`;
  return { html, js };
};
