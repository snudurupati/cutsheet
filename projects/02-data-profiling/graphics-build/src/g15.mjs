// g15: check C can't fail (aha 2). Opaque card over the notebook, right strip.
// Chips FRAME INDEX / TIMESTAMP / FPS land on their words. On "real" the equation
// timestamp = frame_index / fps draws and a loop arrow closes from the result back to frame_index:
// the check compares a number with itself. On "recorder" a recorder glyph stamps the timestamps;
// on "calculated" the "=" turns accent. On "salt" a salt shaker tips once. No strike: the check
// passes, it just cannot see.
// Composition review 2026-10-28: the checks DO match ("it looks like these things match up"), so
// MATCHES lands with a 5px paper tick (g14's KEEP THEM weight) on "match"; the card holds throughout.
// Motion: from "real" a pulse runs the loop arrow; from "recorder" the recorder's reels turn.
import { C, emit, frames, panelClass, fg, dim, wipeUp } from "../lib.mjs";
import { T, EYEBROW, rowUp, show, cueRel, exitIfFree, f3 } from "../common.mjs";
import { drawIn, slides, stepCard } from "./_demo1.mjs";

const ID = "g15";
const POS = { x: 1340, y: 56 };
export default function build() {
  const D = frames(ID) / 30;
  const c = k => cueRel(ID, k);
  const F = fg(ID), M = dim(ID);
  const W = 540, H = 440;

  // chips: widths from PIL at 22px 700 + 0.1em tracking (172 / 145 / 46) + padding and border
  const CH = [["frame", "Frame index", 24, 204], ["timestamp", "Timestamp", 240, 178], ["fps", "FPS", 430, 80]];
  const chips = CH.map(([k, txt, x, w]) => `<div id="${ID}-c-${k}" style="position:absolute;left:${x}px;top:64px;width:${w}px;height:42px;border:2.5px solid ${F};border-radius:21px;display:flex;align-items:center;justify-content:center;font-family:Satoshi,sans-serif;font-variation-settings:'wght' 700;font-size:22px;letter-spacing:0.1em;text-transform:uppercase;color:${F}">${txt}</div>`).join("");

  // equation, 32px 700; token x from PIL: "timestamp" 0-156, "frame_index" 195-379, total 454
  const EX = 24, EY = 168;
  const eq = `<div id="${ID}-eq" style="position:absolute;left:${EX}px;top:${EY}px;white-space:nowrap;font-family:Satoshi,sans-serif;font-variation-settings:'wght' 700;font-size:32px;line-height:1.12;color:${F}">timestamp <span id="${ID}-eqs" style="color:${F}">=</span> frame_index / fps</div>`;
  // review round 3: a clear return loop (down from the result, along, back up), not a smile; the
  // arrowhead touches the bottom of frame_index (its glyphs end ~y 204)
  const aX0 = EX + 78, aX1 = EX + 195 + 92, aY = 207, aB = 246;
  const arrowD = `M${aX0},${aY + 4} V${aB - 14} Q${aX0},${aB} ${aX0 + 14},${aB} H${aX1 - 14} Q${aX1},${aB} ${aX1},${aB - 14} V${aY + 2}`;
  const arrow = `<svg id="${ID}-arr" style="position:absolute;left:0;top:0;overflow:visible" width="${W}" height="240" viewBox="0 0 ${W} 240">
    <path class="dr" pathLength="1" opacity="0" d="${arrowD}" fill="none" stroke="${M}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path id="${ID}-arrp" class="pl" pathLength="1" d="${arrowD}" fill="none" stroke="${F}" stroke-width="4" stroke-linecap="round" opacity="0"/>
    <path id="${ID}-head" class="dr" pathLength="1" opacity="0" d="M${aX1 - 10},${aY + 11} L${aX1},${aY} L${aX1 + 10},${aY + 11}" fill="none" stroke="${M}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
  // MATCHES row: the check passes. 30px 900 caps (159 wide, PIL) and a 5px tick, as g14's KEEP THEM
  const match = `<div id="${ID}-m" style="position:absolute;left:24px;top:120px;width:500px;height:40px">
    <div style="position:absolute;left:0;top:2px;font-family:Satoshi,sans-serif;font-variation-settings:'wght' 900;font-size:30px;line-height:1.1;letter-spacing:.06em;color:${F};white-space:nowrap">MATCHES</div>
    <svg style="position:absolute;left:172px;top:0;overflow:visible" width="44" height="40" viewBox="0 0 44 40"><path id="${ID}-mt" class="dr" pathLength="1" opacity="0" d="M4,20 L16,33 L40,5" fill="none" stroke="${F}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    ${T("the three agree", 236, 8, 22, { weight: 500, color: M })}</div>`;

  // recorder glyph: a tape recorder, two reels that turn once it lands
  const rs = `stroke="${F}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
  const reel = (k, cx) => `<g id="${ID}-reel${k}"><circle cx="${cx}" cy="26" r="13" fill="none" ${rs}/><path d="M${cx},16 V36 M${cx - 9},21 L${cx + 9},31 M${cx - 9},31 L${cx + 9},21" fill="none" stroke="${F}" stroke-width="2.5" stroke-linecap="round"/></g>`;
  const rec = `<svg id="${ID}-rec" style="position:absolute;left:24px;top:296px;overflow:visible" width="92" height="64" viewBox="0 0 92 64">
    <rect x="2" y="4" width="88" height="56" rx="8" fill="none" ${rs}/>${reel(0, 26)}${reel(1, 66)}
    <path d="M26,48 H66" fill="none" ${rs}/></svg>`;

  // salt shaker, its own space under the recorder lines (~72px tall): tips once on "salt" to the
  // left into empty card, three grains fall; "a grain of salt" beside it
  const ss = `stroke="${F}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"`;
  const salt = `<svg id="${ID}-salt" style="position:absolute;left:300px;top:354px;overflow:visible" width="48" height="72" viewBox="0 0 64 96">
    <g id="${ID}-shk"><path d="M14,40 L10,90 H54 L50,40 Z" fill="none" ${ss}/><path d="M14,40 Q14,16 32,16 Q50,16 50,40 Z" fill="none" ${ss}/>
      <circle cx="26" cy="27" r="2" fill="${F}"/><circle cx="32" cy="23" r="2" fill="${F}"/><circle cx="38" cy="27" r="2" fill="${F}"/></g>
    ${[0, 1, 2].map(i => `<circle id="${ID}-gr${i}" cx="${-8 - i * 6}" cy="${40 + (i % 2) * 5}" r="2.5" fill="${F}" opacity="0"/>`).join("")}</svg>`;

  // review 2026-10-28: the card was two-thirds empty until "real"; it now builds in steps, chips and
  // MATCHES first (184px), growing to its full 440 as the equation lands
  const tR0 = c("real");
  const step = stepCard(`#${ID}-card`, `${ID}-fb`, W, H, 184, tR0 - 0.35);
  const body = `
<div id="${ID}-w" style="position:absolute;left:0;top:0;width:1920px;height:1080px">
<div id="${ID}-card" class="${panelClass(ID)}" style="position:absolute;left:${POS.x}px;top:${POS.y}px;width:${W}px;height:${H}px">
  ${EYEBROW("Check C: frame timing", 24, 18, M, `${ID}-eb`)}
  ${chips}${match}${eq}${arrow}
  ${rec}
  ${T("recorder writes the timestamps", 128, 298, 22, { weight: 500, color: F, id: `${ID}-l1` })}
  ${T("frame index is calculated too", 128, 330, 22, { weight: 500, color: F, id: `${ID}-l2` })}
  ${salt}
  ${T("a grain of salt", 366, 386, 22, { weight: 500, color: M, id: `${ID}-sl` })}
  ${step.html}
</div></div>`;

  const tF = c("frame"), tT = c("timestamp"), tP = c("fps"), tR = c("real"), tRec = c("recorder"), tCal = c("calculated"), tS = c("salt");
  let js = "";
  const tMatch = 941.8 - 928.3333;   // "these things match up" (transcript-cut.json); 937.1 is the question
  js += slides(`#${ID}-w`, [[0, null]]) + step.js;
  js += rowUp(`#${ID}-eb`, 0.2);
  // chips land 0.3s from 70% scale on their words
  [["frame", tF], ["timestamp", tT], ["fps", tP]].forEach(([k, t]) => {
    js += `tl.fromTo("#${ID}-c-${k}",{opacity:0,scale:0.7},{opacity:1,scale:1,duration:0.3,ease:"power3.out"},${f3(t)});\n`;
  });
  js += rowUp(`#${ID}-m`, tMatch - 0.1) + drawIn(`#${ID}-mt`, tMatch + 0.1, 0.4);
  // the equation on "real", then the arrow closes back to frame_index
  js += rowUp(`#${ID}-eq`, tR);
  js += drawIn(`#${ID}-arr .dr:not(#${ID}-head)`, tR + 0.6, 0.7);
  js += drawIn(`#${ID}-head`, tR + 1.25, 0.25);
  const nA = Math.max(1, Math.floor((D - tR - 2) / 1.6));
  js += `tl.fromTo("#${ID}-arrp",{opacity:0,strokeDashoffset:1},{opacity:1,strokeDashoffset:-0.07,duration:1.6,ease:"none",repeat:${nA - 1},immediateRender:false},${f3(tR + 1.6)});\n`;
  // recorder stamps in (lands from 125% scale), the TIMESTAMP chip takes the hit
  js += `tl.fromTo("#${ID}-rec",{opacity:0,scale:1.3,transformOrigin:"50% 100%"},{opacity:1,scale:1,transformOrigin:"50% 100%",duration:0.25,ease:"power4.in"},${f3(tRec - 0.1)});\n`;
  js += `tl.fromTo("#${ID}-c-timestamp",{y:0},{y:4,duration:0.12,yoyo:true,repeat:1,ease:"power1.out",immediateRender:false},${f3(tRec + 0.15)});\n`;
  js += rowUp(`#${ID}-l1`, tRec + 0.3);
  [0, 1].forEach(k => {
    const cx = k ? 66 : 26, n = Math.max(1, Math.floor((D - tRec) / 2));
    js += `tl.fromTo("#${ID}-reel${k}",{rotation:0,svgOrigin:"${cx} 26"},{rotation:360,svgOrigin:"${cx} 26",duration:2,ease:"none",repeat:${n - 1},immediateRender:true},${f3(tRec + 0.2)});\n`;
  });
  // "calculated": the "=" is the one accent
  js += `tl.fromTo("#${ID}-eqs",{color:"${F}"},{color:"${C.accent}",duration:0.3,ease:"power1.out",immediateRender:false},${f3(tCal)});\n`;
  js += rowUp(`#${ID}-l2`, tCal + 0.1);
  // "salt": the shaker arrives just before and tips once, three grains fall
  js += show(`#${ID}-salt`, tS - 0.6, 0.3, "y:10", "y:0") + rowUp(`#${ID}-sl`, tS - 0.4);
  js += `tl.fromTo("#${ID}-shk",{rotation:0,svgOrigin:"32 90"},{rotation:-38,svgOrigin:"32 90",duration:0.3,ease:"power2.out",yoyo:true,repeat:1,repeatDelay:0.35,immediateRender:false},${f3(tS)});\n`;
  [0, 1, 2].forEach(i => {
    js += `tl.fromTo("#${ID}-gr${i}",{opacity:1,y:0},{opacity:0,y:52,duration:0.6,ease:"power1.in",immediateRender:false},${f3(tS + 0.3 + i * 0.1)});\n`;
  });
  js += exitIfFree(ID, D, [`#${ID}-card`]);
  emit(ID, D, body, js);
}
