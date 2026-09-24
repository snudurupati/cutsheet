// v2. Generate one HyperFrames project per beat.
//
//   node build.mjs --copy-only   -> copy.json
//   python3 check_copy.py        -> exact PIL widths against the real text column
//   python3 make_text_track.py   -> outputs/transcript-cut.json
//   python3 validate_cutsheet.py -> the plan gate
//   node build.mjs               -> parts/g00*/index.html
import { writeFileSync } from "node:fs";
import {
  C, ART_X, ART_Y, ART_W, ART_H, PLAQUE_X, PLAQUE_W, BAND_TOP, SHADOW_TAIL,
  HOOK_PX, BODY_PX, END_PX2, CTA_PX, PLAQUE_DIM, emit, dur, part,
  box, assertClear, assertInside, cycles,
} from "./lib.mjs";
import { container, card, docu, arrow, curve, lane, gate, node, edge, dot, tw, PAD } from "./art.mjs";

// ===========================================================================
// COPY. The CTA is a single editable constant, as the brief requires.
// ===========================================================================
const CTA = "Full argument in the post.";
const QUESTION = "What counts as revenue?";

const COPY = {
  g001: { px: HOOK_PX, stmts: [["Enterprise knowledge", "graphs can't work?"],
                               ["One graph.", "The whole enterprise."]] },
  g002: { px: BODY_PX, stmts: [["The technology can work."], ["The demo is the easy part."]] },
  g003: { px: BODY_PX, stmts: [["Then the business changes."],
                               ["The update waits", "for approval."],
                               ["AI keeps using", "the old definition."]] },
  g004: { px: BODY_PX, stmts: [["Everyone benefits."], ["Who owns the upkeep?"],
                               ["And whose budget pays?"]] },
  g005: { px: BODY_PX, stmts: [["Let AI update the graph?"], ["Who verifies its changes?"]] },
  g006: { px: BODY_PX, stmts: [["Different teams need", "different definitions."]] },
  g007: { px: BODY_PX, stmts: [["What worked", "in my project:"],
                               ["Team-owned context", "in markdown."],
                               ["Definitions. Requirements.", "Named owners."]] },
  g008: { px: END_PX2, stmts: [["Start with context", "a team can own."]], cta: CTA },
};

// Statement onsets, local to each beat. Single source: the swaps below and the
// readable intervals in copy.json both come from here. Splitting a beat evenly
// to estimate reading time was a guess, and it reported g008 at 3.54 w/s when
// its primary is on screen for the whole 4s including the hold.
const SCHED = {
  g001: [0.00, 2.40], g002: [0.00, 3.00], g003: [0.00, 3.20, 6.40],
  g004: [0.00, 2.40, 5.00], g005: [0.00, 4.00], g006: [0.00],
  g007: [0.00, 3.00, 6.50], g008: [0.00],
};
const CTA_AT = 1.78;   // additive, not a replacement: the primary stays on screen

const TEAMS = ["IT", "SALES", "FINANCE", "MARKETING"];
const LABELS = {
  g001: [[QUESTION, 36], ...TEAMS.map(t => [t, 32])],
  g002: [[QUESTION, 36], ["REVENUE", 38], ["Definition", 34], ["APPROVED", 34],
         ["AI ANSWER", 38], ["v1 CURRENT", 34]],
  g003: [["APPROVAL QUEUE", 34], ["PROPOSED", 34], ["WAITING", 34], ["v1 OUTDATED", 34]],
  g004: [["MAINTENANCE TASK", 34], ["Owner", 34], ["Budget", 34], ...TEAMS.map(t => [t, 32])],
  g005: [["AI AGENT", 38], ["VERIFY?", 34], ["PROPOSED", 34]],
  g006: [[QUESTION, 36], ["REVENUE", 38], ["Scope", 34], ["Marketing", 34], ["Sales", 34]],
  g007: [["Definition", 34], ["Scope", 34], ["Owner", 34], ["AI WORKFLOW", 34],
         ["CURRENT", 34], ...TEAMS.map(t => [t, 32])],
  g008: [...TEAMS.map(t => [t, 32]), ["Owner", 34]],
};

// ===========================================================================
// The plaque. Statements are absolutely positioned on top of each other and
// exactly one is visible at a time, so the box never resizes and sequential
// copy is never stacked. Height is fixed by the TALLEST statement.
// ===========================================================================
const plaqueH = (id) => {
  const c = COPY[id];
  const maxLines = Math.max(...c.stmts.map(s => s.length));
  let h = 40 + 40 + maxLines * c.px * 1.05;
  if (c.cta) h += 18 + 3 + 16 + CTA_PX * 1.3;
  return h + 12;
};
const PLAQUE_BASE = BAND_TOP - SHADOW_TAIL - 7;          // 1175
const plaqueTop = (id) => PLAQUE_BASE - plaqueH(id);

