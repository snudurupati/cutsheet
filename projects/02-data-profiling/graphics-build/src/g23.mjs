// g23: aha 7, self-demonstrating. ALOHA as two SO-101-style line-art arms facing each other, with all
// 14 joint rings (the six the video names carry their dataset numbers) (left arm 0-6: waist, shoulder, elbow, forearm
// roll, wrist angle, wrist rotate, gripper; right arm 7-13 the same). The arms work for the whole
// part, and they work HONESTLY: only the in-plane joints visibly bend (shoulder a little, elbow and
// wrist angle most), the forearm rolls and grippers never move, so the busy joints are the ones you
// see moving. 'busiest': rings 2, 4, 9, 11 light. 'steady': rings 6 and 13 dim (the data and the notebook on screen say 6 and 13; he says "six and three"), each with a flat
// still bar inside, "6, 13 STEADY" between them. Then each named joint pulses on its word with its legend row
// (only the current ring $accent): LEFT ELBOW, LEFT WRIST ANGLE, RIGHT ELBOW, RIGHT WRIST ANGLE.
// 'elbows': 2, 4, 9, 11 pulse together; 'fine': SPREAD ACROSS JOINTS. FINE. with a tick, then exit.
// What moves when (54.7s): both arms bend continuously from frame 0 (left and right out of phase).
import { C, emit, frames, panelClass, fg, dim, wipeUp } from "../lib.mjs";
import { T, EYEBROW, rowUp, drawAll, cueRel, exitIfFree, f3 } from "../common.mjs";
import { POS, CW, CH, chg } from "./_demo2.mjs";

const ID = "g23";
// left arm joints, card-local px; the right arm mirrors about x = 264
const J = [[44, 352], [44, 298], [82, 148], [126, 156], [170, 164], [202, 186], [228, 210]];
const MX = 264, RR = 20;
const NUMBERED = [2, 4, 6, 9, 11, 13];

