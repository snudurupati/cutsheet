// Generate one HyperFrames project per part. Nothing here is hand-written HTML.
//
// ORDER OF THE PIPELINE AROUND THIS FILE
//   node build.mjs --copy-only   -> copy.json          (every on-screen line + its size)
//   python3 check_copy.py        -> exact PIL widths against the 960px safe width
//   python3 make_text_track.py   -> outputs/transcript-cut.json  (text IS the caption track)
//   python3 validate_cutsheet.py -> the plan gate
//   node build.mjs               -> parts/g00*/index.html
import { writeFileSync } from "node:fs";
import {
  C, FPS, ART_X, ART_Y, ART_W, ART_H, PLAQUE_X, PLAQUE_Y, PLAQUE_W, PLAQUE_MAX_Y,
  SAFE_X0, SAFE_X1, HOOK_PX, END_PX, BODY_PX, SUPPORT_PX, EYEBROW_PX,
  SHADOW_TAIL, BAND_TOP,
  fgArt, dimArt, PLAQUE_DIM, emit, dur, part, NODES, EDGES, NR,
  graphSVG, svgOpen, svgClose, box, assertClear, assertInside, cycles,
} from "./lib.mjs";

// ===========================================================================
// COPY. Every word that appears on screen, in one place.
//
// The end card's text is ONE CONSTANT so changing it is a one-line edit. It
// flows from here into the composition, into copy.json, and from there into the
// caption track, so a change cannot desync the three.
// ===========================================================================
const END_TEXT = ["Nobody own the", "Graph"];

const COPY = {
  g001: { hl: ["Enterprise knowledge", "graphs can't work."], px: HOOK_PX,
          sup: "Not because the tech is bad.", supPx: SUPPORT_PX, rule: true },
  g002: { hl: ["Graph RAG beats naive RAG.", "Every demo."], px: BODY_PX.g002,
          rule: true, ruleId: "demorule", ruleW: 372,
          _ruleWhy: "sized to 'Every demo.', the hinge of the argument" },
  g003: { hl: ["Committee speed vs AI speed.", "Stale data."], px: BODY_PX.g003 },
  g004: { hl: ["Everyone could benefit.", "No one will own it."], px: BODY_PX.g004 },
  g005: { hl: ["There is no single", "source of truth."], px: BODY_PX.g005 },
  g006: { eyebrow: "What worked for me", px: BODY_PX.g006,
          hl: ["a lightweight ontology,", "owned by the team."] },
  g007: { hl: END_TEXT, px: END_PX, rule: true },
};

// Art-field labels, kept beside the card copy so check_copy.py measures them too.
const TEAMS = ["IT", "SALES", "FINANCE", "MARKETING"];
const LABELS = {
  g003: [["COMMITTEE", 40], ["AI AGENTS", 40], ["PENDING APPROVAL", 34]],
  g004: TEAMS.map(t => [t, 46]),
  g005: [["Revenue", 48], ["MARKETING", 34], ["SALES", 34]],
  g006: TEAMS.map(t => [t, 32]),
};

// ===========================================================================
// Shared markup helpers. Repeated markup is built into a VARIABLE before it
// enters a template: a nested template literal emits the literal text ${...}
// into the composition and fails invalid_inline_script_syntax.
// ===========================================================================
const plaque = (id) => {
  const c = COPY[id];
  const eb = c.eyebrow
    ? `<div class="eyebrow" id="${id}-eb" style="font-size:${EYEBROW_PX}px;margin-bottom:18px">${c.eyebrow}</div>`
    : "";
  const lines = c.hl.map((t, i) =>
    `<div class="hl" id="${id}-l${i}" style="font-size:${c.px}px">${t}</div>`).join("\n  ");
  const rule = c.rule
    ? `<div class="arule" id="${id}-${c.ruleId || "rule"}" style="margin-top:16px;`
      + `width:${c.ruleW || PLAQUE_W - 88}px"></div>`
    : "";
  const sup = c.sup
    ? `<div class="sup" id="${id}-sup" style="font-size:${c.supPx}px;margin-top:18px">${c.sup}</div>`
    : "";
  const top = plaqueTop(id);
  return `<div class="plaque killable" id="${id}-plaque" style="top:${top.toFixed(0)}px">
  ${eb}${lines}
  ${rule}${sup}
</div>`;
};

// Plaque height, computed the same way the browser will lay it out, so the
// build throws rather than the review discovering type in the player's controls.
const plaqueH = (id) => {
  const c = COPY[id];
  let h = 40 + 40;                                   // padding
  if (c.eyebrow) h += EYEBROW_PX * 1.2 + 18;
  h += c.hl.length * c.px * 1.05;
  if (c.rule) h += 16 + 3;
  if (c.sup) h += 18 + c.supPx * 1.3;
  return h + 12;                                     // + border
};
const PLAQUE_BASE = BAND_TOP - SHADOW_TAIL - 7;   // 1175
const plaqueTop = (id) => PLAQUE_BASE - plaqueH(id);
const plaqueBottom = (id) => plaqueTop(id) + plaqueH(id);

// Type reveal: ONE element wiped with a stepped clip-path. Never per-character
// spans at a fixed advance width - that breaks the font's real metrics and
// Satoshi renders "DATA ENGINEER" as "DATA ENGI NEER". clip-path is not a
// filter, so unlike blur and grayscale it survives the render.
const wipe = (sel, text, at, d = 0.70) =>
  `tl.fromTo("${sel}", { clipPath: "inset(0 100% 0 0)", opacity: 1 },
    { clipPath: "inset(0 0% 0 0)", opacity: 1, duration: ${d.toFixed(2)},
      ease: "steps(${Math.max(6, Math.min(40, text.length))})" }, ${at.toFixed(2)});`;

// Spot review finding 4: EVERY part boundary rendered a blank frame, because
// every element started at opacity 0 / dashoffset 1 at position 0. Measured:
// frame 90 was 0.000% content against 31.0% on frame 89. The plaque no longer
// animates in - it is PRESENT on frame 0 of every part, which is also the
// correct treatment for a hard cut between segments. Only the type moves.
const plaqueIn = (id, at = 0) => "";

