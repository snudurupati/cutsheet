// g26: next week, the map's payoff (map, third visit, g12's geometry via src/_close.mjs; lens).
// Plan: the SO-101 node lights $accent on 'real' and opens as a lens (style `lens`): inside, two
// drawn SO-101 arms on 'arms', then step-built chips 6 JOINTS ('six'), WRIST CAMERA ('wrist'), TOP
// CAMERA ('observation'). On 'Hugging' a fallback tag 'OR A PUBLIC SO-101 SET'. Then the nine-check
// letters A-I run along the lens rim, every one carrying a '?' (decided: none is ticked; next week
// will "see what survives and what breaks").
// Composition review 2026-10-28, applied:
//  * PUSH-T, ALOHA, their labels and the THIS WEEK bracket stay visible at 45% outside the lens. The
//    lens is 256px (style 330), placed below-left of SO-101 so it covers only SO-101's own labels
//    (they fade while it is open and return as it closes) and the LeRobot label. It reaches 25px
//    below the card's edge (still inside the measured clear wall: x <= 632, y <= 559).
//  * The letters land on "And let's see" (3.8s before the lens closes, not on 'survives' 3.1s from the
//    end), each with a 22px '?' radially inside it, and the arms make way for them; the chips stay.
//    At 256px there is no room for the chips' outline box, so the chips step-build without it.
//  * The g27 hand-off: the lens closes back into SO-101 over the last 0.9s (contents fade first, the
//    map returns to full strength), so g26's last frame is the card alone at the rect g27 starts on.
// Motion across the 29s: dots on PUSH-T -> ALOHA throughout; the lens's dashed inner ring turns 90deg
// while open; the arms move as leader and follower from 'arms' until the letters arrive; the '?'s
// pulse once on 'breaks'.
import { C, emit, frames, panelClass, fg, dim, wipeUp } from "../lib.mjs";
import { EYEBROW, rowUp, show, hide, cueRel, f3, planPart } from "../common.mjs";
import { CARD, MAP, seriesMap, dotsRun, popSvg, fade, drawn, hold, so101k, pulse } from "./_close.mjs";
import { readFileSync } from "node:fs";

const ID = "g26";
// finished-cut review 2026-10-28: at 256px centred (450, 377) the lens overhung the card's bottom edge onto
// the wall (bottom card-local 505 against a 492 card). The card cannot grow (below canvas y 560 is the face
// zone) and moving the lens up alone covers SO-101's node, so it is 232px and sits up-left, inside the card.
const L = { cx: 440, cy: 364, d: 232 };                // card-local; bottom at card-local 480, inside the 492 card
const R = L.d / 2, Li = R - 6;                         // Li: centre of the lens's padding box (244)
// Leader (filled, left) and follower (outline, right, MIRRORED so they face each other). Big while
// they perform (scale 0.55, ~120 x 143px each), then on 'six' the pair shrinks to 62% at the top of the
// lens to make room for the chips. 6px source strokes: 3.3px big, 2.0px small.
// review 2026-10-28 (232px lens): arms up 20px so the chips clear the bases by >= 8px
const ARMS = [{ x: 0, y: 26, filled: true, flip: false }, { x: Li * 2, y: 26, filled: false, flip: true }];
const ARM_K = 0.5, ARM_SW = 6, ARMS_SMALL = 0.62;
// TOP CAMERA dropped (review 2026-10-28: the 232px lens was crowded, and he says "observation camera", not top)
const CHIPS = ["6 joints", "wrist camera"];
const CHIP_Y = [108, 142];                             // under the shrunken arms (bases end ~y 100), clear of the rim
const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
// the nine checks round the whole rim, A at 12 o'clock clockwise; each disc carries its letter AND its
// '?' at 22px ("A?"), so no mark floats free. The chips and arms are gone by then, the centre reads
// NINE CHECKS.
const RING = { r: 75, a0: -90, step: 40, disc: 46 };   // outer edge 98: 12px inside the rim (review 2026-10-28)
const TAG = { x: 24, y: 404 };

const cueWord = (word, nth = 0) => {
  const p = planPart(ID);
  const ws = JSON.parse(readFileSync("../outputs/transcript-cut.json", "utf8")).words
    .filter(w => "start" in w && w.start >= p.start - 0.05 && w.start < p.end && w.word.toLowerCase().replace(/[^a-z]/g, "") === word);
  if (!ws[nth]) throw new Error(`${ID}: no "${word}" #${nth} inside the part`);
  return +(ws[nth].start - p.start).toFixed(3);
};

