// g09: the two datasets as REAL frames (contrast). HERO card, two rows with the same anatomy:
// a real frame tile (tile-pusht.png, tile-aloha.png, cropped to the same 200x160 window) and its
// label. PUSH-T lands on "PUSH-T"; the divider and the ALOHA row are there dimmed from the first frame;
// ALOHA's name comes up on "ALOHA", its tile and sub-line on "arms". Side-by-side 260px tiles were
// tried on paper: the labels ("ALOHA INSERTION", "1 PUSHER, 2-D ACTION") do not fit under 252px tiles. One $accent rule sits under the name being spoken (fades
// out under PUSH-T, in under ALOHA). The tiles drift 1.00 -> 1.06 across the part.
import { C, emit, frames, panelClass, fg, dim, wipeUp } from "../lib.mjs";
import { T, EYEBROW, rowUp, show, cueRel, exitIfFree, HERO, f3 } from "../common.mjs";
import { fade } from "./_part2.mjs";

const ID = "g09";
const TW = 220, TH = 176;
// crop windows in source px: [srcW, srcH, cx, cy, shownH] -> the tile shows a shownH-tall window
// centred on (cx, cy). PUSH-T: the T, the pusher and the target outline. ALOHA: both grippers, the
// blue peg and the red socket (the black side bars of the render fall outside the window).
// tile-aloha-arms.png is PREPARED from tile-aloha.png with PIL (CSS filters are not render-safe): the
// window x 369-781, y 170-500 of the 1144x506 frame (both grippers, peg and socket), tone-preserving
// autocontrast and +20% brightness, upscaled 2x. Shown whole.
const CROP = { pusht: [856, 856, 384, 486, 448], aloha: [824, 660, 412, 330, 660] };
const tile = (id, file, key) => {
  const [sw, sh, cx, cy, shownH] = CROP[key], k = TH / shownH;
  const iw = sw * k, ih = sh * k, left = TW / 2 - cx * k, top = TH / 2 - cy * k;
  return `<div id="${id}" style="position:absolute;left:0;top:0;width:${TW}px;height:${TH}px;overflow:hidden;border-radius:6px;background:${C.ink}">
      <img id="${id}-im" src="assets/${file}" style="position:absolute;left:${f3(left)}px;top:${f3(top)}px;width:${f3(iw)}px;height:${f3(ih)}px;image-rendering:pixelated"/></div>`;
};

export default function build() {
  const D = frames(ID) / 30;
  const F = fg(ID), M = dim(ID);
  const tP = cueRel(ID, "pusht"), tA = cueRel(ID, "aloha"), tArms = cueRel(ID, "arms"), tFr = cueRel(ID, "freedom");
  const W = 592, H = 482, X = HERO.x, Y = HERO.y, LX = 28 + TW + 26;
  const ROWY = [64, 272], DIV_Y = 256;
  const row = (k, key, file, name, sub) => `
    <div id="${ID}-t${k}" style="position:absolute;left:28px;top:${ROWY[k]}px;width:${TW}px;height:${TH}px">${tile(`${ID}-tile${k}`, file, key)}
      <div style="position:absolute;inset:0;border:3px solid ${F};border-radius:6px"></div></div>
    ${T(name, LX, ROWY[k] + 22, 28, { weight: 900, color: F, id: `${ID}-n${k}` })}
    <div id="${ID}-s${k}" style="position:absolute;left:${LX}px;top:${ROWY[k] + 84}px;font-family:Satoshi,sans-serif;font-variation-settings:'wght' 700;font-size:22px;letter-spacing:0.10em;text-transform:uppercase;color:${M};white-space:nowrap">${sub}</div>`;

  const body = `
<div id="${ID}-card" class="${panelClass(ID)}" style="position:absolute;left:${X}px;top:${Y}px;width:${W}px;height:${H}px">
  ${EYEBROW("Two datasets", 28, 22, M, `${ID}-eb`)}
  ${row(0, "pusht", "tile-pusht.png", "PUSH-T", "1 pusher, 2-D action")}
  <div id="${ID}-div" style="position:absolute;left:28px;top:${DIV_Y}px;width:${W - 12 - 56}px;height:2px;background:${C.rule}"></div>
  ${row(1, "aloha", "tile-aloha-arms.png", "ALOHA INSERTION", "2 arms, 14 joints")}
  ${[0, 1].map(k => `<div id="${ID}-rule${k}" class="accentbar" style="position:absolute;left:${LX}px;top:${ROWY[k] + 62}px;width:96px;height:5px;border-radius:3px"></div>`).join("")}
</div>`;

  // everything is on the card from its first frame (review round 2): PUSH-T with its words, the
  // divider and the whole ALOHA row dimmed to 35%. ALOHA's name comes up on "ALOHA", tile and
  // sub-line on "arms". The accent rule fades out under PUSH-T and in under ALOHA (sliding it read
  // as a strike through "1 PUSHER").
  let js = wipeUp(`#${ID}-card`, 0, 0.35) + "\n";
  const at0 = (sel, o) => `tl.fromTo(${JSON.stringify(sel)},{opacity:${o}},{opacity:${o},duration:0.2,immediateRender:true},0);\n`;
  js += at0(`#${ID}-eb`, 1) + at0(`#${ID}-div`, 1) + at0(`#${ID}-t0`, 1) + at0(`#${ID}-n0`, 1) + at0(`#${ID}-s0`, 1);
  js += at0(`#${ID}-t1`, 0.35) + at0(`#${ID}-n1`, 0.35) + at0(`#${ID}-s1`, 0.35);
  js += `tl.fromTo("#${ID}-rule0",{scaleX:0,transformOrigin:"left center"},{scaleX:1,transformOrigin:"left center",duration:0.4,ease:"power2.out"},${f3(Math.max(0.3, tP + 0.3))});\n`;
  js += fade(`#${ID}-n1`, 0.35, 1, tA, 0.3) + fade(`#${ID}-rule0`, 1, 0, tA, 0.25);
  js += `tl.fromTo("#${ID}-rule1",{scaleX:0,transformOrigin:"left center"},{scaleX:1,transformOrigin:"left center",duration:0.4,ease:"power2.out"},${f3(tA + 0.15)});\n`;
  js += fade(`#${ID}-t1`, 0.35, 1, tArms, 0.3) + fade(`#${ID}-s1`, 0.35, 1, tArms, 0.3);
  js += `tl.fromTo("#${ID}-s1",{scale:1,transformOrigin:"left center"},{scale:1.08,transformOrigin:"left center",duration:0.3,yoyo:true,repeat:1,ease:"sine.inOut",immediateRender:false},${f3(tFr)});\n`;
  // the real frames drift slowly the whole time
  js += [0, 1].map(k => `tl.fromTo("#${ID}-tile${k}-im",{scale:1,transformOrigin:"50% 50%"},{scale:1.06,transformOrigin:"50% 50%",duration:${f3(D)},ease:"none",immediateRender:true},0);\n`).join("");
  js += exitIfFree(ID, D, [`#${ID}-card`]);
  emit(ID, D, body, js, ["tile-pusht.png", "tile-aloha-arms.png"]);
}