const ruleIn = (id, at) =>
  `tl.fromTo("#${id}-rule", { scaleX: 0, opacity: 1, transformOrigin: "left center" },
    { scaleX: 1, opacity: 1, duration: 0.45, ease: "power3.out" }, ${at.toFixed(2)});`;

// Standard copy choreography for the five drawn beats.
const copyIn = (id) => {
  const c = COPY[id];
  const js = [plaqueIn(id, 0)];
  let t = 0.05;
  if (c.eyebrow) { js.push(wipe(`#${id}-eb`, c.eyebrow, t, 0.45)); t += 0.35; }
  // hl[0] is present on frame 0 - no wipe - so a cut never lands on an empty
  // plaque. Only the second line moves.
  t += 0.30;
  c.hl.slice(1).forEach((line, i) => { js.push(wipe(`#${id}-l${i + 1}`, line, t)); t += 0.75; });
  if (c.rule && !c.ruleId) js.push(ruleIn(id, t));
  return js.join("\n");
};

// A finite-repeat oscillator. An infinite repeat would make the timeline's own
// duration infinite; the beat length is known, so the cycle count is computable.
const breathe = (sel, from, to, period, start, until, prop = "scale", extra = "") => {
  const span = until - start;
  let legs = Math.max(2, Math.round(span / period));
  if (legs % 2) legs -= 1;                    // even: yoyo ends back on `from`
  if (legs < 2) legs = 2;
  const p = span / legs;                      // ends exactly on `until`
  const x = extra ? ", " + extra : "";
  return `tl.fromTo("${sel}", { ${prop}: ${from}${x} },
    { ${prop}: ${to}${x}, duration: ${p.toFixed(3)}, ease: "sine.inOut",
      repeat: ${legs - 1}, yoyo: true }, ${start.toFixed(2)});`;
};

// A slow scale drift across a whole beat. style.json graphics.takeoverDrift is
// written for full-frame parts of 20s+; nothing here reaches 20s, but the brief
// asks for continuous motion on EVERY beat, which is the stricter rule.
const drift = (sel, d, to = 1.03) =>
  `tl.fromTo("${sel}", { scale: 1, transformOrigin: "50% 50%" },
    { scale: ${to}, transformOrigin: "50% 50%", duration: ${d.toFixed(2)},
      ease: "power1.inOut" }, 0);`;

