// The object library for v2. Five shapes carry the whole argument, and every
// beat TRANSFORMS them rather than introducing a new metaphor.
//
// The four states the brief asks for are distinguished by SHAPE AND LABEL, never
// by colour alone: an approved definition has a solid border and a filled corner
// tab, a proposed change has a dashed border and a notched corner, an outdated
// AI answer carries a corner flag, and a team-owned definition is a document
// with a folded corner and named fields.
//
// All coordinates are the 960x590 art-field viewBox.
import { C } from "./lib.mjs";
import { readFileSync } from "node:fs";

// Real per-character advances, generated from the same OTF files the render
// loads. Badge boxes and field value positions used to be sized from character
// COUNTS, and "APPROVED" overflowed its card by 4px while "Scope" ran straight
// into "Marketing". Summing measured advances is within 1.5% and always errs
// wide, which is the safe direction for a box that must contain its text.
const CW = JSON.parse(readFileSync("charw.json", "utf8"));

// One gutter, used by every box in the piece, so nothing sits a few px off
// anything else.
export const PAD = 20;
export const tw = (s, px, face = "bold", tracking = 0) =>
  [...s].reduce((t, c) => t + (CW[face][c] ?? 0.55), 0) * px + tracking * s.length;

const INK = C.ink, DIM = C.muted, RULE = C.rule, BG = C.bg, ACC = C.accent;

// ---------------------------------------------------------------- containers
export const container = (id, x, y, w, h, label) => `
  <g id="${id}">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="none"
      stroke="${RULE}" stroke-width="3"/>
    <rect x="${x + PAD}" y="${y - 19}" width="${Math.ceil(tw(label, 32, "bold", 2)) + 26}"
      height="38" rx="4" fill="${BG}"/>
    <text x="${x + PAD + 13}" y="${y + 7}" fill="${DIM}" font-family="SatoshiBold"
      font-size="32" letter-spacing="2">${label}</text>
  </g>`;

// ---------------------------------------------------------------- cards
// state: approved | proposed | plain
export const card = (id, x, y, w, h, o = {}) => {
  const st = o.state || "plain";
  const dash = st === "proposed" ? ' stroke-dasharray="12 9"' : "";
  const notch = 26;
  // A proposed card is NOTCHED at the top-right; an approved one has a filled
  // tab there. Same footprint, different silhouette, readable with no colour.
  const body = st === "proposed"
    ? `<path d="M ${x} ${y} L ${x + w - notch} ${y} L ${x + w} ${y + notch} L ${x + w} ${y + h}
         L ${x} ${y + h} Z" fill="${BG}" stroke="${INK}" stroke-width="3"${dash}
         stroke-linejoin="round"/>`
    : `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${BG}"
         stroke="${INK}" stroke-width="3"/>`;
  const tab = st === "approved"
    ? `<rect x="${x + w - 30}" y="${y - 1}" width="30" height="30" rx="4" fill="${INK}"/>`
    : "";
  const title = o.title
    ? `<text x="${x + PAD}" y="${y + 48}" fill="${INK}" font-family="SatoshiBold"
        font-size="${o.titlePx || 38}" letter-spacing="1">${o.title}</text>` : "";
  // A field is a LABEL plus a bar. The bar stands for the definition's content
  // deliberately: the brief forbids inventing departmental accounting rules.
  const fields = (o.fields || []).map((f, i) => {
    const fy = y + (o.fieldTop || 78) + i * (o.fieldGap || 48);
    const fp = o.fieldPx || 34;
    const lw = Math.ceil(tw(f.label, fp, "bold", 1)) + PAD;
    return `<text x="${x + PAD}" y="${fy}" fill="${DIM}" font-family="SatoshiBold"
        font-size="${o.fieldPx || 34}" letter-spacing="1">${f.label}</text>
      ${f.empty
        ? `<rect id="${id}-slot${i}" x="${x + 24 + lw}" y="${fy - 30}" rx="4"
            width="${f.barW || Math.max(40, w - PAD * 2 - lw)}" height="40" fill="none" stroke="${DIM}"
            stroke-width="3" stroke-dasharray="10 8"/>`
        : f.bar === false ? "" : `<rect id="${id}-bar${i}" x="${x + 24 + lw}" y="${fy - 17}"
        width="${f.barW || Math.max(40, w - PAD * 2 - lw)}" height="14" rx="3"
        fill="${f.barFill || RULE}"/>`}
      ${f.value ? `<text x="${x + 24 + lw}" y="${fy}" fill="${INK}"
        font-family="SatoshiBold" font-size="${o.fieldPx || 34}">${f.value}</text>` : ""}`;
  }).join("\n");
  // Measured, not counted: the box is the text's real width plus padding, and
  // it is inset from the card's own border rather than butted against it.
  const bw = o.badge ? Math.ceil(tw(o.badge, 34, "bold", 1.6)) + 28 : 0;
  const bx = x + w - bw - PAD;
  const badge = o.badge
    ? `<g id="${id}-badge"><rect x="${bx}" y="${y + h - 56}" width="${bw}" height="44" rx="4"
        fill="${BG}" stroke="${o.badgeDim ? DIM : INK}" stroke-width="3"/>
      <text x="${bx + bw / 2}" y="${y + h - 24}" text-anchor="middle"
        fill="${o.badgeDim ? DIM : INK}" font-family="SatoshiBold" font-size="34"
        letter-spacing="1.6">${o.badge}</text></g>` : "";
  // A corner flag marks an answer built on stale context. Shape, not colour.
  const flag = o.flag
    ? `<g id="${id}-flag"><path d="M ${x + w} ${y} L ${x + w} ${y + 46} L ${x + w - 46} ${y} Z"
        fill="${DIM}"/></g>` : "";
  return `<g id="${id}">${body}${tab}${flag}${title}${fields}${badge}</g>`;
};

