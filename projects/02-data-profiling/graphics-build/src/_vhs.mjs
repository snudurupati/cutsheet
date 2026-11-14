// The opening's VHS tape (composition review 2026-10-28: the first tape read as an AUDIO cassette, a solid
// ink block with a sound-wave scribble). Line art in the house stroke: a long body, a wide label written
// "WEEKEND" in marker, a big window with two hubs and their tape packs, VHS on the body. Shared by g01a
// (where it rises and is written) and g02 (which carries it across the match-cut), so both draw the same
// tape at the same pixels. Card-inner coordinates. Not a part (the leading underscore keeps build.mjs off it).
import { C } from "../lib.mjs";

export const VHS = { W: 360, H: 186 };   // review round 2: shorter body, wide window, solid reels (spoked hubs said audio cassette)
export const vhs = (id, cx, cy, { written = false, accent = false, opacity = 0 } = {}) => {
  const x0 = cx - VHS.W / 2, y0 = cy - VHS.H / 2, F = C.ink, M = C.muted;
  const hub = (hx, n, pack) => `<circle cx="${hx}" cy="${y0 + 128}" r="${pack}" fill="${M}" opacity=".3"/>
    <g id="${id}-reel${n}"><circle cx="${hx}" cy="${y0 + 128}" r="17" fill="${F}"/><circle cx="${hx}" cy="${y0 + 128}" r="5" fill="${C.bg}"/>
    <rect x="${hx - 2}" y="${y0 + 113}" width="4" height="7" fill="${C.bg}"/></g>`;
  return `<g id="${id}-vhs" opacity="${opacity}">
    <defs><clipPath id="${id}-lbc"><rect id="${id}-lbr" x="${x0 + 24}" y="${y0 + 18}" width="${written ? 312 : 0}" height="62"/></clipPath></defs>
    <rect x="${x0}" y="${y0}" width="${VHS.W}" height="${VHS.H}" rx="10" fill="${C.bg}" stroke="${F}" stroke-width="4"/>
    <rect id="${id}-lab" x="${x0 + 24}" y="${y0 + 18}" width="312" height="62" rx="4" fill="${accent ? C.accent : C.bg}" stroke="${F}" stroke-width="3"/>
    <g clip-path="url(#${id}-lbc)"><text x="${cx}" y="${y0 + 62}" text-anchor="middle" transform="rotate(-2 ${cx} ${y0 + 50})" font-family="Satoshi" style="font-variation-settings:'wght' 900" font-size="34" letter-spacing="3" fill="${F}">WEEKEND</text></g>
    <rect x="${x0 + 34}" y="${y0 + 94}" width="292" height="68" rx="8" fill="none" stroke="${F}" stroke-width="3"/>
    ${hub(cx - 88, 0, 30)}${hub(cx + 88, 1, 22)}
    <text x="${x0 + 26}" y="${y0 + 180}" font-family="Satoshi" style="font-variation-settings:'wght' 900" font-size="20" letter-spacing="2" fill="${F}">VHS</text>
  </g>`;
};