// ===========================================================================
// g001 - HOOK. self-demonstrating: the subject of the video, under load.
// Frame 1 is the thumbnail, so the headline is COMPLETE at t=0 and the graph is
// already drawn and already moving. style.json hook.mustBeDrawnObject is
// satisfied by the object; the brief's card is satisfied by the plaque.
// ===========================================================================
function g001() {
  const id = "g001", D = dur(id);
  const g = graphSVG(id, { drawn: true, preSnap: [0], gap: 34 });
  const body = `
${svgOpen(id + "-svg")}
  <g id="${id}-wrap">
${g.edges}
${g.nodes}
  </g>
${svgClose}
${plaque(id)}`;

  // Three edges snap. For each, pull the two inner endpoints back toward their
  // own nodes so a real gap opens in the middle, by tweening an SVG ATTRIBUTE -
  // never a transform, which would collide with the wrapper's oscillation.
  const SNAP = [[3, 0.70], [10, 1.70]];
  const snaps = SNAP.map(([ei, at]) => {
    const [a, b] = EDGES[ei];
    const [x1, y1] = NODES[a], [x2, y2] = NODES[b];
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const pull = (px, py) => {
      const dx = mx - px, dy = my - py, L = Math.hypot(dx, dy);
      return [ (mx - 34 * dx / L).toFixed(1), (my - 34 * dy / L).toFixed(1) ];
    };
    const [ax, ay] = pull(x1, y1), [bx, by] = pull(x2, y2);
    return `tl.to("#${id}-e${ei}a", { attr: { x2: ${ax}, y2: ${ay} }, stroke: "${dimArt}",
    strokeWidth: 5, duration: 0.42, ease: "power3.out" }, ${at.toFixed(2)});
tl.to("#${id}-e${ei}b", { attr: { x2: ${bx}, y2: ${by} }, stroke: "${dimArt}",
    strokeWidth: 5, duration: 0.42, ease: "power3.out" }, ${at.toFixed(2)});
// A break needs a motion spike, or at feed size it reads as a line that was
// never drawn rather than as a line that gave way.
tl.fromTo("#${id}-wrap", { x: 9 }, { x: 0, duration: 0.34,
    ease: "elastic.out(1.1, 0.32)" }, ${at.toFixed(2)});`;
  }).join("\n");

  // The nodes those edges held on to drift apart.
  const DRIFT = [[4, 74, 40, 0.76], [8, 0, 66, 1.76], [5, -52, 30, 1.80]];
  const drifts = DRIFT.map(([n, dx, dy, at]) =>
    `tl.fromTo("#${id}-n${n}", { x: 0, y: 0 }, { x: ${dx}, y: ${dy}, duration: 0.62,
    ease: "back.out(3.4)" }, ${at.toFixed(2)});`).join("\n");

  const js = `
// Under load from frame 0: the cluster is already breathing when the thumbnail
// is taken, so frame 1 carries movement while the hook text is fully rendered.
// sine.out leaves frame 0 at MAXIMUM velocity. A sine.inOut from phase 0 has
// zero velocity exactly on the thumbnail frame, which measured 0.0486 mean pixel
// change - the least-moving frame in the whole hook.
${breathe(`#${id}-wrap`, 0, 26, 0.38, 0, D, "y").replace('sine.inOut', 'sine.out')}
${ruleIn(id, 0.10)}
${snaps}
${drifts}
// The support line is PRESENT on frame 0. Animating it in left the thumbnail -
// the single most-seen frame of the piece - showing a plaque roughly 35% empty.
// The graph carries this beat's motion; the type does not need to move.
`;
  assertInside(id, [box("plaque", PLAQUE_X, PLAQUE_Y, PLAQUE_X + PLAQUE_W, plaqueBottom(id))]);
  emit(id, D, body, js);
}

// ===========================================================================
// g002 - self-demonstrating: the graphic performs the line. The graph builds
// itself node by node, one accent at a time.
// ===========================================================================
function g002() {
  const id = "g002", D = dur(id);
  // Seed edges are authored drawn; the rest arrive with their node.
  // Edges among the three seed nodes are authored drawn, like the nodes.
  const g = graphSVG(id, { drawn: false, preDrawn: [0, 1] });
  const body = `
${svgOpen(id + "-svg")}
  <g id="${id}-wrap">
${g.edges}
${g.nodes}
  </g>
${svgClose}
${plaque(id)}`;

  // Node k lands at 0.8 + k*0.75; its edge to an already-present node draws in
  // 0.15s later. 0.75s clears the 0.4s minimum entrance stagger.
  const SEED = 3;                       // present on frame 0, never animated in
  const seen = new Set([0, 1, 2]);
  const steps = [];
  for (let k = SEED; k < 9; k++) {
    const at = 0.8 + (k - SEED) * 1.05;
    steps.push(`tl.fromTo("#${id}-n${k}", { scale: 0.4, opacity: 0, transformOrigin: "50% 50%" },
  { scale: 1, opacity: 1, transformOrigin: "50% 50%", duration: 0.40, ease: "back.out(2)" }, ${at.toFixed(2)});
tl.fromTo("#${id}-n${k}c", { fill: "${C.accent}", stroke: "${C.accent}" },
  { fill: "${C.accent}", stroke: "${C.accent}", duration: 0.50 }, ${at.toFixed(2)});
tl.to("#${id}-n${k}c", { fill: "${C.bg}", stroke: "${fgArt}", duration: 0.35,
  ease: "power2.inOut" }, ${(at + 0.50).toFixed(2)});`);
    if (k > 0) {
      EDGES.forEach(([a, b], ei) => {
        if ((a === k && seen.has(b)) || (b === k && seen.has(a)))
          steps.push(`tl.fromTo(["#${id}-e${ei}a", "#${id}-e${ei}b"], { strokeDashoffset: 1, opacity: 1 },
  { strokeDashoffset: 0, opacity: 1, duration: 0.45, ease: "power2.out" }, ${(at + 0.15).toFixed(2)});`);
      });
    }
    seen.add(k);
  }
  // The node at the centre is present from the start, so its own edges wait for
  // their far end rather than firing at 0.
  const js = `
${copyIn(id)}
${steps.join("\n")}
// The finished graph keeps moving for the remaining 2s, and the whole field
// drifts across the beat so nothing is ever a still picture.
${breathe(`#${id}-wrap`, -2.2, 2.2, 1.6, 0, D, "rotation", 'svgOrigin: "480 300"')}
// The accent leaves the graph when the build ends and settles as a rule under
// "Every demo." - the hinge of the argument, and previously the quietest thing
// on screen. The travelling accent and the final rule are one element, so the
// one-per-scene budget holds by construction.
tl.set("#${id}-n8c", { fill: "${C.bg}", stroke: "${fgArt}" }, 7.10);
tl.fromTo("#${id}-demorule", { scaleX: 0, opacity: 1, transformOrigin: "left center" },
  { scaleX: 1, opacity: 1, duration: 0.45, ease: "power3.out" }, 7.20);
${drift(`#${id}-svg`, D, 1.03)}
`;
  assertInside(id, [box("plaque", PLAQUE_X, PLAQUE_Y, PLAQUE_X + PLAQUE_W, plaqueBottom(id))]);
  emit(id, D, body, js);
}

// ===========================================================================
// g003 - contrast. style.md's contrast anatomy puts a VERTICAL hairline on a
// 1920x1080 canvas; on a 1080x1350 portrait frame that leaves two 480px columns
// nothing legible fits in, so the divider is HORIZONTAL. Same mechanic: the
// divider draws first, so the split exists before either side fills it, and both
// states hold at the end. Reported as adaptation 4.
// ===========================================================================
function g003() {
  const id = "g003", D = dur(id);
  const g = graphSVG(id, { drawn: true });
  const DIV = 380;                                        // divider, off centre by design
  const GS = 0.60, GX = 192, GY = 10;                     // top graph placement
  const at = (i) => [GX + NODES[i][0] * GS, GY + NODES[i][1] * GS];

  // Four "PENDING" stamps, one per outer node, accumulating.
  const STAMP = [[1, 2.4], [4, 3.9], [8, 5.4]];
  const stampMarkup = STAMP.map(([n, t], k) => {
    const [x, y] = at(n);
    return `<g id="${id}-st${k}" opacity="0">
    <rect x="${(x - 195).toFixed(1)}" y="${(y - 30).toFixed(1)}" width="390" height="60" rx="3"
      fill="${C.bg}" stroke="${dimArt}" stroke-width="3"/>
    <text x="${x.toFixed(1)}" y="${(y + 12).toFixed(1)}" text-anchor="middle" fill="${dimArt}"
      font-family="SatoshiBold" font-size="34" letter-spacing="2">PENDING APPROVAL</text>
  </g>`;
  }).join("\n");

  // Ghost copies of the graph receding to the right: the AI moving on while the
  // committee stands still. No type needed, which is the point.
  const GHOST = [[300, 400, 0.28, 0.55], [640, 428, 0.20, 0.34]];
  const ghostMarkup = GHOST.map(([x, y, s], k) => {
    const gg = graphSVG(`${id}-gh${k}`, { drawn: true, sw: 8 });
    return `<g id="${id}-ghost${k}" opacity="0" transform="translate(${x},${y}) scale(${s})">
    ${gg.edges}${gg.nodes}
  </g>`;
  }).join("\n");

  const CKX = 130, CKY = 490, CKR = 82;
  const TICKS = Array.from({ length: 12 }, (_, i) => {
    const a = i * Math.PI / 6, cx = CKX, cy = CKY;
    return `<line x1="${(cx + (CKR - 14) * Math.sin(a)).toFixed(1)}" y1="${(cy - (CKR - 14) * Math.cos(a)).toFixed(1)}"
      x2="${(cx + (CKR - 2) * Math.sin(a)).toFixed(1)}" y2="${(cy - (CKR - 2) * Math.cos(a)).toFixed(1)}"
      stroke="${dimArt}" stroke-width="3" stroke-linecap="round"/>`;
  }).join("\n");

  const body = `
${svgOpen(id + "-svg")}
  <line id="${id}-div" x1="20" y1="${DIV}" x2="940" y2="${DIV}" stroke="${dimArt}" stroke-width="3"
    pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
  <g id="${id}-top" transform="translate(${GX},${GY}) scale(${GS})">
${g.edges}
${g.nodes}
  </g>
${stampMarkup}
${ghostMarkup}
  <g id="${id}-clock" opacity="0">
    <circle cx="${CKX}" cy="${CKY}" r="${CKR}" fill="${C.bg}" stroke="${fgArt}" stroke-width="4"/>
${TICKS}
    <g id="${id}-hour"><line x1="${CKX}" y1="${CKY}" x2="${CKX}" y2="${CKY - 44}" stroke="${fgArt}"
      stroke-width="8" stroke-linecap="round"/></g>
    <!-- The one accent in the scene. It was 113 accent px at half canvas, a
         twentieth of the mass of the beats around it, so it is heavier and
         longer now and overruns the dial. -->
    <g id="${id}-min"><line x1="${CKX}" y1="${CKY}" x2="${CKX}" y2="${CKY - CKR - 16}"
      stroke="${C.accent}" stroke-width="10" stroke-linecap="round"/></g>
    <circle cx="${CKX}" cy="${CKY}" r="10" fill="${fgArt}"/>
  </g>
${svgClose}
<div class="lblm" id="${id}-eb1" style="position:absolute;left:${ART_X}px;top:140px;font-size:40px">COMMITTEE</div>
<div class="lblm" id="${id}-eb2" style="position:absolute;left:${ART_X}px;top:${ART_Y + DIV + 8}px;font-size:40px">AI AGENTS</div>
${plaque(id)}`;

  const stampJs = STAMP.map(([n, t], k) =>
    `tl.fromTo("#${id}-st${k}", { opacity: 0, scale: 1.25, rotation: -14, svgOrigin: "${at(n)[0].toFixed(1)} ${at(n)[1].toFixed(1)}" },
  { opacity: 0.9, scale: 1, rotation: -8, svgOrigin: "${at(n)[0].toFixed(1)} ${at(n)[1].toFixed(1)}",
    duration: 0.30, ease: "back.out(3)" }, ${t.toFixed(2)});`).join("\n");

  const ghostJs = GHOST.map(([x, y, s, o], k) =>
    `tl.fromTo("#${id}-ghost${k}", { opacity: 0 }, { opacity: ${o}, duration: 0.45,
    ease: "power2.out" }, ${(3.0 + k * 2.6).toFixed(2)});`).join("\n");

  const js = `
${copyIn(id)}
// The divider draws FIRST, so the split exists before either side fills it.
tl.fromTo("#${id}-div", { strokeDashoffset: 1, opacity: 1 },
  { strokeDashoffset: 0, opacity: 1, duration: 0.50, ease: "power2.inOut" }, 0);
tl.fromTo("#${id}-eb1", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.30 }, 0.25);
tl.fromTo("#${id}-eb2", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.30 }, 0.55);
tl.fromTo("#${id}-clock", { opacity: 0 }, { opacity: 1, duration: 0.35 }, 0.40);
${stampJs}
// The single accent: the minute hand, sweeping for the whole beat. svgOrigin,
// never transformOrigin - transformOrigin on an SVG element resolves against its
// OWN bounding box and would swing the hand out of frame.
tl.fromTo("#${id}-min", { rotation: 0, svgOrigin: "${CKX} ${CKY}" },
  { rotation: 2160, svgOrigin: "${CKX} ${CKY}", duration: ${(D - 0.4).toFixed(2)}, ease: "none" }, 0.40);