// ---------------------------------------------------------------- documents
export const docu = (id, x, y, w, h, o = {}) => {
  const f = 30;
  const rows = (o.rows || []).map((r, i) => {
    const ry = y + 96 + i * 48;
    const kw = Math.ceil(tw(r.k, 34, "bold", 1));
    return `<text x="${x + PAD}" y="${ry}" fill="${DIM}" font-family="SatoshiBold"
        font-size="34" letter-spacing="1">${r.k}</text>
      ${r.v ? `<text x="${x + w - PAD}" y="${ry}" text-anchor="end" fill="${INK}"
        font-family="SatoshiBold" font-size="34">${r.v}</text>`
      : `<rect id="${id}-r${i}" x="${x + PAD + 4 + kw}" y="${ry - 16}"
        width="${Math.max(40, w - PAD * 2 - 4 - kw)}" height="12" rx="3" fill="${RULE}"/>`}`;
  }).join("\n");
  return `<g id="${id}">
    <path d="M ${x} ${y} L ${x + w - f} ${y} L ${x + w} ${y + f} L ${x + w} ${y + h}
      L ${x} ${y + h} Z" fill="${BG}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M ${x + w - f} ${y} L ${x + w - f} ${y + f} L ${x + w} ${y + f}"
      fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    ${o.title ? `<text x="${x + PAD}" y="${y + 42}" fill="${INK}" font-family="SatoshiBold"
      font-size="34" letter-spacing="1">${o.title}</text>` : ""}
    ${rows}
  </g>`;
};

// ---------------------------------------------------------------- arrows
// Straight, draw-on via stroke-dashoffset, with a head that fades in after.
export const arrow = (id, x1, y1, x2, y2, o = {}) => {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L, H = o.head || 20;
  const ex = x2 - ux * 2, ey = y2 - uy * 2;
  const px = -uy, py = ux;
  const col = o.color || DIM, sw = o.width || 4;
  return `<g id="${id}">
    <line id="${id}-l" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}"
      x2="${(x2 - ux * H).toFixed(1)}" y2="${(y2 - uy * H).toFixed(1)}" stroke="${col}"
      stroke-width="${sw}" stroke-linecap="round" pathLength="1"
      stroke-dasharray="1" stroke-dashoffset="1"/>
    <polygon id="${id}-h" opacity="0" fill="${col}"
      points="${ex.toFixed(1)},${ey.toFixed(1)}
              ${(ex - ux * H + px * H * 0.6).toFixed(1)},${(ey - uy * H + py * H * 0.6).toFixed(1)}
              ${(ex - ux * H - px * H * 0.6).toFixed(1)},${(ey - uy * H - py * H * 0.6).toFixed(1)}"/>
  </g>`;
};

// A curved arrow, for the shortcut that goes AROUND the approval queue.
export const curve = (id, d, o = {}) => `
  <g id="${id}">
    <path id="${id}-l" d="${d}" fill="none" stroke="${o.color || DIM}"
      stroke-width="${o.width || 4}" stroke-linecap="round" pathLength="1"
      stroke-dasharray="1" stroke-dashoffset="1"/>
  </g>`;

// ---------------------------------------------------------------- lanes, gates
export const lane = (id, x, y, w, h, label) => `
  <g id="${id}">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="none"
      stroke="${RULE}" stroke-width="3"/>
    <rect x="${x + PAD}" y="${y - 19}" width="${Math.ceil(tw(label, 32, "bold", 2)) + 26}"
      height="38" rx="4" fill="${BG}"/>
    <text x="${x + PAD + 13}" y="${y + 7}" fill="${DIM}" font-family="SatoshiBold"
      font-size="32" letter-spacing="2">${label}</text>
  </g>`;

export const gate = (id, x, y, h, label) => `
  <g id="${id}">
    <line id="${id}-l" x1="${x}" y1="${y}" x2="${x}" y2="${y + h}" stroke="${INK}"
      stroke-width="6" stroke-linecap="round" pathLength="1"
      stroke-dasharray="1" stroke-dashoffset="1"/>
    <g id="${id}-t" opacity="0">
      <rect x="${x - 78}" y="${y + h / 2 - 24}" width="156" height="48" rx="5"
        fill="${BG}" stroke="${INK}" stroke-width="3"/>
      <text x="${x}" y="${y + h / 2 + 12}" text-anchor="middle" fill="${INK}"
        font-family="SatoshiBold" font-size="32" letter-spacing="1.5">${label}</text>
    </g>
  </g>`;

export const node = (id, x, y, r = 16) =>
  `<circle id="${id}" cx="${x}" cy="${y}" r="${r}" fill="${BG}" stroke="${INK}" stroke-width="3"/>`;

export const edge = (id, x1, y1, x2, y2, o = {}) =>
  `<line id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${o.color || INK}"
    stroke-width="${o.width || 3}" stroke-linecap="round" pathLength="1"
    stroke-dasharray="1" stroke-dashoffset="${o.drawn ? 0 : 1}"/>`;

export const dot = (id, x, y, r = 18) => `
  <g id="${id}" opacity="0">
    <circle cx="${x}" cy="${y}" r="${r + 8}" fill="${ACC}" opacity="0.25"/>
    <circle cx="${x}" cy="${y}" r="${r}" fill="${ACC}"/>
  </g>`;
