// g29: end card, links from brand.md (`links` in its JSON block), beside the face in HERO.
// No channel is named in the closing lines, so every row takes brand.md's noCueFallback and they all
// land together across "see you next week" (0.18s apart, the last one by 'week'). Anatomy from
// 05/01 (ref-01-build.mjs g21): the channel NAME as a small tracked eyebrow, uniform rows of label
// (24px $muted) over value (32px ink), one $accent rule under the first row, the card growing as each
// row lands and each row revealed top-down once the card has room.
// Rows are 80px (01 used 92) so all five fit inside HERO's 492px; the channel name is 22px rather than
// the 28px eyebrow because 'AI FOR THE WORKING DATA ENGINEER' at 28px tracked caps is wider than the
// card. This part ends the video (cutsheet end = totalSeconds, ~2.6s after "week"), so the card holds
// to the last frame with no exit wipe.
import { C, emit, frames, panelClass, fg, dim, wipeUp } from "../lib.mjs";
import { T, ruleIn, cueRel, f3, BRAND, planPart } from "../common.mjs";
import { readFileSync } from "node:fs";

const ID = "g29";
const X = 48, TOP = 48, W = 592, PAD = 30, RH = 80, HEAD = 62;
const Hn = n => HEAD + n * RH + 20;

const cueWord = (word, nth = 0) => {
  const p = planPart(ID);
  const ws = JSON.parse(readFileSync("../outputs/transcript-cut.json", "utf8")).words
    .filter(w => "start" in w && w.start >= p.start - 0.05 && w.start < p.end && w.word.toLowerCase().replace(/[^a-z]/g, "") === word);
  if (!ws[nth]) throw new Error(`${ID}: no "${word}" #${nth} inside the part`);
  return +(ws[nth].start - p.start).toFixed(3);
};

export default function build() {
  const D = frames(ID) / 30;
  const tSee = cueWord("see"), tWeek = cueWord("week");
  const F = fg(ID), M = dim(ID);
  const links = BRAND.links.filter(l => l.id);
  if (Hn(links.length) > 492) throw new Error(`${ID}: card ${Hn(links.length)}px tall, past HERO's 492`);
  const T0 = Math.max(0.05, tSee - 0.3);
  const step = Math.min(0.18, (tWeek - tSee) / Math.max(1, links.length - 1));
  const at = links.map((_, k) => tSee + k * step);
  const INNER = W - 12 - 2 * PAD;

  const body = `
<div id="${ID}-c" class="${panelClass(ID)}" style="position:absolute;left:${X}px;top:${TOP}px;width:${W}px;height:${Hn(0)}px;overflow:hidden">
  ${T(BRAND.channel.name, PAD, 26, 22, { weight: 700, color: M, ls: 0.12, upper: true, id: `${ID}-eb` })}
  ${links.map((l, k) => `<div id="${ID}-r${k}" style="position:absolute;left:${PAD}px;top:${HEAD + k * RH}px;width:${INNER}px;height:${RH - 4}px">
    ${T(l.label, 0, 0, 24, { weight: 500, color: M, id: `${ID}-l${k}` })}${T(l.value, 0, 28, 32, { weight: 700, color: F, id: `${ID}-v${k}` })}
    ${k === 0 ? `<div id="${ID}-rule" class="accentbar" style="position:absolute;left:0;top:${RH - 7}px;width:220px;height:3px"></div>` : ""}</div>`).join("")}
</div>`;

  let js = wipeUp(`#${ID}-c`, T0, 0.3) + "\n";
  // one growth across the rows' span (the rows land 0.13s apart, closer than a 0.3s grow per row)
  const nL = links.length, grow = at[nL - 1] - at[0] + 0.3;
  js += `tl.fromTo("#${ID}-c",{height:${Hn(0)}},{height:${Hn(nL)},duration:${f3(grow)},ease:"power1.out",immediateRender:true},${f3(at[0])});\n`;
  links.forEach((_, k) => {
    // each row is revealed once the growing card has reached its bottom edge
    const need = (HEAD + (k + 1) * RH - Hn(0)) / (Hn(nL) - Hn(0)), u = 1 - Math.sqrt(1 - Math.min(1, need));   // power1.out inverse
    const tRow = Math.max(at[k], at[0] + u * grow - 0.12);
    js += `tl.fromTo("#${ID}-r${k}",{clipPath:"inset(0 0 100% 0)"},{clipPath:"inset(0 0 0% 0)",duration:0.3,ease:"power3.out",immediateRender:true},${f3(tRow)});\n`;
  });
  js += ruleIn(`#${ID}-rule`, at[0] + 0.4);
  emit(ID, D, body, js);
}