tl.fromTo("#${id}-hour", { rotation: 0, svgOrigin: "${CKX} ${CKY}" },
  { rotation: 180, svgOrigin: "${CKX} ${CKY}", duration: ${(D - 0.4).toFixed(2)}, ease: "none" }, 0.40);
${ghostJs}
// The graph visibly goes stale: it drains toward $muted and loses weight while
// the clock keeps racing. Both states hold from 9.40.
tl.to("#${id}-top", { opacity: 0.42, duration: 6.60, ease: "power1.inOut" }, 1.20);
${drift(`#${id}-svg`, D, 1.02)}
`;
  assertInside(id, [box("plaque", PLAQUE_X, PLAQUE_Y, PLAQUE_X + PLAQUE_W, plaqueBottom(id))]);
  // The stamps must not land on each other; the big stamp must clear the last row.
  const sb = STAMP.map(([n], k) => {
    const [x, y] = at(n); return box(`stamp${k}`, x - 195, y - 30, x + 195, y + 30);
  });
  assertClear(id, sb, 4);
  emit(id, D, body, js);
}

// ===========================================================================
// g004 - loop. A closed circuit with one accent travelling it, which is what
// lets the scene run 10s without a frozen frame. The travelling dot is the ONLY
// accent and it hands off to the "?" at the end, so the one-accent budget holds
// without special-casing.
// ===========================================================================
function g004() {
  const id = "g004", D = dur(id);
  const CX = 480, CY = 300, RX = 330, RY = 225, BW = 260, BH = 110;
  // Ramanujan's approximation, for the dash offset of the draw-on.
  const CIRC = Math.PI * (3 * (RX + RY) - Math.sqrt((3 * RX + RY) * (RX + 3 * RY)));
  const OR = 150;   // orbit radius: inside every box's reach, outside the "?"
  const POS = [[CX, CY - RY], [CX + RX, CY], [CX, CY + RY], [CX - RX, CY]];  // IT SALES FINANCE MARKETING
  const TEAM = ["IT", "SALES", "FINANCE", "MARKETING"];

  // Boxes carry an OPAQUE $bg fill so they occlude the ring. Two line-art objects
  // sharing a footprint interleave into one unreadable drawing otherwise.
  const boxes = POS.map(([x, y], i) =>
    `<g id="${id}-b${i}" opacity="0">
    <rect x="${x - BW / 2}" y="${y - BH / 2}" width="${BW}" height="${BH}" rx="4"
      fill="${C.bg}" stroke="${fgArt}" stroke-width="3"/>
    <text x="${x}" y="${y + 16}" text-anchor="middle" fill="${fgArt}"
      font-family="SatoshiBold" font-size="46">${TEAM[i]}</text>
  </g>`).join("\n");

  // Four arrows along the ring, each pointing one box at the next.
  // Gap arrows: on radius AR, centred at the four diagonals, drawn along the
  // tangent so each one points at the two boxes it sits between.
  const ALEN = 132, AH = 22;
  const arc = (i) => {
    const th = -Math.PI / 4 + i * Math.PI / 2;           // 45, 135, 225, 315
    const gx = CX + RX * Math.cos(th), gy = CY + RY * Math.sin(th);
    // Oriented along the ellipse's TANGENT at this point, so each arrow points
    // at the box before it and the box after it. A radial arrow points out of
    // the circuit and at the "?", which says something else entirely.
    const dx = -RX * Math.sin(th), dy = RY * Math.cos(th);
    const L = Math.hypot(dx, dy);
    const tx = dx / L, ty = dy / L;
    const ax = gx - tx * ALEN / 2, ay = gy - ty * ALEN / 2;
    const bx = gx + tx * ALEN / 2, by = gy + ty * ALEN / 2;
    const head = (hx, hy, dx, dy) => {
      const px = -dy, py = dx;
      return `${(hx).toFixed(1)},${(hy).toFixed(1)} `
           + `${(hx - dx * AH + px * AH * 0.5).toFixed(1)},${(hy - dy * AH + py * AH * 0.5).toFixed(1)} `
           + `${(hx - dx * AH - px * AH * 0.5).toFixed(1)},${(hy - dy * AH - py * AH * 0.5).toFixed(1)}`;
    };
    return `<g id="${id}-a${i}">
    <line id="${id}-a${i}p" x1="${ax.toFixed(1)}" y1="${ay.toFixed(1)}"
      x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}" stroke="${dimArt}" stroke-width="5"
      stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
    <polygon id="${id}-a${i}h" points="${head(bx, by, tx, ty)}" fill="${dimArt}" opacity="0"/>
    <polygon id="${id}-a${i}t" points="${head(ax, ay, -tx, -ty)}" fill="${dimArt}" opacity="0"/>
  </g>`;
  };
  const arrows = [0, 1, 2, 3].map(arc).join("\n");

  const body = `