const plaque = (id) => {
  const c = COPY[id];
  const stmts = c.stmts.map((lines, i) => {
    const body = lines.map((t, j) =>
      `<div class="hl" id="${id}-s${i}l${j}" style="font-size:${c.px}px">${t}</div>`).join("\n    ");
    return `  <div class="stmt" id="${id}-s${i}"${i ? ' style="opacity:0"' : ""}>
    ${body}
  </div>`;
  }).join("\n");
  const maxLines = Math.max(...c.stmts.map(s => s.length));
  const ctaTop = 40 + maxLines * c.px * 1.05 + 18;
  const cta = c.cta
    ? `  <div class="arule" id="${id}-rule" style="position:absolute;left:44px;
       top:${ctaTop.toFixed(0)}px;width:${PLAQUE_W - 88}px"></div>
  <div class="cta" id="${id}-cta" style="position:absolute;left:44px;
       top:${(ctaTop + 19).toFixed(0)}px;font-size:${CTA_PX}px;opacity:0">${c.cta}</div>`
    : "";
  return `<div class="plaque killable" id="${id}-plaque" style="top:${plaqueTop(id).toFixed(0)}px;
     height:${plaqueH(id).toFixed(0)}px">
${stmts}
${cta}
</div>`;
};

// Swap statement i-1 out and i in. A real duration, never an instant change:
// near-zero-duration tweens are unreliable and 0.2s still reads as a cut.
const swap = (id, i, at) => `
tl.to("#${id}-s${i - 1}", { opacity: 0, duration: 0.22, ease: "power2.in" }, ${at.toFixed(2)});
tl.fromTo("#${id}-s${i}", { opacity: 0, y: 14 },
  { opacity: 1, y: 0, duration: 0.30, ease: "power2.out" }, ${(at + 0.20).toFixed(2)});`;

const svg = (id) =>
  `<svg id="${id}-svg" style="position:absolute;left:${ART_X}px;top:${ART_Y}px;
     width:${ART_W}px;height:${ART_H}px" viewBox="0 0 ${ART_W} ${ART_H}"
     xmlns="http://www.w3.org/2000/svg">`;

const svgClose = () => "</svg>";

const draw = (sel, at, d = 0.6) =>
  `tl.fromTo("${sel}", { strokeDashoffset: 1, opacity: 1 },
  { strokeDashoffset: 0, opacity: 1, duration: ${d.toFixed(2)}, ease: "power2.inOut" }, ${at.toFixed(2)});`;
const appear = (sel, at, d = 0.35, from = "scale") =>
  `tl.fromTo("${sel}", { opacity: 0, ${from}: 0.88, transformOrigin: "50% 50%" },
  { opacity: 1, ${from}: 1, transformOrigin: "50% 50%", duration: ${d.toFixed(2)}, ease: "back.out(1.8)" }, ${at.toFixed(2)});`;
const fade = (sel, at, d = 0.35, to = 1) =>
  `tl.fromTo("${sel}", { opacity: 0 }, { opacity: ${to}, duration: ${d.toFixed(2)} }, ${at.toFixed(2)});`;
const headIn = (sel, at) => `tl.fromTo("${sel}", { opacity: 0 }, { opacity: 1, duration: 0.22 }, ${at.toFixed(2)});`;
const moveTo = (sel, x, y, at, d = 0.6) =>
  `tl.to("${sel}", { x: ${x}, y: ${y}, duration: ${d.toFixed(2)}, ease: "power2.inOut" }, ${at.toFixed(2)});`;

// Four team containers, the same geometry in every beat that uses them.
const BOXES = [[20, 30, 440, 240], [500, 30, 440, 240], [20, 320, 440, 240], [500, 320, 440, 240]];
// g001 alone drops the grid to make room for the question card above it.
const BOXES1 = [[20, 130, 440, 225], [500, 130, 440, 225], [20, 365, 440, 225], [500, 365, 440, 225]];
const containers = (id) => BOXES.map((b, i) => container(`${id}-c${i}`, ...b, TEAMS[i])).join("\n");

// ===========================================================================
// g001 · 0-5 · Hook and immediate scope
// Frame 1 is the thumbnail: copy complete, containers and nodes already drawn.
// The only thing that animates in is the set of edges that CROSS container
// boundaries, because that is the one fact that makes this a single enterprise
// graph rather than four team graphs.
// ===========================================================================
const NODES = [[130,250],[340,205],[620,205],[830,250],[130,490],[340,530],[620,530],[830,490]];
const INNER = [[0,1],[2,3],[4,5],[6,7]];
const CROSS = [[1,2],[1,5],[3,7],[5,6],[0,4],[2,5]];