export default function build() {
  const D = frames(ID) / 30;
  const c = k => cueRel(ID, k);
  const tReal = c("real"), tArms = c("arms"), tSix = c("six"), tWrist = c("wrist"), tObs = c("observation"),
        tHug = c("hugging"), tBreaks = c("breaks");
  const tLet = cueWord("see") - 0.3;                   // "And let's see, in my profiler, what survives..."
  const tClose = D - 0.9;                              // lens closes into SO-101 for the hand-off to g27
  if (tClose - tLet < 3.5) throw new Error(`${ID}: letters read only ${(tClose - tLet).toFixed(2)}s`);
  const F = fg(ID), M = dim(ID);
  const { map, so, e1 } = seriesMap(ID, { after24: true });
  const [sx, sy] = MAP.N.so101;

  // leader from SO-101's node to the lens rim
  const vx = sx - L.cx, vy = sy - L.cy, vl = Math.hypot(vx, vy), ux = vx / vl, uy = vy / vl;
  const rim = [L.cx + ux * (R + 1), L.cy + uy * (R + 1)], nodeEdge = [sx - ux * (MAP.R + 4), sy - uy * (MAP.R + 4)];
  // geometry guards: what must stay visible stays outside the lens (card-local boxes, measured)
  const clear = (what, x0, y0, x1, y1) => { const nx = Math.max(x0, Math.min(L.cx, x1)), ny = Math.max(y0, Math.min(L.cy, y1));
    if (Math.hypot(nx - L.cx, ny - L.cy) < R + 2) throw new Error(`${ID}: the lens covers ${what}`); };
  clear("SO-101 node", sx - MAP.R, sy - MAP.R, sx + MAP.R, sy + MAP.R);
  clear("ALOHA label", 236, 247, 344, 279); clear("ALOHA kind", 265, 284, 315, 306);
  clear("ALOHA node", MAP.N.aloha[0] - MAP.R, 205, MAP.N.aloha[0] + MAP.R, 235);
  clear("fallback tag", TAG.x, TAG.y, TAG.x + 230, TAG.y + 70);
  if (54 + L.cx + R > 640 || 54 + L.cy + R > 560) throw new Error(`${ID}: lens leaves the clear wall`);
  if (L.cy + R > 492 - 8) throw new Error(`${ID}: lens overhangs the card bottom`);
  if (RING.r + RING.disc / 2 > Li - 12) throw new Error(`${ID}: the check ring is within 12px of the rim`);

  const arms = ARMS.map((a, k) => `<div style="position:absolute;left:${a.x}px;top:${a.y}px;width:220px;height:260px;transform:scale(${a.flip ? -ARM_K : ARM_K},${ARM_K});transform-origin:0 0">${so101k(`${ID}-a${k}`, a.filled, F, ARM_SW)}</div>`).join("");
  const chips = CHIPS.map((s, k) => `<div style="position:absolute;left:${Li - 110}px;top:${CHIP_Y[k]}px;width:220px;text-align:center"><span id="${ID}-ch${k}" style="display:inline-block;padding:2px 12px;border-radius:999px;background:${F};color:${C.bg};font-family:SatoshiBold,Satoshi;font-weight:700;font-size:22px;line-height:1.15;letter-spacing:0.02em;text-transform:uppercase;white-space:nowrap;opacity:0">${s}</span></div>`).join("");
  const pos = (rad, k) => { const a = (RING.a0 + RING.step * k) * Math.PI / 180; return [Li + rad * Math.cos(a), Li + rad * Math.sin(a)]; };
  const letters = LETTERS.map((ch, k) => { const [x, y] = pos(RING.r, k), d = RING.disc;
    return `<div id="${ID}-L${k}" style="position:absolute;left:${f3(x - d / 2)}px;top:${f3(y - d / 2)}px;width:${d}px;height:${d}px;border-radius:50%;background:${C.bg};border:2.5px solid ${F};text-align:center;font-family:Satoshi,sans-serif;font-variation-settings:'wght' 900;font-size:22px;line-height:${d - 5}px;letter-spacing:-0.02em;color:${F};opacity:0">${ch}<span id="${ID}-q${k}" style="display:inline-block;color:${M}">?</span></div>`; }).join("");
  const centre = `<div id="${ID}-nine" style="position:absolute;left:${Li - 70}px;top:${Li - 27}px;width:140px;text-align:center;font-family:Satoshi,sans-serif;font-variation-settings:'wght' 700;font-size:20px;line-height:1.15;letter-spacing:0.05em;text-transform:uppercase;color:${M};opacity:0">Nine<br>checks</div>`;
  const lens = `<div id="${ID}-lens" style="position:absolute;left:${L.cx - R}px;top:${L.cy - R}px;width:${L.d}px;height:${L.d}px;border-radius:50%;overflow:hidden;background:${C.bg};border:6px solid #FFFFFF;box-shadow:0 16px 52px rgba(0,0,0,.38);opacity:0">
      <svg style="position:absolute;left:0;top:0;overflow:visible;pointer-events:none" width="${2 * Li}" height="${2 * Li}">
        <circle id="${ID}-ring" cx="${Li}" cy="${Li}" r="${Li - 9}" fill="none" stroke="${C.rule}" stroke-width="2.5" stroke-dasharray="3 11"/></svg>
      <div id="${ID}-in" style="position:absolute;inset:0">
        <div id="${ID}-arms" style="position:absolute;inset:0">${arms}</div>
        <div id="${ID}-chips" style="position:absolute;inset:0">${chips}</div>
        ${letters}${centre}
      </div>
    </div>`;
  const tag = `<div id="${ID}-tag" style="position:absolute;left:${TAG.x}px;top:${TAG.y}px;padding:6px 14px;border:2px dashed ${M};border-radius:10px;background:${C.bg};font-family:Satoshi,sans-serif;font-variation-settings:'wght' 700;font-size:22px;line-height:1.2;letter-spacing:0.1em;text-transform:uppercase;color:${M};white-space:nowrap;opacity:0">or a public<br>SO-101 set</div>`;

  const body = `
<div id="${ID}-card" class="${panelClass(ID)}" style="position:absolute;left:${CARD.x}px;top:${CARD.y}px;width:${CARD.w}px;height:${CARD.h}px">
  ${EYEBROW("The datasets", 28, 24, M, `${ID}-eb`)}
  <div id="${ID}-map" style="position:absolute;inset:0">${map}</div>
  ${so}
  ${tag}
  <svg style="position:absolute;left:0;top:0;overflow:visible;pointer-events:none" width="580" height="480"><line id="${ID}-lead" x1="${f3(nodeEdge[0])}" y1="${f3(nodeEdge[1])}" x2="${f3(rim[0])}" y2="${f3(rim[1])}" stroke="${F}" stroke-width="3" stroke-linecap="round" opacity="0"/></svg>
  ${lens}
</div>`;

  let js = wipeUp(`#${ID}-card`, 0, 0.35) + "\n";
  // frame 0 = g24's end state: ticks and the LeRobot bracket already drawn
  js += drawn(`#${ID}-tpusht`) + drawn(`#${ID}-taloha`) + drawn(`#${ID}-lr`);
  js += dotsRun([`#${ID}-dot0`], e1[0], e1[1], 0.4, tClose);          // one travelling dot, as in g12
  // 'real': SO-101 turns from the dashed ring to lit $accent, one halo marks it
  js += hide(`#${ID}-acc`, tReal - 0.05, 0.25) + popSvg(`#${ID}-fill`, sx, sy, tReal - 0.05);
  js += `tl.fromTo("#${ID}-halo",{opacity:0.9,attr:{r:16}},{opacity:0,attr:{r:40},duration:1.2,ease:"power1.out",immediateRender:false},${f3(tReal + 0.15)});\n`;
  // ...and opens as the lens: from its own position at 8% scale, while the map dims behind it
  const tOpen = tReal + 0.25;
  js += `tl.fromTo("#${ID}-lens",{opacity:0,x:${f3(vx)},y:${f3(vy)},scale:0.08,transformOrigin:"50% 50%"},{opacity:1,x:0,y:0,scale:1,transformOrigin:"50% 50%",duration:0.8,ease:"power3.inOut"},${f3(tOpen)});\n`;
  js += fade(`#${ID}-map`, 1, 0.45, tOpen, 0.6);
  // the LeRobot bracket fades too while the lens is open (review 2026-10-28: the lens cut it into a stub)
  const covered = ["lso101", "kso101", "nwp", "lr"];     // LeRobot label stays hidden: the fallback tag now sits on its line
  js += hide(`#${ID}-lrl`, tOpen, 0.3);
  for (const s of covered) js += hide(`#${ID}-${s}`, tOpen, 0.3);
  js += show(`#${ID}-lead`, tOpen + 0.7, 0.3);
  js += `tl.fromTo("#${ID}-ring",{rotation:0,svgOrigin:"${Li} ${Li}"},{rotation:90,svgOrigin:"${Li} ${Li}",duration:${f3(tClose - tOpen)},ease:"none",immediateRender:false},${f3(tOpen)});\n`;
  // the arms are in the lens from its first frame, faint; on 'arms' they come up and start to move
  js += hold(`#${ID}-arms`, 0.3) + fade(`#${ID}-arms`, 0.3, 1, tArms - 0.1, 0.35);
  // "I'll run them, collect the data": the leader moves and the follower mirrors it a beat later, then
  // they keep working gently until the letters arrive
  const tRun = cueWord("run"), cyc = 1.6, n = Math.max(1, Math.floor((tLet - 0.25 - tRun) / cyc));
  const pose = (k, lag) => `tl.fromTo("#${ID}-a${k}-u",{rotation:0,svgOrigin:"91 188"},{rotation:-18,svgOrigin:"91 188",duration:${cyc / 2},yoyo:true,repeat:${2 * n - 1},ease:"sine.inOut",immediateRender:false},${f3(tRun - 0.1 + lag)});\n`
    + `tl.fromTo("#${ID}-a${k}-f",{rotation:0,svgOrigin:"91 84"},{rotation:26,svgOrigin:"91 84",duration:${cyc / 2},yoyo:true,repeat:${2 * n - 1},ease:"sine.inOut",immediateRender:false},${f3(tRun - 0.1 + lag)});\n`;
  js += pose(0, 0) + pose(1, 0.25);
  // on 'six' the pair shrinks to the top of the lens to make room for the chips
  js += `tl.fromTo("#${ID}-arms",{scale:1,transformOrigin:"${Li}px 10px"},{scale:${ARMS_SMALL},transformOrigin:"${Li}px 10px",duration:0.5,ease:"power2.inOut",immediateRender:false},${f3(tSix - 0.6)});\n`;
  // step-built chips, one on each word
  [tSix, tWrist].forEach((t, k) => {
    js += `tl.fromTo("#${ID}-ch${k}",{opacity:0,scale:0.7,transformOrigin:"50% 50%"},{opacity:1,scale:1,transformOrigin:"50% 50%",duration:0.3,ease:"power3.out"},${f3(t)});\n`;
  });
  // 'Hugging': the fallback tag
  js += rowUp(`#${ID}-tag`, tHug);
  // "And let's see": the arms make way, the nine letters run along the rim, each with its '?'
  js += fade(`#${ID}-arms`, 1, 0, tLet - 0.2, 0.3);
  js += fade(`#${ID}-chips`, 1, 0, tLet - 0.2, 0.3);                 // the chips go too (review round 3)
  LETTERS.forEach((_, k) => {
    js += `tl.fromTo("#${ID}-L${k}",{opacity:0,scale:0.6,transformOrigin:"50% 50%"},{opacity:1,scale:1,transformOrigin:"50% 50%",duration:0.25,ease:"back.out(2)"},${f3(tLet + k * 0.05)});\n`;
  });
  js += show(`#${ID}-nine`, tLet + 0.5, 0.3);
  // 'breaks': the discs pulse once
  js += pulse(LETTERS.map((_, k) => `#${ID}-L${k}`).join(","), tBreaks, 1.12, 0.2, 1);
  // close for the hand-off: contents fade, the circle shrinks back into SO-101, the map returns
  js += fade(`#${ID}-in`, 1, 0, tClose - 0.2, 0.2) + hide(`#${ID}-lead`, tClose - 0.2, 0.2);
  js += `tl.fromTo("#${ID}-lens",{opacity:1,x:0,y:0,scale:1,transformOrigin:"50% 50%"},{opacity:0,x:${f3(vx)},y:${f3(vy)},scale:0.08,transformOrigin:"50% 50%",duration:0.8,ease:"sine.inOut",immediateRender:false},${f3(tClose)});\n`;
  js += fade(`#${ID}-map`, 0.45, 1, tClose + 0.1, 0.6);
  for (const s of covered) js += fade(`#${ID}-${s}`, 0, 1, tClose + 0.4, 0.3);
  // no exit: g27 starts on this part's last frame in the same card rect and swaps its contents in
  emit(ID, D, body, js);
}