${svgOpen(id + "-svg")}
  <ellipse id="${id}-ring" cx="${CX}" cy="${CY}" rx="${RX}" ry="${RY}" fill="none"
    stroke="${dimArt}" stroke-width="4" stroke-dasharray="14 16"
    stroke-dashoffset="${CIRC.toFixed(1)}"/>
  <text id="${id}-q" x="${CX}" y="${CY + 92}" text-anchor="middle" fill="${dimArt}"
    font-family="SatoshiBlack" font-size="260" opacity="0.22">?</text>
${arrows}
${boxes}
  <g id="${id}-orbit" opacity="0">
    <circle cx="${CX}" cy="${CY - OR}" r="14" fill="${C.accent}" opacity="0.25"
      transform="rotate(-22 ${CX} ${CY})"/>
    <circle cx="${CX}" cy="${CY - OR}" r="19" fill="${C.accent}" opacity="0.5"
      transform="rotate(-11 ${CX} ${CY})"/>
    <circle cx="${CX}" cy="${CY - OR}" r="24" fill="${C.accent}"/>
  </g>

  <!-- The only accent in the scene. At r=14 it measured 164 accent px at half
       canvas, about 3px at feed size: invisible, and it was the beat's only
       continuous-motion device. It now carries a trail. -->
${svgClose}
${plaque(id)}`;

  const boxJs = POS.map(([x, y], i) =>
    `tl.fromTo("#${id}-b${i}", { opacity: 0, scale: 0.85, svgOrigin: "${x} ${y}" },
  { opacity: 1, scale: 1, svgOrigin: "${x} ${y}", duration: 0.35, ease: "back.out(2)" }, ${(1.3 + i * 0.5).toFixed(2)});`).join("\n");
  const arrowJs = [0, 1, 2, 3].map(i =>
    `tl.fromTo("#${id}-a${i}p", { strokeDashoffset: 1, opacity: 1 },
  { strokeDashoffset: 0, opacity: 1, duration: 0.45, ease: "power2.out" }, ${(3.4 + i * 0.5).toFixed(2)});
tl.fromTo(["#${id}-a${i}h", "#${id}-a${i}t"], { opacity: 0 }, { opacity: 1, duration: 0.25 }, ${(3.75 + i * 0.5).toFixed(2)});`).join("\n");

  const js = `
${copyIn(id)}
// The circuit draws in on the cue that names it, over 1.2s.
tl.fromTo("#${id}-ring", { strokeDashoffset: ${CIRC.toFixed(1)}, opacity: 1 },
  { strokeDashoffset: 0, opacity: 1, duration: 1.20, ease: "power2.inOut" }, 0);
// Now that the ring is genuinely dashed, the directed dash drift has something
// to move. It was specified and could not happen.
tl.fromTo("#${id}-ring", { strokeDashoffset: 0 },
  { strokeDashoffset: -60, duration: ${(D - 1.4).toFixed(2)}, ease: "none" }, 1.4);
${boxJs}
${arrowJs}
// A dot travels the circuit continuously. It is the ONLY accent in the scene:
// no box ever takes accent, so the budget holds without special-casing.
tl.fromTo("#${id}-orbit", { opacity: 0 }, { opacity: 1, duration: 0.25 }, 3.40);
tl.fromTo("#${id}-orbit", { rotation: 0, svgOrigin: "${CX} ${CY}" },
  { rotation: 720, svgOrigin: "${CX} ${CY}", duration: 5.00, ease: "none" }, 3.40);
