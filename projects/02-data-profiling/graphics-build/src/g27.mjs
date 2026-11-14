// g27: call to action chip (template part; the shape every src/<id>.mjs follows).
// Plan: 'WHAT ELSE DO YOU CHECK?'; a drawn speech bubble with three dashes writing on 'comment'.
// Light-reinforced panel (panels.json), heroLeft. No em-dashes.
// Composition review 2026-10-28, applied: g26 hands off on this part's first frame, so the card is
// THERE on frame 0 at g26's rect (x48 y48 592x492) and only its contents swap in (as g05 -> g06);
// the headline lands with the card (no 4s empty card), then the card shrinks to its own height over
// 0.4s. The bubble outline draws on 'tell'; its three dashes write on 'comment'.
import { C, emit, frames, panelClass, fg, dim, wipeUp, wipeDown, exitAt } from "../lib.mjs";
import { g26EndState } from "./_close.mjs";
import { T, EYEBROW, rowUp, show, drawAll, loop, cueRel, exitIfFree, HERO, f3 } from "../common.mjs";

const ID = "g27";
export default function build() {
  const D = frames(ID) / 30;
  const tTell = cueRel(ID, "tell"), tComment = cueRel(ID, "comment");
  const F = fg(ID), M = dim(ID);
  const W = 592, H = 350, H0 = 492, X = HERO.x, Y = HERO.y;   // H0: g26's card height (src/_close.mjs CARD)

  const out = g26EndState(ID);
  const body = `
<div id="${ID}-card" class="${panelClass(ID)}" style="position:absolute;left:${X}px;top:${Y}px;width:${W}px;height:${H0}px;overflow:hidden">
  ${out.html}
  ${EYEBROW("Your turn", 40, 36, M, `${ID}-eb`)}
  ${T("What else do you check?", 40, 84, 56, { w: 512, weight: 900, color: F, id: `${ID}-q`, lh: 1.05 })}
  <svg id="${ID}-bub" style="position:absolute;left:40px;top:${H - 114}px;overflow:visible" width="220" height="90" viewBox="0 0 220 90">
    <path class="dr" pathLength="1" d="M14,8 H200 Q212,8 212,20 V56 Q212,68 200,68 H70 L46,86 L50,68 H14 Q2,68 2,56 V20 Q2,8 14,8 Z"
          fill="none" stroke="${F}" stroke-width="3" stroke-linejoin="round"/>
    ${[0, 1, 2].map(i => `<line id="${ID}-d${i}" class="dr" pathLength="1" x1="${30 + i * 56}" y1="38" x2="${66 + i * 56}" y2="38" stroke="${i === 0 ? C.accent : F}" stroke-width="5" stroke-linecap="round"/>`).join("")}
  </svg>
  ${T("Tell me in the comments.", 272, H - 96, 26, { w: 240, lh: 1.2, weight: 500, color: M, id: `${ID}-sub` })}
</div>`;

  let js = "";
  // hand-off from g26: the card is present on frame 0 in g26's rect; contents swap in, then it shrinks
  js += `tl.fromTo("#${ID}-card",{opacity:1},{opacity:1,duration:0.2,immediateRender:true},0);\n`;
  // the swap (review round 3): g26's last frame fades out over 0.25s while this part's eyebrow and
  // headline fade in and the shell shrinks over 0.4s, so the card is never two-thirds empty
  js += out.js + `tl.fromTo("#${ID}-out",{opacity:1},{opacity:0,duration:0.25,ease:"power1.inOut",immediateRender:true},0);\n`;
  js += `tl.fromTo("#${ID}-eb, #${ID}-q",{opacity:0,y:8},{opacity:1,y:0,duration:0.3,ease:"power2.out",immediateRender:true},0.05);\n`;
  js += `tl.fromTo("#${ID}-card",{height:${H0}},{height:${H},duration:0.4,ease:"power2.inOut",immediateRender:false},0.05);\n`;
  js += drawAll(`#${ID}-bub path`, tTell, 0.5);                 // the bubble outline on 'tell' (review 2026-10-28)
  [0, 1, 2].forEach(i => { js += drawAll(`#${ID}-d${i}`, tComment + 0.35 + i * 0.4, 0.35); });
  js += rowUp(`#${ID}-sub`, tComment + 0.5);
  // continuous motion: the bubble breathes until the card leaves
  js += loop(`#${ID}-bub`, "scale", 1, 1.03, tComment + 1.8, D - 0.4, 1.6);
  js += exitIfFree(ID, D, [`#${ID}-card`]);
  emit(ID, D, body, js);
}
