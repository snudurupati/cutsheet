// g20: THE TURNING POINT (aha 5), the demo's one full-frame takeover. Paper page, dust, grain, the
// 1.00 -> 1.03 drift (takeoverScene, hard cut in and out). Contrast on the SAME axes: left PUSH-T's
// 206 real episode lengths, sorted (the sideways S, 49 to 246); right ALOHA, present but dimmed from
// the first full frame. '500': the right side lifts and a perfectly flat line draws at 500 with its
// 50 episodes on it, 500 at 160px under it. 'flat': the flat line turns accent. 'none': PUSH-T's two
// top dots (episodes 184 and 174) pulse once, then still; "no outliers" lands under the 500.
// Inside the scene, on paper: ink and muted, never the panel's fg (the panel class is opaque).
import { C, emit, frames } from "../lib.mjs";
import { mkdirSync, existsSync, copyFileSync } from "node:fs";
import { T, drawAll, rowUp, cueRel, takeoverScene, f3 } from "../common.mjs";

const ID = "g20";
// PushT episode lengths, sorted (lerobot/pusht meta/episodes, 206 episodes, 25,650 frames)
const PUSHT = [49, 56, 60, 64, 64, 65, 67, 67, 67, 68, 69, 69, 70, 71, 73, 73, 75, 75, 76, 78, 78, 78, 80, 80, 81, 82, 83, 83, 83, 84, 85, 86, 89, 89, 90, 90, 92, 92, 92, 92, 94, 94, 94, 95, 95, 96, 97, 97, 98, 98, 98, 99, 99, 100, 101, 102, 102, 103, 103, 103, 104, 104, 105, 105, 105, 105, 105, 105, 106, 107, 107, 107, 107, 109, 109, 109, 110, 111, 111, 112, 112, 112, 112, 113, 113, 114, 114, 115, 115, 115, 115, 116, 117, 117, 118, 118, 118, 118, 119, 120, 121, 121, 122, 122, 122, 123, 125, 125, 125, 125, 126, 126, 126, 127, 127, 130, 131, 131, 131, 133, 133, 133, 134, 134, 134, 136, 136, 137, 137, 137, 137, 138, 138, 139, 139, 139, 140, 140, 140, 141, 141, 141, 142, 142, 142, 143, 145, 145, 146, 146, 147, 148, 148, 148, 148, 149, 149, 150, 150, 150, 152, 152, 152, 153, 153, 154, 155, 155, 156, 157, 158, 159, 159, 159, 159, 160, 161, 161, 162, 165, 166, 167, 167, 167, 167, 169, 170, 171, 173, 176, 178, 183, 185, 186, 186, 186, 186, 188, 190, 193, 197, 204, 205, 205, 229, 246];