// Hand-off: the travelling element and the final accent are ONE element, so the
// dot is absorbed as the "?" takes the accent.
tl.to("#${id}-orbit", { opacity: 0, scale: 0, svgOrigin: "${CX} ${CY}", duration: 0.30 }, 8.50);
tl.to("#${id}-q", { fill: "${C.accent}", opacity: 1, duration: 0.50, ease: "power2.out" }, 8.50);
${breathe(`#${id}-q`, 1.0, 1.16, 0.5, 9.0, D, "scale", 'svgOrigin: "' + CX + ' ' + CY + '"')}
${drift(`#${id}-svg`, D, 1.02)}
`;
  assertInside(id, [box("plaque", PLAQUE_X, PLAQUE_Y, PLAQUE_X + PLAQUE_W, plaqueBottom(id))]);
  // The "?" was enlarged and centred on a previous job and landed on two of the
  // questions. Assert the centre glyph clears all four boxes before rendering.
  const qb = box("?", CX - 80, CY - 130, CX + 80, CY + 130);
  assertClear(id, [qb, ...POS.map(([x, y], i) =>
    box(TEAM[i], x - BW / 2, y - BH / 2, x + BW / 2, y + BH / 2))], 8);
  emit(id, D, body, js);
}

// ===========================================================================
// g005 - contrast as a split. One object, changed rather than replaced, both
// states visible at the end. The divider is the FRACTURE itself, which is a
// stronger image than a separate hairline and satisfies the same anatomy.
// Reported as adaptation 5.
// ===========================================================================
function g005() {
  const id = "g005", D = dur(id);
  const g = graphSVG(id, { drawn: true });        // the same 9-node object as everywhere else
  const CH = [[280, 190, "MARKETING", -1], [690, 410, "SALES", 1]];

  const child = (i) => {
    const [x, y, tag] = CH[i];
    return `<g id="${id}-c${i}" opacity="0">
    <rect x="${x - 150}" y="${y - 70}" width="300" height="140" rx="6"
      fill="${C.bg}" stroke="${fgArt}" stroke-width="3"/>
    <text x="${x}" y="${y - 14}" text-anchor="middle" fill="${dimArt}"
      font-family="SatoshiBold" font-size="34">Revenue</text>
    <text x="${x}" y="${y + 40}" text-anchor="middle" fill="${fgArt}"
      font-family="SatoshiBold" font-size="50" letter-spacing="1.5">${tag}</text>
  </g>`;
  };

  // The crack. A jagged polyline between the two children, drawn top to bottom.
  // Passes BETWEEN the two children: right child starts at x540, left ends at
  // x430, so the crack stays inside 436-534 for its whole run.
  const CRACK = "M 500 0 L 470 96 L 516 188 L 462 286 L 512 384 L 468 486 L 504 600";

  const body = `
${svgOpen(id + "-svg")}
  <g id="${id}-half0">
${g.edges}
${g.nodes}
  </g>
  <g id="${id}-src" data-layout-allow-overlap>
    <rect x="330" y="230" width="300" height="120" rx="6" fill="${C.bg}"
      stroke="${fgArt}" stroke-width="3"/>
    <text x="480" y="308" text-anchor="middle" fill="${fgArt}"
      font-family="SatoshiBold" font-size="48">Revenue</text>
  </g>
${child(0)}
${child(1)}
  <path id="${id}-crack" d="${CRACK}" fill="none" stroke="${C.accent}" stroke-width="5"
    stroke-linejoin="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
${svgClose}
${plaque(id)}`;

  // Edges that cross the crack snap open. Measured against the crack's x band
  // rather than guessed: an edge counts as crossing when its two nodes sit on
  // opposite sides of x=485.
  const crossing = EDGES
    .map(([a, b], i) => ({ a, b, i }))
    .filter(({ a, b }) => (NODES[a][0] - 485) * (NODES[b][0] - 485) < 0);
  const snapJs = crossing.map(({ i }) =>
    `tl.to(["#${id}-e${i}a", "#${id}-e${i}b"], { strokeDashoffset: 0.30, stroke: "${dimArt}",
    duration: 0.50, ease: "power2.out" }, ${(3.7 + (i % 3) * 0.12).toFixed(2)});`).join("\n");

  const js = `
${copyIn(id)}
// Present on frame 0. A segment hard-cuts in, and an empty first frame at a
// part boundary reads as a dropped frame on a muted autoplay loop.
tl.fromTo("#${id}-half0", { scale: 0.97, svgOrigin: "480 300", opacity: 1 },
  { scale: 1, svgOrigin: "480 300", opacity: 1, duration: 0.55, ease: "power2.out" }, 0);
tl.fromTo("#${id}-src", { scale: 0.94, svgOrigin: "480 290", opacity: 1 },
  { scale: 1, svgOrigin: "480 290", opacity: 1, duration: 0.55, ease: "power2.out" }, 0);
// The accent starts on the node that is about to split.
tl.to("#${id}-src rect", { stroke: "${C.accent}", fill: "${C.accentSoft}", duration: 0.55,
  ease: "power2.inOut" }, 0.90);
// The split: one node becomes two, separating diagonally.
tl.to("#${id}-src", { opacity: 0, duration: 0.22, ease: "power2.in" }, 1.80);
tl.fromTo("#${id}-c0", { opacity: 0, x: 150, y: 74, scale: 0.8, svgOrigin: "280 190" },
  { opacity: 1, x: 0, y: 0, scale: 1, svgOrigin: "280 190", duration: 0.70, ease: "power3.out" }, 1.96);
tl.fromTo("#${id}-c1", { opacity: 0, x: -150, y: -74, scale: 0.8, svgOrigin: "690 410" },
  { opacity: 1, x: 0, y: 0, scale: 1, svgOrigin: "690 410", duration: 0.70, ease: "power3.out" }, 1.96);
// Accent hands off from the node to the fracture: one accent at a time.
tl.fromTo("#${id}-crack", { strokeDashoffset: 1, opacity: 1 },
  { strokeDashoffset: 0, opacity: 1, duration: 0.80, ease: "power2.inOut" }, 2.80);
