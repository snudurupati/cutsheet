// g12: the series map, first visit (style `map`). PUSH-T (sim) / ALOHA (sim) / SO-101 (real).
// Returned to in g24 and g26: import MAP from this file (or copy these numbers) so the geometry is
// identical. All coordinates are CARD-LOCAL px inside the 6px border (inner box 580 x 388).
//   card:   HERO zone, x 48, y 48, w 592, h 400 (content box at 54,54; frame 0 grows from g11's COLUMN shell)
//   nodes:  centres on y 220 at x 110 (PUSH-T), 290 (ALOHA), 470 (SO-101); radius 15, ring 3.5px
//           (SO-101: 5px dashed ink ring, then a 5.5px dashed $accent ring + halo on "real")
//   labels: name pill centred under each node at y 247 (22px tracked caps on a paper backing),
//           kind ("sim" / "real") at y 284 (20px tracked caps $muted), week tag at y 322
//   edges:  y 220, stopping TRIM 22px short of each node; PUSH-T -> ALOHA solid $rule 3px with three
//           travelling dots; ALOHA -> SO-101 dashed with an arrowhead (drawn on "real")
//   bracket over the two sim nodes: x 80..320, top y 150, ticks down to 166; label pill centred
//           at (200, 104)
// Timeline: frame 0 is g11's card shell, resizing to this rect (see HAND-OFF); dashed placeholders; "Push-T" lights PUSH-T; "Aloha"
// lights ALOHA and the edge between them (no WEEK 1 tick: PUSH-T sits under THIS WEEK); "actual" draws SO-101 in dashed $muted with NEXT WEEK;
// "two" brackets the two sims (THIS WEEK); "real" draws the dashed arrow ALOHA -> SO-101 and the
// SO-101 ring turns $accent (the map's one accent). Continuous motion: a ripple on PUSH-T until
// ALOHA lights, then three dots travel the lit edge to the end; the arrow's dashes march after "real".
import { C, emit, frames, fg, dim } from "../lib.mjs";
import { EYEBROW, rowUp, show, hide, drawAll, cueRel, exitIfFree, HERO, COLUMN, f3 } from "../common.mjs";
import { fade, popSvg, pill, holdHidden } from "./_part2.mjs";
import { g11Final } from "./g11.mjs";

const ID = "g12";
export const MAP = {
  card: { x: HERO.x, y: HERO.y, w: 592, h: 400 },
  N: { pusht: [110, 220], aloha: [290, 220], so101: [470, 220] },
  R: 15, TRIM: 22, LABEL_Y: 247, KIND_Y: 284, WEEK_Y: 322,
  BRACKET: { x0: 80, x1: 320, y: 150, tick: 16, labelY: 104 },
  LABEL: { pusht: "Push-T", aloha: "ALOHA", so101: "SO-101" },
  KIND: { pusht: "sim", aloha: "sim", so101: "real" },
};