export default function build() {
  if (PUSHT.length !== 206 || PUSHT.reduce((a, b) => a + b, 0) !== 25650) throw new Error("g20: PushT lengths do not match 206 / 25,650");
  const D = frames(ID) / 30, INK = C.ink, MU = C.muted;
  const t500 = cueRel(ID, "500"), tFlat = cueRel(ID, "flat"), tNone = cueRel(ID, "none");
  const W = 1600, H = 900;
  const Y0 = 780, yv = v => Y0 - v * 520 / 500;        // the one ruler both sides share
  const L = [130, 740], R = [930, 1540];
  const axes = (x0, x1, id) => {
    let s = `<g id="${id}">`;
    for (let v = 0; v <= 500; v += 100) {
      s += `<line x1="${x0}" y1="${yv(v)}" x2="${x1}" y2="${yv(v)}" stroke="${C.rule}" stroke-width="2" ${v ? 'stroke-dasharray="6 8"' : ""}/>`;
      s += `<text x="${x0 - 16}" y="${yv(v) + 8}" text-anchor="end" font-family="Satoshi" style="font-variation-settings:'wght' 700" font-size="26" fill="${MU}">${v}</text>`;
    }
    s += `<line x1="${x0}" y1="${yv(0)}" x2="${x0}" y2="${yv(540)}" stroke="${MU}" stroke-width="3" stroke-linecap="round"/>`;
    s += `<line x1="${x0}" y1="${yv(0)}" x2="${x1}" y2="${yv(0)}" stroke="${MU}" stroke-width="3" stroke-linecap="round"/></g>`;
    return s;
  };
  const px = i => L[0] + 14 + i * (L[1] - L[0] - 28) / 205;
  const dotsL = PUSHT.map((v, i) => `<circle id="${ID}-p${i}" cx="${f3(px(i))}" cy="${f3(yv(v))}" r="5" fill="${INK}"/>`).join("");
  const ax = i => R[0] + 14 + i * (R[1] - R[0] - 28) / 49;
  const dotsR = [...Array(50).keys()].map(i => `<circle cx="${f3(ax(i))}" cy="${yv(500)}" r="4.5" fill="${INK}"/>`).join("");
  const lab = (x, y, s, opts = {}) => T(s, x, y, opts.size || 24, { weight: 700, color: opts.color || MU, ...opts });

  const inner = `
    <svg id="${ID}-div" style="position:absolute;left:798px;top:40px" width="4" height="820"><line x1="2" y1="0" x2="2" y2="820" stroke="${C.rule}" stroke-width="3"/></svg>
    ${T("PUSH-T", L[0], 40, 40, { weight: 900, color: INK, ls: 0.12 })}
    ${T("206 episodes, sorted by length", L[0], 94, 28, { weight: 500, color: MU })}
    <svg style="position:absolute;left:0;top:0;overflow:visible" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      ${axes(L[0], L[1], `${ID}-axL`)}
      <g id="${ID}-dL">${dotsL}</g>
    </svg>
    ${lab(L[0] + 34, yv(49) + 10, "49", { color: INK, id: `${ID}-l49` })}
    ${lab(L[1] - 108, yv(246) - 14, "246", { color: INK, id: `${ID}-l246` })}
    ${T("49 to 246 frames", L[0] + 40, 300, 44, { weight: 900, color: INK, id: `${ID}-rng` })}
    ${T("average about 124", L[0] + 40, 356, 28, { weight: 500, color: MU, id: `${ID}-avg` })}
    ${T("outliers: episodes 184 and 174", L[1] - 10, yv(246) - 124, 26, { weight: 700, color: INK, id: `${ID}-out` })}
    ${T("frames per episode", L[0] - 110, 852, 22, { weight: 700, color: MU, ls: 0.1, upper: true })}
    <div id="${ID}-R" style="position:absolute;left:0;top:0;width:${W}px;height:${H}px">
      ${T("ALOHA", R[0], 40, 40, { weight: 900, color: INK, ls: 0.12 })}
      ${T("50 episodes, sorted by length", R[0], 94, 28, { weight: 500, color: MU })}
      <svg style="position:absolute;left:0;top:0;overflow:visible" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
        ${axes(R[0], R[1], `${ID}-axR`)}
        <line id="${ID}-flat" class="dr" pathLength="1" x1="${R[0] + 6}" y1="${yv(500)}" x2="${R[1] - 6}" y2="${yv(500)}" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
        <g id="${ID}-dR">${dotsR}</g>
      </svg>
      <div id="${ID}-500" style="position:absolute;left:${(R[0] + R[1]) / 2 - 200}px;top:${yv(500) + 60}px;width:400px;text-align:center;font-family:Satoshi,sans-serif;font-variation-settings:'wght' 900;font-size:160px;line-height:1;color:${INK}">500</div>
      ${T("frames, every episode", (R[0] + R[1]) / 2 - 200, yv(500) + 252, 32, { w: 400, align: "center", weight: 700, color: MU, id: `${ID}-every` })}
      ${T("no outliers", (R[0] + R[1]) / 2 - 200, yv(500) + 304, 40, { w: 400, align: "center", weight: 900, color: INK, id: `${ID}-none` })}
    </div>`;
  // the outliers label is anchored by its RIGHT edge so it ends at the top dots
  const TK = takeoverScene(ID, D, W, H, inner.replace(`left:${L[1] - 10}px;top:${yv(246) - 124}px;white-space:nowrap;`, `right:${W - L[1] + 10}px;top:${yv(246) - 124}px;white-space:nowrap;`));
  // No content drift on this part. Measured on the render: the 1.00 -> 1.03 scale moved the type in
  // whole-pixel steps (centroid jitter up to 2.7px at 4K between 0.1s samples, still 1.8px with
  // will-change), and style.md asks for the drift only on takeovers of 20s or longer (this is 14.9s).
  // The dust, grain and the chart's own animation keep every frame moving.
  if (!TK.js.includes("scale:1.03")) throw new Error("g20: takeoverScene drift not found");
  let js = TK.js.replace(/\{scale:1\.03,/, "{scale:1,");
  // the page lands whole on the cut: divider, both axes, PUSH-T's curve sorting itself in left to
  // right, ALOHA present at 30% so the frame is never half empty
  js += `tl.fromTo("#${ID}-div",{clipPath:"inset(0 0 100% 0)"},{clipPath:"inset(0 0 0% 0)",duration:0.5,ease:"power2.out"},0.05);\n`;
  js += `tl.fromTo("#${ID}-R",{opacity:0.3},{opacity:0.3,duration:0.2,immediateRender:true},0);\n`;
  // ALOHA's 50 episodes sit at 500 from the first frame, dimmed further (~20% overall), so the right
  // half is never empty (composition review 2026-10-28); on '500' they lift to ink and the line joins them
  js += `tl.fromTo("#${ID}-dR",{opacity:0.65},{opacity:0.65,duration:0.2,immediateRender:true},0);\n`;
  js += `tl.fromTo("#${ID}-dL circle",{attr:{r:0}},{attr:{r:5},duration:0.25,ease:"back.out(2)",stagger:0.009},0.35);\n`;
  js += rowUp(`#${ID}-l49`, 0.5) + rowUp(`#${ID}-l246`, 2.3) + rowUp(`#${ID}-rng`, 2.5) + rowUp(`#${ID}-avg`, 2.9);
  // '500': ALOHA lifts, the flat line draws with its 50 episodes, 500 lands
  js += `tl.fromTo("#${ID}-R",{opacity:0.3},{opacity:1,duration:0.35,ease:"power2.out",immediateRender:false},${f3(t500 - 0.15)});\n`;
  js += `tl.fromTo("#${ID}-dR",{opacity:0.65},{opacity:1,duration:0.35,immediateRender:false},${f3(t500 - 0.15)});\n`;
  js += `tl.fromTo("#${ID}-dR circle",{attr:{r:4.5}},{attr:{r:7},duration:0.18,yoyo:true,repeat:1,ease:"power2.out",stagger:0.012,immediateRender:false},${f3(t500)});\n`;
  js += drawAll(`#${ID}-flat`, t500, 0.6);
  js += `tl.fromTo("#${ID}-500",{opacity:0,y:20},{opacity:1,y:0,duration:0.4,ease:"power3.out"},${f3(t500 + 0.1)});\n`;
  js += rowUp(`#${ID}-every`, t500 + 0.5);
  // 'flat': the line takes the scene's one accent
  // (its 50 episode dots are part of the line: they turn with it, or the ink dots hide the accent)
  js += `tl.fromTo("#${ID}-flat",{stroke:"${INK}"},{stroke:"${C.accent}",duration:0.3,immediateRender:false},${f3(tFlat)});\n`;
  js += `tl.fromTo("#${ID}-dR circle",{fill:"${INK}"},{fill:"${C.accent}",duration:0.3,immediateRender:false},${f3(tFlat)});\n`;
  // 'none': PUSH-T's two top dots pulse once, then still; ALOHA has none
  js += `tl.fromTo(["#${ID}-p204","#${ID}-p205"],{attr:{r:5}},{attr:{r:13},duration:0.3,yoyo:true,repeat:1,ease:"power2.out",immediateRender:false},${f3(tNone)});\n`;
  js += rowUp(`#${ID}-out`, tNone + 0.1);
  js += rowUp(`#${ID}-none`, tNone + 0.3);
  // hard cut back to the screen: no exit
  emit(ID, D, TK.body, js);
  // grain.png is not in this job's assets/ yet: the series' tile from 01, straight into the part (as g02)
  const src = "assets/grain.png", dst = `parts/${ID}/assets/grain.png`;
  mkdirSync(`parts/${ID}/assets`, { recursive: true });
  if (!existsSync(dst)) copyFileSync(src, dst);
}