${snapJs}
// Both halves drift apart and keep moving to the end. Nothing freezes.
tl.fromTo("#${id}-c0", { x: 0 }, { x: -28, duration: 0.90, ease: "power2.out" }, 3.70);
tl.fromTo("#${id}-c1", { x: 0 }, { x: 28, duration: 0.90, ease: "power2.out" }, 3.70);
${breathe(`#${id}-half0`, -2.0, 2.0, 1.1, 4.8, D, "rotation", 'svgOrigin: "480 300"')}
${breathe(`#${id}-c0`, 0, -14, 1.0, 4.8, D, "y")}
${breathe(`#${id}-c1`, 0, 14, 1.0, 4.8, D, "y")}
${drift(`#${id}-svg`, D, 1.02)}
`;
  assertInside(id, [box("plaque", PLAQUE_X, PLAQUE_Y, PLAQUE_X + PLAQUE_W, plaqueBottom(id))]);
  assertClear(id, [box("child0", 130, 120, 430, 260), box("child1", 540, 340, 840, 480)], 6);
  emit(id, D, body, js);
}

// ===========================================================================
// g006 - analogy, built in MOVEMENTS. Movement one establishes the thing (the
// big graph); movement two changes it (one small file per team). The four teams
// are deliberately g004's four teams, so the geometry pays off rather than
// introducing a new cast in the last six seconds.
// ===========================================================================
function g006() {
  const id = "g006", D = dur(id);
  const g = graphSVG(id, { drawn: true });
  const CW = 200, CH = 250, GAP = 45;
  const X0 = (ART_W - (4 * CW + 3 * GAP)) / 2;                 // 12.5
  const cx = (i) => X0 + i * (CW + GAP) + CW / 2;
  const CY = 250;

  const cards = TEAMS.map((t, i) => {
    const x = cx(i) - CW / 2;
    const rules = [0, 1, 2].map(r =>
      `<line x1="${x + 26}" y1="${CY + 118 + r * 30}" x2="${x + CW - (r === 2 ? 70 : 26)}"
        y2="${CY + 118 + r * 30}" stroke="${dimArt}" stroke-width="4" stroke-linecap="round"/>`).join("");
    return `<g id="${id}-f${i}" opacity="0">
    <path d="M ${x} ${CY} L ${x + CW - 42} ${CY} L ${x + CW} ${CY + 42} L ${x + CW} ${CY + CH}
      L ${x} ${CY + CH} Z" fill="${C.bg}" stroke="${fgArt}" stroke-width="3"
      stroke-linejoin="round"/>
    <path d="M ${x + CW - 42} ${CY} L ${x + CW - 42} ${CY + 42} L ${x + CW} ${CY + 42}"
      fill="none" stroke="${fgArt}" stroke-width="3" stroke-linejoin="round"/>
    <rect x="${x + 26}" y="${CY + 62}" width="${CW - 90}" height="14" rx="3" fill="${fgArt}"/>
    ${rules}
    <text x="${cx(i)}" y="${CY + CH + 46}" text-anchor="middle" fill="${dimArt}"
      font-family="SatoshiBold" font-size="32" letter-spacing="2.2">${t}</text>
  </g>`;
  }).join("\n");

  const body = `
${svgOpen(id + "-svg")}
  <g id="${id}-graph">
${g.edges}
${g.nodes}
  </g>
${cards}
  <circle id="${id}-dot" cx="480" cy="90" r="13" fill="${C.accent}" opacity="0"/>
  <line id="${id}-under" x1="${X0}" y1="${CY + CH + 78}" x2="${ART_W - X0}" y2="${CY + CH + 78}"
    stroke="${C.accent}" stroke-width="4" stroke-linecap="round" pathLength="1"
    stroke-dasharray="1" stroke-dashoffset="1"/>
${svgClose}
${plaque(id)}`;

  // The single accent travels: it leaves the collapsed graph, visits each card in
  // turn, then SETTLES into the underline. One element throughout.
  const legs = TEAMS.map((t, i) => {
    const t0 = 1.65 + i * 0.40;
    return `tl.to("#${id}-dot", { attr: { cx: ${cx(i).toFixed(1)}, cy: ${CY + 30} },
    duration: 0.35, ease: "power2.inOut" }, ${t0.toFixed(2)});
tl.fromTo("#${id}-f${i}", { opacity: 0, scale: 0.8, y: 20, svgOrigin: "${cx(i).toFixed(1)} ${CY + CH / 2}" },
  { opacity: 1, scale: 1, y: 0, svgOrigin: "${cx(i).toFixed(1)} ${CY + CH / 2}",
    duration: 0.35, ease: "back.out(2)" }, ${(t0 + 0.30).toFixed(2)});`;
  }).join("\n");

  const breatheJs = TEAMS.map((t, i) =>
    breathe(`#${id}-f${i}`, 1.0, 1.045, 0.8, 3.7 + i * 0.12, D, "scale",
            `svgOrigin: "${cx(i).toFixed(1)} ${CY + CH / 2}"`)).join("\n");

  const js = `
${copyIn(id)}
// Movement one: the big graph shrinks and migrates to a small glyph.
tl.fromTo("#${id}-graph", { scale: 1, svgOrigin: "480 300", opacity: 1 },
  { scale: 0.40, svgOrigin: "480 300", opacity: 1, duration: 1.20, ease: "power2.inOut" }, 0.40);
tl.to("#${id}-graph", { y: -185, duration: 1.20, ease: "power2.inOut" }, 0.40);
// Movement two: one small file per team, each landing as the accent arrives.
tl.fromTo("#${id}-dot", { opacity: 0 }, { opacity: 1, duration: 0.22 }, 1.55);
${legs}
// The accent settles as the underline: the same element, transformed.
tl.to("#${id}-dot", { opacity: 0, duration: 0.25 }, 3.30);
tl.fromTo("#${id}-under", { strokeDashoffset: 1, opacity: 1 },
  { strokeDashoffset: 0, opacity: 1, duration: 0.40, ease: "power2.out" }, 3.30);
${breatheJs}
${breathe(`#${id}-under`, 0.7, 1.0, 0.7, 3.8, D, "opacity")}
${drift(`#${id}-svg`, D, 1.012)}
`;
  assertInside(id, [box("plaque", PLAQUE_X, PLAQUE_Y, PLAQUE_X + PLAQUE_W, plaqueBottom(id))]);
  assertInside(id, [box("cards", ART_X + X0, ART_Y + CY, ART_X + ART_W - X0, ART_Y + CY + CH + 60)]);
  emit(id, D, body, js);
}

// ===========================================================================
// g007 - END CARD. Callback to g001's type treatment: same plaque, same two-line
// Black headline, same accent rule. Text is END_TEXT, one line at the top of
// this file. The final frame HOLDS for 1.00s, which is the one place the piece
// deliberately stops moving.
// ===========================================================================
function g007() {
  const id = "g007", D = dur(id), HOLD = 1.0;
  const g = graphSVG(id, { drawn: true, sw: 6 });
  const CW = 200, CH = 250, GAP = 45;
  const X0 = (ART_W - (4 * CW + 3 * GAP)) / 2;
  const cx = (i) => X0 + i * (CW + GAP) + CW / 2;

  // The four team files hold small at the top; the graph sits faint beneath them,
  // a shared thing with nobody's name on it.
  const files = TEAMS.map((t, i) => {
    const x = cx(i) - 70, y = 300, w = 140, h = 175;
    return `<g>
    <path d="M ${x} ${y} L ${x + w - 30} ${y} L ${x + w} ${y + 30} L ${x + w} ${y + h}
      L ${x} ${y + h} Z" fill="${C.bg}" stroke="${fgArt}" stroke-width="3" stroke-linejoin="round"/>
    <rect x="${x + 18}" y="${y + 44}" width="${w - 62}" height="10" rx="2" fill="${fgArt}"/>
    <line x1="${x + 18}" y1="${y + 78}" x2="${x + w - 18}" y2="${y + 78}" stroke="${dimArt}" stroke-width="3"/>
    <line x1="${x + 18}" y1="${y + 102}" x2="${x + w - 40}" y2="${y + 102}" stroke="${dimArt}" stroke-width="3"/>
    <text x="${cx(i)}" y="${y + h + 34}" text-anchor="middle" fill="${dimArt}"
      font-family="SatoshiBold" font-size="30" letter-spacing="2.2">${t}</text>
  </g>`;
  }).join("\n");

  const body = `