function g001() {
  const id = "g001", D = dur(id);
  const inner = INNER.map(([a,b],i)=>edge(`${id}-i${i}`,...NODES[a],...NODES[b],{drawn:true})).join("\n");
  const PREDRAWN = [0, 2, 4];   // authored connected on frame 0
  const cross = CROSS.map(([a, b], i) =>
    edge(`${id}-x${i}`, ...NODES[a], ...NODES[b],
         { width: 4, drawn: PREDRAWN.includes(i) })).join("\n");
  const nodes = NODES.map((p,i)=>node(`${id}-n${i}`,...p)).join("\n");
  const body = `
${svg(id)}
${BOXES1.map((bx, i) => container(`${id}-c${i}`, ...bx, TEAMS[i])).join("\n")}
${cross}
${inner}
${nodes}
  <g id="${id}-q" opacity="0">
    ${card(`${id}-qc`, QX, 0, QW, QH, { title: QUESTION, titlePx: 36 })}
  </g>
${svgClose()}
${plaque(id)}`;
  const js = `
${CROSS.map((_, i) => PREDRAWN.includes(i) ? "" : draw(`#${id}-x${i}`, 0.20 + i * 0.30, 0.80)).filter(Boolean).join("\n")}
${swap(id, 1, SCHED[id][1])}
${appear(`#${id}-q`, 2.80, 0.40)}
// 3.60-5.00 still. Declared in the cut sheet; nothing is scheduled past here.
`;
  assertInside(id, [box("plaque", PLAQUE_X, plaqueTop(id), PLAQUE_X + PLAQUE_W, PLAQUE_BASE)]);
  // The question card must clear every container label chip, which is what it
  // failed at before: MARKETING was hidden behind it at phone size.
  assertClear(id, [box("question", QX, 0, QX + QW, QH),
    ...BOXES1.map((bx, i) => box(TEAMS[i] + " label", bx[0] + 16, bx[1] - 2,
      bx[0] + 16 + 200, bx[1] + 36))], 6);
  emit(id, D, body, js);
}

// ===========================================================================
// g002 · 5-11 · Concede the technical value
// Three cards in a chain, deliberately NOT a node network. One accent dot
// travels the whole grounding path, then the answer resolves.
// ===========================================================================
const QX = 220, QW = 520, QY = 10, QH = 100;
const DEFX = 190, DEFW = 580, DEFY = 190, DEFH = 170;
const ANSX = 190, ANSW = 580, ANSY = 420, ANSH = 160;

const defCard = (id, o = {}) => card(id, DEFX, DEFY, DEFW, DEFH, {
  title: "REVENUE", titlePx: 38, state: o.state || "approved",
  fields: [{ label: "Definition" }], fieldTop: 96,
  badge: o.badge || "APPROVED", badgeDim: o.badgeDim });
const ansCard = (id, o = {}) => card(id, ANSX, ANSY, ANSW, ANSH, {
  title: "AI ANSWER", titlePx: 38, state: "plain",
  fields: o.empty ? [] : [{ label: "Answer" }], fieldTop: 96,
  badge: o.badge, badgeDim: o.badgeDim, flag: o.flag });

function g002() {
  const id = "g002", D = dur(id);
  const body = `
${svg(id)}
  ${card(`${id}-q`, QX, QY, QW, QH, { title: QUESTION, titlePx: 36 })}
  ${arrow(`${id}-a1`, 480, QY + QH, 480, DEFY, { width: 5 })}
  ${defCard(`${id}-def`)}
  ${arrow(`${id}-a2`, 480, DEFY + DEFH, 480, ANSY, { width: 5 })}
  <g id="${id}-ansempty">${ansCard(`${id}-ae`, { empty: true })}</g>
  <g id="${id}-ansfull" opacity="0">${ansCard(`${id}-af`, { badge: "v1 CURRENT" })}</g>
  ${dot(`${id}-d`, 480, QY + QH)}
${svgClose()}
${plaque(id)}`;
  const js = `
${draw(`#${id}-a1-l`, 0.30, 0.55)}
${headIn(`#${id}-a1-h`, 0.85)}
${draw(`#${id}-a2-l`, 1.20, 0.55)}
${headIn(`#${id}-a2-h`, 1.75)}
${fade(`#${id}-d`, 2.10, 0.20)}
tl.to("#${id}-d", { y: ${ANSY - QY - QH}, duration: 0.45, ease: "power2.inOut" }, 2.15);
tl.to("#${id}-d", { opacity: 0, duration: 0.20 }, 2.58);
${fade(`#${id}-ansfull`, 2.62, 0.30)}
tl.to("#${id}-ansempty", { opacity: 0, duration: 0.30 }, 2.62);
${swap(id, 1, SCHED[id][1])}
// 2.95-6.00 still on the diagram; only the copy swaps at 3.00.
`;
  assertInside(id, [box("plaque", PLAQUE_X, plaqueTop(id), PLAQUE_X + PLAQUE_W, PLAQUE_BASE)]);
  emit(id, D, body, js);
}

// ===========================================================================
// g003 · 11-21 · The maintenance bottleneck
// The g002 chain persists. A proposed change enters an approval queue and STOPS
// there; a new question then follows the unchanged path to the OLD definition,
// and the answer is flagged outdated. Change, delay, stale answer, in that order.
// ===========================================================================
function g003() {
  const id = "g003", D = dur(id);
  const PX = 640, PY = DEFY, PW = 290, PH = DEFH;
  const OUTW = Math.ceil(tw("v1 OUTDATED", 34, "bold", 1.6)) + 28;          // proposed card, off to the right
  const LX = 620, LY = DEFY - 20, LW = 330, LH = DEFH + 92;          // approval queue lane
  const body = `
${svg(id)}
  ${lane(`${id}-lane`, LX, LY, LW, LH, "APPROVAL QUEUE")}
  ${card(`${id}-q`, QX, QY, QW, QH, { title: QUESTION, titlePx: 36 })}
  ${arrow(`${id}-a1`, 480, QY + QH, 480, DEFY, { width: 5, color: "${C.ink}" })}
  ${card(`${id}-def`, 60, DEFY, 480, DEFH, { title: "REVENUE", titlePx: 38,
      state: "approved", fields: [{ label: "Definition" }], fieldTop: 96, badge: "APPROVED" })}
  ${arrow(`${id}-a2`, 300, DEFY + DEFH, 300, ANSY, { width: 5 })}
  ${card(`${id}-ans`, 60, ANSY, 480, ANSH, { title: "AI ANSWER", titlePx: 38,
      state: "plain", fields: [{ label: "Answer" }], fieldTop: 96, badge: "v1 CURRENT" })}
  <g id="${id}-flagwrap" opacity="0">
    <path d="M 540 ${ANSY} L 540 ${ANSY + 46} L 494 ${ANSY} Z" fill="${C.muted}"/>
  </g>
  <g id="${id}-out" opacity="0">
    <rect x="${60 + 480 - 16 - OUTW}" y="${ANSY + ANSH - 56}" width="${OUTW}" height="44" rx="4"
      fill="${C.bg}" stroke="${C.muted}" stroke-width="3"/>
    <text x="${60 + 480 - 16 - OUTW / 2}" y="${ANSY + ANSH - 24}" text-anchor="middle" fill="${C.muted}"
      font-family="SatoshiBold" font-size="34" letter-spacing="1.6">v1 OUTDATED</text>
  </g>
  <g id="${id}-prop" opacity="0">
    ${card(`${id}-pc`, PX, PY, PW, PH, { title: "REVENUE", titlePx: 32, state: "proposed",
        badge: "PROPOSED" })}
  </g>
  <g id="${id}-wait" opacity="0">
    <text x="${LX + LW / 2}" y="${LY + LH - 22}" text-anchor="middle" fill="${C.muted}"
      font-family="SatoshiBold" font-size="34" letter-spacing="2">WAITING</text>
  </g>
  <g id="${id}-q2" opacity="0">
    ${card(`${id}-q2c`, QX, QY, QW, QH, { title: QUESTION, titlePx: 36 })}
  </g>
  ${dot(`${id}-d`, 480, QY + QH, 14)}
${svgClose()}
${plaque(id)}`;
  const js = `
tl.set("#${id}-a1-h", { opacity: 1 }, 0);
tl.set("#${id}-a2-h", { opacity: 1 }, 0);
tl.set(["#${id}-a1-l", "#${id}-a2-l"], { strokeDashoffset: 0 }, 0);
// The change arrives from the business side.
tl.fromTo("#${id}-prop", { opacity: 0, x: 180 },
  { opacity: 1, x: 0, duration: 0.70, ease: "power2.out" }, 0.40);
// It enters the queue and STOPS. Nothing about the approved path moves.
tl.to("#${id}-prop", { x: ${LX - PX + 15}, y: ${LY - PY + 18}, duration: 0.70,
  ease: "power2.inOut" }, 1.60);
${fade(`#${id}-wait`, 3.30, 0.35)}
${swap(id, 1, SCHED[id][1])}
// 4.10-6.50 still: the queue is the point, and it is not doing anything.
${swap(id, 2, SCHED[id][2])}
// A NEW question follows the unchanged path to the OLD definition.
tl.to("#${id}-q", { opacity: 0, duration: 0.28, ease: "power2.in" }, 6.50);
tl.fromTo("#${id}-q2", { opacity: 0, y: -70 },
  { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" }, 6.58);
${fade(`#${id}-d`, 6.90, 0.18)}
tl.to("#${id}-d", { x: -180, y: ${DEFY - QY - QH + 40}, duration: 0.40, ease: "power2.inOut" }, 6.95);
tl.to("#${id}-d", { x: -180, y: ${ANSY - QY - QH + 40}, duration: 0.40, ease: "power2.inOut" }, 7.40);
tl.to("#${id}-d", { opacity: 0, duration: 0.18 }, 7.78);
${fade(`#${id}-flagwrap`, 7.80, 0.30)}
tl.to("#${id}-ans-badge", { opacity: 0, duration: 0.25 }, 7.88);
${fade(`#${id}-out`, 8.16, 0.28)}
// 8.40-10.00 still.
`;
  assertInside(id, [box("plaque", PLAQUE_X, plaqueTop(id), PLAQUE_X + PLAQUE_W, PLAQUE_BASE)]);
  assertClear(id, [box("def", 60, DEFY, 540, DEFY + DEFH), box("lane", LX, LY, LX + LW, LY + LH)], 8);
  emit(id, D, body, js);
}

// ===========================================================================
// g004 · 21-29 · Who owns the upkeep?
// The same pending card becomes a maintenance task with two visibly EMPTY
// fields, and it travels the four teams without either field ever filling.
// An ownership gap, not departments behaving badly.
// ===========================================================================
function g004() {
  const id = "g004", D = dur(id);
  // No hub graph and no radiating arrows. The enterprise graph from g001 already
  // SPANS all four containers, so "everyone benefits" is true on the face of the
  // picture and needs no arrows to say it. A scaled-down copy at the centre came
  // out as a knot with the arrows crossing through it.
  const TW = 400, TH = 170;
  // It rests ACROSS the boundary between two containers, which is what "nobody
  // took it" looks like. Centring it vertically put it on the MARKETING label.
  const RX = 480 - TW / 2, RY = 170;
  const STOPS = [[-240, -14], [240, -14], [-240, 221], [240, 221]];
  const body = `
${svg(id)}
${BOXES1.map((bx, i) => container(`${id}-c${i}`, ...bx, TEAMS[i])).join("\n")}
  <g id="${id}-graph" opacity="0.55">
${INNER.map(([a, c], i) => edge(`${id}-i${i}`, ...NODES[a], ...NODES[c], { drawn: true, color: C.rule, width: 4 })).join("\n")}
${CROSS.map(([a, c], i) => edge(`${id}-x${i}`, ...NODES[a], ...NODES[c], { drawn: true, color: C.rule, width: 4 })).join("\n")}
${NODES.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="16" fill="${C.bg}" stroke="${C.rule}" stroke-width="4"/>`).join("\n")}
  </g>
  <g id="${id}-task" opacity="0">
    ${card(`${id}-tc`, RX, RY, TW, TH, { title: "MAINTENANCE TASK", titlePx: 30,
        state: "proposed", fieldTop: 96, fieldPx: 34, fieldGap: 58,
        fields: [{ label: "Owner", empty: true }, { label: "Budget", empty: true }] })}
  </g>
${svgClose()}
${plaque(id)}`;
  const hops = STOPS.map(([x, y], i) =>
    `tl.to("#${id}-task", { x: ${x}, y: ${y}, duration: 0.42, ease: "power2.inOut" }, ${(3.20 + i * 0.90).toFixed(2)});`
  ).join("\n");
  const js = `
${swap(id, 1, SCHED[id][1])}
${appear(`#${id}-task`, 2.30, 0.45)}
${hops}
// Back to the centre with BOTH fields still empty. That is the whole beat.
tl.to("#${id}-task", { x: 0, y: 0, duration: 0.42, ease: "power2.inOut" }, 6.80);
${swap(id, 2, SCHED[id][2])}
// 7.20-8.00 still.
`;
  assertInside(id, [box("plaque", PLAQUE_X, plaqueTop(id), PLAQUE_X + PLAQUE_W, PLAQUE_BASE)]);
  // Every stop must sit inside its container's BODY, clear of the label chip.
  // Every stop AND the resting position must clear every container label chip.
  // The resting position was not asserted before and it landed on MARKETING.
  const chips = BOXES1.map((bx, i) =>
    box(`${TEAMS[i]} label`, bx[0] + PAD, bx[1] - 19, bx[0] + PAD + 240, bx[1] + 19));
  [...STOPS, [0, 0]].forEach(([dx, dy], i) => {
    const where = i < STOPS.length ? `task@${TEAMS[i]}` : "task@rest";
    assertClear(id, [box(where, RX + dx, RY + dy, RX + dx + TW, RY + dy + TH), ...chips], 4);
  });
  emit(id, D, body, js);
}

// ===========================================================================
// g005 · 29-38 · Why not automate it?
// The agent's edit takes a shortcut AROUND the queue and stops at a gate. Then
// two arrows close the loop: the graph grounds the AI, and the AI is proposing
// changes to that grounding. A verification question, not a verdict.
// ===========================================================================
function g005() {
  const id = "g005", D = dur(id);
  const body = `
${svg(id)}
  ${lane(`${id}-lane`, 560, 270, 300, 170, "APPROVAL QUEUE")}
  <!-- Still waiting, carried over from g003. -->
  ${card(`${id}-queued`, 580, 290, 260, 130, { title: "REVENUE", titlePx: 30,
      state: "proposed", badge: "WAITING", badgeDim: true })}
  ${card(`${id}-def`, 40, 230, 400, 160, { title: "REVENUE", titlePx: 36, state: "approved",
      fields: [{ label: "Definition" }], fieldTop: 96, badge: "APPROVED" })}
  ${card(`${id}-ans`, 40, 430, 400, 120, { title: "AI ANSWER", titlePx: 34, state: "plain",
      fields: [{ label: "Answer" }], fieldTop: 92 })}
  <g id="${id}-agent" opacity="0">
    ${card(`${id}-ag`, 560, 20, 380, 110, { title: "AI AGENT", titlePx: 36, state: "plain" })}
  </g>
  <!-- The shortcut leaves the agent and curves LEFT, passing ABOVE the queue:
       it visibly goes around the approval step rather than through it. -->
  ${curve(`${id}-short`, "M 600 130 C 520 170, 400 182, 300 226",
      { width: 5, color: C.accent })}
  <g id="${id}-edit" opacity="0">
    ${card(`${id}-ec`, 545, 146, 215, 80, { title: "PROPOSED", titlePx: 30, state: "proposed" })}
  </g>
  ${gate(`${id}-gate`, 452, 120, 130, "VERIFY?")}
  <!-- The loop: the definition grounds the answer, the answer is the agent's,
       and the agent is editing the definition. -->
  ${arrow(`${id}-g2a`, 240, 390, 240, 430, { width: 5 })}
  ${curve(`${id}-back`, "M 440 505 C 700 575, 930 565, 924 138", { width: 4 })}
${svgClose()}
${plaque(id)}`;
  const js = `
${appear(`#${id}-agent`, 0.40, 0.45)}
${draw(`#${id}-short-l`, 1.40, 0.80)}
tl.fromTo("#${id}-edit", { opacity: 0, x: 150, y: -34 },
  { opacity: 1, x: 0, y: 0, duration: 0.85, ease: "power2.out" }, 1.90);
// The edit stops at the gate and stays there. It is not destroyed, it is unverified.
${draw(`#${id}-gate-l`, 2.60, 0.40)}
${fade(`#${id}-gate-t`, 2.95, 0.30)}
${swap(id, 1, SCHED[id][1])}
${draw(`#${id}-g2a-l`, 4.20, 0.45)}
${headIn(`#${id}-g2a-h`, 4.62)}
${draw(`#${id}-back-l`, 5.30, 0.95)}
// 6.30-9.00 still, the edit still paused at the gate.
`;
  assertInside(id, [box("plaque", PLAQUE_X, plaqueTop(id), PLAQUE_X + PLAQUE_W, PLAQUE_BASE)]);
  assertClear(id, [box("def", 40, 230, 440, 390), box("lane", 560, 270, 860, 440),
                   // The queue's own label is EXCLUDED from this assert, not
                   // given a looser tolerance: lane() always draws it attached
                   // just above the lane, so the pair is a deliberate adjacency
                   // and asserting on it only ever produces a false failure.
                   // What mattered was the PROPOSED card landing on it, and that
                   // is covered by the "edit" box below.
                   box("agent", 560, 20, 940, 130),
                   box("gate chip", 374, 161, 530, 209),
                   box("edit", 545, 146, 760, 226),
                   box("ans", 40, 430, 440, 550)], 4);
  emit(id, D, body, js);
}

// ===========================================================================
// g006 · 38-45 · The deeper mismatch
// The question returns and resolves into TWO scoped definitions, one per team
// container. Both solid, both valid. The graph is not shattered and neither
// definition is marked wrong: the single-source-of-truth premise is what fails.
// ===========================================================================
function g006() {
  const id = "g006", D = dur(id);
  const scoped = (n, x, y, scope) => card(n, x, y, 400, 170, {
    title: "REVENUE", titlePx: 36, state: "approved", fieldTop: 92, fieldPx: 30,
    fields: [{ label: "Definition" }, { label: "Scope", value: scope, bar: false }],
    fieldGap: 44 });
  const body = `
${svg(id)}
  ${container(`${id}-cm`, 20, 30, 440, 240, "MARKETING")}
  ${container(`${id}-cs`, 500, 320, 440, 240, "SALES")}
  <g id="${id}-q">
    ${card(`${id}-qc`, QX, 230, QW, QH, { title: QUESTION, titlePx: 36 })}
  </g>
  <g id="${id}-dm" opacity="0">${scoped(`${id}-dmc`, 40, 70, "Marketing")}</g>
  <g id="${id}-ds" opacity="0">${scoped(`${id}-dsc`, 520, 360, "Sales")}</g>
${svgClose()}
${plaque(id)}`;
  const js = `
${appear(`#${id}-q`, 0.00, 0.60)}
// The question does not vanish and get replaced; it RESOLVES into the two
// scoped answers, which travel out to the teams that hold them.
tl.to("#${id}-q", { opacity: 0, duration: 0.35, ease: "power2.in" }, 1.20);
tl.fromTo("#${id}-dm", { opacity: 0, x: 200, y: 140 },
  { opacity: 1, x: 0, y: 0, duration: 0.90, ease: "power3.out" }, 1.30);
tl.fromTo("#${id}-ds", { opacity: 0, x: -200, y: -140 },
  { opacity: 1, x: 0, y: 0, duration: 0.90, ease: "power3.out" }, 1.30);
// 3.40-7.00 still. Both hold, both valid.
`;
  assertInside(id, [box("plaque", PLAQUE_X, plaqueTop(id), PLAQUE_X + PLAQUE_W, PLAQUE_BASE)]);
  assertClear(id, [box("dm", 40, 70, 440, 240), box("ds", 520, 360, 920, 530)], 6);
  emit(id, D, body, js);
}

// ===========================================================================
// g007 · 45-56 · My practical alternative
// Built in movements. The scoped cards become documents inside their owning
// containers; the Sales team edits its own; its AI workflow reads the update.
// The change is in RESPONSIBILITY, not in file format.
// ===========================================================================
function g007() {
  const id = "g007", D = dur(id);
  // TWO documents, not four: the brief says to transform the two SCOPED cards
  // g006 just produced. Four docs plus a workflow card left no room, and the
  // container label chips collided with the documents. The full four-team
  // picture lands in g008, where it is the point.
  const DW = 400, DH = 230, DY = 70;
  const DEFW2 = Math.ceil(tw("Definition", 34, "bold", 1));
  const MX = 40, SX = 520;
  const rows = (team) => [{ k: "Definition" }, { k: "Scope", v: team }, { k: "Owner", v: team }];
  const body = `
${svg(id)}
  ${container(`${id}-cm`, 20, 20, 440, 450, "MARKETING")}
  ${container(`${id}-cs`, 500, 20, 440, 450, "SALES")}
  <g id="${id}-dm" opacity="0">
    ${docu(`${id}-ddm`, MX, DY, DW, DH, { title: "context.md", rows: rows("Marketing") })}
  </g>
  <g id="${id}-ds" opacity="0">
    ${docu(`${id}-dds`, SX, DY, DW, DH, { title: "context.md", rows: rows("Sales") })}
  </g>
  <g id="${id}-edit" opacity="0">
    <rect x="${SX + PAD + 4 + DEFW2}" y="${DY + 96 - 16}"
      width="${Math.max(40, DW - PAD * 2 - 4 - DEFW2)}" height="12" rx="3" fill="${C.accent}"/>
  </g>
  ${arrow(`${id}-flow`, SX + DW / 2, DY + DH + 8, SX + DW / 2, 330, { width: 5, color: C.accent })}
  <g id="${id}-wf" opacity="0">
    ${card(`${id}-wfc`, SX, 332, DW, 118, { title: "AI WORKFLOW", titlePx: 34,
        state: "plain", badge: "CURRENT" })}
  </g>
${svgClose()}
${plaque(id)}`;
  const js = `
// Movement one: the two scoped definitions from g006 become documents that live
// inside the teams that own them.
${appear(`#${id}-dm`, 0.40, 0.55)}
${appear(`#${id}-ds`, 0.85, 0.55)}
${swap(id, 1, SCHED[id][1])}
// Movement two: the team that USES the context edits it. The accent mark is the
// edit travelling its own definition line.
tl.fromTo("#${id}-edit", { opacity: 1, scaleX: 0, transformOrigin: "left center" },
  { opacity: 1, scaleX: 1, transformOrigin: "left center", duration: 0.80,
    ease: "power2.inOut" }, 4.20);
// ...and that team's own AI workflow reads the update. No committee in between.
${draw(`#${id}-flow-l`, 5.60, 0.45)}
${headIn(`#${id}-flow-h`, 6.02)}
${appear(`#${id}-wf`, 6.05, 0.45)}
${swap(id, 2, SCHED[id][2])}
// 6.60-11.00 still.
`;
  assertInside(id, [box("plaque", PLAQUE_X, plaqueTop(id), PLAQUE_X + PLAQUE_W, PLAQUE_BASE)]);
  assertClear(id, [box("docM", MX, DY, MX + DW, DY + DH),
                   box("docS", SX, DY, SX + DW, DY + DH),
                   box("wf", SX, 332, SX + DW, 450)], 6);
  emit(id, D, body, js);
}

// ===========================================================================
// g008 · 56-60 · Land the thesis and invite the read
// Four containers, each holding its document with its owner visible. The last
// 2.00s are HELD bit-identical, which is the brief's two-second hold.
// ===========================================================================
function g008() {
  const id = "g008", D = dur(id), HOLD = 2.0;
  const DW = 360, DH = 160;
  const DOCS = [[40, 80, "IT"], [520, 80, "SALES"], [40, 370, "FINANCE"], [520, 370, "MARKETING"]];
  const docs = DOCS.map(([x, y, t], i) => `
  <g id="${id}-d${i}">
    ${docu(`${id}-dd${i}`, x, y, DW, DH, { title: "context.md",
      rows: [{ k: "Owner", v: t[0] + t.slice(1).toLowerCase() }] })}
  </g>`).join("\n");
  const body = `
${svg(id)}
${containers(id)}
${docs}
${svgClose()}
${plaque(id)}`;
  const js = `
${DOCS.map((_, i) => `tl.fromTo("#${id}-d${i}", { scale: 0.94, opacity: 1, transformOrigin: "50% 50%" },
  { scale: 1, opacity: 1, transformOrigin: "50% 50%", duration: 0.60, ease: "power2.out" }, ${(0.00 + i * 0.18).toFixed(2)});`).join("\n")}
${`tl.fromTo("#${id}-rule", { scaleX: 0, opacity: 1, transformOrigin: "left center" },
  { scaleX: 1, opacity: 1, transformOrigin: "left center", duration: 0.30, ease: "power3.out" }, 1.60);`}
${fade(`#${id}-cta`, CTA_AT, 0.22)}
// Hard kill at the hold boundary. Everything above ends at or before 2.00, so
// these pin the final state and the last 60 frames are bit-identical.
tl.set("#${id}-cta", { opacity: 1 }, ${(D - HOLD).toFixed(2)});
tl.set("#${id}-rule", { scaleX: 1, opacity: 1, transformOrigin: "left center" }, ${(D - HOLD).toFixed(2)});
${DOCS.map((_, i) => `tl.set("#${id}-d${i}", { scale: 1, opacity: 1, transformOrigin: "50% 50%" }, ${(D - HOLD).toFixed(2)});`).join("\n")}
`;
  assertInside(id, [box("plaque", PLAQUE_X, plaqueTop(id), PLAQUE_X + PLAQUE_W, PLAQUE_BASE)]);
  emit(id, D, body, js);
}

// ===========================================================================
if (process.argv.includes("--copy-only")) {
  const out = { parts: {}, labels: LABELS, cta: CTA, question: QUESTION,
                floors: { hook: 88, body: 56 },
                floorExceptions: { g001: { px: HOOK_PX, floor: 88,
                  why: "MEASURED: the best two-line split of the hook line is 925px at 88px "
                     + "against an 860px text column; every other split is worse. 80px is the "
                     + "largest that fits, and the brief says 88px 'where it fits'." } } };
  for (const [id, c] of Object.entries(COPY)) {
    const p = part(id);
    const D = p.end - p.start;
    const on = SCHED[id];
    const intervals = on.map((t, i) => ({
      stmt: i, onset: t, until: (i + 1 < on.length && !c.cta) ? on[i + 1] : D,
      words: c.stmts[i].reduce((a, l) => a + l.split(" ").length, 0),
    })).map(x => ({ ...x, readableSeconds: +(x.until - x.onset - 0.35).toFixed(2) }))
      .map(x => ({ ...x, wordsPerSecond: +(x.words / x.readableSeconds).toFixed(2) }));
    out.parts[id] = { start: p.start, end: p.end, px: c.px, stmts: c.stmts,
                      onsets: on, intervals,
                      cta: c.cta || null, ctaPx: c.cta ? CTA_PX : null,
                      ctaAt: c.cta ? CTA_AT : null,
                      ctaReadableSeconds: c.cta ? +(D - CTA_AT - 0.22).toFixed(2) : null,
                      plaqueTop: +plaqueTop(id).toFixed(1),
                      plaqueBottom: +PLAQUE_BASE.toFixed(1) };
  }
  writeFileSync("copy.json", JSON.stringify(out, null, 2) + "\n");
  console.log("wrote copy.json");
} else {
  g001(); g002(); g003(); g004(); g005(); g006(); g007(); g008();
  console.log("all parts emitted");
}