export default function build() {
  const D = frames(ID) / 30;
  const F = fg(ID), M = dim(ID);
  const { card, N, R, TRIM, LABEL_Y, KIND_Y, WEEK_Y, BRACKET: B, LABEL, KIND } = MAP;
  const IW = card.w - 12, IH = card.h - 12;
  const tP = cueRel(ID, "pusht"), tA = cueRel(ID, "aloha"), tAc = cueRel(ID, "actual"),
        tTwo = cueRel(ID, "two"), tR = cueRel(ID, "real");
  const [px, py] = N.pusht, [ax, ay] = N.aloha, [sx, sy] = N.so101;
  const e1 = [px + TRIM, ax - TRIM], e2 = [ax + TRIM, sx - TRIM];

  const node = k => { const [x, y] = N[k];
    return `<circle id="${ID}-gh${k}" cx="${x}" cy="${y}" r="${R}" fill="none" stroke="${C.rule}" stroke-width="3" stroke-dasharray="5 5"/>
      <g id="${ID}-n${k}" opacity="0"><circle cx="${x}" cy="${y}" r="${R}" fill="${C.bg}" stroke="${k === "so101" ? F : M}" stroke-width="${k === "so101" ? 5 : 3.5}" ${k === "so101" ? `stroke-dasharray="7 5"` : ""}/>
        ${k === "so101" ? "" : `<circle cx="${x}" cy="${y}" r="${R}" fill="${F}"/>`}</g>`; };
  const svg = `<svg id="${ID}-svg" style="position:absolute;left:0;top:0;overflow:visible" width="${IW}" height="${IH}">
      <line id="${ID}-e0" x1="${e1[0]}" y1="${py}" x2="${e1[1]}" y2="${py}" stroke="${C.rule}" stroke-width="3" stroke-dasharray="6 8" stroke-linecap="round"/>
      <circle id="${ID}-dd" cx="${e1[0]}" cy="${py}" r="5" fill="${M}" opacity="0"/>
      <g id="${ID}-e1" opacity="0"><line x1="${e1[0]}" y1="${py}" x2="${e1[1]}" y2="${py}" stroke="${C.rule}" stroke-width="3" stroke-linecap="round"/>
        ${[0, 1, 2].map(k => `<circle id="${ID}-dot${k}" cx="${e1[0]}" cy="${py}" r="5" fill="${M}" opacity="0"/>`).join("")}</g>
      <g id="${ID}-e2" opacity="0"><line id="${ID}-e2l" x1="${e2[0]}" y1="${ay}" x2="${e2[1] - 4}" y2="${ay}" stroke="${M}" stroke-width="3" stroke-dasharray="8 9" stroke-linecap="round"/>
        <path d="M${e2[1] - 12},${ay - 8} L${e2[1]},${ay} L${e2[1] - 12},${ay + 8}" fill="none" stroke="${M}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></g>
      <circle id="${ID}-halo" cx="${px}" cy="${py}" r="18" fill="none" stroke="${M}" stroke-width="2.5" opacity="0"/>
      ${["pusht", "aloha", "so101"].map(node).join("")}
      <circle id="${ID}-acc" cx="${sx}" cy="${sy}" r="${R}" fill="none" stroke="${C.accent}" stroke-width="5.5" stroke-dasharray="7 5" opacity="0"/>
      <circle id="${ID}-acc2" cx="${sx}" cy="${sy}" r="${R + 9}" fill="none" stroke="${C.accent}" stroke-width="2.5" opacity="0"/>
      <path id="${ID}-br" class="dr" pathLength="1" d="M${B.x0},${B.y + B.tick} V${B.y} H${B.x1} V${B.y + B.tick} M${(B.x0 + B.x1) / 2},${B.y} V${B.y - 12}" fill="none" stroke="${F}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  // HAND-OFF FROM g11 (composition review: the cut between the two cards blinked). Frame 0 is g11's
  // card shell at the COLUMN rect (432 x 812, same paper, border and shadow, no content), and it
  // resizes to g12's rect over 0.4s. Two layers clipped inside the union box, as matchCutGrow does
  // (clip-path, never width/height: HyperFrames rejects layout motion): a white border RING and the
  // 92% paper, with the shadow as a drop-shadow on their wrapper so it follows the clip.
  const U = { x: card.x, y: card.y, w: Math.max(card.w, COLUMN.w), h: Math.max(card.h, COLUMN.h) };
  const ring = (w, h) => { const b = 6; return `polygon(evenodd, 0px 0px, ${w}px 0px, ${w}px ${h}px, 0px ${h}px, 0px 0px, ${b}px ${b}px, ${b}px ${h - b}px, ${w - b}px ${h - b}px, ${w - b}px ${b}px, ${b}px ${b}px)`; };
  const paper = (w, h) => `inset(6px ${U.w - w + 6}px ${U.h - h + 6}px 6px)`;
  const shell = `<div id="${ID}-shell" style="position:absolute;left:${U.x}px;top:${U.y}px;width:${U.w}px;height:${U.h}px;filter:drop-shadow(0 16px 26px rgba(0,0,0,.38))">
    <div id="${ID}-sb" style="position:absolute;inset:0;background:#FFFFFF;clip-path:${ring(COLUMN.w, COLUMN.h)}"></div>
    <div id="${ID}-sp" style="position:absolute;inset:0;background:${C.bg}EB;clip-path:${paper(COLUMN.w, COLUMN.h)}">
      <div id="${ID}-g11" style="position:absolute;left:6px;top:6px;width:${COLUMN.w - 12}px;height:${COLUMN.h - 12}px">${g11Final(F, M)}</div></div></div>`;
  const shellJS = `tl.fromTo("#${ID}-sb",{clipPath:"${ring(COLUMN.w, COLUMN.h)}"},{clipPath:"${ring(card.w, card.h)}",duration:0.4,ease:"power2.inOut",immediateRender:true},0);\n`
    + `tl.fromTo("#${ID}-sp",{clipPath:"${paper(COLUMN.w, COLUMN.h)}"},{clipPath:"${paper(card.w, card.h)}",duration:0.4,ease:"power2.inOut",immediateRender:true},0);\n`;
  const kind = (k, x) => `<div id="${ID}-k${k}" style="position:absolute;left:${x - 80}px;top:${KIND_Y}px;width:160px;text-align:center;font-family:Satoshi,sans-serif;font-variation-settings:'wght' 700;font-size:20px;letter-spacing:0.14em;text-transform:uppercase;color:${M};opacity:0">${KIND[k]}</div>`;
  const wk = (id, txt, x, dx = 0) => `<div id="${id}" style="position:absolute;left:${x - 80 + dx}px;top:${WEEK_Y}px;width:160px;text-align:center;font-family:Satoshi,sans-serif;font-variation-settings:'wght' 700;font-size:20px;letter-spacing:0.12em;text-transform:uppercase;color:${F};opacity:0">${txt}</div>`;

  const body = `
${shell}
<div id="${ID}-card" style="position:absolute;left:${card.x + 6}px;top:${card.y + 6}px;width:${IW}px;height:${IH}px;color:${F}">
  ${EYEBROW("The datasets", 28, 24, M, `${ID}-eb`)}
  ${svg}
  ${["pusht", "aloha", "so101"].map(k => pill(`${ID}-l${k}`, LABEL[k], N[k][0], LABEL_Y, { w: 200 })).join("")}
  ${["pusht", "aloha", "so101"].map(k => kind(k, N[k][0])).join("")}
  ${wk(`${ID}-nw`, "Next week", sx)}
  ${pill(`${ID}-bl`, "This week", (B.x0 + B.x1) / 2, B.labelY, { w: 240 })}
</div>`;

  let js = shellJS;
  // crossfade during the reshape: g11's last frame (inside the shell, clipped with it) fades out
  // while g12's placeholders fade in, so there is never bare paper
  js += `tl.fromTo("#${ID}-g11",{opacity:1},{opacity:0,duration:0.3,ease:"power1.in",immediateRender:true},0);\n`;
  js += `tl.fromTo("#${ID}-card",{opacity:0},{opacity:1,duration:0.35,ease:"power1.out",immediateRender:true},0.12);\n`;
  js += rowUp(`#${ID}-eb`, 0.2);
  ["lpusht", "laloha", "lso101", "bl"].forEach(k => { js += holdHidden(`#${ID}-${k}`); });
  // the map is there unlit from frame 1 (dashed placeholders are part of the card)
  const light = (k, t) => { const [x, y] = N[k];
    return fade(`#${ID}-gh${k}`, 1, 0, t, 0.25) + popSvg(`#${ID}-n${k}`, x, y, t)
      + `tl.fromTo("#${ID}-l${k}",{opacity:0,y:14},{opacity:1,y:0,duration:0.35,ease:"power3.out",immediateRender:false},${f3(t + 0.1)});\n`
      + show(`#${ID}-k${k}`, t + 0.3, 0.3); };
  js += light("pusht", tP);
  // PUSH-T ripples until ALOHA lights (continuous motion through the 12.7s between the two)
  const rp = 1.6, rn = Math.max(1, Math.floor((tA - tP - 0.6) / rp));
  js += `tl.fromTo("#${ID}-halo",{opacity:0.8,attr:{r:17}},{opacity:0,attr:{r:44},duration:${rp},ease:"power1.out",repeat:${rn - 1},immediateRender:false},${f3(tP + 0.5)});\n`;
  // ...and one dot drifts slowly along the dashed edge toward the unlit ALOHA (3.2s a crossing)
  const dp = 3.2, dn = Math.max(1, Math.floor((tA - tP - 0.8) / dp));
  js += show(`#${ID}-dd`, tP + 0.8, 0.3) + `tl.fromTo("#${ID}-dd",{attr:{cx:${e1[0]}}},{attr:{cx:${e1[1]}},duration:${dp},ease:"sine.inOut",repeat:${dn - 1},immediateRender:false},${f3(tP + 0.8)});\n` + hide(`#${ID}-dd`, tA - 0.2, 0.2);
  js += light("aloha", tA) + show(`#${ID}-e1`, tA + 0.2, 0.4) + hide(`#${ID}-e0`, tA + 0.2, 0.3);
  // three dots travel the lit edge, one every third of a 2.4s period, to the end of the part
  const per = 2.4;
  [0, 1, 2].forEach(k => { const s = tA + 0.5 + k * per / 3;
    js += show(`#${ID}-dot${k}`, s, 0.2);
    js += `tl.fromTo("#${ID}-dot${k}",{attr:{cx:${e1[0]}}},{attr:{cx:${e1[1]}},duration:${per},ease:"none",repeat:${Math.max(0, Math.floor((D - s) / per) - 1)},immediateRender:false},${f3(s)});\n`; });
  js += light("so101", tAc) + show(`#${ID}-nw`, tAc + 0.6, 0.3, "y:8", "y:0");
  js += drawAll(`#${ID}-br`, tTwo, 0.5) + `tl.fromTo("#${ID}-bl",{opacity:0,y:10},{opacity:1,y:0,duration:0.35,ease:"power3.out",immediateRender:false},${f3(tTwo + 0.3)});\n`;
  js += show(`#${ID}-e2`, tR, 0.35, "x:-10", "x:0") + fade(`#${ID}-acc`, 0, 1, tR + 0.2, 0.3);
  // the payoff node breathes: a thin accent halo pulses round it to the end
  js += `tl.fromTo("#${ID}-acc2",{opacity:0.9,attr:{r:${R + 4}}},{opacity:0,attr:{r:${R + 22}},duration:1.4,ease:"power1.out",repeat:${Math.max(0, Math.floor((D - tR - 0.6) / 1.4) - 1)},immediateRender:false},${f3(tR + 0.5)});\n`;
  js += `tl.fromTo("#${ID}-e2l",{strokeDashoffset:0},{strokeDashoffset:-34,duration:0.9,ease:"none",repeat:${Math.max(0, Math.floor((D - tR - 0.5) / 0.9) - 1)},immediateRender:false},${f3(tR + 0.5)});\n`;
  js += exitIfFree(ID, D, [`#${ID}-shell`, `#${ID}-card`]);
  emit(ID, D, body, js);
}