${svgOpen(id + "-svg")}
  <g id="${id}-graphwrap" transform="translate(288,18) scale(0.4)">
  <g id="${id}-graph" opacity="0.3">
${g.edges}
${g.nodes}
  </g>
  </g>
  <g id="${id}-files">
${files}
  </g>
${svgClose}
${plaque(id)}`;

  const js = `
${wipe(`#${id}-l1`, COPY[id].hl[1], 0.35, 0.34)}
${ruleIn(id, 0.30)}
tl.fromTo("#${id}-files", { y: -18, opacity: 1 },
  { y: 0, opacity: 1, duration: 0.45, ease: "power2.out" }, 0);
tl.fromTo("#${id}-graph", { opacity: 0.12 }, { opacity: 0.3, duration: 0.60 }, 0);
// Continuous motion until the hold, then the frame stops for exactly 1.00s.
tl.fromTo("#${id}-svg", { scale: 1, transformOrigin: "50% 50%" },
  { scale: 1.02, transformOrigin: "50% 50%", duration: ${(D - HOLD - 0.8).toFixed(2)},
    ease: "power1.inOut" }, 0.80);
// Motion that is actually visible at feed size, right up to the hold: the
// unowned graph turns slowly and the four files bob. A 1.00->1.02 scale over a
// whole field is ~0.01px per frame and contributes nothing.
${breathe(`#${id}-graph`, 0, 3.2, 1.05, 0.9, D - HOLD, "rotation", 'svgOrigin: "480 300"')}
${breathe(`#${id}-files`, 0, -13, 0.7, 0.9, D - HOLD, "y")}
${breathe(`#${id}-rule`, 1.0, 0.75, 0.7, 0.9, D - HOLD, "opacity")}
// Hard kill at the hold boundary. Every tween above ENDS on or before this
// position by construction, and these pin the final state so the last 30 frames
// are bit-identical.
tl.set("#${id}-svg", { scale: 1.02, transformOrigin: "50% 50%" }, ${(D - HOLD).toFixed(2)});
tl.set("#${id}-graph", { rotation: 0, svgOrigin: "480 300" }, ${(D - HOLD).toFixed(2)});
tl.set("#${id}-files", { y: 0 }, ${(D - HOLD).toFixed(2)});
tl.set("#${id}-rule", { opacity: 1, scaleX: 1, transformOrigin: "left center" }, ${(D - HOLD).toFixed(2)});
tl.set("#${id}-plaque", { opacity: 1 }, ${(D - HOLD).toFixed(2)});
`;
  assertInside(id, [box("plaque", PLAQUE_X, PLAQUE_Y, PLAQUE_X + PLAQUE_W, plaqueBottom(id))]);
  emit(id, D, body, js);
}

// ===========================================================================
const COPY_ONLY = process.argv.includes("--copy-only");

if (COPY_ONLY) {
  const out = { parts: {}, labels: LABELS, endText: END_TEXT,
                safeWidth: SAFE_X1 - SAFE_X0, floors: { hook: 88, body: 56 },
                floorExceptions: { g001: { px: HOOK_PX, floor: 88,
                  why: "MEASURED: the best two-line split of the hook line is 925px at 88px "
                     + "against an 860px text column; every other split is worse (59.2px, 61.0px). "
                     + "80px is the largest size that fits. Reported, never silently taken." } } };
  for (const [id, c] of Object.entries(COPY)) {
    const p = part(id);
    out.parts[id] = { start: p.start, end: p.end, eyebrow: c.eyebrow || null,
                      eyebrowPx: c.eyebrow ? EYEBROW_PX : null,
                      lines: c.hl, px: c.px, support: c.sup || null,
                      supportPx: c.sup ? c.supPx : null,
                      plaqueBottom: +plaqueBottom(id).toFixed(1), plaqueMax: PLAQUE_MAX_Y };
  }
  writeFileSync("copy.json", JSON.stringify(out, null, 2) + "\n");
  console.log("wrote copy.json");
} else {
  g001(); g002(); g003(); g004(); g005(); g006(); g007();
  console.log("all parts emitted");
}