export default function build() {
  const D = frames(ID) / 30, F = fg(ID), M = dim(ID), INK = C.ink;
  const c = k => cueRel(ID, k);
  const tBusy = c("busiest"), tSteady = c("steady");
  const NAMED = [[2, "LEFT ELBOW", c("lelbow")], [4, "LEFT WRIST ANGLE", c("lwrist")],
                 [9, "RIGHT ELBOW", c("relbow")], [11, "RIGHT WRIST ANGLE", c("rwrist")]];

  const s = `stroke="${F}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"`;
  // a link between two joints: a rounded bar (SO-101 style), filled with the card so rings sit on it
  const link = ([x1, y1], [x2, y2], w) => {
    const L = Math.hypot(x2 - x1, y2 - y1), a = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    return `<rect x="${f3(x1 - w / 2)}" y="${f3(y1 - w / 2)}" width="${f3(L + w)}" height="${w}" rx="${w / 2}" fill="${INK}" ${s} transform="rotate(${f3(a)} ${x1} ${y1})"/>`;
  };
  // only the six joints the video names carry a numeral (composition review 2026-10-28: numerals in
  // all 14 rings rendered ~15px): 20px-radius rings with 24px numerals; the other eight are small
  // plain rings
  const ring = (n, [x, y]) => {
    const big = NUMBERED.includes(n), rr = big ? RR : 9;
    return `<g id="${ID}-j${n}"><circle id="${ID}-r${n}" cx="${x}" cy="${y}" r="${rr}" fill="${INK}" stroke="${M}" stroke-width="3"/>
    ${big ? `<text id="${ID}-t${n}" x="${x}" y="${y + 8.5}" text-anchor="middle" font-family="Satoshi" style="font-variation-settings:'wght' 800" font-size="24" fill="${F}">${n}</text>` : ""}
    ${n === 6 || n === 13 ? `<line id="${ID}-sb${n}" x1="${x - 7}" y1="${y + 13}" x2="${x + 7}" y2="${y + 13}" stroke="${M}" stroke-width="3" stroke-linecap="round" opacity="0"/>` : ""}</g>`;
  };
  // one arm, built for the left and mirrored for the right; nested groups so the elbow rides the
  // shoulder and the wrist rides the elbow (rotations by svgOrigin in each group's own space)
  const arm = (side) => {
    const o = side === "L" ? 0 : 7;
    const jaw = `M${J[6][0] + 18},${J[6][1] - 4} L${J[6][0] + 30},${J[6][1] - 4} M${J[6][0] + 15},${J[6][1] + 11} L${J[6][0] + 27},${J[6][1] + 16}`;
    const g = `<g id="${ID}-${side}">
      <rect x="10" y="370" width="70" height="20" rx="5" fill="${INK}" ${s}/>
      ${link(J[0], [J[0][0], J[0][1] + 18], 30)}
      ${link(J[0], J[1], 26)}
      <g id="${ID}-${side}sh">
        ${link(J[1], J[2], 24)}
        <g id="${ID}-${side}el">
          ${link(J[2], J[4], 22)}
          <g id="${ID}-${side}wr">
            ${link(J[4], J[5], 18)}${link(J[5], J[6], 18)}
            <path d="${jaw}" fill="none" stroke="${F}" stroke-width="5" stroke-linecap="round"/>
            ${ring(o + 5, J[5])}${ring(o + 6, J[6])}
          </g>
          ${ring(o + 3, J[3])}${ring(o + 4, J[4])}
        </g>
        ${ring(o + 2, J[2])}
      </g>
      ${ring(o + 1, J[1])}${ring(o + 0, J[0])}
    </g>`;
    // mirror the right arm: flip the geometry, then un-flip each number so it reads
    if (side === "L") return g;
    return `<g transform="translate(${2 * MX},0) scale(-1,1)">${g.replace(/<text ([^>]*)x="([\d.]+)"([^>]*)>/g, (m, a, x, b) => `<text ${a}x="${x}"${b} transform="translate(${2 * x},0) scale(-1,1)">`)}</g>`;
  };

  const legend = NAMED.map(([n, name], k) =>
    T(`<span style="display:inline-block;width:40px">${n}</span>${name}`, 112, 266 + k * 28, 22, { weight: 700, color: F, ls: 0.06, id: `${ID}-lg${n}` })).join("");
  const inner = `
    ${EYEBROW("ALOHA, 14 joints", 24, 20, M, `${ID}-eb`)}
    <svg style="position:absolute;left:0;top:0;overflow:visible" width="528" height="428" viewBox="0 0 528 428">${arm("L")}${arm("R")}</svg>
    ${legend}
    ${T("6, 13 STEADY", MX - 90, 240, 20, { w: 180, align: "center", weight: 700, color: M, ls: 0.08, id: `${ID}-st` })}
    <svg id="${ID}-fk" style="position:absolute;left:74px;top:390px;overflow:visible" width="28" height="28" viewBox="0 0 28 28"><path class="dr" pathLength="1" d="M3,15 L11,23 L25,5" fill="none" stroke="${C.accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>
    ${T("SPREAD ACROSS JOINTS. FINE.", 108, 390, 24, { weight: 700, color: F, ls: 0.06, id: `${ID}-fine` })}`;
  const body = `<div id="${ID}-card" class="${panelClass(ID)}" style="position:absolute;left:${POS.x}px;top:${POS.y}px;width:${CW}px;height:${CH}px">${inner}</div>`;

  let js = "";
  js += wipeUp(`#${ID}-card`, 0, 0.35);
  js += rowUp(`#${ID}-eb`, 0.15);
  // the rings come up in joint order, 0.05s apart, as the card lands
  js += `tl.fromTo("#${ID}-card g[id^='${ID}-j']",{opacity:0},{opacity:1,duration:0.25,stagger:0.05},0.4);\n`;
  // the arms work, lifting only from the rest pose (so the jaws never swing into the legend):
  // shoulder 5deg, elbow 10deg, wrist angle 16deg, sine, the right arm half a cycle off
  const P = 3.2, n = Math.max(1, Math.floor((D - 0.6) / P));
  const bend = (side, part, [x, y], deg, lag) =>
    `tl.fromTo("#${ID}-${side}${part}",{rotation:0,svgOrigin:"${x} ${y}"},{rotation:${-deg},svgOrigin:"${x} ${y}",duration:${P / 2},ease:"sine.inOut",yoyo:true,repeat:${2 * n - 1},immediateRender:true},${f3(0.6 + lag)});\n`;
  ["L", "R"].forEach((side, k) => {
    const lag = k * P / 2;
    js += bend(side, "sh", J[1], 5, lag) + bend(side, "el", J[2], 10, lag + 0.25) + bend(side, "wr", J[4], 16, lag + 0.5);
  });
  // 'busiest': 2, 4, 9, 11 light (fill fg, number ink)
  [2, 4, 9, 11].forEach((j, k) => {
    js += chg(`#${ID}-r${j}`, `{fill:"${INK}",stroke:"${M}"}`, `{fill:"${F}",stroke:"${F}"}`, tBusy + k * 0.12);
    js += chg(`#${ID}-t${j}`, `{fill:"${F}"}`, `{fill:"${INK}"}`, tBusy + k * 0.12);
    js += `tl.fromTo("#${ID}-r${j}",{attr:{r:${RR}}},{attr:{r:${RR + 5}},duration:0.2,yoyo:true,repeat:1,ease:"power2.out",immediateRender:false},${f3(tBusy + k * 0.12)});\n`;
  });
  // "steady": 6 and 13 dim (by colour, not opacity, so the jaws behind never show through) and
  // carry a flat still bar inside, under the numeral; "6, 13 STEADY" sits between them
  [6, 13].forEach((j, k) => {
    js += chg(`#${ID}-r${j}`, `{stroke:"${M}"}`, `{stroke:"#5A544D"}`, tSteady + k * 0.15);
    js += chg(`#${ID}-t${j}`, `{fill:"${F}"}`, `{fill:"${M}"}`, tSteady + k * 0.15);
    js += `tl.fromTo("#${ID}-sb${j}",{opacity:0},{opacity:1,duration:0.3},${f3(tSteady + k * 0.15)});\n`;
  });
  js += rowUp(`#${ID}-st`, tSteady + 0.2);
  // each named joint on its word: ring to accent (the previous one back to fg), pulse, legend row
  NAMED.forEach(([j, , t], k) => {
    js += chg(`#${ID}-r${j}`, `{fill:"${F}",stroke:"${F}"}`, `{fill:"${C.accent}",stroke:"${C.accent}"}`, t, 0.25);
    js += `tl.fromTo("#${ID}-r${j}",{attr:{r:${RR}}},{attr:{r:${RR + 7}},duration:0.25,yoyo:true,repeat:1,ease:"power2.out",immediateRender:false},${f3(t)});\n`;
    js += rowUp(`#${ID}-lg${j}`, t);
    if (k) { const p = NAMED[k - 1][0];
      js += chg(`#${ID}-r${p}`, `{fill:"${C.accent}",stroke:"${C.accent}"}`, `{fill:"${F}",stroke:"${F}"}`, t, 0.25); }
  });
  // 'elbows': "the elbows and the wrists on both directions are doing a lot of work": the four light
  // together (11 gives up the accent; the four pulse as one)
  const tEl = c("elbows"), tFine = c("fine");
  js += chg(`#${ID}-r11`, `{fill:"${C.accent}",stroke:"${C.accent}"}`, `{fill:"${F}",stroke:"${F}"}`, tEl, 0.25);
  js += `tl.fromTo(["#${ID}-r2","#${ID}-r4","#${ID}-r9","#${ID}-r11"],{attr:{r:${RR}}},{attr:{r:${RR + 7}},duration:0.3,yoyo:true,repeat:1,ease:"power2.out",immediateRender:false},${f3(tEl)});\n`;
  // 'fine': the aha's resolution, a closing line with a tick (the one accent), then the card leaves
  js += rowUp(`#${ID}-fine`, tFine);
  js += drawAll(`#${ID}-fk path`, tFine + 0.15, 0.35);
  js += exitIfFree(ID, D, [`#${ID}-card`]);
  emit(ID, D, body, js);
}
