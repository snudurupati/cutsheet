// g28 (OPTIONAL, offered to the human as keep or drop): the speaker points out the room's Halloween
// decorations. No card: a hand-drawn $accent ring and an ink arrow land on the REAL pumpkin on
// 'pumpkin'; a small 'HAPPY HALLOWEEN' 22px label on a paper pill lands on "happy Halloween" with
// the arrow drawing from it down to the ring (review 2026-10-28: the arrow lands with its label).
// Pumpkin MEASURED on the base cut across the part (1940.5-1951.0, 7 frames, orange-pixel mask): body
// x 1462-1650, y ~700-860, spider on top from y ~650; centre (1556, 784); the camera is locked, so
// it does not move. The face's right edge peaks at x ~1410 (1946.0) and the shoulder reaches the
// pumpkin's lower left; nothing here goes left of x 1440 above y 640, so nothing touches the face.
// Cue: the plan's 'halloween' (1943.57) is not the word Halloween in transcript-cut.json ("it's time of
// the year"); the label is re-derived to "happy" (1949.51) so it lands with the words it prints.
// Overlay elements (no card) fade out over the last 0.35s, 1.2s after the label lands, so nothing
// pops off at the cut to g29.
import { C, emit, frames } from "../lib.mjs";
import { rowUp, drawAll, cueRel, f3, planPart } from "../common.mjs";
import { readFileSync } from "node:fs";

const ID = "g28";
const PUMPKIN = { cx: 1556, cy: 772, rx: 118, ry: 116 };       // ring around body + spider (canvas px)
const ARROW = { from: [1692, 578], c1: [1694, 622], c2: [1682, 656], tip: [1652, 677] };
const LABEL = { cx: 1678, y: 534 };                            // pill ~x 1534-1822, inside title-safe (1824)

const cueWord = (word, nth = 0) => {
  const p = planPart(ID);
  const ws = JSON.parse(readFileSync("../outputs/transcript-cut.json", "utf8")).words
    .filter(w => "start" in w && w.start >= p.start - 0.05 && w.start < p.end && w.word.toLowerCase().replace(/[^a-z]/g, "") === word);
  if (!ws[nth]) throw new Error(`${ID}: no "${word}" #${nth} inside the part`);
  return +(ws[nth].start - p.start).toFixed(3);
};

export default function build() {
  const D = frames(ID) / 30;
  const tPump = cueRel(ID, "pumpkin"), tHappy = cueWord("happy");
  // a hand-drawn loop: one turn plus a little overshoot, radius wobbling a few px (fixed, not random)
  const pts = [];
  for (let i = 0; i <= 64; i++) {
    const a = -0.9 + (i / 64) * (2 * Math.PI + 0.55), w = 1 + 0.03 * Math.sin(3 * a + 0.7) + (i / 64) * 0.05;
    pts.push([PUMPKIN.cx + PUMPKIN.rx * w * Math.cos(a), PUMPKIN.cy + PUMPKIN.ry * w * Math.sin(a)]);
  }
  const ring = "M" + pts.map(([x, y]) => `${f3(x)},${f3(y)}`).join(" L");
  const [tx, ty] = ARROW.tip, [cx2, cy2] = ARROW.c2;
  const arrowD = `M${ARROW.from} C${ARROW.c1} ${ARROW.c2} ${ARROW.tip}`;
  // arrowhead legs from the curve's end tangent, +-35deg, 18px
  const bx = cx2 - tx, by = cy2 - ty, bl = Math.hypot(bx, by), leg = a => { const c = Math.cos(a), s2 = Math.sin(a);
    return [tx + 18 * (bx * c - by * s2) / bl, ty + 18 * (bx * s2 + by * c) / bl]; };
  const [h1, h2] = [leg(0.61), leg(-0.61)];
  const head = `M${f3(h1[0])},${f3(h1[1])} L${tx},${ty} L${f3(h2[0])},${f3(h2[1])}`;
  const lx0 = Math.min(...pts.map(p => p[0]));
  if (lx0 < 1430) throw new Error(`${ID}: ring reaches x ${lx0.toFixed(0)}, toward the face`);

  const body = `
<div id="${ID}-all" style="position:absolute;left:0;top:0;width:1920px;height:1080px">
  <svg style="position:absolute;left:0;top:0;overflow:visible" width="1920" height="1080">
    <path id="${ID}-ringU" class="dr" pathLength="1" d="${ring}" fill="none" stroke="${C.bg}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>
    <path id="${ID}-ring" class="dr" pathLength="1" d="${ring}" fill="none" stroke="${C.accent}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <g id="${ID}-arw">
      <path id="${ID}-a1U" class="dr" pathLength="1" d="${arrowD}" fill="none" stroke="${C.bg}" stroke-width="9" stroke-linecap="round" opacity="0.85"/>
      <path id="${ID}-a1" class="dr" pathLength="1" d="${arrowD}" fill="none" stroke="${C.ink}" stroke-width="4" stroke-linecap="round"/>
      <path id="${ID}-a2U" class="dr" pathLength="1" d="${head}" fill="none" stroke="${C.bg}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>
      <path id="${ID}-a2" class="dr" pathLength="1" d="${head}" fill="none" stroke="${C.ink}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  </svg>
  <div style="position:absolute;left:${LABEL.cx - 170}px;top:${LABEL.y}px;width:340px;text-align:center">
    <span id="${ID}-lbl" style="display:inline-block;background:${C.bg};padding:4px 14px;border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,.22);font-family:Satoshi,sans-serif;font-variation-settings:'wght' 700;font-size:22px;line-height:1.15;letter-spacing:0.14em;text-transform:uppercase;color:${C.ink};white-space:nowrap;opacity:0">Happy Halloween</span>
  </div>
</div>`;

  let js = `tl.fromTo("#${ID}-all",{opacity:1},{opacity:1,duration:0.2,immediateRender:true},0);\n`;
  // 'pumpkin': the ring draws round it (starting a beat before so it closes on the word), the arrow follows
  js += drawAll(`#${ID}-ringU`, tPump - 0.15, 0.6) + drawAll(`#${ID}-ring`, tPump - 0.15, 0.6);
  // the ring breathes while it holds (small, about its own centre)
  const per = 1.8, n = Math.max(1, Math.floor((D - tPump - 1.2) / per));
  js += `tl.fromTo("#${ID}-ring, #${ID}-ringU",{scale:1,svgOrigin:"${PUMPKIN.cx} ${PUMPKIN.cy}"},{scale:1.035,svgOrigin:"${PUMPKIN.cx} ${PUMPKIN.cy}",duration:${per / 2},yoyo:true,repeat:${2 * n - 1},ease:"sine.inOut",immediateRender:false},${f3(tPump + 0.9)});\n`;
  // "happy Halloween": the label
  js += rowUp(`#${ID}-lbl`, tHappy - 0.05);
  // the arrow lands WITH its label (composition review 2026-10-28), from the label down to the ring
  js += drawAll(`#${ID}-a1U`, tHappy + 0.15, 0.35) + drawAll(`#${ID}-a1`, tHappy + 0.15, 0.35);
  js += drawAll(`#${ID}-a2U`, tHappy + 0.48, 0.18) + drawAll(`#${ID}-a2`, tHappy + 0.48, 0.18);
  // fade out 1.2s after the last cue, complete on the last frame
  const tOut = Math.min(D - 0.4, tHappy + 1.2);
  js += `tl.fromTo("#${ID}-all",{opacity:1},{opacity:0,duration:0.35,ease:"power1.in",immediateRender:false},${f3(tOut)});\n`;
  emit(ID, D, body, js);
}
